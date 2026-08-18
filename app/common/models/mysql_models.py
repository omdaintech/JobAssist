"""
SQLAlchemy Models for MySQL Database
MySQL database models for One-CEFR
Version: 1.0.0
"""
import enum
import structlog
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, JSON,
    ForeignKey, Index, CheckConstraint, Enum as SQLAlchemyEnum, Date,
    UniqueConstraint, func, DECIMAL
)
from sqlalchemy.orm import (
    declarative_base, relationship, validates, Mapped, mapped_column
)
from datetime import datetime
from typing import Optional, Dict, Any

logger = structlog.get_logger()


Base = declarative_base()


# ========================================
# ENUMS
# ========================================


class LevelEnum(str, enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    ALL = "ALL"


class UserLevelEnum(str, enum.Enum):
    A0 = "A0"
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"


class TargetLevelEnum(str, enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"

class AuthProviderEnum(str, enum.Enum):
    email = "email"
    google = "google"
    facebook = "facebook"
    firebase = "firebase"


class SessionTypeEnum(str, enum.Enum):
    exam = "exam"
    practice = "practice"
    admin = "admin"


class ActivityTypeEnum(str, enum.Enum):
    reading = "reading"
    writing = "writing"
    grammar = "grammar"
    hearing = "hearing"
    speaking = "speaking"
    full_exam = "full_exam"
    any = "any"
    multiple = "multiple"


class DifficultyEnum(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    difficult = "difficult"


class StatusEnum(str, enum.Enum):
    available = "available"
    analysis_initiated = "analysis_initiated"
    analysis_completed = "analysis_completed"


class UsageStatusEnum(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class RoleEnum(str, enum.Enum):
    admin = "admin"
    super_admin = "super_admin"


class GenerationMethodEnum(str, enum.Enum):
    bulk_admin = "bulk_admin"
    bulk_admin_api = "bulk_admin_api"
    individual = "individual"
    ai_generated = "ai_generated"
    json_upload = "json_upload"


class SchoolTypeEnum(str, enum.Enum):
    b2c = "b2c"
    b2b = "b2b"
    enterprise = "enterprise"


class BillingCycleEnum(str, enum.Enum):
    monthly = "monthly"
    quarterly = "quarterly"
    annual = "annual"


class PaymentStatusEnum(str, enum.Enum):
    created = "created"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class MessageTypeEnum(str, enum.Enum):
    contact = "contact"
    feedback = "feedback"


class FeedbackCategoryEnum(str, enum.Enum):
    bug_report = "bug_report"
    feature_request = "feature_request"
    general_feedback = "general_feedback"
    user_experience = "user_experience"
    content_quality = "content_quality"


class SeverityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


# ========================================
# CORE USER MODELS
# ========================================


class School(Base):
    __tablename__ = 'schools'

    id = Column(String(24), primary_key=True)
    name = Column(String(200), nullable=False)
    display_name = Column(String(200))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(),
                        onupdate=func.current_timestamp())

    # Contact Information
    contact_email = Column(String(100))
    contact_phone = Column(String(50))
    admin_email = Column(String(100))
    admin_phone = Column(String(50))
    
    # Billing Information
    billing_email = Column(String(100))
    billing_contact_name = Column(String(200))
    billing_phone = Column(String(50))
    payment_method_info = Column(JSON)  # Store payment method details
    
    # Address Information
    physical_address = Column(JSON)  # {street, city, state, country, postal_code}
    billing_address = Column(JSON)   # {street, city, state, country, postal_code}
    tax_address = Column(JSON)       # {street, city, state, country, postal_code}
    
    # Tax Details
    tax_id = Column(String(100))      # Tax identification number
    vat_number = Column(String(100))  # VAT registration number
    tax_exemption_status = Column(Boolean, default=False)
    
    # School Configuration
    school_type = Column(SQLAlchemyEnum(SchoolTypeEnum), default=SchoolTypeEnum.b2b)
    settings = Column(JSON)  # General school settings
    
    # Internal Management Fields (not visible to school admins)
    priority_support = Column(Boolean, default=False)
    account_manager_notes = Column(Text)
    internal_tags = Column(JSON)  # Internal categorization tags

    # Billing Configuration
    billing_pack_id = Column(String(24), ForeignKey('pricing_packs.id', ondelete='SET NULL', onupdate='CASCADE'))
    student_pack_id = Column(String(24), ForeignKey('pricing_packs.id', ondelete='SET NULL', onupdate='CASCADE'))
    billing_cycle = Column(SQLAlchemyEnum(BillingCycleEnum), default=BillingCycleEnum.monthly, nullable=False)
    cycle_start = Column(Date)
    cycle_end = Column(Date)
    last_billed_at = Column(DateTime)

    # Relationships
    users = relationship("User", back_populates="school")
    billing_pack = relationship("PricingPack", foreign_keys=[billing_pack_id], backref="billing_schools")
    student_pack = relationship("PricingPack", foreign_keys=[student_pack_id], backref="student_schools")
    usage_logs = relationship("UsageLog", back_populates="school")

    # Indexes
    __table_args__ = (
        Index('idx_name', 'name'),
        Index('idx_is_active', 'is_active'),
        Index('idx_school_type', 'school_type'),
        Index('idx_schools_billing_cycle', 'billing_cycle', 'cycle_start', 'cycle_end'),
    )

    def __repr__(self):
        return f"<School(id='{self.id}', name='{self.name}')>"

class SchoolAdmin(Base):
    __tablename__ = 'school_admins'

    id = Column(String(24), primary_key=True)
    school_id = Column(String(24), ForeignKey('schools.id'), nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(500), nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(),
                        onupdate=func.current_timestamp())
    last_login = Column(DateTime)
    permissions = Column(JSON, default=lambda: ["manage_users", "view_analytics"])

    # Relationships
    school = relationship("School", backref="school_admins")

    # Indexes
    __table_args__ = (
        Index('idx_school_admins_school_id', 'school_id'),
        Index('idx_school_admins_email', 'email'),
        Index('idx_school_admins_active', 'is_active'),
    )

    def __repr__(self):
        return f"<SchoolAdmin(id='{self.id}', email='{self.email}', school_id='{self.school_id}')>"


class User(Base):
    __tablename__ = 'users'

    id = Column(String(24), primary_key=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(500))
    name = Column(String(100))
    current_level = Column(SQLAlchemyEnum(UserLevelEnum), default=UserLevelEnum.A1)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(),
                        onupdate=func.current_timestamp())
    last_login = Column(DateTime)
    is_active = Column(Boolean, default=True)

    # SAAS school association
    school_id = Column(String(24), ForeignKey('schools.id'), nullable=False,
                       default='886eb0635e5a4825bc3323d0', index=True)

    # Firebase fields
    firebase_uid = Column(String(100), unique=True, index=True)
    auth_provider = Column(SQLAlchemyEnum(AuthProviderEnum),
                           default=AuthProviderEnum.email)
    photo_url = Column(String(500))
    email_verified = Column(Boolean, default=False)
    phone_number = Column(String(20))

    # Email verification
    verification_code = Column(String(10))
    verification_expires = Column(DateTime)
    verification_sent_at = Column(DateTime)

    # Password reset
    reset_password_token = Column(String(100))
    reset_password_expires = Column(DateTime)

    # User preferences
    favorite_activities = Column(JSON)
    daily_goal = Column(Integer, default=10)
    preferred_language_id = Column(String(24), ForeignKey('languages.id', ondelete='SET NULL'), 
                                   nullable=False, default='687b9e32e94239d063f47070')  # German as default
    is_onboarded = Column(Boolean, default=False, nullable=False)
    onboarding_goal = Column(String(50))
    target_level = Column(SQLAlchemyEnum(TargetLevelEnum))
    practice_frequency_per_week = Column(Integer)

    # School-specific custom data (JSON with restricted keys)
    # ALLOWED KEYS ONLY: student_code, batch, remark
    # DO NOT add new keys without explicit instruction
    user_custom_school = Column(JSON, default=lambda: {})

    # Metadata
    last_activity_date = Column(Date)
    streak_days = Column(Integer, default=0)
    achievements = Column(JSON)

    # Relationships
    school = relationship("School", back_populates="users")
    user_access = relationship("UserAccess", back_populates="user",
                                uselist=False, cascade="all, delete-orphan")
    exam_details = relationship("ExamDetail", back_populates="user",
                                cascade="all, delete-orphan")
    exam_logs = relationship("ExamLog", back_populates="user",
                             cascade="all, delete-orphan")
    llm_logs = relationship("LLMLog", back_populates="user")
    question_usage_logs = relationship("QuestionUsageLog",
                                       back_populates="user",
                                       cascade="all, delete-orphan")
    payment_transactions = relationship("PaymentTransaction", back_populates="user",
                                       cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="user",
                           cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index('idx_users_email', 'email'),
        Index('idx_users_firebase_uid', 'firebase_uid'),
        Index('idx_users_created_at', 'created_at'),
        Index('idx_users_is_active', 'is_active'),
        Index('idx_users_preferred_language', 'preferred_language_id'),
        Index('idx_users_school_id', 'school_id'),  # Critical for user count queries
    )

    @validates('email')
    def validate_email(self, key, address):
        if '@' not in address:
            raise ValueError('Invalid email address')
        return address

    def __repr__(self):
        return f"<User(id='{self.id}', email='{self.email}')>"

class AdminUser(Base):
    __tablename__ = 'admin_users'
    
    id = Column(String(24), primary_key=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(500), nullable=False)
    name = Column(String(100))
    role = Column(SQLAlchemyEnum(RoleEnum), default=RoleEnum.admin)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.current_timestamp())
    last_login = Column(DateTime)
    permissions = Column(JSON)
    created_by = Column(String(100), default='system')
    
    # Indexes
    __table_args__ = (
        Index('idx_admin_users_email', 'email'),
        Index('idx_admin_users_role', 'role'),
        Index('idx_admin_users_is_active', 'is_active'),
    )
    
    def __repr__(self):
        return f"<AdminUser(id='{self.id}', email='{self.email}', role='{self.role}')>"

# ========================================
# ACCESS CONTROL MODELS
# ========================================

class UserAccess(Base):
    __tablename__ = 'user_access'
    
    id = Column(String(24), primary_key=True)
    user_id = Column(String(24), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    allocated_count = Column(Integer, nullable=False, default=0)
    used_count = Column(Integer, default=0)
    current_pack_id = Column(String(24), ForeignKey('pricing_packs.id', ondelete='SET NULL'))
    created_at = Column(DateTime, default=func.current_timestamp())
    last_used = Column(DateTime)
    access_expires = Column(DateTime)
    
    # Credit reservation system
    reserved_credits = Column(Integer, default=0)
    reservation_time = Column(DateTime)
    status = Column(SQLAlchemyEnum(StatusEnum), default=StatusEnum.available)
    last_deduction_id = Column(String(24))
    reset_at = Column(DateTime)
    reset_by = Column(String(100))
    reset_reason = Column(Text)
    
    # Topup tracking
    topups = Column(JSON)
    
    # Relationships
    user = relationship("User", back_populates="user_access")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('allocated_count >= 0 AND allocated_count <= 10000', name='chk_allocated_count'),
        CheckConstraint('used_count >= 0 AND used_count <= 10000', name='chk_used_count'),
        CheckConstraint('reserved_credits >= 0 AND reserved_credits <= 100', name='chk_reserved_credits'),
        CheckConstraint('used_count <= allocated_count', name='chk_used_not_exceed'),
        Index('idx_user_access_user_id', 'user_id'),
        Index('idx_user_access_status', 'status'),
        Index('idx_current_pack_id', 'current_pack_id'),
    )
    
    def __repr__(self):
        return f"<UserAccess(user_id='{self.user_id}', allocated={self.allocated_count}, used={self.used_count})>"

# ========================================
# LANGUAGE CONFIGURATION
# ========================================

class Language(Base):
    __tablename__ = 'languages'
    
    id = Column(String(24), primary_key=True)
    name = Column(String(100), nullable=False)
    code = Column(String(10), nullable=False, unique=True, index=True)
    flag_emoji = Column(String(10))
    is_active = Column(Boolean, default=True)
    supported_levels = Column(JSON)  # ["A1", "A2", "B1"]
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    display_order = Column(Integer, default=0)
    native_name = Column(String(100))
    
    # Relationships - simplified since many FKs are not enforced in schema
    
    # Indexes
    __table_args__ = (
        Index('idx_languages_code', 'code'),
        Index('idx_languages_is_active', 'is_active'),
        Index('idx_languages_display_order', 'display_order'),
    )
    
    def __repr__(self):
        return f"<Language(id='{self.id}', code='{self.code}', name='{self.name}')>"

# ========================================
# QUESTION MANAGEMENT MODELS
# ========================================

class QuestionBank(Base):
    __tablename__ = 'question_bank'
    
    id = Column(String(24), primary_key=True)
    
    # Language info
    language_id = Column(String(100), nullable=False)  # Foreign key removed - schema doesn't enforce it
    
    # Classification
    activity_type = Column(SQLAlchemyEnum(ActivityTypeEnum), nullable=False)
    level = Column(SQLAlchemyEnum(LevelEnum), nullable=False)
    difficulty_level = Column(SQLAlchemyEnum(DifficultyEnum), default=DifficultyEnum.difficult)
    
    # Reading fields
    text = Column(Text)
    question = Column(String(1000))
    correct_answer = Column(String(1000))
    correct_answer_reason = Column(Text)
    options = Column(JSON)  # Array of options
    
    # Hearing fields
    audio_url = Column(String(500))  # URL to the audio file (e.g., S3)
    transcript = Column(Text)        # Optional transcript of the audio
    
    # Writing fields
    instruction = Column(Text)
    topic = Column(String(200))
    requirements = Column(String(1000))
    minimum_words = Column(Integer)
    writing_format = Column(String(100))
    
    # Grammar fields
    grammar_topic = Column(String(200))
    task_type = Column(String(100))
    question_type = Column(String(100))
    tip = Column(String(500))
    
    # Metadata
    user_id = Column(String(24))
    generated_by_admin = Column(String(100), default='system')
    generation_method = Column(SQLAlchemyEnum(GenerationMethodEnum), default=GenerationMethodEnum.bulk_admin)
    created_datetime = Column(DateTime, default=func.current_timestamp())
    date_string = Column(String(10))
    time_string = Column(String(8))
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime)
    tags = Column(JSON)
    question_metadata = Column(JSON)  # Store additional metadata for the question
    
    # Relationships - removed language relationship since no FK constraint in schema
    question_usage_logs = relationship("QuestionUsageLog", back_populates="question", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('minimum_words >= 10 AND minimum_words <= 1000', name='chk_minimum_words'),
        Index('idx_question_bank_language', 'language_id'),
        Index('idx_question_bank_activity_level', 'activity_type', 'level'),
        Index('idx_question_bank_created', 'created_datetime'),
        Index('idx_question_bank_active', 'is_active'),
        Index('idx_question_bank_difficulty', 'difficulty_level'),
        Index('idx_question_bank_composite', 'activity_type', 'level', 'is_active'),
    )
    
    def __repr__(self):
        return f"<QuestionBank(id='{self.id}', activity='{self.activity_type}', level='{self.level}')>"

