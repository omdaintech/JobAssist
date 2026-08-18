"""Admin System Service - handles configuration and system-level operations."""

from datetime import datetime
from typing import Any, Dict, List, Optional

import structlog

from app.admin.models.admin_repository import AdminRepository

logger = structlog.get_logger()


class AdminSystemService:
    """Service layer for admin system/configuration operations."""

    def __init__(self, admin_repo: Optional[AdminRepository] = None) -> None:
        self.admin_repo = admin_repo or AdminRepository()

    # Credit configuration -------------------------------------------------
    def get_credit_rules(self) -> Dict[str, Any]:
        try:
            credit_rules = self.admin_repo.get_credit_rules()
            return {
                "success": True,
                "credit_rules": credit_rules,
                "retrieved_at": datetime.utcnow().isoformat(),
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error("Admin system: failed to fetch credit rules", error=str(exc))
            return {"success": False, "message": "Failed to retrieve credit rules"}

    def update_credit_rule(self, level: str, session_type: str, activity_type: str, points_cost: Optional[int]) -> Dict[str, Any]:
        try:
            credit_rules = self.admin_repo.get_credit_rules()
            rule_to_update: Optional[Dict[str, Any]] = None

            for rule in credit_rules:
                if (
                    rule.get("level") == level
                    and rule.get("session_type") == session_type
                    and rule.get("activity_type") == activity_type
                ):
                    rule_to_update = rule
                    break

            if not rule_to_update:
                return {"success": False, "message": "Credit rule not found"}

            new_cost = points_cost if points_cost is not None else rule_to_update.get("points_cost")
            result = self.admin_repo.update_credit_rule(rule_to_update["id"], new_cost)

            if result.get("success"):
                rule_to_update["points_cost"] = new_cost

            return {
                "success": result.get("success", False),
                "message": result.get("message", "Unable to update credit rule"),
                "updated_rule": rule_to_update if result.get("success") else {},
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error(
                "Admin system: failed to update credit rule",
                level=level,
                session_type=session_type,
                activity_type=activity_type,
                error=str(exc),
            )
            return {"success": False, "message": "Failed to update credit rule"}

    # Pricing --------------------------------------------------------------
    def get_pricing_packs(self) -> Dict[str, Any]:
        try:
            pricing_packs = self.admin_repo.get_pricing_packs()
            return {
                "success": True,
                "pricing_packs": pricing_packs,
                "retrieved_at": datetime.utcnow().isoformat(),
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error("Admin system: failed to fetch pricing packs", error=str(exc))
            return {"success": False, "message": "Failed to retrieve pricing packs"}

    def get_pricing_and_policy_data(self) -> Dict[str, Any]:
        try:
            pricing_packs = self.admin_repo.get_pricing_packs()
            credit_rules = self.admin_repo.get_credit_rules_grouped()
            return {
                "success": True,
                "pricing_packs": pricing_packs,
                "credit_rules": credit_rules,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error("Admin system: failed to fetch pricing and policy data", error=str(exc))
            return {"success": False, "message": "Failed to retrieve pricing and policy data"}

    # Statistics -----------------------------------------------------------
    def get_admin_stats(self) -> Dict[str, Any]:
        try:
            school_stats = self.admin_repo.get_school_stats()
            return {
                "success": True,
                "data": {
                    "totalSchools": school_stats.get("total_schools", 0),
                    "activeSchools": school_stats.get("active_schools", 0),
                    "schoolTypes": school_stats.get("school_types", {}),
                },
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error("Admin system: failed to fetch dashboard stats", error=str(exc))
            return {"success": False, "message": "Failed to retrieve admin statistics"}

    # Health ----------------------------------------------------------------
    def get_health_status(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "service": "admin-api",
            "timestamp": datetime.utcnow().isoformat(),
        }

    # Prompt operations -----------------------------------------------------
    def list_prompts(
        self,
        prompt_manager: Any,
        *,
        language: Optional[str] = None,
        level: Optional[str] = None,
        activity_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            raw_prompts = prompt_manager.list_available_prompts(
                language=language,
                level=level,
                activity_type=activity_type,
            )

            level_groups: Dict[str, Dict[str, Any]] = {}
            for prompt in raw_prompts:
                prompt_level = prompt["level"]
                prompt_activity = prompt["activity"]

                level_entry = level_groups.setdefault(
                    prompt_level, {"level": prompt_level, "activities": {}}
                )
                activities = level_entry["activities"].setdefault(prompt_activity, [])

                activities.append(
                    {
                        "name": prompt["name"],
                        "display_name": prompt["display_name"],
                        "type": prompt["type"],
                        "exists": prompt["exists"],
                        "file_path": prompt["file_path"],
                    }
                )

            level_order = ["A1", "A2", "B1"]
            prompts_structured = [level_groups[level_key] for level_key in level_order if level_key in level_groups]

            language_info = None
            if language and raw_prompts:
                first_prompt = raw_prompts[0]
                language_info = {
                    "language_id": first_prompt.get("language"),
                    "language_name": first_prompt.get("language", "").title(),
                }

            return {
                "success": True,
                "language_info": language_info,
                "prompts": prompts_structured,
                "total_count": len(raw_prompts),
                "filters": {
                    "language": language,
                    "level": level,
                    "activity_type": activity_type,
                },
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error("Admin system: failed to list prompts", error=str(exc))
            return {"success": False, "message": "Failed to retrieve prompts"}

    def get_prompt_content(
        self,
        prompt_manager: Any,
        *,
        language: str,
        level: str,
        activity_type: str,
        prompt_type: str,
    ) -> Dict[str, Any]:
        try:
            prompt_content = prompt_manager.get_prompt_content(
                language=language,
                level=level,
                activity_type=activity_type,
                prompt_type=prompt_type,
            )

            return {
                "success": True,
                "prompt_content": prompt_content,
                "metadata": {
                    "language": language,
                    "level": level,
                    "activity_type": activity_type,
                    "prompt_type": prompt_type,
                },
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error("Admin system: failed to get prompt content", error=str(exc))
            return {"success": False, "message": "Failed to retrieve prompt content"}


def get_admin_system_service() -> AdminSystemService:
    """Factory for dependency injection."""
    return AdminSystemService()
