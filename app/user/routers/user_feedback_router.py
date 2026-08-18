"""
User Feedback Router
Authenticated user feedback endpoints
"""

from fastapi import APIRouter, Depends, Request
import structlog

from app.dependencies import get_current_user
from app.user.models.user_feedback_requests import UserFeedbackRequest
from app.user.models.user_feedback_responses import (
    FeedbackSubmissionResponse,
    FeedbackHistoryResponse
)
from app.user.services.user_feedback_service import UserFeedbackService, get_user_feedback_service

logger = structlog.get_logger()

router = APIRouter(prefix="/users", tags=["Users - Feedback"])


@router.post("/feedback", response_model=FeedbackSubmissionResponse, status_code=201)
async def submit_feedback(
    request_data: UserFeedbackRequest,
    request: Request,
    user: dict = Depends(get_current_user),
    feedback_service: UserFeedbackService = Depends(get_user_feedback_service)
):
    """
    Submit user feedback (authenticated endpoint)
    
    - **message**: Feedback message (10-5000 characters)
    - **category**: Feedback category (bug_report, feature_request, etc.)
    - **severity**: Issue severity (optional, defaults to medium if not provided)
    - **user_context**: Optional additional context (page, device, etc.)
    
    Returns message_id on success.
    """
    try:
        user_id = user.get("user_id")
        
        # Get client IP and user agent
        client_ip = request.client.host if request.client else ""
        user_agent = request.headers.get("user-agent", "")
        
        # Default severity to medium if not provided
        severity = request_data.severity.value if request_data.severity else "medium"
        
        result = feedback_service.submit_feedback(
            user_id=user_id,
            message=request_data.message,
            category=request_data.category.value,
            severity=severity,
            user_context=request_data.user_context,
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        return FeedbackSubmissionResponse(
            success=True,
            message="Thank you for your feedback! We'll review it and get back to you if needed.",
            data=result
        )
        
    except Exception as e:
        logger.error("Feedback submission failed", error=str(e), user_id=user.get("user_id"))
        raise


@router.get("/feedback/history", response_model=FeedbackHistoryResponse)
async def get_feedback_history(
    user: dict = Depends(get_current_user),
    feedback_service: UserFeedbackService = Depends(get_user_feedback_service)
):
    """
    Get user's feedback submission history
    
    Returns list of user's previous feedback submissions.
    """
    try:
        user_id = user.get("user_id")
        
        result = feedback_service.get_user_feedback_history(user_id)
        
        return FeedbackHistoryResponse(
            success=True,
            message="Feedback history retrieved successfully",
            data=result
        )
        
    except Exception as e:
        logger.error("Failed to get feedback history", error=str(e), user_id=user.get("user_id"))
        raise
