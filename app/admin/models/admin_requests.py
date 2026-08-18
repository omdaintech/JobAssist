"""
Admin Request Models
Pydantic models for admin API requests
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
import re
import html
from app.config import language_helper
from typing_extensions import Literal


class AdminBulkQuestionRequest(BaseModel):
    """Admin request model for bulk question generation"""

    language_id: str = Field(
        ..., description="Language ID from master table (required)"
    )
    activity_type: Literal["reading", "writing", "grammar", "hearing", "speaking"] = Field(
        ..., description="Type of language activity"
    )
    level: Literal["A0", "A1", "A2", "B1", "B2", "C1", "C2"] = Field(..., description="CEFR language level")
    difficulty_level: Literal["standard", "difficult"] = Field(
        default="difficult",
        description="Difficulty level within CEFR level (default: difficult)",
    )
    count: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Number of questions to generate (max 50, processed in parallel batches of 10)",
    )

    @field_validator("language_id")
    @classmethod
    def validate_language_id(cls, v):
        """Validate language_id is provided"""
        if not v:
            raise ValueError("language_id is required")
        # TODO: Validate against actual language master table
        return v


class AdminQuestionSearchRequest(BaseModel):
    """Admin request model for searching questions"""

    language: Optional[str] = Field(None, description="Filter by language identifier")
    language_id: Optional[str] = Field(
        None, description="Filter by language ID from master table"
    )
    activity_type: Optional[Literal["reading", "writing", "grammar", "hearing", "speaking"]] = Field(
        None, description="Filter by activity type"
    )
    level: Optional[Literal["A0", "A1", "A2", "B1", "B2", "C1", "C2"]] = Field(
        None, description="Filter by level"
    )
    difficulty_level: Optional[Literal["standard", "difficult"]] = Field(
        None, description="Filter by difficulty level"
    )
    search_query: Optional[str] = Field(
        None, max_length=100, description="Search in content"
    )
    limit: int = Field(
        default=50, ge=1, le=100, description="Maximum number of results"
    )
    offset: int = Field(default=0, ge=0, description="Number of results to skip")
    sort_by: Literal["created_datetime", "usage_count", "quality_rating"] = Field(
        default="created_datetime", description="Sort field"
    )
    sort_order: Literal["asc", "desc"] = Field(default="desc", description="Sort order")

    @field_validator("language")
    @classmethod
    def validate_language(cls, v):
        """Validate language using language helper if provided"""
        if v:
            return language_helper.validate_language(v)
        return v

    @field_validator("language_id")
    @classmethod
    def validate_language_id(cls, v):
        """Validate language_id if provided"""
        if v:
            # TODO: Validate against actual language master table
            return v
        return v

    @field_validator("search_query")
    @classmethod
    def sanitize_search_query(cls, v):
        """Sanitize search query"""
        if v:
            # Remove control characters and HTML escape
            v = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", v)
            v = html.escape(v.strip())
        return v


class AdminLoginRequest(BaseModel):
    """Admin login request model"""

    email: str = Field(..., description="Admin email")
    password: str = Field(..., description="Admin password")
    captcha_token: Optional[str] = Field(None, description="reCAPTCHA token from frontend")
    remember_me: Optional[bool] = Field(False, description="Remember me for extended session (30 days)")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        """Basic email validation and sanitization"""
        from app.common.models.base_models import validate_email_address

        return validate_email_address(v)


class AdminPasswordChangeRequest(BaseModel):
    """Admin password change request model"""

    current_password: str = Field(..., description="Current admin password")
    new_password: str = Field(
        ..., min_length=8, max_length=128, description="New admin password"
    )
    confirm_password: str = Field(..., description="Confirm new password")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        """Validate new password strength"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        # Check for at least one uppercase, one lowercase, and one number
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        
        return v

    @model_validator(mode='after')
    def validate_password_match(self):
        """Validate password confirmation matches"""
        if self.confirm_password != self.new_password:
            raise ValueError("Password confirmation does not match")
        return self


