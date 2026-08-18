"""OpenAI Whisper STT Provider Implementation"""

from __future__ import annotations

import asyncio
import io
from typing import Optional
from uuid import uuid4

import structlog
from openai import OpenAI

from app.config import settings
from app.user.services.stt_service import STTProvider, STTResult

logger = structlog.get_logger()


class WhisperSTT(STTProvider):
    """OpenAI Whisper API implementation of STT provider"""
    
    def __init__(self, openai_client: Optional[OpenAI] = None):
        """
        Initialize Whisper STT provider
        
        Args:
            openai_client: Optional OpenAI client (for testing/injection)
        """
        self.client = openai_client or OpenAI(api_key=settings.openai_api_key)
        self.model = settings.speaking_transcription_model or "whisper-1"
    
    async def transcribe_from_bytes(
        self,
        audio_bytes: bytes,
        audio_format: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> STTResult:
        """Transcribe audio from bytes using Whisper API"""
        if not audio_bytes:
            raise ValueError("Audio bytes cannot be empty")
        
        try:
            # Create file-like object
            filename = f"audio-{uuid4().hex}.{audio_format}"
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = filename
            
            # Call Whisper API in thread pool
            def _call_whisper():
                params = {
                    "model": self.model,
                    "file": audio_file,
                    "response_format": "verbose_json",
                }
                if language:
                    params["language"] = language
                if prompt:
                    params["prompt"] = prompt
                
                return self.client.audio.transcriptions.create(**params)
            
            transcription = await asyncio.to_thread(_call_whisper)
            
            # Extract data
            transcript_text = (transcription.text or "").strip()
            detected_duration = getattr(transcription, "duration", None)
            detected_language = getattr(transcription, "language", None)
            
            logger.info(
                "WHISPER_STT_SUCCESS",
                duration=detected_duration,
                language=detected_language,
                audio_format=audio_format,
                audio_size_bytes=len(audio_bytes),
            )
            
            return STTResult(
                transcript=transcript_text,
                duration=detected_duration,
                language=detected_language,
                metadata={
                    "provider": "openai_whisper",
                    "model": self.model,
                    "audio_format": audio_format,
                },
            )
        
        except Exception as exc:
            logger.error(
                "WHISPER_STT_FAILED",
                error=str(exc),
                error_type=type(exc).__name__,
                audio_format=audio_format,
            )
            raise ValueError(f"Whisper transcription failed: {str(exc)}") from exc
    
    async def transcribe_from_url(
        self,
        audio_url: str,
        audio_format: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> STTResult:
        """
        Whisper API doesn't support URLs, so download and transcribe
        
        Note: For URL support, consider AWS Transcribe or Google STT
        """
        import httpx
        
        try:
            # Download audio from URL
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(audio_url)
                response.raise_for_status()
                audio_bytes = response.content
            
            logger.info(
                "WHISPER_URL_DOWNLOAD",
                audio_url=audio_url[:100],
                downloaded_bytes=len(audio_bytes),
            )
            
            # Transcribe downloaded bytes
            return await self.transcribe_from_bytes(
                audio_bytes=audio_bytes,
                audio_format=audio_format,
                language=language,
                prompt=prompt,
            )
        
        except Exception as exc:
            logger.error(
                "WHISPER_URL_DOWNLOAD_FAILED",
                audio_url=audio_url[:100],
                error=str(exc),
            )
            raise ValueError(f"Failed to download/transcribe from URL: {str(exc)}") from exc
    
    def is_available(self) -> bool:
        """Check if Whisper provider is configured"""
        return bool(
            settings.openai_api_key
            and settings.enable_speaking_exams
            and self.client
        )
