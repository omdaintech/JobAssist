"""School billing service - aggregates usage and projected charges for schools."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

import structlog

from app.school.models.school_repository import SchoolRepository

logger = structlog.get_logger()


class SchoolBillingService:
    """High-level service for school usage aggregation and billing projections."""

    def __init__(self, repository: Optional[SchoolRepository] = None) -> None:
        self.school_repo = repository or SchoolRepository()

    def get_billing_overview(self, school_id: str) -> Dict[str, Any]:
        result = self.school_repo.get_school_billing_overview(school_id)
        if not result.get("success"):
            return result

        data = result["data"]
        data["current_cycle"] = self._serialize_cycle(data["current_cycle"])
        data["usage_data"] = self._serialize_usage(data["usage_data"])
        data["last_billed_at"] = self._to_iso(data.get("last_billed_at"))
        return {"success": True, "data": data}

    def aggregate_school_usage(
        self,
        school_id: str,
        start_date: Any,
        end_date: Any,
    ) -> Dict[str, Any]:
        result = self.school_repo.get_school_usage_for_period(school_id, start_date, end_date)
        if not result.get("success"):
            return result

        usage = result["data"]
        usage["period"] = self._serialize_cycle(usage["period"])
        usage = self._serialize_usage(usage)
        return {"success": True, "data": usage}

    def calculate_monthly_bill(self, school_id: str) -> Dict[str, Any]:
        cycle_result = self.school_repo.get_current_billing_cycle(school_id)
        if not cycle_result.get("success"):
            return cycle_result

        cycle = cycle_result["data"]
        usage_result = self.school_repo.get_school_usage_for_period(
            school_id,
            cycle["cycle_start"],
            cycle["cycle_end"],
        )
        if not usage_result.get("success"):
            return usage_result

        usage = usage_result["data"]
        billing_result = self.school_repo.calculate_billing_amount(school_id, usage)
        if not billing_result.get("success"):
            return billing_result

        usage["period"] = self._serialize_cycle(usage["period"])
        serialized_usage = self._serialize_usage(usage)
        billing_data = billing_result["data"]

        payload = {
            "cycle": {
                "billing_cycle": cycle["billing_cycle"],
                "start": self._to_iso(cycle["cycle_start"]),
                "end": self._to_iso(cycle["cycle_end"]),
                "last_billed_at": self._to_iso(cycle.get("last_billed_at")),
            },
            "usage": serialized_usage,
            "billing": billing_data,
        }
        return {"success": True, "data": payload}

    def generate_billing_report(
        self,
        school_id: str,
        start_date: Optional[Any] = None,
        end_date: Optional[Any] = None,
    ) -> Dict[str, Any]:
        if start_date and end_date:
            usage_result = self.school_repo.get_school_usage_for_period(school_id, start_date, end_date)
            if not usage_result.get("success"):
                return usage_result
            usage = usage_result["data"]
            cycle_info = {
                "billing_cycle": "custom",
                "cycle_start": usage["period"]["start"],
                "cycle_end": usage["period"]["end"],
                "last_billed_at": None,
            }
        else:
            cycle_result = self.school_repo.get_current_billing_cycle(school_id)
            if not cycle_result.get("success"):
                return cycle_result
            cycle_info = cycle_result["data"]
            usage_result = self.school_repo.get_school_usage_for_period(
                school_id,
                cycle_info["cycle_start"],
                cycle_info["cycle_end"],
            )
            if not usage_result.get("success"):
                return usage_result
            usage = usage_result["data"]

        billing_result = self.school_repo.calculate_billing_amount(school_id, usage)
        if not billing_result.get("success"):
            return billing_result

        usage["period"] = self._serialize_cycle(usage["period"])
        serialized_usage = self._serialize_usage(usage)
        billing_data = billing_result["data"]

        payload = {
            "cycle": {
                "billing_cycle": cycle_info["billing_cycle"],
                "start": self._to_iso(cycle_info["cycle_start"]),
                "end": self._to_iso(cycle_info["cycle_end"]),
                "last_billed_at": self._to_iso(cycle_info.get("last_billed_at")),
            },
            "usage": serialized_usage,
            "billing": billing_data,
        }
        return {"success": True, "data": payload}

    # Helper methods ---------------------------------------------------

    def _serialize_cycle(self, cycle: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "start": self._to_iso(cycle.get("start")),
            "end": self._to_iso(cycle.get("end")),
        }

    def _serialize_usage(self, usage: Dict[str, Any]) -> Dict[str, Any]:
        usage_copy = dict(usage)
        period = usage_copy.get("period")
        if isinstance(period, dict):
            usage_copy["period"] = self._serialize_cycle(period)
        last_usage = usage_copy.get("last_usage_at")
        usage_copy["last_usage_at"] = self._to_iso(last_usage)
        return usage_copy

    def _to_iso(self, value: Any) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)


def get_school_billing_service() -> SchoolBillingService:
    return SchoolBillingService()
