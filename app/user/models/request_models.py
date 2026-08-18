"""
Pydantic request models for API input validation
Replaces marshmallow schemas with cleaner, more powerful validation
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Literal, Dict, Any, List
import re
import html


# Session Models (Unified)
class SessionCreateRequest(BaseModel):
    """Request model for creating both exam and practice sessions"""

    session_name: Optional[str] = Field(None, description="Custom session name")
    template_id: Optional[str] = Field(
        None, description="Template ID for exam sessions"
    )
    activity_type: Optional[str] = Field(
        None, description="Activity type for practice sessions"
    )
    level: str = Field(
        ...,
        description="CEFR level from selected language's supported_levels"
    )
    language_id: str = Field(..., description="Language ID from database")
    session_type: str = Field(
        ..., description="Session type: exam or practice"
    )

    @field_validator("level")
    @classmethod
    def validate_level_format(cls, v):
        """Validate CEFR level format"""
        valid_levels = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"]
        if v not in valid_levels:
            raise ValueError(
                f"Level must be a valid CEFR level: "
                f"{', '.join(valid_levels)}"
            )
        return v

    @model_validator(mode='after')
    def validate_level_for_language(self):
        """Validate level is supported by the selected language"""
        from app.dependencies import get_core_repository

        core_repo = get_core_repository()
        language = core_repo.get_language_by_id(self.language_id)

        if language:
            supported_levels = language.get("supported_levels", [])
            if supported_levels and self.level not in supported_levels:
                lang_name = language.get('language_name', 'this language')
                raise ValueError(
                    f"Level '{self.level}' is not supported for "
                    f"{lang_name}. "
                    f"Supported levels: {', '.join(supported_levels)}"
                )
        
        return self

    @field_validator("session_type")
    @classmethod
    def validate_session_type(cls, v):
        """Validate session type"""
        valid_types = ["exam", "practice"]
        if v not in valid_types:
            raise ValueError(f"Session type must be one of: {valid_types}")
        return v

    @field_validator("activity_type")
    @classmethod
    def validate_activity_type(cls, v):
        """Validate activity type for practice sessions"""
        if v:
            valid_activities = ["reading", "writing", "grammar", "hearing", "speaking"]
            if v not in valid_activities:
                raise ValueError(f"Activity type must be one of: {valid_activities}")
        return v

    @field_validator("language_id")
    @classmethod
    def validate_language_id(cls, v):
        """Validate language ID against database"""
        if v:
            from app.dependencies import get_core_repository
            try:
                # Check if language exists in database
                core_repo = get_core_repository()
                language = core_repo.get_language_by_id(v)

                if not language:
                    raise ValueError(f"Language with ID '{v}' not found")

                # Validate language is active/available
                if not language.get("is_active", False):
                    raise ValueError(
                        f"Language '{language.get('name', 'Unknown')}' is not currently active"
                    )

                return v
            except Exception as e:
                raise ValueError(f"Language validation failed: {str(e)}")
        return v


# Answer Models (Shared)
class ExamAnswerRequest(BaseModel):
    activity_type: str  # "reading", "writing", "grammar", "hearing", "speaking"
    question_number: int
    question_data: Dict[str, Any]  # Full question object from frontend
    user_answer: Optional[str] = None  # User's actual answer (can be None for skip)
    time_spent: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    is_skip: bool = False  # Explicit flag for intentional skip
    
    # Audio upload via S3 (only supported method)
    speaking_audio_s3_key: Optional[str] = Field(
        None, description="S3 key for pre-uploaded audio (required for speaking)"
    )
    speaking_audio_format: Optional[str] = Field(
        None, description="Audio format for speaking answers (mp3/mp4)"
    )
    speaking_audio_duration_seconds: Optional[float] = Field(
        None, description="Client-reported speaking audio duration"
    )

    @model_validator(mode='after')
    def validate_answer_length(self):
        """Validate answer length against configured limits for writing and grammar"""
        # Get activity type and level from context
        activity_type = self.activity_type.lower()

        # If this is a skip, allow empty/None answer and return early
        if self.is_skip:
            return self  # Skip validation

        if activity_type == "speaking":
            # Must provide S3 key (base64 fallback removed)
            if not self.speaking_audio_s3_key:
                raise ValueError("Speaking answers require S3 audio upload")
            
            if (
                self.speaking_audio_format
                and self.speaking_audio_format.lower() not in {"mp3", "mp4"}
            ):
                raise ValueError("Speaking audio format must be mp3 or mp4")
            
            # Require duration_seconds for speaking
            if not self.speaking_audio_duration_seconds:
                raise ValueError("Speaking audio duration is required")
            
            if self.speaking_audio_duration_seconds <= 0:
                raise ValueError("Speaking audio duration must be a positive number")
            
            # Validate against reasonable maximum (e.g., 10 minutes = 600 seconds)
            # This prevents abuse even before checking question-specific limits
            if self.speaking_audio_duration_seconds > 600:
                raise ValueError("Speaking audio duration cannot exceed 600 seconds (10 minutes)")

            if self.user_answer:
                self.user_answer = self.user_answer.strip()
            return self

        # If not a skip, answer must exist and not be empty
        if self.user_answer is None or not self.user_answer.strip():
            raise ValueError("Answer cannot be empty. Use is_skip=true to skip this question.")

        question_data = self.question_data
        level = question_data.get("level") or question_data.get("difficulty_level", "").upper()
        
        # Determine if validation is needed
        should_validate = False
        if activity_type in ["writing", "grammar"]:
            should_validate = True
        elif activity_type == "hearing" and question_data:
            # For hearing, only validate text input question types
            question_type = question_data.get("question_type", "")
            should_validate = question_type in ["fill_in_blank", "short_answer"]
        
        if should_validate:
            from app.config import settings
            
            # Count words (split by whitespace)
            word_count = len(self.user_answer.strip().split())
            
            # Check minimum words - get from new dictionary structure
            min_words = settings.min_answer_words.get(activity_type, 1)
            if word_count < min_words:
                raise ValueError(
                    f"{activity_type.title()} answer is too short. "
                    f"Used: {word_count} words, Minimum required: {min_words} words"
                )
            
            # Check maximum words (only for writing and grammar)
            if activity_type in ["writing", "grammar"]:
                max_words = settings.get_answer_length_limit(level, activity_type)
                if word_count > max_words:
                    raise ValueError(
                        f"{activity_type.title()} answer exceeds maximum word limit. "
                        f"Used: {word_count} words, Maximum allowed: {max_words} words"
                    )
        
        # Strip whitespace from answer
        if self.user_answer:
            self.user_answer = self.user_answer.strip()
        
        return self


class LoginRequest(BaseModel):
    """Request model for user login"""

    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="User password")
    captcha_token: Optional[str] = Field(None, description="reCAPTCHA token from frontend")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        """Basic email validation"""
        from app.common.models.base_models import validate_email_address

        return validate_email_address(v)


class UserCreateRequest(BaseModel):
    """Request model for user registration"""

    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")
    username: Optional[str] = Field(
        None, max_length=50, description="Optional username"
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        """Email validation for registration"""
        from app.common.models.base_models import validate_email_address

        return validate_email_address(v)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        """Username validation"""
        if v:
            v = v.strip()
            if len(v) == 0:
                return None
        return v


class UserProfileUpdateRequest(BaseModel):
    """Request model for updating user profile"""

    name: Optional[str] = Field(None, max_length=100, description="User's full name")
    current_level: Optional[Literal["A0", "A1", "A2", "B1", "B2", "C1", "C2"]] = Field(
        None, description="User's current CEFR level"
    )
    preferred_language_id: Optional[str] = Field(
        None, description="Preferred language ID from master table"
    )
    target_level: Optional[Literal["A1", "A2", "B1", "B2", "C1", "C2"]] = Field(
        None, description="User's target CEFR level"
    )
    is_onboarded: Optional[bool] = Field(
        None, description="Flag indicating onboarding completion"
    )

    @field_validator("preferred_language_id")
    @classmethod
    def validate_preferred_language_id(cls, v):
        """Validate preferred language_id against actual database"""
        if v:
            from app.dependencies import get_core_repository
            try:
                # Check if language exists in database
                core_repo = get_core_repository()
                language = core_repo.get_language_by_id(v)

                if not language:
                    raise ValueError(f"Language with ID '{v}' not found")

                # Validate language is active/available
                if not language.get("is_active", False):
                    raise ValueError(
                        f"Language '{language.get('name', 'Unknown')}' is not currently active"
                    )

                return v
            except Exception as e:
                raise ValueError(f"Language validation failed: {str(e)}")
        return v

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v):
        """Sanitize user name"""
        if v:
            # Remove control characters and HTML escape
            v = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", v)
            v = html.escape(v.strip())

        return v

    @field_validator("current_level")
    @classmethod
    def validate_current_level(cls, v):
        """Ensure current level is within supported range"""
        if v and v not in {"A0", "A1", "A2", "B1", "B2", "C1", "C2"}:
            raise ValueError("Current level must be a valid CEFR level (A0, A1, A2, B1, B2, C1, C2)")
        return v

    @field_validator("target_level")
    @classmethod
    def validate_target_level(cls, v):
        """Ensure target level is A1 or above"""
        if v and v not in {"A1", "A2", "B1", "B2", "C1", "C2"}:
            raise ValueError("Target level must be one of: A1, A2, B1, B2, C1, C2")
        return v


class LearningPreferencesRequest(BaseModel):
    """Request model for updating learning preferences"""

    favorite_activities: Optional[List[Literal["reading", "writing", "grammar", "hearing", "speaking"]]] = (
        Field(None, description="Favorite activity types")
    )
    daily_goal: Optional[int] = Field(
        None, ge=1, le=100, description="Daily practice goal"
    )
    preferred_language_id: Optional[str] = Field(
        None, description="Single preferred language ID from master table"
    )
    practice_frequency_per_week: Optional[int] = Field(
        None, ge=1, le=14, description="Desired number of practice sessions per week"
    )
    onboarding_goal: Optional[Literal["exam_prep", "level_check", "skill_improvement"]] = Field(
        None, description="Primary goal for using Lingali"
    )

    # Note: Language validation disabled to avoid session binding issues
    # TODO: Implement proper language validation with proper session management


class PasswordChangeRequest(BaseModel):
    """Request model for password change"""

    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(
        ..., min_length=6, description="New password (minimum 6 characters)"
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        """Validate new password strength"""
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v


class FirebaseProviderData(BaseModel):
    """Firebase provider data model"""

    provider_id: str
    uid: str
    display_name: Optional[str] = None
    email: Optional[str] = None
    photo_url: Optional[str] = None


class FirebaseMetadata(BaseModel):
    """Firebase user metadata model"""

    creation_time: Optional[str] = None
    last_sign_in_time: Optional[str] = None


class FirebaseUserSyncRequest(BaseModel):
    """Request model for syncing Firebase user with backend"""

    firebase_uid: str = Field(..., description="Firebase user UID")
    email: Optional[str] = Field(None, description="User email")
    name: Optional[str] = Field(None, description="User display name")
    photo_url: Optional[str] = Field(None, description="Profile photo URL")
    email_verified: bool = Field(False, description="Email verification status")
    phone_number: Optional[str] = Field(None, description="Phone number")
    provider_data: List[FirebaseProviderData] = Field(
        default_factory=list, description="Authentication provider data"
    )
    metadata: FirebaseMetadata = Field(
        default_factory=FirebaseMetadata, description="Firebase metadata"
    )
    firebase_token: str = Field(..., description="Firebase ID token for verification")


# =============================
# Signup & Verification Models
# =============================


class SignupRequest(BaseModel):
    """Request model for user registration with email verification"""

    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 chars)")
    confirm_password: str = Field(..., description="Password confirmation")
    captcha_token: str = Field(..., description="reCaptcha verification token")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        """Email validation for signup"""
        from app.common.models.base_models import validate_email_address
        return validate_email_address(v)

    @field_validator("confirm_password")
    @classmethod
    def validate_password_match(cls, v, info):
        """Ensure passwords match"""
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class EmailVerificationRequest(BaseModel):
    """Request model for email verification"""

    email_hash: str = Field(..., description="Hashed email identifier")
    verification_code: str = Field(
        ..., min_length=6, max_length=6, description="6-digit verification code"
    )


class ResendVerificationRequest(BaseModel):
    """Request model for resending verification email"""

    email: str = Field(..., description="User email address")

    @field_validator("email")
    @classmethod
    def validate_email_resend(cls, v):
        from app.common.models.base_models import validate_email_address
        return validate_email_address(v)


class ForgotPasswordRequest(BaseModel):
    """Request model for password reset request"""

    email: str = Field(..., description="User email address")
    captcha_token: Optional[str] = Field(None, description="reCAPTCHA token from frontend")

    @field_validator("email")
    @classmethod
    def validate_email_forgot(cls, v):
        from app.common.models.base_models import validate_email_address
        return validate_email_address(v)


class ResetPasswordRequest(BaseModel):
    """Request model for password reset with token"""

    email: str = Field(..., description="User email address")
    reset_token: str = Field(..., min_length=1, description="Password reset token")
    new_password: str = Field(..., min_length=6, description="New password (minimum 6 characters)")
    confirm_password: str = Field(..., min_length=6, description="Confirm new password")

    @field_validator("email")
    @classmethod
    def validate_email_reset(cls, v):
        from app.common.models.base_models import validate_email_address
        return validate_email_address(v)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        """Validate new password strength"""
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v

    @field_validator("confirm_password")
    @classmethod
    def validate_passwords_match(cls, v, info):
        """Validate password confirmation matches"""
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError("Password confirmation does not match")
        return v
