"""
User Credit Service - USER DOMAIN SERVICE LAYER
Handles user credit rules and balance queries (READ operations only)
Separate from session analysis credit deduction logic
Follows BE_ARCH_v2.md guidelines with proper service layer abstraction
"""

from __future__ import annotations

from typing import Any, Dict, Optional

import structlog

from app.credit.exceptions import (
    CreditError,
    CreditRepositoryError,
    CreditRulesNotFoundError,
)
from app.credit.models import CEFRLevel, CreditRuleDefinition, CreditRulesResult
from app.user.models.core_repository import CoreRepository

logger = structlog.get_logger()


class UserCreditService:
    """Service layer for credit rule lookups and balance information."""

    def __init__(self, core_repo: Optional[CoreRepository] = None) -> None:
        self.core_repo = core_repo or CoreRepository()

    def get_credit_rules(
        self,
        level: CEFRLevel,
        *,
        trace_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> CreditRulesResult:
        """Fetch active credit rules for a CEFR level."""
        log = logger.bind(level=level.value)
        if user_id:
            log = log.bind(user_id=user_id)
        if trace_id:
            log = log.bind(trace_id=trace_id)

        try:
            repo_rules = self.core_repo.get_credit_rules(level.value)
        except Exception as exc:  # pragma: no cover - defensive guard
            log.error("credit_rules_repository_failure", error=str(exc))
            raise CreditRepositoryError(
                "Failed to load credit rules",
                level=level,
                trace_id=trace_id,
                original_error=exc,
            ) from exc

        if repo_rules is None:
            log.error("credit_rules_missing_from_repository")
            raise CreditRepositoryError(
                "Credit repository returned no data",
                level=level,
                trace_id=trace_id,
            )

        parsed_rules: list[CreditRuleDefinition] = []
        for raw_rule in repo_rules:
            try:
                rule = CreditRuleDefinition.from_dict(raw_rule)
            except ValueError as exc:
                log.warning(
                    "credit_rule_invalid",
                    rule_payload=raw_rule,
                    error=str(exc),
                )
                continue

            if rule.active:
                parsed_rules.append(rule)

        if not parsed_rules:
            log.warning("credit_rules_not_found", rule_count=len(repo_rules))
            raise CreditRulesNotFoundError(
                f"No active credit rules configured for level {level.value}",
                level=level,
                trace_id=trace_id,
            )

        result = CreditRulesResult.build(
            level=level,
            rules=parsed_rules,
            message=f"Retrieved {len(parsed_rules)} active credit rules for {level.value}",
        )

        log.info("credit_rules_retrieved", rule_count=result.rule_count())
        return result

    def get_user_credit_balance(self, user_id: str) -> Dict[str, Any]:
        """Get user's current credit balance and plan information."""
        try:
            access_limits = self.core_repo.get_user_access_limits(user_id)

            if access_limits:
                return {
                    "success": True,
                    "user_id": user_id,
                    "balance": {
                        "allocated_count": access_limits.get("allocated_count", 0),
                        "used_count": access_limits.get("used_count", 0),
                        "remaining_count": access_limits.get("remaining_count", 0),
                        "plan_type": access_limits.get("plan_type", "basic"),
                        "status": access_limits.get("status", "unknown"),
                    },
                    "message": "Credit balance retrieved successfully",
                }

            return {
                "success": False,
                "user_id": user_id,
                "balance": {
                    "allocated_count": 0,
                    "used_count": 0,
                    "remaining_count": 0,
                    "plan_type": "basic",
                    "status": "error",
                },
                "message": "Failed to retrieve credit balance",
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error(
                "credit_balance_lookup_failed", user_id=user_id, error=str(exc)
            )
            return {
                "success": False,
                "user_id": user_id,
                "balance": {
                    "allocated_count": 0,
                    "used_count": 0,
                    "remaining_count": 0,
                    "plan_type": "basic",
                    "status": "error",
                },
                "message": "Failed to retrieve credit balance",
            }

    def get_all_credit_rules(self) -> Dict[str, CreditRulesResult]:
        """Get credit rules for all configured CEFR levels."""
        results: Dict[str, CreditRulesResult] = {}
        for level in CEFRLevel:
            try:
                results[level.value] = self.get_credit_rules(level)
            except CreditRulesNotFoundError:
                continue
            except CreditError:
                continue
        return results


def get_user_credit_service() -> UserCreditService:
    """Factory for dependency injection."""
    return UserCreditService()
