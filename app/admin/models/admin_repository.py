"""
Admin Repository - ADMIN DOMAIN ADMIN-SPECIFIC OPERATIONS
Handles admin authentication, user management, question management, and analytics operations
Follows the repository pattern established in the user domain
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import structlog
import bcrypt
from sqlalchemy import or_, func, case, literal
from sqlalchemy.exc import IntegrityError

# Import shared base service
from app.common.models.mysql_odm_service import BaseMySQLODMService
from app.config import settings
from app.common.models.mysql_models import (
    AdminUser,
    QuestionBank,
    Language,
    CreditRule,
    PricingPack,
    School,
    User,
    UserAccess,
    ExamDetail,
    ExamLog,
    UsageLog,
    SchoolAdmin,
)

logger = structlog.get_logger()


class AdminRepository(BaseMySQLODMService):
    """
    Admin Repository - Admin Domain
    Handles all admin-specific database operations: authentication, user management, analytics
    """

    # =================
    # ADMIN AUTHENTICATION
    # =================

    def authenticate_admin(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate admin user with email and password"""
        try:
            with self.mysql_service.get_db() as session:
                admin = session.query(AdminUser).filter(AdminUser.email == email.lower()).first()
                
                if not admin:
                    return {"success": False, "message": "Invalid admin credentials"}
                
                # Verify password hash
                if not bcrypt.checkpw(password.encode('utf-8'), admin.password_hash.encode('utf-8')):
                    return {"success": False, "message": "Invalid admin credentials"}
                
                # Update last login
                admin.last_login = datetime.utcnow()
                session.commit()
                
                return {
                    "success": True,
                    "admin": {
                        "id": admin.id,
                        "email": admin.email,
                        "name": admin.name,
                        "role": admin.role.value if admin.role else None,
                        "permissions": admin.permissions,
                    },
                    "message": "Admin authentication successful",
                }
        except Exception as e:
            logger.error("Admin authentication failed", email=email, error=str(e))
            return {"success": False, "message": "Admin authentication failed"}

    def get_admin_by_id(self, admin_id: str) -> Optional[Dict[str, Any]]:
        """Get admin user by ID"""
        try:
            with self.mysql_service.get_db() as session:
                admin = session.query(AdminUser).filter(AdminUser.id == admin_id).first()
                
                if admin:
                    return {
                        "id": admin.id,
                        "email": admin.email,
                        "name": admin.name,
                        "role": admin.role.value if admin.role else None,
                        "is_active": admin.is_active,
                        "created_at": admin.created_at.isoformat() if admin.created_at else None,
                        "last_login": admin.last_login.isoformat() if admin.last_login else None,
                        "permissions": admin.permissions,
                        "password_hash": admin.password_hash,  # Include for password verification
                    }
                return None
        except Exception as e:
            logger.error("Failed to get admin by ID", admin_id=admin_id, error=str(e))
            return None

    def create_admin_user(self, email: str, password_hash: str, name: str, role: str = "admin") -> Dict[str, Any]:
        """Create new admin user"""
        try:
            with self.mysql_service.get_db() as session:
                # Check if admin already exists
                existing_admin = session.query(AdminUser).filter(AdminUser.email == email.lower()).first()
                if existing_admin:
                    return {"success": False, "message": "Admin user already exists"}
                
                # Create admin user
                admin_data = {
                    "id": self.generate_id(),
                    "email": email.lower(),
                    "name": name,
                    "password_hash": password_hash,
                    "role": role,
                    "permissions": ["read", "write", "admin"],  # Default permissions
                    "created_at": datetime.utcnow(),
                    "last_login": datetime.utcnow(),
                    "is_active": True,
                }
                
                admin = AdminUser(**admin_data)
                session.add(admin)
                session.commit()
                
                logger.info("Admin user created", admin_id=admin.id, email=email)
                
                return {
                    "success": True,
                    "admin_id": admin.id,
                    "message": "Admin user created successfully",
                }
        except IntegrityError:
            return {"success": False, "message": "Admin user already exists"}
        except Exception as e:
            logger.error("Failed to create admin user", email=email, error=str(e))
            return {"success": False, "message": "Failed to create admin user"}

    def change_admin_password(self, admin_id: str, new_password_hash: str) -> Dict[str, Any]:
        """Change admin password"""
        try:
            with self.mysql_service.get_db() as session:
                admin = session.query(AdminUser).filter(AdminUser.id == admin_id).first()
                if not admin:
                    return {"success": False, "message": "Admin not found"}
                
                admin.password_hash = new_password_hash
                session.commit()
                
                logger.info("Admin password changed", admin_id=admin_id)
                return {"success": True, "message": "Password changed successfully"}
        except Exception as e:
            logger.error("Failed to change admin password", admin_id=admin_id, error=str(e))
            return {"success": False, "message": "Failed to change password"}

    # =================
    # USER MANAGEMENT
    # =================

    def get_all_users(self, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        """Get all users with pagination"""
        try:
            with self.mysql_service.get_db() as session:
                users = session.query(User).offset(skip).limit(limit).all()
                
                result = []
                for user in users:
                    # Get user access info
                    user_access = session.query(UserAccess).filter(UserAccess.user_id == user.id).first()
                    
                    user_data = {
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                        "is_active": user.is_active,
                        "email_verified": user.email_verified,
                        "firebase_uid": user.firebase_uid,
                        "created_at": user.created_at.isoformat() if user.created_at else None,
                        "last_login": user.last_login.isoformat() if user.last_login else None,
                        "preferred_language_id": user.preferred_language_id,
                        "current_level": user.current_level,
                        "school_id": user.school_id,
                    }
                    
                    if user_access:
                        user_data["access"] = {
                            "id": user_access.id,
                            "allocated_count": user_access.allocated_count,
                            "used_count": user_access.used_count,
                            "plan_type": user_access.current_pack_id if user_access.current_pack_id else settings.default_plan_type,
                            "status": user_access.status.value if user_access.status else "available",
                            "reserved_credits": user_access.reserved_credits,
                            "reset_at": user_access.reset_at.isoformat() if user_access.reset_at else None,
                            "last_used": user_access.last_used.isoformat() if user_access.last_used else None,
                        }
                    
                    result.append(user_data)
                
                return result
        except Exception as e:
            logger.error("Failed to get all users", error=str(e))
            return []


    def get_user_details(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed user information including access"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.id == user_id).first()
                if not user:
                    return None
                
                user_access = session.query(UserAccess).filter(UserAccess.user_id == user_id).first()
                
                # Get school info if available
                school = None
                if user.school_id:
                    school = session.query(School).filter(School.id == user.school_id).first()
                
                user_data = {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "is_active": user.is_active,
                    "email_verified": user.email_verified,
                    "firebase_uid": user.firebase_uid,
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "last_login": user.last_login.isoformat() if user.last_login else None,
                    "preferred_language_id": user.preferred_language_id,
                    "current_level": user.current_level,
                    "school_id": user.school_id,
                    "school_name": school.name if school else None,
                    "phone_number": user.phone_number,
                    "favorite_activities": user.favorite_activities,
                    "daily_goal": user.daily_goal,
                }
                
                if user_access:
                    user_data["access"] = {
                        "id": user_access.id,
                        "allocated_count": user_access.allocated_count,
                        "used_count": user_access.used_count,
                        "plan_type": user_access.current_pack_id if user_access.current_pack_id else settings.default_plan_type,
                        "status": user_access.status.value if user_access.status else "available",
                        "reserved_credits": user_access.reserved_credits,
                        "reset_at": user_access.reset_at.isoformat() if user_access.reset_at else None,
                        "last_used": user_access.last_used.isoformat() if user_access.last_used else None,
                        "created_at": user_access.created_at.isoformat() if user_access.created_at else None,
                    }
                
                return user_data
        except Exception as e:
            logger.error("Failed to get user details", user_id=user_id, error=str(e))
            return None

    def search_users(self, search_term: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search users by email or name"""
        try:
            with self.mysql_service.get_db() as session:
                search_pattern = f"%{search_term}%"
                users = session.query(User).filter(
                    or_(
                        User.email.like(search_pattern),
                        User.name.like(search_pattern)
                    )
                ).limit(limit).all()
                
                result = []
                for user in users:
                    user_access = session.query(UserAccess).filter(UserAccess.user_id == user.id).first()
                    
                    user_data = {
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                        "is_active": user.is_active,
                        "email_verified": user.email_verified,
                        "created_at": user.created_at.isoformat() if user.created_at else None,
                        "last_login": user.last_login.isoformat() if user.last_login else None,
                    }
                    
                    if user_access:
                        user_data["access"] = {
                            "allocated_count": user_access.allocated_count,
                            "used_count": user_access.used_count,
                            "plan_type": user_access.current_pack_id if user_access.current_pack_id else settings.default_plan_type,
                        }
                    
                    result.append(user_data)
                
                return result
        except Exception as e:
            logger.error("Failed to search users", search_term=search_term, error=str(e))
            return []





    def flush_user_data(self, user_id: str, admin_id: str) -> Dict[str, Any]:
        """Flush/delete user data"""
        try:
            with self.mysql_service.get_db() as session:
                # Delete user answers
                session.query(ExamLog).filter(ExamLog.user_id == user_id).delete()
                
                # Delete user exam details
                session.query(ExamDetail).filter(ExamDetail.user_id == user_id).delete()
                
                # Delete user usage logs
                session.query(UsageLog).filter(UsageLog.user_id == user_id).delete()
                
                # Delete user access
                session.query(UserAccess).filter(UserAccess.user_id == user_id).delete()
                
                # Delete user
                user_deleted = session.query(User).filter(User.id == user_id).delete()
                
                session.commit()
                
                logger.info("User data flushed", user_id=user_id, admin_id=admin_id)
                return {"success": True, "message": f"User data deleted. Deleted user: {user_deleted > 0}"}
        except Exception as e:
            logger.error("Failed to flush user data", user_id=user_id, error=str(e))
            return {"success": False, "message": str(e)}

    # =================
    # QUESTION MANAGEMENT
    # =================

    def save_bulk_questions(self, questions: List[Dict[str, Any]], generated_by: str = "admin") -> Dict[str, Any]:
        """Save bulk questions to database"""
        try:
            with self.mysql_service.get_db() as session:
                saved_count = 0
                errors = []
                
                for question_data in questions:
                    try:
                        # Generate ID if not provided
                        if 'id' not in question_data:
                            question_data['id'] = self.generate_id()
                        
                        # Set metadata
                        question_data['generated_by_admin'] = generated_by
                        question_data['generation_method'] = 'bulk_admin'
                        question_data['created_datetime'] = datetime.utcnow()
                        question_data['is_active'] = True
                        
                        question = QuestionBank(**question_data)
                        session.add(question)
                        saved_count += 1
                        
                    except Exception as e:
                        errors.append(f"Failed to save question: {str(e)}")
                        continue
                
                session.commit()
                
                logger.info("Bulk questions saved", saved_count=saved_count, total_count=len(questions), errors_count=len(errors))
                
                return {
                    "success": True,
                    "saved_count": saved_count,
                    "total_count": len(questions),
                    "errors": errors
                }
        except Exception as e:
            logger.error("Failed to save bulk questions", error=str(e))
            return {"success": False, "message": "Failed to save bulk questions"}

    def get_questions_by_filters(self, language_id: Optional[str] = None,
                               activity_type: Optional[str] = None,
                               level: Optional[str] = None,
                               limit: int = 100,
                               skip: int = 0,
                               created_from: Optional[datetime] = None,
                               created_to: Optional[datetime] = None,
                               has_audio: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Get questions with filters"""
        try:
            with self.mysql_service.get_db() as session:
                # Join with Language table to get language name and code
                query = session.query(QuestionBank, Language).join(
                    Language, QuestionBank.language_id == Language.id
                ).filter(QuestionBank.is_active.is_(True))
                
                if language_id:
                    query = query.filter(QuestionBank.language_id == language_id)
                if activity_type:
                    query = query.filter(QuestionBank.activity_type == activity_type)
                if level:
                    query = query.filter(QuestionBank.level == level)
                if created_from:
                    query = query.filter(QuestionBank.created_datetime >= created_from)
                if created_to:
                    query = query.filter(QuestionBank.created_datetime < created_to)
                
                # Filter by audio_url presence
                if has_audio is not None:
                    if has_audio:
                        query = query.filter(QuestionBank.audio_url.isnot(None))
                        query = query.filter(QuestionBank.audio_url != '')
                    else:
                        query = query.filter((QuestionBank.audio_url.is_(None)) | (QuestionBank.audio_url == ''))

                results = query.order_by(QuestionBank.created_datetime.desc()).offset(skip).limit(limit).all()
                
                result = []
                for question, language in results:
                    result.append(self._convert_question_to_dict(question, language))
                
                return result
        except Exception as e:
            logger.error("Failed to get questions by filters", error=str(e))
            return []

    def delete_question(self, question_id: str) -> Dict[str, Any]:
        """Delete question (soft delete by setting is_active=False)"""
        try:
            with self.mysql_service.get_db() as session:
                question = session.query(QuestionBank).filter(QuestionBank.id == question_id).first()
                
                if question:
                    question.is_active = False
                    session.commit()
                    
                    logger.info("Question soft deleted", question_id=question_id)
                    return {"success": True, "message": "Question deleted successfully"}
                else:
                    return {"success": False, "message": "Question not found"}
        except Exception as e:
            logger.error("Failed to delete question", question_id=question_id, error=str(e))
            return {"success": False, "message": "Failed to delete question"}

    def bulk_delete_questions_by_ids(self, question_ids: List[str]) -> Dict[str, Any]:
        """Bulk delete questions by IDs"""
        try:
            with self.mysql_service.get_db() as session:
                deleted_count = session.query(QuestionBank).filter(QuestionBank.id.in_(question_ids)).delete()
                session.commit()
                
                logger.info("Bulk questions deleted", count=deleted_count)
                return {"success": True, "deleted_count": deleted_count, "message": f"Deleted {deleted_count} questions"}
        except Exception as e:
            logger.error("Failed to bulk delete questions", error=str(e))
            return {"success": False, "message": str(e)}

    # =================
    # ANALYTICS & REPORTING
    # =================

    def get_user_statistics(self) -> Dict[str, Any]:
        """Get user statistics for admin dashboard"""
        try:
            with self.mysql_service.get_db() as session:
                # Total users
                total_users = session.query(func.count(User.id)).scalar()
                
                # Active users (logged in last 30 days)
                thirty_days_ago = datetime.utcnow() - timedelta(days=30)
                active_users = session.query(func.count(User.id)).filter(
                    User.last_login >= thirty_days_ago
                ).scalar()
                
                # Users by plan type
                plan_stats = session.query(
                    UserAccess.current_pack_id, 
                    func.count(UserAccess.id)
                ).group_by(UserAccess.current_pack_id).all()
                
                # Total sessions
                total_sessions = session.query(func.count(ExamDetail.id)).scalar()
                
                # Sessions by type
                session_stats = session.query(
                    ExamDetail.session_type,
                    func.count(ExamDetail.id)
                ).group_by(ExamDetail.session_type).all()
                
                return {
                    "total_users": total_users or 0,
                    "active_users": active_users or 0,
                    "plan_distribution": {plan.value if hasattr(plan, 'value') else plan: count for plan, count in plan_stats},
                    "total_sessions": total_sessions or 0,
                    "session_distribution": {session_type.value if hasattr(session_type, 'value') else session_type: count 
                                           for session_type, count in session_stats},
                    "generated_at": datetime.utcnow().isoformat()
                }
        except Exception as e:
            logger.error("Failed to get user statistics", error=str(e))
            return {}

    def get_question_statistics(self) -> Dict[str, Any]:
        """Get question bank statistics"""
        try:
            with self.mysql_service.get_db() as session:
                # Total questions
                total_questions = session.query(func.count(QuestionBank.id)).filter(
                    QuestionBank.is_active.is_(True)
                ).scalar()
                
                # Questions by activity type
                activity_stats = session.query(
                    QuestionBank.activity_type,
                    func.count(QuestionBank.id)
                ).filter(QuestionBank.is_active.is_(True)).group_by(QuestionBank.activity_type).all()
                
                # Questions by level
                level_stats = session.query(
                    QuestionBank.level,
                    func.count(QuestionBank.id)
                ).filter(QuestionBank.is_active.is_(True)).group_by(QuestionBank.level).all()
                
                # Questions by language
                language_stats = session.query(
                    QuestionBank.language_id,
                    func.count(QuestionBank.id)
                ).filter(QuestionBank.is_active.is_(True)).group_by(QuestionBank.language_id).all()
                
                return {
                    "total_questions": total_questions or 0,
                    "activity_distribution": {activity.value if hasattr(activity, 'value') else activity: count 
                                            for activity, count in activity_stats},
                    "level_distribution": {level.value if hasattr(level, 'value') else level: count 
                                         for level, count in level_stats},
                    "language_distribution": {lang.value if hasattr(lang, 'value') else lang: count 
                                            for lang, count in language_stats},
                    "generated_at": datetime.utcnow().isoformat()
                }
        except Exception as e:
            logger.error("Failed to get question statistics", error=str(e))
            return {}

    def _normalize_level_code(self, level_value: Any) -> str:
        """Normalise various level string formats (e.g., 'LevelEnum.A1') to simple codes."""
        if level_value is None:
            return ""

        code = str(level_value).strip()
        if not code:
            return ""

        # Handle enum style strings like "LevelEnum.A1" or "LevelEnum_Level_A1"
        if "." in code:
            code = code.split(".")[-1]
        if "_" in code:
            fragments = [fragment for fragment in code.split("_") if fragment]
            if fragments:
                code = fragments[-1]

        code = code.upper()

        known_levels = {"A1", "A2", "B1", "B2", "C1", "C2"}
        if code in known_levels:
            return code

        # Drop common prefixes/suffixes and retry
        for prefix in ("LEVEL", "LEVELENUM", "CEFR"):
            if code.startswith(prefix):
                trimmed = code[len(prefix):]
                if trimmed in known_levels:
                    return trimmed

        return code

    def _normalize_activity_type(self, activity_value: Any) -> str:
        """Convert enum-style activity strings to canonical lowercase identifiers."""
        if activity_value is None:
            return ""

        code = str(activity_value).strip()
        if not code:
            return ""

        # Strip enum prefixes (e.g., ActivityTypeEnum.reading)
        if "." in code:
            code = code.split(".")[-1]

        # Collapse snake_case or upper-case variants
        code = code.replace("-", "_")
        fragments = [fragment for fragment in code.split("_") if fragment]
        if fragments:
            code = fragments[-1]

        return code.lower()

    def get_question_dashboard_summary(self, language_id: Optional[str] = None) -> Dict[str, Any]:
        """Aggregate question counts for dashboard view, scoped to a single language"""
        try:
            with self.mysql_service.get_db() as session:
                languages = (
                    session.query(Language)
                    .filter(Language.is_active.is_(True))
                    .order_by(Language.display_order.asc(), Language.name.asc())
                    .all()
                )

                if not languages:
                    return {
                        "available_languages": [],
                        "language_summary": None,
                        "selected_language_id": None,
                        "generated_at": datetime.utcnow().isoformat(),
                    }

                available_languages: List[Dict[str, Any]] = [
                    {
                        "id": language.id,
                        "name": language.name,
                        "native_name": language.native_name,
                    }
                    for language in languages
                ]

                selected_language = None
                if language_id:
                    for language in languages:
                        if str(language.id) == str(language_id):
                            selected_language = language
                            break

                    if selected_language is None:
                        logger.warning(
                            "Requested language_id not found in active languages",
                            requested_language_id=language_id,
                        )

                if selected_language is None:
                    return {
                        "available_languages": available_languages,
                        "language_summary": None,
                        "selected_language_id": None,
                        "generated_at": datetime.utcnow().isoformat(),
                    }

                reviewed_flag = func.lower(
                    func.json_unquote(
                        func.json_extract(QuestionBank.question_metadata, '$.reviewed')
                    )
                )

                # Get basic stats grouped by language and level
                raw_stats = (
                    session.query(
                        QuestionBank.level,
                        func.count(QuestionBank.id).label("total_count"),
                        func.sum(
                            case(
                                (reviewed_flag == literal("true"), 1),
                                else_=0,
                            )
                        ).label("reviewed_count"),
                    )
                    .filter(QuestionBank.is_active.is_(True))
                    .filter(QuestionBank.language_id == selected_language.id)
                    .group_by(QuestionBank.level)
                    .all()
                )

                # Get activity type breakdown grouped by language, level, and activity_type
                activity_stats = (
                    session.query(
                        QuestionBank.level,
                        QuestionBank.activity_type,
                        func.count(QuestionBank.id).label("total_count"),
                        func.sum(
                            case(
                                (reviewed_flag == literal("true"), 1),
                                else_=0,
                            )
                        ).label("reviewed_count"),
                    )
                    .filter(QuestionBank.is_active.is_(True))
                    .filter(QuestionBank.language_id == selected_language.id)
                    .group_by(QuestionBank.level, QuestionBank.activity_type)
                    .all()
                )

                # Build main stats map keyed by level
                stats_map: Dict[str, Dict[str, int]] = {}
                for level_code_raw, total_count, reviewed_count in raw_stats:
                    level_code = self._normalize_level_code(level_code_raw)
                    level_bucket = stats_map.setdefault(level_code, {"total": 0, "ready": 0})
                    level_bucket["total"] += int(total_count or 0)
                    level_bucket["ready"] += int(reviewed_count or 0)

                # Build activity type breakdown map keyed by level
                activity_map: Dict[str, Dict[str, Dict[str, int]]] = {}
                for level_code_raw, activity_type, total_count, reviewed_count in activity_stats:
                    level_code = self._normalize_level_code(level_code_raw)
                    level_bucket = activity_map.setdefault(level_code, {})
                    activity_key = self._normalize_activity_type(activity_type)
                    if not activity_key:
                        continue

                    activity_bucket = level_bucket.setdefault(
                        activity_key,
                        {"total": 0, "ready": 0, "pending_review": 0},
                    )

                    total = int(total_count or 0)
                    ready = int(reviewed_count or 0)

                    activity_bucket["total"] = total
                    activity_bucket["ready"] = ready
                    activity_bucket["pending_review"] = max(total - ready, 0)

                # Determine supported levels for the selected language
                supported_levels_raw = selected_language.supported_levels or []
                supported_level_codes: List[str] = []

                if isinstance(supported_levels_raw, list):
                    for entry in supported_levels_raw:
                        if isinstance(entry, dict) and entry.get("code"):
                            supported_level_codes.append(self._normalize_level_code(entry["code"]))
                        elif isinstance(entry, str):
                            supported_level_codes.append(self._normalize_level_code(entry))
                elif isinstance(supported_levels_raw, str):
                    try:
                        import json

                        decoded_levels = json.loads(supported_levels_raw)
                        if isinstance(decoded_levels, list):
                            for entry in decoded_levels:
                                if isinstance(entry, dict) and entry.get("code"):
                                    supported_level_codes.append(self._normalize_level_code(entry["code"]))
                                elif isinstance(entry, str):
                                    supported_level_codes.append(self._normalize_level_code(entry))
                    except Exception:
                        supported_level_codes = []

                if not supported_level_codes:
                    supported_level_codes = ["A1", "A2", "B1"]

                known_levels = list(stats_map.keys())
                level_order = supported_level_codes + [
                    level for level in known_levels if level not in supported_level_codes
                ]

                totals_total = 0
                totals_ready = 0
                levels_payload: List[Dict[str, Any]] = []

                for level_code in level_order:
                    level_counts = stats_map.get(level_code, {"total": 0, "ready": 0})
                    level_total = level_counts.get("total", 0)
                    level_ready = level_counts.get("ready", 0)
                    level_pending = max(level_total - level_ready, 0)

                    # Get activity type breakdown for this level
                    level_activities = activity_map.get(level_code, {})
                    by_activity_type = {
                        activity_type: activity_stats
                        for activity_type, activity_stats in level_activities.items()
                        if activity_stats.get("total", 0) > 0
                    }

                    level_payload: Dict[str, Any] = {
                        "level": level_code,
                        "totals": {
                            "total": level_total,
                            "ready": level_ready,
                            "pending_review": level_pending,
                        },
                    }

                    if by_activity_type:
                        level_payload["by_activity_type"] = by_activity_type

                    levels_payload.append(level_payload)

                    totals_total += level_total
                    totals_ready += level_ready

                language_summary = {
                    "language_id": selected_language.id,
                    "language_name": selected_language.name,
                    "native_name": selected_language.native_name,
                    "totals": {
                        "total": totals_total,
                        "ready": totals_ready,
                        "pending_review": max(totals_total - totals_ready, 0),
                    },
                    "levels": levels_payload,
                }

                return {
                    "available_languages": available_languages,
                    "language_summary": language_summary,
                    "selected_language_id": selected_language.id,
                    "generated_at": datetime.utcnow().isoformat(),
                }

        except Exception as e:
            logger.error("Failed to build dashboard summary", error=str(e))
            return {
                "available_languages": [],
                "language_summary": None,
                "selected_language_id": None,
                "generated_at": datetime.utcnow().isoformat(),
                "error": str(e),
            }

    # =================
    # CREDIT & PRICING MANAGEMENT
    # =================

    def get_credit_rules(self) -> List[Dict[str, Any]]:
        """Get all credit rules"""
        try:
            with self.mysql_service.get_db() as session:
                rules = session.query(CreditRule).filter(CreditRule.active.is_(True)).order_by(CreditRule.session_type).all()
                
                result = []
                for rule in rules:
                    result.append({
                        "id": rule.id,
                        "session_type": rule.session_type.value if rule.session_type else None,
                        "activity_type": rule.activity_type.value if rule.activity_type else None,
                        "level": rule.level.value if hasattr(rule.level, 'value') else rule.level,
                        "points_cost": rule.points_cost,
                        "description": rule.description,
                        "active": rule.active,
                        "created_at": rule.created_at.isoformat() if rule.created_at else None,
                        "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
                    })
                
                return result
        except Exception as e:
            logger.error("Failed to get credit rules", error=str(e))
            return []

    def update_credit_rule(self, rule_id: str, points_cost: int) -> Dict[str, Any]:
        """Update credit rule points cost"""
        try:
            with self.mysql_service.get_db() as session:
                rule = session.query(CreditRule).filter(CreditRule.id == rule_id).first()
                
                if rule:
                    rule.points_cost = points_cost
                    rule.updated_at = datetime.utcnow()
                    session.commit()
                    
                    logger.info("Credit rule updated", rule_id=rule_id, points_cost=points_cost)
                    return {"success": True, "message": "Credit rule updated successfully"}
                else:
                    return {"success": False, "message": "Credit rule not found"}
        except Exception as e:
            logger.error("Failed to update credit rule", rule_id=rule_id, error=str(e))
            return {"success": False, "message": "Failed to update credit rule"}

    def get_pricing_packs(self) -> List[Dict[str, Any]]:
        """Get all pricing packs"""
        try:
            with self.mysql_service.get_db() as session:
                packs = session.query(PricingPack).filter(PricingPack.is_active == True).order_by(PricingPack.display_order).all()
                
                result = []
                for pack in packs:
                    # Determine plan type based on credits or price
                    if pack.credits >= 1000:
                        plan_type = "monthly"
                    elif pack.credits >= 500:
                        plan_type = "monthly"
                    elif pack.credits >= 200:
                        plan_type = "monthly"
                    elif pack.credits >= 50:
                        plan_type = "monthly"
                    else:
                        plan_type = "one-time"
                    
                    # Generate usage example based on credits
                    if pack.credits >= 1000:
                        usage_example = "For intensive language study"
                    elif pack.credits >= 500:
                        usage_example = "Best value for dedicated learners"
                    elif pack.credits >= 200:
                        usage_example = "Most popular choice for regular practice"
                    elif pack.credits >= 50:
                        usage_example = "Perfect for trying out the platform"
                    else:
                        usage_example = "Great for getting started"
                    
                    result.append({
                        "pack_name": pack.pack_name,
                        "price_euros": float(pack.price_euros) if pack.price_euros else 0.0,
                        "points_included": pack.credits,
                        "plan_type": plan_type,
                        "llm_model": pack.llm_model,
                        "usage_example": usage_example,
                        "description": pack.description or "",
                        "popular": bool(pack.is_popular),
                        "is_active": bool(pack.is_active),
                    })
                
                return result
        except Exception as e:
            logger.error("Failed to get pricing packs", error=str(e))
            return []

    def get_pricing_pack_by_id(self, pack_id: str) -> Dict[str, Any]:
        """Get a specific pricing pack by ID, ensuring it is active"""
        try:
            with self.mysql_service.get_db() as session:
                pack = (
                    session.query(PricingPack)
                    .filter(PricingPack.id == pack_id)
                    .first()
                )

                if not pack:
                    message = f"Pricing pack '{pack_id}' not found"
                    logger.error("Pricing pack missing", pack_id=pack_id)
                    raise ValueError(message)

                if not pack.is_active:
                    message = f"Pricing pack '{pack_id}' is inactive"
                    logger.error(
                        "Pricing pack inactive",
                        pack_id=pack_id,
                        is_active=pack.is_active,
                    )
                    raise ValueError(message)

                return {
                    "id": pack.id,
                    "pack_name": pack.pack_name,
                    "llm_model": pack.llm_model,
                    "active": bool(pack.is_active),
                }
        except ValueError:
            raise
        except Exception as e:
            logger.error(
                "Failed to fetch pricing pack",
                pack_id=pack_id,
                error=str(e),
            )
            raise


    # =================
    # QUESTION BANK OPERATIONS (for AdminQuestionBankService)
    # =================
    
    def get_random_questions_by_filters(self, language_id: Optional[str] = None,
                                      activity_type: Optional[str] = None,
                                      level: Optional[str] = None,
                                      limit: int = 100) -> List[Dict[str, Any]]:
        """Get random questions with filters for question bank service"""
        try:
            with self.mysql_service.get_db() as session:
                # Join with Language table to get language name and code
                query = session.query(QuestionBank, Language).join(
                    Language, QuestionBank.language_id == Language.id
                ).filter(QuestionBank.is_active.is_(True))
                
                if language_id:
                    query = query.filter(QuestionBank.language_id == language_id)
                if activity_type:
                    query = query.filter(QuestionBank.activity_type == activity_type)
                if level:
                    query = query.filter(QuestionBank.level == level)
                
                # Order randomly for random selection
                results = query.order_by(func.random()).limit(limit).all()
                
                result = []
                for question, language in results:
                    result.append(self._convert_question_to_dict(question, language))
                
                return result
        except Exception as e:
            logger.error("Failed to get random questions by filters", error=str(e))
            return []

    def save_single_question(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a single question to the database after sanitising payload"""
        try:
            with self.mysql_service.get_db() as session:
                # Work on a copy to avoid mutating caller state
                payload = dict(question_data)

                # Generate ID if not provided
                if "id" not in payload:
                    payload["id"] = self.generate_id()

                # Normalise metadata container
                metadata = payload.get("question_metadata") or {}
                if not isinstance(metadata, dict):
                    metadata = {"raw_metadata": metadata}

                # Split allowed columns vs. extras so SQLAlchemy only receives valid kwargs
                allowed_columns = {column.name for column in QuestionBank.__table__.columns}
                sanitised_data: Dict[str, Any] = {}
                extra_fields: Dict[str, Any] = {}

                for key, value in payload.items():
                    if key in allowed_columns:
                        sanitised_data[key] = value
                    else:
                        extra_fields[key] = value

                if extra_fields:
                    metadata.update(extra_fields)

                sanitised_data["question_metadata"] = metadata

                # Set defaults
                sanitised_data.setdefault("created_datetime", datetime.utcnow())
                sanitised_data.setdefault("is_active", True)

                question = QuestionBank(**sanitised_data)
                session.add(question)
                session.commit()

                logger.info("Single question saved", question_id=question.id)

                return {
                    "success": True,
                    "question_id": question.id,
                    "message": "Question saved successfully"
                }
        except Exception as e:
            logger.error("Failed to save single question", error=str(e))
            return {"success": False, "message": f"Failed to save question: {str(e)}"}

    def update_question(self, question_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a question by ID"""
        try:
            with self.mysql_service.get_db() as session:
                question = session.query(QuestionBank).filter(
                    QuestionBank.id == question_id,
                    QuestionBank.is_active.is_(True)
                ).first()
                
                if not question:
                    return {"success": False, "message": "Question not found"}
                
                # Update fields
                for field, value in update_data.items():
                    if hasattr(question, field):
                        setattr(question, field, value)
                
                # Add modification timestamp
                question.modified_datetime = datetime.utcnow()
                session.commit()
                
                logger.info("Question updated", question_id=question_id)
                
                return {
                    "success": True,
                    "message": "Question updated successfully",
                    "question_id": question_id
                }
        except Exception as e:
            logger.error("Failed to update question", question_id=question_id, error=str(e))
            return {"success": False, "message": f"Failed to update question: {str(e)}"}
    
    def update_question_audio_url(self, question_id: str, audio_url: Optional[str]) -> Dict[str, Any]:
        """
        Update audio_url for a hearing question
        Used by audio generation service after uploading to S3
        Pass None to clear the audio_url
        """
        try:
            with self.mysql_service.get_db() as session:
                question = session.query(QuestionBank).filter(
                    QuestionBank.id == question_id
                ).first()
                
                if not question:
                    return {
                        "success": False,
                        "message": f"Question {question_id} not found"
                    }
                
                # Update audio URL
                question.audio_url = audio_url
                question.modified_datetime = datetime.utcnow()
                session.commit()
                
                logger.info("Question audio URL updated", 
                           question_id=question_id, 
                           audio_url=audio_url)
                
                return {
                    "success": True,
                    "message": "Audio URL updated successfully",
                    "question_id": question_id,
                    "audio_url": audio_url
                }
        except Exception as e:
            logger.error("Failed to update audio URL", 
                        question_id=question_id, 
                        error=str(e))
            return {
                "success": False,
                "message": f"Failed to update audio URL: {str(e)}"
            }

    def get_question_by_id(self, question_id: str) -> Dict[str, Any]:
        """
        Retrieve a single question by ID along with language metadata.

        Returns a payload compatible with admin services (`success` flag and `data` key).
        """
        try:
            with self.mysql_service.get_db() as session:
                result = (
                    session.query(QuestionBank, Language)
                    .join(Language, QuestionBank.language_id == Language.id, isouter=True)
                    .filter(QuestionBank.id == question_id)
                    .first()
                )

                if not result:
                    return {
                        "success": False,
                        "message": f"Question {question_id} not found"
                    }

                question, language = result
                question_data = self._convert_question_to_dict(question, language)

                return {
                    "success": True,
                    "data": question_data,
                    "question_id": question_id
                }
        except Exception as e:
            logger.error("Failed to get question by ID", question_id=question_id, error=str(e))
            return {
                "success": False,
                "message": f"Failed to fetch question: {str(e)}"
            }

    def find_question_by_id(self, question_id: str) -> Dict[str, Any]:
        """Find a question by ID"""
        try:
            with self.mysql_service.get_db() as session:
                result = session.query(QuestionBank, Language).join(
                    Language, QuestionBank.language_id == Language.id
                ).filter(
                    QuestionBank.id == question_id,
                    QuestionBank.is_active.is_(True)
                ).first()
                
                if result:
                    question, language = result
                    return {
                        "success": True,
                        "found": True,
                        "question": self._convert_question_to_dict(question, language)
                    }
                else:
                    return {
                        "success": True,
                        "found": False,
                        "message": "Question not found"
                    }
        except Exception as e:
            logger.error("Failed to find question by ID", question_id=question_id, error=str(e))
            return {"success": False, "message": str(e)}

    def log_question_usage(self, question_id: str, user_id: str, activity_type: str, 
                          level: str, session_type: str) -> None:
        """Log question usage event"""
        try:
            with self.mysql_service.get_db() as session:
                # Update question usage count
                question = session.query(QuestionBank).filter(
                    QuestionBank.id == question_id,
                    QuestionBank.is_active.is_(True)
                ).first()
                
                if question:
                    question.usage_count = (question.usage_count or 0) + 1
                    question.last_used = datetime.utcnow()
                
                # Create usage log entry
                usage_log = UsageLog(
                    id=self.generate_id(),
                    user_id=user_id,
                    question_id=question_id,
                    activity_type=activity_type,
                    level=level,
                    session_type=session_type,
                    used_at=datetime.utcnow()
                )
                session.add(usage_log)
                session.commit()
                
        except Exception as e:
            logger.warning("Failed to log question usage", error=str(e))

    def _convert_question_to_dict(self, question: QuestionBank, language: Optional[Language] = None) -> Dict[str, Any]:
        """Convert QuestionBank SQLAlchemy object to dictionary"""
        return {
            "id": question.id,
            "bank_id": question.id,  # Legacy compatibility
            "language_id": question.language_id,
            "language_name": language.name if language else "Unknown",
            "activity_type": question.activity_type.value if question.activity_type is not None else None,
            "level": question.level.value if question.level is not None else None,
            "difficulty_level": question.difficulty_level.value if question.difficulty_level is not None else None,
            "text": question.text,
            "question": question.question,
            "correct_answer": question.correct_answer,
            "correct_answer_reason": question.correct_answer_reason,
            "options": question.options,
            "audio_url": question.audio_url,
            "transcript": question.transcript,
            "instruction": question.instruction,
            "topic": question.topic,
            "requirements": question.requirements,
            "minimum_words": question.minimum_words,
            "writing_format": question.writing_format,
            "grammar_topic": question.grammar_topic,
            "task_type": question.task_type,
            "question_type": question.question_type,
            "tip": question.tip,
            "generated_by_admin": question.generated_by_admin,
            "generation_method": question.generation_method.value if question.generation_method is not None else None,
            "created_datetime": question.created_datetime.isoformat() if question.created_datetime is not None else None,
            "is_active": question.is_active,
            "usage_count": question.usage_count,
            "question_metadata": question.question_metadata,
        }

    # =================
    # PRICING & POLICY MANAGEMENT
    # =================

    def get_credit_rules_grouped(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get credit rules grouped by session type for pricing policy page"""
        try:
            with self.mysql_service.get_db() as session:
                # Get all credit rules from database
                credit_rules_query = session.query(CreditRule).filter(CreditRule.active == True).all()

                # Group by session_type
                credit_rules_by_type = {}
                for rule in credit_rules_query:
                    session_type = rule.session_type.value if hasattr(rule.session_type, 'value') else str(rule.session_type)
                    if session_type not in credit_rules_by_type:
                        credit_rules_by_type[session_type] = []

                    credit_rules_by_type[session_type].append({
                        "session_type": session_type,
                        "activity_type": rule.activity_type.value if hasattr(rule.activity_type, 'value') else str(rule.activity_type),
                        "points_cost": rule.points_cost,
                        "active": rule.active,
                        "level": rule.level.value if hasattr(rule.level, 'value') else str(rule.level),
                    })

                logger.info("Retrieved credit rules grouped", count=len(credit_rules_query))
                return credit_rules_by_type

        except Exception as e:
            logger.error("Failed to get credit rules grouped", error=str(e))
            # Return empty structure if database query fails
            return {
                "practice": [],
                "exam": [],
                "admin": []
            }

    # =================
    # SCHOOL MANAGEMENT
    # =================

    def get_schools(self, limit: int = 100, offset: int = 0, search: Optional[str] = None) -> Dict[str, Any]:
        """Get list of schools with optional search and pagination"""
        try:
            with self.mysql_service.get_db() as session:
                query = session.query(School)
                
                # Apply search filter if provided
                if search:
                    search_term = f"%{search}%"
                    query = query.filter(
                        or_(
                            School.name.ilike(search_term),
                            School.display_name.ilike(search_term),
                            School.contact_email.ilike(search_term)
                        )
                    )
                
                # Get total count before pagination
                total_count = query.count()
                
                # Apply ordering and pagination
                schools = query.order_by(School.created_at.desc()).offset(offset).limit(limit).all()
                
                # Build result with user counts
                result = []
                for school in schools:
                    # Get user count for this school
                    user_count = session.query(User).filter(User.school_id == school.id).count()
                    
                    # Get active user count
                    active_user_count = session.query(User).filter(
                        User.school_id == school.id,
                        User.is_active == True
                    ).count()
                    
                    result.append({
                        "id": school.id,
                        "name": school.name,
                        "display_name": school.display_name,
                        "description": school.description,
                        "school_type": school.school_type.value if school.school_type is not None else None,
                        "is_active": school.is_active,
                        "contact_email": school.contact_email,
                        "admin_email": school.admin_email,
                        "settings": school.settings,
                        "created_at": school.created_at.isoformat() if school.created_at is not None else None,
                        "updated_at": school.updated_at.isoformat() if school.updated_at is not None else None,
                        "user_count": user_count,
                        "active_user_count": active_user_count,
                    })
                
                return {
                    "schools": result,
                    "total_count": total_count
                }
        except Exception as e:
            logger.error("Failed to get schools", error=str(e))
            return {
                "schools": [],
                "total_count": 0
            }

    def get_school_by_id(self, school_id: str) -> Optional[Dict[str, Any]]:
        """Get school by ID with comprehensive details and statistics"""
        try:
            with self.mysql_service.get_db() as session:
                school = session.query(School).filter(School.id == school_id).first()
                
                if not school:
                    return None
                
                # Get user statistics for this school
                user_count = session.query(User).filter(User.school_id == school_id).count()
                active_user_count = session.query(User).filter(
                    User.school_id == school_id,
                    User.is_active == True
                ).count()
                
                # Get comprehensive school details
                school_data = self._format_school_details(school)
                
                # Add statistics
                school_data["user_count"] = user_count
                school_data["active_user_count"] = active_user_count
                
                return school_data
        except Exception as e:
            logger.error("Failed to get school by ID", school_id=school_id, error=str(e))
            return None

    def get_school_profile(self, school_id: str) -> Optional[Dict[str, Any]]:
        """Get school profile for school admin view (excludes internal fields)"""
        try:
            with self.mysql_service.get_db() as session:
                school = session.query(School).filter(School.id == school_id).first()
                
                if not school:
                    return None
                
                return self._format_school_profile(school)
        except Exception as e:
            logger.error("Failed to get school profile", school_id=school_id, error=str(e))
            return None

    def create_school(self, school_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new school"""
        try:
            with self.mysql_service.get_db() as session:
                # Generate UUID for school
                import uuid
                school_id = uuid.uuid4().hex[:24]
                
                # Create school instance
                school = School(
                    id=school_id,
                    name=school_data.get("name"),
                    display_name=school_data.get("display_name"),
                    description=school_data.get("description"),
                    school_type=school_data.get("school_type", "b2b"),
                    is_active=school_data.get("is_active", True),
                    contact_email=school_data.get("contact_email"),
                    contact_phone=school_data.get("contact_phone"),
                    admin_email=school_data.get("admin_email"),
                    admin_phone=school_data.get("admin_phone"),
                    billing_email=school_data.get("billing_email"),
                    billing_contact_name=school_data.get("billing_contact_name"),
                    billing_phone=school_data.get("billing_phone"),
                    payment_method_info=school_data.get("payment_method_info"),
                    physical_address=school_data.get("physical_address"),
                    billing_address=school_data.get("billing_address"),
                    tax_address=school_data.get("tax_address"),
                    tax_id=school_data.get("tax_id"),
                    vat_number=school_data.get("vat_number"),
                    tax_exemption_status=school_data.get("tax_exemption_status", False),
                    priority_support=school_data.get("priority_support", False),
                    account_manager_notes=school_data.get("account_manager_notes"),
                    internal_tags=school_data.get("internal_tags"),
                    settings=school_data.get("settings")
                )
                
                session.add(school)
                session.commit()
                
                return {
                    "success": True,
                    "message": "School created successfully",
                    "school_id": school_id,
                    "school": {
                        "id": school.id,
                        "name": school.name,
                        "display_name": school.display_name,
                        "description": school.description,
                        "school_type": school.school_type.value if school.school_type is not None else None,
                        "is_active": school.is_active,
                        "contact_email": school.contact_email,
                        "admin_email": school.admin_email,
                        "settings": school.settings,
                        "created_at": school.created_at.isoformat() if school.created_at is not None else None,
                        "updated_at": school.updated_at.isoformat() if school.updated_at is not None else None,
                    }
                }
        except IntegrityError as e:
            logger.error("School creation failed - integrity error", error=str(e))
            return {"success": False, "message": "School with this name already exists"}
        except Exception as e:
            logger.error("Failed to create school", error=str(e))
            return {"success": False, "message": "Failed to create school"}

    def update_school(self, school_id: str, school_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing school with comprehensive details"""
        try:
            with self.mysql_service.get_db() as session:
                school = session.query(School).filter(School.id == school_id).first()
                
                if not school:
                    return {"success": False, "message": "School not found"}
                
                # Update basic fields
                if "name" in school_data:
                    school.name = school_data["name"]
                if "display_name" in school_data:
                    school.display_name = school_data["display_name"]
                if "description" in school_data:
                    school.description = school_data["description"]
                if "school_type" in school_data:
                    school.school_type = school_data["school_type"]
                if "is_active" in school_data:
                    school.is_active = school_data["is_active"]
                
                # Update contact information
                if "contact_email" in school_data:
                    school.contact_email = school_data["contact_email"]
                if "contact_phone" in school_data:
                    school.contact_phone = school_data["contact_phone"]
                if "admin_email" in school_data:
                    school.admin_email = school_data["admin_email"]
                if "admin_phone" in school_data:
                    school.admin_phone = school_data["admin_phone"]
                
                # Update billing information
                if "billing_email" in school_data:
                    school.billing_email = school_data["billing_email"]
                if "billing_contact_name" in school_data:
                    school.billing_contact_name = school_data["billing_contact_name"]
                if "billing_phone" in school_data:
                    school.billing_phone = school_data["billing_phone"]
                if "payment_method_info" in school_data:
                    school.payment_method_info = school_data["payment_method_info"]
                
                # Update address information
                if "physical_address" in school_data:
                    school.physical_address = school_data["physical_address"]
                if "billing_address" in school_data:
                    school.billing_address = school_data["billing_address"]
                if "tax_address" in school_data:
                    school.tax_address = school_data["tax_address"]
                
                # Update tax details
                if "tax_id" in school_data:
                    school.tax_id = school_data["tax_id"]
                if "vat_number" in school_data:
                    school.vat_number = school_data["vat_number"]
                if "tax_exemption_status" in school_data:
                    school.tax_exemption_status = school_data["tax_exemption_status"]
                
                # Update internal management fields
                if "priority_support" in school_data:
                    school.priority_support = school_data["priority_support"]
                if "account_manager_notes" in school_data:
                    school.account_manager_notes = school_data["account_manager_notes"]
                if "internal_tags" in school_data:
                    school.internal_tags = school_data["internal_tags"]
                
                # Update settings
                if "settings" in school_data:
                    school.settings = school_data["settings"]
                
                session.commit()
                
                # Return comprehensive school data
                return {
                    "success": True,
                    "message": "School updated successfully",
                    "school": self._format_school_details(school)
                }
        except IntegrityError as e:
            logger.error("School update failed - integrity error", school_id=school_id, error=str(e))
            return {"success": False, "message": "School with this name already exists"}
        except Exception as e:
            logger.error("Failed to update school", school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to update school"}

    def _format_school_details(self, school) -> Dict[str, Any]:
        """Helper method to format school details with all fields"""
        return {
            "id": school.id,
            "name": school.name,
            "display_name": school.display_name,
            "description": school.description,
            "school_type": school.school_type.value if school.school_type else None,
            "is_active": school.is_active,
            "created_at": school.created_at.isoformat() if school.created_at else None,
            "updated_at": school.updated_at.isoformat() if school.updated_at else None,
            
            # Contact Information
            "contact_email": school.contact_email,
            "contact_phone": school.contact_phone,
            "admin_email": school.admin_email,
            "admin_phone": school.admin_phone,
            
            # Billing Information
            "billing_email": school.billing_email,
            "billing_contact_name": school.billing_contact_name,
            "billing_phone": school.billing_phone,
            "payment_method_info": school.payment_method_info,
            
            # Address Information
            "physical_address": school.physical_address,
            "billing_address": school.billing_address,
            "tax_address": school.tax_address,
            
            # Billing Configuration
            "billing_pack_id": school.billing_pack_id,
            "student_pack_id": school.student_pack_id,
            "billing_cycle": getattr(school.billing_cycle, "value", school.billing_cycle),
            "cycle_start": school.cycle_start.isoformat() if school.cycle_start else None,
            "cycle_end": school.cycle_end.isoformat() if school.cycle_end else None,
            "last_billed_at": school.last_billed_at.isoformat() if school.last_billed_at else None,

            # Tax Details
            "tax_id": school.tax_id,
            "vat_number": school.vat_number,
            "tax_exemption_status": school.tax_exemption_status,
            
            # Internal Management
            "priority_support": school.priority_support,
            "account_manager_notes": school.account_manager_notes,
            "internal_tags": school.internal_tags,
            
            # Settings
            "settings": school.settings,
        }

    def _format_school_profile(self, school) -> Dict[str, Any]:
        """Helper method to format school profile (excludes internal fields)"""
        return {
            "id": school.id,
            "name": school.name,
            "display_name": school.display_name,
            "description": school.description,
            "school_type": school.school_type.value if school.school_type else None,
            "is_active": school.is_active,
            "created_at": school.created_at.isoformat() if school.created_at else None,
            "updated_at": school.updated_at.isoformat() if school.updated_at else None,
            
            # Contact Information
            "contact_email": school.contact_email,
            "contact_phone": school.contact_phone,
            "admin_email": school.admin_email,
            "admin_phone": school.admin_phone,
            
            # Billing Information
            "billing_email": school.billing_email,
            "billing_contact_name": school.billing_contact_name,
            "billing_phone": school.billing_phone,
            "payment_method_info": school.payment_method_info,
            
            # Address Information
            "physical_address": school.physical_address,
            "billing_address": school.billing_address,
            "tax_address": school.tax_address,
            
            # Billing Configuration
            "billing_pack_id": school.billing_pack_id,
            "student_pack_id": school.student_pack_id,
            "billing_cycle": getattr(school.billing_cycle, "value", school.billing_cycle),
            "cycle_start": school.cycle_start.isoformat() if school.cycle_start else None,
            "cycle_end": school.cycle_end.isoformat() if school.cycle_end else None,
            "last_billed_at": school.last_billed_at.isoformat() if school.last_billed_at else None,

            # Tax Details
            "tax_id": school.tax_id,
            "vat_number": school.vat_number,
            "tax_exemption_status": school.tax_exemption_status,
            
            # Settings (non-internal only)
            "settings": school.settings,
        }

    def delete_school(self, school_id: str) -> Dict[str, Any]:
        """Delete school (soft delete by setting is_active to False)"""
        try:
            with self.mysql_service.get_db() as session:
                school = session.query(School).filter(School.id == school_id).first()
                
                if not school:
                    return {"success": False, "message": "School not found"}
                
                # Check if school has users
                user_count = session.query(User).filter(User.school_id == school_id).count()
                if user_count > 0:
                    return {
                        "success": False, 
                        "message": f"Cannot delete school with {user_count} users. Please transfer users first."
                    }
                
                # Soft delete by setting is_active to False
                school.is_active = False
                session.commit()
                
                return {
                    "success": True,
                    "message": "School deactivated successfully"
                }
        except Exception as e:
            logger.error("Failed to delete school", school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to delete school"}

    def get_school_stats(self) -> Dict[str, Any]:
        """Get overall school statistics"""
        try:
            with self.mysql_service.get_db() as session:
                total_schools = session.query(School).count()
                active_schools = session.query(School).filter(School.is_active == True).count()
                
                # Count schools by type
                school_types = session.query(School.school_type, func.count(School.id)).group_by(School.school_type).all()
                type_counts = {school_type.value: count for school_type, count in school_types}
                
                return {
                    "total_schools": total_schools,
                    "active_schools": active_schools,
                    "inactive_schools": total_schools - active_schools,
                    "school_types": type_counts
                }
        except Exception as e:
            logger.error("Failed to get school stats", error=str(e))
            return {
                "total_schools": 0,
                "active_schools": 0,
                "inactive_schools": 0,
                "school_types": {}
            }

    def get_active_school_admin_for_school(self, school_id: str) -> Optional[Dict[str, Any]]:
        """Get first active school admin for a given school"""
        try:
            with self.mysql_service.get_db() as session:
                school_admin = (
                    session.query(SchoolAdmin)
                    .filter(
                        SchoolAdmin.school_id == school_id,
                        SchoolAdmin.is_active == True,
                    )
                    .order_by(SchoolAdmin.created_at.asc())
                    .first()
                )

                if not school_admin:
                    return None

                return {
                    "id": school_admin.id,
                    "school_id": school_admin.school_id,
                    "email": school_admin.email,
                    "name": school_admin.name,
                    "permissions": school_admin.permissions or [],
                }
        except Exception as e:
            logger.error(
                "Failed to get active school admin", school_id=school_id, error=str(e)
            )
            return None

    # =================
    # SCHOOL CREDIT MANAGEMENT
    # =================






def get_admin_repository() -> AdminRepository:
    """Get AdminRepository instance"""
    return AdminRepository()
