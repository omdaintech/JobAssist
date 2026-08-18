"""
Admin System & Configuration Router
Handles admin system-related endpoints for configuration and health checks
"""

from fastapi import APIRouter, Body, Depends, HTTPException, status
import structlog
from typing import Any, Dict, Optional

from app.admin.models.admin_responses import AdminStandardResponse
from app.admin.dependencies import get_admin_user_dependency
from app.admin.services.admin_system_service import (
    AdminSystemService,
    get_admin_system_service,
)
from app.dependencies import get_prompt_manager

logger = structlog.get_logger()

# Create system router
router = APIRouter(
    tags=["Admins - System Management"],
    responses={404: {"description": "Not found"}},
)


# ===============================
# DEPENDENCY INJECTION
# ===============================





# Use shared admin authentication dependency
get_admin_user = get_admin_user_dependency





# ===============================
# SYSTEM CONFIGURATION ENDPOINTS
# ===============================


@router.get("/credit-rules", response_model=Dict[str, Any])
async def get_credit_rules(
    admin: Dict[str, Any] = Depends(get_admin_user),
    system_service: AdminSystemService = Depends(get_admin_system_service),
):
    """Get current credit/pricing rules configuration"""
    try:
        logger.info("Admin getting credit rules", admin_id=admin["admin_id"])

        result = system_service.get_credit_rules()
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve credit rules"),
            )

        return {
            "success": True,
            "message": "Credit rules retrieved successfully",
            "data": {
                "credit_rules": result["credit_rules"],
            },
            "timestamp": result.get("retrieved_at"),
        }

    except Exception as e:
        logger.error(
            "Failed to get credit rules",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credit rules",
        )


@router.put("/credit-rules/{level}/{session_type}/{activity_type}")
async def update_credit_rule(
    level: str,
    session_type: str,
    activity_type: str,
    rule_data: Dict[str, Any] = Body(...),
    admin: Dict[str, Any] = Depends(get_admin_user),
    system_service: AdminSystemService = Depends(get_admin_system_service),
):
    """Update a specific credit rule"""
    try:
        logger.info(
            "Admin updating credit rule",
            admin_id=admin["admin_id"],
            level=level,
            session_type=session_type,
            activity_type=activity_type,
        )

        result = system_service.update_credit_rule(
            level=level,
            session_type=session_type,
            activity_type=activity_type,
            points_cost=rule_data.get("points_cost"),
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND
                if "not found" in result.get("message", "").lower()
                else status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Failed to update credit rule"),
            )

        return {
            "success": True,
            "message": result.get("message", "Credit rule updated successfully"),
            "updated_rule": result.get("updated_rule", {}),
        }

    except Exception as e:
        logger.error(
            "Failed to update credit rule",
            admin_id=admin["admin_id"],
            level=level,
            session_type=session_type,
            activity_type=activity_type,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update credit rule",
        )


@router.get("/pricing-packs", response_model=Dict[str, Any])
async def get_pricing_packs(
    admin: Dict[str, Any] = Depends(get_admin_user),
    system_service: AdminSystemService = Depends(get_admin_system_service),
):
    """Get available pricing packs configuration"""
    try:
        logger.info("Admin getting pricing packs", admin_id=admin["admin_id"])

        result = system_service.get_pricing_packs()
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve pricing packs"),
            )

        return {
            "success": True,
            "message": "Pricing packs retrieved successfully",
            "data": {
                "pricing_packs": result["pricing_packs"],
            },
            "timestamp": result.get("retrieved_at"),
        }

    except Exception as e:
        logger.error(
            "Failed to get pricing packs",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pricing packs",
        )


@router.get("/stats", response_model=Dict[str, Any])
async def get_admin_stats(
    admin: Dict[str, Any] = Depends(get_admin_user),
    system_service: AdminSystemService = Depends(get_admin_system_service),
):
    """Get admin dashboard statistics"""
    try:
        logger.info(
            "Admin getting dashboard stats", admin_id=admin["admin_id"]
        )

        result = system_service.get_admin_stats()

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve admin statistics"),
            )

        return {
            "success": True,
            "message": "Admin statistics retrieved successfully",
            "data": result["data"],
            "timestamp": result.get("timestamp"),
        }

    except Exception as e:
        logger.error(
            "Failed to get admin stats",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve admin statistics",
        )


