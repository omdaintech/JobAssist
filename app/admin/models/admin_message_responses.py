"""
Admin Message Response Models
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class MessageItem(BaseModel):
    """Individual message item"""
    id: str = Field(..., description="Message ID")
    message_type: str = Field(..., description="Message type")
    name: Optional[str] = Field(None, description="Contact/User name")
    email: Optional[str] = Field(None, description="Contact/User email")
    subject: Optional[str] = Field(None, description="Message subject")
    message: str = Field(..., description="Message content")
    user_id: Optional[str] = Field(None, description="User ID for feedback")
    category: Optional[str] = Field(None, description="Feedback category")
    severity: Optional[str] = Field(None, description="Feedback severity")
    source: Optional[str] = Field(None, description="Message source")
    is_read: bool = Field(..., description="Read status")
    admin_notes: Optional[str] = Field(None, description="Admin notes")
    read_at: Optional[str] = Field(None, description="Read timestamp")
    read_by: Optional[str] = Field(None, description="Admin who read")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: Optional[str] = Field(None, description="Update timestamp")


class MessageListResponse(BaseModel):
    """Response for message list"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Message list data")


class MessageDetailResponse(BaseModel):
    """Response for single message detail"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Message detail data")


class MessageStatisticsResponse(BaseModel):
    """Response for message statistics"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Statistics data")


class MessageActionResponse(BaseModel):
    """Response for message actions (mark read, add note, delete)"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Action result data")
