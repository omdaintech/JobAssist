"""
School Response Models - SCHOOL DOMAIN
Pydantic models for school API responses
Follows the same pattern as admin response models
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


# ===============================
# SHARED SCHOOL MODELS
# ===============================

class SchoolStandardResponse(BaseModel):
    """Standard school API response format"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")


# ===============================
# AUTHENTICATION RESPONSES
# ===============================

class SchoolAdminData(BaseModel):
    """School admin data model"""
    id: str = Field(..., description="School admin ID")
    email: str = Field(..., description="School admin email")
    name: str = Field(..., description="School admin name")
    school_id: str = Field(..., description="School ID (scoping)")
    permissions: List[str] = Field(..., description="School admin permissions")


class SchoolLoginData(BaseModel):
    """School login data model"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    school_admin: SchoolAdminData = Field(..., description="School admin information")


class SchoolLoginResponse(BaseModel):
    """School admin login response - STANDARDIZED FORMAT"""
    success: bool = Field(..., description="Login success status")
    message: str = Field(..., description="Login message")
    data: Optional[SchoolLoginData] = Field(None, description="Login data")


# ===============================
# USER MANAGEMENT RESPONSES
# ===============================

class SchoolUserModel(BaseModel):
    """School user model"""
    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    name: str = Field(..., description="User name")
    is_active: bool = Field(..., description="User active status")
    email_verified: Optional[bool] = Field(None, description="Email verification status")
    created_at: Optional[str] = Field(None, description="Creation timestamp")
    last_login: Optional[str] = Field(None, description="Last login timestamp")
    current_level: Optional[str] = Field(None, description="User CEFR level")
    preferred_language_id: Optional[str] = Field(None, description="Preferred language ID")
    school_id: str = Field(..., description="School ID")
    access: Optional[Dict[str, Any]] = Field(None, description="User access/credit info")


class SchoolUserListResponse(BaseModel):
    """School user list response"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    users: List[SchoolUserModel] = Field(..., description="List of users")
    total_count: int = Field(..., description="Total user count")
    pagination: Dict[str, Any] = Field(..., description="Pagination info")


class SchoolUserCreateResponse(BaseModel):
    """School user creation response"""
    success: bool = Field(..., description="Creation success status")
    message: str = Field(..., description="Creation message")
    user_id: Optional[str] = Field(None, description="Created user ID")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data")


# ===============================
# TEMPLATE MANAGEMENT RESPONSES
# ===============================

class SchoolTemplateModel(BaseModel):
    """School template model"""
    id: str = Field(..., description="Template ID")
    template_name: str = Field(..., description="Template name")
    level: str = Field(..., description="CEFR level")
    session_type: str = Field(..., description="Session type (exam/practice)")
    template_data: Dict[str, int] = Field(..., description="Activity counts")
    is_active: bool = Field(..., description="Template active status")
    created_at: Optional[str] = Field(None, description="Creation timestamp")
    updated_at: Optional[str] = Field(None, description="Update timestamp")


class SchoolTemplateListResponse(BaseModel):
    """School template list response"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    templates: List[SchoolTemplateModel] = Field(..., description="List of templates")
    active_template_count: Optional[int] = Field(None, description="Number of active templates")
    max_templates: Optional[int] = Field(10, description="Maximum allowed templates")


class SchoolTemplateCreateResponse(BaseModel):
    """School template creation response"""
    success: bool = Field(..., description="Creation success status")
    message: str = Field(..., description="Creation message")
    template_id: Optional[str] = Field(None, description="Created template ID")


# ===============================
# SCHOOL SESSION RESPONSES
# ===============================

class SchoolSessionCreatedModel(BaseModel):
    """Model for a successfully created session"""
    session_id: str = Field(..., description="Created session ID")
    user_id: str = Field(..., description="User ID for whom session was created")
    user_name: str = Field(..., description="User name")
    user_email: str = Field(..., description="User email")
    status: str = Field(..., description="Creation status")


class SchoolSessionFailedModel(BaseModel):
    """Model for a failed session creation"""
    user_id: str = Field(..., description="User ID for whom session creation failed")
    user_name: Optional[str] = Field(None, description="User name if available")
    user_email: Optional[str] = Field(None, description="User email if available")
    error: str = Field(..., description="Error message")


class SchoolSessionSummaryModel(BaseModel):
    """Summary of session creation operation"""
    total_requested: int = Field(..., description="Total number of sessions requested")
    successful: int = Field(..., description="Number of successfully created sessions")
    failed: int = Field(..., description="Number of failed session creations")


class SchoolSessionCreateData(BaseModel):
    """Data model for session creation response"""
    created_sessions: List[SchoolSessionCreatedModel] = Field(..., description="Successfully created sessions")
    failed_sessions: List[SchoolSessionFailedModel] = Field(..., description="Failed session creations")
    summary: SchoolSessionSummaryModel = Field(..., description="Operation summary")


class SchoolSessionCreateResponse(BaseModel):
    """Response model for school session creation"""
    success: bool = Field(..., description="Overall operation success")
    message: str = Field(..., description="Response message")
    data: SchoolSessionCreateData = Field(..., description="Session creation data")


# ===============================
# ANALYTICS RESPONSES
# ===============================

class SchoolDashboardStats(BaseModel):
    """School dashboard statistics model"""
    total_students: int = Field(..., description="Total number of students")
    active_students: int = Field(..., description="Number of active students")
    inactive_students: int = Field(..., description="Number of inactive students")
    sessions_last_7_days: int = Field(..., description="Number of sessions in last 7 days")
    total_sessions: int = Field(..., description="Total number of sessions")
    avg_sessions_per_student: float = Field(..., description="Average sessions per student")


class SchoolDashboardResponse(BaseModel):
    """School dashboard response"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    data: SchoolDashboardStats = Field(..., description="Dashboard statistics")


