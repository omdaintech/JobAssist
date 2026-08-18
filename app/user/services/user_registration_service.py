"""User registration and account recovery orchestration service."""

from datetime import datetime, timedelta
from typing import Any, Dict

import bcrypt
import structlog

from app.config import settings
from app.common.services.captcha_service import CaptchaService
from app.common.services.email_service import EmailService
from app.user.models.request_models import ResetPasswordRequest, SignupRequest
from app.user.models.user_repository import UserRepository

logger = structlog.get_logger()


class UserRegistrationService:
    """Encapsulates signup and password reset flows for the user domain."""

    def __init__(
        self,
        user_repo: UserRepository,
        email_service: EmailService,
        captcha_service: CaptchaService,
    ) -> None:
        self.user_repo = user_repo
        self.email_service = email_service
        self.captcha_service = captcha_service

    async def signup(self, request: SignupRequest, client_ip: str) -> Dict[str, Any]:
        """Provision a new user and dispatch verification email."""
        try:
            await self.captcha_service.validate_captcha_for_endpoint(
                request.captcha_token,
                client_ip,
                require_in_production=True,
            )

            password_hash = bcrypt.hashpw(
                request.password.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")

            verification_code = self.email_service.generate_verification_code()
            verification_expires = datetime.utcnow() + timedelta(
                hours=settings.email_verification_window_hours
            )

            result = self.user_repo.create_inactive_user(
                email=request.email,
                password_hash=password_hash,
                verification_code=verification_code,
                verification_expires=verification_expires,
            )

            if not result.get("success"):
                return {
                    "success": False,
                    "message": result.get("message", "Failed to create user account"),
                }

            email_hash = self.email_service.generate_email_hash(request.email)

            email_sent = await self.email_service.send_verification_email(
                email=request.email,
                verification_code=verification_code,
                email_hash=email_hash,
            )

            if not email_sent:
                logger.error(
                    "Verification email failed to send after signup",
                    email=request.email,
                    user_id=result.get("user_id"),
                )

            logger.info(
                "Signup orchestration completed",
                user_id=result.get("user_id"),
                email=request.email,
                email_sent=email_sent,
            )

            return {
                "success": True,
                "message": "Signup successful. Please verify your email to activate the account.",
                "user_id": result.get("user_id"),
                "verification_sent": email_sent,
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error("Signup flow failed", email=request.email, error=str(exc))
            return {
                "success": False,
                "message": "Signup failed due to an internal error",
            }

    async def reset_password(self, request: ResetPasswordRequest) -> Dict[str, Any]:
        """Reset user password using a validated token."""
        try:
            new_password_hash = bcrypt.hashpw(
                request.new_password.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")

            result = self.user_repo.reset_password_with_token(
                email=request.email,
                reset_token=request.reset_token,
                new_password_hash=new_password_hash,
            )

            if not result.get("success"):
                return {
                    "success": False,
                    "message": result.get("message", "Password reset failed"),
                }

            logger.info(
                "Password reset completed",
                email=request.email,
                user_id=result.get("user_id"),
            )

            return {
                "success": True,
                "message": "Password reset successfully. You can now log in with your new password.",
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error("Password reset failed", email=request.email, error=str(exc))
            return {
                "success": False,
                "message": "Password reset failed due to an internal error",
            }


def get_user_registration_service(
    user_repo: UserRepository,
    email_service: EmailService,
    captcha_service: CaptchaService,
) -> UserRegistrationService:
    """Factory for dependency injection."""
    return UserRegistrationService(user_repo, email_service, captcha_service)
