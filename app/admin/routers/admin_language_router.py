"""Admin language management router - provides language catalog for admin operations."""

from fastapi import APIRouter, Depends, HTTPException, status
import structlog

from app.admin.dependencies import get_admin_user_dependency
from app.user.services.language_service import LanguageService, get_language_service

logger = structlog.get_logger()
router = APIRouter(tags=["Admin - Languages"])


@router.get("/languages")
async def get_active_languages(
    admin: dict = Depends(get_admin_user_dependency),
    language_service: LanguageService = Depends(get_language_service),
):
    """
    Get all active languages for admin operations.
    
    Returns list of active languages with their metadata.
    Admins need this to populate language selection dropdowns
    and filter question management interfaces.
    """
    try:
        result = language_service.list_languages()

        if not result.get("success"):
            logger.error(
                "Failed to retrieve active languages",
                admin_id=admin.get("admin_id"),
                error=result.get("message"),
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve languages"),
            )

        raw_languages = result.get("languages", [])
        
        # Transform the response to match frontend expectations
        # Convert language_id -> id, language_name -> name
        # Include supported_levels from database
        languages = [
            {
                "id": lang.get("language_id"),
                "name": lang.get("language_name"),
                "native_name": lang.get("native_name"),
                "is_active": lang.get("is_active", True),
                "supported_levels": lang.get("supported_levels", [])
            }
            for lang in raw_languages
        ]
        
        logger.info(
            "Admin retrieved active languages",
            admin_id=admin.get("admin_id"),
            language_count=len(languages),
        )

        return {
            "success": True,
            "languages": languages,
            "message": "Active languages retrieved successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error retrieving languages",
            admin_id=admin.get("admin_id"),
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve active languages",
        )
