"""Session-specific credit deduction service kept under the credit domain."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

import structlog

from app.user.models.result_models import ErrorType
from app.user.models import CoreRepository, get_core_repository
from app.common.models.mysql_models import ActivityTypeEnum, SessionTypeEnum, UsageStatusEnum

logger = structlog.get_logger()


@dataclass
class CreditResult:
    """Result of credit validation and deduction."""

    success: bool
    model_name: Optional[str]
    reason: str
    points_deducted: int
    remaining_points: Optional[int] = None
    usage_log_id: Optional[str] = None


@dataclass
class CreditCommitResult:
    """Result of attempting to commit reserved credits."""

    success: bool
    reason: str
    usage_log_id: Optional[str] = None
    llm_analytics_saved: bool = False


class SessionCreditDeduction:
    """
    Session-specific credit deduction service - LLM access gate.

    SESSION-LEVEL CHARGING:
    - 1 point = 1 practice session (all activity types)
    - 6 points = 1 full exam (3 activities × 10 questions)
    - ALL activities cost points (ALL use LLM processing during batch analysis)
    - Session-level charging: One charge per session regardless of activity count

    CRITICAL: This is the ONLY cage gate for LLM access during session analysis.
    All model selection is database-driven from pricing_packs table.
    """

    def __init__(self, core_repo: CoreRepository | None = None):
        self.core_repo = core_repo or get_core_repository()
        logger.info("SessionCreditDeduction initialized for session analysis")

    def reserve_credits_and_log(
        self,
        user_id: str,
        session_type: str,
        activity_type: str,
        level: str,
        exam_id: Optional[str] = None,
        session_id: Optional[str] = None,
        language_id: Optional[str] = None,
    ) -> CreditResult:
        """Reserve credits and create usage_log intent before LLM call.
        
        NOTE: This is ONLY for USER analysis. Admin never calls this endpoint.
        Admin uses separate question generation service.
        """
        try:
            # REMOVED: Admin logic (lines removed Nov 11, 2025)
            # Admin never uses session analysis endpoint - they use question generation
            # Keeping this comment for historical reference

            user_access_data = self.core_repo.get_user_access_limits(user_id)
            if not user_access_data:
                return CreditResult(
                    success=False,
                    model_name=None,
                    reason="User access not found",
                    points_deducted=0,
                )

            if user_access_data.get("status") == "analysis_initiated":
                reservation_time = user_access_data.get("reservation_time")
                return CreditResult(
                    success=False,
                    model_name=None,
                    reason=f"Previous analysis in queue since {reservation_time}",
                    points_deducted=0,
                )

            points_needed = self._calculate_points_cost(
                session_type, activity_type, level
            )
            if points_needed is None:
                rule_identifier = "/".join(
                    [
                        getattr(session_type, "value", session_type),
                        getattr(activity_type, "value", activity_type),
                        level,
                    ]
                )
                return CreditResult(
                    success=False,
                    model_name=None,
                    reason=f"No credit rule found for {rule_identifier}",
                    points_deducted=0,
                )

            remaining = user_access_data.get("remaining_count", 0)

            if remaining < points_needed:
                return CreditResult(
                    success=False,
                    model_name=None,
                    reason=(
                        f"Insufficient credits. Need {points_needed}, "
                        f"have {remaining}"
                    ),
                    points_deducted=0,
                )

            logger.info(
                "CREATING_USAGE_LOG_INTENT",
                user_id=user_id,
                session_type=session_type,
                activity_type=activity_type,
                level=level,
                points_needed=points_needed,
                session_id=session_id,
                language_id=language_id,
            )

            usage_log_result = self.core_repo.create_usage_log_intent(
                user_id=user_id,
                session_type=session_type,
                activity_type=activity_type,
                level=level,
                points_needed=points_needed,
                session_id=session_id,
                language_id=language_id,
            )

            if not usage_log_result.get("success"):
                logger.error(
                    "USAGE_LOG_CREATION_FAILED",
                    user_id=user_id,
                    session_type=session_type,
                    activity_type=activity_type,
                    level=level,
                    error=usage_log_result,
                )
                return CreditResult(
                    success=False,
                    model_name=None,
                    reason="Failed to create usage log",
                    points_deducted=0,
                )

            usage_log_id = usage_log_result.get("usage_log_id")

            reservation_result = self.core_repo.reserve_user_credits(
                user_id=user_id,
                points_needed=points_needed,
            )

            if not reservation_result.get("success"):
                logger.error(
                    "POINT_RESERVATION_FAILED",
                    user_id=user_id,
                    session_type=session_type,
                    activity_type=activity_type,
                    level=level,
                    error=reservation_result,
                )
                self.core_repo.mark_usage_log_failure(
                    usage_log_id=usage_log_id,
                    reason="point_reservation_failed",
                    error_details=reservation_result,
                )
                return CreditResult(
                    success=False,
                    model_name=None,
                    reason="Failed to reserve points",
                    points_deducted=0,
                )

            plan_type = user_access_data.get("plan_type", "basic")
            # NOTE: model_name set to None - users get models from credit_rules during analysis
            model_name = None
            remaining_points = reservation_result.get("remaining_credits")

            logger.info(
                "POINTS_RESERVED",
                user_id=user_id,
                session_type=session_type,
                activity_type=activity_type,
                level=level,
                points_needed=points_needed,
                remaining_points=remaining_points,
                usage_log_id=usage_log_id,
                plan_type=plan_type,
            )

            return CreditResult(
                success=True,
                model_name=model_name,
                reason="Points reserved successfully",
                points_deducted=points_needed,
                remaining_points=remaining_points,
                usage_log_id=usage_log_id,
            )

        except Exception as exc:
            logger.error(
                "CREDIT_RESERVATION_FAILURE",
                user_id=user_id,
                session_type=session_type,
                activity_type=activity_type,
                level=level,
                error=str(exc),
            )
            return CreditResult(
                success=False,
                model_name=None,
                reason=str(exc),
                points_deducted=0,
            )

    def complete_usage_log(
        self,
        usage_log_id: str,
        status: str,
        points_used: int,
        error_details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        DEPRECATED: Use commit_reserved_credits() instead.
        
        Update usage log status after session analysis completes.
        This method is kept for backward compatibility but should not be used in new code.
        """
        logger.warning(
            "DEPRECATED: complete_usage_log called - use commit_reserved_credits instead",
            usage_log_id=usage_log_id
        )
        try:
            if status != UsageStatusEnum.completed.value and status != UsageStatusEnum.completed:
                return {
                    "success": False,
                    "error": f"Unsupported status update '{status}'",
                }

            analytics_payload = None
            if error_details and isinstance(error_details, dict):
                analytics_payload = error_details.get("llm_analytics")

            success = self.core_repo.complete_usage_log(
                usage_log_id=usage_log_id,
                llm_analytics=analytics_payload or {},
            )

            if not success:
                return {
                    "success": False,
                    "error": "Failed to complete usage log",
                }

            return {"success": True}
        except Exception as exc:
            logger.error(
                "USAGE_LOG_UPDATE_FAILED",
                usage_log_id=usage_log_id,
                status=status,
                error=str(exc),
            )
            return {
                "success": False,
                "error": str(exc),
                "error_type": ErrorType.DATABASE_ERROR.value,
            }

    def commit_reserved_credits(
        self,
        user_id: str,
        usage_log_id: str,
        llm_analytics: Optional[Dict[str, Any]] = None,
    ) -> CreditCommitResult:
        """Finalize reserved credits after successful session analysis."""
        try:
            commit_success = self.core_repo.commit_reserved_credits(
                user_id=user_id,
                usage_log_id=usage_log_id,
                llm_analytics=llm_analytics,
            )

            if not commit_success:
                return CreditCommitResult(
                    success=False,
                    reason="Failed to commit reserved credits",
                    usage_log_id=usage_log_id,
                )

            return CreditCommitResult(
                success=True,
                reason="Reserved credits committed successfully",
                usage_log_id=usage_log_id,
                llm_analytics_saved=bool(llm_analytics),
            )

        except Exception as exc:
            logger.error(
                "CREDIT_COMMIT_EXCEPTION",
                user_id=user_id,
                usage_log_id=usage_log_id,
                error=str(exc),
            )
            return CreditCommitResult(
                success=False,
                reason=str(exc),
                usage_log_id=usage_log_id,
            )

    def _calculate_points_cost(
        self, session_type: str, activity_type: str, level: str
    ) -> Optional[int]:
        """Calculate point cost based on credit rules."""
        try:
            normalized_session_type = (
                session_type.value if isinstance(session_type, SessionTypeEnum) else session_type
            )
            normalized_activity_type = (
                activity_type.value if isinstance(activity_type, ActivityTypeEnum) else activity_type
            )

            credit_rule = self.core_repo.get_credit_rule(
                session_type=normalized_session_type,
                activity_type=normalized_activity_type,
                level=level,
            )

            if not credit_rule:
                logger.error(
                    "NO_CREDIT_RULE_FOUND",
                    session_type=normalized_session_type,
                    activity_type=normalized_activity_type,
                    level=level,
                    action_required="Insert credit rule for this combination",
                )
                return None

            try:
                return credit_rule.points_cost
            except AttributeError:
                # Legacy dict-style responses fallback
                return credit_rule.get("points_cost", 0)

        except Exception as exc:
            logger.error(
                "CREDIT_RULE_LOOKUP_FAILED",
                session_type=session_type,
                activity_type=activity_type,
                level=level,
                error=str(exc),
            )
            return None

    def release_reserved_credits(
        self,
        user_id: str,
        usage_log_id: str,
        reason: str = "Analysis failed"
    ) -> Dict[str, Any]:
        """
        Release reserved credits when analysis fails.
        Public interface for credit domain rollback.
        
        NEW METHOD: Replaces deprecated release_reserved_points.
        """
        try:
            success = self.core_repo.release_reserved_credits(
                user_id=user_id,
                usage_log_id=usage_log_id,
                reason=reason
            )
            
            if not success:
                return {
                    "success": False,
                    "error": "Failed to release reserved credits"
                }
            
            logger.info(
                "Credits released via service",
                user_id=user_id,
                usage_log_id=usage_log_id,
                reason=reason
            )
            
            return {"success": True}
            
        except Exception as exc:
            logger.error(
                "Credit release exception",
                user_id=user_id,
                usage_log_id=usage_log_id,
                error=str(exc)
            )
            return {
                "success": False,
                "error": str(exc),
                "error_type": ErrorType.DATABASE_ERROR.value,
            }

