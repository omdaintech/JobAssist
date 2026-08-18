"""
Admin Response Models
Pydantic models for admin API responses
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.common.models.base_models import LanguageInfo


# ===============================
# SHARED ADMIN MODELS
# ===============================


class AdminUserModel(BaseModel):
    """Admin user model for authentication"""

    id: Optional[str] = None
    email: str
    password_hash: str
    name: Optional[str] = None
    role: str = "admin"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = True
    permissions: List[str] = Field(default_factory=list)


class QuestionStatistics(BaseModel):
    """Question statistics model"""

    total_questions: int = 0
    questions_by_language: Dict[str, int] = Field(default_factory=dict)
    questions_by_activity: Dict[str, int] = Field(default_factory=dict)
    questions_by_level: Dict[str, int] = Field(default_factory=dict)
    recent_generation_count: int = 0
    average_quality_rating: Optional[float] = None


    total_exams_taken: int = 0


# ===============================
# ADMIN RESPONSE MODELS
# ===============================


class AdminLoginResponse(BaseModel):
    """Admin login response model"""

    success: bool
    message: str
    token: str
    admin_email: Optional[str] = None
    admin_id: Optional[str] = None
    admin_name: Optional[str] = None
    admin_role: Optional[str] = None
    admin_permissions: Optional[List[str]] = None


class AdminPasswordChangeResponse(BaseModel):
    """Admin password change response model"""

    success: bool
    message: str
    admin_id: Optional[str] = None


class AdminQuestionResponse(BaseModel):
    """Single question response for admin"""

    id: str
    language_info: LanguageInfo = Field(
        ..., description="Complete language information"
    )
    activity_type: str
    level: str
    difficulty_level: Optional[str] = None
    created_datetime: datetime
    usage_count: int = 0
    quality_rating: Optional[float] = None
    question_preview: str  # First 100 characters of question content
    generated_by_admin: Optional[str] = None
    validation_status: Optional[str] = None


class AdminBulkQuestionResponse(BaseModel):
    """Response model for bulk question generation"""

    success: bool
    message: str
    language_info: LanguageInfo = Field(
        ..., description="Complete language information"
    )
    activity_type: str
    level: str
    difficulty_level: str
    questions_generated: int = 0
    questions_saved: int = 0
    failed_questions: int = 0
    generation_time_seconds: Optional[float] = None
    llm_errors: List[str] = Field(default_factory=list)
    saved_question_ids: List[str] = Field(default_factory=list)


class AdminQuestionListResponse(BaseModel):
    """Response model for question search results"""

    success: bool
    message: str
    total_count: int
    questions: List[AdminQuestionResponse]
    pagination: Dict[str, Any] = Field(default_factory=dict)




class AdminDashboardResponse(BaseModel):
    """Response model for admin dashboard data"""

    success: bool
    message: str
    question_stats: QuestionStatistics
    # Note: user_stats removed - user management now handled by school domain


class AdminAuthResponse(BaseModel):
    """Response model for admin authentication check"""

    authenticated: bool
    admin_info: Optional[Dict[str, Any]] = None
    message: str


class AdminStandardResponse(BaseModel):
    """Standard response model for simple admin operations"""

    success: bool
    message: str
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AdminQuestionStatsResponse(BaseModel):
    """Response model for question statistics"""

    success: bool
    total_questions: int
    by_activity_type: Dict[str, int] = Field(default_factory=dict)
    by_level: Dict[str, int] = Field(default_factory=dict)


class AdminBulkUploadResponse(BaseModel):
    """Response model for bulk question upload"""

    success: bool
    message: str
    language_info: LanguageInfo = Field(
        ..., description="Complete language information"
    )
    questions_uploaded: int = 0
    questions_saved: int = 0
    failed_questions: int = 0
    upload_time_seconds: Optional[float] = None
    validation_errors: List[str] = Field(default_factory=list)
    saved_question_ids: List[str] = Field(default_factory=list)




class AdminPricingPack(BaseModel):
    """Admin pricing package information"""
    
    pack_name: str = Field(..., description="Name of the pricing package")
    price_euros: float = Field(..., description="Price in euros")
    points_included: int = Field(..., description="Number of points included")
    plan_type: str = Field(..., description="Plan type (basic/premium/trial)")
    llm_model: str = Field(..., description="LLM model used for this plan")
    usage_example: str = Field(..., description="Example usage description")
    description: str = Field(..., description="Package description")
    popular: bool = Field(..., description="Whether this package is popular")
    active: bool = Field(..., description="Whether this package is active")


class AdminCreditRule(BaseModel):
    """Admin credit rule information"""
    
    session_type: str = Field(..., description="Type of session (practice/exam)")
    activity_type: str = Field(..., description="Type of activity (reading/writing/grammar/full_exam)")
    points_cost: int = Field(..., description="Points cost for this activity")
    active: bool = Field(..., description="Whether this rule is currently active")
    level: str = Field(..., description="CEFR level this rule applies to")


class AdminPricingPolicyResponse(BaseModel):
    """Admin response model for pricing and credit policy API"""
    
    success: bool = Field(..., description="Request success status")
    pricing_packs: List[AdminPricingPack] = Field(..., description="Available pricing packages")
    credit_rules: Dict[str, List[AdminCreditRule]] = Field(..., description="Credit rules by level")
    policy_info: Dict[str, Any] = Field(..., description="General policy information")
    message: str = Field(..., description="Response message")


# ===============================
# SCHOOL MANAGEMENT RESPONSE MODELS
# ===============================

class SchoolDetailsModel(BaseModel):
    """Complete school details model for admin view"""
    
    # Basic Information
    id: str = Field(..., description="School ID")
    name: str = Field(..., description="School name")
    display_name: Optional[str] = Field(None, description="Display name")
    description: Optional[str] = Field(None, description="School description")
    school_type: str = Field(..., description="School type")
    is_active: bool = Field(..., description="School active status")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    
    # Contact Information
    contact_email: Optional[str] = Field(None, description="Primary contact email")
    contact_phone: Optional[str] = Field(None, description="Primary contact phone")
    admin_email: Optional[str] = Field(None, description="Admin contact email")
    admin_phone: Optional[str] = Field(None, description="Admin contact phone")
    
    # Billing Information
    billing_email: Optional[str] = Field(None, description="Billing contact email")
    billing_contact_name: Optional[str] = Field(None, description="Billing contact name")
    billing_phone: Optional[str] = Field(None, description="Billing contact phone")
    payment_method_info: Optional[dict] = Field(None, description="Payment method details")
    
    # Address Information
    physical_address: Optional[dict] = Field(None, description="Physical address")
    billing_address: Optional[dict] = Field(None, description="Billing address")
    tax_address: Optional[dict] = Field(None, description="Tax registration address")
    
    # Tax Details
    tax_id: Optional[str] = Field(None, description="Tax identification number")
    vat_number: Optional[str] = Field(None, description="VAT registration number")
    tax_exemption_status: bool = Field(False, description="Tax exemption status")
    
    # Internal Management Fields
    priority_support: bool = Field(False, description="Priority support flag")
    account_manager_notes: Optional[str] = Field(None, description="Internal notes")
    internal_tags: Optional[List[str]] = Field(None, description="Internal tags")

    # Billing Configuration
    billing_pack_id: Optional[str] = Field(None, description="Pricing pack used for billing")
    student_pack_id: Optional[str] = Field(None, description="Pricing pack used for student allocations")
    billing_cycle: Optional[str] = Field(None, description="Billing cadence (monthly/quarterly/annual)")
    cycle_start: Optional[str] = Field(None, description="Current billing cycle start date")
    cycle_end: Optional[str] = Field(None, description="Current billing cycle end date")
    last_billed_at: Optional[str] = Field(None, description="Timestamp of last billing run")
    
    # Settings and Statistics
    settings: Optional[dict] = Field(None, description="School configuration settings")
    user_count: Optional[int] = Field(None, description="Total number of users")
    active_user_count: Optional[int] = Field(None, description="Number of active users")


class SchoolProfileModel(BaseModel):
    """School profile model for school admin view (excludes internal fields)"""
    
    # Basic Information
    id: str = Field(..., description="School ID")
    name: str = Field(..., description="School name")
    display_name: Optional[str] = Field(None, description="Display name")
    description: Optional[str] = Field(None, description="School description")
    school_type: str = Field(..., description="School type")
    is_active: bool = Field(..., description="School active status")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    
    # Contact Information
    contact_email: Optional[str] = Field(None, description="Primary contact email")
    contact_phone: Optional[str] = Field(None, description="Primary contact phone")
    admin_email: Optional[str] = Field(None, description="Admin contact email")
    admin_phone: Optional[str] = Field(None, description="Admin contact phone")
    
    # Billing Information
    billing_email: Optional[str] = Field(None, description="Billing contact email")
    billing_contact_name: Optional[str] = Field(None, description="Billing contact name")
    billing_phone: Optional[str] = Field(None, description="Billing contact phone")
    payment_method_info: Optional[dict] = Field(None, description="Payment method details")
    
    # Address Information
    physical_address: Optional[dict] = Field(None, description="Physical address")
    billing_address: Optional[dict] = Field(None, description="Billing address")
    tax_address: Optional[dict] = Field(None, description="Tax registration address")
    
    # Tax Details
    tax_id: Optional[str] = Field(None, description="Tax identification number")
    vat_number: Optional[str] = Field(None, description="VAT registration number")
    tax_exemption_status: bool = Field(False, description="Tax exemption status")
    
    # Settings (non-internal only)
    settings: Optional[dict] = Field(None, description="School configuration settings")

    # Billing Configuration (read-only)
    billing_pack_id: Optional[str] = Field(None, description="Pricing pack used for billing")
    student_pack_id: Optional[str] = Field(None, description="Pricing pack used for student allocations")
    billing_cycle: Optional[str] = Field(None, description="Billing cadence (monthly/quarterly/annual)")
    cycle_start: Optional[str] = Field(None, description="Current billing cycle start date")
    cycle_end: Optional[str] = Field(None, description="Current billing cycle end date")
    last_billed_at: Optional[str] = Field(None, description="Timestamp of last billing run")


class AdminSchoolListResponse(BaseModel):
    """Response model for admin school list endpoint"""
    
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    schools: List[SchoolDetailsModel] = Field(..., description="List of schools with full details")
    total_count: int = Field(..., description="Total number of schools")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Number of schools per page")
    total_pages: int = Field(..., description="Total number of pages")


class AdminSchoolDetailsResponse(BaseModel):
    """Response model for admin school details endpoint"""
    
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    school: SchoolDetailsModel = Field(..., description="Complete school details")


class SchoolProfileResponse(BaseModel):
    """Response model for school admin profile view"""
    
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    school: SchoolProfileModel = Field(..., description="School profile (non-internal fields only)")




# ===============================
# IMPERSONATION RESPONSE MODELS
# ===============================

class SchoolImpersonationData(BaseModel):
    """School impersonation token data"""
    
    access_token: str = Field(..., description="School access token for impersonation")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiry in seconds")
    school_id: str = Field(..., description="School ID being impersonated")
    school_name: str = Field(..., description="School name being impersonated")
    impersonated_by: str = Field(..., description="Admin ID doing the impersonation")


class SchoolImpersonationResponse(BaseModel):
    """Response model for school impersonation"""
    
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: SchoolImpersonationData = Field(..., description="Impersonation token data")
