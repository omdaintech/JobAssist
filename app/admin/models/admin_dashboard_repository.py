"""
Admin Dashboard Repository - Analytics Data Layer

Handles all admin dashboard analytics queries with ORM patterns.
Supports both time-based filtering (hours presets) and custom date ranges.

Key Features:
- SQLAlchemy ORM queries (NO raw SQL)
- Context manager pattern for connections
- Support for hours presets (24, 48, 168, 720) AND custom date ranges
- Language filtering
- Comprehensive error handling
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import structlog
from sqlalchemy import func, and_, or_, desc
from sqlalchemy.exc import SQLAlchemyError

# Import shared base service
from app.common.models.mysql_odm_service import BaseMySQLODMService, require_mysql_connection
from app.common.models.mysql_models import (
    ExamDetail,
    ExamLog,
    User,
    Message,
    Language,
)

logger = structlog.get_logger()


class AdminDashboardRepository(BaseMySQLODMService):
    """
    Admin Dashboard Repository - Analytics Data Layer
    
    Handles all admin dashboard analytics queries in complete isolation.
    All methods use SQLAlchemy ORM with proper context managers.
    """

    def _calculate_date_range(
        self, 
        hours: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> tuple[datetime, datetime]:
        """
        Calculate date range from either hours preset or custom dates
        
        Args:
            hours: Preset hours (24, 48, 168, 720) - takes precedence
            start_date: Custom start date (used if hours not provided)
            end_date: Custom end date (used if hours not provided)
            
        Returns:
            Tuple of (start_datetime, end_datetime)
        """
        # If hours provided, calculate from now
        if hours is not None:
            end = datetime.utcnow()
            start = end - timedelta(hours=hours)
            return start, end
        
        # If custom dates provided, use them
        if start_date and end_date:
            return start_date, end_date
        
        # Default to last 7 days if nothing provided
        end = datetime.utcnow()
        start = end - timedelta(hours=168)
        return start, end

    # =================
    # CORE METRICS
    # =================

    @require_mysql_connection
    def get_total_sessions(
        self, 
        hours: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        language_id: Optional[str] = None
    ) -> int:
        """
        Count all completed sessions in time period
        
        Args:
            hours: Preset time period (24, 48, 168, 720)
            start_date: Custom start date (alternative to hours)
            end_date: Custom end date (alternative to hours)
            language_id: Optional language filter
            
        Returns:
            Count of completed sessions
        """
        try:
            with self.mysql_service.get_db() as session:
                start, end = self._calculate_date_range(hours, start_date, end_date)
                
                # Build query with ORM
                query = session.query(func.count(ExamDetail.id)).filter(
                    and_(
                        ExamDetail.status == 'analyzed',
                        ExamDetail.completed_at >= start,
                        ExamDetail.completed_at <= end
                    )
                )
                
                # Add language filter if provided
                if language_id:
                    query = query.filter(ExamDetail.language_id == language_id)
                
                # Execute and return scalar result
                count = query.scalar() or 0
                
                logger.info(
                    "Retrieved total sessions count",
                    count=count,
                    start=start.isoformat(),
                    end=end.isoformat(),
                    language_id=language_id
                )
                
                return count
                
        except SQLAlchemyError as e:
            logger.error(
                "Failed to get total sessions",
                error=str(e),
                hours=hours,
                language_id=language_id
            )
            return 0

    @require_mysql_connection
    def get_analyzed_sessions(
        self, 
        hours: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        language_id: Optional[str] = None
    ) -> int:
        """
        Count sessions with successful analysis
        
        Args:
            hours: Preset time period (24, 48, 168, 720)
            start_date: Custom start date (alternative to hours)
            end_date: Custom end date (alternative to hours)
            language_id: Optional language filter
            
        Returns:
            Count of analyzed sessions
        """
        try:
            with self.mysql_service.get_db() as session:
                start, end = self._calculate_date_range(hours, start_date, end_date)
                
                query = session.query(func.count(ExamDetail.id)).filter(
                    and_(
                        ExamDetail.analyzed_at.isnot(None),
                        ExamDetail.analyzed_at >= start,
                        ExamDetail.analyzed_at <= end
                    )
                )
                
                if language_id:
                    query = query.filter(ExamDetail.language_id == language_id)
                
                count = query.scalar() or 0
                
                logger.info(
                    "Retrieved analyzed sessions count",
                    count=count,
                    start=start.isoformat(),
                    end=end.isoformat(),
                    language_id=language_id
                )
                
                return count
                
        except SQLAlchemyError as e:
            logger.error("Failed to get analyzed sessions", error=str(e))
            return 0

    @require_mysql_connection
    def get_exam_sessions(
        self, 
        hours: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        language_id: Optional[str] = None
    ) -> int:
        """
        Count full exam sessions
        
        Args:
            hours: Preset time period (24, 48, 168, 720)
            start_date: Custom start date (alternative to hours)
            end_date: Custom end date (alternative to hours)
            language_id: Optional language filter
            
        Returns:
            Count of exam sessions
        """
        try:
            with self.mysql_service.get_db() as session:
                start, end = self._calculate_date_range(hours, start_date, end_date)
                
                query = session.query(func.count(ExamDetail.id)).filter(
                    and_(
                        ExamDetail.session_type == 'exam',
                        ExamDetail.completed_at >= start,
                        ExamDetail.completed_at <= end
                    )
                )
                
                if language_id:
                    query = query.filter(ExamDetail.language_id == language_id)
                
                count = query.scalar() or 0
                
                logger.info(
                    "Retrieved exam sessions count",
                    count=count,
                    start=start.isoformat(),
                    end=end.isoformat(),
                    language_id=language_id
                )
                
                return count
                
        except SQLAlchemyError as e:
            logger.error("Failed to get exam sessions", error=str(e))
            return 0

    @require_mysql_connection
    def get_practice_sessions(
        self, 
        hours: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        language_id: Optional[str] = None
    ) -> int:
        """
        Count practice sessions
        
        Args:
            hours: Preset time period (24, 48, 168, 720)
            start_date: Custom start date (alternative to hours)
            end_date: Custom end date (alternative to hours)
            language_id: Optional language filter
            
        Returns:
            Count of practice sessions
        """
        try:
            with self.mysql_service.get_db() as session:
                start, end = self._calculate_date_range(hours, start_date, end_date)
                
                query = session.query(func.count(ExamDetail.id)).filter(
                    and_(
                        ExamDetail.session_type == 'practice',
                        ExamDetail.completed_at >= start,
                        ExamDetail.completed_at <= end
                    )
                )
                
                if language_id:
                    query = query.filter(ExamDetail.language_id == language_id)
                
                count = query.scalar() or 0
                
                logger.info(
                    "Retrieved practice sessions count",
                    count=count,
                    start=start.isoformat(),
                    end=end.isoformat(),
                    language_id=language_id
                )
                
                return count
                
        except SQLAlchemyError as e:
            logger.error("Failed to get practice sessions", error=str(e))
            return 0

    @require_mysql_connection
    def get_new_users_count(
        self, 
        hours: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> int:
        """
        Count new user registrations in time period
        
        Args:
            hours: Preset time period (24, 48, 168, 720)
            start_date: Custom start date (alternative to hours)
            end_date: Custom end date (alternative to hours)
            
        Returns:
            Count of new users
        """
        try:
            with self.mysql_service.get_db() as session:
                start, end = self._calculate_date_range(hours, start_date, end_date)
                
                count = session.query(func.count(User.id)).filter(
                    and_(
                        User.created_at >= start,
                        User.created_at <= end,
                        User.is_active == True
                    )
                ).scalar() or 0
                
                logger.info(
                    "Retrieved new users count",
                    count=count,
                    start=start.isoformat(),
                    end=end.isoformat()
                )
                
                return count
                
        except SQLAlchemyError as e:
            logger.error("Failed to get new users count", error=str(e))
            return 0

    @require_mysql_connection
    def get_top_activity_type(
        self, 
        hours: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        language_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Find most popular activity type with count
        
        Args:
            hours: Preset time period (24, 48, 168, 720)
            start_date: Custom start date (alternative to hours)
            end_date: Custom end date (alternative to hours)
            language_id: Optional language filter
            
        Returns:
            {
                "activity_type": "reading",
                "count": 1234,
                "display_name": "Reading"
            }
        """
        try:
            with self.mysql_service.get_db() as session:
                start, end = self._calculate_date_range(hours, start_date, end_date)
                
                # Query with join and grouping
                query = session.query(
                    ExamLog.activity_type,
                    func.count(ExamLog.id).label('count')
                ).join(
                    ExamDetail, 
                    ExamLog.exam_detail_id == ExamDetail.id
                ).filter(
                    and_(
                        ExamDetail.completed_at >= start,
                        ExamDetail.completed_at <= end
                    )
                )
                
                if language_id:
                    query = query.filter(ExamDetail.language_id == language_id)
                
                result = query.group_by(ExamLog.activity_type).order_by(desc('count')).first()
                
                if result:
                    # Map activity type to display name
                    display_names = {
                        'reading': 'Reading',
                        'writing': 'Writing',
                        'grammar': 'Grammar',
                        'hearing': 'Listening'
                    }
                    
                    activity_data = {
                        "activity_type": result.activity_type,
                        "count": result.count,
                        "display_name": display_names.get(result.activity_type, result.activity_type.title())
                    }
                    
                    logger.info(
                        "Retrieved top activity",
                        activity_type=result.activity_type,
                        count=result.count
                    )
                    
                    return activity_data
                
                return {
                    "activity_type": "none",
                    "count": 0,
                    "display_name": "No Activities"
                }
                
        except SQLAlchemyError as e:
            logger.error("Failed to get top activity", error=str(e))
            return {
                "activity_type": "error",
                "count": 0,
                "display_name": "Error"
            }

    @require_mysql_connection
    def get_new_feedback_count(
        self, 
        hours: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> int:
        """
        Count unread feedback messages
        
        Args:
            hours: Preset time period (24, 48, 168, 720)
            start_date: Custom start date (alternative to hours)
            end_date: Custom end date (alternative to hours)
            
        Returns:
            Count of unread feedback messages
        """
        try:
            with self.mysql_service.get_db() as session:
                start, end = self._calculate_date_range(hours, start_date, end_date)
                
                count = session.query(func.count(Message.id)).filter(
                    and_(
                        Message.message_type == 'feedback',
                        Message.is_read == False,
                        Message.created_at >= start,
                        Message.created_at <= end
                    )
                ).scalar() or 0
                
                logger.info(
                    "Retrieved new feedback count",
                    count=count,
                    start=start.isoformat(),
                    end=end.isoformat()
                )
                
                return count
                
        except SQLAlchemyError as e:
            logger.error("Failed to get new feedback count", error=str(e))
            return 0

    @require_mysql_connection
    def get_new_contact_count(
        self, 
        hours: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> int:
        """
        Count unread contact messages
        
        Args:
            hours: Preset time period (24, 48, 168, 720)
            start_date: Custom start date (alternative to hours)
            end_date: Custom end date (alternative to hours)
            
        Returns:
            Count of unread contact messages
        """
        try:
            with self.mysql_service.get_db() as session:
                start, end = self._calculate_date_range(hours, start_date, end_date)
                
                count = session.query(func.count(Message.id)).filter(
                    and_(
                        Message.message_type == 'contact',
                        Message.is_read == False,
                        Message.created_at >= start,
                        Message.created_at <= end
                    )
                ).scalar() or 0
                
                logger.info(
                    "Retrieved new contact count",
                    count=count,
                    start=start.isoformat(),
                    end=end.isoformat()
                )
                
                return count
                
        except SQLAlchemyError as e:
            logger.error("Failed to get new contact count", error=str(e))
            return 0

    # =================
    # ORCHESTRATION
    # =================

    def get_dashboard_stats(
        self, 
        hours: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        language_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get all dashboard metrics in one call
        Orchestrates all 8 metric methods
        
        Args:
            hours: Preset time period (24, 48, 168, 720)
            start_date: Custom start date (alternative to hours)
            end_date: Custom end date (alternative to hours)
            language_id: Optional language filter
            
        Returns:
            {
                "total_sessions": 1234,
                "analyzed_sessions": 1200,
                "total_exams": 456,
                "total_practice": 778,
                "new_users": 89,
                "top_activity": {
                    "activity_type": "reading",
                    "count": 567,
                    "display_name": "Reading"
                },
                "new_feedback": 12,
                "new_contact": 8,
                "start_date": "2025-11-07T10:30:00Z",
                "end_date": "2025-11-14T10:30:00Z",
                "language_filter": "German",
                "generated_at": "2025-11-14T10:30:00Z"
            }
        """
        try:
            # Calculate date range for metadata
            start, end = self._calculate_date_range(hours, start_date, end_date)
            
            # Get language name if filter applied
            language_name = None
            if language_id:
                language_name = self._get_language_name(language_id)
            
            # Fetch all metrics
            stats = {
                "total_sessions": self.get_total_sessions(
                    hours, start_date, end_date, language_id
                ),
                "analyzed_sessions": self.get_analyzed_sessions(
                    hours, start_date, end_date, language_id
                ),
                "total_exams": self.get_exam_sessions(
                    hours, start_date, end_date, language_id
                ),
                "total_practice": self.get_practice_sessions(
                    hours, start_date, end_date, language_id
                ),
                "new_users": self.get_new_users_count(
                    hours, start_date, end_date
                ),
                "top_activity": self.get_top_activity_type(
                    hours, start_date, end_date, language_id
                ),
                "new_feedback": self.get_new_feedback_count(
                    hours, start_date, end_date
                ),
                "new_contact": self.get_new_contact_count(
                    hours, start_date, end_date
                ),
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "language_filter": language_name,
                "generated_at": datetime.utcnow().isoformat()
            }
            
            logger.info(
                "Generated complete dashboard stats",
                total_sessions=stats["total_sessions"],
                start=start.isoformat(),
                end=end.isoformat()
            )
            
            return stats
            
        except Exception as e:
            logger.error("Failed to get dashboard stats", error=str(e))
            # Return empty stats on error
            return {
                "total_sessions": 0,
                "analyzed_sessions": 0,
                "total_exams": 0,
                "total_practice": 0,
                "new_users": 0,
                "top_activity": {
                    "activity_type": "none",
                    "count": 0,
                    "display_name": "No Activities"
                },
                "new_feedback": 0,
                "new_contact": 0,
                "start_date": datetime.utcnow().isoformat(),
                "end_date": datetime.utcnow().isoformat(),
                "language_filter": None,
                "generated_at": datetime.utcnow().isoformat()
            }

    # =================
    # LANGUAGE HELPERS
    # =================

    @require_mysql_connection
    def get_all_languages(self) -> list[Dict[str, Any]]:
        """
        Get all active languages for filter dropdown
        
        Returns:
            [
                {"id": "lang_123", "name": "German", "code": "de"},
                {"id": "lang_456", "name": "French", "code": "fr"}
            ]
        """
        try:
            with self.mysql_service.get_db() as session:
                languages = session.query(Language).filter(
                    Language.is_active == True
                ).order_by(Language.display_order).all()
                
                result = [
                    {
                        "id": lang.id,
                        "name": lang.name,
                        "code": lang.code
                    }
                    for lang in languages
                ]
                
                logger.info("Retrieved all languages", count=len(result))
                
                return result
                
        except SQLAlchemyError as e:
            logger.error("Failed to get languages", error=str(e))
            return []

    @require_mysql_connection
    def _get_language_name(self, language_id: str) -> Optional[str]:
        """Helper to get language name by ID"""
        try:
            with self.mysql_service.get_db() as session:
                language = session.query(Language).filter(
                    Language.id == language_id
                ).first()
                
                return language.name if language else None
                
        except SQLAlchemyError as e:
            logger.error("Failed to get language name", error=str(e))
            return None
