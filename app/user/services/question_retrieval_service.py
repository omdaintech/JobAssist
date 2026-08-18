"""
Service for retrieving questions for user sessions.
"""
import random
import structlog
from typing import Dict, Any, Optional, List

from app.user.models.core_repository import CoreRepository

logger = structlog.get_logger()


class QuestionRetrievalService:
    def __init__(self, core_repo: CoreRepository):
        self.core_repo = core_repo

    def get_random_question(
        self,
        activity_type: str,
        level: str,
        language_id: str,
        user_id: Optional[str] = None,
        session_type: str = "practice",
        exclude_question_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Get a random question for a user session, avoiding duplicates.
        
        Args:
            exclude_question_ids: List of question IDs to exclude (already used in session)
                                 Pass this from get_exam_progress() to avoid extra queries
        """
        try:
            # Use the provided exclusion list to prevent duplicates
            if exclude_question_ids:
                logger.debug(
                    "Excluding already-used questions",
                    excluded_count=len(exclude_question_ids)
                )
            
            # Use language_id directly instead of converting to language_code
            # This avoids unnecessary language resolution and potential join issues
            questions = self.core_repo.get_questions_by_filters(
                language_id=language_id,
                activity_type=activity_type,
                level=level,
                exclude_question_ids=exclude_question_ids,
            )

            if not questions:
                logger.warning(
                    "Question bank empty for filters",
                    activity_type=activity_type,
                    level=level,
                    language_id=language_id,
                    excluded_count=len(exclude_question_ids) if exclude_question_ids else 0,
                )
                return {
                    "success": False,
                    "error": "question_bank_empty",
                    "message": "No questions available for the selected criteria.",
                }

            selected_question = random.choice(questions)
            question_data = selected_question 

            # Optionally log usage
            if user_id:
                # This could be a call to a separate logging service or ODM method
                pass

            return {"success": True, "question_data": question_data}

        except Exception as e:
            logger.error(
                "Failed to retrieve random question",
                error=str(e),
                activity_type=activity_type,
                level=level,
                language_id=language_id,
            )
            return {
                "success": False,
                "error": "internal_server_error",
                "message": "Could not retrieve a question.",
            }
