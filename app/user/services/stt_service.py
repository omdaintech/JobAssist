"""Speech-to-Text (STT) Service - Provider-Agnostic Interface"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import structlog

logger = structlog.get_logger()


class STTResult:
    """Structured result from STT transcription"""
    
    def __init__(
        self,
        transcript: str,
        duration: Optional[float] = None,
        word_count: Optional[int] = None,
        language: Optional[str] = None,
        confidence: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.transcript = transcript
        self.duration = duration
        self.word_count = word_count or len(transcript.split()) if transcript else 0
        self.language = language
        self.confidence = confidence
        self.metadata = metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "transcript": self.transcript,
            "duration": self.duration,
            "word_count": self.word_count,
            "language": self.language,
            "confidence": self.confidence,
            "metadata": self.metadata,
        }


class STTProvider(ABC):
    """
    Abstract base class for Speech-to-Text providers
    
    Implementations: WhisperSTT, AWSTranscribeSTT, GoogleSTT, etc.
    """
    
    @abstractmethod
    async def transcribe_from_bytes(
        self,
        audio_bytes: bytes,
        audio_format: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> STTResult:
        """
        Transcribe audio from bytes
        
        Args:
            audio_bytes: Raw audio data
            audio_format: File format (mp3, mp4, webm)
            language: Optional ISO-639-1 language code
            prompt: Optional text to guide transcription style/context
            
        Returns:
            STTResult with transcript and metadata
        """
        pass
    
    @abstractmethod
    async def transcribe_from_url(
        self,
        audio_url: str,
        audio_format: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> STTResult:
        """
        Transcribe audio from URL (S3, CloudFront, etc.)
        
        Args:
            audio_url: Public URL to audio file
            audio_format: File format (mp3, mp4, webm)
            language: Optional ISO-639-1 language code
            prompt: Optional text to guide transcription style/context
            
        Returns:
            STTResult with transcript and metadata
        """
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is configured and available"""
        pass


class STTService:
    """
    Main STT service - provider-agnostic wrapper
    
    Usage:
        stt = STTService(provider=WhisperSTT())
        result = await stt.transcribe_from_url("https://s3.../audio.mp4")
    """
    
    def __init__(self, provider: STTProvider):
        """
        Initialize STT service with a provider
        
        Args:
            provider: STT provider implementation (WhisperSTT, AWSTranscribeSTT, etc.)
        """
        self.provider = provider
    
    async def transcribe_from_bytes(
        self,
        audio_bytes: bytes,
        audio_format: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> STTResult:
        """
        Transcribe audio from bytes
        
        Args:
            audio_bytes: Raw audio data
            audio_format: File format (mp3, mp4, webm)
            language: Optional ISO-639-1 language code
            prompt: Optional text to guide transcription style/context
            
        Returns:
            STTResult with transcript and metadata
        """
        if not self.provider.is_available():
            raise ValueError("STT provider not configured or unavailable")
        
        logger.info(
            "STT_TRANSCRIBE_BYTES",
            audio_format=audio_format,
            audio_size_bytes=len(audio_bytes),
            language=language,
            has_prompt=bool(prompt),
            provider=self.provider.__class__.__name__,
        )
        
        return await self.provider.transcribe_from_bytes(
            audio_bytes=audio_bytes,
            audio_format=audio_format,
            language=language,
            prompt=prompt,
        )
    
    async def transcribe_from_url(
        self,
        audio_url: str,
        audio_format: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> STTResult:
        """
        Transcribe audio from URL (ideal for S3/CloudFront)
        
        Args:
            audio_url: Public URL to audio file
            audio_format: File format (mp3, mp4, webm)
            language: Optional ISO-639-1 language code
            prompt: Optional text to guide transcription style/context
            
        Returns:
            STTResult with transcript and metadata
        """
        if not self.provider.is_available():
            raise ValueError("STT provider not configured or unavailable")
        
        logger.info(
            "STT_TRANSCRIBE_URL",
            audio_url=audio_url[:100],  # Truncate for logging
            audio_format=audio_format,
            language=language,
            has_prompt=bool(prompt),
            provider=self.provider.__class__.__name__,
        )
        
        return await self.provider.transcribe_from_url(
            audio_url=audio_url,
            audio_format=audio_format,
            language=language,
            prompt=prompt,
        )
    
    @staticmethod
    def calculate_speaking_rate(word_count: int, duration_seconds: float) -> Optional[float]:
        """
        Calculate speaking rate in words per minute (WPM)
        
        Args:
            word_count: Number of words spoken
            duration_seconds: Duration in seconds
        
        Returns:
            Speaking rate in WPM, or None if duration is invalid
        """
        if not duration_seconds or duration_seconds <= 0:
            return None
        
        wpm = (word_count / duration_seconds) * 60
        return round(wpm, 1)

