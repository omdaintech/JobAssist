"""
Public Router - No Authentication Required
Handles public endpoints for shareable session results
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.user.models.response_models import PublicSessionDetailResponse, PublicSessionAnswersResponse
from app.user.services.user_session_service import UserSessionService
from app.dependencies import get_user_session_service_dep
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/public", tags=["Public - Shared Results"])


@router.get("/sessions/shared/{share_code}", response_model=PublicSessionDetailResponse)
async def get_shared_session(
    share_code: str,
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """
    Get shared session details (PUBLIC - no auth required)
    
    - Anyone with share code can view
    - Personal info excluded (user_id, email, name, school)
    - Only works for completed/analyzed sessions
    """
    try:
        session_data = session_service.get_public_session_data(share_code)
        return PublicSessionDetailResponse(
            success=True,
            session=session_data
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Failed to get shared session", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load shared session"
        )


@router.get("/sessions/shared/{share_code}/answers", response_model=PublicSessionAnswersResponse)
async def get_shared_session_answers(
    share_code: str,
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """
    Get shared session answers (PUBLIC - no auth required)
    
    - Returns all questions and answers
    - Includes section summaries if analyzed
    - Personal info excluded
    """
    try:
        answers_data = session_service.get_public_session_answers(share_code)
        return PublicSessionAnswersResponse(
            success=True,
            answers=answers_data['answers'],
            section_summaries=answers_data['section_summaries']
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Failed to get shared answers", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load shared answers"
        )

