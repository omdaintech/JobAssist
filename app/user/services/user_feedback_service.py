"""
User Feedback Service
Handles user feedback submission and history
"""

import structlog
from typing import Dict, Any
from fastapi import HTTPException

from app.common.models.message_repository import MessageRepository

logger = structlog.get_logger()


class UserFeedbackService:
    """Service for handling user feedback"""

    def __init__(self):
        self.message_repository = MessageRepository()

    def submit_feedback(
        self,
        user_id: str,
        message: str,
        category: str,
        severity: str,
        user_context: Dict[str, Any],
        ip_address: str,
        user_agent: str
    ) -> Dict[str, Any]:
        """
        Submit user feedback
        
        Args:
            user_id: User ID
            message: Feedback message
            category: Feedback category
            severity: Issue severity
            user_context: Additional context (page, device, etc.)
            ip_address: Client IP
            user_agent: Client user agent
            
        Returns:
            Dict with message_id
            
        Raises:
            HTTPException: If submission fails
        """
        try:
            feedback_data = {
                'message': message,
                'category': category,
                'severity': severity,
                'user_context': user_context,
                'source': 'app',
                'ip_address': ip_address,
                'user_agent': user_agent
            }
            
            message_id = self.message_repository.create_feedback_message(user_id, feedback_data)
            
            logger.info(
                "User feedback submitted successfully",
                message_id=message_id,
                user_id=user_id,
                category=category
            )
            
            return {'message_id': message_id}
            
        except Exception as e:
            logger.error("Failed to submit feedback", error=str(e), user_id=user_id)
            raise HTTPException(
                status_code=500,
                detail="Failed to submit feedback. Please try again later."
            )

    def get_user_feedback_history(self, user_id: str, limit: int = 20) -> Dict[str, Any]:
        """
        Get user's feedback history
        
        Args:
            user_id: User ID
            limit: Maximum number of items to return
            
        Returns:
            Dict with feedback list and count
        """
        try:
            feedback_list = self.message_repository.get_user_feedback_history(user_id, limit)
            
            return {
                'feedback_list': feedback_list,
                'count': len(feedback_list)
            }
            
        except Exception as e:
            logger.error("Failed to get feedback history", error=str(e), user_id=user_id)
            return {'feedback_list': [], 'count': 0}


def get_user_feedback_service() -> UserFeedbackService:
    """Dependency for FastAPI endpoints"""
    return UserFeedbackService()
