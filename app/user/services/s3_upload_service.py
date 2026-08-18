"""
S3 Direct Upload Service - Presigned URL Generation
Handles secure direct-to-S3 uploads for audio files
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError
import structlog

from app.config import settings

logger = structlog.get_logger()


class S3UploadService:
    """Manages presigned URL generation for direct S3 uploads"""

    # Allowed audio formats
    ALLOWED_FORMATS = {
        "mp3": "audio/mpeg",
        "mp4": "audio/mp4",
    }

    # Upload constraints
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB max
    PRESIGNED_URL_EXPIRY = 300  # 5 minutes

    def __init__(self, s3_client: Optional[Any] = None) -> None:
        self.bucket = settings.s3_bucket_name
        self.folder = (settings.s3_speaking_folder or "speaking").strip("/")
        self.s3_client = s3_client or self._build_s3_client()

    def _build_s3_client(self) -> Any:
        """Initialize S3 client with credentials"""
        try:
            if settings.aws_access_key_id and settings.aws_secret_access_key:
                return boto3.client(
                    "s3",
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                    region_name=settings.aws_region,
                )
            return boto3.client("s3", region_name=settings.aws_region)
        except Exception as exc:
            logger.error("Failed to initialize S3 client", error=str(exc))
            return None

    def generate_upload_url(
        self,
        *,
        session_id: str,
        question_id: str,
        user_id: str,
        audio_format: str,
        file_identifier: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate presigned URL for direct S3 upload
        
        Args:
            session_id: Session identifier
            question_id: Question identifier
            user_id: User identifier
            audio_format: File format (mp3/mp4)
            file_identifier: Optional specific identifier (e.g., exam_log_id)
            
        Returns:
            Dict with upload_url, s3_key, expires_in
        """
        if not self.s3_client:
            raise ValueError("S3 client not configured")

        # Validate format
        normalized_format = audio_format.lower()
        if normalized_format not in self.ALLOWED_FORMATS:
            raise ValueError(f"Invalid audio format. Allowed: {list(self.ALLOWED_FORMATS.keys())}")

        content_type = self.ALLOWED_FORMATS[normalized_format]

        # Generate S3 key
        if file_identifier:
            s3_key = self._generate_s3_key(normalized_format, file_identifier)
        else:
            # Use session + question + user for new uploads
            identifier = f"{session_id}_{question_id}_{user_id[:8]}"
            s3_key = self._generate_s3_key(normalized_format, identifier)

        try:
            # Generate presigned URL with constraints
            presigned_url = self.s3_client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": s3_key,
                    "ContentType": content_type,
                    # Note: ContentLength constraint requires exact match which is hard to predict
                    # Will validate size after upload instead
                },
                ExpiresIn=self.PRESIGNED_URL_EXPIRY,
            )

            logger.info(
                "Generated presigned URL",
                session_id=session_id,
                question_id=question_id,
                user_id=user_id,
                s3_key=s3_key,
                expires_in=self.PRESIGNED_URL_EXPIRY,
            )

            return {
                "upload_url": presigned_url,
                "s3_key": s3_key,
                "expires_in": self.PRESIGNED_URL_EXPIRY,
                "max_file_size_mb": self.MAX_FILE_SIZE / (1024 * 1024),
                "allowed_content_type": content_type,
            }

        except (ClientError, NoCredentialsError, BotoCoreError) as exc:
            logger.error("Failed to generate presigned URL", error=str(exc))
            raise ValueError("Unable to generate upload URL") from exc

    def verify_upload(self, s3_key: str) -> Dict[str, Any]:
        """
        Verify that file was uploaded to S3 and get metadata
        
        Args:
            s3_key: S3 object key
            
        Returns:
            Dict with file metadata (size, content_type, etc.)
        """
        if not self.s3_client:
            raise ValueError("S3 client not configured")

        try:
            response = self.s3_client.head_object(Bucket=self.bucket, Key=s3_key)

            file_size = response.get("ContentLength", 0)
            content_type = response.get("ContentType", "")

            # Validate file size
            if file_size > self.MAX_FILE_SIZE:
                logger.warning(
                    "File exceeds size limit, deleting",
                    s3_key=s3_key,
                    file_size=file_size,
                    max_size=self.MAX_FILE_SIZE,
                )
                # Delete oversized file
                self.s3_client.delete_object(Bucket=self.bucket, Key=s3_key)
                raise ValueError(
                    f"File size {file_size / 1024 / 1024:.2f}MB exceeds "
                    f"maximum {self.MAX_FILE_SIZE / 1024 / 1024}MB"
                )

            # Validate content type
            if content_type not in self.ALLOWED_FORMATS.values():
                logger.warning(
                    "Invalid content type, deleting",
                    s3_key=s3_key,
                    content_type=content_type,
                )
                self.s3_client.delete_object(Bucket=self.bucket, Key=s3_key)
                raise ValueError(f"Invalid content type: {content_type}")

            logger.info(
                "Upload verified successfully",
                s3_key=s3_key,
                file_size=file_size,
                content_type=content_type,
            )

            # Generate public URL
            if settings.cloudfront_domain:
                file_url = f"https://{settings.cloudfront_domain}/{s3_key}"
            else:
                file_url = f"https://{self.bucket}.s3.{settings.aws_region}.amazonaws.com/{s3_key}"

            return {
                "s3_key": s3_key,
                "file_url": file_url,
                "file_size": file_size,
                "content_type": content_type,
                "verified": True,
            }

        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code == "404":
                raise ValueError("File not found in S3. Upload may have failed.")
            logger.error("S3 verification failed", error=str(exc), s3_key=s3_key)
            raise ValueError("Unable to verify upload") from exc

    def _generate_s3_key(self, extension: str, file_identifier: str) -> str:
        """Generate S3 key with year/month organization"""
        year_month = datetime.utcnow().strftime("%Y/%m")
        return f"{self.folder}/{year_month}/{file_identifier}.{extension}"

    def delete_file(self, s3_key: str) -> bool:
        """Delete file from S3 (cleanup for failed uploads)"""
        if not self.s3_client:
            return False

        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=s3_key)
            logger.info("Deleted S3 object", s3_key=s3_key)
            return True
        except Exception as exc:
            logger.error("Failed to delete S3 object", error=str(exc), s3_key=s3_key)
            return False
