"""
Contact Service
Handles public contact form submission
"""

import structlog
from typing import Dict, Any
from fastapi import HTTPException

from app.common.models.message_repository import MessageRepository
from app.common.services.captcha_service import CaptchaService

logger = structlog.get_logger()


class ContactService:
    """Service for handling contact form submissions"""

    def __init__(self):
        self.message_repository = MessageRepository()
        self.captcha_service = CaptchaService()

    async def submit_contact_form(
        self,
        name: str,
        email: str,
        subject: str,
        message: str,
        captcha_token: str,
        ip_address: str,
        user_agent: str
    ) -> Dict[str, Any]:
        """
        Submit contact form with reCAPTCHA validation
        
        Args:
            name: Contact name
            email: Contact email
            subject: Message subject
            message: Message content
            captcha_token: reCAPTCHA token
            ip_address: Client IP address
            user_agent: Client user agent
            
        Returns:
            Dict with message_id
            
        Raises:
            HTTPException: If validation fails
        """
        try:
            # Validate reCAPTCHA
            await self.captcha_service.validate_captcha_for_endpoint(
                captcha_token=captcha_token,
                client_ip=ip_address,
                require_in_production=True
            )
            
            # Create contact message
            message_data = {
                'name': name,
                'email': email,
                'subject': subject,
                'message': message,
                'source': 'website',
                'ip_address': ip_address,
                'user_agent': user_agent
            }
            
            message_id = self.message_repository.create_contact_message(message_data)
            
            logger.info(
                "Contact form submitted successfully",
                message_id=message_id,
                email=email
            )
            
            return {'message_id': message_id}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to submit contact form", error=str(e))
            raise HTTPException(
                status_code=500,
                detail="Failed to submit contact form. Please try again later."
            )


def get_contact_service() -> ContactService:
    """Dependency for FastAPI endpoints"""
    return ContactService()
