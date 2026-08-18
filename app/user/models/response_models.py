"""
Pydantic response models for API output validation
Provides type safety and auto-generates API documentation
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.common.models.base_models import LanguageInfo
from app.config import settings


class QuestionResponse(BaseModel):
    """Response model for generated questions"""

    success: bool = Field(
        ..., description="Whether question was generated successfully"
    )
    question_data: Optional[Dict[str, Any]] = Field(
        None, description="Generated question content"
    )
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    # Session completion fields
    completed: Optional[bool] = Field(None, description="Whether session is completed")
    message: Optional[str] = Field(None, description="Completion or status message")
    progress: Optional[Dict[str, Any]] = Field(
        None, description="Session progress data"
    )


class SessionResponse(BaseModel):
    """Unified response model for session creation (exam or practice)"""

    success: bool = Field(..., description="Whether session was created successfully")
    message: str = Field(..., description="Response message")
    session_id: str = Field(..., description="Unique session identifier")
    session_type: str = Field(..., description="Type of session (exam or practice)")
    total_questions: int = Field(..., description="Total questions in session")
    language_info: LanguageInfo = Field(..., description="Language information")


class SessionHistoryResponse(BaseModel):
    """Response model for session history (unified exam and practice)"""

    success: bool = Field(
        ..., description="Whether sessions were retrieved successfully"
    )
    sessions: List[Dict[str, Any]] = Field(..., description="List of user sessions")
    total_sessions: int = Field(..., description="Total number of sessions")


# Admin models moved to app/models/admin_models.py following FastAPI best practices


# FeedbackResponse model removed - replaced by new practice session system


class AuthResponse(BaseModel):
    """Response model for authentication"""

    success: bool = Field(..., description="Authentication success")
    message: str = Field(..., description="Response message")
    access_token: Optional[str] = Field(None, description="JWT access token")
    user_id: Optional[str] = Field(None, description="User identifier")
    email: Optional[str] = Field(None, description="User email")
    name: Optional[str] = Field(None, description="User display name")
    preferred_language_info: Optional[LanguageInfo] = Field(
        None, description="User's preferred language"
    )
    current_level: Optional[str] = Field(None, description="User's current CEFR level")
    is_onboarded: Optional[bool] = Field(None, description="Whether onboarding is complete")
    onboarding_goal: Optional[str] = Field(None, description="Primary goal selected during onboarding")
    target_level: Optional[str] = Field(None, description="Target CEFR level selected during onboarding")
    practice_frequency_per_week: Optional[int] = Field(None, description="Practice frequency preference per week")
    preferred_language_id: Optional[str] = Field(None, description="Preferred assessment language ID")
    expires_in: Optional[int] = Field(
        None, description="Token expiration time in seconds"
    )


class SignupResponse(BaseModel):
    """Response model for user registration"""

    success: bool
    message: str
    user_id: Optional[str] = None
    verification_sent: bool = False


class EmailVerificationResponse(BaseModel):
    """Response model for email verification"""

    success: bool
    message: str
    user_activated: bool = False


class SessionListResponse(BaseModel):
    """Response for session list endpoint"""

    success: bool
    sessions: List[Dict[str, Any]]


class SessionDetailResponse(BaseModel):
    """Response for session detail endpoint"""

    success: bool
    session_detail: Dict[str, Any]


class UserStatusResponse(BaseModel):
    """Response model for user status"""

    success: bool = Field(..., description="Whether request was successful")
    user_info: Dict[str, Any] = Field(..., description="User details")
    usage_info: Dict[str, Any] = Field(..., description="Usage information")


class PracticeLogResponse(BaseModel):
    """Response model for practice log"""

    success: bool = Field(..., description="Operation success")
    practice_log: List[Dict[str, Any]] = Field(..., description="Practice activity log")
    status: Optional[str] = Field(None, description="Status message (for coming soon)")
    message: Optional[str] = Field(None, description="Additional message")


class UsageResponse(BaseModel):
    """Response model for usage information"""

    success: bool = Field(..., description="Operation success")
    usage_info: Dict[str, Any] = Field(..., description="Usage statistics")


class HealthResponse(BaseModel):
    """Response model for health checks - Abstract status information"""

    status: str = Field(..., description="Overall service status")
    core_services: str = Field(..., description="Core infrastructure status")
    ai_capabilities: str = Field(..., description="AI/LLM service availability")
    language_support: Dict[str, Any] = Field(..., description="Language support status")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Check timestamp"
    )
    system_health: Dict[str, Any] = Field(
        ..., description="High-level system health metrics"
    )


class DashboardStatsResponse(BaseModel):
    """Response model for comprehensive dashboard statistics"""

    success: bool = Field(..., description="Operation success")
    user_info: Dict[str, Any] = Field(..., description="User information")
    usage_info: Dict[str, Any] = Field(..., description="Usage statistics")
    
    # Core Analytics
    daily_activity: Dict[str, Any] = Field(
        ..., description="Daily/weekly activity for calendar visualization"
    )
    session_split: Dict[str, Any] = Field(
        ..., description="Practice vs exam session split for pie chart"
    )
    favorite_activities: List[Dict[str, Any]] = Field(
        ..., description="Most practiced activity types with scores"
    )
    level_progress: List[Dict[str, Any]] = Field(
        ..., description="Progress by CEFR level distribution"
    )
    recent_exams: List[Dict[str, Any]] = Field(
        ..., description="Recent exam results with scores"
    )
    streak_data: Dict[str, Any] = Field(
        ..., description="Current streak information with badges"
    )
    
    # Advanced Analytics
    learning_insights: Dict[str, Any] = Field(
        ..., description="Learning insights: strengths and improvement areas"
    )
    performance_trends: Dict[str, Any] = Field(
        ..., description="Performance trends over time with monthly data"
    )
    weekly_score_improvement: Dict[str, Any] = Field(
        ..., description="Weekly score improvement with gap handling for inactive weeks"
    )
    
    # Legacy compatibility
    practice_stats: Dict[str, Any] = Field(
        ..., description="Practice session statistics (legacy)"
    )
    exam_stats: Dict[str, Any] = Field(
        ..., description="Exam performance statistics (legacy)"
    )
    quick_stats: Dict[str, Any] = Field(
        ..., description="Quick overview statistics (legacy)"
    )


class UserInfoResponse(BaseModel):
    """Response model for user information"""

    name: str = Field(..., description="User name")
    email: str = Field(..., description="User email")
    current_level: str = Field(..., description="Current CEFR level")
    member_since: datetime = Field(..., description="Registration date")


class UsageInfoResponse(BaseModel):
    """Response model for usage information"""

    used_count: int = Field(..., description="Sessions used")
    total_count: int = Field(..., description="Total allocated sessions")
    remaining_count: int = Field(..., description="Sessions remaining")
    percentage: float = Field(..., description="Usage percentage")


class PracticeStatsResponse(BaseModel):
    """Response model for practice statistics"""

    today_count: int = Field(..., description="Sessions today")
    weekly_count: int = Field(..., description="Sessions this week")
    total_sessions: int = Field(..., description="Total practice sessions")
    streak_days: int = Field(..., description="Current streak in days")
    average_accuracy: float = Field(..., description="Average accuracy percentage")
    favorite_activity: str = Field(..., description="Most practiced activity type")


class ExamStatsResponse(BaseModel):
    """Response model for exam statistics"""

    total_attempts: int = Field(..., description="Total exam attempts")
    passed_exams: int = Field(..., description="Number of passed exams")
    highest_score: float = Field(..., description="Highest exam score")
    success_rate: float = Field(..., description="Success rate percentage")
    last_attempt_date: Optional[datetime] = Field(
        None, description="Last exam attempt date"
    )


class QuickStatsResponse(BaseModel):
    """Response model for quick statistics"""

    total_questions: int = Field(..., description="Total practice questions answered")
    average_accuracy: float = Field(..., description="Overall accuracy percentage")
    favorite_activity: str = Field(..., description="Most practiced activity")
    current_level: str = Field(..., description="Current CEFR level")


class UserProfileResponse(BaseModel):
    """Response model for user profile information"""

    success: bool = Field(..., description="Operation success")
    user_info: Dict[str, Any] = Field(..., description="User profile information")


class LearningPreferencesResponse(BaseModel):
    """Response model for learning preferences"""

    success: bool = Field(..., description="Operation success")
    preferences: Dict[str, Any] = Field(..., description="User learning preferences")


class PasswordChangeResponse(BaseModel):
    """Response model for password change"""

    success: bool = Field(..., description="Operation success")
    message: str = Field(..., description="Response message")
    changed_at: datetime = Field(
        default_factory=datetime.utcnow, description="Password change timestamp"
    )


class ForgotPasswordResponse(BaseModel):
    """Response model for forgot password request"""

    success: bool = Field(..., description="Operation success")
    message: str = Field(..., description="Response message")


class ResetPasswordResponse(BaseModel):
    """Response model for password reset"""

    success: bool = Field(..., description="Operation success")
    message: str = Field(..., description="Response message")
    reset_at: datetime = Field(
        default_factory=datetime.utcnow, description="Password reset timestamp"
    )


# Language response models for GET APIs only
class LanguageResponse(BaseModel):
    """Response model for language information"""

    language_id: str
    language_name: str
    native_name: Optional[str] = None
    code: Optional[str] = None
    flag_emoji: Optional[str] = None
    supported_levels: List[str] = Field(
        default_factory=list,
        description=(
            "CEFR levels supported by this language "
            "(e.g. ['A1', 'A2', 'B1', 'B2'])"
        )
    )
    display_order: Optional[int] = Field(
        None, description="Display order for UI sorting"
    )
    is_active: Optional[bool] = Field(
        True, description="Whether language is active"
    )


class PublishedLanguagesResponse(BaseModel):
    """Response model for published languages"""

    success: bool
    languages: List[LanguageResponse]
    message: Optional[str] = None


class StandardResponse(BaseModel):
    """Standard success response"""

    success: bool = Field(..., description="Operation success")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional response data")


# Exam Analysis Response Models


class ActivityAnalysisResult(BaseModel):
    """Result from analyzing one activity type"""

    activity_type: str = Field(
        ..., description="Activity type (reading/writing/grammar/hearing)"
    )
    individual_feedback: Dict[int, Dict[str, Any]] = Field(
        ..., description="Feedback for each question by number"
    )
    section_summary: Dict[str, Any] = Field(
        ..., description="Overall section analysis and recommendations"
    )
    processing_time: float = Field(
        ..., description="Time taken to analyze this activity (seconds)"
    )
    token_usage: int = Field(..., description="LLM tokens used for this activity")
    status: str = Field(..., description="Analysis status (completed/failed)")
    errors: List[str] = Field(
        default_factory=list, description="Any errors encountered"
    )


class AnalysisResponse(BaseModel):
    """Response model for exam analysis completion"""

    success: bool = Field(..., description="Overall analysis success")
    exam_id: str = Field(..., description="Exam ID that was analyzed")
    analysis_status: str = Field(..., description="Overall analysis status")
    message: str = Field(..., description="Human-readable status message")

    # Analysis results by activity type
    activity_results: Dict[str, ActivityAnalysisResult] = Field(
        default_factory=dict, description="Analysis results for each activity type"
    )

    # Overall analysis summary
    overall_summary: Dict[str, Any] = Field(
        default_factory=dict, description="Cross-activity insights and recommendations"
    )

    # Processing metadata
    total_processing_time: float = Field(
        ..., description="Total analysis time (seconds)"
    )
    total_token_usage: int = Field(..., description="Total LLM tokens used")
    activities_analyzed: List[str] = Field(
        ..., description="List of activities that were analyzed"
    )
    completed_at: datetime = Field(
        default_factory=datetime.utcnow, description="Analysis completion timestamp"
    )


class AnalysisProgressResponse(BaseModel):
    """Response model for analysis progress tracking"""

    exam_id: str = Field(..., description="Exam ID being analyzed")
    current_status: str = Field(..., description="Current analysis status")
    progress_percentage: float = Field(..., description="Analysis progress (0-100)")
    current_activity: Optional[str] = Field(
        None, description="Currently processing activity type"
    )
    activities_completed: List[str] = Field(
        default_factory=list, description="Completed activities"
    )
    activities_remaining: List[str] = Field(
        default_factory=list, description="Remaining activities"
    )
    estimated_completion: Optional[datetime] = Field(
        None, description="Estimated completion time"
    )
    error_message: Optional[str] = Field(
        None, description="Error message if analysis failed"
    )


class UserUsageResponse(BaseModel):
    """Response model for user usage information (lightweight endpoint)"""

    success: bool = Field(..., description="Operation success status")
    usage_info: Dict[str, Any] = Field(..., description="User usage information")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "usage_info": {
                    "allocated_count": 200,
                    "used_count": 40,
                    "remaining_count": 160,
                    "plan_type": settings.default_plan_type,
                    "access_expires": None,
                    "last_used": "2025-07-21T09:58:23.744000",
                },
            }
        }


class ShareLinkResponse(BaseModel):
    """Response model for share link generation"""

    success: bool = Field(..., description="Operation success")
    share_code: str = Field(..., description="8-char alphanumeric share code")
    share_url: str = Field(..., description="Full public URL to share")
    message: str = Field(..., description="Success message")


class PublicSessionDetailResponse(BaseModel):
    """Response model for public session details (anonymized)"""

    success: bool = Field(..., description="Operation success")
    session: Dict[str, Any] = Field(..., description="Session data without user info")


class PublicSessionAnswersResponse(BaseModel):
    """Response model for public session answers (anonymized)"""

    success: bool = Field(..., description="Operation success")
    answers: List[Dict[str, Any]] = Field(..., description="Answer data")
    section_summaries: Dict[str, Any] = Field(..., description="Section analysis summaries")


# ========================================
# PAYMENT RESPONSE MODELS
# ========================================


class PricingPackResponse(BaseModel):
    """Response model for pricing pack information"""

    id: str = Field(..., description="Pricing pack ID")
    pack_name: str = Field(..., description="Pack name")
    credits: int = Field(..., description="Number of credits")
    price_euros: float = Field(..., description="Price in euros (discounted if applicable)")
    original_price: Optional[float] = Field(None, description="Original price before discount")
    discount_percentage: int = Field(0, description="Discount percentage (0-100)")
    description: Optional[str] = Field(None, description="Pack description")
    features: Optional[List[str]] = Field(None, description="Pack features")
    is_popular: bool = Field(False, description="Whether this is a popular pack")
    is_active: bool = Field(True, description="Whether this pack is active")


class PricingPacksResponse(BaseModel):
    """Response model for active pricing packs list"""

    success: bool = Field(..., description="Operation success")
    pricing_packs: List[PricingPackResponse] = Field(..., description="List of active pricing packs")
    promotion: Optional[Dict[str, Any]] = Field(None, description="Active promotion details")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "pricing_packs": [
                    {
                        "id": "pack_abc123",
                        "pack_name": "Standard",
                        "credits": 200,
                        "price_euros": 14.99,
                        "original_price": 49.97,
                        "discount_percentage": 70,
                        "description": "Regular practice (most popular!)",
                        "features": ["200 credits", "Valid for 6 months"],
                        "is_popular": True,
                        "is_active": True
                    }
                ],
                "promotion": {
                    "active": True,
                    "title": "Beta Launch Special",
                    "message": "70% OFF - Limited Time!",
                    "badge_text": "BLACK FRIDAY"
                }
            }
        }


class PayPalOrderResponse(BaseModel):
    """Response model for PayPal order creation"""

    success: bool = Field(..., description="Operation success")
    order_id: str = Field(..., description="PayPal order ID")
    approval_url: str = Field(..., description="PayPal approval URL for checkout")
    message: Optional[str] = Field(None, description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "order_id": "PAYPAL-ORDER-123ABC",
                "approval_url": "https://www.paypal.com/checkoutnow?token=..."
            }
        }


class PaymentTransactionItem(BaseModel):
    """Payment transaction item in history"""

    id: str = Field(..., description="Transaction ID")
    gateway_provider: str = Field(..., description="Payment gateway (paypal, stripe, etc.)")
    gateway_order_id: str = Field(..., description="Gateway's order ID")
    amount_value: float = Field(..., description="Amount paid")
    currency_code: str = Field(..., description="Currency code (EUR, USD, etc.)")
    credits_purchased: int = Field(..., description="Number of credits purchased")
    status: str = Field(..., description="Transaction status (created, completed, failed, refunded)")
    created_at: datetime = Field(..., description="Transaction creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Transaction completion timestamp")


class PaymentHistoryResponse(BaseModel):
    """Response model for payment history"""

    success: bool = Field(..., description="Operation success")
    transactions: List[PaymentTransactionItem] = Field(..., description="List of transactions")
    total: int = Field(..., description="Total number of transactions")
    message: Optional[str] = Field(None, description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "transactions": [
                    {
                        "id": "txn_123",
                        "gateway_provider": "paypal",
                        "gateway_order_id": "PAYPAL-ORDER-123",
                        "amount_value": 14.99,
                        "currency_code": "EUR",
                        "credits_purchased": 200,
                        "status": "completed",
                        "created_at": "2025-10-21T10:30:00Z",
                        "completed_at": "2025-10-21T10:30:05Z"
                    }
                ],
                "total": 5
            }
        }


class WebhookResponse(BaseModel):
    """Response model for webhook processing"""

    success: bool = Field(..., description="Webhook processing success")
    message: str = Field(..., description="Processing message")
    transaction_id: Optional[str] = Field(None, description="Created/updated transaction ID")
