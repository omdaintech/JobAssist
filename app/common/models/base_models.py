"""
Common validation utilities and shared functions
Centralizes validation logic to avoid duplication across models
"""

import re
import html
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class LanguageInfo(BaseModel):
    """Language information response model - matches Language ODM model structure"""

    id: str  # Unique identifier
    name: str
    native_name: Optional[str] = None
    iso_code: Optional[str] = None
    flag_emoji: Optional[str] = "🌐"
    status: Optional[str] = "development"
    available_for_testing: Optional[bool] = False
    available_for_practice: Optional[bool] = False
    supported_levels: Optional[List[str]] = ["A1", "A2", "B1"]  # Optional in DB
    content_availability: Optional[Dict[str, bool]] = None
    created_at: Optional[str] = None  # Datetime converted to ISO string
    updated_at: Optional[str] = None  # Datetime converted to ISO string
    created_by: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = 0


def validate_email_address(email: str) -> str:
    """
    Centralized email validation utility

    Consolidates email validation logic from multiple model files
    to ensure consistency and eliminate duplication.

    Args:
        email: Email address to validate

    Returns:
        str: Validated and normalized email address

    Raises:
        ValueError: If email format is invalid
    """
    # Strip whitespace and convert to lowercase
    email = email.strip().lower()

    # Basic email regex pattern
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

    if not re.match(email_pattern, email):
        raise ValueError("Invalid email format")

    return email


def sanitize_html_input(text: str) -> str:
    """
    Sanitize HTML input by escaping dangerous characters

    Args:
        text: Input text that may contain HTML

    Returns:
        str: HTML-escaped text
    """
    if not text:
        return text

    return html.escape(text.strip())


# ===============================
# STANDARD API RESPONSE MODELS
# ===============================


class StandardApiResponse(BaseModel):
    """Universal API response model for all endpoints"""
    
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Human-readable message")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Response data")
    error: Optional[str] = Field(default=None, description="Error details when success=False")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp")


class PaginatedApiResponse(StandardApiResponse):
    """Standard paginated API response"""
    
    pagination: Dict[str, Any] = Field(..., description="Pagination information")


class ErrorApiResponse(StandardApiResponse):
    """Standard error response"""
    
    success: bool = Field(default=False, description="Always False for errors")
    error: str = Field(..., description="Error details")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Optional error context")


# ===============================
# ERROR RESPONSE UTILITIES
# ===============================

def create_error_response(
    error_message: str,
    user_message: str = None,
    error_data: Optional[Dict[str, Any]] = None
) -> ErrorApiResponse:
    """Create standardized error response"""
    return ErrorApiResponse(
        success=False,
        message=user_message or error_message,
        error=error_message,
        data=error_data
    )
