"""
School Authentication Router - SCHOOL DOMAIN
Handles school admin login, token verification and authentication endpoints
Follows the same pattern as admin auth router
"""

from fastapi import APIRouter, Depends, HTTPException, status
import structlog
from typing import Dict, Any

# Import school models (will create these next)
from app.school.models.school_requests import SchoolLoginRequest
from app.school.models.school_responses import SchoolLoginResponse, SchoolStandardResponse

# Import services
from app.school.services.school_auth_service import get_school_auth_service
from app.common.services.captcha_service import CaptchaService, get_captcha_service
from app.dependencies import get_client_ip

# Import shared school dependencies
from app.school.dependencies import get_school_admin_dependency

logger = structlog.get_logger()

# Create auth router
router = APIRouter(
    prefix="/auth",
    tags=["Schools - Authentication"],
    responses={404: {"description": "Not found"}},
)


# ===============================
# DEPENDENCY INJECTION
# ===============================

def get_auth_service():
    """Get school auth service instance"""
    return get_school_auth_service()


# Use shared school authentication dependency
get_school_admin = get_school_admin_dependency


# ===============================
# AUTHENTICATION ENDPOINTS
# ===============================

@router.post("/login", response_model=SchoolLoginResponse)
async def school_admin_login(
    request: SchoolLoginRequest, 
    auth_service=Depends(get_auth_service),
    captcha_service: CaptchaService = Depends(get_captcha_service),
    client_ip: str = Depends(get_client_ip)
):
    """School admin authentication with email and password"""
    try:
        logger.info("School admin login attempt", email=request.email)

        # Validate CAPTCHA using centralized logic
        await captcha_service.validate_captcha_for_endpoint(
            request.captcha_token, client_ip, require_in_production=True
        )

        # Authenticate school admin
        auth_result = auth_service.authenticate_school_admin(
            email=request.email, password=request.password, remember_me=request.remember_me
        )

        if not auth_result["success"]:
            logger.warning("School admin login failed", email=request.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=auth_result["message"],
            )

        logger.info("School admin login successful", 
                   email=request.email,
                   school_id=auth_result["school_admin"]["school_id"])

        from app.school.models.school_responses import SchoolLoginData, SchoolAdminData
        
        return SchoolLoginResponse(
            success=True,
            message="School admin authentication successful",
            data=SchoolLoginData(
                access_token=auth_result["token"],
                token_type="bearer",
                school_admin=SchoolAdminData(
                    id=auth_result["school_admin"]["id"],
                    email=auth_result["email"],
                    name=auth_result["school_admin"]["name"],
                    school_id=auth_result["school_admin"]["school_id"],
                    permissions=auth_result["school_admin"]["permissions"]
                )
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("School admin login error", email=request.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during authentication",
        )


@router.get("/verify", response_model=SchoolStandardResponse)
async def verify_school_admin_token(school_admin: Dict[str, Any] = Depends(get_school_admin)):
    """Verify school admin JWT token and return school admin info"""
    try:
        logger.info("School admin token verification", 
                   school_admin_id=school_admin["school_admin_id"],
                   school_id=school_admin["school_id"])

        return SchoolStandardResponse(
            success=True,
            message="School admin token is valid",
            data={
                "school_admin_id": school_admin["school_admin_id"],
                "school_id": school_admin["school_id"],
                "email": school_admin["email"],
                "permissions": school_admin["permissions"],
                "type": school_admin["type"],
                "valid": True,
            },
        )

    except Exception as e:
        logger.error("School admin token verification error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during token verification",
        )
