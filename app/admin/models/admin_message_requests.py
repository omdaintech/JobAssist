"""
Admin Message Request Models
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class MessageTypeFilter(str, Enum):
    """Message type filter"""
    contact = "contact"
    feedback = "feedback"
    all = "all"


class FeedbackCategoryFilter(str, Enum):
    """Feedback category filter"""
    bug_report = "bug_report"
    feature_request = "feature_request"
    general_feedback = "general_feedback"
    user_experience = "user_experience"
    content_quality = "content_quality"


class MessageFiltersRequest(BaseModel):
    """Request model for filtering messages"""
    message_type: Optional[MessageTypeFilter] = Field(None, description="Filter by message type")
    is_read: Optional[bool] = Field(None, description="Filter by read status")
    category: Optional[FeedbackCategoryFilter] = Field(None, description="Filter by feedback category")
    email: Optional[str] = Field(None, description="Search by email")
    search_text: Optional[str] = Field(None, description="Search in message content")
    start_date: Optional[datetime] = Field(None, description="Filter from date")
    end_date: Optional[datetime] = Field(None, description="Filter to date")
    limit: int = Field(50, ge=1, le=200, description="Number of results")
    offset: int = Field(0, ge=0, description="Pagination offset")


class MarkMessageReadRequest(BaseModel):
    """Request to mark message as read/unread"""
    is_read: bool = Field(..., description="Read status to set")


class AdminNoteRequest(BaseModel):
    """Request to add admin note to message"""
    note: str = Field(..., min_length=1, max_length=2000, description="Admin note content")
