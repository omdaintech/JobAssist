"""
Application configuration with environment variable loading
All infrastructure settings come from environment variables
"""

from typing import List, Optional
import secrets
import structlog
from pydantic import Field
from pydantic_settings import BaseSettings

logger = structlog.get_logger()


def generate_secret_key() -> str:
    """Generate a secure secret key"""
    return secrets.token_urlsafe(32)


class Settings(BaseSettings):
    """Application settings - ALL from environment variables in .env file"""

    # Infrastructure from .env file
    # App always requires database
    
    # MySQL Database Settings (NEW - Primary database)
    mysql_host: str = Field(default="localhost", env="MYSQL_HOST")
    mysql_port: int = Field(default=3306, env="MYSQL_PORT")
    mysql_user: str = Field(default="cefr_user", env="MYSQL_USER")
    mysql_password: str = Field(..., env="MYSQL_PASSWORD")
    mysql_database: str = Field(default="cefr_practice", env="MYSQL_DATABASE")
    mysql_charset: str = Field(default="utf8mb4", env="MYSQL_CHARSET")
    
    # Database selection - MySQL only
    use_mysql: bool = Field(default=True, env="USE_MYSQL")  # Always MySQL

    # Security from .env file
    secret_key: str = Field(..., env="SECRET_KEY")
    jwt_secret_key: str = Field(..., env="JWT_SECRET_KEY")
    jwt_access_token_expires: int = Field(..., env="JWT_ACCESS_TOKEN_EXPIRES")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    admin_jwt_expires: int = Field(default=86400, env="ADMIN_JWT_EXPIRES")
    
    # Sentry Error Tracking (optional)
    sentry_dsn: Optional[str] = Field(default=None, env="SENTRY_DSN")
    sentry_environment: str = Field(default="production", env="SENTRY_ENVIRONMENT")
    sentry_traces_sample_rate: float = Field(default=0.2, env="SENTRY_TRACES_SAMPLE_RATE")  # 20% for better visibility
    sentry_profiles_sample_rate: float = Field(default=0.0, env="SENTRY_PROFILES_SAMPLE_RATE")  # Disabled to save quota
    
    # Impersonation settings (not in env - internal config)
    impersonation_token_expires: int = Field(default=10800)  # 3 hours in seconds
    email_verification_window_hours: int = Field(
        default=24, env="EMAIL_VERIFICATION_WINDOW_HOURS"
    )
    password_reset_window_hours: int = Field(
        default=24, env="PASSWORD_RESET_WINDOW_HOURS"
    )

    # Admin user IDs from .env file (security: no hardcoded IDs)
    admin_user_id: str = Field(default="xxxx", env="ADMIN_USER_ID")
    test_user_id: str = Field(default="xxx", env="TEST_USER_ID")
    
    # SAAS Configuration
    default_b2c_school_id: str = Field(default="xxx", env="DEFAULT_B2C_SCHOOL_ID")
    
    # Dashboard Cache Configuration
    dashboard_cache_ttl: int = Field(default=60, env="DASHBOARD_CACHE_TTL")  # seconds, default 1 minute

    # Session Sharing Configuration (hardcoded - not env variable)
    share_link_expiration_hours: int = 72  # 72 hours = 3 days

    # Application settings from .env file
    debug: bool = Field(..., env="DEBUG")
    default_language: str = Field(..., env="DEFAULT_LANGUAGE")
    
    # Default language constants
    default_language_id: str = Field(default="xxx", env="DEFAULT_LANGUAGE_ID")  # German language ID
    
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8880, env="PORT")

    # OpenAI settings from .env file
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")
    openai_max_tokens: int = Field(..., env="OPENAI_MAX_TOKENS")
    openai_temperature: float = Field(..., env="OPENAI_TEMPERATURE")
    
    # GPT-5 Mini specific settings (optional - fallback to regular OpenAI if not provided)
    gpt5_mini_api_key: Optional[str] = Field(None, env="GPT5_MINI_API_KEY")
    gpt5_mini_reasoning_effort: str = Field(default="medium", env="GPT5_MINI_REASONING_EFFORT")
    gpt5_mini_text_verbosity: str = Field(default="medium", env="GPT5_MINI_TEXT_VERBOSITY")

    # reCaptcha
    recaptcha_secret_key: str | None = Field(
        default=None, env="RECAPTCHA_SECRET_KEY"
    )
    recaptcha_site_key: str | None = Field(
        default=None, env="RECAPTCHA_SITE_KEY"
    )
    enable_captcha: bool = Field(
        default=True, env="ENABLE_CAPTCHA",
        description="Enable/disable CAPTCHA verification globally"
    )

    # Email Configuration
    # Mailgun API (Preferred method)
    mailgun_api_key: str | None = Field(default=None, env="MAILGUN_API_KEY")
    mailgun_domain: str = Field(default="example.com", env="MAILGUN_DOMAIN")
    mailgun_api_base_url: str = Field(
        default="https://api.mailgun.net/v3", 
        env="MAILGUN_API_BASE_URL"
    )
    use_mailgun_api: bool = Field(
        default=True, 
        env="USE_MAILGUN_API",
        description="Use Mailgun API instead of SMTP (recommended)"
    )
    
    # SMTP (Fallback method)
    smtp_server: str | None = Field(default=None, env="SMTP_SERVER")
    smtp_port: int = Field(default=587, env="SMTP_PORT")
    smtp_username: str | None = Field(default=None, env="SMTP_USERNAME")
    smtp_password: str | None = Field(default=None, env="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(default=True, env="SMTP_USE_TLS")
    
    # Email sender details
    from_email: str | None = Field(default=None, env="FROM_EMAIL")
    from_name: str = Field(default="One-CEFR", env="FROM_NAME")

    # Frontend URL
    frontend_url: str | None = Field(default=None, env="FRONTEND_URL")

    # Student joining email notification
    student_joining_mail: bool = Field(default=False, env="STUDENT_JOINING_MAIL")
    
    # Direct learner (self-signup) welcome email notification
    direct_learner_welcome_mail: bool = Field(default=True, env="DIRECT_LEARNER_WELCOME_MAIL")

    # Development vs Production flags
    enable_auth: bool = True  # Always enabled for production security
    enable_logging: bool = True  # Always enabled for monitoring
    enable_swagger_docs: bool = Field(
        default=False,
        env="ENABLE_SWAGGER_DOCS",
        description="Enable Swagger/OpenAPI documentation - disable in production for security",
    )

    # NEW: Transaction Dependency Configuration
    require_transactions: bool = Field(
        default=True,
        env="REQUIRE_TRANSACTIONS",
        description="CRITICAL: Fail app if database transactions unavailable",
    )
    transaction_check_on_startup: bool = Field(
        default=True,
        env="TRANSACTION_CHECK_ON_STARTUP",
        description="Check transaction availability during app startup",
    )
    transaction_health_checks: bool = Field(
        default=True,
        env="TRANSACTION_HEALTH_CHECKS",
        description="Include transaction checks in health endpoints",
    )

    # MySQL uses table names


    # Rate limiting
    sessions_path_rate_limit_per_minute: int = Field(default=40, env="SESSIONS_PATH_RATE_LIMIT_PER_MINUTE")  # Sessions API endpoints

    # Input validation
    max_input_length: int = 1000
    enable_input_sanitization: bool = True
    enable_prompt_injection_protection: bool = True
    
    # Answer Length Validation (in words)
    answer_length_limits: dict = Field(
        default={
            "A1": {"writing": 60, "grammar": 60},
            "A2": {"writing": 100, "grammar": 100}, 
            "B1": {"writing": 200, "grammar": 200}
        },
        description="Maximum word count limits for user answers by CEFR level and activity type"
    )
    
    # Minimum answer length by activity type
    min_answer_words: dict = Field(
        default={
            "writing": 5,
            "grammar": 1,
            "hearing": 1
        },
        description="Minimum word count for answers by activity type"
    )

    # API safety limits
    max_api_limit: int = 100  # Maximum limit for any listing API
    
    # Default Plan Configuration
    default_plan_type: str = Field(default="trial", env="DEFAULT_PLAN_TYPE")
    default_pricing_pack_id: str = Field(default="pp_trial", env="DEFAULT_PRICING_PACK_ID")
    fallback_pricing_pack_id: str = Field(default="pp_starter", env="FALLBACK_PRICING_PACK_ID")

    # Hearing exams feature flag
    enable_hearing_exams: bool = Field(
        default=True,
        env="ENABLE_HEARING_EXAMS",
        description="Enable hearing exam functionality across the platform",
    )

    # Speaking exams feature flag
    enable_speaking_exams: bool = Field(
        default=True,
        env="ENABLE_SPEAKING_EXAMS",
        description="Enable speaking (audio monologue) functionality",
    )
    
    # Deterministic evaluation feature flag (Nov 2025 - Cost Optimization)
    enable_deterministic_evaluation: bool = Field(
        default=True,
        env="ENABLE_DETERMINISTIC_EVALUATION",
        description="Use rule-based evaluation for reading/hearing (skips LLM, saves ~16% cost)",
    )
    
    # AWS S3 for hearing audio files
    aws_access_key_id: Optional[str] = Field(None, env="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = Field(None, env="AWS_SECRET_ACCESS_KEY")
    aws_region: str = Field(default="eu-central-1", env="AWS_REGION")
    s3_bucket_name: str = Field(default="your-audio-bucket", env="S3_BUCKET_NAME")
    s3_hearing_folder: str = Field(default="hearing", env="S3_HEARING_FOLDER")
    s3_speaking_folder: str = Field(
        default="speaking-shortlived",
        env="S3_SPEAKING_FOLDER",
    )
    
    # CloudFront Distribution for audio files
    cloudfront_domain: Optional[str] = Field(None, env="CLOUDFRONT_DOMAIN")
    
    # ElevenLabs TTS for hearing audio generation
    elevenlabs_api_key: Optional[str] = Field(None, env="ELEVENLABS_API_KEY")

    # Speaking audio processing
    speaking_audio_retention_days: int = Field(
        default=7,
        env="SPEAKING_AUDIO_RETENTION_DAYS",
        description="Retention window (days) for speaking recordings stored in S3",
    )
    speaking_audio_max_duration_seconds: int = Field(
        default=55,
        env="SPEAKING_AUDIO_MAX_DURATION_SECONDS",
        description="Default maximum speaking answer duration",
    )
    speaking_transcription_model: str = Field(
        default="whisper-1",
        env="SPEAKING_TRANSCRIPTION_MODEL",
        description="OpenAI model used for speech-to-text",
    )

    # PayPal Payment Integration
    paypal_mode: str = Field(default="sandbox", env="PAYPAL_MODE")  # "sandbox" or "live"
    paypal_client_id: Optional[str] = Field(None, env="PAYPAL_CLIENT_ID")
    paypal_client_secret: Optional[str] = Field(None, env="PAYPAL_CLIENT_SECRET")
    paypal_webhook_id: Optional[str] = Field(None, env="PAYPAL_WEBHOOK_ID")
    
    # UPI Payment Support (India)
    upi_id: str = Field(default="yourname@upi", env="UPI_ID")
    upi_merchant_name: str = Field(default="Example Merchant", env="UPI_MERCHANT_NAME")
    payment_support_email: str = Field(default="support@example.com", env="PAYMENT_SUPPORT_EMAIL")

    # Security settings (configurable for environments)
    enable_https_redirect: bool = Field(default=False, env="ENABLE_HTTPS_REDIRECT")
    trusted_hosts: List[str] = Field(default=["*"], env="TRUSTED_HOSTS")
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:4000",
            "https://www.example.com",
            "https://example.com",
            "https://app.example.com"
        ],
        env="CORS_ORIGINS"
    )
    enable_security_headers: bool = Field(
        default=True, env="ENABLE_SECURITY_HEADERS"
    )

    # MySQL uses SQLAlchemy connection pooling

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore unknown environment variables

    def is_openai_configured(self) -> bool:
        """Check if OpenAI is properly configured"""
        return bool(self.openai_api_key and len(self.openai_api_key.strip()) > 0)
    
    def get_mysql_url(self) -> str:
        """Get MySQL connection URL for sync operations"""
        return f"mysql+mysqlconnector://{self.mysql_user}:{self.mysql_password}@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}?charset={self.mysql_charset}"
    
    def get_mysql_async_url(self) -> str:
        """Get MySQL connection URL for async operations"""
        return f"mysql+aiomysql://{self.mysql_user}:{self.mysql_password}@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}?charset={self.mysql_charset}"
    
    def is_mysql_configured(self) -> bool:
        """Check if MySQL is properly configured"""
        return bool(
            self.mysql_password and 
            len(self.mysql_password.strip()) > 0 and
            self.mysql_host and
            self.mysql_user and
            self.mysql_database
        )
    
    def is_paypal_configured(self) -> bool:
        """Check if PayPal is properly configured"""
        return bool(
            self.paypal_client_id and
            self.paypal_client_secret and
            len(self.paypal_client_id.strip()) > 0 and
            len(self.paypal_client_secret.strip()) > 0
        )

    def get_default_llm_model(self) -> str:
        """Get the default LLM model to use (OpenAI-only)"""
        if self.is_openai_configured():
            return "openai"
        else:
            return "openai"  # Always default to OpenAI


    def get_answer_length_limit(self, level: str, activity_type: str) -> int:
        """Get maximum word count for a specific CEFR level and activity type"""
        return self.answer_length_limits.get(level, {}).get(activity_type, 100)  # Default 100 words


