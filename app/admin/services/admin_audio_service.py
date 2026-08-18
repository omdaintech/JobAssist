"""
Admin Audio Service - TTS Generation and S3 Upload for Hearing Questions
Generates audio from transcript JSON, uploads to S3, and updates database
"""

import json
import random
from typing import Dict, Any, Optional
import structlog

from elevenlabs.client import ElevenLabs
import boto3
from botocore.exceptions import NoCredentialsError, ClientError

from app.config import settings
from app.admin.dependencies import get_admin_repository_dependency

logger = structlog.get_logger()


class AdminAudioService:
    """
    Admin Audio Service for hearing question audio generation
    
    Workflow:
    1. Fetch question from database
    2. Parse transcript JSON (testTTS format)
    3. Generate audio using ElevenLabs TTS
    4. Upload MP3 to S3
    5. Update question_bank.audio_url
    """
    
    def __init__(self):
        """Initialize ElevenLabs and S3 clients"""
        # Initialize ElevenLabs client
        if not settings.elevenlabs_api_key:
            logger.warning("ElevenLabs API key not configured")
        self.elevenlabs_client = ElevenLabs(api_key=settings.elevenlabs_api_key) if settings.elevenlabs_api_key else None
        
        # Initialize S3 client
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region
            )
        else:
            logger.warning("AWS credentials not configured")
            self.s3_client = None
        
        # Voice configuration by language ID
        # Maps language_id (from database) to female/male voice IDs
        # For dialogues: use both voices
        # For announcements/monologues: pick one randomly
        self.language_voices = {
            "687b9e32e94239d063f47070": {  # German
                "female": "f64OyGck4gc2zk7QOs55",
                "male": "7eVMgwCnXydb3CikjV7a"
            },
            "687b9e32e94239d063f47071": {  # French
                "female": "nr2EGJNe96rzn9FRlTId",
                "male": "K7gx0ylJdff0yjM2uVQS"
            },
            "690d0bddfc9266fb97420d16": {  # Spanish
                "female": "x5IDPSl4ZUbhosMmVFTk",
                "male": "htFfPSZGJwjBv1CL0aMD"
            }
        }
        
        # Get repository
        self.admin_repo = get_admin_repository_dependency()
    
    async def generate_audio_for_question(self, question_id: str, force_overwrite: bool = False) -> Dict[str, Any]:
        """
        Main entry point: Generate audio for a hearing question
        
        Args:
            question_id: Question ID from question_bank
            force_overwrite: If True, regenerate even if audio already exists
            
        Returns:
            Dict with success status, audio_url, and message
        """
        try:
            # Validate configuration
            if not self.elevenlabs_client:
                return {
                    "success": False,
                    "message": "ElevenLabs API key not configured. Set ELEVENLABS_API_KEY in environment."
                }
            
            if not self.s3_client:
                return {
                    "success": False,
                    "message": "AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in environment."
                }
            
            # 1. Fetch question from database
            logger.info("Fetching question from database", question_id=question_id)
            question = self.admin_repo.get_question_by_id(question_id)
            
            if not question or not question.get("success"):
                return {
                    "success": False,
                    "message": f"Question {question_id} not found"
                }
            
            question_data = question.get("data", {})
            
            # Validate it's a hearing or speaking question (both need audio prompts)
            activity_type = question_data.get("activity_type")
            if activity_type not in ["hearing", "speaking"]:
                return {
                    "success": False,
                    "message": f"Question {question_id} is not a hearing or speaking activity"
                }
            
            # Check if audio already exists (skip only if not force_overwrite)
            if question_data.get("audio_url") and not force_overwrite:
                logger.warning("Audio already exists for question", 
                             question_id=question_id, 
                             audio_url=question_data.get("audio_url"))
                return {
                    "success": False,
                    "message": "Audio already exists for this question (use force_overwrite=True to regenerate)",
                    "audio_url": question_data.get("audio_url")
                }
            
            # 2. Get transcript and activity type
            transcript = question_data.get("transcript")
            activity_type = question_data.get("activity_type")
            
            if not transcript:
                return {
                    "success": False,
                    "message": "Question has no transcript"
                }
            
            logger.info("Parsing transcript", 
                       question_id=question_id,
                       activity_type=activity_type)
            
            # For speaking questions, transcript is plain text
            # For hearing questions, transcript is JSON with mode and text
            if activity_type == "speaking":
                # Speaking: transcript is plain text, use announcement mode
                transcript_data = {
                    "mode": "announcement",
                    "text": transcript
                }
            else:
                # Hearing: transcript is JSON
                transcript_data = self._parse_transcript(transcript)
                
                if not transcript_data:
                    return {
                        "success": False,
                        "message": "Failed to parse transcript JSON"
                    }
            
            # 3. Generate audio based on mode
            mode = transcript_data.get("mode")
            language_id = question_data.get("language_id", "687b9e32e94239d063f47070")  # Default to German
            
            logger.info("Generating audio", 
                       question_id=question_id, 
                       mode=mode,
                       language_id=language_id)
            
            if mode == "announcement":
                audio_bytes = self._generate_announcement(
                    transcript_data.get("text", ""),
                    language_id=language_id
                )
            elif mode == "dialogue":
                audio_bytes = self._generate_dialogue(
                    transcript_data.get("text", []),
                    language_id=language_id
                )
            else:
                return {
                    "success": False,
                    "message": f"Unknown transcript mode: {mode}"
                }
            
            if not audio_bytes:
                return {
                    "success": False,
                    "message": "Failed to generate audio"
                }
            
            # 4. Upload to S3
            language_id = question_data.get("language_id", "unknown")
            level = question_data.get("level", "unknown")
            filename = f"{language_id}_{level}_{question_id}.mp3"
            
            logger.info("Uploading audio to S3", 
                       question_id=question_id, 
                       filename=filename)
            
            audio_url = self._upload_to_s3(audio_bytes, filename)
            
            if not audio_url:
                return {
                    "success": False,
                    "message": "Failed to upload audio to S3"
                }
            
            # 5. Update question_bank.audio_url
            logger.info("Updating question with audio URL", 
                       question_id=question_id, 
                       audio_url=audio_url)
            
            update_result = self.admin_repo.update_question_audio_url(question_id, audio_url)
            
            if not update_result.get("success"):
                return {
                    "success": False,
                    "message": "Failed to update question with audio URL",
                    "audio_url": audio_url
                }
            
            logger.info("Audio generation completed successfully", 
                       question_id=question_id, 
                       audio_url=audio_url)
            
            return {
                "success": True,
                "message": "Audio generated and uploaded successfully",
                "audio_url": audio_url,
                "question_id": question_id,
                "filename": filename
            }
            
        except Exception as e:
            logger.error("Failed to generate audio", 
                        question_id=question_id, 
                        error=str(e))
            return {
                "success": False,
                "message": f"Audio generation failed: {str(e)}"
            }
    
    def _parse_transcript(self, transcript_str: str) -> Optional[Dict[str, Any]]:
        """
        Parse transcript JSON from string
        
        Expected formats:
        - Announcement: {"mode": "announcement", "text": "German text"}
        - Dialogue: {"mode": "dialogue", "text": [{"speaker": "mila", "text": "..."}]}
        """
        try:
            if isinstance(transcript_str, dict):
                # Already parsed
                return transcript_str
            
            # Parse JSON string
            transcript_data = json.loads(transcript_str)
            
            # Validate structure
            if "mode" not in transcript_data or "text" not in transcript_data:
                logger.error("Invalid transcript structure", transcript=transcript_str)
                return None
            
            return transcript_data
            
        except json.JSONDecodeError as e:
            logger.error("Failed to parse transcript JSON", 
                        transcript=transcript_str, 
                        error=str(e))
            return None
    
    def _generate_announcement(self, text: str, language_id: str) -> Optional[bytes]:
        """
        Generate single-speaker announcement audio
        Randomly picks female or male voice for the given language
        
        Args:
            text: The text to convert to speech
            language_id: The language ID from database (e.g., "687b9e32e94239d063f47070" for German)
        """
        try:
            if not text:
                logger.error("Empty announcement text")
                return None
            
            # Get voices for this language
            voices = self.language_voices.get(language_id)
            if not voices:
                logger.error("No voices configured for language", language_id=language_id)
                return None
            
            # Randomly pick gender
            gender = random.choice(["female", "male"])
            voice_id = voices[gender]
            
            logger.info("Generating announcement", 
                       language_id=language_id,
                       gender=gender,
                       voice_id=voice_id,
                       text_length=len(text))
            
            # Generate audio using ElevenLabs
            audio_generator = self.elevenlabs_client.text_to_speech.convert(
                voice_id=voice_id,
                text=text,
                model_id="eleven_flash_v2_5"  # Fast model for announcements
            )
            
            # Collect audio bytes
            audio_bytes = b""
            for chunk in audio_generator:
                audio_bytes += chunk
            
            logger.info("Announcement audio generated", 
                       language_id=language_id,
                       gender=gender,
                       size_bytes=len(audio_bytes))
            
            return audio_bytes
            
        except Exception as e:
            logger.error("Failed to generate announcement audio", error=str(e))
            return None
    
    def _generate_dialogue(self, text_array: list, language_id: str) -> Optional[bytes]:
        """
        Generate multi-speaker dialogue audio using both female and male voices
        
        Args:
            text_array: List of {"speaker": "female/male", "text": "..."}
            language_id: The language ID from database (e.g., "687b9e32e94239d063f47070" for German)
        """
        try:
            if not text_array or not isinstance(text_array, list):
                logger.error("Invalid dialogue text array", text_array=text_array)
                return None
            
            # Get voices for this language
            voices = self.language_voices.get(language_id)
            if not voices:
                logger.error("No voices configured for language", language_id=language_id)
                return None
            
            # Import DialogueInput here to avoid import errors if library not installed
            from elevenlabs import DialogueInput
            
            logger.info("Generating dialogue", 
                       language_id=language_id,
                       lines=len(text_array))
            
            # Create DialogueInput objects
            dialogue_inputs = []
            for line in text_array:
                speaker = line.get("speaker", "female")
                text = line.get("text", "")
                
                # Map speaker to voice ID
                if speaker not in ["female", "male"]:
                    logger.warning(f"Unknown speaker '{speaker}', defaulting to 'female'")
                    speaker = "female"
                
                voice_id = voices[speaker]
                
                dialogue_inputs.append(
                    DialogueInput(
                        text=text,
                        voice_id=voice_id
                    )
                )
            
            # Generate dialogue audio
            audio_generator = self.elevenlabs_client.text_to_dialogue.convert(
                inputs=dialogue_inputs
            )
            
            # Collect audio bytes
            audio_bytes = b""
            for chunk in audio_generator:
                audio_bytes += chunk
            
            logger.info("Dialogue audio generated", 
                       language_id=language_id,
                       lines=len(text_array), 
                       size_bytes=len(audio_bytes))
            
            return audio_bytes
            
        except Exception as e:
            logger.error("Failed to generate dialogue audio", error=str(e))
            return None
    
    def _upload_to_s3(self, audio_bytes: bytes, filename: str) -> Optional[str]:
        """
        Upload audio to S3 and return CloudFront URL
        
        Args:
            audio_bytes: MP3 audio data
            filename: Filename (language_level_questionid.mp3)
            
        Returns:
            CloudFront URL or direct S3 URL (fallback) or None on failure
        """
        try:
            # Construct S3 key
            s3_key = f"{settings.s3_hearing_folder}/{filename}"
            
            logger.info("Uploading to S3", 
                       bucket=settings.s3_bucket_name, 
                       key=s3_key,
                       size_bytes=len(audio_bytes))
            
            # Upload with correct Content-Type for browser playback
            self.s3_client.put_object(
                Bucket=settings.s3_bucket_name,
                Key=s3_key,
                Body=audio_bytes,
                ContentType='audio/mpeg',
                ContentDisposition='inline'
            )
            
            # Construct CloudFront URL if configured, otherwise use S3 URL
            if settings.cloudfront_domain:
                audio_url = f"https://{settings.cloudfront_domain}/{s3_key}"
                logger.info("S3 upload successful, returning CloudFront URL", audio_url=audio_url)
            else:
                # Fallback to direct S3 URL
                audio_url = f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/{s3_key}"
                logger.info("S3 upload successful, returning S3 URL (CloudFront not configured)", audio_url=audio_url)
            
            return audio_url
            
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            return None
        except ClientError as e:
            logger.error("S3 upload failed", error=str(e))
            return None
        except Exception as e:
            logger.error("Unexpected error during S3 upload", error=str(e))
            return None

    async def delete_audio(self, question_id: str) -> Dict[str, Any]:
        """
        Delete audio file from S3 and clear audio_url in database
        
        Args:
            question_id: Question ID
            
        Returns:
            Success/error response
        """
        try:
            # Get question from database
            question = self.admin_repo.get_question_by_id(question_id)
            if not question:
                return {"success": False, "message": "Question not found"}
            
            audio_url = question.get("audio_url")
            if not audio_url:
                return {"success": False, "message": "Question has no audio to delete"}
            
            # Extract S3 key from URL
            # URL format: https://your-cloudfront-domain.cloudfront.net/hearing/filename.mp3 (CloudFront)
            # OR: https://bucket-name.s3.region.amazonaws.com/hearing/filename.mp3 (S3 direct)
            s3_key = None
            
            # Try CloudFront URL pattern
            if settings.cloudfront_domain and settings.cloudfront_domain in audio_url:
                s3_key = audio_url.split(f"{settings.cloudfront_domain}/")[1]
            # Try S3 URL pattern
            elif settings.s3_hearing_folder in audio_url:
                # Extract key after the domain
                parts = audio_url.split(".amazonaws.com/")
                if len(parts) > 1:
                    s3_key = parts[1]
            
            # Delete from S3 if we found a key
            if s3_key:
                try:
                    self.s3_client.delete_object(
                        Bucket=settings.s3_bucket_name,
                        Key=s3_key
                    )
                    logger.info("Deleted audio from S3", question_id=question_id, s3_key=s3_key)
                except ClientError as e:
                    logger.warning("S3 deletion failed (file may not exist)", error=str(e))
            else:
                logger.warning("Could not extract S3 key from audio URL", audio_url=audio_url)
            
            # Clear audio_url in database
            result = self.admin_repo.update_question_audio_url(question_id, None)
            
            if result.get("success"):
                logger.info("Audio deleted successfully", question_id=question_id)
                return {"success": True, "message": "Audio deleted successfully"}
            else:
                return {"success": False, "message": "Failed to update database"}
                
        except Exception as e:
            logger.error("Failed to delete audio", question_id=question_id, error=str(e))
            return {"success": False, "message": f"Error deleting audio: {str(e)}"}

