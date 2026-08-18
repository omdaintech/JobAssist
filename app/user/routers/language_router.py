from fastapi import APIRouter, Depends, HTTPException, status

from app.user.services.language_service import LanguageService, get_language_service

router = APIRouter(tags=["Users - Languages"])

@router.get("")
async def get_languages(
    language_service: LanguageService = Depends(get_language_service),
):
    """Get all available languages"""
    try:
        result = language_service.list_languages()

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve languages"),
            )

        return {"success": True, "languages": result.get("languages", []), "message": None}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve languages",
        )
