"""
User Feedback Request Models
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from enum import Enum


class FeedbackCategory(str, Enum):
    """Feedback category enum"""
    bug_report = "bug_report"
    feature_request = "feature_request"
    general_feedback = "general_feedback"
    user_experience = "user_experience"
    content_quality = "content_quality"


class FeedbackSeverity(str, Enum):
    """Feedback severity enum"""
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class UserFeedbackRequest(BaseModel):
    """User feedback submission request"""
    message: str = Field(..., min_length=10, max_length=5000, description="Feedback message")
    category: FeedbackCategory = Field(..., description="Feedback category")
    severity: Optional[FeedbackSeverity] = Field(None, description="Issue severity (deprecated, defaults to medium)")
    user_context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")

    @validator('message')
    def validate_message(cls, v):
        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "message": "The reading exercise is not displaying properly on mobile devices.",
                "category": "bug_report",
                "severity": "medium",
                "user_context": {
                    "page": "/practice/reading",
                    "device": "iPhone 13"
                }
            }
        }
