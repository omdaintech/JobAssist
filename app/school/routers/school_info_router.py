"""
School Info Router - SCHOOL DOMAIN
Handles general school information endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
import structlog
from typing import Dict, Any

# Import school models
from app.school.models.school_responses import SchoolInfoResponse, SchoolProfileResponse

# Import school services
from app.school.services.school_user_service import get_school_user_service
from app.school.services.school_info_service import (
    SchoolInfoService,
    get_school_info_service,
)

# Import shared school dependencies
from app.school.dependencies import get_school_admin_dependency

logger = structlog.get_logger()

# Create info router (no prefix - endpoints will be at /api/school/*)
router = APIRouter(
    tags=["Schools - Information"],
    responses={404: {"description": "Not found"}},
)


# ===============================
# DEPENDENCY INJECTION
# ===============================

def get_user_service():
    """Get school user service instance"""
    return get_school_user_service()


def get_school_info_service_dependency() -> SchoolInfoService:
    """Get school info service instance"""
    return get_school_info_service()


# Use shared school authentication dependency
get_school_admin = get_school_admin_dependency


# ===============================
# SCHOOL INFO ENDPOINTS
# ===============================

@router.get("/info", response_model=SchoolInfoResponse)
async def get_school_info(
    user_service=Depends(get_user_service),
    school_admin: Dict[str, Any] = Depends(get_school_admin)
):
    """
    Get school information for the authenticated school admin
    
    Returns basic school details including name, type, contact info, etc.
    """
    try:
        # Extract school_id from authenticated school admin
        school_id = school_admin.get("school_id")
        
        if not school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="School ID missing from authentication context"
            )
        
        # Get school info from service
        result = user_service.get_school_info(school_id)
        
        if result["success"]:
            return SchoolInfoResponse(
                success=True,
                message=result["message"],
                data=result["data"]["school"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("School info endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while retrieving school information"
        )


@router.get("/profile", response_model=SchoolProfileResponse)
async def get_school_profile(
    school_info_service: SchoolInfoService = Depends(get_school_info_service_dependency),
    school_admin: Dict[str, Any] = Depends(get_school_admin)
):
    """
    Get comprehensive school profile for school admin view
    Returns all school details except internal management fields
    
    This endpoint shows:
    - Basic information (name, type, description)
    - Contact information (emails, phones)
    - Billing details (billing contact, payment info)
    - Address information (physical, billing, tax)
    - Tax details (tax ID, VAT number)
    - Settings (non-internal configuration)
    
    Excludes internal fields like:
    - Priority support flags
    - Account manager notes
    - Internal tags
    """
    try:
        school_id = school_admin["school_id"]

        result = school_info_service.get_school_profile(school_id)
        if not result.get("success"):
            logger.warning(
                "School profile not found",
                school_id=school_id,
                message=result.get("message"),
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get("message", "School profile not found"),
            )

        logger.info(
            "School profile retrieved",
            school_id=school_id,
            school_admin_id=school_admin["school_admin_id"],
        )

        return SchoolProfileResponse(
            success=True,
            message=result.get("message", "School profile retrieved successfully"),
            school=result.get("school"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("School profile endpoint error", 
                    school_id=school_admin.get("school_id"), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while retrieving school profile"
        )
