"""
Admin School Router - ADMIN DOMAIN
Handles school management endpoints for system administrators
Follows the router pattern established in the admin domain
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Dict, Any, Optional
import structlog

from app.admin.dependencies import get_admin_user_dependency as get_admin_user
from app.admin.models.admin_requests import AdminSchoolUpdateRequest
from app.admin.models.admin_responses import (
    AdminSchoolListResponse,
    AdminSchoolDetailsResponse,
    SchoolImpersonationResponse,
)
from app.admin.services.admin_school_service import get_admin_school_service

logger = structlog.get_logger()

router = APIRouter(prefix="/schools", tags=["Admins - School Management"])


@router.get("/", response_model=AdminSchoolListResponse)
async def get_all_schools(
    page: int = Query(default=1, ge=1, description="Page number (1-based)"),
    per_page: int = Query(default=100, ge=1, le=500, description="Number of schools per page"),
    search: Optional[str] = Query(default=None, description="Search term for school name or email"),
    admin_user: Dict[str, Any] = Depends(get_admin_user),
    school_service=Depends(get_admin_school_service)
):
    """
    Get all schools with comprehensive details
    System admin endpoint for school management
    """
    try:
        result = school_service.get_all_schools(page=page, per_page=per_page, search=search)
        
        return AdminSchoolListResponse(
            success=result["success"],
            message=result["message"],
            schools=result["schools"],
            total_count=result["total_count"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )
    except Exception as e:
        logger.error("Admin school list endpoint failed", admin_id=admin_user.get("admin_id"), error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve schools")


@router.get("/{school_id}", response_model=AdminSchoolDetailsResponse)
async def get_school_details(
    school_id: str,
    admin_user: Dict[str, Any] = Depends(get_admin_user),
    school_service=Depends(get_admin_school_service)
):
    """
    Get comprehensive school details by ID
    System admin endpoint for viewing complete school information
    """
    try:
        result = school_service.get_school_details(school_id)
        
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["message"])
        
        return AdminSchoolDetailsResponse(
            success=result["success"],
            message=result["message"],
            school=result["school"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Admin school details endpoint failed", 
                    admin_id=admin_user.get("admin_id"), school_id=school_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve school details")


@router.put("/{school_id}", response_model=AdminSchoolDetailsResponse)
async def update_school_details(
    school_id: str,
    request: AdminSchoolUpdateRequest,
    admin_user: Dict[str, Any] = Depends(get_admin_user),
    school_service=Depends(get_admin_school_service)
):
    """
    Update comprehensive school details
    System admin endpoint for managing all school information including:
    - Basic info (name, type, description)
    - Contact information (emails, phones)
    - Billing details (billing contact, payment info)
    - Address information (physical, billing, tax addresses)
    - Tax details (tax ID, VAT number)
    - Internal management (priority support, notes, tags)
    - Settings and configuration
    """
    try:
        # Convert request to dict, excluding unset values and properly serializing nested models
        school_data = request.model_dump(exclude_unset=True)
        
        result = school_service.update_school_details(school_id, school_data)
        
        if not result["success"]:
            if "not found" in result["message"].lower():
                raise HTTPException(status_code=404, detail=result["message"])
            else:
                raise HTTPException(status_code=400, detail=result["message"])
        
        logger.info("School updated by admin", 
                   admin_id=admin_user.get("admin_id"), school_id=school_id, 
                   updated_fields=list(school_data.keys()))
        
        return AdminSchoolDetailsResponse(
            success=result["success"],
            message=result["message"],
            school=result["school"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Admin school update endpoint failed", 
                    admin_id=admin_user.get("admin_id"), school_id=school_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update school details")


@router.post("/", response_model=AdminSchoolDetailsResponse)
async def create_school(
    request: AdminSchoolUpdateRequest,
    admin_user: Dict[str, Any] = Depends(get_admin_user),
    school_service=Depends(get_admin_school_service)
):
    """
    Create new school with comprehensive details
    System admin endpoint for creating schools
    """
    try:
        # Convert request to dict, excluding unset values and properly serializing nested models
        school_data = request.model_dump(exclude_unset=True)
        
        # Validate required fields for creation
        if not school_data.get("name"):
            raise HTTPException(status_code=400, detail="School name is required")
        
        result = school_service.create_school(school_data)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        logger.info("School created by admin", 
                   admin_id=admin_user.get("admin_id"), school_name=school_data.get("name"))
        
        return AdminSchoolDetailsResponse(
            success=result["success"],
            message=result["message"],
            school=result["school"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Admin school creation endpoint failed", 
                    admin_id=admin_user.get("admin_id"), error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create school")


@router.delete("/{school_id}")
async def deactivate_school(
    school_id: str,
    admin_user: Dict[str, Any] = Depends(get_admin_user),
    school_service=Depends(get_admin_school_service)
):
    """
    Deactivate school (soft delete)
    System admin endpoint for deactivating schools
    Note: Schools with users cannot be deleted
    """
    try:
        result = school_service.deactivate_school(school_id)
        
        if not result["success"]:
            if "not found" in result["message"].lower():
                raise HTTPException(status_code=404, detail=result["message"])
            else:
                raise HTTPException(status_code=400, detail=result["message"])
        
        logger.info("School deactivated by admin", 
                   admin_id=admin_user.get("admin_id"), school_id=school_id)
        
        return {
            "success": result["success"],
            "message": result["message"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Admin school deactivation endpoint failed", 
                    admin_id=admin_user.get("admin_id"), school_id=school_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to deactivate school")


@router.get("/statistics/overview")
async def get_school_statistics(
    admin_user: Dict[str, Any] = Depends(get_admin_user),
    school_service=Depends(get_admin_school_service)
):
    """
    Get overall school statistics
    System admin endpoint for school analytics
    """
    try:
        result = school_service.get_school_statistics()
        
        return {
            "success": result["success"],
            "message": result["message"],
            "statistics": result["statistics"]
        }
    except Exception as e:
        logger.error("Admin school statistics endpoint failed", 
                    admin_id=admin_user.get("admin_id"), error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve school statistics")




# ===============================
# IMPERSONATION ENDPOINTS
# ===============================

@router.post("/{school_id}/impersonate", response_model=SchoolImpersonationResponse)
async def impersonate_school(
    school_id: str,
    admin_user: Dict[str, Any] = Depends(get_admin_user),
    school_service=Depends(get_admin_school_service)
):
    """
    Admin impersonation of school - Generate school token for admin access
    SECURITY: Logs all impersonation attempts with admin ID for audit trail
    """
    try:
        logger.info("Admin impersonation attempt", 
                   admin_id=admin_user.get("admin_id"),
                   admin_email=admin_user.get("email"),
                   school_id=school_id)

        # Validate school exists and get details
        school_details = school_service.get_school_details(school_id)
        if not school_details["success"]:
            if "not found" in school_details["message"].lower():
                raise HTTPException(status_code=404, detail="School not found")
            raise HTTPException(status_code=400, detail=school_details["message"])

        impersonation_result = school_service.generate_impersonation_token(
            school_id=school_id,
            admin_id=admin_user["admin_id"],
            admin_email=admin_user["email"],
        )

        if not impersonation_result.get("success"):
            failure_message = impersonation_result.get(
                "message", "Failed to generate impersonation token"
            )
            normalized_message = failure_message.lower() if failure_message else ""

            if "no active school admin" in normalized_message:
                status_code = status.HTTP_409_CONFLICT
            elif "not found" in normalized_message:
                status_code = status.HTTP_404_NOT_FOUND
            else:
                status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

            logger.error(
                "Failed to generate impersonation token",
                admin_id=admin_user["admin_id"],
                school_id=school_id,
                message=failure_message,
                status_code=status_code,
            )
            raise HTTPException(status_code=status_code, detail=failure_message)

        from app.admin.models.admin_responses import SchoolImpersonationData

        logger.info(
            "Admin impersonation successful",
            admin_id=admin_user["admin_id"],
            admin_email=admin_user["email"],
            school_id=school_id,
            school_name=school_details["school"]["name"],
        )

        return SchoolImpersonationResponse(
            success=True,
            message="School impersonation token generated successfully",
            data=SchoolImpersonationData(
                access_token=impersonation_result["token"],
                token_type="bearer",
                expires_in=impersonation_result["expires_in"],
                school_id=impersonation_result.get("school_id", school_id),
                school_name=impersonation_result.get("school_name") or school_details["school"]["name"],
                impersonated_by=admin_user["admin_id"],
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("School impersonation endpoint failed", 
                    admin_id=admin_user.get("admin_id"),
                    school_id=school_id,
                    error=str(e))
        raise HTTPException(status_code=500, detail="School impersonation failed")
