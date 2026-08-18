"""
MySQL ODM Service - Base MySQL Database Operations
Provides MySQL/SQLAlchemy database operations for the application
Version: 1.1.0
"""

import functools
import uuid
from typing import Any, Dict, List, Optional, Type, TypeVar
from functools import lru_cache
from datetime import datetime
import structlog
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

# Import MySQL models and service
from app.common.models.mysql_models import (
    Base, User, AdminUser, UserAccess, Language, QuestionBank, 
    ExamDetail, ExamLog, CreditRule, PricingPack, UsageLog, 
    LLMLog, QuestionUsageLog, School, SessionShare, PaymentTransaction,
    PaymentStatusEnum
)
from app.common.services.mysql_service import MySQLService, MySQLOperations, MySQLOperationError

logger = structlog.get_logger()

# Type variable for generic service classes
T = TypeVar('T', bound='BaseMySQLODMService')

def require_mysql_connection(func):
    """
    Decorator to ensure MySQL connection is available before executing operations
    """
    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        if not self.mysql_service._initialized:
            self.mysql_service.initialize()
        
        try:
            return func(self, *args, **kwargs)
        except SQLAlchemyError as e:
            logger.error(f"MySQL operation failed in {func.__name__}", error=str(e))
            raise MySQLOperationError(f"Database operation failed: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}", error=str(e))
            raise
    
    return wrapper

