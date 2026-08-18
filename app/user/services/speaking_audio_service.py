"""Speaking audio ingestion + transcription service."""

from __future__ import annotations

import asyncio
import base64
import io
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError
from mutagen.mp3 import MP3
from mutagen.mp4 import MP4
import structlog
import subprocess
import tempfile

from app.config import settings
from app.user.services.stt_service import STTService

logger = structlog.get_logger()


class SpeakingAudioService:
    """Uploads user recordings to S3 and orchestrates STT transcription."""

    _ALLOWED_FORMATS = {
        "mp3": "audio/mpeg",
        "mp4": "audio/mp4",
        "webm": "audio/webm",
    }

    def __init__(
        self,
        *,
        s3_client: Optional[Any] = None,
        stt_service: Optional[STTService] = None,
    ) -> None:
        self.bucket = settings.s3_bucket_name
        self.folder = (settings.s3_speaking_folder or "speaking").strip("/")
        self.retention_days = settings.speaking_audio_retention_days
        self.default_max_duration = settings.speaking_audio_max_duration_seconds
        self.transcription_model = settings.speaking_transcription_model
        self.s3_client = s3_client or self._build_s3_client()
        # Inject STT service (dependency injection for easy testing/swapping)
        self.stt_service = stt_service

    def _build_s3_client(self) -> Any:
        try:
            if settings.aws_access_key_id and settings.aws_secret_access_key:
                return boto3.client(
                    "s3",
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                    region_name=settings.aws_region,
                )
            return boto3.client("s3", region_name=settings.aws_region)
        except Exception as exc:  # pragma: no cover - boto issues
            logger.error("Failed to initialize S3 client", error=str(exc))
            return None

    async def process_audio_from_s3(
        self,
        *,
        s3_key: str,
        duration_seconds: Optional[float],
        question_data: Dict[str, Any],
        user_id: str,
        session_id: str,
    ) -> Dict[str, Any]:
        """
        Process audio file already uploaded to S3
        Verifies upload, extracts duration, transcribes audio
        """
        if not settings.enable_speaking_exams:
            raise ValueError("Speaking exams are disabled")

        if not self.s3_client:
            raise ValueError("AWS S3 client not configured")

        # Import S3UploadService for verification
        from app.user.services.s3_upload_service import S3UploadService
        
        s3_service = S3UploadService(s3_client=self.s3_client)
        
        # Verify file exists and get metadata
        try:
            upload_info = s3_service.verify_upload(s3_key)
            audio_url = upload_info["file_url"]
            file_size = upload_info["file_size"]
        except ValueError as exc:
            raise ValueError(f"Upload verification failed: {str(exc)}")

        # Determine format from s3_key
        audio_format = s3_key.split(".")[-1].lower()
        if audio_format not in self._ALLOWED_FORMATS:
            raise ValueError(f"Invalid audio format in S3 key: {audio_format}")

        # Validate duration against question metadata
        max_duration = self._extract_duration(question_data, "max") or self.default_max_duration
        min_duration = self._extract_duration(question_data, "min")
        
        # Absolute maximum limit (prevent abuse)
        ABSOLUTE_MAX_DURATION = 120  # 2 minutes hard limit
        
        # Primary validation: Trust client-reported duration
        # This avoids unnecessary file downloads just for metadata extraction
        validated_duration = duration_seconds
        
        if not validated_duration or validated_duration <= 0:
            raise ValueError("Audio duration must be greater than 0")
        
        # Absolute maximum check (security)
        if validated_duration > ABSOLUTE_MAX_DURATION:
            raise ValueError(
                f"Audio exceeds absolute maximum duration. Actual: {validated_duration:.1f}s, "
                f"absolute maximum: {ABSOLUTE_MAX_DURATION}s"
            )
        
        # Max duration validation with 2-second tolerance
        max_tolerance = 2.0
        if validated_duration > (max_duration + max_tolerance):
            # Delete invalid file
            s3_service.delete_file(s3_key)
            raise ValueError(
                f"Audio exceeds maximum duration. Actual: {validated_duration:.1f}s, "
                f"maximum allowed: {max_duration}s (+{max_tolerance}s tolerance)"
            )

        # Min duration validation
        if min_duration and validated_duration < min_duration:
            s3_service.delete_file(s3_key)
            raise ValueError(
                f"Audio is too short. Actual: {validated_duration:.1f}s, "
                f"minimum required: {min_duration}s"
            )

        # Download audio file ONCE for transcription only
        # (No longer downloading just for duration validation)
        try:
            response = self.s3_client.get_object(Bucket=self.bucket, Key=s3_key)
            audio_bytes = response["Body"].read()
        except Exception as exc:
            logger.error("Failed to download audio from S3", error=str(exc), s3_key=s3_key)
            raise ValueError("Unable to retrieve uploaded audio")
        
        # Optional: Extract actual duration for logging/monitoring
        # This helps detect client-side duration reporting issues
        actual_duration = None
        try:
            actual_duration = self._extract_audio_duration(audio_bytes, audio_format)
            if actual_duration and duration_seconds:
                duration_diff = abs(actual_duration - duration_seconds)
                if duration_diff > 5.0:
                    logger.warning(
                        "Duration mismatch detected",
                        client_reported=duration_seconds,
                        actual_from_file=actual_duration,
                        difference=duration_diff,
                        user_id=user_id,
                        session_id=session_id,
                        s3_key=s3_key
                    )
        except Exception as e:
            logger.warning("Failed to extract audio duration from file", error=str(e))

        # Transcribe audio using STT service
        if not self.stt_service:
            raise ValueError("STT service not configured")
        
        # Transcribe without prompt - let Whisper detect language naturally
        # Language code hint is sufficient for accurate transcription
        stt_result = await self.stt_service.transcribe_from_bytes(
            audio_bytes=audio_bytes,
            audio_format=audio_format,
            language=question_data.get("language_code"),  # Language hint (e.g., 'de' for German)
            prompt=None,  # No prompt - avoids confusion
        )
        
        transcript_text = stt_result.transcript
        detected_duration = stt_result.duration
        word_count = stt_result.word_count

        # Calculate metrics
        effective_duration = validated_duration or detected_duration or duration_seconds
        speaking_rate = STTService.calculate_speaking_rate(word_count, effective_duration)

        question_metadata = question_data.get("question_metadata") or {}

        audio_meta = {
            "s3_key": s3_key,
            "duration_seconds": effective_duration,
            "client_reported_duration_seconds": duration_seconds,
            "file_metadata_duration_seconds": actual_duration,
            "whisper_detected_duration_seconds": detected_duration,
            "validated_duration_seconds": validated_duration,
            "word_count": word_count,
            "speaking_rate_wpm": speaking_rate,
            "format": audio_format,
            "file_size_bytes": file_size,
            "transcription_model": self.transcription_model,
            "upload_method": "presigned_url",
            "retention_days": self.retention_days,
            "max_duration_seconds": max_duration,
            "min_duration_seconds": min_duration,
            "question_id": question_data.get("id"),
            "question_level": question_data.get("level"),
        }

        if question_metadata:
            audio_meta["question_metadata"] = question_metadata

        logger.info(
            "SPEAKING_AUDIO_PROCESSED_FROM_S3",
            user_id=user_id,
            session_id=session_id,
            question_id=question_data.get("id"),
            s3_key=s3_key,
            duration=effective_duration,
            speaking_rate=speaking_rate,
        )

        return {
            "audio_url": audio_url,
            "audio_meta": audio_meta,
            "transcript": transcript_text,
        }

    async def process_audio(
        self,
        *,
        audio_base64: str,
        audio_format: Optional[str],
        duration_seconds: Optional[float],
        question_data: Dict[str, Any],
        user_id: str,
        session_id: str,
        answer_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Persist the recording, transcribe it, and return metadata.
        LEGACY METHOD - For backward compatibility with base64 uploads
        """

        if not settings.enable_speaking_exams:
            raise ValueError("Speaking exams are disabled")

        if not self.s3_client:
            raise ValueError("AWS S3 client not configured for speaking uploads")

        cleaned_audio = self._strip_data_url(audio_base64)
        if not cleaned_audio:
            raise ValueError("Speaking audio payload is empty")

        normalized_format = (audio_format or "").lower()
        if normalized_format not in self._ALLOWED_FORMATS:
            raise ValueError("Unsupported audio format. Use mp3 or mp4")

        audio_bytes = self._decode_audio(cleaned_audio)
        if not audio_bytes:
            raise ValueError("Unable to decode speaking audio payload")

        # Extract actual duration from audio file metadata
        try:
            actual_duration = self._extract_audio_duration(audio_bytes, normalized_format)
        except Exception as e:
            logger.warning("Failed to extract audio duration from file", error=str(e))
            actual_duration = None

        # Validate duration against question metadata
        max_duration = self._extract_duration(question_data, "max") or self.default_max_duration
        min_duration = self._extract_duration(question_data, "min")
        
        # Use actual duration from file if available, otherwise fall back to client-reported
        validated_duration = actual_duration if actual_duration else duration_seconds
        
        if not validated_duration or validated_duration <= 0:
            raise ValueError("Audio duration must be greater than 0")
        
        # If both durations available, check for significant mismatch (>5s difference = potential tampering)
        if actual_duration and duration_seconds:
            duration_diff = abs(actual_duration - duration_seconds)
            if duration_diff > 5.0:
                logger.warning(
                    "Duration mismatch detected",
                    client_reported=duration_seconds,
                    actual_from_file=actual_duration,
                    difference=duration_diff,
                    user_id=user_id,
                    session_id=session_id
                )
                # Use actual duration for validation (trust the file, not the client)
                validated_duration = actual_duration
        
        # Max duration validation with 2-second tolerance buffer
        # Allow slight overrun due to encoding variance but prevent abuse
        max_tolerance = 2.0  # seconds
        if validated_duration > (max_duration + max_tolerance):
            raise ValueError(
                f"Audio exceeds maximum duration. Actual: {validated_duration:.1f}s, "
                f"maximum allowed: {max_duration}s (+{max_tolerance}s tolerance)"
            )

        # Min duration validation - strict, no tolerance
        if min_duration and validated_duration < min_duration:
            raise ValueError(
                f"Audio is too short. Actual: {validated_duration:.1f}s, "
                f"minimum required: {min_duration}s"
            )

        # Generate S3 key with meaningful identifier
        # Use answer_id if provided (for updates), otherwise use session+question+user
        if answer_id:
            file_identifier = answer_id
        else:
            # Generate predictable identifier: session_question_user (for new answers)
            question_id = question_data.get("id", "unknown")
            file_identifier = f"{session_id}_{question_id}_{user_id[:8]}"
        
        s3_key = self._generate_s3_key(normalized_format, file_identifier)
        audio_url = self._upload_to_s3(audio_bytes, s3_key, normalized_format)

        # Transcribe audio using STT service
        if not self.stt_service:
            raise ValueError("STT service not configured")
        
        # Transcribe without prompt - let Whisper detect language naturally
        # Language code hint is sufficient for accurate transcription
        stt_result = await self.stt_service.transcribe_from_bytes(
            audio_bytes=audio_bytes,
            audio_format=normalized_format,
            language=question_data.get("language_code"),  # Language hint (e.g., 'de' for German)
            prompt=None,  # No prompt - avoids confusion
        )
        
        transcript_text = stt_result.transcript
        detected_duration = stt_result.duration
        word_count = stt_result.word_count

        # Use validated_duration (from file metadata) as the authoritative duration
        effective_duration = validated_duration or detected_duration or duration_seconds
        speaking_rate = STTService.calculate_speaking_rate(word_count, effective_duration) if effective_duration else None

        question_metadata = question_data.get("question_metadata") or {}

        audio_meta = {
            "s3_key": s3_key,
            "duration_seconds": effective_duration,
            "client_reported_duration_seconds": duration_seconds,
            "file_metadata_duration_seconds": actual_duration,
            "whisper_detected_duration_seconds": detected_duration,
            "validated_duration_seconds": validated_duration,
            "word_count": word_count,
            "speaking_rate_wpm": speaking_rate,
            "format": normalized_format,
            "transcription_model": self.transcription_model,
            "retention_days": self.retention_days,
            "max_duration_seconds": max_duration,
            "min_duration_seconds": min_duration,
            "question_id": question_data.get("id"),
            "question_level": question_data.get("level"),
        }

        if question_metadata:
            audio_meta["question_metadata"] = question_metadata

        logger.info(
            "SPEAKING_AUDIO_PROCESSED",
            user_id=user_id,
            session_id=session_id,
            question_id=question_data.get("id"),
            s3_key=s3_key,
            duration=effective_duration,
            speaking_rate=speaking_rate,
        )

        return {
            "audio_url": audio_url,
            "audio_meta": audio_meta,
            "transcript": transcript_text,
        }

    def _strip_data_url(self, payload: str) -> str:
        if "," in payload:
            return payload.split(",", 1)[1]
        return payload

    def _decode_audio(self, payload: str) -> bytes:
        try:
            return base64.b64decode(payload)
        except Exception as exc:
            logger.warning("Failed to decode base64 audio", error=str(exc))
            return b""

    def _extract_audio_duration(self, audio_bytes: bytes, audio_format: str) -> Optional[float]:
        """Extract actual duration from audio file metadata using mutagen or ffprobe."""
        try:
            logger.info(
                "Attempting to extract audio duration",
                format=audio_format,
                bytes_length=len(audio_bytes)
            )
            
            # For MP3, try mutagen first (more reliable for MP3)
            # For MP4, skip mutagen and go straight to ffprobe (more reliable for browser-recorded MP4)
            if audio_format == "mp3":
                try:
                    audio_file = io.BytesIO(audio_bytes)
                    audio = MP3(audio_file)
                    duration = audio.info.length if audio.info else None
                    
                    if duration and duration > 0.01:  # Sanity check: duration should be > 10ms
                        logger.info(f"{audio_format.upper()} duration extracted via mutagen", duration=duration)
                        return duration
                except Exception as mutagen_exc:
                    logger.warning(
                        f"Mutagen failed for {audio_format}, trying ffprobe",
                        error=str(mutagen_exc)
                    )
            
            # Fallback to ffprobe for WebM or if mutagen fails
            try:
                with tempfile.NamedTemporaryFile(suffix=f".{audio_format}", delete=False) as tmp_file:
                    tmp_file.write(audio_bytes)
                    tmp_path = tmp_file.name
                
                result = subprocess.run(
                    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                     '-of', 'default=noprint_wrappers=1:nokey=1', tmp_path],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                import os
                os.unlink(tmp_path)
                
                if result.returncode == 0 and result.stdout.strip():
                    duration = float(result.stdout.strip())
                    logger.info(f"{audio_format.upper()} duration extracted via ffprobe", duration=duration)
                    return duration
                else:
                    logger.warning("ffprobe returned no duration", stderr=result.stderr)
                    
            except FileNotFoundError:
                logger.warning("ffprobe not found, cannot extract duration for", format=audio_format)
            except Exception as ffprobe_exc:
                logger.warning("ffprobe failed", error=str(ffprobe_exc))
            
            return None
            
        except Exception as exc:
            logger.error(
                "Failed to extract audio duration from file metadata",
                format=audio_format,
                error=str(exc),
                error_type=type(exc).__name__,
                bytes_length=len(audio_bytes)
            )
            return None

    def _generate_s3_key(self, extension: str, file_identifier: str) -> str:
        year_month = datetime.utcnow().strftime("%Y/%m")
        return f"{self.folder}/{year_month}/{file_identifier}.{extension}"

    def _upload_to_s3(self, audio_bytes: bytes, key: str, audio_format: str) -> str:
        content_type = self._ALLOWED_FORMATS[audio_format]
        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=audio_bytes,
                ContentType=content_type,
                ContentDisposition="inline",
                Metadata={"retention-days": str(self.retention_days)},
            )
        except (ClientError, NoCredentialsError, BotoCoreError) as exc:
            logger.error("S3 upload failed", error=str(exc))
            raise ValueError("Unable to upload speaking audio") from exc

        if settings.cloudfront_domain:
            return f"https://{settings.cloudfront_domain}/{key}"
        return f"https://{self.bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"

    def _extract_duration(self, question_data: Dict[str, Any], bound: str) -> Optional[int]:
        metadata = question_data.get("question_metadata") or {}
        if bound == "max":
            return (
                metadata.get("max_answer_seconds")
                or metadata.get("max_answer_duration_seconds")
            )
        return (
            metadata.get("min_answer_seconds")
            or metadata.get("min_answer_duration_seconds")
        )
