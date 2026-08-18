"""Domain-specific exceptions for credit operations."""

from __future__ import annotations

from typing import Optional

from app.credit.models.domain import CEFRLevel


class CreditError(Exception):
    """Base error for all credit domain failures."""

    def __init__(
        self,
        message: str,
        *,
        level: Optional[CEFRLevel] = None,
        trace_id: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.level = level
        self.trace_id = trace_id


class InvalidLevelError(CreditError):
    """Raised when an unsupported CEFR level is requested."""


class CreditRulesNotFoundError(CreditError):
    """Raised when no active rules exist for the requested level."""


class CreditRepositoryError(CreditError):
    """Raised when the repository fails or returns invalid data."""

    def __init__(
        self,
        message: str,
        *,
        level: Optional[CEFRLevel] = None,
        trace_id: Optional[str] = None,
        original_error: Optional[Exception] = None,
    ) -> None:
        super().__init__(message, level=level, trace_id=trace_id)
        self.original_error = original_error