class BaseMySQLODMService:
    """
    Base MySQL ODM Service
    Provides infrastructure and shared utilities for MySQL database operations
    """
    
    def __init__(self):
        """Initialize MySQL service and operations"""
        self.mysql_service = MySQLService()
        self.mysql_service.initialize()
        
        # Initialize operations for all models
        self.user_ops = MySQLOperations(User, self.mysql_service)
        self.admin_user_ops = MySQLOperations(AdminUser, self.mysql_service)
        self.user_access_ops = MySQLOperations(UserAccess, self.mysql_service)
        self.language_ops = MySQLOperations(Language, self.mysql_service)
        self.question_bank_ops = MySQLOperations(QuestionBank, self.mysql_service)
        self.exam_detail_ops = MySQLOperations(ExamDetail, self.mysql_service)
        self.exam_log_ops = MySQLOperations(ExamLog, self.mysql_service)
        self.session_share_ops = MySQLOperations(SessionShare, self.mysql_service)
        self.credit_rule_ops = MySQLOperations(CreditRule, self.mysql_service)
        self.pricing_pack_ops = MySQLOperations(PricingPack, self.mysql_service)
        self.payment_transaction_ops = MySQLOperations(PaymentTransaction, self.mysql_service)
        self.usage_log_ops = MySQLOperations(UsageLog, self.mysql_service)
        self.llm_log_ops = MySQLOperations(LLMLog, self.mysql_service)
        self.question_usage_log_ops = MySQLOperations(QuestionUsageLog, self.mysql_service)
        self.school_ops = MySQLOperations(School, self.mysql_service)
        
        logger.info("Base MySQL ODM Service initialized successfully")
    
    def health_check(self) -> Dict[str, Any]:
        """Check MySQL database health and connectivity"""
        try:
            with self.mysql_service.get_db() as session:
                result = session.execute(text("SELECT 1 as health_check")).scalar()
                
                if result == 1:
                    return {
                        "status": "healthy",
                        "database": "mysql",
                        "connection": "operational",
                        "timestamp": datetime.utcnow().isoformat(),
                        "tables": self._count_tables(session)
                    }
                else:
                    return {
                        "status": "unhealthy",
                        "database": "mysql",
                        "connection": "failed",
                        "error": "Health check query failed",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
        except Exception as e:
            logger.error("MySQL health check failed", error=str(e))
            return {
                "status": "unhealthy",
                "database": "mysql",
                "connection": "failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _count_tables(self, session: Session) -> Dict[str, int]:
        """Count records in all tables for health check"""
        try:
            table_counts = {}
            tables = [
                ('users', User),
                ('admin_users', AdminUser),
                ('user_access', UserAccess),
                ('languages', Language),
                ('question_bank', QuestionBank),
                ('exam_detail', ExamDetail),
                ('exam_log', ExamLog),
                ('credit_rules', CreditRule),
                ('pricing_packs', PricingPack),
                ('usage_log', UsageLog),
                ('llm_logs', LLMLog),
                ('question_usage_log', QuestionUsageLog)
            ]
            
            for table_name, model_class in tables:
                count = session.query(func.count(model_class.id)).scalar()
                table_counts[table_name] = count
                
            return table_counts
        except Exception as e:
            logger.warning("Could not count table records", error=str(e))
            return {}
    
    @require_mysql_connection
    def log_question_usage_odm(self, question_id: str, user_id: str, 
                              activity_type: str, level: str, session_type: str) -> bool:
        """Log question usage to question_usage_log table"""
        try:
            self.question_usage_log_ops.create(
                question_id=question_id,
                user_id=user_id,
                activity_type=activity_type,
                level=level,
                session_type=session_type,
                used_at=datetime.utcnow()
            )
            
            logger.info(
                "Question usage logged successfully via MySQL",
                question_id=question_id,
                user_id=user_id,
                activity_type=activity_type,
                level=level,
                session_type=session_type
            )
            return True
            
        except Exception as e:
            logger.error(
                "Failed to log question usage via MySQL",
                question_id=question_id,
                user_id=user_id,
                activity_type=activity_type,
                level=level,
                session_type=session_type,
                error=str(e)
            )
            return False
    
    @require_mysql_connection
    def log_llm_request_odm(self, user_id: Optional[str] = None, 
                           session_id: Optional[str] = None,
                           exam_id: Optional[str] = None,
                           activity_type: Optional[str] = None,
                           prompt_type: Optional[str] = None,
                           model_used: Optional[str] = None,
                           request_data: Optional[Dict] = None,
                           response_data: Optional[Dict] = None,
                           token_usage: Optional[Dict] = None,
                           processing_time_ms: Optional[int] = None,
                           status: Optional[str] = None,
                           error_message: Optional[str] = None,
                           metadata: Optional[Dict] = None) -> bool:
        """Log LLM request to llm_logs table"""
        try:
            self.llm_log_ops.create(
                user_id=user_id,
                session_id=session_id,
                exam_id=exam_id,
                activity_type=activity_type,
                prompt_type=prompt_type,
                model_used=model_used,
                request_data=request_data,
                response_data=response_data,
                token_usage=token_usage,
                processing_time_ms=processing_time_ms,
                status=status,
                error_message=error_message,
                metadata=metadata,
                created_at=datetime.utcnow()
            )
            
            logger.info(
                "LLM request logged successfully via MySQL",
                user_id=user_id,
                session_id=session_id,
                model_used=model_used,
                status=status
            )
            return True
            
        except Exception as e:
            logger.error(
                "Failed to log LLM request via MySQL",
                user_id=user_id,
                session_id=session_id,
                model_used=model_used,
                error=str(e)
            )
            return False
    
    def check_transaction_availability(self) -> Dict[str, Any]:
        """Check if MySQL transactions are available"""
        try:
            with self.mysql_service.get_db() as session:
                # Test transaction capability
                session.execute(text("SELECT 1"))
                # If we get here, transactions are working
                
            return {
                "status": "transaction_ready",
                "message": "MySQL transactions available",
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.warning("MySQL transactions not available", error=str(e))
            return {
                "status": "transaction_unavailable", 
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
    
    def close_connections(self):
        """Close all database connections"""
        try:
            if hasattr(self.mysql_service, '_engine') and self.mysql_service._engine:
                self.mysql_service._engine.dispose()
            if hasattr(self.mysql_service, '_async_engine') and self.mysql_service._async_engine:
                self.mysql_service._async_engine.sync_engine.dispose()
            logger.info("MySQL database connections closed successfully")
        except Exception as e:
            logger.error("Error closing MySQL database connections", error=str(e))
    
    def generate_id(self) -> str:
        """Generate a unique ID for new records (24-character hex string)"""
        from app.common.models.id_generator import generate_id
        return generate_id()

class MySQLUserODMService(BaseMySQLODMService):
    """
    MySQL User ODM Service
    Handles all user-specific database operations using MySQL
    """
    
    @require_mysql_connection
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.user_ops.get_by_field('email', email.lower())

    @require_mysql_connection
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.user_ops.get_by_id(user_id)

    @require_mysql_connection
    def create_user(self, user_data: Dict[str, Any]) -> User:
        """Create a new user"""
        if 'id' not in user_data:
            user_data['id'] = self.generate_id()
        return self.user_ops.create(**user_data)

    @require_mysql_connection
    def update_user(self, user_id: str, update_data: Dict[str, Any]) -> Optional[User]:
        """Update user details"""
        return self.user_ops.update(user_id, **update_data)

    @require_mysql_connection
    def get_user_access(self, user_id: str) -> Optional[UserAccess]:
        """Get user access details"""
        return self.user_access_ops.get_by_field('user_id', user_id)

    @require_mysql_connection
    def create_user_access(self, access_data: Dict[str, Any]) -> UserAccess:
        """Create user access record"""
        if 'id' not in access_data:
            access_data['id'] = self.generate_id()
        return self.user_access_ops.create(**access_data)

    @require_mysql_connection
    def update_user_access(self, user_access_id: str, update_data: Dict[str, Any]) -> Optional[UserAccess]:
        """Update user access details"""
        return self.user_access_ops.update(user_access_id, **update_data)

    @require_mysql_connection
    def get_active_languages(self) -> List[Language]:
        """Get all active languages"""
        return self.language_ops.filter(is_active=True)

    @require_mysql_connection
    def get_questions_for_session(self, language_id: str, level: str, activity_type: str, limit: int) -> List[QuestionBank]:
        """Get questions for a practice session"""
        filters = {
            'language_id': language_id,
            'level': level,
            'activity_type': activity_type,
            'is_active': True
        }
        return self.question_bank_ops.filter(limit=limit, **filters)

    @require_mysql_connection
    def create_exam_detail(self, exam_data: Dict[str, Any]) -> ExamDetail:
        """Create a new exam detail record"""
        if 'exam_id' not in exam_data:
            exam_data['exam_id'] = self.generate_id()
        return self.exam_detail_ops.create(**exam_data)

    @require_mysql_connection
    def get_exam_detail(self, exam_id: str) -> Optional[ExamDetail]:
        """Get exam detail by ID"""
        return self.exam_detail_ops.get_by_id(exam_id)

    @require_mysql_connection
    def update_exam_detail(self, exam_id: str, update_data: Dict[str, Any]) -> Optional[ExamDetail]:
        """Update exam detail"""
        return self.exam_detail_ops.update(exam_id, **update_data)

    @require_mysql_connection
    def create_exam_log(self, log_data: Dict[str, Any]) -> ExamLog:
        """Create a new exam log record"""
        if 'id' not in log_data:
            log_data['id'] = self.generate_id()
        return self.exam_log_ops.create(**log_data)

    @require_mysql_connection
    def get_credit_rule(self, session_type: str, activity_type: str, level: str) -> Optional[CreditRule]:
        """
        Get credit rule for a session (exact match only - no fallback).
        
        All activity types must have specific rules in the database.
        This ensures database-driven configuration without hardcoded logic.
        
        Args:
            session_type: 'practice' or 'exam'
            activity_type: 'reading', 'writing', 'grammar', 'hearing'
            level: 'A1', 'A2', 'B1', 'B2'
        
        Returns:
            CreditRule object or None if not found
        
        Example: 
            get_credit_rule('practice', 'writing', 'A1')
            -> Returns specific practice/writing/A1 rule (no fallback)
        """
        filters = {
            'session_type': session_type,
            'activity_type': activity_type,
            'level': level,
            'active': True
        }
        rules = self.credit_rule_ops.filter(**filters)
        return rules[0] if rules else None

    @require_mysql_connection
    def get_pricing_packs(self) -> List[PricingPack]:
        """Get all active pricing packs"""
        return self.pricing_pack_ops.filter(is_active=True, order_by='display_order')

    @require_mysql_connection
    def create_usage_log(self, log_data: Dict[str, Any]) -> UsageLog:
        """Create a new usage log"""
        if 'id' not in log_data:
            log_data['id'] = self.generate_id()

        if 'school_id' not in log_data or not log_data.get('school_id'):
            user_id = log_data.get('user_id')
            if not user_id:
                raise ValueError("Usage log creation requires user_id to resolve school")

            user = self.user_ops.get_by_id(user_id)
            if not user or not getattr(user, 'school_id', None):
                raise ValueError("Cannot determine school_id for usage log")

            log_data['school_id'] = user.school_id
        return self.usage_log_ops.create(**log_data)

    @require_mysql_connection
    def create_llm_log(self, log_data: Dict[str, Any]) -> LLMLog:
        """Create a new LLM log"""
        if 'id' not in log_data:
            log_data['id'] = self.generate_id()
        return self.llm_log_ops.create(**log_data)

    @require_mysql_connection
    def create_question_usage_log(self, log_data: Dict[str, Any]) -> QuestionUsageLog:
        """Create a new question usage log"""
        if 'id' not in log_data:
            log_data['id'] = self.generate_id()
        return self.question_usage_log_ops.create(**log_data)

    @require_mysql_connection
    def get_user_by_reset_token(self, token: str) -> Optional[User]:
        """Get user by password reset token"""
        return self.user_ops.get_by_field('password_reset_token', token)

    @require_mysql_connection
    def get_user_by_verification_token(self, token: str) -> Optional[User]:
        """Get user by email verification token"""
        return self.user_ops.get_by_field('email_verification_token', token)

# Factory functions for dependency injection
@lru_cache(maxsize=None)
def get_mysql_user_odm_service() -> MySQLUserODMService:
    """
    Provides a singleton instance of the MySQLUserODMService.
    """
    logger.info("Creating singleton MySQLUserODMService instance")
    return MySQLUserODMService()

# Factory function for dependency injection  
def get_mysql_base_odm_service(service_class: type[T]) -> T:
    """
    Provides a singleton instance of a given MySQL ODM service class.
    """
    # Use lru_cache on a nested function to cache instances per service_class
    @lru_cache(maxsize=None)
    def _get_cached_service(cls):
        logger.info(f"Creating singleton instance for {cls.__name__}")
        return cls()

    return _get_cached_service(service_class)
