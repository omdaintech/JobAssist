"""
School Template Management Router - SCHOOL DOMAIN
Handles school-scoped template management endpoints
All operations are automatically scoped to the school admin's school
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
import structlog
from typing import Dict, Any, Optional

# Import school models
from app.school.models.school_requests import (
    SchoolTemplateCreateRequest, SchoolTemplateUpdateRequest
)
from app.school.models.school_responses import (
    SchoolTemplateListResponse, SchoolTemplateCreateResponse, SchoolStandardResponse
)

# Import school services
from app.school.services.school_template_service import (
    SchoolTemplateService, get_school_template_service
)

# Import shared school dependencies
from app.school.dependencies import get_school_admin_dependency

logger = structlog.get_logger()

# Create template management router
router = APIRouter(
    prefix="/templates",
    tags=["Schools - Template Management"],
    responses={404: {"description": "Not found"}},
)


# ===============================
# DEPENDENCY INJECTION
# ===============================

get_school_admin = get_school_admin_dependency


# ===============================
# TEMPLATE MANAGEMENT ENDPOINTS
# ===============================

@router.get("", response_model=SchoolTemplateListResponse)
async def list_school_templates(
    level: Optional[str] = Query(None, description="Filter by CEFR level (A1, A2, B1, ALL)"),
    session_type: Optional[str] = Query(None, description="Filter by session type (exam, practice)"),
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    template_service: SchoolTemplateService = Depends(get_school_template_service),
):
    """List templates in school admin's school with optional filters"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping

        logger.info(
            "School admin listing templates",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            level=level,
            session_type=session_type
        )

        result = template_service.get_school_templates(
            school_id=school_id,
            level=level,
            session_type=session_type
        )

        if result["success"]:
            return SchoolTemplateListResponse(
                success=True,
                message=result["message"],
                templates=result["templates"],
                active_template_count=result.get("active_template_count"),
                max_templates=result.get("max_templates")
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )

    except Exception as e:
        logger.error(
            "Failed to list school templates",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve templates"
        )


@router.post("", response_model=SchoolTemplateCreateResponse)
async def create_school_template(
    template_data: SchoolTemplateCreateRequest,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    template_service: SchoolTemplateService = Depends(get_school_template_service),
):
    """Create a new template in school admin's school"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin creating template",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            template_name=template_data.template_name
        )

        # Convert Pydantic model to dict
        template_dict = template_data.model_dump()

        result = template_service.create_school_template(
            school_id=school_id,
            template_data=template_dict
        )

        return SchoolTemplateCreateResponse(
            success=result["success"],
            message=result["message"],
            template_id=result.get("template_id")
        )

    except Exception as e:
        logger.error(
            "Failed to create template in school",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create template"
        )


@router.put("/{template_id}", response_model=SchoolStandardResponse)
async def update_school_template(
    template_id: str,
    template_data: SchoolTemplateUpdateRequest,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    template_service: SchoolTemplateService = Depends(get_school_template_service),
):
    """Update template in school admin's school"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin updating template",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            template_id=template_id
        )

        # Convert Pydantic model to dict, excluding None values
        template_dict = template_data.model_dump(exclude_none=True)

        result = template_service.update_school_template(
            school_id=school_id,
            template_id=template_id,
            template_data=template_dict
        )

        return SchoolStandardResponse(
            success=result["success"],
            message=result["message"],
            data={"template_id": result.get("template_id")} if result.get("template_id") else None
        )

    except Exception as e:
        logger.error(
            "Failed to update template in school",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            template_id=template_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update template"
        )


@router.delete("/{template_id}", response_model=SchoolStandardResponse)
async def delete_school_template(
    template_id: str,
    force_deactivate: bool = Query(False, description="Force deactivate template even if it has usage"),
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    template_service: SchoolTemplateService = Depends(get_school_template_service),
):
    """Delete template in school admin's school (soft delete or deactivate)"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin deleting template",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            template_id=template_id,
            force_deactivate=force_deactivate
        )

        result = template_service.delete_school_template(
            school_id=school_id,
            template_id=template_id,
            force_deactivate=force_deactivate
        )

        return SchoolStandardResponse(
            success=result["success"],
            message=result["message"],
            data=result.get("data")
        )

    except Exception as e:
        logger.error(
            "Failed to delete template in school",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            template_id=template_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete template"
        )
