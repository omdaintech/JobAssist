"""
Session Validator Service - Focused validation only
Handles session existence, status, and data validation
"""

import structlog
from typing import Dict

from app.user.models import CoreRepository, get_core_repository
from fastapi import Depends

logger = structlog.get_logger()


class SessionValidator:
    """
    Focused service for session validation
    Handles only validation logic - no data operations or analysis
    """

    def __init__(self, core_repo: CoreRepository):
        self.core_repo = core_repo

    def validate_session_for_analysis(self, session_id: str, user_id: str) -> Dict:
        """
        Validate session eligibility for analysis

        Business Rules:
        - Only "completed" sessions can be analyzed
        - "analyzed" sessions are final - no re-analysis allowed
        - User must own the session

        Returns:
            Dict with success status and session_detail or error message
        """
        logger.info("Validating session", session_id=session_id, user_id=user_id)

        try:
            session_detail = self.core_repo.get_exam_detail(session_id, user_id)

            if not session_detail:
                logger.warning(
                    "Session not found or access denied",
                    session_id=session_id,
                    user_id=user_id,
                )
                return {
                    "success": False,
                    "reason": (f"Session '{session_id}' not found or access denied"),
                }

            current_status = session_detail["status"]
            session_type = session_detail.get("session_type", "exam")

            # Business Rule: Only completed sessions can be analyzed
            # Analyzed sessions are final - no re-analysis allowed
            if current_status != "completed":
                error_msg = self._get_status_error_message(
                    session_id, current_status, session_type
                )
                logger.warning(
                    "Session validation failed",
                    session_id=session_id,
                    status=current_status,
                    session_type=session_type,
                )
                return {"success": False, "reason": error_msg}

            logger.info(
                "Session validation successful",
                session_id=session_id,
                status=current_status,
            )
            return {"success": True, "session_detail": session_detail}

        except Exception as e:
            logger.error(
                "Session validation error", session_id=session_id, error=str(e)
            )
            return {"success": False, "reason": f"Validation failed: {str(e)}"}

    def _get_status_error_message(
        self, session_id: str, current_status: str, session_type: str
    ) -> str:
        """Generate user-friendly error messages for status issues"""

        if current_status == "analyzed":
            return (
                f"Session '{session_id}' has already been analyzed and is "
                "final. "
                "Analyzed sessions cannot be re-analyzed."
            )
        elif current_status == "in_progress":
            return (
                f"Session '{session_id}' is still in progress. "
                "Please complete all questions before requesting analysis."
            )
        elif current_status == "created":
            return (
                f"Session '{session_id}' has been created but not started. "
                "Please take the session first before requesting analysis."
            )
        else:
            return (
                f"Session '{session_id}' must be 'completed' to analyze. "
                f"Current status: '{current_status}'"
            )
