"""
School Request Models - SCHOOL DOMAIN
Pydantic models for school API requests
Follows the same pattern as admin request models
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Literal, Dict, Any, List
import re


# ===============================
# AUTHENTICATION REQUESTS
# ===============================

class SchoolLoginRequest(BaseModel):
    """School admin login request"""
    email: str = Field(..., description="School admin email address")
    password: str = Field(..., min_length=6, description="School admin password")
    captcha_token: Optional[str] = Field(None, description="reCAPTCHA token from frontend")
    remember_me: Optional[bool] = Field(False, description="Remember me for extended session (30 days)")

    @validator('email')
    def validate_email(cls, v):
        """Validate email format"""
        if not v or '@' not in v or '.' not in v.split('@')[1]:
            raise ValueError('Invalid email format')
        return v.lower().strip()


# ===============================
# USER MANAGEMENT REQUESTS
# ===============================

class SchoolUserCreateRequest(BaseModel):
    """Create user in school request - ENHANCED VALIDATION"""
    email: str = Field(..., description="User email address")
    name: str = Field(..., min_length=1, max_length=100, description="User full name")
    password: Optional[str] = Field(None, min_length=8, max_length=128, description="User password (optional)")
    current_level: Optional[Literal["A0", "A1", "A2", "B1", "B2", "C1", "C2"]] = Field("A1", description="User CEFR level")
    preferred_language_id: Optional[str] = Field(None, description="Preferred language ID")

    @validator('email')
    def validate_email(cls, v):
        """Validate email format"""
        if not v or '@' not in v or '.' not in v.split('@')[1]:
            raise ValueError('Invalid email format')
        return v.lower().strip()

    @validator('name')
    def validate_name(cls, v):
        """Validate name contains only allowed characters"""
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        
        # Allow letters, spaces, hyphens, apostrophes
        if not re.match(r"^[a-zA-Z\s\-'\.]+$", v.strip()):
            raise ValueError('Name contains invalid characters')
        
        return v.strip()

    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if v is None:
            return v
        
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Check for at least one letter and one number
        if not re.search(r'[A-Za-z]', v) or not re.search(r'\d', v):
            raise ValueError('Password must contain at least one letter and one number')
        
        return v

    @validator('preferred_language_id')
    def validate_language_id(cls, v):
        """Validate language ID format"""
        if v is None:
            return v
        
        # Basic validation - should be 24 character hex string (MongoDB ObjectId format)
        if not re.match(r'^[a-f0-9]{24}$', v):
            raise ValueError('Invalid language ID format')
        
        return v


class SchoolUserUpdateRequest(BaseModel):
    """Update user in school request"""
    # email: Optional[str] = Field(None, description="User email address")  # DISABLED: Email updates not allowed from school interface
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="User full name")
    current_level: Optional[str] = Field(None, description="User CEFR level")
    preferred_language_id: Optional[str] = Field(None, description="Preferred language ID")
    is_active: Optional[bool] = Field(None, description="User active status")
    allocated_count: Optional[int] = Field(None, ge=0, description="Credit allocation")
    user_custom_school: Optional[Dict[str, Any]] = Field(None, description="School-specific custom data (restricted keys: student_code, batch, remark)")

    # @validator('email')  # DISABLED: Email validation not needed since email updates are disabled
    # def validate_email(cls, v):
    #     """Validate email format"""
    #     if v is None:
    #         return v
    #     if not v or '@' not in v or '.' not in v.split('@')[1]:
    #         raise ValueError('Invalid email format')
    #     return v.lower().strip()


# ===============================
# TEMPLATE MANAGEMENT REQUESTS
# ===============================

class SchoolTemplateCreateRequest(BaseModel):
    """Create template request"""
    template_name: str = Field(..., min_length=1, max_length=200, description="Template name")
    level: Literal["A0", "A1", "A2", "B1", "B2", "C1", "C2", "ALL"] = Field(..., description="CEFR level")
    session_type: Literal["exam", "practice"] = Field(..., description="Session type")
    template_data: Dict[str, int] = Field(..., description="Activity counts (reading, writing, grammar, hearing, speaking)")

    @validator('template_name')
    def validate_template_name(cls, v):
        """Validate template name"""
        if not v or not v.strip():
            raise ValueError('Template name cannot be empty')
        return v.strip()

    @validator('template_data')
    def validate_template_data(cls, v):
        """Validate template data structure"""
        if not isinstance(v, dict):
            raise ValueError('template_data must be a dictionary')
        
        required_activities = ["reading", "writing", "grammar", "hearing"]
        for activity in required_activities:
            if activity not in v:
                raise ValueError(f'Missing activity: {activity}')

            count = v[activity]
            if not isinstance(count, int) or count < 0:
                raise ValueError(f'Invalid count for {activity}. Must be a non-negative integer')

            if count > 15:
                raise ValueError(f'Maximum 15 activities allowed per type. {activity} has {count}')

        optional_activities = ["speaking"]
        for activity in optional_activities:
            count = v.get(activity, 0)
            if count is None:
                continue
            if not isinstance(count, int) or count < 0:
                raise ValueError(f'Invalid count for {activity}. Must be a non-negative integer')
            if count > 15:
                raise ValueError(f'Maximum 15 activities allowed per type. {activity} has {count}')

        return v


class SchoolTemplateUpdateRequest(BaseModel):
    """Update template request"""
    template_name: Optional[str] = Field(None, min_length=1, max_length=200, description="Template name")
    level: Optional[Literal["A0", "A1", "A2", "B1", "B2", "C1", "C2", "ALL"]] = Field(None, description="CEFR level")
    session_type: Optional[Literal["exam", "practice"]] = Field(None, description="Session type")
    template_data: Optional[Dict[str, int]] = Field(None, description="Activity counts (reading, writing, grammar, hearing, speaking)")

    @validator('template_name')
    def validate_template_name(cls, v):
        """Validate template name"""
        if v is not None and (not v or not v.strip()):
            raise ValueError('Template name cannot be empty')
        return v.strip() if v else v

    @validator('template_data')
    def validate_template_data(cls, v):
        """Validate template data structure"""
        if v is None:
            return v
            
        if not isinstance(v, dict):
            raise ValueError('template_data must be a dictionary')
        
        required_activities = ["reading", "writing", "grammar", "hearing"]
        for activity in required_activities:
            if activity not in v:
                raise ValueError(f'Missing activity: {activity}')

            count = v[activity]
            if not isinstance(count, int) or count < 0:
                raise ValueError(f'Invalid count for {activity}. Must be a non-negative integer')

            if count > 15:
                raise ValueError(f'Maximum 15 activities allowed per type. {activity} has {count}')

        optional_activities = ["speaking"]
        for activity in optional_activities:
            count = v.get(activity, 0)
            if count is None:
                continue
            if not isinstance(count, int) or count < 0:
                raise ValueError(f'Invalid count for {activity}. Must be a non-negative integer')
            if count > 15:
                raise ValueError(f'Maximum 15 activities allowed per type. {activity} has {count}')

        return v


# ===============================
# SESSION MANAGEMENT REQUESTS
# ===============================

class SchoolSessionAddUsersRequest(BaseModel):
    """Add users to existing session request"""
    user_ids: List[str] = Field(..., description="List of user IDs to add to session")

    @validator('user_ids')
    def validate_user_ids(cls, v):
        """Validate user IDs list"""
        if not v or len(v) == 0:
            raise ValueError('At least one user ID is required')
        
        # Remove duplicates while preserving order
        seen = set()
        unique_ids = []
        for user_id in v:
            if user_id not in seen:
                seen.add(user_id)
                unique_ids.append(user_id)
        
        return unique_ids


# ===============================
# SCHOOL SESSION CREATION MODELS
# ===============================

class SchoolSessionCreateRequest(BaseModel):
    """Request model for creating sessions for multiple users"""
    
    template_id: str = Field(..., description="Template ID to use for session creation")
    session_name: str = Field(..., min_length=1, max_length=200, description="Name for the session")
    user_ids: List[str] = Field(..., description="List of user IDs to create sessions for")
    language_id: str = Field(..., description="Language ID for the sessions")
    level: Literal["A0", "A1", "A2", "B1", "B2", "C1", "C2"] = Field(..., description="CEFR level")
    session_type: Literal["exam", "practice"] = Field(..., description="Session type")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('user_ids')
    def validate_user_ids(cls, v):
        """Validate user IDs list"""
        if not v:
            raise ValueError("At least one user ID is required")
        
        # Check for duplicates
        if len(v) != len(set(v)):
            raise ValueError("Duplicate user IDs are not allowed")
        
        # Validate each user ID format (basic check)
        for user_id in v:
            if not isinstance(user_id, str) or len(user_id.strip()) == 0:
                raise ValueError("All user IDs must be non-empty strings")
        
        return v
    
    @validator('template_id')
    def validate_template_id(cls, v):
        """Validate template ID format"""
        if not v or not isinstance(v, str):
            raise ValueError("Template ID must be a non-empty string")
        return v.strip()
    
    @validator('language_id')
    def validate_language_id(cls, v):
        """Validate language ID format"""
        if not v or not isinstance(v, str):
            raise ValueError("Language ID must be a non-empty string")
        return v.strip()
    
    @validator('session_name')
    def validate_session_name(cls, v):
        """Clean and validate session name"""
        if v:
            v = v.strip()
            if len(v) == 0:
                raise ValueError("Session name cannot be empty")
        return v


# ===============================
# ANALYTICS REQUESTS
# ===============================

