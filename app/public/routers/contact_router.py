"""
Contact Router
Public contact form endpoint
"""

from fastapi import APIRouter, Depends, Request
import structlog

from app.public.models.public_requests import ContactFormRequest
from app.public.models.public_responses import StandardApiResponse
from app.public.services.contact_service import ContactService, get_contact_service

logger = structlog.get_logger()

router = APIRouter(prefix="/public", tags=["Public - Contact Form"])


@router.post("/contact", response_model=StandardApiResponse, status_code=201)
async def submit_contact_form(
    request_data: ContactFormRequest,
    request: Request,
    contact_service: ContactService = Depends(get_contact_service)
):
    """
    Submit contact form (public endpoint)
    
    - **name**: Contact name (2-100 characters)
    - **email**: Valid email address
    - **subject**: Message subject (5-200 characters)
    - **message**: Message content (10-5000 characters)
    - **captcha_token**: reCAPTCHA v2 token from frontend
    
    Returns message_id on success.
    """
    try:
        # Get client IP and user agent
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        
        result = await contact_service.submit_contact_form(
            name=request_data.name,
            email=request_data.email,
            subject=request_data.subject,
            message=request_data.message,
            captcha_token=request_data.captcha_token,
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        return StandardApiResponse(
            success=True,
            message="Contact form submitted successfully. We'll get back to you soon!",
            data=result
        )
        
    except Exception as e:
        logger.error("Contact form submission failed", error=str(e))
        raise
