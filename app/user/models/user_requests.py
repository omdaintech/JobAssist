"""
User Request Models - USER DOMAIN
Standardized Pydantic models for user API requests
Follows the same pattern as admin and school domains
"""

from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, Dict, Any, List


# ===============================
# AUTHENTICATION REQUESTS
# ===============================

class UserLoginRequest(BaseModel):
    """User login request - STANDARDIZED FORMAT"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")
    captcha_token: Optional[str] = Field(None, description="CAPTCHA token")

    @validator('email')
    def validate_email(cls, v):
        return v.lower().strip()


class UserSignupRequest(BaseModel):
    """User signup request - STANDARDIZED FORMAT"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password")
    name: Optional[str] = Field(None, max_length=100, description="User full name")
    captcha_token: str = Field(..., description="CAPTCHA token")

    @validator('email')
    def validate_email(cls, v):
        return v.lower().strip()

    @validator('name')
    def validate_name(cls, v):
        if v:
            return v.strip()
        return v


class UserPasswordChangeRequest(BaseModel):
    """User password change request - STANDARDIZED FORMAT"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")


class UserEmailVerificationRequest(BaseModel):
    """User email verification request - STANDARDIZED FORMAT"""
    email_hash: str = Field(..., description="Email verification hash")
    verification_code: str = Field(..., min_length=6, max_length=6, description="Verification code")


class UserPasswordResetRequest(BaseModel):
    """User password reset request - STANDARDIZED FORMAT"""
    email: EmailStr = Field(..., description="User email address")
    captcha_token: str = Field(..., description="CAPTCHA token")

    @validator('email')
    def validate_email(cls, v):
        return v.lower().strip()


# ===============================
# PROFILE MANAGEMENT REQUESTS
# ===============================

class UserProfileUpdateRequest(BaseModel):
    """User profile update request - STANDARDIZED FORMAT"""
    name: Optional[str] = Field(None, max_length=100, description="User full name")
    current_level: Optional[str] = Field(None, description="Current CEFR level")
    preferred_language_id: Optional[str] = Field(None, description="Preferred language ID")
    phone_number: Optional[str] = Field(None, max_length=20, description="Phone number")

    @validator('name')
    def validate_name(cls, v):
        if v:
            return v.strip()
        return v

    @validator('current_level')
    def validate_level(cls, v):
        if v and v not in ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']:
            raise ValueError('Level must be a valid CEFR level (A0, A1, A2, B1, B2, C1, C2)')
        return v


class UserPreferencesUpdateRequest(BaseModel):
    """User preferences update request - STANDARDIZED FORMAT"""
    favorite_activities: Optional[List[str]] = Field(None, description="Favorite activity types")
    daily_goal: Optional[int] = Field(None, ge=1, le=50, description="Daily practice goal")
    preferred_language_id: Optional[str] = Field(None, description="Preferred language ID")
    practice_batch_size: Optional[int] = Field(None, ge=1, le=10, description="Practice session batch size")
    notification_settings: Optional[Dict[str, Any]] = Field(None, description="Notification preferences")

    @validator('favorite_activities')
    def validate_activities(cls, v):
        if v:
            allowed_activities = ['reading', 'writing', 'grammar', 'hearing', 'speaking']
            for activity in v:
                if activity not in allowed_activities:
                    raise ValueError(f'Activity must be one of: {allowed_activities}')
        return v


# ===============================
# SESSION MANAGEMENT REQUESTS
# ===============================

class SessionCreateRequest(BaseModel):
    """Session creation request - STANDARDIZED FORMAT"""
    session_type: str = Field(..., description="Session type (practice/exam)")
    level: str = Field(..., description="CEFR level")
    language_id: str = Field(..., description="Language ID")
    template_id: Optional[str] = Field(None, description="Template ID")
    custom_template: Optional[Dict[str, Any]] = Field(None, description="Custom template configuration")

    @validator('session_type')
    def validate_session_type(cls, v):
        if v not in ['practice', 'exam']:
            raise ValueError('Session type must be practice or exam')
        return v

    @validator('level')
    def validate_level(cls, v):
        if v not in ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']:
            raise ValueError('Level must be a valid CEFR level (A0, A1, A2, B1, B2, C1, C2)')
        return v


class SessionAnswerRequest(BaseModel):
    """Session answer submission request - STANDARDIZED FORMAT"""
    question_id: str = Field(..., description="Question ID")
    user_answer: str = Field(..., description="User's answer")
    activity_type: str = Field(..., description="Activity type")
    time_spent: Optional[int] = Field(None, ge=0, description="Time spent on question (seconds)")

    @validator('activity_type')
    def validate_activity_type(cls, v):
        if v not in ['reading', 'writing', 'grammar', 'hearing', 'speaking']:
            raise ValueError('Activity type must be reading, writing, grammar, hearing, or speaking')
        return v


# ===============================
# SEARCH AND FILTER REQUESTS
# ===============================

class SessionListRequest(BaseModel):
    """Session list request - STANDARDIZED FORMAT"""
    page: int = Field(default=1, ge=1, description="Page number")
    per_page: int = Field(default=20, ge=1, le=100, description="Items per page")
    session_type: Optional[str] = Field(None, description="Filter by session type")
    level: Optional[str] = Field(None, description="Filter by CEFR level")
    status: Optional[str] = Field(None, description="Filter by session status")

    @validator('session_type')
    def validate_session_type(cls, v):
        if v and v not in ['practice', 'exam']:
            raise ValueError('Session type must be practice or exam')
        return v

    @validator('level')
    def validate_level(cls, v):
        if v and v not in ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']:
            raise ValueError('Level must be a valid CEFR level (A0, A1, A2, B1, B2, C1, C2)')
        return v


# ===============================
# FIREBASE INTEGRATION REQUESTS
# ===============================

class FirebaseUserSyncRequest(BaseModel):
    """Firebase user sync request - STANDARDIZED FORMAT"""
    firebase_uid: str = Field(..., description="Firebase UID")
    email: Optional[EmailStr] = Field(None, description="User email from Firebase")
    name: Optional[str] = Field(None, description="User name from Firebase")
    photo_url: Optional[str] = Field(None, description="User photo URL from Firebase")

    @validator('email')
    def validate_email(cls, v):
        if v:
            return v.lower().strip()
        return v

    @validator('name')
    def validate_name(cls, v):
        if v:
            return v.strip()
        return v