class AdminBulkUploadRequest(BaseModel):
    """Admin request model for bulk question upload"""

    language_id: str = Field(
        ..., description="Language ID from master table (required)"
    )
    activity_type: Literal["reading", "writing", "grammar", "hearing", "speaking"] = Field(
        ..., description="Type of language activity"
    )
    level: Literal["A0", "A1", "A2", "B1", "B2", "C1", "C2"] = Field(..., description="CEFR language level")
    questions: List[dict] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="List of questions to upload",
    )

    @field_validator("language_id")
    @classmethod
    def validate_language_id(cls, v):
        """Validate language_id is provided"""
        if not v:
            raise ValueError("language_id is required")
        return v

    @model_validator(mode='after')
    def validate_questions(self):
        """Validate question structure based on activity type"""
        if not self.activity_type:
            return self

        for i, question in enumerate(self.questions):
            if not isinstance(question, dict):
                raise ValueError(f"Question {i+1}: Must be a valid question object")

            # Validate required fields based on activity type
            if self.activity_type == "reading":
                reading_required = ["text", "question"]
                for field in reading_required:
                    if not question.get(field):
                        raise ValueError(
                            f"Question {i+1}: Reading question missing '{field}'"
                        )

            elif self.activity_type == "writing":
                writing_required = ["instruction", "topic"]
                for field in writing_required:
                    if not question.get(field):
                        raise ValueError(
                            f"Question {i+1}: Writing question missing '{field}'"
                        )

            elif self.activity_type == "grammar":
                grammar_required = ["instruction", "grammar_topic"]
                for field in grammar_required:
                    if not question.get(field):
                        raise ValueError(
                            f"Question {i+1}: Grammar question missing '{field}'"
                        )

            elif self.activity_type == "hearing":
                # Base required fields for all hearing questions
                hearing_base_required = [
                    "transcript",
                    "question",
                    "correct_answer",
                    "correct_answer_reason",
                    "topic",
                    "question_type",
                ]
                for field in hearing_base_required:
                    if not question.get(field):
                        raise ValueError(
                            f"Question {i+1}: Hearing question missing '{field}'"
                        )

                question_type = question.get("question_type")
                # Updated to support fill-in-the-blank and short answer questions
                if question_type not in {"mcq", "true_false", "fill_in_blank", "short_answer"}:
                    raise ValueError(
                        f"Question {i+1}: Hearing question_type must be 'mcq', 'true_false', 'fill_in_blank', or 'short_answer'"
                    )

                # Options validation - only required for MCQ and true_false
                if question_type in {"mcq", "true_false"}:
                    options = question.get("options")
                    if not options:
                        raise ValueError(
                            f"Question {i+1}: Hearing {question_type} question requires 'options' field"
                        )
                    if not isinstance(options, list):
                        raise ValueError(
                            f"Question {i+1}: Hearing question options must be a list"
                        )

                    if question_type == "mcq" and len(options) != 4:
                        raise ValueError(
                            f"Question {i+1}: Hearing MCQ must include exactly 4 options"
                        )
                    if question_type == "true_false" and len(options) != 2:
                        raise ValueError(
                            f"Question {i+1}: Hearing true/false must include exactly 2 options"
                        )
                else:
                    # For fill_in_blank and short_answer, options should be null or empty
                    options = question.get("options")
                    if options and len(options) > 0:
                        raise ValueError(
                            f"Question {i+1}: Hearing {question_type} should not have options"
                        )

                audio_url = question.get("audio_url")
                if audio_url is not None and not isinstance(audio_url, str):
                    raise ValueError(
                        f"Question {i+1}: Hearing audio_url must be a string or null"
                    )

            elif self.activity_type == "speaking":
                # Base required fields for all speaking questions
                speaking_base_required = [
                    "transcript",
                    "question",
                    "correct_answer",
                    "correct_answer_reason",
                    "topic",
                ]
                for field in speaking_base_required:
                    if not question.get(field):
                        raise ValueError(
                            f"Question {i+1}: Speaking question missing '{field}'"
                        )

                # Question type validation
                question_type = question.get("question_type")
                if question_type and question_type != "monologue":
                    raise ValueError(
                        f"Question {i+1}: Speaking question_type must be 'monologue' or omitted (defaults to 'monologue')"
                    )

                # Speaking questions should NOT have options (unlike hearing)
                options = question.get("options")
                if options and len(options) > 0:
                    raise ValueError(
                        f"Question {i+1}: Speaking questions should not have options (it's a monologue)"
                    )

                # Validate audio_url
                audio_url = question.get("audio_url")
                if audio_url is not None and not isinstance(audio_url, str):
                    raise ValueError(
                        f"Question {i+1}: Speaking audio_url must be a string or null"
                    )

                # Validate question_metadata for timing constraints
                metadata = question.get("question_metadata")
                if metadata:
                    if not isinstance(metadata, dict):
                        raise ValueError(
                            f"Question {i+1}: Speaking question_metadata must be a dict"
                        )
                    
                    # Check for timing constraints
                    max_seconds = metadata.get("max_answer_seconds") or metadata.get("max_answer_duration_seconds")
                    min_seconds = metadata.get("min_answer_seconds") or metadata.get("min_answer_duration_seconds")
                    
                    if max_seconds and not isinstance(max_seconds, (int, float)):
                        raise ValueError(
                            f"Question {i+1}: max_answer_seconds must be a number"
                        )
                    if min_seconds and not isinstance(min_seconds, (int, float)):
                        raise ValueError(
                            f"Question {i+1}: min_answer_seconds must be a number"
                        )
                    
                    if max_seconds and min_seconds and min_seconds > max_seconds:
                        raise ValueError(
                            f"Question {i+1}: min_answer_seconds cannot be greater than max_answer_seconds"
                        )

        return self


