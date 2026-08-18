"""
Admin Authentication Router
Handles admin login, token verification and authentication endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
import structlog
from typing import Dict, Any

# Import admin models
from app.admin.models.admin_requests import AdminLoginRequest, AdminPasswordChangeRequest
from app.admin.models.admin_responses import (
    AdminLoginResponse,
    AdminPasswordChangeResponse,
    AdminStandardResponse,
)

# Import services
from app.admin.services import get_admin_auth_service
from app.common.services.captcha_service import CaptchaService, get_captcha_service
from app.dependencies import get_client_ip

# Import shared admin dependencies
from app.admin.dependencies import get_admin_user_dependency

logger = structlog.get_logger()

# Create auth router
router = APIRouter(
    prefix="/auth",
    tags=["Admins - Authentication"],
    responses={404: {"description": "Not found"}},
)


# ===============================
# DEPENDENCY INJECTION
# ===============================


def get_auth_service():
    """Get admin auth service instance"""
    return get_admin_auth_service()


# Use shared admin authentication dependency
get_admin_user = get_admin_user_dependency


# ===============================
# AUTHENTICATION ENDPOINTS
# ===============================


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(
    request: AdminLoginRequest, 
    auth_service=Depends(get_auth_service),
    captcha_service: CaptchaService = Depends(get_captcha_service),
    client_ip: str = Depends(get_client_ip)
):
    """Admin authentication with email and password"""
    try:
        logger.info("Admin login attempt", email=request.email)

        # Validate CAPTCHA using centralized logic
        await captcha_service.validate_captcha_for_endpoint(
            request.captcha_token, client_ip, require_in_production=True
        )

        # Authenticate admin user
        auth_result = await auth_service.authenticate_admin(
            email=request.email, password=request.password, remember_me=request.remember_me
        )

        if not auth_result["success"]:
            logger.warning("Admin login failed", email=request.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=auth_result["message"],
            )

        logger.info("Admin login successful", email=request.email)

        return AdminLoginResponse(
            success=True,
            message="Admin authentication successful",
            token=auth_result["token"],
            admin_email=auth_result["email"],
            admin_id=auth_result["admin"]["id"],
            admin_name=auth_result["admin"]["name"],
            admin_role=auth_result["admin"]["role"],
            admin_permissions=auth_result["admin"]["permissions"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Admin login error", email=request.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during authentication",
        )


@router.get("/verify", response_model=AdminStandardResponse)
async def verify_admin_token(admin: Dict[str, Any] = Depends(get_admin_user)):
    """Verify admin JWT token and return admin info"""
    try:
        logger.info("Admin token verification", admin_id=admin["admin_id"])

        return AdminStandardResponse(
            success=True,
            message="Admin token is valid",
            data={
                "admin_id": admin["admin_id"],
                "email": admin["email"],
                "role": admin["role"],
                "permissions": admin["permissions"],
                "type": admin["type"],
                "valid": True,
            },
        )

    except Exception as e:
        logger.error("Admin token verification error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during token verification",
        )


@router.put("/change-password", response_model=AdminPasswordChangeResponse)
async def change_admin_password(
    request: AdminPasswordChangeRequest,
    admin: Dict[str, Any] = Depends(get_admin_user),
    auth_service=Depends(get_auth_service),
):
    """Change admin user password"""
    try:
        logger.info("Admin password change attempt", admin_id=admin["admin_id"])

        # Change password via auth service
        result = await auth_service.change_admin_password(
            admin_id=admin["admin_id"],
            current_password=request.current_password,
            new_password=request.new_password,
        )

        if not result["success"]:
            logger.warning(
                "Admin password change failed",
                admin_id=admin["admin_id"],
                reason=result["message"],
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"],
            )

        logger.info("Admin password changed successfully", admin_id=admin["admin_id"])

        return AdminPasswordChangeResponse(
            success=True,
            message="Password changed successfully",
            admin_id=admin["admin_id"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Admin password change error", admin_id=admin["admin_id"], error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during password change",
        )