# Global settings instance
settings = Settings()


# Language Service Integration Helper
class LanguageHelper:
    """
    Helper class for language operations that integrates with language service
    This should be used instead of direct settings methods for validation
    """

    def __init__(self):
        self._language_service = None

    @property
    def language_service(self):
        """Lazy load ODM service for language operations"""
        if self._language_service is None:
            try:
                # Import CoreRepository which has language operations
                from app.user.models.core_repository import CoreRepository
                from app.common.models.mysql_odm_service import get_mysql_base_odm_service
                
                # Create CoreRepository instance for language operations
                self._language_service = get_mysql_base_odm_service(CoreRepository)
            except Exception:
                # Fallback if service not available - this prevents PromptManager failures
                logger.debug("Language service initialization failed, using fallback validation")
                self._language_service = None
        return self._language_service

    def validate_language(self, language_id: str) -> str:
        """
        Validate language_id against the master languages table
        Falls back to basic validation if service unavailable
        """
        if not language_id:
            return settings.default_language

        # Try to validate against database using ODM
        if self.language_service:
            try:
                language_info = self.language_service.get_language_by_id(
                    language_id
                )
                if language_info and language_info.get("is_active"):
                    return language_id
                else:
                    raise ValueError(
                        f"Language ID '{language_id}' is not active or available"
                    )
            except Exception:
                # Fall back to basic validation
                pass

        # Basic fallback validation - just return the ID as-is
        return language_id


# Global language helper instance
language_helper = LanguageHelper()
