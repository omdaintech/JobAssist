from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
import structlog

from app.config import settings
from app.dependencies import (
    get_current_user,
    get_auth_service,
    get_email_service,
    get_captcha_service,
    get_client_ip,
)
from app.user.models.user_repository import UserRepository, get_user_repository
from app.user.services.user_auth_service import UserAuthService
from app.common.services.email_service import EmailService
from app.common.services.captcha_service import CaptchaService
from app.user.services.user_registration_service import UserRegistrationService
from app.user.models.request_models import (
    LoginRequest,
    FirebaseUserSyncRequest,
    SignupRequest,
    EmailVerificationRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.user.models.response_models import (
    AuthResponse,
    SignupResponse,
    EmailVerificationResponse,
    ForgotPasswordResponse,
    ResetPasswordResponse,
)

logger = structlog.get_logger()
router = APIRouter(tags=["Users - Authentication"])

def get_user_registration_service_dependency(
    user_repo: UserRepository = Depends(get_user_repository),
    email_service: EmailService = Depends(get_email_service),
    captcha_service: CaptchaService = Depends(get_captcha_service),
) -> UserRegistrationService:
    return UserRegistrationService(user_repo, email_service, captcha_service)


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    auth_service: UserAuthService = Depends(get_auth_service),
    captcha_service: CaptchaService = Depends(get_captcha_service),
    client_ip: str = Depends(get_client_ip),
):
    """User authentication endpoint"""
    try:
        from app.config import settings
        
        # Validate CAPTCHA using centralized logic
        await captcha_service.validate_captcha_for_endpoint(
            request.captcha_token, client_ip, require_in_production=True
        )

        result = await auth_service.authenticate_user(request.email, request.password)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail=result["message"]
            )

        return AuthResponse(
            success=True,
            message=result["message"],
            access_token=result["access_token"],
            user_id=result.get("user_id"),
            email=result.get("email"),
            name=result.get("user", {}).get("name"),
            current_level=result.get("user", {}).get("current_level"),
            target_level=result.get("user", {}).get("target_level"),
            is_onboarded=result.get("user", {}).get("is_onboarded"),
            onboarding_goal=result.get("user", {}).get("onboarding_goal"),
            practice_frequency_per_week=result.get("user", {}).get("practice_frequency_per_week"),
            preferred_language_id=result.get("user", {}).get("preferred_language_id"),
            preferred_language_info=None,  # Can be populated from user preferences later
            expires_in=settings.jwt_access_token_expires * 3600,  # Convert hours to seconds
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed",
        )