# ===============================
# SCHOOL INFO RESPONSES
# ===============================

class SchoolInfoModel(BaseModel):
    """School information model"""
    id: str = Field(..., description="School ID")
    name: str = Field(..., description="School name")
    display_name: Optional[str] = Field(None, description="School display name")
    description: Optional[str] = Field(None, description="School description")
    school_type: Optional[str] = Field(None, description="School type (b2c/b2b/enterprise)")
    is_active: bool = Field(..., description="School active status")
    contact_email: Optional[str] = Field(None, description="Contact email")
    admin_email: Optional[str] = Field(None, description="Admin email")
    created_at: Optional[str] = Field(None, description="Creation timestamp")


class SchoolInfoResponse(BaseModel):
    """School info response"""
    
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: SchoolInfoModel = Field(..., description="School information")


class SchoolProfileModel(BaseModel):
    """Comprehensive school profile model for school admin view (excludes internal fields)"""
    
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
    payment_method_info: Optional[Dict[str, Any]] = Field(None, description="Payment method details")
    
    # Address Information
    physical_address: Optional[Dict[str, Any]] = Field(None, description="Physical address")
    billing_address: Optional[Dict[str, Any]] = Field(None, description="Billing address")
    tax_address: Optional[Dict[str, Any]] = Field(None, description="Tax registration address")
    
    # Tax Details
    tax_id: Optional[str] = Field(None, description="Tax identification number")
    vat_number: Optional[str] = Field(None, description="VAT registration number")
    tax_exemption_status: bool = Field(False, description="Tax exemption status")
    
    # Settings (non-internal only)
    settings: Optional[Dict[str, Any]] = Field(None, description="School configuration settings")


