"""
Result Models for Enhanced Error Handling
Provides structured responses instead of ambiguous None returns
"""

from dataclasses import dataclass
from typing import Optional, Any, Dict, List
from enum import Enum


class ErrorType(Enum):
    """Standardized error types for better categorization"""

    # Database errors
    DATABASE_ERROR = "database_error"
    CONNECTION_ERROR = "connection_error"
    VALIDATION_ERROR = "validation_error"

    # Business logic errors
    NOT_FOUND = "not_found"
    ACCESS_DENIED = "access_denied"
    INVALID_STATE = "invalid_state"
    BUSINESS_RULE_VIOLATION = "business_rule_violation"

    # Service errors
    SERVICE_UNAVAILABLE = "service_unavailable"
    CONFIGURATION_ERROR = "configuration_error"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"

    # Credit system errors
    INSUFFICIENT_CREDITS = "insufficient_credits"
    RULE_NOT_FOUND = "rule_not_found"
    CREDIT_SYSTEM_ERROR = "credit_system_error"

    # LLM provider errors
    LLM_PROVIDER_ERROR = "llm_provider_error"
    LLM_TIMEOUT = "llm_timeout"
    LLM_RATE_LIMIT = "llm_rate_limit"

    # Unknown errors
    UNKNOWN_ERROR = "unknown_error"


@dataclass
class ServiceResult:
    """Base result class for all service operations"""

    success: bool
    error_type: Optional[ErrorType] = None
    message: str = ""
    context: Dict[str, Any] = None

    def __post_init__(self):
        if self.context is None:
            self.context = {}


@dataclass
class UserLookupResult(ServiceResult):
    """Result for user lookup operations"""

    user: Optional[Any] = None  # User model instance
    user_id: Optional[str] = None
    email: Optional[str] = None


@dataclass
class CreditValidationResult(ServiceResult):
    """Result for credit validation and deduction operations"""

    points_deducted: int = 0
    remaining_points: int = 0
    model_name: str = ""
    rule_found: bool = False
    points_cost: Optional[int] = None


@dataclass
class ExamValidationResult(ServiceResult):
    """Result for exam validation operations"""

    exam_detail: Optional[Dict] = None
    current_status: Optional[str] = None
    required_status: str = "completed"
    validation_checks: Dict[str, bool] = None

    def __post_init__(self):
        super().__post_init__()
        if self.validation_checks is None:
            self.validation_checks = {}


@dataclass
class LLMProviderResult(ServiceResult):
    """Result for LLM provider operations"""

    response_content: Optional[str] = None
    provider_used: Optional[str] = None
    model_used: Optional[str] = None
    processing_time_ms: Optional[float] = None
    token_usage: Optional[int] = None
    fallback_used: bool = False


@dataclass
class DatabaseOperationResult(ServiceResult):
    """Result for database operations"""

    data: Optional[Any] = None
    affected_count: int = 0
    operation_type: str = ""  # "create", "read", "update", "delete"
    document_id: Optional[str] = None


@dataclass
class ValidationResult(ServiceResult):
    """Result for validation operations"""

    validation_checks: Dict[str, bool] = None
    failed_checks: List[str] = None

    def __post_init__(self):
        super().__post_init__()
        if self.validation_checks is None:
            self.validation_checks = {}
        if self.failed_checks is None:
            self.failed_checks = []


# Convenience functions for creating common results


def success_result(data: Any = None, message: str = "", **kwargs) -> ServiceResult:
    """Create a successful result"""
    return ServiceResult(
        success=True, message=message, context={"data": data, **kwargs}
    )


def error_result(error_type: ErrorType, message: str, **kwargs) -> ServiceResult:
    """Create an error result"""
    return ServiceResult(
        success=False, error_type=error_type, message=message, context=kwargs
    )


def not_found_result(resource: str, identifier: str = "") -> ServiceResult:
    """Create a not found result"""
    message = f"{resource} not found"
    if identifier:
        message += f" (ID: {identifier})"

    return ServiceResult(
        success=False,
        error_type=ErrorType.NOT_FOUND,
        message=message,
        context={"resource": resource, "identifier": identifier},
    )


def database_error_result(operation: str, error: str) -> ServiceResult:
    """Create a database error result"""
    return ServiceResult(
        success=False,
        error_type=ErrorType.DATABASE_ERROR,
        message=f"Database {operation} failed: {error}",
        context={"operation": operation, "original_error": error},
    )
