"""
Core Repository - USER DOMAIN NON-USER-SPECIFIC OPERATIONS
Handles exams, sessions, progress, credits, usage, limits, languages, questions
Replaces the broken UserODMService non-user-specific methods
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import structlog
import uuid
from sqlalchemy import func

# Import shared base service
from app.common.models.mysql_odm_service import BaseMySQLODMService
from app.config import settings
from app.common.models.mysql_models import (
    QuestionBank,
    Language, 
    ExamDetail,
    ExamLog,
    UsageLog,
    CreditRule,
    UsageStatusEnum,
    PricingPack,
    UserAccess,
    User,
    ActivityTypeEnum,
    SessionTypeEnum,
)

logger = structlog.get_logger()


class CoreRepository(BaseMySQLODMService):
    """
    Core Repository - User Domain
    Handles all non-user-specific database operations: exams, sessions, credits, languages
    """

    # =================
    # LANGUAGE OPERATIONS
    # =================

    def get_language_by_id(self, language_id: str) -> Optional[Dict[str, Any]]:
        """Get language by ID with complete details - returns dict to avoid session issues"""
        try:
            with self.mysql_service.get_db() as session:
                language = session.query(Language).filter(Language.id == language_id).first()
                if language:
                    # Extract all data while session is active to avoid detached instance issues
                    return {
                        "id": str(language.id),
                        "language_id": str(language.id),  # Alias for compatibility
                        "name": language.name,
                        "language_name": language.name,  # Alias for compatibility
                        "native_name": language.native_name,
                        "code": language.code,
                        "flag_emoji": language.flag_emoji,
                        "is_active": bool(language.is_active),
                        "supported_levels": language.supported_levels if language.supported_levels else [],
                        "display_order": language.display_order
                    }
                return None
        except Exception as e:
            logger.error("Failed to get language by ID", language_id=language_id, error=str(e))
            return None

    def get_available_languages(
        self,
        for_testing: bool = False,
        for_practice: bool = False
    ) -> List[Dict[str, Any]]:
        """Get all available languages with complete details from DB"""
        try:
            with self.mysql_service.get_db() as session:
                languages = session.query(Language).filter(
                    Language.is_active.is_(True)
                ).order_by(Language.display_order, Language.name).all()

                return [
                    {
                        "language_id": str(lang.id),
                        "language_name": lang.name,
                        "native_name": lang.native_name,
                        "code": lang.code,
                        "flag_emoji": lang.flag_emoji,
                        "is_active": lang.is_active,
                        "supported_levels": (
                            lang.supported_levels
                            if lang.supported_levels else []
                        ),
                        "display_order": lang.display_order
                    }
                    for lang in languages
                ]
        except Exception as e:
            logger.error("Failed to get available languages",
                         error=str(e))
            return []

    # =================
    # CREDIT & USAGE OPERATIONS
    # =================

    def get_credit_rules(self, level: Optional[str] = None) -> Optional[List[Dict]]:
        """Get credit rules for a specific level or all levels"""
        try:
            with self.mysql_service.get_db() as session:
                query = session.query(CreditRule)
                
                if level:
                    query = query.filter(CreditRule.level == level)
                
                rules = query.all()
                
                return [
                    {
                        "id": rule.id,
                        "session_type": rule.session_type,
                        "activity_type": rule.activity_type,
                        "level": rule.level,
                        "points_cost": rule.points_cost,
                        "description": rule.description,
                        "active": rule.active
                    }
                    for rule in rules
                ]
        except Exception as e:
            logger.error("Failed to get credit rules", level=level, error=str(e))
            return None

    def get_credit_rule(
        self, session_type: str | SessionTypeEnum, activity_type: str | ActivityTypeEnum, level: str
    ) -> Optional[CreditRule]:
        """Fetch a single credit rule for the exact session/activity/level combination."""
        try:
            with self.mysql_service.get_db() as session:
                # Normalize enum inputs to their enum instances
                def _normalize_enum(value, enum_cls):
                    if isinstance(value, enum_cls):
                        return value
                    if isinstance(value, str):
                        candidate = value.split(".")[-1]
                        return enum_cls(candidate)
                    raise ValueError(f"Unsupported enum value: {value}")

                session_type_enum = _normalize_enum(session_type, SessionTypeEnum)
                activity_type_enum = _normalize_enum(activity_type, ActivityTypeEnum)

                level_value = str(level)

                rule = (
                    session.query(CreditRule)
                    .filter(
                        CreditRule.session_type == session_type_enum,
                        CreditRule.activity_type == activity_type_enum,
                        CreditRule.level == level_value,
                        CreditRule.active.is_(True),
                    )
                    .first()
                )

                if not rule:
                    logger.error(
                        "CREDIT_RULE_NOT_FOUND",
                        session_type=session_type_enum.value,
                        activity_type=activity_type_enum.value,
                        level=level_value,
                        action_required="Add credit rule for this combination",
                    )
                    return None

                return {
                    "id": rule.id,
                    "session_type": rule.session_type.value,
                    "activity_type": rule.activity_type.value,
                    "level": rule.level,
                    "points_cost": rule.points_cost,
                    "active": rule.active,
                    "description": rule.description,
                }
        except ValueError as value_error:
            logger.error(
                "INVALID_CREDIT_RULE_FILTER",
                session_type=str(session_type),
                activity_type=str(activity_type),
                level=level,
                error=str(value_error),
            )
            return None
        except Exception as e:
            logger.error(
                "FAILED_TO_FETCH_CREDIT_RULE",
                session_type=str(session_type),
                activity_type=str(activity_type),
                level=level,
                error=str(e),
            )
            return None

    def get_user_usage_history(
        self, 
        user_id: str, 
        limit: int = 50, 
        session_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get user usage history"""
        try:
            with self.mysql_service.get_db() as session:
                query = session.query(UsageLog).filter(UsageLog.user_id == user_id)
                
                if session_type:
                    query = query.filter(UsageLog.session_type == session_type)
                
                usage_logs = query.order_by(UsageLog.timestamp.desc()).limit(limit).all()
                
                return [
                    {
                        "id": log.id,
                        "session_type": log.session_type,
                        "activity_type": log.activity_type,
                        "points_used": log.points_deducted,
                        "session_id": log.session_id,
                        "status": log.status,
                        "created_at": log.timestamp.isoformat() if log.timestamp else None,
                        "completed_at": None  # completed_at field doesn't exist in usage_log schema
                    }
                    for log in usage_logs
                ]
        except Exception as e:
            logger.error("Failed to get user usage history", user_id=user_id, error=str(e))
            return []

    def get_usage_statistics(self, user_id: str) -> Optional[Dict]:
        """Get usage statistics for user"""
        try:
            with self.mysql_service.get_db() as session:
                # Get usage logs for the user
                usage_logs = session.query(UsageLog).filter(
                    UsageLog.user_id == user_id,
                    UsageLog.status == 'completed'
                ).all()
                
                # Calculate statistics
                total_sessions = len(usage_logs)
                total_points_used = sum(log.points_deducted for log in usage_logs if log.points_deducted)
                
                # Group by session type
                session_types = {}
                for log in usage_logs:
                    session_type = log.session_type
                    if session_type not in session_types:
                        session_types[session_type] = {"count": 0, "points": 0}
                    session_types[session_type]["count"] += 1
                    session_types[session_type]["points"] += log.points_deducted or 0
                
                return {
                    "total_sessions": total_sessions,
                    "total_points_used": total_points_used,
                    "session_breakdown": session_types,
                    "last_activity": usage_logs[0].timestamp.isoformat() if usage_logs else None
                }
        except Exception as e:
            logger.error("Failed to get usage statistics", user_id=user_id, error=str(e))
            return None

    def create_usage_log_intent(
        self,
        user_id: str,
        session_type: str, 
        activity_type: str,
        level: str,
        points_needed: int,
        session_id: Optional[str] = None,
        language_id: Optional[str] = None
    ) -> dict:
        """Create usage log with intent (reserved credits)"""
        try:
            # Get user's current credit situation
            user_access = self.get_user_access_limits(user_id)
            if not user_access:
                return {"success": False, "message": "User access not found"}
            
            available_credits = user_access["remaining_count"]
            points_remaining = available_credits - points_needed
            
            # Generate ID beforehand to avoid session binding issues
            usage_log_id = str(uuid.uuid4().hex[:24])

            # Determine user's school for billing attribution
            with self.mysql_service.get_db() as session:
                user_record = session.query(User).filter(User.id == user_id).first()
                school_id = getattr(user_record, 'school_id', None) if user_record else None

            if not school_id:
                logger.error(
                    "Failed to resolve school for usage log intent",
                    user_id=user_id,
                    usage_log_id=usage_log_id,
                )
                return {"success": False, "message": "User is not associated with a school"}

            usage_data = {
                'id': usage_log_id,
                'user_id': user_id,
                'school_id': school_id,
                'session_type': session_type,
                'activity_type': activity_type,
                'level': level,
                'language_id': language_id,
                'points_deducted': points_needed,
                'points_remaining': points_remaining,
                'session_id': session_id or str(uuid.uuid4()),
                'status': 'pending'
            }
            
            usage_log = self.usage_log_ops.create(**usage_data)
            
            logger.info("Usage log intent created", usage_log_id=usage_log_id, user_id=user_id)
            return {
                "success": True,
                "usage_log_id": usage_log_id,
                "session_id": session_id or usage_data['session_id']
            }
        except Exception as e:
            logger.error("Failed to create usage log intent", user_id=user_id, error=str(e))
            return {"success": False, "message": "Failed to create usage log"}

    def reserve_user_credits(
        self,
        user_id: str,
        points_needed: int,
        reservation_id: Optional[str] = None
    ) -> dict:
        """
        Phase 1: Reserve credits (2-phase commit)
        Credits moved to 'reserved' state, NOT deducted yet.
        
        FIXED: Now uses reserved_credits field instead of immediately incrementing used_count.
        This prevents credit loss when analysis fails after reservation.
        """
        try:
            with self.mysql_service.get_db() as session:
                # ✅ ROW-LEVEL LOCK to prevent race conditions
                user_access = session.query(UserAccess).filter(
                    UserAccess.user_id == user_id
                ).with_for_update().first()
                
                if not user_access:
                    return {"success": False, "message": "User access not found"}
                
                # ✅ Calculate available credits (MUST subtract existing reservations)
                available = (
                    user_access.allocated_count 
                    - user_access.used_count 
                    - (user_access.reserved_credits or 0)  # Critical: account for existing reservations
                )
                
                if available < points_needed:
                    return {
                        "success": False, 
                        "message": "Insufficient credits",
                        "available": available,
                        "needed": points_needed
                    }
                
                # ✅ Reserve: Add to reserved_credits (NOT used_count)
                if user_access.reserved_credits is None:
                    user_access.reserved_credits = 0
                user_access.reserved_credits += points_needed
                user_access.reservation_time = datetime.utcnow()
                user_access.status = "analysis_initiated"  # StatusEnum.analysis_initiated
                
                session.commit()
                
                logger.info(
                    "Credits reserved successfully",
                    user_id=user_id,
                    points=points_needed,
                    available_after_reserve=available - points_needed,
                    reserved_total=user_access.reserved_credits
                )
                
                return {
                    "success": True,
                    "reserved_credits": points_needed,
                    "remaining_credits": available - points_needed
                }
        except Exception as e:
            logger.error(
                "Credit reservation failed",
                user_id=user_id,
                points=points_needed,
                error=str(e)
            )
            return {"success": False, "message": f"Reservation error: {str(e)}"}

    def commit_reserved_credits(
        self,
        user_id: str,
        usage_log_id: str,
        llm_analytics: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Phase 2a: Commit reserved credits (2-phase commit success path)
        Move credits from 'reserved' to 'used' atomically.
        
        FIXED: Now properly moves credits from reserved_credits to used_count.
        Old behavior just marked usage_log as complete without moving credits.
        """
        try:
            with self.mysql_service.get_db() as session:
                session.begin()
                
                try:
                    # Lock BOTH records atomically
                    usage_log = session.query(UsageLog).filter(
                        UsageLog.id == usage_log_id
                    ).with_for_update().first()
                    
                    user_access = session.query(UserAccess).filter(
                        UserAccess.user_id == user_id
                    ).with_for_update().first()
                    
                    # Validation
                    if not usage_log:
                        logger.error(
                            "Usage log not found for commit",
                            user_id=user_id,
                            usage_log_id=usage_log_id
                        )
                        session.rollback()
                        return False
                    
                    if not user_access:
                        logger.error(
                            "User access not found for commit",
                            user_id=user_id,
                            usage_log_id=usage_log_id
                        )
                        session.rollback()
                        return False
                    
                    if usage_log.status != UsageStatusEnum.pending:
                        logger.warning(
                            "Usage log not in pending state",
                            usage_log_id=usage_log_id,
                            current_status=usage_log.status.value if hasattr(usage_log.status, 'value') else usage_log.status
                        )
                        session.rollback()
                        return False
                    
                    points = usage_log.points_deducted
                    
                    # ✅ ATOMIC: Move from reserved to used
                    if (user_access.reserved_credits or 0) < points:
                        logger.error(
                            "Reserved credits mismatch",
                            user_id=user_id,
                            reserved=user_access.reserved_credits,
                            needed=points
                        )
                        session.rollback()
                        return False
                    
                    user_access.reserved_credits -= points
                    user_access.used_count += points
                    user_access.status = "available"  # StatusEnum.available
                    user_access.last_used = datetime.utcnow()
                    
                    # Update usage log
                    usage_log.status = UsageStatusEnum.completed
                    if llm_analytics:
                        usage_log.llm_analytics = llm_analytics
                    
                    session.commit()
                    
                    logger.info(
                        "Credits committed successfully",
                        user_id=user_id,
                        usage_log_id=usage_log_id,
                        points=points,
                        remaining=user_access.allocated_count - user_access.used_count
                    )
                    
                    return True
                    
                except Exception as inner_e:
                    session.rollback()
                    logger.error(
                        "Credit commit transaction failed - ROLLED BACK",
                        user_id=user_id,
                        usage_log_id=usage_log_id,
                        error=str(inner_e)
                    )
                    return False
                    
        except Exception as e:
            logger.error(
                "Credit commit system failure",
                user_id=user_id,
                usage_log_id=usage_log_id,
                error=str(e)
            )
            return False

    def release_reserved_credits(
        self,
        user_id: str,
        usage_log_id: str,
        reason: str = "Analysis failed"
    ) -> bool:
        """
        Phase 2b: Release reserved credits (2-phase commit failure path)
        Return credits from 'reserved' back to 'available' pool.
        
        NEW METHOD: Called when:
        - Session analysis fails
        - LLM call errors
        - Database errors during analysis
        - Any exception during analysis workflow
        """
        try:
            with self.mysql_service.get_db() as session:
                session.begin()
                
                try:
                    # Lock BOTH records atomically
                    usage_log = session.query(UsageLog).filter(
                        UsageLog.id == usage_log_id
                    ).with_for_update().first()
                    
                    user_access = session.query(UserAccess).filter(
                        UserAccess.user_id == user_id
                    ).with_for_update().first()
                    
                    # Validation (don't fail silently - these might already be cleaned up)
                    if not usage_log:
                        logger.warning(
                            "Usage log not found for release (may have been cleaned up)",
                            user_id=user_id,
                            usage_log_id=usage_log_id
                        )
                        session.rollback()
                        return False
                    
                    if not user_access:
                        logger.warning(
                            "User access not found for release",
                            user_id=user_id,
                            usage_log_id=usage_log_id
                        )
                        session.rollback()
                        return False
                    
                    points = usage_log.points_deducted
                    
                    # ✅ RELEASE: Subtract from reserved (return to available pool)
                    if (user_access.reserved_credits or 0) >= points:
                        user_access.reserved_credits -= points
                    else:
                        logger.warning(
                            "Reserved credits already released or insufficient",
                            user_id=user_id,
                            reserved=user_access.reserved_credits,
                            points=points,
                            reason="May have been cleaned by orphan cleanup"
                        )
                        # Still proceed - just log the mismatch
                        if user_access.reserved_credits is None:
                            user_access.reserved_credits = 0
                    
                    user_access.status = "available"  # StatusEnum.available
                    user_access.reservation_time = None
                    
                    # Mark usage log as failed
                    usage_log.status = UsageStatusEnum.failed
                    usage_log.llm_analytics = {
                        "failure_reason": reason,
                        "rollback_timestamp": datetime.utcnow().isoformat()
                    }
                    
                    session.commit()
                    
                    logger.info(
                        "Reserved credits released successfully",
                        user_id=user_id,
                        usage_log_id=usage_log_id,
                        points=points,
                        reason=reason,
                        available_now=user_access.allocated_count - user_access.used_count
                    )
                    
                    return True
                    
                except Exception as inner_e:
                    session.rollback()
                    logger.error(
                        "Credit release transaction failed - ROLLED BACK",
                        user_id=user_id,
                        usage_log_id=usage_log_id,
                        error=str(inner_e)
                    )
                    return False
                    
        except Exception as e:
            logger.error(
                "Credit release system failure",
                user_id=user_id,
                usage_log_id=usage_log_id,
                error=str(e),
                business_impact="Credits may remain reserved - orphan cleanup will handle"
            )
            return False

    def complete_usage_log(self, usage_log_id: str, llm_analytics: dict) -> bool:
        """Complete usage log with analytics"""
        try:
            with self.mysql_service.get_db() as session:
                usage_log = session.query(UsageLog).filter(UsageLog.id == usage_log_id).first()
                
                if not usage_log:
                    return False
                
                # Update usage log
                usage_log.status = UsageStatusEnum.completed

                if llm_analytics:
                    usage_log.llm_analytics = llm_analytics
                
                session.commit()
                
                logger.info("Usage log completed", usage_log_id=usage_log_id)
                return True
        except Exception as e:
            logger.error("Failed to complete usage log", usage_log_id=usage_log_id, error=str(e))
            return False

    def get_user_access_limits(self, user_id: str) -> Optional[dict]:
        """Get user access limits and current usage"""
        try:
            with self.mysql_service.get_db() as session:
                user_access = session.query(UserAccess).filter(
                    UserAccess.user_id == user_id
                ).first()
                
                if not user_access:
                    # Return default limits if no record exists
                    logger.warning("No user access record found, returning defaults", user_id=user_id)
                    return {
                        "allocated_count": 0,
                        "used_count": 0,
                        "remaining_count": 0,
                        "reset_at": None,
                        "plan_type": "basic",  # Default plan type when no record exists
                        "status": "default_limits",
                        "message": "No access record found"
                    }
                
                # Validate user has a current_pack_id
                if not user_access.current_pack_id:
                    logger.error(
                        "CRITICAL: User has no current_pack_id assigned",
                        user_id=user_id,
                        business_impact="Model selection will fail",
                        action_required="Assign user to a pricing pack"
                    )
                    raise Exception(f"User {user_id} has no pricing pack assigned")
                
                return {
                    "allocated_count": user_access.allocated_count,
                    "used_count": user_access.used_count,
                    "remaining_count": user_access.allocated_count - user_access.used_count,
                    "reset_at": user_access.reset_at.isoformat() if user_access.reset_at else None,
                    "last_used": user_access.last_used.isoformat() if user_access.last_used else None,
                    "plan_type": user_access.current_pack_id,  # Direct pack ID - no fallback
                    "status": "active"
                }
        except Exception as e:
            logger.error(
                "CRITICAL: Failed to get user access limits - FAILING FAST",
                user_id=user_id,
                error=str(e),
                business_impact="User cannot access LLM services",
                action_required="Fix user access data or database connectivity"
            )
            # No safe defaults - fail fast to prevent silent issues
            raise Exception(f"Cannot determine user access limits for {user_id}: {str(e)}")

    # =================
    # TEMPLATE OPERATIONS
    # =================

    def get_templates_by_school_and_level(self, school_id: str, level: str) -> List[Dict[str, Any]]:
        """Get templates by school_id and level"""
        try:
            from app.common.models.mysql_models import Templates
            
            with self.mysql_service.get_db() as session:
                templates = session.query(Templates).filter(
                    Templates.school_id == school_id,
                    Templates.level == level,
                    Templates.is_active == True
                ).all()
                
                result = []
                for template in templates:
                    template_dict = {
                        "id": template.id,
                        "template_name": template.template_name,
                        "template_data": template.template_data,
                        "session_type": template.session_type.value if template.session_type else "exam",
                        "level": template.level,
                        "school_id": template.school_id
                    }
                    result.append(template_dict)
                
                return result
        except Exception as e:
            logger.error("Failed to get templates", school_id=school_id, level=level, error=str(e))
            return []

    def get_template_by_id(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get a single template by ID"""
        try:
            from app.common.models.mysql_models import Templates
            
            with self.mysql_service.get_db() as session:
                template = session.query(Templates).filter(
                    Templates.id == template_id,
                    Templates.is_active == True
                ).first()
                
                if template:
                    return {
                        "id": template.id,
                        "template_name": template.template_name,
                        "template_data": template.template_data,
                        "session_type": template.session_type.value if template.session_type else "exam",
                        "level": template.level,
                        "school_id": template.school_id
                    }
                return None
                
        except Exception as e:
            logger.error("Failed to get template by ID", template_id=template_id, error=str(e))
            return None

    # =================
    # EXAM OPERATIONS
    # =================

    def get_user_sessions(
        self,
        user_id: str,
        session_type: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> dict:
        """Get user exam sessions with pagination"""
        try:
            with self.mysql_service.get_db() as session:
                # Base query for filtering
                base_query = session.query(ExamDetail).filter(ExamDetail.user_id == user_id)
                
                if session_type:
                    base_query = base_query.filter(ExamDetail.session_type == session_type)
                
                # Get total count from the base query
                total_count = base_query.count()
                
                # Apply ordering and pagination to a new query object
                sessions = base_query.order_by(ExamDetail.created_at.desc()).offset(offset).limit(limit).all()
                logger.info(f"DB query returned {len(sessions)} sessions for user {user_id}.")
                
                session_list = []
                for exam_session in sessions:
                    try:
                        language = None
                        if exam_session.language_id:
                            language = session.query(Language).filter(
                                Language.id == exam_session.language_id
                            ).first()
                        
                        # Calculate total_questions from template (like MongoDB version)
                        total_questions = 0
                        if exam_session.template and isinstance(exam_session.template, dict):
                            total_questions = (
                                exam_session.template.get("reading", 0)
                                + exam_session.template.get("writing", 0)
                                + exam_session.template.get("grammar", 0)
                                + exam_session.template.get("hearing", 0)
                            )
                        
                        # Calculate current_question from exam_log count (how many answered)
                        current_question = session.query(ExamLog).filter(
                            ExamLog.exam_detail_id == exam_session.id,
                            ExamLog.user_id == user_id
                        ).count()
                        
                        # Derive activity_type from template for frontend compatibility
                        activity_type = "full_exam"  # default
                        if exam_session.template and isinstance(exam_session.template, dict):
                            template = exam_session.template
                            reading_count = template.get("reading", 0)
                            writing_count = template.get("writing", 0)
                            grammar_count = template.get("grammar", 0)
                            hearing_count = template.get("hearing", 0)
                            
                            # Determine primary activity type based on template
                            if reading_count > 0 and writing_count == 0 and grammar_count == 0 and hearing_count == 0:
                                activity_type = "reading"
                            elif writing_count > 0 and reading_count == 0 and grammar_count == 0 and hearing_count == 0:
                                activity_type = "writing"
                            elif grammar_count > 0 and reading_count == 0 and writing_count == 0 and hearing_count == 0:
                                activity_type = "grammar"
                            elif hearing_count > 0 and reading_count == 0 and writing_count == 0 and grammar_count == 0:
                                activity_type = "hearing"
                            else:
                                activity_type = "full_exam"  # mixed or all types
                        
                        # Calculate duration for completed/analyzed sessions
                        duration_minutes = None
                        if exam_session.status in ['completed', 'analyzed'] and exam_session.started_at:
                            # Use completed_at if available, otherwise use analyzed_at for analyzed sessions
                            end_time = exam_session.completed_at or exam_session.analyzed_at
                            if end_time:
                                duration_seconds = (end_time - exam_session.started_at).total_seconds()
                                duration_minutes = round(duration_seconds / 60, 1)
                        
                        # Extract score from exam_summary for analyzed sessions
                        score = 0
                        if exam_session.status == 'analyzed' and exam_session.exam_summary:
                            try:
                                if isinstance(exam_session.exam_summary, dict):
                                    overall = exam_session.exam_summary.get('overall', {})
                                    if isinstance(overall, dict):
                                        raw_score = overall.get('overall_score', 0)
                                        # Ensure score is a numeric value, not a string
                                        # Handle both numeric and string representations
                                        if isinstance(raw_score, str):
                                            try:
                                                score = float(raw_score)
                                            except (ValueError, TypeError):
                                                score = 0
                                        else:
                                            score = float(raw_score) if raw_score else 0
                            except Exception as e:
                                logger.warning(f"Failed to extract score from exam_summary: {e}")
                                score = 0
                        
                        session_data = {
                            "session_id": exam_session.id,  # Changed from exam_id to session_id for frontend compatibility
                            "exam_id": exam_session.id,     # Keep exam_id for backward compatibility
                            "exam_name": exam_session.exam_name,  # Add exam_name for frontend display
                            "session_type": exam_session.session_type.value if hasattr(exam_session.session_type, 'value') else str(exam_session.session_type),
                            "level": exam_session.level,
                            "status": exam_session.status,
                            "activity_type": activity_type,  # Add derived activity_type for frontend filtering
                            "language": {
                                "id": language.id if language else None,
                                "name": language.name if language else "Unknown"
                            },
                            "created_at": exam_session.created_at.isoformat() if exam_session.created_at else None,  # Use created_at instead of started_at
                            "started_at": exam_session.started_at.isoformat() if exam_session.started_at else None,  # Add started_at for duration calculation
                            "duration_minutes": duration_minutes,  # Add calculated duration for completed sessions
                            "total_questions": total_questions,
                            "current_question": current_question,
                            "score": score,  # Extract actual score from exam_summary for analyzed sessions
                            # Add progress object for frontend compatibility
                            "progress": {
                                "completed_questions": current_question,
                                "total_questions": total_questions,
                                "remaining_questions": max(0, total_questions - current_question)
                            }
                        }
                        session_list.append(session_data)
                    except Exception as session_error:
                        logger.error(
                            "Error processing a single session record", 
                            exam_id=exam_session.id, 
                            error=str(session_error),
                            exc_info=True
                        )
                        continue
                
                logger.info(f"Processed {len(session_list)} sessions into list for user {user_id}.")
                return {
                    "success": True,
                    "sessions": session_list,
                    "total_count": total_count
                }
        except Exception as e:
            logger.error("Failed to get user sessions", user_id=user_id, error=str(e), exc_info=True)
            return {"success": False, "message": "Failed to retrieve sessions"}

    def get_recent_analyzed_sessions(
        self,
        user_id: str,
        level: str,
        language_id: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get recent analyzed sessions for streak calculation.
        
        Fetches sessions ordered by analyzed_at DESC (newest first).
        Scores are extracted from exam_summary.overall.overall_score (0-100 scale).
        
        Args:
            user_id: User identifier
            level: CEFR level filter
            language_id: Optional language filter
            limit: Maximum number of sessions to fetch (default 5)
            
        Returns:
            List of dicts with 'id', 'analyzed_at', 'score' (0-100 scale)
        """
        try:
            with self.mysql_service.get_db() as session:
                query = session.query(ExamDetail).filter(
                    ExamDetail.user_id == user_id,
                    ExamDetail.level == level,
                    ExamDetail.status == 'analyzed'
                )
                
                if language_id:
                    query = query.filter(ExamDetail.language_id == language_id)
                
                # Order by analyzed_at desc
                sessions = query.order_by(ExamDetail.analyzed_at.desc()).limit(limit).all()
                
                result = []
                for s in sessions:
                    score = 0
                    if s.exam_summary and isinstance(s.exam_summary, dict):
                        overall = s.exam_summary.get('overall', {})
                        if isinstance(overall, dict):
                            raw_score = overall.get('overall_score', 0)
                            try:
                                score = float(raw_score)
                            except (ValueError, TypeError):
                                score = 0
                    
                    result.append({
                        "id": s.id,
                        "analyzed_at": s.analyzed_at,
                        "score": score
                    })
                
                return result
        except Exception as e:
            logger.error("Failed to get recent analyzed sessions", user_id=user_id, error=str(e))
            return []

    def get_exam_detail(self, exam_id: str, user_id: str) -> Optional[dict]:
        """Get exam detail by ID and user ID"""
        try:
            with self.mysql_service.get_db() as session:
                exam = session.query(ExamDetail).filter(
                    ExamDetail.id == exam_id,
                    ExamDetail.user_id == user_id
                ).first()
                
                if not exam:
                    return None
                
                # Get language information if language_id exists
                language_name = None
                language_code = None
                if exam.language_id:
                    language = session.query(Language).filter(
                        Language.id == exam.language_id
                    ).first()
                    if language:
                        language_name = language.name
                        language_code = language.code
                
                # Calculate total_questions from template (like MongoDB version)
                total_questions = 0
                if exam.template and isinstance(exam.template, dict):
                    total_questions = (
                        exam.template.get("reading", 0)
                        + exam.template.get("writing", 0)
                        + exam.template.get("grammar", 0)
                        + exam.template.get("hearing", 0)
                    )
                
                # Calculate current_question from exam_log count (how many answered)
                current_question = session.query(ExamLog).filter(
                    ExamLog.exam_detail_id == exam.id,
                    ExamLog.user_id == user_id
                ).count()
                
                # Calculate duration for completed/analyzed sessions
                duration_minutes = None
                if exam.status in ['completed', 'analyzed'] and exam.started_at:
                    # Use completed_at if available, otherwise use analyzed_at for analyzed sessions
                    end_time = exam.completed_at or exam.analyzed_at
                    if end_time:
                        duration_seconds = (end_time - exam.started_at).total_seconds()
                        duration_minutes = round(duration_seconds / 60, 1)
                
                return {
                    "exam_id": exam.id,
                    "exam_name": exam.exam_name,  # Add exam_name for frontend display
                    "user_id": exam.user_id,
                    "session_type": exam.session_type,
                    "level": exam.level,
                    "language_id": exam.language_id,
                    "language_name": language_name,  # Add language_name for frontend display
                    "language_code": language_code,  # Add language_code for compatibility
                    "status": exam.status,
                    "template": exam.template,
                    "total_questions": total_questions,
                    "current_question": current_question,
                    "score": 0,  # Score not used, set to default
                    "exam_summary": exam.exam_summary,  # Return as JSON object, not string
                    "session_summary": exam.exam_summary,  # Alias for compatibility
                    "created_at": exam.created_at.isoformat() if exam.created_at else None,
                    "started_at": exam.started_at.isoformat() if exam.started_at else None,  # Add started_at for duration calculation
                    "duration_minutes": duration_minutes,  # Add calculated duration for completed sessions
                    "completed_at": exam.completed_at.isoformat() if exam.completed_at else None,
                    "analyzed_at": exam.analyzed_at.isoformat() if exam.analyzed_at else None,
                    # Add progress object for frontend compatibility
                    "progress": {
                        "completed_questions": current_question,
                        "total_questions": total_questions,
                        "remaining_questions": max(0, total_questions - current_question)
                    }
                }
        except Exception as e:
            logger.error("Failed to get exam detail", exam_id=exam_id, user_id=user_id, error=str(e))
            return None

    def get_exam_progress(self, exam_id: str, user_id: str) -> dict:
        """Get exam progress including answers"""
        try:
            with self.mysql_service.get_db() as session:
                # Get exam details
                exam = session.query(ExamDetail).filter(
                    ExamDetail.id == exam_id,
                    ExamDetail.user_id == user_id
                ).first()
                
                if not exam:
                    return {"success": False, "message": "Exam not found"}
                
                # Get exam answers
                answers = session.query(ExamLog).filter(
                    ExamLog.exam_detail_id == exam_id,
                    ExamLog.user_id == user_id
                ).order_by(ExamLog.question_number).all()
                
                # Calculate progress
                # Calculate total_questions from template (like other methods)
                total_questions = 0
                if exam.template and isinstance(exam.template, dict):
                    total_questions = (
                        exam.template.get("reading", 0) +
                        exam.template.get("writing", 0) +
                        exam.template.get("grammar", 0) +
                        exam.template.get("hearing", 0) +
                        exam.template.get("speaking", 0)
                    )
                
                answered_questions = len(answers)
                current_question = answered_questions  # current_question = number of answered questions
                progress_percentage = (answered_questions / total_questions * 100) if total_questions > 0 else 0
                
                # Calculate activity breakdown
                activity_breakdown = {
                    "reading": 0,
                    "writing": 0,
                    "grammar": 0,
                    "hearing": 0,
                    "speaking": 0,
                }
                for answer in answers:
                    activity_type = answer.activity_type
                    if activity_type in activity_breakdown:
                        activity_breakdown[activity_type] += 1
                
                # Get correct answers count
                correct_answers = sum(1 for answer in answers if 
                                    answer.feedback_data and answer.feedback_data.get("is_correct", False))
                
                # Extract used question IDs for duplicate prevention (no extra query needed!)
                used_question_ids = [answer.question_id for answer in answers]
                
                return {
                    "success": True,
                    "exam_id": exam.id,
                    "status": exam.status,
                    "progress": {
                        "total_questions": total_questions,
                        "answered_questions": answered_questions,
                        "current_question": current_question,
                        "progress_percentage": round(progress_percentage, 1),
                        "correct_answers": correct_answers,
                        "score": 0,  # score calculated separately
                        "activity_breakdown": activity_breakdown  # Add activity breakdown
                    },
                    "used_question_ids": used_question_ids,  # For duplicate prevention
                    "answers": [
                        {
                            "question_number": answer.question_number,
                            "question_id": answer.question_id,
                            "user_answer": answer.user_answer,
                            "is_correct": answer.feedback_data.get("is_correct", False) if answer.feedback_data else False,
                            "feedback": answer.feedback_data.get("feedback", "") if answer.feedback_data else "",
                            "created_at": answer.answered_at.isoformat() if answer.answered_at else None
                        }
                        for answer in answers
                    ]
                }
        except Exception as e:
            logger.error("Failed to get exam progress", exam_id=exam_id, user_id=user_id, error=str(e))
            return {"success": False, "message": "Failed to get exam progress"}

    def create_exam_detail(
        self,
        user_id: str,
        session_type: str,
        level: str,
        language_id: str,
        exam_name: str,
        template_id: str,
        template_data: Dict[str, Any]
    ) -> dict:
        """Create new exam detail record"""
        try:
            exam_data = {
                'id': self.generate_id(),
                'user_id': user_id,
                'exam_name': exam_name,
                'level': level,
                'language_id': language_id,
                'template_id': template_id,
                'template': template_data,
                'session_type': session_type,
                'status': 'created',  # Sessions start as 'created', then move to 'in_progress' when user starts
                'created_at': datetime.utcnow()
                # started_at will be set when status changes to 'in_progress'
            }
            
            # Use session context directly to avoid detached instance issues
            with self.mysql_service.get_db() as session:
                exam = ExamDetail(**exam_data)
                session.add(exam)
                session.flush()  # Get the ID without committing
                exam_id = exam.id  # Extract ID while still in session
                session.commit()  # Commit the transaction
            
            logger.info("Exam detail created", exam_id=exam_id, user_id=user_id)
            return {"success": True, "exam_id": exam_id}
        except Exception as e:
            logger.error("Failed to create exam detail", user_id=user_id, error=str(e))
            return {"success": False, "message": "Failed to create exam"}

    def save_exam_answer(
        self,
        exam_id: str,
        user_id: str,
        question_id: str,
        question_number: int,
        user_answer: str,
        activity_type: str,
        session_type: str = "exam",
        language_id: Optional[str] = None,
        question_data: Optional[Dict[str, Any]] = None,
        time_taken: Optional[int] = None,
        is_skipped: bool = False,
        user_audio_url: Optional[str] = None,
        user_audio_transcript: Optional[str] = None,
        user_audio_meta: Optional[Dict[str, Any]] = None,
    ) -> dict:
        """Save exam answer with skip flag support"""
        try:
            answer_data = {
                'exam_detail_id': exam_id,
                'user_id': user_id,
                'language_id': language_id,
                'question_id': question_id,
                'question_number': question_number,
                'user_answer': user_answer,
                'activity_type': activity_type,
                'question_data': question_data or {},
                'session_type': session_type,
                'answered_at': datetime.utcnow(),
                'user_audio_url': user_audio_url,
                'user_audio_transcript': user_audio_transcript,
                'user_audio_meta': user_audio_meta,
            }
            
            # Add metadata (time_taken, is_skipped, etc.) to exam_log_meta field
            meta_data = {}
            if time_taken is not None:
                meta_data['time_taken'] = time_taken
            
            # Store skip flag in metadata
            meta_data['is_skipped'] = is_skipped
            meta_data['submitted_at'] = datetime.utcnow().isoformat()
            
            answer_data['exam_log_meta'] = meta_data
            
            exam_log = self.exam_log_ops.create(**answer_data)
            
            logger.info(
                "Exam answer saved", 
                exam_id=exam_id, 
                question_number=question_number,
                is_skipped=is_skipped
            )
            return {"success": True, "answer_id": exam_log.id}
        except Exception as e:
            logger.error("Failed to save exam answer", exam_id=exam_id, error=str(e))
            return {"success": False, "message": "Failed to save answer"}

    def update_exam_status(self, exam_id: str, status: str) -> bool:
        """Update exam status"""
        try:
            with self.mysql_service.get_db() as session:
                exam = session.query(ExamDetail).filter(ExamDetail.id == exam_id).first()
                
                if not exam:
                    return False
                
                exam.status = status
                
                # Set started_at when changing to in_progress (if not already set)
                if status == 'in_progress' and not exam.started_at:
                    exam.started_at = datetime.utcnow()
                
                # Set completed_at when changing to completed or analyzed (if not already set)
                # This is critical for dashboard analytics which filter by completed_at
                if status in ['completed', 'analyzed'] and not exam.completed_at:
                    exam.completed_at = datetime.utcnow()
                    logger.info("Setting completed_at for exam", exam_id=exam_id, status=status)
                
                session.commit()
                
                logger.info("Exam status updated", exam_id=exam_id, status=status, 
                           completed_at=exam.completed_at.isoformat() if exam.completed_at else None)
                return True
        except Exception as e:
            logger.error("Failed to update exam status", exam_id=exam_id, error=str(e))
            return False

    def get_last_exam_answer(self, exam_id: str, user_id: str) -> Optional[dict]:
        """Get last exam answer for the session"""
        try:
            with self.mysql_service.get_db() as session:
                answer = session.query(ExamLog).filter(
                    ExamLog.exam_detail_id == exam_id,
                    ExamLog.user_id == user_id
                ).order_by(ExamLog.question_number.desc()).first()
                
                if not answer:
                    return None
                
                return {
                    "exam_id": answer.exam_detail_id,
                    "question_number": answer.question_number,
                    "question_id": answer.question_id,
                    "user_answer": answer.user_answer,
                    "is_correct": answer.feedback_data.get("is_correct", False) if answer.feedback_data else False,
                    "feedback": answer.feedback_data.get("feedback", "") if answer.feedback_data else "",
                    "time_taken": answer.feedback_data.get("time_taken", 0) if answer.feedback_data else 0,
                    "created_at": answer.answered_at.isoformat() if answer.answered_at else None
                }
        except Exception as e:
            logger.error("Failed to get last exam answer", exam_id=exam_id, user_id=user_id, error=str(e))
            return None

    def get_exam_answers(self, exam_id: str, user_id: str) -> dict:
        """Get all exam answers for a session with complete question and feedback data"""
        try:
            logger.info(
                "GET_EXAM_ANSWERS_START",
                exam_id=exam_id,
                user_id=user_id,
                method="get_exam_answers"
            )
            
            with self.mysql_service.get_db() as session:
                answers = session.query(ExamLog).filter(
                    ExamLog.exam_detail_id == exam_id,
                    ExamLog.user_id == user_id
                ).order_by(ExamLog.question_number).all()
                
                logger.info(
                    "GET_EXAM_ANSWERS_QUERY_RESULT",
                    exam_id=exam_id,
                    user_id=user_id,
                    answer_count=len(answers),
                    answers_found=[{"id": a.id, "question_number": a.question_number, "activity_type": a.activity_type} for a in answers[:3]]  # First 3 for debugging
                )
                
                answer_list = []
                for answer in answers:
                    # Extract question data from the stored JSON
                    question_data = answer.question_data if answer.question_data else {}
                    
                    # Extract feedback data from the stored JSON
                    feedback_data = answer.feedback_data if answer.feedback_data else {}
                    
                    # Extract nested feedback object if it exists
                    nested_feedback = feedback_data.get("feedback", {}) if isinstance(feedback_data.get("feedback"), dict) else {}
                    
                    # Extract skip flag from metadata
                    exam_log_meta = answer.exam_log_meta if answer.exam_log_meta else {}
                    is_skipped = exam_log_meta.get("is_skipped", False)
                    
                    # Also check if answer is empty (legacy behavior)
                    if not is_skipped and (not answer.user_answer or answer.user_answer.strip() == ""):
                        is_skipped = True
                    
                    # Build the frontend-compatible answer object
                    answer_obj = {
                        "answer_id": answer.id,  # Use answer_id to avoid conflicts
                        "id": answer.id,  # Keep for backward compatibility
                        "question_number": answer.question_number,
                        "question_id": answer.question_id,
                        "activity_type": answer.activity_type,  # Add activity_type from exam_log
                        "user_answer": answer.user_answer,
                        "answered_at": answer.answered_at.isoformat() if answer.answered_at else None,
                        "is_correct": feedback_data.get("is_correct", False),
                        "time_taken": feedback_data.get("time_taken", 0),
                        "created_at": answer.answered_at.isoformat() if answer.answered_at else None,
                        "is_skipped": is_skipped,  # Add skip status
                        
                        # Add complete question data for frontend
                        "question_data": {
                            "text": question_data.get("text"),
                            "question": question_data.get("question"),
                            "prompt": question_data.get("prompt"),
                            "instruction": question_data.get("instruction"),
                            "grammar_topic": question_data.get("grammar_topic"),
                            "options": question_data.get("options", []),
                            "tip": question_data.get("tip"),
                            "explanation": question_data.get("explanation"),
                            "example": question_data.get("example"),
                            "topic": question_data.get("topic"),
                            "task_type": question_data.get("task_type"),
                            "requirements": question_data.get("requirements"),
                            "minimum_words": question_data.get("minimum_words"),
                            "writing_format": question_data.get("writing_format"),
                            "context": question_data.get("context"),
                            "questions": question_data.get("questions", []),
                            "expected_length": question_data.get("expected_length"),
                            "correct_answer": question_data.get("correct_answer"),
                            "correct_answer_reason": question_data.get("correct_answer_reason"),
                            "difficulty_level": question_data.get("difficulty_level"),
                            "question_type": question_data.get("question_type"),
                            "audio_url": question_data.get("audio_url"),
                            "transcript": question_data.get("transcript"),
                            "question_metadata": question_data.get("question_metadata"),
                        },
                        
                        # Add feedback data for frontend - only fields actually generated by LLM
                        "feedback_data": {
                            # ✅ LLM-generated feedback fields (common to all activities)
                            "quality": nested_feedback.get("quality"),
                            "topic": nested_feedback.get("topic"),
                            "correct_answer": nested_feedback.get("correct_answer"),
                            "explanation": nested_feedback.get("explanation"),
                            # Support both singular (legacy) and plural (new) field names
                            "error_pattern": nested_feedback.get("error_patterns") or nested_feedback.get("error_pattern"),
                            "focus_area": nested_feedback.get("focus_areas") or nested_feedback.get("focus_area"),
                            "score": nested_feedback.get("score"),
                            
                            # ✅ Activity-specific feedback fields
                            # Speaking-specific
                            "audio_feedback": nested_feedback.get("audio_feedback"),
                            "is_complete": nested_feedback.get("is_complete"),
                            # Hearing/Speaking-specific (transcript issues)
                            "needs_transcript": nested_feedback.get("needs_transcript"),

                            # ✅ Database-stored fields
                            "is_correct": feedback_data.get("is_correct", False),
                            "time_taken": feedback_data.get("time_taken", 0)
                        },
                        "user_audio_url": answer.user_audio_url,
                        "user_audio_transcript": answer.user_audio_transcript,
                        "user_audio_meta": answer.user_audio_meta,
                    }
                    
                    answer_list.append(answer_obj)
                
                return {
                    "success": True,
                    "exam_id": exam_id,
                    "total_answers": len(answer_list),
                    "answers": answer_list
                }
        except Exception as e:
            logger.error("Failed to get exam answers", exam_id=exam_id, user_id=user_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve answers"}

    def delete_exam_answers(self, exam_id: str, user_id: str) -> bool:
        """Delete all answers for an exam"""
        try:
            with self.mysql_service.get_db() as session:
                deleted_count = session.query(ExamLog).filter(
                    ExamLog.exam_detail_id == exam_id,
                    ExamLog.user_id == user_id
                ).delete()
                
                session.commit()
                
                logger.info("Exam answers deleted", exam_id=exam_id, deleted_count=deleted_count)
                return True
        except Exception as e:
            logger.error("Failed to delete exam answers", exam_id=exam_id, error=str(e))
            return False

    def get_answer_by_question_id(
        self, exam_id: str, user_id: str, question_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get a specific exam answer by question_id.
        Used for checking if answer exists and for editing skipped questions.
        """
        try:
            with self.mysql_service.get_db() as session:
                answer = session.query(ExamLog).filter(
                    ExamLog.exam_detail_id == exam_id,
                    ExamLog.user_id == user_id,
                    ExamLog.question_id == question_id
                ).first()
                
                if not answer:
                    return None
                
                # Extract skip flag from metadata
                exam_log_meta = answer.exam_log_meta if answer.exam_log_meta else {}
                is_skipped = exam_log_meta.get("is_skipped", False)
                
                # Also check if answer is empty (legacy behavior)
                if not is_skipped and (not answer.user_answer or answer.user_answer.strip() == ""):
                    is_skipped = True
                
                return {
                    "id": answer.id,
                    "question_id": answer.question_id,
                    "question_number": answer.question_number,
                    "user_answer": answer.user_answer,
                    "activity_type": answer.activity_type,
                    "question_data": answer.question_data,
                    "time_taken": 0,  # Not stored in current schema
                    "is_skipped": is_skipped,
                    "answered_at": answer.answered_at.isoformat() if answer.answered_at else None,
                    "user_audio_url": answer.user_audio_url,
                    "user_audio_transcript": answer.user_audio_transcript,
                    "user_audio_meta": answer.user_audio_meta,
                }
                
        except Exception as e:
            logger.error(f"Failed to get answer by question_id: {str(e)}", exam_id=exam_id, question_id=question_id)
            return None

    def update_exam_answer(
        self,
        answer_id: str,
        new_answer: str,
        is_skipped: bool = False,
        user_audio_url: Optional[str] = None,
        user_audio_transcript: Optional[str] = None,
        user_audio_meta: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Update an existing exam answer.
        Clears is_skipped flag when answer is provided.
        """
        try:
            with self.mysql_service.get_db() as session:
                answer = session.query(ExamLog).filter(
                    ExamLog.id == answer_id
                ).first()
                
                if not answer:
                    logger.warning(f"Answer not found for update: {answer_id}")
                    return False
                
                # Update answer
                answer.user_answer = new_answer

                if user_audio_url is not None:
                    answer.user_audio_url = user_audio_url
                if user_audio_transcript is not None:
                    answer.user_audio_transcript = user_audio_transcript
                if user_audio_meta is not None:
                    answer.user_audio_meta = user_audio_meta

                # Update metadata to clear/set skip flag
                exam_log_meta = answer.exam_log_meta if answer.exam_log_meta else {}
                exam_log_meta["is_skipped"] = is_skipped
                exam_log_meta["updated_at"] = datetime.utcnow().isoformat()
                
                # Force SQLAlchemy to detect the JSON column change
                from sqlalchemy.orm.attributes import flag_modified
                answer.exam_log_meta = exam_log_meta
                flag_modified(answer, "exam_log_meta")
                if user_audio_meta is not None:
                    flag_modified(answer, "user_audio_meta")
                
                # Note: Keep original answered_at timestamp
                
                session.commit()
                
                logger.info(
                    "Answer updated successfully",
                    answer_id=answer_id,
                    is_skipped=is_skipped
                )
                
                return True
                
        except Exception as e:
            logger.error(f"Failed to update answer: {str(e)}", answer_id=answer_id)
            session.rollback()
            return False

    def delete_exam_detail(self, exam_id: str, user_id: str) -> bool:
        """Delete exam detail record"""
        try:
            with self.mysql_service.get_db() as session:
                # First delete related answers
                session.query(ExamLog).filter(
                    ExamLog.exam_detail_id == exam_id,
                    ExamLog.user_id == user_id
                ).delete()
                
                # Then delete exam detail
                deleted_count = session.query(ExamDetail).filter(
                    ExamDetail.id == exam_id,
                    ExamDetail.user_id == user_id
                ).delete()
                
                session.commit()
                
                logger.info("Exam detail deleted", exam_id=exam_id, deleted=deleted_count > 0)
                return deleted_count > 0
        except Exception as e:
            logger.error("Failed to delete exam detail", exam_id=exam_id, error=str(e))
            return False

    def update_exam_summary(self, session_id: str, session_summary: dict) -> bool:
        """Update exam session summary"""
        try:
            logger.info(
                "CORE_REPO_UPDATING_EXAM_SUMMARY",
                session_id=session_id,
                summary_keys=list(session_summary.keys()) if session_summary else None,
                activities_count=len(session_summary.get("activities", {})) if session_summary else 0,
                overall_summary=session_summary.get("overall", {}) if session_summary else None
            )
            
            with self.mysql_service.get_db() as session:
                exam = session.query(ExamDetail).filter(ExamDetail.id == session_id).first()
                
                if not exam:
                    logger.error(
                        "CORE_REPO_EXAM_NOT_FOUND",
                        session_id=session_id
                    )
                    return False
                
                logger.info(
                    "CORE_REPO_EXAM_FOUND_FOR_UPDATE",
                    session_id=session_id,
                    current_status=exam.status,
                    current_summary_present=exam.exam_summary is not None
                )
                
                # Store summary as JSON object (SQLAlchemy will handle JSON serialization)
                exam.exam_summary = session_summary
                exam.analyzed_at = datetime.utcnow()  # Mark analysis completion time
                session.commit()
                
                logger.info(
                    "CORE_REPO_EXAM_SUMMARY_UPDATED_SUCCESS",
                    session_id=session_id,
                    analyzed_at=exam.analyzed_at
                )
                return True
        except Exception as e:
            logger.error(
                "CORE_REPO_UPDATE_EXAM_SUMMARY_FAILED",
                session_id=session_id,
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    def batch_update_question_feedback(
        self,
        exam_id: str,
        feedback_updates: List[Dict[str, Any]]
    ) -> bool:
        """Batch update question feedback"""
        try:
            logger.info(
                "CORE_REPO_BATCH_UPDATING_FEEDBACK",
                exam_id=exam_id,
                update_count=len(feedback_updates),
                first_update_keys=list(feedback_updates[0].keys()) if feedback_updates else None
            )
            
            with self.mysql_service.get_db() as session:
                updated_count = 0
                for i, update in enumerate(feedback_updates):
                    question_number = update.get('question_number')
                    question_id = update.get('question_id')  # Support both question_number and question_id
                    feedback = update.get('feedback')
                    is_correct = update.get('is_correct')
                    
                    # Use question_id if available, otherwise fall back to question_number
                    filter_field = question_id if question_id else question_number
                    
                    if filter_field is not None:
                        # Query by question_id if available, otherwise by question_number
                        if question_id:
                            answer = session.query(ExamLog).filter(
                                ExamLog.exam_detail_id == exam_id,
                                ExamLog.question_id == question_id
                            ).first()
                        else:
                            answer = session.query(ExamLog).filter(
                                ExamLog.exam_detail_id == exam_id,
                                ExamLog.question_number == question_number
                            ).first()
                        
                        if answer:
                            logger.debug(
                                "CORE_REPO_UPDATING_QUESTION_FEEDBACK",
                                exam_id=exam_id,
                                update_index=i,
                                question_id=question_id,
                                question_number=question_number,
                                has_feedback=feedback is not None,
                                has_is_correct=is_correct is not None
                            )
                            
                            if feedback is not None:
                                # Store feedback in feedback_data JSON field
                                if answer.feedback_data is None:
                                    answer.feedback_data = {}
                                answer.feedback_data["feedback"] = feedback
                            if is_correct is not None:
                                # Store is_correct in feedback_data JSON field
                                if answer.feedback_data is None:
                                    answer.feedback_data = {}
                                answer.feedback_data["is_correct"] = is_correct
                            
                            updated_count += 1
                        else:
                            logger.warning(
                                "CORE_REPO_QUESTION_NOT_FOUND_FOR_FEEDBACK",
                                exam_id=exam_id,
                                update_index=i,
                                question_id=question_id,
                                question_number=question_number
                            )
                    else:
                        logger.warning(
                            "CORE_REPO_NO_QUESTION_IDENTIFIER",
                            exam_id=exam_id,
                            update_index=i,
                            update_keys=list(update.keys())
                        )
                
                session.commit()
                
                logger.info(
                    "CORE_REPO_QUESTION_FEEDBACK_BATCH_UPDATED_SUCCESS",
                    exam_id=exam_id,
                    total_updates=len(feedback_updates),
                    successful_updates=updated_count
                )
                return True
        except Exception as e:
            logger.error(
                "CORE_REPO_BATCH_UPDATE_FEEDBACK_FAILED",
                exam_id=exam_id,
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    def reset_session_for_testing(self, session_id: str) -> bool:
        """Reset session for testing purposes - ONLY changes status, preserves answers"""
        try:
            with self.mysql_service.get_db() as session:
                # Reset exam detail status only - DO NOT DELETE ANSWERS
                exam = session.query(ExamDetail).filter(ExamDetail.id == session_id).first()
                if exam:
                    exam.status = 'completed'  # Reset to completed so it can be analyzed again
                    exam.analyzed_at = None     # Clear analyzed timestamp
                    exam.exam_summary = None    # Clear previous analysis results
                    exam.analysis_step = None   # Clear analysis step data
                    
                    logger.info(
                        "Session reset for testing - status changed to completed",
                        session_id=session_id,
                        previous_status=exam.status if hasattr(exam, 'status') else 'unknown'
                    )
                else:
                    logger.warning("Session not found for reset", session_id=session_id)
                    return False
                
                session.commit()
                
                logger.info("Session successfully reset for testing", session_id=session_id)
                return True
        except Exception as e:
            logger.error("Failed to reset session", session_id=session_id, error=str(e))
            return False

    # =================
    # QUESTIONS OPERATIONS
    # =================

    def get_questions_by_filters(
        self,
        language_id: Optional[str] = None,
        activity_type: Optional[str] = None,
        level: Optional[str] = None,
        limit: int = 10,
        exclude_question_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Get questions by various filters, optionally excluding already-used questions"""
        try:
            with self.mysql_service.get_db() as session:
                query = session.query(QuestionBank).filter(QuestionBank.is_active == True)
                
                # Filter by language_id directly
                if language_id:
                    query = query.filter(QuestionBank.language_id == language_id)
                
                if activity_type:
                    query = query.filter(QuestionBank.activity_type == activity_type)
                    # CRITICAL: Hearing & speaking questions MUST have audio_url
                    if activity_type in ('hearing', 'speaking'):
                        query = query.filter(QuestionBank.audio_url.isnot(None))
                        query = query.filter(QuestionBank.audio_url != '')
                
                if level:
                    query = query.filter(QuestionBank.level == level)
                
                # Exclude already-asked questions in this session
                if exclude_question_ids:
                    query = query.filter(~QuestionBank.id.in_(exclude_question_ids))
                
                questions = query.limit(limit).all()
                
                return [self._convert_question_to_dict(q) for q in questions]
        except Exception as e:
            logger.error("Failed to get questions by filters", error=str(e))
            return []

    def check_audio_activity_availability(self, language_id: str, level: str, activity_type: str = "hearing") -> bool:
        """Check if audio-based questions exist for language/level"""
        try:
            with self.mysql_service.get_db() as session:
                try:
                    activity_enum = ActivityTypeEnum(activity_type)
                except Exception:
                    activity_enum = activity_type
                query = session.query(func.count(QuestionBank.id)).filter(
                    QuestionBank.is_active == True,
                    QuestionBank.activity_type == activity_enum,
                )

                if language_id:
                    query = query.filter(QuestionBank.language_id == language_id)

                if level:
                    query = query.filter(QuestionBank.level == level)

                return (query.scalar() or 0) > 0
        except Exception as e:
            logger.error(
                "Failed to check hearing availability",
                language_id=language_id,
                level=level,
                error=str(e),
            )
            return False

    def get_available_activity_types(self, language_id: str, level: str) -> List[str]:
        """Get list of activity types with available questions"""
        try:
            with self.mysql_service.get_db() as session:
                query = (
                    session.query(
                        QuestionBank.activity_type,
                        func.count(QuestionBank.id).label("question_count"),
                    )
                    .filter(QuestionBank.is_active == True)
                )

                if language_id:
                    query = query.filter(QuestionBank.language_id == language_id)

                if level:
                    query = query.filter(QuestionBank.level == level)

                results = query.group_by(QuestionBank.activity_type).all()

                available: List[str] = []
                for activity, question_count in results:
                    if (question_count or 0) <= 0:
                        continue

                    if isinstance(activity, ActivityTypeEnum):
                        available.append(activity.value)
                    else:
                        available.append(str(activity))

                return available
        except Exception as e:
            logger.error(
                "Failed to get available activity types",
                language_id=language_id,
                level=level,
                error=str(e),
            )
            return []

    def _convert_question_to_dict(self, question: QuestionBank) -> dict:
        """Convert QuestionBank object to dictionary"""
        return {
            "id": question.id,
            "language_id": question.language_id,
            "level": question.level,
            "activity_type": question.activity_type,
            "question": question.question,
            "text": question.text,
            "options": question.options,
            "correct_answer": question.correct_answer,
            "correct_answer_reason": question.correct_answer_reason,
            "difficulty_level": question.difficulty_level,
            "instruction": question.instruction,
            "topic": question.topic,
            "requirements": question.requirements,
            "minimum_words": question.minimum_words,
            "writing_format": question.writing_format,
            "grammar_topic": question.grammar_topic,
            "task_type": question.task_type,
            "question_type": question.question_type,
            "tip": question.tip,
            "question_metadata": question.question_metadata,
            "audio_url": question.audio_url,  # NEW: Hearing field
            "transcript": question.transcript,  # NEW: Hearing field
            "is_active": question.is_active,
            "created_datetime": question.created_datetime.isoformat() if question.created_datetime is not None else None
        }

    def get_active_pricing_packs(self) -> List[Dict[str, Any]]:
        """Get all active pricing packs - 100% database dependent, no hardcoded mappings"""
        try:
            with self.mysql_service.get_db() as session:
                packs = session.query(PricingPack).filter(PricingPack.is_active == True).order_by(PricingPack.display_order).all()
                
                if not packs:
                    logger.error(
                        "CRITICAL: No active pricing packs found in database",
                        business_impact="All LLM operations will fail",
                        action_required="Activate at least one pricing pack in database"
                    )
                    raise Exception("No active pricing packs available")
                
                result = []
                for pack in packs:
                    # NOTE: llm_model validation removed (Nov 11, 2025)
                    # Only admin packs (pp_admin_ai) require llm_model for analysis
                    # User packs get models from credit_rules table, not pricing_packs
                    # pricing_packs is primarily for payment/subscription display
                    
                    pack_data = {
                        "id": str(pack.id),  # This is the pack_id used in user_access.current_pack_id
                        "pack_name": pack.pack_name,
                        "credits": pack.credits,
                        "price_euros": float(pack.price_euros) if pack.price_euros else 0,
                        "price_cents": pack.price_cents,
                        "description": pack.description,
                        "features": pack.features,
                        "is_popular": pack.is_popular,
                        "discount_percentage": pack.discount_percentage,
                        "stripe_price_id": pack.stripe_price_id,
                        "active": pack.is_active,
                        "llm_model": pack.llm_model,
                        # Use pack ID as plan_type for direct lookup - no mapping needed
                        "plan_type": str(pack.id)  # Direct ID-based lookup
                    }
                    
                    result.append(pack_data)
                
                logger.info(
                    "Active pricing packs loaded from database",
                    pack_count=len(result),
                    pack_ids=[p["id"] for p in result],
                    models=[p["llm_model"] for p in result]
                )
                return result
        except Exception as e:
            logger.error("Failed to get active pricing packs", error=str(e))
            return []

    def get_model_for_activity(
        self, 
        activity_type: str,
        language_id: Optional[str] = None,
        level: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get LLM model configuration for specific activity type from credit_rules table.
        Returns evaluation method (deterministic vs llm) and model details.
        
        NOTE: No fallback - all activities must have specific rules in database.
        This ensures purely database-driven routing without hardcoded logic.
        
        Args:
            activity_type: reading, writing, grammar, hearing
            language_id: Not used (reserved for future)
            level: Not used in V1 (uses first match regardless of level)
        
        Returns:
            Deterministic activities (reading, hearing):
            {
                "provider": "deterministic",
                "model": "rule-based",
                "config": {}
            }
            
            LLM activities (writing, grammar):
            {
                "provider": "openai",
                "model": "gpt-4o-mini" or "gpt-5-mini",
                "config": {}
            }
            
            OR None if no rule found
        
        Example:
            mapping = repo.get_model_for_activity("reading")
            # Returns: {"provider": "deterministic", "model": "rule-based", "config": {}}
            
            mapping = repo.get_model_for_activity("writing")
            # Returns: {"provider": "openai", "model": "gpt-5-mini", "config": {}}
        """
        try:
            with self.mysql_service.get_db() as session:
                # Query credit_rules for activity-specific model (exact match only)
                rule = session.query(CreditRule).filter(
                    CreditRule.activity_type == activity_type,
                    CreditRule.active == True
                ).first()
                
                if not rule:
                    logger.error(
                        "No credit rule found for activity",
                        activity_type=activity_type,
                        level=level,
                        action_required=f"Add credit_rule for {activity_type}",
                        business_impact="Session analysis will fail for this activity"
                    )
                    return None
                
                # Handle deterministic activities
                # evaluation_method='deterministic' means primary evaluation is rule-based
                # llm_model is optional fallback for short-answer questions only
                if rule.evaluation_method == 'deterministic':
                    logger.info(
                        "Deterministic activity configured",
                        activity_type=activity_type,
                        evaluation_method=rule.evaluation_method,
                        llm_fallback_model=rule.llm_model,
                        note="Primary: rule-based evaluation. LLM fallback for short-answer only"
                    )
                    # Always return deterministic provider (routing based on evaluation_method)
                    return {
                        "provider": "deterministic",
                        "model": "rule-based",  # Primary evaluation method
                        "llm_fallback_model": rule.llm_model,  # For short-answer questions
                        "llm_fallback_provider": rule.llm_provider if rule.llm_provider else "openai",
                        "config": {}
                    }
                
                # Handle LLM activities (llm_model must be set)
                if rule.llm_model is None:
                    logger.error(
                        "LLM activity missing model configuration",
                        activity_type=activity_type,
                        evaluation_method=rule.evaluation_method,
                        action_required=f"Set llm_model in credit_rules for {activity_type}",
                        business_impact="Cannot perform LLM evaluation"
                    )
                    return None
                
                result = {
                    "provider": rule.llm_provider if rule.llm_provider else "openai",
                    "model": rule.llm_model,
                    "config": {}
                }
                
                logger.info(
                    "LLM model found in credit_rules",
                    activity_type=activity_type,
                    provider=result["provider"],
                    model=result["model"],
                    evaluation_method=rule.evaluation_method
                )
                
                return result
                
        except Exception as e:
            logger.error(
                "Activity model lookup failed", 
                activity_type=activity_type,
                language_id=language_id,
                level=level,
                error=str(e),
                error_type=type(e).__name__
            )
            return None

    # =================
    # LOGGING OPERATIONS
    # =================

    def log_question_usage(self, question_id: str, user_id: str, 
                              activity_type: str, level: str, session_type: str) -> bool:
        """Log question usage to question_usage_log table"""
        try:
            usage_log = self.question_usage_log_ops.create(
                question_id=question_id,
                user_id=user_id,
                activity_type=activity_type,
                level=level,
                session_type=session_type,
                used_at=datetime.utcnow()
            )
            
            logger.info(
                "Question usage logged successfully via Core Repository",
                question_id=question_id,
                user_id=user_id,
                activity_type=activity_type,
                level=level,
                session_type=session_type
            )
            return True
            
        except Exception as e:
            logger.error(
                "Failed to log question usage via Core Repository",
                question_id=question_id,
                user_id=user_id,
                activity_type=activity_type,
                level=level,
                session_type=session_type,
                error=str(e)
            )
            return False

    def log_llm_request(self, user_id: Optional[str] = None, 
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
            llm_log = self.llm_log_ops.create(
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
                llm_metadata=metadata,
                created_at=datetime.utcnow()
            )
            
            logger.info(
                "LLM request logged successfully via Core Repository",
                user_id=user_id,
                session_id=session_id,
                model_used=model_used,
                status=status
            )
            return True
            
        except Exception as e:
            logger.error(
                "Failed to log LLM request via Core Repository",
                user_id=user_id,
                session_id=session_id,
                model_used=model_used,
                error=str(e)
            )
            return False

    # =================
    # SESSION MANAGEMENT
    # =================

    def create_session(self, session_data: Dict[str, Any]) -> str:
        """Create exam/practice session"""
        try:
            # Generate session ID if not provided
            if 'id' not in session_data:
                session_data['id'] = self.generate_id()
            if 'exam_id' not in session_data:
                session_data['exam_id'] = f"exam_{self.generate_id()}"
                
            exam_detail = self.exam_detail_ops.create(**session_data)
            logger.info("Session created via Core Repository", 
                       exam_id=exam_detail.exam_id, 
                       user_id=session_data.get('user_id'))
            return exam_detail.exam_id
        except Exception as e:
            logger.error("Failed to create session", error=str(e))
            raise Exception(f"CRITICAL: Session creation failed - {str(e)}")

    def save_answer(self, answer_data: Dict[str, Any]) -> bool:
        """Save user answer to exam log"""
        try:
            if 'id' not in answer_data:
                answer_data['id'] = self.generate_id()
                
            exam_log = self.exam_log_ops.create(**answer_data)
            logger.info("Answer saved via Core Repository", 
                       exam_id=answer_data.get('exam_id'),
                       question_number=answer_data.get('question_number'))
            return True
        except Exception as e:
            logger.error("Failed to save answer", error=str(e))
            return False

    # =================
    # SESSION SHARING
    # =================

    def create_session_share(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """
        Create a shareable link for a session
        
        Args:
            session_id: Session ID to share
            user_id: Owner of the session
            
        Returns:
            Dict with share_code and success status
        """
        from app.common.models.mysql_models import SessionShare
        from app.config import settings
        from datetime import datetime, timedelta
        import random
        import string
        
        try:
            with self.mysql_service.get_db() as session:
                # Check if an active share already exists for this session
                existing_share = session.query(SessionShare).filter(
                    SessionShare.session_id == session_id,
                    SessionShare.is_active == True
                ).first()
                
                # If active share exists and not expired, return it
                if existing_share:
                    if existing_share.expires_at and existing_share.expires_at > datetime.utcnow():
                        logger.info("Returning existing share code", session_id=session_id, share_code=existing_share.share_code)
                        return {
                            "success": True,
                            "share_code": existing_share.share_code,
                            "id": existing_share.id,
                            "expires_at": existing_share.expires_at.isoformat()
                        }
                    # If expired, deactivate it and create new one
                    existing_share.is_active = False
                    session.commit()
                
                # Generate unique 8-char alphanumeric code
                share_code = self._generate_share_code()
                
                # Check if code already exists (retry up to 5 times)
                for _ in range(5):
                    existing = session.query(SessionShare).filter(
                        SessionShare.share_code == share_code
                    ).first()
                    if not existing:
                        break
                    share_code = self._generate_share_code()
                
                # Calculate expiration time (default 72 hours)
                expires_at = datetime.utcnow() + timedelta(hours=settings.share_link_expiration_hours)
                
                # Create share record
                share_record = SessionShare(
                    id=self.generate_id(),
                    share_code=share_code,
                    session_id=session_id,
                    user_id=user_id,
                    is_active=True,
                    expires_at=expires_at
                )
                session.add(share_record)
                session.commit()
                
                logger.info(
                    "Share code created", 
                    session_id=session_id, 
                    share_code=share_code,
                    expires_at=expires_at.isoformat()
                )
                return {
                    "success": True,
                    "share_code": share_code,
                    "id": share_record.id,
                    "expires_at": expires_at.isoformat()
                }
        except Exception as e:
            logger.error("Failed to create share code", error=str(e))
            return {"success": False, "message": str(e)}

    def get_session_by_share_code(self, share_code: str) -> Optional[Dict[str, Any]]:
        """
        Get session details by share code (public access)
        Returns anonymized session data
        
        Args:
            share_code: Share code to look up
            
        Returns:
            Anonymized session dict or None
        """
        from app.common.models.mysql_models import SessionShare, ExamDetail
        from datetime import datetime
        
        try:
            with self.mysql_service.get_db() as session:
                share_record = session.query(SessionShare).filter(
                    SessionShare.share_code == share_code,
                    SessionShare.is_active == True
                ).first()
                
                if not share_record:
                    return None
                
                # Check if expired
                if share_record.expires_at and share_record.expires_at < datetime.utcnow():
                    logger.info("Share link expired", share_code=share_code, expires_at=share_record.expires_at.isoformat())
                    return None
                
                # Get session detail
                exam_detail = session.query(ExamDetail).filter(
                    ExamDetail.id == share_record.session_id
                ).first()
                
                if not exam_detail or exam_detail.status not in ['completed', 'analyzed']:
                    return None
                
                # Return anonymized data
                return self._anonymize_session_data(exam_detail)
        except Exception as e:
            logger.error("Failed to get session by share code", error=str(e))
            return None

    def get_answers_by_share_code(self, share_code: str) -> Optional[Dict[str, Any]]:
        """
        Get session answers by share code (public access)
        
        Args:
            share_code: Share code to look up
            
        Returns:
            Dict with answers and section_summaries
        """
        from app.common.models.mysql_models import SessionShare, ExamLog, ExamDetail
        from datetime import datetime
        
        try:
            with self.mysql_service.get_db() as session:
                share_record = session.query(SessionShare).filter(
                    SessionShare.share_code == share_code,
                    SessionShare.is_active == True
                ).first()
                
                if not share_record:
                    return None
                
                # Check if expired
                if share_record.expires_at and share_record.expires_at < datetime.utcnow():
                    logger.info("Share link expired", share_code=share_code, expires_at=share_record.expires_at.isoformat())
                    return None
                
                # Get answers
                answers = session.query(ExamLog).filter(
                    ExamLog.exam_detail_id == share_record.session_id
                ).order_by(ExamLog.question_number).all()
                
                # Get session detail for summaries
                exam_detail = session.query(ExamDetail).filter(
                    ExamDetail.id == share_record.session_id
                ).first()
                
                if not exam_detail:
                    return None
                
                return {
                    "answers": [self._anonymize_answer(ans) for ans in answers],
                    "section_summaries": exam_detail.exam_summary.get('activities', {}) if exam_detail.exam_summary else {}
                }
        except Exception as e:
            logger.error("Failed to get answers by share code", error=str(e))
            return None

    def _generate_share_code(self) -> str:
        """Generate 8-character alphanumeric code"""
        import random
        import string
        chars = string.ascii_uppercase + string.digits
        return ''.join(random.choice(chars) for _ in range(8))

    def _anonymize_session_data(self, exam_detail) -> Dict[str, Any]:
        """Remove sensitive user data from session"""
        from app.common.models.mysql_models import Language
        
        # Extract overall score from exam_summary if available
        overall_score = None
        if exam_detail.exam_summary and isinstance(exam_detail.exam_summary, dict):
            overall_data = exam_detail.exam_summary.get('overall', {})
            if isinstance(overall_data, dict):
                overall_score = overall_data.get('overall_score')
        
        # Get language information if available
        language_name = None
        language_code = None
        if exam_detail.language_id:
            try:
                with self.mysql_service.get_db() as session:
                    language = session.query(Language).filter(
                        Language.id == exam_detail.language_id
                    ).first()
                    if language:
                        language_name = language.name
                        language_code = language.code
            except Exception as e:
                logger.error("Failed to get language for shared session", 
                           language_id=exam_detail.language_id, error=str(e))
        
        return {
            "session_id": exam_detail.id,
            "session_name": exam_detail.exam_name,
            "session_type": exam_detail.session_type.value if hasattr(exam_detail.session_type, 'value') else exam_detail.session_type,
            "level": exam_detail.level,
            "status": exam_detail.status,
            "language_id": exam_detail.language_id,
            "language_name": language_name,  # Add language_name for display
            "language_code": language_code,  # Add language_code for compatibility
            "template": exam_detail.template,
            "exam_summary": exam_detail.exam_summary,
            "created_at": exam_detail.created_at.isoformat() if exam_detail.created_at else None,
            "completed_at": exam_detail.completed_at.isoformat() if exam_detail.completed_at else None,
            "analyzed_at": exam_detail.analyzed_at.isoformat() if exam_detail.analyzed_at else None,
            "overall_score": overall_score,  # Include overall score for display
            # Exclude: user_id, created_by_school_id, school_metadata
        }

    def _anonymize_answer(self, exam_log) -> Dict[str, Any]:
        """Remove sensitive user data from answer"""
        return {
            "question_id": exam_log.question_id,
            "question_number": exam_log.question_number,
            "activity_type": exam_log.activity_type,
            "question_data": exam_log.question_data,
            "user_answer": exam_log.user_answer,
            "feedback_data": exam_log.feedback_data,
            "answered_at": exam_log.answered_at.isoformat() if exam_log.answered_at else None,
            # Exclude: user_id, exam_detail_id
        }


def get_core_repository() -> CoreRepository:
    """Get CoreRepository instance"""
    return CoreRepository()
