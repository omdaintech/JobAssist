"""
User Feedback Response Models
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class FeedbackSubmissionResponse(BaseModel):
    """Response for feedback submission"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Feedback data including message_id")


class FeedbackHistoryItem(BaseModel):
    """Individual feedback history item"""
    id: str = Field(..., description="Message ID")
    message: str = Field(..., description="Feedback message")
    category: str = Field(..., description="Feedback category")
    severity: str = Field(..., description="Severity level")
    is_read: bool = Field(..., description="Whether admin has read this")
    created_at: str = Field(..., description="Submission timestamp")


class FeedbackHistoryResponse(BaseModel):
    """Response for feedback history"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Feedback history data")
