"""
Session Data Service - Focused data operations only
Handles session loading, validation, and data retrieval
"""

import structlog
from typing import Dict, List, Optional, Any
from fastapi import Depends

from app.user.models import CoreRepository, get_core_repository

logger = structlog.get_logger()


class SessionDataService:
    """
    Focused service for session data operations
    Handles only database operations - no validation or analysis logic
    """

    def __init__(self, core_repo: CoreRepository):
        self.core_repo = core_repo

    def get_model_for_activity(
        self, 
        activity_type: str,
        language_id: Optional[str] = None,
        level: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get LLM model configuration for activity type.
        Delegates to CoreRepository.
        
        Returns:
            {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "config": {}
            }
            OR None if no mapping found
        """
        return self.core_repo.get_model_for_activity(
            activity_type=activity_type,
            language_id=language_id,
            level=level
        )

    def get_session_answers(self, session_id: str, user_id: str) -> List[Dict]:
        """
        Retrieve all session answers for analysis

        Returns:
            List of answer dictionaries or empty list if none found
        """
        try:
            answers_data = self.core_repo.get_exam_answers(session_id, user_id)

            if not answers_data or "answers" not in answers_data:
                logger.warning(
                    "No session answers found", session_id=session_id, user_id=user_id
                )
                return []

            answers = answers_data["answers"]
            logger.info(
                "Retrieved session answers",
                session_id=session_id,
                answer_count=len(answers),
            )
            return answers

        except Exception as e:
            logger.error(
                "Failed to retrieve session answers",
                session_id=session_id,
                error=str(e),
            )
            return []

    def group_answers_by_activity(
        self, session_answers: List[Dict]
    ) -> Dict[str, List[Dict]]:
        """
        Group session answers by activity type

        Returns:
            Dictionary with activity_type as key and list of answers as value
        """
        grouped = {"reading": [], "writing": [], "grammar": [], "hearing": [], "speaking": []}

        for answer in session_answers:
            activity_type = answer.get("activity_type")
            if activity_type in grouped:
                grouped[activity_type].append(answer)
            else:
                logger.warning("Unknown activity type", activity_type=activity_type)

        logger.info(
            "Grouped answers by activity",
            groups={k: len(v) for k, v in grouped.items()},
        )
        return grouped

    def save_analysis_results(
        self, session_id: str, activity_results: Dict, overall_summary: Dict
    ) -> bool:
        """
        Save complete analysis results to database

        Args:
            session_id: Session identifier
            activity_results: Results for each activity type
            overall_summary: Overall session summary

        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(
                "DATA_SERVICE_SAVING_ANALYSIS_RESULTS",
                session_id=session_id,
                activity_count=len(activity_results),
                activity_types=list(activity_results.keys()),
                overall_summary_keys=list(overall_summary.keys())
            )
            
            # Build complete session summary
            session_summary = {
                "activities": {
                    activity: result.get("section_summary", {})
                    for activity, result in activity_results.items()
                },
                "overall": overall_summary,
            }
            
            logger.info(
                "DATA_SERVICE_SESSION_SUMMARY_BUILT",
                session_id=session_id,
                activities_in_summary=len(session_summary["activities"]),
                overall_score=session_summary["overall"].get("overall_score"),
                completed_activities=session_summary["overall"].get("completed_activities")
            )

            # Update session detail with analysis summary
            logger.info(
                "DATA_SERVICE_UPDATING_EXAM_SUMMARY",
                session_id=session_id
            )
            
            session_updated = self.core_repo.update_exam_summary(
                session_id, session_summary
            )
            
            if session_updated:
                logger.info(
                    "DATA_SERVICE_EXAM_SUMMARY_UPDATED_SUCCESS",
                    session_id=session_id
                )
            else:
                logger.error(
                    "DATA_SERVICE_EXAM_SUMMARY_UPDATE_FAILED",
                    session_id=session_id
                )

            # Batch update individual question feedback
            feedback_updates = []
            for activity, result in activity_results.items():
                individual_feedback = result.get("individual_feedback", {})
                if isinstance(individual_feedback, dict):
                    for question_number, feedback in individual_feedback.items():
                        feedback_updates.append(
                            {"question_number": question_number, "feedback": feedback}
                        )
            
            logger.info(
                "DATA_SERVICE_PREPARING_FEEDBACK_UPDATES",
                session_id=session_id,
                feedback_update_count=len(feedback_updates)
            )

            if feedback_updates:
                logger.info(
                    "DATA_SERVICE_UPDATING_QUESTION_FEEDBACK",
                    session_id=session_id,
                    update_count=len(feedback_updates)
                )
                
                feedback_updated = self.core_repo.batch_update_question_feedback(
                    session_id, feedback_updates
                )
                
                if feedback_updated:
                    logger.info(
                        "DATA_SERVICE_QUESTION_FEEDBACK_UPDATED_SUCCESS",
                        session_id=session_id,
                        updated_count=len(feedback_updates)
                    )
                else:
                    logger.error(
                        "DATA_SERVICE_QUESTION_FEEDBACK_UPDATE_FAILED",
                        session_id=session_id
                    )
            else:
                logger.warning(
                    "DATA_SERVICE_NO_FEEDBACK_UPDATES_FOUND",
                    session_id=session_id
                )
                feedback_updated = True

            success = session_updated and feedback_updated

            if success:
                logger.info(
                    "DATA_SERVICE_ANALYSIS_RESULTS_SAVED_SUCCESS",
                    session_id=session_id,
                    session_updated=session_updated,
                    feedback_updated=feedback_updated
                )
            else:
                logger.error("Failed to save analysis results", session_id=session_id)

            return success

        except Exception as e:
            logger.error(
                "Error saving analysis results", session_id=session_id, error=str(e)
            )
            return False

    def update_session_status(self, session_id: str, status: str) -> bool:
        """
        Update session analysis status

        Args:
            session_id: Session identifier
            status: New status ("analyzed" or "completed")

        Returns:
            True if successful, False otherwise
        """
        try:
            result = self.core_repo.update_exam_status(session_id, status)

            logger.info(
                "Session status updated",
                session_id=session_id,
                status=status,
                success=result,
            )
            return result

        except Exception as e:
            logger.error(
                "Failed to update session status", session_id=session_id, error=str(e)
            )
            return False
