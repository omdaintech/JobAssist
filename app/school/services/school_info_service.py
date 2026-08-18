"""School Info Service - exposes school profile/query operations for school admins."""

from typing import Any, Dict, Optional

import structlog

from app.school.models.school_repository import SchoolRepository

logger = structlog.get_logger()


class SchoolInfoService:
    """Service layer for school profile retrieval."""

    def __init__(self, school_repo: Optional[SchoolRepository] = None) -> None:
        self.school_repo = school_repo or SchoolRepository()

    def get_school_profile(self, school_id: str) -> Dict[str, Any]:
        try:
            profile = self.school_repo.get_school_profile(school_id)
            if not profile:
                return {"success": False, "message": "School profile not found"}

            return {
                "success": True,
                "school": profile,
                "message": "School profile retrieved successfully",
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error(
                "School info service failed to fetch profile",
                school_id=school_id,
                error=str(exc),
            )
            return {"success": False, "message": "Failed to retrieve school profile"}


def get_school_info_service() -> SchoolInfoService:
    """Factory for dependency injection."""
    return SchoolInfoService()
