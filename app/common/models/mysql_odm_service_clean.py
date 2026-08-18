"""
MySQL ODM Service - Base MySQL Database Operations (CLEANED)
Provides MySQL/SQLAlchemy database operations for the application
Version: 2.0.0 - Domain-separated version

This is the CLEAN version with user business logic removed.
Only infrastructure and shared utilities remain.
"""

from typing import Optional, List, Dict, Any, TypeVar
from datetime import datetime
import structlog
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import func, text
import uuid
import functools

# Import MySQL models and service
from app.common.models.mysql_models import (
    Base, User, AdminUser, UserAccess, Language, QuestionBank, 
    ExamDetail, ExamLog, CreditRule, PricingPack, UsageLog, 
    LLMLog, QuestionUsageLog, School
)
from app.common.services.mysql_service import MySQLService, MySQLOperations, MySQLOperationError

logger = structlog.get_logger()

# Type variable for generic model operations
ModelType = TypeVar('ModelType', bound=Base)

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

def require_mysql_connection_async(func):
    """
    Decorator to ensure MySQL connection is available before executing async operations
    """
    @functools.wraps(func)
    async def wrapper(self, *args, **kwargs):
        if not self.mysql_service._initialized:
            self.mysql_service.initialize()
        
        try:
            return await func(self, *args, **kwargs)
        except SQLAlchemyError as e:
            logger.error(f"MySQL async operation failed in {func.__name__}", error=str(e))
            raise MySQLOperationError(f"Database operation failed: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in async {func.__name__}", error=str(e))
            raise
    
    return wrapper


class BaseMySQLODMService:
    """
    Base MySQL ODM Service
    Provides infrastructure and shared utilities for MySQL database operations
    NO USER BUSINESS LOGIC - Only infrastructure!
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
        self.credit_rule_ops = MySQLOperations(CreditRule, self.mysql_service)
        self.pricing_pack_ops = MySQLOperations(PricingPack, self.mysql_service)
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
        tables = [
            ("users", User),
            ("admin_users", AdminUser),
            ("user_access", UserAccess),
            ("languages", Language),
            ("question_bank", QuestionBank),
            ("exam_details", ExamDetail),
            ("exam_logs", ExamLog),
            ("credit_rules", CreditRule),
            ("pricing_packs", PricingPack),
            ("usage_logs", UsageLog),
            ("llm_logs", LLMLog),
            ("question_usage_logs", QuestionUsageLog),
            ("schools", School)
        ]
        
        counts = {}
        for table_name, model_class in tables:
            try:
                count = session.query(func.count(model_class.id)).scalar()
                counts[table_name] = count
            except Exception as e:
                logger.warning(f"Failed to count {table_name}", error=str(e))
                counts[table_name] = "error"
        
        return counts
    
    @require_mysql_connection
    def log_question_usage_odm(self, question_id: str, user_id: str, 
                               session_id: str, activity_type: str = "practice",
                               is_correct: Optional[bool] = None) -> bool:
        """Log question usage for analytics"""
        try:
            usage_data = {
                'question_id': question_id,
                'user_id': user_id,
                'session_id': session_id,
                'activity_type': activity_type,
                'is_correct': is_correct,
                'used_at': datetime.utcnow()
            }
            
            self.question_usage_log_ops.create(**usage_data)
            logger.info("Question usage logged", question_id=question_id, user_id=user_id)
            return True
            
        except Exception as e:
            logger.error("Failed to log question usage", question_id=question_id, error=str(e))
            return False
    
    @require_mysql_connection  
    def log_llm_request_odm(self, 
                           model_name: str,  # NO DEFAULT - must be provided from database
                           user_id: Optional[str] = None, 
                           session_id: Optional[str] = None,
                           prompt_type: str = "general",
                           input_tokens: int = 0,
                           output_tokens: int = 0,
                           cost: float = 0.0,
                           response_time_ms: int = 0,
                           success: bool = True,
                           error_message: Optional[str] = None) -> bool:
        """Log LLM request for analytics and cost tracking"""
        try:
            llm_data = {
                'user_id': user_id,
                'session_id': session_id,
                'prompt_type': prompt_type,
                'model_name': model_name,
                'input_tokens': input_tokens,
                'output_tokens': output_tokens,
                'total_tokens': input_tokens + output_tokens,
                'cost': cost,
                'response_time_ms': response_time_ms,
                'success': success,
                'error_message': error_message,
                'created_at': datetime.utcnow()
            }
            
            self.llm_log_ops.create(**llm_data)
            logger.info("LLM request logged", user_id=user_id, model=model_name, tokens=input_tokens + output_tokens)
            return True
            
        except Exception as e:
            logger.error("Failed to log LLM request", error=str(e))
            return False
    
    def check_transaction_availability(self) -> Dict[str, Any]:
        """Check if database transactions are working properly"""
        try:
            with self.mysql_service.get_db() as session:
                # Test transaction rollback
                session.begin()
                test_result = session.execute(text("SELECT 1")).scalar()
                session.rollback()
                
                return {
                    "transactions_available": True,
                    "test_result": test_result,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error("Transaction test failed", error=str(e))
            return {
                "transactions_available": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def close_connections(self):
        """Close all database connections"""
        try:
            if hasattr(self.mysql_service, '_engine') and self.mysql_service._engine:
                self.mysql_service._engine.dispose()
            if hasattr(self.mysql_service, '_async_engine') and self.mysql_service._async_engine:
                self.mysql_service._async_engine.sync_engine.dispose()
            logger.info("Database connections closed successfully")
        except Exception as e:
            logger.error("Failed to close database connections", error=str(e))
    
    def generate_id(self) -> str:
        """Generate a unique ID for records"""
        return str(uuid.uuid4())


def get_mysql_base_odm_service() -> BaseMySQLODMService:
    """Get BaseMySQLODMService instance"""
    return BaseMySQLODMService()