class SchoolProfileResponse(BaseModel):
    """School profile response for school admin view"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    school: SchoolProfileModel = Field(..., description="Comprehensive school profile")


# ===============================
# SCHOOL BILLING RESPONSES
# ===============================


class BillingCyclePeriod(BaseModel):
    """Billing cycle period range"""
    start: str = Field(..., description="Period start date (ISO format)")
    end: str = Field(..., description="Period end date (ISO format)")


class UsageBucket(BaseModel):
    """Usage aggregation for a specific grouping"""
    session_count: int = Field(..., description="Number of sessions in the bucket")
    credits_used: int = Field(..., description="Credits consumed by the bucket")


class BillingPackSummary(BaseModel):
    """Summary of a pricing pack relevant for billing"""
    id: Optional[str] = Field(None, description="Pricing pack ID")
    name: Optional[str] = Field(None, description="Pricing pack name")
    credits: Optional[int] = Field(None, description="Number of credits included in the pack")
    price_euros: Optional[float] = Field(None, description="Pack price in EUR")
    per_credit_rate: float = Field(..., description="Per-credit billing rate in EUR")
    currency: str = Field(default="EUR", description="Currency for pricing information")


class SchoolUsageData(BaseModel):
    """Aggregated usage metrics for a school"""
    school_id: str = Field(..., description="School identifier")
    period: BillingCyclePeriod = Field(..., description="Usage aggregation period")
    total_credits: int = Field(..., description="Total credits consumed during period")
    total_sessions: int = Field(..., description="Total sessions completed during period")
    average_credits_per_session: float = Field(..., description="Average credits consumed per session")
    last_usage_at: Optional[str] = Field(None, description="Timestamp of the most recent usage event")
    by_session_type: Dict[str, UsageBucket] = Field(..., description="Usage grouped by session type")
    by_activity_type: Dict[str, UsageBucket] = Field(..., description="Usage grouped by activity type")


class SchoolBillingOverviewData(BaseModel):
    """Top-level billing overview response data"""
    school_id: str = Field(..., description="School identifier")
    school_name: str = Field(..., description="School name")
    billing_cycle: str = Field(..., description="Billing cycle cadence")
    current_cycle: BillingCyclePeriod = Field(..., description="Active billing cycle window")
    usage_data: SchoolUsageData = Field(..., description="Usage summary for the current cycle")
    billing_pack: Optional[BillingPackSummary] = Field(None, description="Pack used for billing calculations")
    student_pack: Optional[BillingPackSummary] = Field(None, description="Pack used for student allocations")
    projected_charges: float = Field(..., description="Projected charges for the cycle in EUR")
    last_billed_at: Optional[str] = Field(None, description="Timestamp of the last billing event")


class SchoolBillingOverviewResponse(BaseModel):
    """Response model for billing overview endpoint"""
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: SchoolBillingOverviewData = Field(..., description="Billing overview payload")


class SchoolUsageResponse(BaseModel):
    """Response model for usage aggregation endpoint"""
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: SchoolUsageData = Field(..., description="Usage aggregation payload")


class BillingComputationData(BaseModel):
    """Billing computation details"""
    billing_pack: Optional[BillingPackSummary] = Field(None, description="Billing pack information")
    student_pack: Optional[BillingPackSummary] = Field(None, description="Student allocation pack information")
    per_credit_rate: float = Field(..., description="Per-credit billing rate in EUR")
    projected_charges: float = Field(..., description="Projected charges in EUR")


class BillingCycleDetail(BaseModel):
    """Billing cycle metadata with timestamps"""
    billing_cycle: str = Field(..., description="Billing cadence (monthly/quarterly/annual/custom)")
    start: str = Field(..., description="Cycle start date (ISO format)")
    end: str = Field(..., description="Cycle end date (ISO format)")
    last_billed_at: Optional[str] = Field(None, description="Last billing timestamp if available")


class SchoolBillingReportData(BaseModel):
    """Comprehensive billing report payload"""
    cycle: BillingCycleDetail = Field(..., description="Cycle metadata")
    usage: SchoolUsageData = Field(..., description="Usage summary for the cycle")
    billing: BillingComputationData = Field(..., description="Billing computation details")


class SchoolBillingReportResponse(BaseModel):
    """Response model for billing projection/report endpoints"""
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: SchoolBillingReportData = Field(..., description="Billing report payload")


# ===============================
# SESSION MANAGEMENT RESPONSES
# ===============================

class SessionUser(BaseModel):
    """User in a session"""
    user_id: str = Field(..., description="User ID")
    user_name: str = Field(..., description="User name")
    user_email: str = Field(..., description="User email")
    status: str = Field(..., description="Session status")
    created_at: str = Field(..., description="Session creation timestamp")
    started_at: Optional[str] = Field(None, description="Session start timestamp")
    completed_at: Optional[str] = Field(None, description="Session completion timestamp")
    overall_score: Optional[float] = Field(None, description="Overall session score")


class SessionDetail(BaseModel):
    """Session detail information"""
    session_id: str = Field(..., description="Session ID")
    session_name: str = Field(..., description="Session name")
    template_id: str = Field(..., description="Template ID")
    template_name: str = Field(..., description="Template name")
    level: str = Field(..., description="CEFR level")
    session_type: str = Field(..., description="Session type")
    status: str = Field(..., description="Overall session status")
    created_at: str = Field(..., description="Session creation timestamp")
    total_users: int = Field(..., description="Total number of users")
    started_users: int = Field(..., description="Number of users who started")
    completed_users: int = Field(..., description="Number of users who completed")
    users: List[SessionUser] = Field(..., description="List of users in session")


class SessionDetailData(BaseModel):
    """Session detail response data"""
    session: SessionDetail = Field(..., description="Session detail")
    pagination: Optional[Dict[str, Any]] = Field(None, description="Pagination info")


class SchoolSessionDetailResponse(BaseModel):
    """Session detail response"""
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: SessionDetailData = Field(..., description="Session detail data")


class SchoolSessionUsersResponse(BaseModel):
    """Session users response"""
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: SessionDetailData = Field(..., description="Session users data")


class AvailableUser(BaseModel):
    """Available user for adding to session"""
    id: str = Field(..., description="User ID")
    name: str = Field(..., description="User name")
    email: str = Field(..., description="User email")
    has_session: bool = Field(..., description="Whether user already has this session")
    session_count: int = Field(..., description="Number of other sessions user has")


class AvailableUsersData(BaseModel):
    """Available users response data"""
    users: List[AvailableUser] = Field(..., description="List of available users")
    pagination: Dict[str, Any] = Field(..., description="Pagination info")


class SchoolSessionAvailableUsersResponse(BaseModel):
    """Available users for session response"""
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: AvailableUsersData = Field(..., description="Available users data")


class AddUsersToSessionData(BaseModel):
    """Add users to session response data"""
    added_users: List[str] = Field(..., description="Successfully added user IDs")
    failed_users: List[Dict[str, Any]] = Field(..., description="Failed user additions with reasons")
    summary: Dict[str, int] = Field(..., description="Summary of additions")


class SchoolSessionAddUsersResponse(BaseModel):
    """Add users to session response"""
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: AddUsersToSessionData = Field(..., description="Add users result data")