# ===============================
# SCHOOL MANAGEMENT MODELS
# ===============================

class AddressModel(BaseModel):
    """Address information model"""
    street: Optional[str] = Field(None, max_length=200, description="Street address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State/Province")
    country: Optional[str] = Field(None, max_length=100, description="Country")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal/ZIP code")


class PaymentMethodModel(BaseModel):
    """Payment method information model"""
    preferred_method: Optional[str] = Field("invoice", description="Preferred payment method")
    payment_terms: Optional[str] = Field("30", description="Payment terms in days")
    currency: Optional[str] = Field("USD", description="Preferred currency")
    notes: Optional[str] = Field(None, max_length=500, description="Payment notes")


class AdminSchoolUpdateRequest(BaseModel):
    """Admin request model for updating school details"""
    
    # Basic Information
    name: Optional[str] = Field(None, max_length=200, description="School name")
    display_name: Optional[str] = Field(None, max_length=200, description="Display name")
    description: Optional[str] = Field(None, max_length=1000, description="School description")
    school_type: Optional[Literal["b2c", "b2b", "enterprise"]] = Field(None, description="School type")
    
    # Contact Information
    contact_email: Optional[str] = Field(None, max_length=100, description="Primary contact email")
    contact_phone: Optional[str] = Field(None, max_length=50, description="Primary contact phone")
    admin_email: Optional[str] = Field(None, max_length=100, description="Admin contact email")
    admin_phone: Optional[str] = Field(None, max_length=50, description="Admin contact phone")
    
    # Billing Information
    billing_email: Optional[str] = Field(None, max_length=100, description="Billing contact email")
    billing_contact_name: Optional[str] = Field(None, max_length=200, description="Billing contact name")
    billing_phone: Optional[str] = Field(None, max_length=50, description="Billing contact phone")
    payment_method_info: Optional[PaymentMethodModel] = Field(None, description="Payment method details")
    
    # Address Information
    physical_address: Optional[AddressModel] = Field(None, description="Physical address")
    billing_address: Optional[AddressModel] = Field(None, description="Billing address")
    tax_address: Optional[AddressModel] = Field(None, description="Tax registration address")
    
    # Tax Details
    tax_id: Optional[str] = Field(None, max_length=100, description="Tax identification number")
    vat_number: Optional[str] = Field(None, max_length=100, description="VAT registration number")
    tax_exemption_status: Optional[bool] = Field(None, description="Tax exemption status")
    
    # Status and Internal Management
    is_active: Optional[bool] = Field(None, description="School active status")
    priority_support: Optional[bool] = Field(None, description="Priority support flag")
    account_manager_notes: Optional[str] = Field(None, max_length=2000, description="Internal notes")
    internal_tags: Optional[List[str]] = Field(None, description="Internal categorization tags")
    
    # Settings
    settings: Optional[dict] = Field(None, description="School configuration settings")

    @field_validator("contact_email", "admin_email", "billing_email")
    @classmethod
    def validate_email(cls, v):
        if v is not None:
            v = v.lower().strip()
            if v and not re.match(r'^[^@]+@[^@]+\.[^@]+$', v):
                raise ValueError("Invalid email format")
        return v

    @field_validator("name", "display_name", "billing_contact_name")
    @classmethod
    def validate_text_fields(cls, v):
        if v is not None:
            v = html.escape(v.strip())
            if not v:
                raise ValueError("Field cannot be empty")
        return v


