"""
User Response Models - USER DOMAIN
Standardized Pydantic models for user API responses
Follows the same pattern as admin and school domains
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


# ===============================
# SHARED USER MODELS
# ===============================

class UserStandardResponse(BaseModel):
    """Standard user API response format - matches admin/school pattern"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")


# ===============================
# AUTHENTICATION RESPONSES
# ===============================

class UserAuthData(BaseModel):
    """User authentication data model"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user_id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    name: Optional[str] = Field(None, description="User name")


class UserAuthResponse(BaseModel):
    """User authentication response - STANDARDIZED FORMAT"""
    success: bool = Field(..., description="Authentication success status")
    message: str = Field(..., description="Authentication message")
    data: Optional[UserAuthData] = Field(None, description="Authentication data")


# ===============================
# PROFILE MANAGEMENT RESPONSES
# ===============================

class UserProfileData(BaseModel):
    """User profile data model"""
    user_id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    name: Optional[str] = Field(None, description="User name")
    current_level: str = Field(..., description="Current CEFR level")
    preferred_language_id: Optional[str] = Field(None, description="Preferred language ID")
    is_active: bool = Field(..., description="Account active status")
    email_verified: bool = Field(..., description="Email verification status")
    created_at: Optional[str] = Field(None, description="Account creation date")
    last_login: Optional[str] = Field(None, description="Last login date")


class UserProfileResponse(BaseModel):
    """User profile response - STANDARDIZED FORMAT"""
    success: bool = Field(..., description="Profile operation success status")
    message: str = Field(..., description="Profile operation message")
    data: Optional[UserProfileData] = Field(None, description="Profile data")


class UserPreferencesData(BaseModel):
    """User preferences data model"""
    favorite_activities: Optional[List[str]] = Field(None, description="Favorite activity types")
    daily_goal: Optional[int] = Field(None, description="Daily practice goal")
    preferred_language_id: Optional[str] = Field(None, description="Preferred language ID")
    practice_batch_size: Optional[int] = Field(None, description="Practice session batch size")
    notification_settings: Optional[Dict[str, Any]] = Field(None, description="Notification preferences")


class UserPreferencesResponse(BaseModel):
    """User preferences response - STANDARDIZED FORMAT"""
    success: bool = Field(..., description="Preferences operation success status")
    message: str = Field(..., description="Preferences operation message")
    data: Optional[UserPreferencesData] = Field(None, description="Preferences data")


# ===============================
# SESSION MANAGEMENT RESPONSES
# ===============================

class SessionData(BaseModel):
    """Session data model"""
    session_id: str = Field(..., description="Session ID")
    session_type: str = Field(..., description="Session type (practice/exam)")
    level: str = Field(..., description="CEFR level")
    language_id: str = Field(..., description="Language ID")
    status: str = Field(..., description="Session status")
    created_at: str = Field(..., description="Session creation date")
    total_questions: Optional[int] = Field(None, description="Total questions")
    answered_questions: Optional[int] = Field(None, description="Answered questions")


class SessionCreateResponse(BaseModel):
    """Session creation response - STANDARDIZED FORMAT"""
    success: bool = Field(..., description="Session creation success status")
    message: str = Field(..., description="Session creation message")
    data: Optional[SessionData] = Field(None, description="Session data")


class SessionListData(BaseModel):
    """Session list data model"""
    sessions: List[SessionData] = Field(..., description="List of user sessions")
    total_count: int = Field(..., description="Total session count")
    page: int = Field(..., description="Current page")
    per_page: int = Field(..., description="Sessions per page")
    has_more: bool = Field(..., description="More sessions available")


class SessionListResponse(BaseModel):
    """Session list response - STANDARDIZED FORMAT"""
    success: bool = Field(..., description="Session list success status")
    message: str = Field(..., description="Session list message")
    data: Optional[SessionListData] = Field(None, description="Session list data")


# ===============================
# CREDIT MANAGEMENT RESPONSES
# ===============================

class CreditBalanceData(BaseModel):
    """Credit balance data model"""
    allocated_count: int = Field(..., description="Total allocated credits")
    used_count: int = Field(..., description="Used credits")
    remaining_count: int = Field(..., description="Remaining credits")
    plan_type: str = Field(..., description="Current plan type")
    status: str = Field(..., description="Account status")
    reset_at: Optional[str] = Field(None, description="Next reset date")


class CreditBalanceResponse(BaseModel):
    """Credit balance response - STANDARDIZED FORMAT"""
    success: bool = Field(..., description="Credit balance success status")
    message: str = Field(..., description="Credit balance message")
    data: Optional[CreditBalanceData] = Field(None, description="Credit balance data")


class CreditRuleData(BaseModel):
    """Credit rule data model"""
    level: str = Field(..., description="CEFR level")
    session_type: str = Field(..., description="Session type")
    activity_type: str = Field(..., description="Activity type")
    credits_required: int = Field(..., description="Credits required")
    active: bool = Field(..., description="Rule active status")


class CreditRulesData(BaseModel):
    """Credit rules data model"""
    level: str = Field(..., description="CEFR level")
    rules: List[CreditRuleData] = Field(..., description="Credit rules for level")


class CreditRulesResponse(BaseModel):
    """Credit rules response - STANDARDIZED FORMAT"""
    success: bool = Field(..., description="Credit rules success status")
    message: str = Field(..., description="Credit rules message")
    data: Optional[CreditRulesData] = Field(None, description="Credit rules data")


# ===============================
# QUESTION & PRACTICE RESPONSES
# ===============================

class QuestionData(BaseModel):
    """Question data model"""
    question_id: str = Field(..., description="Question ID")
    activity_type: str = Field(..., description="Activity type")
    level: str = Field(..., description="CEFR level")
    question_content: Dict[str, Any] = Field(..., description="Question content")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Question metadata")


class QuestionResponse(BaseModel):
    """Question response - STANDARDIZED FORMAT"""
    success: bool = Field(..., description="Question retrieval success status")
    message: str = Field(..., description="Question retrieval message")
    data: Optional[QuestionData] = Field(None, description="Question data")


# ===============================
# ERROR RESPONSES
# ===============================

class UserErrorResponse(BaseModel):
    """User domain error response - STANDARDIZED FORMAT"""
    success: bool = Field(False, description="Always false for errors")
    message: str = Field(..., description="Error message")
    error: Optional[str] = Field(None, description="Error details")
    error_code: Optional[str] = Field(None, description="Error code")
    timestamp: Optional[str] = Field(None, description="Error timestamp")