@router.get("/health")
async def admin_health_check(
    system_service: AdminSystemService = Depends(get_admin_system_service),
):
    """Admin-specific health check endpoint"""
    try:
        return system_service.get_health_status()

    except Exception as e:
        logger.error("Admin health check failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin service unhealthy",
        )


@router.get("/prompts/list", response_model=AdminStandardResponse)
async def list_prompts(
    language: Optional[str] = None,
    level: Optional[str] = None,
    activity_type: Optional[str] = None,
    admin: Dict[str, Any] = Depends(get_admin_user),
    system_service: AdminSystemService = Depends(get_admin_system_service),
    prompt_manager: Any = Depends(get_prompt_manager),
):
    """List available LLM prompts and templates"""
    try:
        logger.info(
            "Admin listing prompts",
            admin_id=admin["admin_id"],
            language=language,
            level=level,
            activity_type=activity_type,
        )

        result = system_service.list_prompts(
            prompt_manager,
            language=language,
            level=level,
            activity_type=activity_type,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve prompts"),
            )

        return AdminStandardResponse(
            success=True,
            message="Prompts retrieved successfully",
            data=result,
        )

    except Exception as e:
        logger.error(
            "Failed to list prompts",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve prompts",
        )


@router.get("/prompts/content", response_model=AdminStandardResponse)
async def get_prompt_content(
    level: str,
    prompt_type: str,
    language: Optional[str] = None,
    language_id: Optional[str] = None,
    activity_type: Optional[str] = None,
    activity: Optional[str] = None,
    admin: Dict[str, Any] = Depends(get_admin_user),
    system_service: AdminSystemService = Depends(get_admin_system_service),
    prompt_manager: Any = Depends(get_prompt_manager),
):
    """Get content of a specific prompt template"""
    try:
        # Resolve language parameter - use language_id if provided, otherwise language
        language_filter = language_id if language_id else language
        if not language_filter:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'language' or 'language_id' parameter is required",
            )

        # Resolve activity parameter - use activity if provided, otherwise activity_type
        activity_filter = activity if activity else activity_type
        if not activity_filter:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'activity' or 'activity_type' parameter is required",
            )

        # Use language_id directly if provided, otherwise use language
        if language_id:
            language_filter = language_id
        elif language:
            language_filter = language
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'language' or 'language_id' parameter is required",
            )

        logger.info(
            "Admin getting prompt content",
            admin_id=admin["admin_id"],
            language=language_filter,
            level=level,
            activity_type=activity_filter,
            prompt_type=prompt_type,
        )

        result = system_service.get_prompt_content(
            prompt_manager,
            language=language_filter,
            level=level,
            activity_type=activity_filter,
            prompt_type=prompt_type,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve prompt content"),
            )

        return AdminStandardResponse(
            success=True,
            message="Prompt content retrieved successfully",
            data={
                "prompt_content": result.get("prompt_content"),
                "metadata": result.get("metadata", {}),
            },
        )

    except Exception as e:
        logger.error(
            "Failed to get prompt content",
            admin_id=admin["admin_id"],
            language=language,
            level=level,
            activity_type=activity_type,
            prompt_type=prompt_type,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve prompt content",
        )


@router.get("/pricing-policy", response_model=AdminStandardResponse)
async def get_pricing_and_policy_data(
    admin: Dict[str, Any] = Depends(get_admin_user),
    system_service: AdminSystemService = Depends(get_admin_system_service),
):
    """Get pricing and credit information for admin view"""
    try:
        logger.info("Admin getting pricing and policy data", admin_id=admin["admin_id"])

        result = system_service.get_pricing_and_policy_data()

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve pricing and policy data"),
            )

        return AdminStandardResponse(
            success=True,
            message="Pricing and policy data retrieved successfully",
            data={
                "pricing_packs": result.get("pricing_packs", []),
                "credit_rules": result.get("credit_rules", {}),
                "timestamp": result.get("timestamp"),
            }
        )

    except Exception as e:
        logger.error(
            "Failed to get pricing and policy data",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pricing and policy data",
        )

