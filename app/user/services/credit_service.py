"""
Simple Credit Service - GET APIs only
Handles user credit balance, credit rules queries, and credit history
Does NOT handle session analysis credit deduction (that's in session-analysis domain)
"""

import structlog
from typing import Dict, List, Any
from fastapi import Depends

from app.user.models import CoreRepository, get_core_repository

logger = structlog.get_logger()


class CreditService:
    """
    Simple Credit Service for general credit queries

    HANDLES ONLY:
    - User credit balance queries
    - Credit rules lookup
    - Credit history retrieval

    DOES NOT HANDLE:
    - Session analysis credit deduction (see session-analysis/session_credit_deduction.py)
    - LLM access gates (that's session-specific)
    """

    def __init__(self, core_repo: CoreRepository = Depends(get_core_repository)):
        self.core_repo = core_repo
        logger.info("CreditService initialized with CoreRepository")

    def get_user_credit_balance(self, user_id: str) -> Dict[str, Any]:
        """Get user's current credit balance and plan info"""
        try:
            user_access_data = self.core_repo.get_user_access_limits(user_id)

            if not user_access_data:
                return {
                    "success": False,
                    "error": "User access data not found",
                    "credits_remaining": 0,
                    "plan_type": "unknown",
                }

            return {
                "success": True,
                "credits_remaining": user_access_data.get("remaining_count", 0),
                "plan_type": user_access_data.get("plan_type", "basic"),
                "total_allocated": user_access_data.get("allocated_count", 0),
                "used_count": user_access_data.get("used_count", 0),
            }

        except Exception as e:
            logger.error(
                "Failed to get user credit balance", user_id=user_id, error=str(e)
            )
            return {
                "success": False,
                "error": str(e),
                "credits_remaining": 0,
                "plan_type": "unknown",
            }

    def get_credit_rules(self, level: str) -> List[Dict[str, Any]]:
        """Get credit rules for a specific level"""
        try:
            credit_rules = self.core_repo.get_credit_rules(level)

            if not credit_rules:
                logger.warning("No credit rules found", level=level)
                return []

            logger.info("Retrieved credit rules", level=level, count=len(credit_rules))
            return credit_rules

        except Exception as e:
            logger.error("Failed to get credit rules", level=level, error=str(e))
            return []

    def get_user_credit_history(self, user_id: str, limit: int = 50) -> Dict[str, Any]:
        """Get user's credit usage history"""
        try:
            history_data = self.core_repo.get_user_usage_history(user_id, limit)

            # Since the ODM method returns "coming soon" placeholders,
            # we'll return a consistent structure
            return {
                "success": True,
                "usage_history": history_data or [],
                "total_records": len(history_data or []),
                "status": "success" if history_data is not None else "coming_soon",
            }

        except Exception as e:
            logger.error("Failed to get credit history", user_id=user_id, error=str(e))
            return {
                "success": False,
                "error": str(e),
                "usage_history": [],
                "total_records": 0,
            }

    def get_credit_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get user's credit usage statistics"""
        try:
            stats_data = self.core_repo.get_usage_statistics(user_id)

            return {
                "success": True,
                "statistics": stats_data,
                "status": "success" if stats_data is not None else "coming_soon",
            }

        except Exception as e:
            logger.error(
                "Failed to get credit statistics", user_id=user_id, error=str(e)
            )
            return {"success": False, "error": str(e), "statistics": {}}
