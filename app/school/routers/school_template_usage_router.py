"""
School Template Usage Reports Router - SCHOOL DOMAIN
Handles school-scoped template usage reporting endpoints
Shows which users have used specific templates
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
import structlog
from typing import Dict, Any, Optional

# Import school models
from app.school.models.school_responses import SchoolStandardResponse

# Import school services (will create next)
from app.school.services.school_template_usage_service import (
    SchoolTemplateUsageService, get_school_template_usage_service
)

# Import shared school dependencies
from app.school.dependencies import get_school_admin_dependency

logger = structlog.get_logger()

# Create template usage reports router
router = APIRouter(
    prefix="/template-usage",
    tags=["Schools - Template Usage"],
    responses={404: {"description": "Not found"}},
)


# ===============================
# DEPENDENCY INJECTION
# ===============================

get_school_admin = get_school_admin_dependency


# ===============================
# TEMPLATE USAGE REPORT ENDPOINTS
# ===============================

@router.get("/templates", response_model=SchoolStandardResponse)
async def get_school_templates_with_usage(
    page: Optional[int] = Query(1, ge=1, description="Page number"),
    per_page: Optional[int] = Query(50, ge=1, le=100, description="Items per page"),
    level: Optional[str] = Query(None, description="Filter by CEFR level (A1, A2, B1)"),
    session_type: Optional[str] = Query(None, description="Filter by session type (exam, practice)"),
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    template_usage_service: SchoolTemplateUsageService = Depends(get_school_template_usage_service),
):
    """Get all school templates with usage statistics"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin getting templates with usage stats",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            page=page,
            per_page=per_page,
            level=level,
            session_type=session_type
        )

        result = template_usage_service.get_templates_with_usage_stats(
            school_id=school_id,
            page=page,
            per_page=per_page,
            level=level,
            session_type=session_type
        )

        if result["success"]:
            return SchoolStandardResponse(
                success=True,
                message=result["message"],
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )

    except Exception as e:
        logger.error(
            "Failed to get templates with usage stats",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve templates with usage statistics"
        )


@router.get("/templates/{template_id}/users", response_model=SchoolStandardResponse)
async def get_template_users(
    template_id: str,
    page: Optional[int] = Query(1, ge=1, description="Page number"),
    per_page: Optional[int] = Query(50, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by session status"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    template_usage_service: SchoolTemplateUsageService = Depends(get_school_template_usage_service),
):
    """Get all users who have used a specific template with their session details"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin getting template users",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            template_id=template_id,
            page=page,
            per_page=per_page,
            status=status
        )

        result = template_usage_service.get_template_users(
            school_id=school_id,
            template_id=template_id,
            page=page,
            per_page=per_page,
            status=status,
            date_from=date_from,
            date_to=date_to
        )

        if result["success"]:
            return SchoolStandardResponse(
                success=True,
                message=result["message"],
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get template users",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            template_id=template_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve template users"
        )


@router.get("/templates/{template_id}/sessions", response_model=SchoolStandardResponse)
async def get_template_sessions(
    template_id: str,
    page: Optional[int] = Query(1, ge=1, description="Page number"),
    per_page: Optional[int] = Query(50, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by session status"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    template_usage_service: SchoolTemplateUsageService = Depends(get_school_template_usage_service),
):
    """Get all sessions that used a specific template with detailed metadata"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin getting template sessions",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            template_id=template_id,
            page=page,
            per_page=per_page,
            status=status
        )

        result = template_usage_service.get_template_sessions(
            school_id=school_id,
            template_id=template_id,
            page=page,
            per_page=per_page,
            status=status,
            date_from=date_from,
            date_to=date_to
        )

        if result["success"]:
            return SchoolStandardResponse(
                success=True,
                message=result["message"],
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get template sessions",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            template_id=template_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve template sessions"
        )


@router.get("/templates/{template_id}/analytics", response_model=SchoolStandardResponse)
async def get_template_analytics(
    template_id: str,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    template_usage_service: SchoolTemplateUsageService = Depends(get_school_template_usage_service),
):
    """Get analytics for a specific template including completion rates and performance metrics"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin getting template analytics",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            template_id=template_id
        )

        result = template_usage_service.get_template_analytics(
            school_id=school_id,
            template_id=template_id
        )

        if result["success"]:
            return SchoolStandardResponse(
                success=True,
                message=result["message"],
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get template analytics",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            template_id=template_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve template analytics"
        )
