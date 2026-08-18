"""
Captcha Verification Service
Handles server-side reCaptcha v2 verification for security
"""

import structlog
from typing import Optional
import httpx
from fastapi import HTTPException

from app.config import settings

logger = structlog.get_logger()


class CaptchaService:
    """Server-side reCaptcha v2 verification service"""

    def __init__(self):
        self.secret_key = getattr(settings, "recaptcha_secret_key", None)
        self.site_key = getattr(settings, "recaptcha_site_key", None)
        self.verify_url = "https://www.google.com/recaptcha/api/siteverify"
        self.enabled = getattr(settings, "enable_captcha", True)

    async def verify_recaptcha(
        self, captcha_token: str, user_ip: Optional[str] = None
    ) -> bool:
        """
        Verify reCaptcha v2 token with Google's servers

        Args:
            captcha_token: Token from frontend reCaptcha widget
            user_ip: User's IP address for additional verification

        Returns:
            bool: True if captcha is valid, False otherwise
        """
        # Check if CAPTCHA is globally disabled
        if not self.enabled:
            logger.info("CAPTCHA verification skipped - globally disabled")
            return True

        if not self.secret_key:
            logger.error("reCaptcha secret key not configured")
            return False

        if not captcha_token:
            logger.warning("Empty captcha token provided")
            return False

        try:
            verify_data = {
                "secret": self.secret_key,
                "response": captcha_token,
            }

            if user_ip:
                verify_data["remoteip"] = user_ip

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.verify_url, data=verify_data)
                result = response.json()

                success = result.get("success", False)
                error_codes = result.get("error-codes", [])

                if success:
                    logger.info("reCaptcha v2 verification successful")
                    return True
                else:
                    logger.warning(
                        "reCaptcha v2 verification failed",
                        error_codes=error_codes,
                    )

                    # Log specific error for debugging
                    if "invalid-site-key" in error_codes:
                        logger.error("INVALID SITE KEY - Check your reCAPTCHA keys in Google Console")
                    elif "timeout-or-duplicate" in error_codes:
                        logger.warning("CAPTCHA token expired or already used")
                    elif "missing-input-secret" in error_codes:
                        logger.error("MISSING SECRET KEY - Check RECAPTCHA_SECRET_KEY environment variable")

                    return False

        except Exception as e:
            logger.error("reCaptcha v2 verification error", error=str(e))
            return False

    async def validate_captcha_for_endpoint(
        self, captcha_token: Optional[str], client_ip: str, require_in_production: bool = True
    ) -> None:
        """
        Validate CAPTCHA for an endpoint with consistent logic

        Args:
            captcha_token: CAPTCHA token from request
            client_ip: Client IP address
            require_in_production: Whether to require CAPTCHA in production

        Raises:
            HTTPException: If CAPTCHA validation fails
        """
        from app.config import settings

        # If CAPTCHA is globally disabled, skip validation
        if not self.enabled:
            logger.info("CAPTCHA validation skipped - globally disabled")
            return

        # If token provided, validate it
        if captcha_token:
            if not await self.verify_recaptcha(captcha_token, client_ip):
                raise HTTPException(
                    status_code=400,
                    detail="reCAPTCHA verification failed. Please try again."
                )
        # If no token and required in production
        elif require_in_production and not settings.debug:
            raise HTTPException(
                status_code=400,
                detail="reCAPTCHA token is required"
            )


def get_captcha_service() -> CaptchaService:
    """Dependency for FastAPI endpoints"""
    return CaptchaService()
