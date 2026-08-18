"""
Admin Dashboard Models - Pydantic Request/Response Models

API contracts for admin dashboard endpoints.
Ensures type safety and automatic validation.

Key Features:
- Input validation for time periods and date ranges
- Standardized response formats
- Clear field descriptions for API documentation
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


# =================
# REQUEST MODELS
# =================

class DashboardStatsRequest(BaseModel):
    """
    Request model for dashboard statistics
    
    Supports both:
    1. Preset time periods (hours: 24, 48, 168, 720)
    2. Custom date ranges (start_date + end_date)
    
    If hours is provided, it takes precedence over custom dates.
    """
    hours: Optional[int] = Field(
        default=None,
        description="Preset time period in hours (24, 48, 168, 720). Takes precedence over custom dates.",
        ge=1,
        le=720,
        examples=[24, 48, 168, 720]
    )
    start_date: Optional[str] = Field(
        default=None,
        description="Custom start date in ISO format (e.g., '2025-11-07T00:00:00Z'). Requires end_date.",
        examples=["2025-11-07T00:00:00Z"]
    )
    end_date: Optional[str] = Field(
        default=None,
        description="Custom end date in ISO format (e.g., '2025-11-14T23:59:59Z'). Requires start_date.",
        examples=["2025-11-14T23:59:59Z"]
    )
    language_id: Optional[str] = Field(
        default=None,
        description="Optional language filter UUID. If not provided, shows data for all languages.",
        examples=["lang_67890abcdef123456"]
    )

    @field_validator('hours')
    @classmethod
    def validate_hours(cls, v):
        """Validate hours is one of the preset values"""
        if v is not None:
            valid_hours = [24, 48, 168, 720]
            if v not in valid_hours:
                raise ValueError(f"hours must be one of {valid_hours}")
        return v


# =================
# RESPONSE MODELS
# =================

class TopActivityData(BaseModel):
    """Top activity type data"""
    activity_type: str = Field(
        ..., 
        description="Activity type code (reading, writing, grammar, hearing)",
        examples=["reading"]
    )
    count: int = Field(
        ..., 
        description="Number of times this activity was performed",
        examples=[567]
    )
    display_name: str = Field(
        ..., 
        description="Human-readable activity name",
        examples=["Reading"]
    )


class DashboardStatsData(BaseModel):
    """Dashboard statistics data payload"""
    
    # Core metrics
    total_sessions: int = Field(
        ..., 
        description="Total completed sessions in time period",
        examples=[1234]
    )
    analyzed_sessions: int = Field(
        ..., 
        description="Successfully analyzed sessions",
        examples=[1200]
    )
    total_exams: int = Field(
        ..., 
        description="Full exam sessions",
        examples=[456]
    )
    total_practice: int = Field(
        ..., 
        description="Practice sessions",
        examples=[778]
    )
    new_users: int = Field(
        ..., 
        description="New user registrations in time period",
        examples=[89]
    )
    new_feedback: int = Field(
        ..., 
        description="Unread feedback messages",
        examples=[12]
    )
    new_contact: int = Field(
        ..., 
        description="Unread contact messages",
        examples=[8]
    )
    
    # Top activity
    top_activity: TopActivityData = Field(
        ..., 
        description="Most popular activity type with count"
    )
    
    # Calculated metrics (added by service layer)
    analysis_success_rate: float = Field(
        ..., 
        description="Percentage of sessions successfully analyzed",
        examples=[97.2]
    )
    exam_percentage: float = Field(
        ..., 
        description="Percentage of exam sessions vs total",
        examples=[37.0]
    )
    practice_percentage: float = Field(
        ..., 
        description="Percentage of practice sessions vs total",
        examples=[63.0]
    )
    
    # Metadata
    start_date: str = Field(
        ..., 
        description="Start of time period (ISO format)",
        examples=["2025-11-07T10:30:00Z"]
    )
    end_date: str = Field(
        ..., 
        description="End of time period (ISO format)",
        examples=["2025-11-14T10:30:00Z"]
    )
    time_period_label: Optional[str] = Field(
        None, 
        description="Human-readable time period label",
        examples=["Last 7 Days"]
    )
    time_period_hours: Optional[int] = Field(
        None, 
        description="Time period in hours (if preset was used)",
        examples=[168]
    )
    language_filter: Optional[str] = Field(
        None, 
        description="Language name if filter was applied",
        examples=["German"]
    )
    generated_at: str = Field(
        ..., 
        description="Timestamp when stats were generated (ISO format)",
        examples=["2025-11-14T10:30:00Z"]
    )


class AdminDashboardStatsResponse(BaseModel):
    """Standard API response for dashboard stats"""
    success: bool = Field(
        ..., 
        description="Operation success status",
        examples=[True]
    )
    data: DashboardStatsData = Field(
        ..., 
        description="Dashboard statistics data"
    )
    message: str = Field(
        ..., 
        description="Response message",
        examples=["Dashboard statistics retrieved successfully"]
    )


class LanguageOption(BaseModel):
    """Language filter option"""
    id: str = Field(
        ..., 
        description="Language UUID",
        examples=["lang_67890abcdef123456"]
    )
    name: str = Field(
        ..., 
        description="Language name",
        examples=["German"]
    )
    code: str = Field(
        ..., 
        description="Language code (ISO 639-1)",
        examples=["de"]
    )


class LanguageFilterOptionsResponse(BaseModel):
    """Response for language filter options"""
    success: bool = Field(
        ..., 
        description="Operation success status",
        examples=[True]
    )
    languages: List[LanguageOption] = Field(
        ..., 
        description="Available languages for filtering"
    )
    message: str = Field(
        default="Languages retrieved successfully",
        description="Response message"
    )


class AdminDashboardErrorResponse(BaseModel):
    """Error response for dashboard endpoints"""
    success: bool = Field(
        default=False,
        description="Always false for error responses"
    )
    error: str = Field(
        ..., 
        description="Error message",
        examples=["Failed to retrieve dashboard statistics"]
    )
    detail: Optional[str] = Field(
        None, 
        description="Detailed error information for debugging",
        examples=["Database connection timeout"]
    )
    message: str = Field(
        ..., 
        description="User-friendly error message",
        examples=["An error occurred while loading the dashboard"]
    )


class AdminDashboardHealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(
        ..., 
        description="Service health status",
        examples=["healthy"]
    )
    service: str = Field(
        default="admin_dashboard",
        description="Service name"
    )
    version: str = Field(
        default="1.0.0",
        description="Service version"
    )
    timestamp: str = Field(
        ..., 
        description="Current server timestamp (ISO format)",
        examples=["2025-11-14T10:30:00Z"]
    )
    features: List[str] = Field(
        default=[
            "time_based_filtering",
            "language_filtering",
            "session_analytics",
            "user_tracking",
            "message_monitoring",
            "custom_date_ranges"
        ],
        description="List of available features"
    )