@router.get("/status")
async def get_user_status(
    user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Get user status with usage info"""
    try:
        user_id = user["user_id"]
        user_status_data = user_repo.get_user_status_data(user_id)
        
        if not user_status_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User status data not found",
            )

        response = {
            "success": True,
            "user_info": user_status_data["user_info"],
            "usage_info": user_status_data["usage_info"],
        }

        # Include preferred language info and current level if available
        if user_status_data.get("preferred_language_info"):
            response["preferred_language_info"] = user_status_data[
                "preferred_language_info"
            ]

        # Get current_level from user_info
        if user_status_data.get("user_info", {}).get("current_level"):
            response["current_level"] = user_status_data["user_info"]["current_level"]
            
        # Include school info for SAAS multi-tenancy
        if user_status_data.get("school_info"):
            response["school_info"] = user_status_data["school_info"]

        return response
    except Exception as e:
        logger.error(
            "Failed to get user status", user_id=user.get("user_id"), error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user status",
        )


@router.post("/sync-firebase-user", response_model=AuthResponse)
async def sync_firebase_user(
    request: FirebaseUserSyncRequest,
    auth_service: UserAuthService = Depends(get_auth_service),
    user_repo: UserRepository = Depends(get_user_repository),
    email_service: EmailService = Depends(get_email_service),
):
    """Sync Firebase user data and return JWT token"""
    try:
        logger.info(
            "Firebase user sync attempt",
            firebase_uid=request.firebase_uid,
            email=request.email,
        )

        # Check if user already exists by Firebase UID
        existing_user = user_repo.find_user_by_firebase_uid(request.firebase_uid)

        if existing_user:
            logger.info("Existing Firebase user found", user_id=existing_user["id"])
            user_id = existing_user["id"]
            email = existing_user["email"]
        else:
            # Check if user exists by email (might be a regular user that logged in with Firebase)
            if request.email:
                existing_email_user = user_repo.get_user_by_email(request.email.lower())
            else:
                existing_email_user = None
            
            if existing_email_user:
                # Update existing user with Firebase data
                logger.info("Updating existing user with Firebase data", user_id=existing_email_user["id"], email=request.email)
                
                update_data = {
                    "firebase_uid": request.firebase_uid,
                    "auth_provider": "firebase",
                    "email_verified": request.email_verified,
                    "photo_url": request.photo_url,
                    "phone_number": request.phone_number,
                    "last_login": datetime.utcnow(),
                }
                
                # Only update name if it's not already set or if Firebase provides a different name
                if not existing_email_user.get("name") or existing_email_user["name"] == "User":
                    update_data["name"] = request.name or "User"
                
                success = user_repo.update_user(existing_email_user["id"], update_data)
                
                if not success:
                    logger.error("Failed to update existing user with Firebase data", user_id=existing_email_user["id"])
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to update user with Firebase data",
                    )
                
                user_id = existing_email_user["id"]
                email = existing_email_user["email"]
                logger.info("User updated with Firebase data successfully", user_id=user_id)
            else:
                # Create new user with Firebase data
                logger.info("Creating new Firebase user", firebase_uid=request.firebase_uid)

                user_data = {
                    "firebase_uid": request.firebase_uid,
                    "email": request.email,
                    "name": request.name or "User",
                    "auth_provider": "firebase",  # This will be converted to enum by SQLAlchemy
                    "email_verified": request.email_verified,
                    "photo_url": request.photo_url,
                    "phone_number": request.phone_number,
                    "created_at": datetime.utcnow(),
                    "last_login": datetime.utcnow(),
                    "current_level": "A1",  # Default level for new users
                    "preferred_language_id": settings.default_language_id,  # German as default
                }

                result = user_repo.create_user_with_firebase(user_data)

                if not result or not result.get("success"):
                    logger.error(
                        "Failed to create Firebase user", firebase_uid=request.firebase_uid
                    )
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to create user account",
                    )

                user_id = result["user"]["id"]
                email = result["user"]["email"]
                logger.info("Firebase user created successfully", user_id=user_id)
                
                # Send welcome email to new Firebase/Google user
                try:
                    await email_service.send_direct_learner_welcome_email(
                        email=email,
                        name=request.name or "User"
                    )
                    logger.info(
                        "Welcome email sent to new Firebase user",
                        user_id=user_id,
                        email=email
                    )
                except Exception as e:
                    # Don't fail signup if welcome email fails
                    logger.error(
                        "Failed to send welcome email to Firebase user",
                        user_id=user_id,
                        error=str(e)
                    )

        # Generate JWT token for the user
        access_token = await auth_service.generate_jwt_token(user_id, email)

        logger.info("Firebase sync successful", user_id=user_id, email=email)

        return AuthResponse(
            success=True,
            message="Firebase authentication successful",
            access_token=access_token,
            user_id=user_id,
            email=email,
            name=request.name,
            preferred_language_info=None,
            current_level="A1",
            expires_in=36000,  # 10 hours
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Firebase sync failed", firebase_uid=request.firebase_uid, error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firebase authentication failed",
        )


@router.post("/signup", response_model=SignupResponse)
async def signup(
    request: SignupRequest,
    client_ip: str = Depends(get_client_ip),
    registration_service: UserRegistrationService = Depends(
        get_user_registration_service_dependency
    ),
):
    """User registration endpoint with email verification"""
    try:
        logger.info("Signup attempt", email=request.email, ip=client_ip)

        result = await registration_service.signup(request, client_ip)

        if not result.get("success"):
            message = result.get("message", "Registration failed")
            status_code = (
                status.HTTP_500_INTERNAL_SERVER_ERROR
                if "internal error" in message.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            raise HTTPException(status_code=status_code, detail=message)

        return SignupResponse(
            success=True,
            message=result.get(
                "message",
                "Account created successfully. Please check your email for verification instructions.",
            ),
            user_id=result.get("user_id"),
            verification_sent=result.get("verification_sent", False),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Signup failed", email=request.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


@router.post("/verify-email", response_model=EmailVerificationResponse)
async def verify_email(
    request: EmailVerificationRequest,
    user_repo: UserRepository = Depends(get_user_repository),
    email_service: EmailService = Depends(get_email_service),
):
    """Email verification endpoint"""
    try:
        logger.info(
            "Email verification attempt",
            email_hash=request.email_hash,
            code=request.verification_code,
        )

        result = user_repo.verify_user_email(
            email_hash=request.email_hash,
            verification_code=request.verification_code,
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=result["message"]
            )

        logger.info("Email verification successful", user_id=result["user_id"]) 

        # Send welcome email to direct learner (self-signup user)
        if result.get("user_email") and result.get("user_name"):
            try:
                await email_service.send_direct_learner_welcome_email(
                    email=result["user_email"],
                    name=result["user_name"]
                )
                logger.info(
                    "Welcome email sent to direct learner",
                    user_id=result["user_id"],
                    email=result["user_email"]
                )
            except Exception as e:
                # Don't fail verification if welcome email fails
                logger.error(
                    "Failed to send welcome email to direct learner",
                    user_id=result["user_id"],
                    error=str(e)
                )

        return EmailVerificationResponse(
            success=True,
            message="Email verified successfully! Your account is now active. You can log in.",
            user_activated=True,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Email verification failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed",
        )


@router.post("/resend-verification", response_model=SignupResponse)
async def resend_verification(
    request: ResendVerificationRequest,
    email_service: EmailService = Depends(get_email_service),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Resend verification email endpoint"""
    try:
        logger.info("Resend verification attempt", email=request.email)

        # Check if user can receive new verification
        user_result = user_repo.get_user_for_resend_verification(request.email)

        if not user_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=user_result["message"]
            )

        # Generate new verification code
        verification_code = email_service.generate_verification_code()
        verification_expires = datetime.utcnow() + timedelta(
            hours=settings.email_verification_window_hours
        )

        # Update user's verification code
        update_result = user_repo.update_verification_code(
            user_id=user_result["user_id"],
            verification_code=verification_code,
            verification_expires=verification_expires,
        )

        if not update_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update verification code",
            )

        # Send new verification email
        email_hash = email_service.generate_email_hash(request.email)
        
        logger.info(
            "Attempting to resend verification email",
            email=request.email,
            user_id=user_result["user_id"],
            email_hash=email_hash[:8] + "...",
            new_verification_code=verification_code
        )
        
        email_sent = await email_service.send_verification_email(
            email=request.email,
            verification_code=verification_code,
            email_hash=email_hash,
        )

        if not email_sent:
            logger.error(
                "CRITICAL: Failed to resend verification email",
                email=request.email,
                user_id=user_result["user_id"],
                verification_code=verification_code
            )
        else:
            logger.info(
                "Verification email resent successfully",
                email=request.email,
                user_id=user_result["user_id"]
            )

        return SignupResponse(
            success=True,
            message="Verification email sent successfully. Please check your inbox.",
            verification_sent=email_sent,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Resend verification failed", email=request.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification email",
        )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    client_ip: str = Depends(get_client_ip),
    captcha_service: CaptchaService = Depends(get_captcha_service),
    email_service: EmailService = Depends(get_email_service),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Request password reset via email"""
    try:
        logger.info("Forgot password request", email=request.email, ip=client_ip)

        # Validate CAPTCHA using centralized logic
        await captcha_service.validate_captcha_for_endpoint(
            request.captcha_token, client_ip, require_in_production=True
        )

        # Generate secure reset token and expiration
        import secrets
        reset_token = secrets.token_urlsafe(32)
        reset_expires = datetime.utcnow() + timedelta(
            hours=settings.password_reset_window_hours
        )

        # Request password reset (stores hashed token)
        result = user_repo.request_password_reset(
            email=request.email,
            reset_token=reset_token,
            expires_at=reset_expires,
        )

        if not result["success"]:
            # For security, always return success message
            logger.warning("Password reset request failed", email=request.email, reason=result["message"])

        # Send reset email only if user exists (checked in ODM method)
        email_sent = False
        if result["success"] and "user_id" in result:
            logger.info(
                "Attempting to send password reset email",
                email=request.email,
                user_id=result["user_id"],
                token_length=len(reset_token)
            )
            
            email_sent = await email_service.send_password_reset_email(
                email=request.email,
                reset_token=reset_token,
            )

            if not email_sent:
                logger.error(
                    "CRITICAL: Password reset email failed to send",
                    email=request.email,
                    user_id=result["user_id"]
                )

        logger.info("Forgot password request completed", email=request.email, email_sent=email_sent)

        # Always return success message for security (don't reveal if email exists)
        return ForgotPasswordResponse(
            success=True,
            message="If your email is registered, you will receive password reset instructions shortly.",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Forgot password request failed", email=request.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset request failed",
        )


@router.get("/validate-reset-token")
async def validate_reset_token(
    email: str,
    token: str,
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Validate password reset token"""
    try:
        logger.info("Reset token validation", email=email, token_length=len(token))

        result = user_repo.validate_reset_token(email=email, reset_token=token)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )

        return {
            "success": True,
            "message": "Reset token is valid",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Reset token validation failed", email=email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token validation failed",
        )


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    request: ResetPasswordRequest,
    registration_service: UserRegistrationService = Depends(
        get_user_registration_service_dependency
    ),
):
    """Reset password using validated token"""
    try:
        logger.info(
            "Password reset attempt",
            email=request.email,
            token_length=len(request.reset_token),
        )

        result = await registration_service.reset_password(request)

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Password reset failed"),
            )

        return ResetPasswordResponse(
            success=True,
            message=result.get(
                "message",
                "Password reset successfully. You can now log in with your new password.",
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Password reset failed", email=request.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed",
        )
