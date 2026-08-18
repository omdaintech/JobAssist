"""Language service orchestrates read operations for available languages."""

from typing import Any, Dict

import structlog

from app.user.models import CoreRepository, get_core_repository

logger = structlog.get_logger()


class LanguageService:
    """Service layer for language catalogue queries."""

    def __init__(self, core_repo: CoreRepository) -> None:
        self.core_repo = core_repo

    def list_languages(self) -> Dict[str, Any]:
        try:
            languages = self.core_repo.get_available_languages()
            return {"success": True, "languages": languages}
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error("Failed to list languages", error=str(exc))
            return {"success": False, "message": "Failed to retrieve languages"}


def get_language_service() -> LanguageService:
    """Factory for dependency injection."""
    return LanguageService(get_core_repository())
