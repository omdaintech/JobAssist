"""
Admin Question Bank Service - ADMIN DOMAIN ONLY
Handles admin-specific question bank operations: management, bulk operations, analytics
User-facing question operations are handled by UserQuestionService in user domain
"""

import structlog
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = structlog.get_logger()


class AdminQuestionBankService:
    """
    Admin Question Bank Service - ADMIN DOMAIN ONLY
    Handles admin-specific question management operations
    
    SCOPE:
    - Bulk question generation
    - Question bank analytics
    - Question review and approval
    - Admin question management
    
    NOT HANDLED HERE:
    - User-facing question retrieval (handled by UserQuestionService)
    - Practice/exam question serving (user domain responsibility)
    """

    def __init__(self, admin_repository=None):
        if admin_repository is None:
            from app.admin.models.admin_repository import get_admin_repository
            admin_repository = get_admin_repository()

        self.admin_repository = admin_repository

    # ===============================
    # ADMIN-ONLY METHODS
    # ===============================

    def get_question_bank_stats(self, language_id: Optional[str] = None) -> Dict[str, Any]:
        """Get question bank statistics for admin dashboard"""
        try:
            stats = self.admin_repository.get_question_bank_statistics(language_id)
            return {
                "success": True,
                "stats": stats,
                "message": "Question bank statistics retrieved successfully"
            }
        except Exception as e:
            logger.error("Failed to get question bank stats", error=str(e))
            return {
                "success": False,
                "stats": {},
                "message": "Failed to retrieve question bank statistics"
            }

    def bulk_generate_questions(self, generation_request: Dict[str, Any]) -> Dict[str, Any]:
        """Bulk generate questions for admin"""
        try:
            # Admin-specific bulk generation logic
            result = self.admin_repository.bulk_create_questions(generation_request)
            return {
                "success": True,
                "result": result,
                "message": "Questions generated successfully"
            }
        except Exception as e:
            logger.error("Failed to bulk generate questions", error=str(e))
            return {
                "success": False,
                "message": "Failed to generate questions"
            }

    def review_questions(self, question_ids: List[str], review_data: Dict[str, Any]) -> Dict[str, Any]:
        """Review and approve/reject questions"""
        try:
            result = self.admin_repository.update_question_review_status(question_ids, review_data)
            return {
                "success": True,
                "result": result,
                "message": "Questions reviewed successfully"
            }
        except Exception as e:
            logger.error("Failed to review questions", error=str(e))
            return {
                "success": False,
                "message": "Failed to review questions"
            }

    def get_questions_for_admin_review(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Get questions that need admin review"""
        try:
            questions = self.admin_repository.get_questions_by_filters(**filters)
            return {
                "success": True,
                "questions": questions,
                "message": "Questions retrieved for review"
            }
        except Exception as e:
            logger.error("Failed to get questions for review", error=str(e))
            return {
                "success": False,
                "questions": [],
                "message": "Failed to retrieve questions"
            }


def get_admin_question_bank_service() -> AdminQuestionBankService:
    """Get AdminQuestionBankService instance"""
    return AdminQuestionBankService()