class QuestionUsageLog(Base):
    __tablename__ = 'question_usage_log'
    
    id = Column(String(24), primary_key=True)
    question_id = Column(String(24), ForeignKey('question_bank.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(String(24), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    activity_type = Column(String(20), nullable=False)
    level = Column(String(2), nullable=False)
    session_type = Column(String(20), nullable=False)
    used_at = Column(DateTime, default=func.current_timestamp())
    
    # Relationships
    question = relationship("QuestionBank", back_populates="question_usage_logs")
    user = relationship("User", back_populates="question_usage_logs")
    
    # Indexes
    __table_args__ = (
        Index('idx_question_usage_log_question', 'question_id'),
        Index('idx_question_usage_log_user', 'user_id'),
        Index('idx_question_usage_log_used_at', 'used_at'),
        Index('idx_question_usage_log_activity_level', 'activity_type', 'level'),
    )
    
    def __repr__(self):
        return f"<QuestionUsageLog(question_id='{self.question_id}', user_id='{self.user_id}')>"

# ========================================
# SESSION MANAGEMENT MODELS
# ========================================

class Templates(Base):
    __tablename__ = 'templates'
    
    id = Column(String(24), primary_key=True)
    school_id = Column(String(24), ForeignKey('schools.id', ondelete='CASCADE'), nullable=False)
    level = Column(SQLAlchemyEnum(LevelEnum), nullable=False)
    template_name = Column(String(200), nullable=False)
    template_data = Column(JSON, nullable=False)
    session_type = Column(SQLAlchemyEnum(SessionTypeEnum), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    school = relationship("School")
    
    # Indexes
    __table_args__ = (
        Index('idx_school_level', 'school_id', 'level'),
        Index('idx_session_type', 'session_type'),
        Index('idx_is_active', 'is_active'),
        Index('idx_templates_composite', 'school_id', 'level', 'session_type', 'is_active'),
    )
    
    def __repr__(self):
        return f"<Templates(id='{self.id}', school_id='{self.school_id}', level='{self.level}')>"

class ExamDetail(Base):
    __tablename__ = 'exam_detail'
    
    id = Column(String(24), primary_key=True)
    user_id = Column(String(24), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    exam_name = Column(String(200), nullable=False)
    language_id = Column(String(24), ForeignKey('languages.id', ondelete='SET NULL'))
    level = Column(String(2), nullable=False)
    template_id = Column(String(100), nullable=False)
    template = Column(JSON, nullable=False)
    status = Column(String(20), default='created')
    session_type = Column(SQLAlchemyEnum(SessionTypeEnum), default=SessionTypeEnum.exam)
    created_at = Column(DateTime, default=func.current_timestamp())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    analyzed_at = Column(DateTime)
    exam_summary = Column(JSON)
    analysis_step = Column(JSON)
    
    # School-initiated session fields
    created_by_school_id = Column(String(24), ForeignKey('schools.id'), nullable=True, 
                                  comment='School ID if session was created by school admin')
    school_metadata = Column(JSON, nullable=True, 
                            comment='Additional metadata for school-created sessions')
    
    # Note: total_questions, current_question, and score are calculated dynamically
    # total_questions = template.reading + template.writing + template.grammar
    # current_question = count of answered questions from exam_log
    # score = calculated from analysis results
    
    # Relationships
    user = relationship("User", back_populates="exam_details")
    exam_logs = relationship("ExamLog", back_populates="exam_detail", cascade="all, delete-orphan")
    school = relationship("School", backref="created_sessions")
    
    # Indexes
    __table_args__ = (
        Index('idx_exam_detail_user_id', 'user_id'),
        Index('idx_exam_detail_language_id', 'language_id'),
        Index('idx_exam_detail_level', 'level'),
        Index('idx_exam_detail_session_type', 'session_type'),
        Index('idx_exam_detail_status', 'status'),
        Index('idx_exam_detail_created_at', 'created_at'),
        Index('idx_exam_detail_composite', 'user_id', 'session_type', 'status'),
        Index('idx_exam_detail_school_created', 'created_by_school_id', 'created_at'),
    )
    
    def __repr__(self):
        return f"<ExamDetail(id='{self.id}', user_id='{self.user_id}', type='{self.session_type}')>"

class ExamLog(Base):
    __tablename__ = 'exam_log'
    
    id = Column(String(24), primary_key=True)
    exam_detail_id = Column(String(24), ForeignKey('exam_detail.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(String(24), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    language_id = Column(String(24))  # Foreign key removed - schema doesn't enforce it
    question_id = Column(String(100), nullable=False)
    activity_type = Column(String(20), nullable=False)
    question_number = Column(Integer, nullable=False)
    question_data = Column(JSON, nullable=False)
    user_answer = Column(Text)
    feedback_data = Column(JSON)
    exam_log_meta = Column(JSON)
    user_audio_url = Column(String(500))
    user_audio_transcript = Column(Text)
    user_audio_meta = Column(JSON)
    session_type = Column(SQLAlchemyEnum(SessionTypeEnum), default=SessionTypeEnum.exam)
    answered_at = Column(DateTime, default=func.current_timestamp())
    
    # Relationships
    user = relationship("User", back_populates="exam_logs")
    exam_detail = relationship("ExamDetail", back_populates="exam_logs")
    
    # Indexes
    __table_args__ = (
        Index('idx_exam_log_user_language', 'user_id', 'language_id'),
        Index('idx_exam_log_activity_type', 'activity_type'),
        Index('idx_exam_log_question_number', 'question_number'),
    )
    
    def __repr__(self):
        return f"<ExamLog(id='{self.id}', exam_id='{self.exam_detail_id}', question='{self.question_number}')>"


class SessionShare(Base):
    """Model for shareable session links"""
    __tablename__ = 'session_shares'
    
    id = Column(String(24), primary_key=True)
    share_code = Column(String(12), unique=True, nullable=False, index=True)
    session_id = Column(String(24), ForeignKey('exam_detail.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(String(24), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    created_at = Column(DateTime, default=func.current_timestamp())
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    
    # Relationships
    session = relationship("ExamDetail")
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('idx_session_shares_share_code', 'share_code'),
        Index('idx_session_shares_session_id', 'session_id'),
        Index('idx_session_shares_user_id', 'user_id'),
        Index('idx_session_shares_active', 'is_active'),
    )
    
    def __repr__(self):
        return f"<SessionShare(id='{self.id}', code='{self.share_code}', session_id='{self.session_id}')>"

# ========================================
# FINANCIAL & USAGE MODELS
# ========================================

class CreditRule(Base):
    __tablename__ = 'credit_rules'
    
    id = Column(String(24), primary_key=True)
    session_type = Column(SQLAlchemyEnum(SessionTypeEnum), nullable=False)
    activity_type = Column(SQLAlchemyEnum(ActivityTypeEnum), nullable=False)
    level = Column(String(3), nullable=False)  # Changed from Enum to support 'ALL' value
    points_cost = Column(Integer, nullable=False)
    
    # LLM Configuration (merged from activity_model_mapping)
    evaluation_method = Column(String(20), nullable=True, default='llm')  # 'deterministic' or 'llm'
    llm_provider = Column(String(50), nullable=True, default='openai')
    llm_model = Column(String(100), nullable=True)
    
    active = Column(Boolean, default=True)
    description = Column(String(200))
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Indexes
    __table_args__ = (
        UniqueConstraint('session_type', 'activity_type', 'level', name='unique_rule'),
        Index('idx_active', 'active'),
        Index('idx_session_activity', 'session_type', 'activity_type'),
        CheckConstraint('points_cost >= 0 AND points_cost <= 100', name='credit_rules_chk_1'),
    )
    
    def __repr__(self):
        return f"<CreditRule(session='{self.session_type}', activity='{self.activity_type}', level='{self.level}')>"

class PricingPack(Base):
    __tablename__ = 'pricing_packs'
    
    id = Column(String(24), primary_key=True)
    pack_name = Column(String(100), nullable=False)
    credits = Column(Integer, nullable=False)
    price_euros = Column(DECIMAL(10, 2), nullable=False)
    price_cents = Column(Integer, nullable=False)
    description = Column(Text)
    features = Column(JSON)
    is_popular = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    stripe_price_id = Column(String(100))
    discount_percentage = Column(Integer, default=0)
    llm_model = Column(String(45), nullable=False)  # LLM model - must be explicitly set
    
    @validates('llm_model')
    def validate_llm_model(self, key, llm_model):
        """Validate LLM model is not empty and is a supported model"""
        if not llm_model or not llm_model.strip():
            raise ValueError("LLM model cannot be empty - must specify a valid OpenAI model")
        
        # List of supported models (can be extended)
        supported_models = [
            'gpt-4o', 'gpt-4o-mini', 'gpt-5-mini', 'gpt-4', 'gpt-4-turbo',
            'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'
        ]
        
        if llm_model.strip() not in supported_models:
            logger.warning(
                "Unsupported LLM model specified",
                model=llm_model,
                supported_models=supported_models,
                action="Model will be used but may cause API errors"
            )
        
        return llm_model.strip()
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    __table_args__ = (
        Index('idx_active', 'is_active'),
        Index('idx_display_order', 'display_order'),
        Index('idx_is_popular', 'is_popular'),
    )
    
    def __repr__(self):
        return f"<PricingPack(name='{self.pack_name}', price='{self.price_euros}', credits='{self.credits}')>"

class PaymentTransaction(Base):
    __tablename__ = 'payment_transactions'
    
    id = Column(String(24), primary_key=True)
    user_id = Column(String(24), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Gateway-Agnostic Data
    gateway_provider = Column(String(50), nullable=False, default='paypal')
    gateway_order_id = Column(String(100), nullable=False)
    gateway_capture_id = Column(String(100))
    gateway_payer_email = Column(String(255))
    gateway_payer_id = Column(String(100))
    
    # Payment Details
    amount_value = Column(DECIMAL(10, 2), nullable=False)
    currency_code = Column(String(3), nullable=False, default='EUR')
    credits_purchased = Column(Integer, nullable=False)
    pricing_pack_id = Column(String(24), ForeignKey('pricing_packs.id', ondelete='SET NULL'))
    
    # Status Tracking
    status = Column(SQLAlchemyEnum(PaymentStatusEnum), nullable=False, default=PaymentStatusEnum.created)
    
    # Audit Trail
    created_at = Column(DateTime, default=func.current_timestamp())
    completed_at = Column(DateTime)
    webhook_received_at = Column(DateTime)
    webhook_payload = Column(JSON)
    
    # Relationships
    user = relationship("User", back_populates="payment_transactions")
    pricing_pack = relationship("PricingPack")
    
    # Indexes and Constraints
    __table_args__ = (
        Index('idx_payment_user_id', 'user_id'),
        Index('idx_payment_status', 'status'),
        Index('idx_payment_gateway_provider', 'gateway_provider'),
        Index('idx_payment_gateway_order_id', 'gateway_order_id'),
        Index('idx_payment_created_at', 'created_at'),
        UniqueConstraint('gateway_provider', 'gateway_order_id', name='unique_gateway_order'),
    )
    
    def __repr__(self):
        return f"<PaymentTransaction(id='{self.id}', user_id='{self.user_id}', status='{self.status}', amount='{self.amount_value}')>"

class UsageLog(Base):
    __tablename__ = 'usage_log'
    
    id = Column(String(24), primary_key=True)
    user_id = Column(String(100), nullable=False)  # Note: varchar(100) in database
    school_id = Column(String(24), ForeignKey('schools.id'), nullable=False)
    session_type = Column(SQLAlchemyEnum(SessionTypeEnum), nullable=False)
    activity_type = Column(SQLAlchemyEnum(ActivityTypeEnum), nullable=False)
    level = Column(String(3), nullable=False)  # Match schema varchar(2)
    language_id = Column(String(24), ForeignKey('languages.id', ondelete='RESTRICT', onupdate='CASCADE'))
    points_deducted = Column(Integer, nullable=False)
    points_remaining = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=func.current_timestamp())
    session_id = Column(String(100))
    exam_id = Column(String(100))
    description = Column(String(500))
    status = Column(SQLAlchemyEnum(UsageStatusEnum), default=UsageStatusEnum.pending)
    llm_analytics = Column(JSON)
    
    # Indexes
    __table_args__ = (
        CheckConstraint('points_deducted >= 0 AND points_deducted <= 100', name='usage_log_chk_1'),
        CheckConstraint('points_remaining >= 0 AND points_remaining <= 10000', name='usage_log_chk_2'),
        Index('idx_usage_log_user_id', 'user_id'),
        Index('idx_usage_log_school_timestamp', 'school_id', 'timestamp'),
        Index('idx_usage_log_timestamp', 'timestamp'),
        Index('idx_usage_log_session_type', 'session_type'),
        Index('idx_usage_log_status', 'status'),
        Index('idx_usage_log_exam_id', 'exam_id'),
        Index('idx_language_id', 'language_id'),
    )

    # Relationships
    school = relationship("School", back_populates="usage_logs")
    language = relationship("Language")

    def __repr__(self):
        return f"<UsageLog(user_id='{self.user_id}', activity='{self.activity_type}', points='{self.points_deducted}')>"

# ========================================
# LOGGING & METADATA MODELS
# ========================================

class LLMLog(Base):
    __tablename__ = 'llm_logs'
    
    id = Column(String(24), primary_key=True)
    user_id = Column(String(24), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    session_id = Column(String(100), index=True)
    exam_id = Column(String(100), index=True)
    activity_type = Column(String(50))
    prompt_type = Column(String(100))
    model_used = Column(String(50))
    request_data = Column(JSON)
    response_data = Column(JSON)
    token_usage = Column(JSON)
    processing_time_ms = Column(Integer)
    status = Column(String(20))
    error_message = Column(Text)
    llm_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, name="llm_metadata")
    created_at = Column(DateTime, default=func.current_timestamp())
    
    # Relationships
    user = relationship("User", back_populates="llm_logs")
    
    # Indexes
    __table_args__ = (
        Index('idx_llm_logs_user_id', 'user_id'),
        Index('idx_llm_logs_created_at', 'created_at'),
        Index('idx_llm_logs_status', 'status'),
        Index('idx_llm_logs_model_used', 'model_used'),
    )
    
    def __repr__(self):
        return f"<LLMLog(id='{self.id}', user_id='{self.user_id}', status='{self.status}')>"


# ========================================
# MESSAGES (CONTACT & FEEDBACK)
# ========================================

class Message(Base):
    """Single table for both contact and feedback messages"""
    __tablename__ = 'messages'
    
    id = Column(String(24), primary_key=True)
    message_type = Column(SQLAlchemyEnum(MessageTypeEnum), nullable=False)
    
    # Contact form fields (required for contact, optional for feedback)
    name = Column(String(100))
    email = Column(String(100))
    subject = Column(String(200))
    
    # Common fields
    message = Column(Text, nullable=False)
    
    # Feedback specific fields
    user_id = Column(String(24), ForeignKey('users.id', ondelete='CASCADE'))
    category = Column(SQLAlchemyEnum(FeedbackCategoryEnum))
    user_context = Column(JSON)
    severity = Column(SQLAlchemyEnum(SeverityEnum), default=SeverityEnum.medium)
    
    # Metadata
    source = Column(String(50), default='website')
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # Admin management
    is_read = Column(Boolean, default=False)
    admin_notes = Column(Text)
    read_at = Column(DateTime)
    read_by = Column(String(24))
    
    # Timestamps
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationship
    user = relationship("User", back_populates="messages")
    
    # Indexes
    __table_args__ = (
        Index('idx_message_type', 'message_type'),
        Index('idx_user_id', 'user_id'),
        Index('idx_email', 'email'),
        Index('idx_category', 'category'),
        Index('idx_severity', 'severity'),
        Index('idx_is_read', 'is_read'),
        Index('idx_created_at', 'created_at'),
        Index('idx_source', 'source'),
    )
    
    def __repr__(self):
        return f"<Message(id='{self.id}', type='{self.message_type}', email='{self.email}')>"


# ========================================
# ACTIVITY MODEL MAPPING (V1: Global, V2: Granular)
# ========================================

# DEPRECATED: ActivityModelMapping merged into CreditRule (Migration 006)
# Keeping commented for reference, will be removed after production verification
#
# class ActivityModelMapping(Base):
#     """
#     Maps activity types to LLM models for session analysis.
#     
#     V1 (Current): Global mappings (language_id=NULL, level=NULL)
#     - reading → gpt-4o-mini (cost effective)
#     - writing → gpt-5-mini (reasoning required)
#     - grammar → gpt-5-mini (pattern analysis)
#     - hearing → gpt-4o-mini (transcript analysis)
#     
#     V2 (Future): Granular overrides
#     - Can add language-specific: German grammar → different model
#     - Can add level-specific: B2 writing → advanced model
#     """
#     __tablename__ = 'activity_model_mapping'
# 
#     id = Column(String(24), primary_key=True)
#     activity_type = Column(SQLAlchemyEnum(ActivityTypeEnum), nullable=False)
#     language_id = Column(String(24), ForeignKey('languages.id', ondelete='SET NULL'), nullable=True)
#     level = Column(String(10), nullable=True)
#     llm_provider = Column(String(45), nullable=False, default='openai')
#     llm_model = Column(String(100), nullable=False)
#     model_config = Column(JSON, nullable=True)
#     is_active = Column(Boolean, default=True)
#     created_at = Column(DateTime, default=func.current_timestamp())
#     updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
#     notes = Column(Text, nullable=True)
#     
#     # Relationship
#     language = relationship("Language", foreign_keys=[language_id])
#     
#     # Indexes
#     __table_args__ = (
#         Index('idx_activity_lookup', 'activity_type', 'is_active'),
#         Index('idx_granular_lookup', 'activity_type', 'language_id', 'level', 'is_active'),
#         UniqueConstraint('activity_type', 'language_id', 'level', name='unique_activity_mapping'),
#     )
#     
#     def __repr__(self):
#         return f"<ActivityModelMapping(activity='{self.activity_type}', model='{self.llm_model}', provider='{self.llm_provider}')>"


