"""
School Repository - SCHOOL DOMAIN SCHOOL-SPECIFIC OPERATIONS
Handles school admin authentication, user management within schools, and school analytics
Follows the repository pattern established in the admin domain
"""

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta, date
from decimal import Decimal, ROUND_HALF_UP
import structlog
import bcrypt
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError

# Import shared base service
from app.common.models.mysql_odm_service import BaseMySQLODMService
from app.config import settings
from app.common.models.mysql_models import (
    SchoolAdmin, User, UserAccess, School, ExamDetail, UsageLog,
    PricingPack, Templates, UsageStatusEnum, BillingCycleEnum
)

logger = structlog.get_logger()


class SchoolRepository(BaseMySQLODMService):
    """
    School Repository - School Domain
    Handles all school-specific database operations: school admin auth, user management, analytics
    """

    # =================
    # SCHOOL BILLING & USAGE
    # =================

    def get_current_billing_cycle(self, school_id: str) -> Dict[str, Any]:
        """Return the current billing cycle metadata for a school"""
        try:
            with self.mysql_service.get_db() as session:
                school = session.query(School).filter(School.id == school_id).first()

                if not school:
                    return {"success": False, "message": "School not found"}

                billing_cycle = self._normalize_billing_cycle(school.billing_cycle)
                cycle_start, cycle_end = self._resolve_cycle_dates(session, school, billing_cycle)

                return {
                    "success": True,
                    "data": {
                        "school_id": school.id,
                        "billing_cycle": billing_cycle,
                        "cycle_start": cycle_start,
                        "cycle_end": cycle_end,
                        "last_billed_at": school.last_billed_at,
                        "billing_pack_id": school.billing_pack_id,
                        "student_pack_id": school.student_pack_id,
                    }
                }

        except Exception as e:
            logger.error("Failed to get current billing cycle", school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve billing cycle"}

    def get_school_usage_for_period(
        self,
        school_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Aggregate credit consumption for a school within a period"""
        try:
            start_date, end_date, start_dt, end_dt = self._normalize_period(start_date, end_date)

            with self.mysql_service.get_db() as session:
                totals = session.query(
                    func.coalesce(func.sum(UsageLog.points_deducted), 0).label('total_credits'),
                    func.count(UsageLog.id).label('total_sessions'),
                    func.max(UsageLog.timestamp).label('last_usage_at')
                ).filter(
                    UsageLog.school_id == school_id,
                    UsageLog.status == UsageStatusEnum.completed,
                    UsageLog.timestamp >= start_dt,
                    UsageLog.timestamp < end_dt
                ).first()

                total_credits = int(totals.total_credits or 0)
                total_sessions = int(totals.total_sessions or 0)
                last_usage_at = totals.last_usage_at

                session_rows = session.query(
                    UsageLog.session_type,
                    func.count(UsageLog.id).label('session_count'),
                    func.coalesce(func.sum(UsageLog.points_deducted), 0).label('credits_used')
                ).filter(
                    UsageLog.school_id == school_id,
                    UsageLog.status == UsageStatusEnum.completed,
                    UsageLog.timestamp >= start_dt,
                    UsageLog.timestamp < end_dt
                ).group_by(UsageLog.session_type).all()

                activity_rows = session.query(
                    UsageLog.activity_type,
                    func.count(UsageLog.id).label('session_count'),
                    func.coalesce(func.sum(UsageLog.points_deducted), 0).label('credits_used')
                ).filter(
                    UsageLog.school_id == school_id,
                    UsageLog.status == UsageStatusEnum.completed,
                    UsageLog.timestamp >= start_dt,
                    UsageLog.timestamp < end_dt
                ).group_by(UsageLog.activity_type).all()

                by_session_type = {
                    self._enum_to_value(row.session_type): {
                        "session_count": int(row.session_count or 0),
                        "credits_used": int(row.credits_used or 0),
                    }
                    for row in session_rows
                }

                by_activity_type = {
                    self._enum_to_value(row.activity_type): {
                        "session_count": int(row.session_count or 0),
                        "credits_used": int(row.credits_used or 0),
                    }
                    for row in activity_rows
                }

                average_per_session = 0.0
                if total_sessions > 0:
                    average_per_session = round(total_credits / total_sessions, 2)

                return {
                    "success": True,
                    "data": {
                        "school_id": school_id,
                        "period": {
                            "start": start_date,
                            "end": end_date,
                        },
                        "total_credits": total_credits,
                        "total_sessions": total_sessions,
                        "average_credits_per_session": average_per_session,
                        "last_usage_at": last_usage_at,
                        "by_session_type": by_session_type,
                        "by_activity_type": by_activity_type,
                    }
                }

        except ValueError as ve:
            logger.warning("Invalid usage period", school_id=school_id, error=str(ve))
            return {"success": False, "message": str(ve)}
        except Exception as e:
            logger.error("Failed to aggregate school usage", school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve usage statistics"}

    def calculate_billing_amount(self, school_id: str, usage_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate projected billing charges for a school"""
        try:
            with self.mysql_service.get_db() as session:
                school = session.query(School).filter(School.id == school_id).first()
                if not school:
                    return {"success": False, "message": "School not found"}

                billing_pack = self._get_pack(session, school.billing_pack_id)
                student_pack = self._get_pack(session, school.student_pack_id)

                billing_pack_payload, per_credit_rate = self._build_pack_payload(billing_pack)
                student_pack_payload, _ = self._build_pack_payload(student_pack)

                total_credits = Decimal(str(usage_data.get("total_credits", 0)))
                projected_charges = (per_credit_rate * total_credits).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                return {
                    "success": True,
                    "data": {
                        "billing_pack": billing_pack_payload,
                        "student_pack": student_pack_payload,
                        "per_credit_rate": float(per_credit_rate),
                        "projected_charges": float(projected_charges),
                    }
                }

        except Exception as e:
            logger.error("Failed to calculate billing amount", school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to calculate billing amount"}

    def get_school_billing_overview(self, school_id: str) -> Dict[str, Any]:
        """Return consolidated billing overview (cycle, usage, projections)"""
        try:
            with self.mysql_service.get_db() as session:
                school = session.query(School).filter(School.id == school_id).first()

                if not school:
                    return {"success": False, "message": "School not found"}

                billing_cycle = self._normalize_billing_cycle(school.billing_cycle)
                cycle_start, cycle_end = self._resolve_cycle_dates(session, school, billing_cycle)

                usage_summary = self._compute_usage_summary(session, school.id, cycle_start, cycle_end)
                billing_pack = self._get_pack(session, school.billing_pack_id)
                student_pack = self._get_pack(session, school.student_pack_id)

                billing_pack_payload, per_credit_rate = self._build_pack_payload(billing_pack)
                student_pack_payload, _ = self._build_pack_payload(student_pack)

                projected_charges = (per_credit_rate * Decimal(str(usage_summary["total_credits"]))).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )

                return {
                    "success": True,
                    "data": {
                        "school_id": school.id,
                        "school_name": school.name,
                        "billing_cycle": billing_cycle,
                        "current_cycle": {
                            "start": cycle_start,
                            "end": cycle_end,
                        },
                        "usage_data": usage_summary,
                        "billing_pack": billing_pack_payload,
                        "student_pack": student_pack_payload,
                        "projected_charges": float(projected_charges),
                        "last_billed_at": school.last_billed_at,
                    }
                }

        except Exception as e:
            logger.error("Failed to build billing overview", school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve billing overview"}

    # Helper utilities -------------------------------------------------

    def _normalize_billing_cycle(self, cycle: Optional[BillingCycleEnum]) -> str:
        if isinstance(cycle, BillingCycleEnum):
            return cycle.value
        if isinstance(cycle, str) and cycle in {item.value for item in BillingCycleEnum}:
            return cycle
        return BillingCycleEnum.monthly.value

    def _resolve_cycle_dates(
        self,
        session,
        school: School,
        billing_cycle: str,
    ) -> Tuple[date, date]:
        today = datetime.utcnow().date()

        if school.cycle_start and school.cycle_end:
            cycle_start = school.cycle_start
            cycle_end = school.cycle_end
        else:
            cycle_start, cycle_end = self._compute_cycle_window(billing_cycle, today)
            school.cycle_start = cycle_start
            school.cycle_end = cycle_end

        while cycle_end < today:
            next_reference = cycle_end + timedelta(days=1)
            cycle_start, cycle_end = self._compute_cycle_window(billing_cycle, next_reference)
            school.cycle_start = cycle_start
            school.cycle_end = cycle_end

        return cycle_start, cycle_end

    def _compute_cycle_window(self, billing_cycle: str, reference: date) -> Tuple[date, date]:
        billing_cycle = (billing_cycle or BillingCycleEnum.monthly.value).lower()

        if billing_cycle == BillingCycleEnum.quarterly.value:
            quarter_start_month = ((reference.month - 1) // 3) * 3 + 1
            start = date(reference.year, quarter_start_month, 1)
            end = self._add_months(start, 3) - timedelta(days=1)
            return start, end

        if billing_cycle == BillingCycleEnum.annual.value:
            start = date(reference.year, 1, 1)
            end = date(reference.year, 12, 31)
            return start, end

        start = date(reference.year, reference.month, 1)
        end = self._add_months(start, 1) - timedelta(days=1)
        return start, end

    def _add_months(self, start_date: date, months: int) -> date:
        month = start_date.month - 1 + months
        year = start_date.year + month // 12
        month = month % 12 + 1
        return date(year, month, 1)

    def _normalize_period(
        self,
        start_date: Any,
        end_date: Any,
    ) -> Tuple[date, date, datetime, datetime]:
        start = self._to_date(start_date)
        end = self._to_date(end_date)

        if end < start:
            raise ValueError("end_date cannot be before start_date")

        start_dt = datetime.combine(start, datetime.min.time())
        end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())
        return start, end, start_dt, end_dt

    def _to_date(self, value: Any) -> date:
        if isinstance(value, date) and not isinstance(value, datetime):
            return value
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace('Z', '+00:00')).date()
            except ValueError as exc:
                raise ValueError("Invalid date format. Use ISO format YYYY-MM-DD") from exc
        raise ValueError("Date value must be a date, datetime, or ISO string")

    def _compute_usage_summary(
        self,
        session,
        school_id: str,
        cycle_start: date,
        cycle_end: date,
    ) -> Dict[str, Any]:
        _, _, start_dt, end_dt = self._normalize_period(cycle_start, cycle_end)

        totals = session.query(
            func.coalesce(func.sum(UsageLog.points_deducted), 0).label('total_credits'),
            func.count(UsageLog.id).label('total_sessions'),
            func.max(UsageLog.timestamp).label('last_usage_at')
        ).filter(
            UsageLog.school_id == school_id,
            UsageLog.status == UsageStatusEnum.completed,
            UsageLog.timestamp >= start_dt,
            UsageLog.timestamp < end_dt
        ).first()

        total_credits = int(totals.total_credits or 0)
        total_sessions = int(totals.total_sessions or 0)
        last_usage_at = totals.last_usage_at

        session_rows = session.query(
            UsageLog.session_type,
            func.count(UsageLog.id).label('session_count'),
            func.coalesce(func.sum(UsageLog.points_deducted), 0).label('credits_used')
        ).filter(
            UsageLog.school_id == school_id,
            UsageLog.status == UsageStatusEnum.completed,
            UsageLog.timestamp >= start_dt,
            UsageLog.timestamp < end_dt
        ).group_by(UsageLog.session_type).all()

        activity_rows = session.query(
            UsageLog.activity_type,
            func.count(UsageLog.id).label('session_count'),
            func.coalesce(func.sum(UsageLog.points_deducted), 0).label('credits_used')
        ).filter(
            UsageLog.school_id == school_id,
            UsageLog.status == UsageStatusEnum.completed,
            UsageLog.timestamp >= start_dt,
            UsageLog.timestamp < end_dt
        ).group_by(UsageLog.activity_type).all()

        by_session_type = {
            self._enum_to_value(row.session_type): {
                "session_count": int(row.session_count or 0),
                "credits_used": int(row.credits_used or 0),
            }
            for row in session_rows
        }

        by_activity_type = {
            self._enum_to_value(row.activity_type): {
                "session_count": int(row.session_count or 0),
                "credits_used": int(row.credits_used or 0),
            }
            for row in activity_rows
        }

        average_per_session = 0.0
        if total_sessions > 0:
            average_per_session = round(total_credits / total_sessions, 2)

        return {
            "school_id": school_id,
            "period": {
                "start": cycle_start,
                "end": cycle_end,
            },
            "total_credits": total_credits,
            "total_sessions": total_sessions,
            "average_credits_per_session": average_per_session,
            "last_usage_at": last_usage_at,
            "by_session_type": by_session_type,
            "by_activity_type": by_activity_type,
        }

    def _get_pack(self, session, pack_id: Optional[str]) -> Optional[PricingPack]:
        if not pack_id:
            return None
        return session.query(PricingPack).filter(PricingPack.id == pack_id).first()

    def _build_pack_payload(self, pack: Optional[PricingPack]) -> Tuple[Optional[Dict[str, Any]], Decimal]:
        if not pack:
            return None, Decimal("0")

        per_credit_rate = self._determine_per_credit_rate(pack)
        payload = {
            "id": pack.id,
            "name": pack.pack_name,
            "credits": pack.credits,
            "price_euros": float(pack.price_euros) if pack.price_euros is not None else None,
            "per_credit_rate": float(per_credit_rate),
            "currency": "EUR",
        }
        return payload, per_credit_rate

    def _determine_per_credit_rate(self, pack: PricingPack) -> Decimal:
        if not pack or not pack.credits:
            return Decimal("0")

        if pack.price_euros is not None:
            return Decimal(str(pack.price_euros)) / Decimal(pack.credits)

        if pack.price_cents is not None:
            return Decimal(pack.price_cents) / Decimal(100 * pack.credits)

        return Decimal("0")

    def _enum_to_value(self, value) -> str:
        if hasattr(value, 'value'):
            return value.value
        return str(value)
    # SCHOOL ADMIN AUTHENTICATION
    # =================

    def authenticate_school_admin(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate school admin with email and password"""
        try:
            with self.mysql_service.get_db() as session:
                school_admin = session.query(SchoolAdmin).filter(
                    SchoolAdmin.email == email.lower()
                ).first()
                
                if not school_admin:
                    return {"success": False, "message": "Invalid school admin credentials"}
                
                # Check if school admin is active
                if not school_admin.is_active:
                    return {"success": False, "message": "School admin account is deactivated"}
                
                # Verify password hash
                if not bcrypt.checkpw(password.encode('utf-8'), school_admin.password_hash.encode('utf-8')):
                    return {"success": False, "message": "Invalid school admin credentials"}
                
                # Update last login
                school_admin.last_login = datetime.utcnow()
                session.commit()
                
                return {
                    "success": True,
                    "school_admin": {
                        "id": school_admin.id,
                        "school_id": school_admin.school_id,  # KEY: School scoping
                        "email": school_admin.email,
                        "name": school_admin.name,
                        "permissions": school_admin.permissions,
                    },
                    "message": "School admin authentication successful",
                }
        except Exception as e:
            logger.error("School admin authentication failed", email=email, error=str(e))
            return {"success": False, "message": "School admin authentication failed"}

    def get_school_admin_by_id(self, school_admin_id: str) -> Optional[Dict[str, Any]]:
        """Get school admin by ID"""
        try:
            with self.mysql_service.get_db() as session:
                school_admin = session.query(SchoolAdmin).filter(
                    SchoolAdmin.id == school_admin_id
                ).first()
                
                if school_admin:
                    return {
                        "id": school_admin.id,
                        "school_id": school_admin.school_id,
                        "email": school_admin.email,
                        "name": school_admin.name,
                        "is_active": school_admin.is_active,
                        "created_at": school_admin.created_at.isoformat() if school_admin.created_at else None,
                        "last_login": school_admin.last_login.isoformat() if school_admin.last_login else None,
                        "permissions": school_admin.permissions,
                    }
                return None
        except Exception as e:
            logger.error("Failed to get school admin by ID", school_admin_id=school_admin_id, error=str(e))
            return None

    def get_school_admin_for_school(self, school_id: str) -> Optional[Dict[str, Any]]:
        """Get first active school admin for a school (for impersonation)"""
        try:
            with self.mysql_service.get_db() as session:
                school_admin = session.query(SchoolAdmin).filter(
                    SchoolAdmin.school_id == school_id,
                    SchoolAdmin.is_active == True
                ).first()
                
                if school_admin:
                    return {
                        "id": school_admin.id,
                        "school_id": school_admin.school_id,
                        "email": school_admin.email,
                        "name": school_admin.name,
                        "permissions": school_admin.permissions,
                    }
                return None
        except Exception as e:
            logger.error("Failed to get school admin for school", school_id=school_id, error=str(e))
            return None

    def get_school_profile(self, school_id: str) -> Optional[Dict[str, Any]]:
        """Get school profile excluding internal-only fields"""
        try:
            with self.mysql_service.get_db() as session:
                school = session.query(School).filter(School.id == school_id).first()

                if not school:
                    return None

                return {
                    "id": school.id,
                    "name": school.name,
                    "display_name": school.display_name,
                    "description": school.description,
                    "school_type": school.school_type.value if school.school_type else None,
                    "is_active": school.is_active,
                    "created_at": school.created_at.isoformat() if school.created_at else None,
                    "updated_at": school.updated_at.isoformat() if school.updated_at else None,
                    "contact_email": school.contact_email,
                    "contact_phone": school.contact_phone,
                    "admin_email": school.admin_email,
                    "admin_phone": school.admin_phone,
                    "billing_email": school.billing_email,
                    "billing_contact_name": school.billing_contact_name,
                    "billing_phone": school.billing_phone,
                    "payment_method_info": school.payment_method_info,
                    "physical_address": school.physical_address,
                    "billing_address": school.billing_address,
                    "tax_address": school.tax_address,
                    "tax_id": school.tax_id,
                    "vat_number": school.vat_number,
                    "tax_exemption_status": school.tax_exemption_status,
                    "settings": school.settings,
                }
        except Exception as e:
            logger.error("Failed to get school profile", school_id=school_id, error=str(e))
            return None

    def create_school_admin(self, school_id: str, email: str, password_hash: str, name: str) -> Dict[str, Any]:
        """Create new school admin"""
        try:
            with self.mysql_service.get_db() as session:
                # Check if school admin already exists
                existing_admin = session.query(SchoolAdmin).filter(
                    SchoolAdmin.email == email.lower()
                ).first()
                if existing_admin:
                    return {"success": False, "message": "School admin already exists"}
                
                # Verify school exists
                school = session.query(School).filter(School.id == school_id).first()
                if not school:
                    return {"success": False, "message": "School not found"}
                
                # Create school admin
                admin_data = {
                    "id": self.generate_id(),
                    "school_id": school_id,
                    "email": email.lower(),
                    "name": name,
                    "password_hash": password_hash,
                    "permissions": ["manage_users", "view_analytics"],  # Default permissions
                    "created_at": datetime.utcnow(),
                    "is_active": True,
                }
                
                school_admin = SchoolAdmin(**admin_data)
                session.add(school_admin)
                session.commit()
                
                logger.info("School admin created", school_admin_id=school_admin.id, school_id=school_id, email=email)
                
                return {
                    "success": True,
                    "school_admin_id": school_admin.id,
                    "message": "School admin created successfully",
                }
        except IntegrityError:
            return {"success": False, "message": "School admin already exists"}
        except Exception as e:
            logger.error("Failed to create school admin", email=email, error=str(e))
            return {"success": False, "message": "Failed to create school admin"}

    # =================
    # SCHOOL USER MANAGEMENT (School-Scoped)
    # =================

    def get_school_users(
        self, 
        school_id: str, 
        limit: int = 100, 
        skip: int = 0, 
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        email_verified: Optional[bool] = None,
        current_level: Optional[str] = None,
        created_after: Optional[str] = None,
        created_before: Optional[str] = None,
        last_login_after: Optional[str] = None,
        last_login_before: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get users for a specific school with pagination, search, and filtering"""
        try:
            with self.mysql_service.get_db() as session:
                query = session.query(User).filter(User.school_id == school_id)
                
                # Apply search filter if provided
                if search:
                    search_pattern = f"%{search}%"
                    query = query.filter(
                        or_(
                            User.email.like(search_pattern),
                            User.name.like(search_pattern)
                        )
                    )
                
                # Apply filtering by user status
                if is_active is not None:
                    query = query.filter(User.is_active == is_active)
                
                # Apply filtering by email verification status
                if email_verified is not None:
                    query = query.filter(User.email_verified == email_verified)
                
                # Apply filtering by CEFR level
                if current_level:
                    query = query.filter(User.current_level == current_level)
                
                # Apply date range filters for created_at
                if created_after:
                    try:
                        from datetime import datetime
                        created_after_dt = datetime.fromisoformat(created_after.replace('Z', '+00:00'))
                        query = query.filter(User.created_at >= created_after_dt)
                    except ValueError:
                        logger.warning("Invalid created_after date format", created_after=created_after)
                
                if created_before:
                    try:
                        from datetime import datetime
                        created_before_dt = datetime.fromisoformat(created_before.replace('Z', '+00:00'))
                        query = query.filter(User.created_at <= created_before_dt)
                    except ValueError:
                        logger.warning("Invalid created_before date format", created_before=created_before)
                
                # Apply date range filters for last_login
                if last_login_after:
                    try:
                        from datetime import datetime
                        last_login_after_dt = datetime.fromisoformat(last_login_after.replace('Z', '+00:00'))
                        query = query.filter(User.last_login >= last_login_after_dt)
                    except ValueError:
                        logger.warning("Invalid last_login_after date format", last_login_after=last_login_after)
                
                if last_login_before:
                    try:
                        from datetime import datetime
                        last_login_before_dt = datetime.fromisoformat(last_login_before.replace('Z', '+00:00'))
                        query = query.filter(User.last_login <= last_login_before_dt)
                    except ValueError:
                        logger.warning("Invalid last_login_before date format", last_login_before=last_login_before)
                
                users = query.offset(skip).limit(limit).all()
                
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
                        "created_at": user.created_at.isoformat() if user.created_at else None,
                        "last_login": user.last_login.isoformat() if user.last_login else None,
                        "preferred_language_id": user.preferred_language_id,
                        "current_level": user.current_level,
                        "school_id": user.school_id,
                    }
                    
                    if user_access:
                        user_data["access"] = {
                            "allocated_count": user_access.allocated_count,
                            "used_count": user_access.used_count,
                            "plan_type": user_access.current_pack_id if user_access.current_pack_id else settings.default_plan_type,
                            "status": user_access.status.value if user_access.status else "available",
                            "reserved_credits": user_access.reserved_credits,
                            "reset_at": user_access.reset_at.isoformat() if user_access.reset_at else None,
                        }
                    else:
                        # Provide default access structure when user_access is missing
                        user_data["access"] = {
                            "allocated_count": 0,
                            "used_count": 0,
                            "plan_type": settings.default_plan_type,
                            "status": "available",
                            "reserved_credits": 0,
                            "reset_at": None,
                        }
                    
                    result.append(user_data)
                
                return result
        except Exception as e:
            logger.error("Failed to get school users", school_id=school_id, error=str(e))
            return []

    def get_school_users_count(
        self, 
        school_id: str,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        email_verified: Optional[bool] = None,
        current_level: Optional[str] = None,
        created_after: Optional[str] = None,
        created_before: Optional[str] = None,
        last_login_after: Optional[str] = None,
        last_login_before: Optional[str] = None
    ) -> int:
        """Get total count of users in a school with filtering"""
        try:
            with self.mysql_service.get_db() as session:
                query = session.query(User).filter(User.school_id == school_id)
                
                # Apply search filter if provided
                if search:
                    search_pattern = f"%{search}%"
                    query = query.filter(
                        or_(
                            User.email.like(search_pattern),
                            User.name.like(search_pattern)
                        )
                    )
                
                # Apply filtering by user status
                if is_active is not None:
                    query = query.filter(User.is_active == is_active)
                
                # Apply filtering by email verification status
                if email_verified is not None:
                    query = query.filter(User.email_verified == email_verified)
                
                # Apply filtering by CEFR level
                if current_level:
                    query = query.filter(User.current_level == current_level)
                
                # Apply date range filters for created_at
                if created_after:
                    try:
                        from datetime import datetime
                        created_after_dt = datetime.fromisoformat(created_after.replace('Z', '+00:00'))
                        query = query.filter(User.created_at >= created_after_dt)
                    except ValueError:
                        logger.warning("Invalid created_after date format", created_after=created_after)
                
                if created_before:
                    try:
                        from datetime import datetime
                        created_before_dt = datetime.fromisoformat(created_before.replace('Z', '+00:00'))
                        query = query.filter(User.created_at <= created_before_dt)
                    except ValueError:
                        logger.warning("Invalid created_before date format", created_before=created_before)
                
                # Apply date range filters for last_login
                if last_login_after:
                    try:
                        from datetime import datetime
                        last_login_after_dt = datetime.fromisoformat(last_login_after.replace('Z', '+00:00'))
                        query = query.filter(User.last_login >= last_login_after_dt)
                    except ValueError:
                        logger.warning("Invalid last_login_after date format", last_login_after=last_login_after)
                
                if last_login_before:
                    try:
                        from datetime import datetime
                        last_login_before_dt = datetime.fromisoformat(last_login_before.replace('Z', '+00:00'))
                        query = query.filter(User.last_login <= last_login_before_dt)
                    except ValueError:
                        logger.warning("Invalid last_login_before date format", last_login_before=last_login_before)
                
                count = query.count()
                return count
        except Exception as e:
            logger.error("Failed to get school users count", school_id=school_id, error=str(e))
            return 0

    def create_user_in_school(self, school_id: str, user_data: Dict[str, Any], created_by: str) -> Dict[str, Any]:
        """Create user in specific school (school-scoped)"""
        try:
            with self.mysql_service.get_db() as session:
                # Check if user exists
                existing_user = session.query(User).filter(User.email == user_data['email'].lower()).first()
                if existing_user:
                    return {"success": False, "message": "User with this email already exists"}
                
                # Store original password for welcome email before hashing
                original_password = user_data.get('password', '')
                
                # Hash password if provided
                if 'password' in user_data:
                    password_hash = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    user_data['password_hash'] = password_hash
                    del user_data['password']
                
                # Map frontend fields to database fields
                if 'level' in user_data:
                    user_data['current_level'] = user_data['level']
                    del user_data['level']
                
                if 'language_id' in user_data:
                    user_data['preferred_language_id'] = user_data['language_id']
                    del user_data['language_id']
                
                # Set default German language if none provided
                if 'preferred_language_id' not in user_data:
                    user_data['preferred_language_id'] = settings.default_language_id  # German as default
                
                # SECURITY: Force school_id to the school admin's school
                user_data['school_id'] = school_id
                
                # Create user
                user_data['id'] = self.generate_id()
                user_data['email'] = user_data['email'].lower()
                user_data['is_active'] = True  # School-created users are active
                user_data['email_verified'] = True
                user_data['created_at'] = datetime.utcnow()
                
                user = User(**user_data)
                session.add(user)
                session.flush()
                
                # Get school information to determine credit allocation
                school = session.query(School).filter(School.id == school_id).first()
                if not school:
                    return {"success": False, "message": "School not found"}
                
                # Use school's student pack for credit allocation
                student_pack_id = school.student_pack_id
                credits_to_allocate = 50  # Default fallback
                pack_id_to_use = settings.fallback_pricing_pack_id
                
                if student_pack_id:
                    # Get the student pack details
                    student_pack = session.query(PricingPack).filter(PricingPack.id == student_pack_id).first()
                    if student_pack:
                        credits_to_allocate = student_pack.credits
                        pack_id_to_use = student_pack.id
                        logger.info("Using school student pack for credit allocation", 
                                   school_id=school_id, 
                                   student_pack_id=student_pack_id, 
                                   credits=credits_to_allocate)
                    else:
                        logger.warning("School student pack not found, using fallback", 
                                     school_id=school_id, 
                                     student_pack_id=student_pack_id)
                else:
                    # No student pack configured, use fallback
                    starter_pack = session.query(PricingPack).filter(PricingPack.id == settings.fallback_pricing_pack_id).first()
                    if starter_pack:
                        credits_to_allocate = starter_pack.credits
                    logger.info("No student pack configured, using fallback", 
                               school_id=school_id, 
                               credits=credits_to_allocate)
                
                # Create user access with school-based credit allocation
                user_access_data = {
                    'id': self.generate_id(),
                    'user_id': user.id,
                    'allocated_count': credits_to_allocate,
                    'used_count': 0,
                    'current_pack_id': pack_id_to_use,
                    'created_at': datetime.utcnow()
                }
                
                user_access = UserAccess(**user_access_data)
                session.add(user_access)
                session.commit()
                
                logger.info("User created in school", user_id=user.id, school_id=school_id, created_by=created_by)
                
                # Return user data including password for potential email sending
                return {
                    "success": True, 
                    "user_id": user.id, 
                    "message": "User created successfully",
                    "user_data": {
                        "email": user.email,
                        "name": user.name,
                        "password": original_password  # Only for welcome email
                    }
                }
        except Exception as e:
            logger.error("Failed to create user in school", school_id=school_id, error=str(e))
            return {"success": False, "message": str(e)}

    def get_user_details_in_school(self, school_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed user information within school scope"""
        try:
            with self.mysql_service.get_db() as session:
                # SECURITY: Ensure user belongs to the school
                user = session.query(User).filter(
                    User.id == user_id,
                    User.school_id == school_id  # School scoping
                ).first()
                
                if not user:
                    return None
                
                user_access = session.query(UserAccess).filter(UserAccess.user_id == user_id).first()
                
                user_data = {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "is_active": user.is_active,
                    "email_verified": user.email_verified,
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "last_login": user.last_login.isoformat() if user.last_login else None,
                    "preferred_language_id": user.preferred_language_id,
                    "current_level": user.current_level,
                    "school_id": user.school_id,
                    "phone_number": user.phone_number,
                    "favorite_activities": user.favorite_activities,
                    "daily_goal": user.daily_goal,
                    "user_custom_school": user.user_custom_school or {},
                }
                
                if user_access:
                    user_data["access"] = {
                        "allocated_count": user_access.allocated_count,
                        "used_count": user_access.used_count,
                        "plan_type": user_access.current_pack_id if user_access.current_pack_id else settings.default_plan_type,
                        "status": user_access.status.value if user_access.status else "available",
                        "reserved_credits": user_access.reserved_credits,
                        "reset_at": user_access.reset_at.isoformat() if user_access.reset_at else None,
                        "created_at": user_access.created_at.isoformat() if user_access.created_at else None,
                    }
                
                return user_data
        except Exception as e:
            logger.error("Failed to get user details in school", school_id=school_id, user_id=user_id, error=str(e))
            return None

    def get_comprehensive_user_details_in_school(self, school_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive user details within school scope (similar to admin comprehensive details)"""
        # Get the basic user details first
        basic_user = self.get_user_details_in_school(school_id, user_id)
        if not basic_user:
            return None
        
        # Check if user has access data
        user_access = basic_user.get("access")
        if not user_access:
            logger.warning("User has no access record", user_id=user_id, school_id=school_id)
            # Provide default access values if no access record exists
            user_access = {
                "allocated_count": 0,
                "used_count": 0,
                "plan_type": "none",
                "status": "unavailable",
                "reserved_credits": 0,
                "reset_at": None,
                "created_at": None
            }
        
        # Transform the basic user data to comprehensive format
        user_data = {
            "user_id": basic_user["id"],
            "email": basic_user["email"],
            "name": basic_user["name"],
            "current_level": basic_user["current_level"],
            "is_active": basic_user["is_active"],
            "email_verified": basic_user["email_verified"],
            "created_at": basic_user["created_at"],
            "last_login": basic_user["last_login"],
            "preferred_language_id": basic_user["preferred_language_id"],
            "school_id": basic_user["school_id"],
            "phone_number": basic_user.get("phone_number"),
            "favorite_activities": basic_user.get("favorite_activities", []),
            "daily_goal": basic_user.get("daily_goal", 10),
            "user_custom_school": basic_user.get("user_custom_school", {}),
            
            # Usage information from access data
            "usage_info": {
                "allocated_count": user_access.get("allocated_count", 0),
                "used_count": user_access.get("used_count", 0),
                "remaining_count": user_access.get("allocated_count", 0) - user_access.get("used_count", 0),
                "plan_type": user_access.get("plan_type", "none"),
                "status": user_access.get("status", "unavailable"),
                "reserved_credits": user_access.get("reserved_credits", 0),
                "reset_at": user_access.get("reset_at"),
                "last_used": user_access.get("created_at"),
            },
            
            # Statistics (simplified for now)
            "practice_count": 0,
            "exam_count": 0,
            "last_practice_date": None,
            "last_exam_date": None,
            
            # User preferences
            "preferences": {
                "preferred_level": basic_user["current_level"],
                "favorite_activities": basic_user.get("favorite_activities", []),
                "daily_goal": basic_user.get("daily_goal", 10),
                "session_duration": 15,  # Default value
                "difficulty_preference": "balanced",  # Default value
                "preferred_language_id": basic_user["preferred_language_id"],
            }
        }
        
        return user_data

    def update_user_in_school(self, school_id: str, user_id: str, user_data: Dict[str, Any], updated_by: str) -> Dict[str, Any]:
        """Update user within school scope"""
        try:
            with self.mysql_service.get_db() as session:
                # SECURITY: Ensure user belongs to the school
                user = session.query(User).filter(
                    User.id == user_id,
                    User.school_id == school_id  # School scoping
                ).first()
                
                if not user:
                    return {"success": False, "message": "User not found in this school"}
                
                # SECURITY: Block email updates from school interface
                if 'email' in user_data:
                    logger.warning("Attempted email update blocked", 
                                 school_id=school_id, user_id=user_id, updated_by=updated_by)
                    return {"success": False, "message": "Email updates are not allowed from school interface. Please contact system administrator for email changes."}
                
                # Handle user_custom_school validation (restrict to allowed keys only)
                if 'user_custom_school' in user_data:
                    custom_data = user_data['user_custom_school']
                    if custom_data is not None:
                        # Allowed keys only: student_code, batch, remark
                        allowed_keys = {'student_code', 'batch', 'remark'}
                        if not isinstance(custom_data, dict):
                            return {"success": False, "message": "user_custom_school must be a JSON object"}
                        
                        # Check for invalid keys
                        invalid_keys = set(custom_data.keys()) - allowed_keys
                        if invalid_keys:
                            return {"success": False, "message": f"Invalid keys in user_custom_school: {', '.join(invalid_keys)}. Allowed keys: {', '.join(allowed_keys)}"}
                        
                        # Merge with existing data to preserve other allowed keys
                        current_custom = user.user_custom_school or {}
                        current_custom.update(custom_data)
                        # Force SQLAlchemy to detect the change by reassigning the field
                        user.user_custom_school = current_custom
                        # Mark the field as modified to ensure SQLAlchemy commits the change
                        from sqlalchemy.orm import attributes
                        attributes.flag_modified(user, 'user_custom_school')
                    
                    # Remove from user_data to avoid double processing
                    del user_data['user_custom_school']
                
                # Update other user fields
                for field, value in user_data.items():
                    if hasattr(user, field) and value is not None:
                        setattr(user, field, value)
                
                # Update timestamp
                user.updated_at = datetime.utcnow()
                
                session.commit()
                
                logger.info("User updated in school", 
                           user_id=user_id, 
                           school_id=school_id, 
                           updated_by=updated_by,
                           updated_fields=list(user_data.keys()))
                
                return {"success": True, "message": "User updated successfully", "user_id": user_id}
                
        except Exception as e:
            logger.error("Failed to update user in school", 
                        school_id=school_id, user_id=user_id, error=str(e))
            return {"success": False, "message": str(e)}

    def get_school_info(self, school_id: str) -> Optional[Dict[str, Any]]:
        """Get school information"""
        try:
            with self.mysql_service.get_db() as session:
                school = session.query(School).filter(School.id == school_id).first()
                
                if school:
                    return {
                        "id": school.id,
                        "name": school.name,
                        "display_name": school.display_name,
                        "description": school.description,
                        "school_type": school.school_type.value if school.school_type else None,
                        "is_active": school.is_active,
                        "contact_email": school.contact_email,
                        "admin_email": school.admin_email,
                        "settings": school.settings,
                        "created_at": school.created_at.isoformat() if school.created_at else None,
                    }
                return None
        except Exception as e:
            logger.error("Failed to get school info", school_id=school_id, error=str(e))
            return None

    def get_user_activities_in_school(self, school_id: str, user_id: str, 
                                    limit: int = 50, skip: int = 0,
                                    session_type: Optional[str] = None,
                                    activity_type: Optional[str] = None,
                                    level: Optional[str] = None,
                                    date_from: Optional[str] = None,
                                    date_to: Optional[str] = None) -> Dict[str, Any]:
        """Get user activities (exams and practice sessions) with credit usage within school scope"""
        try:
            with self.mysql_service.get_db() as session:
                # SECURITY: Ensure user belongs to the school
                user = session.query(User).filter(
                    User.id == user_id,
                    User.school_id == school_id  # School scoping
                ).first()
                
                if not user:
                    return {"success": False, "message": "User not found in this school", "data": []}
                
                # Build query for exam details (sessions)
                query = session.query(ExamDetail).filter(ExamDetail.user_id == user_id)
                
                # Apply filters
                if session_type:
                    query = query.filter(ExamDetail.session_type == session_type)
                
                if level:
                    query = query.filter(ExamDetail.level == level)
                
                if date_from:
                    try:
                        from datetime import datetime
                        date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                        query = query.filter(ExamDetail.created_at >= date_from_dt)
                    except ValueError:
                        logger.warning("Invalid date format - filter ignored", 
                                     date_param=date_from or date_to,
                                     method_context="date_filter")
                        pass  # Filter not applied due to invalid format
                
                if date_to:
                    try:
                        from datetime import datetime
                        date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                        query = query.filter(ExamDetail.created_at <= date_to_dt)
                    except ValueError:
                        logger.warning("Invalid date format - filter ignored", 
                                     date_param=date_from or date_to,
                                     method_context="date_filter")
                        pass  # Filter not applied due to invalid format
                
                # Order by created_at descending (most recent first)
                query = query.order_by(ExamDetail.created_at.desc())
                
                # Get total count before pagination
                total_count = query.count()
                
                # Apply pagination
                activities = query.offset(skip).limit(limit).all()
                
                # Get usage logs for these sessions to track credit usage
                session_ids = [activity.id for activity in activities]
                usage_logs = {}
                if session_ids:
                    logs = session.query(UsageLog).filter(
                        UsageLog.session_id.in_(session_ids)
                    ).all()
                    for log in logs:
                        usage_logs[log.session_id] = {
                            "points_deducted": log.points_deducted,
                            "points_remaining": log.points_remaining,
                            "status": log.status.value if log.status else "unknown",
                            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                            "description": log.description
                        }
                
                # Format response
                activities_data = []
                for activity in activities:
                    # Calculate question counts from template
                    template = activity.template or {}
                    total_questions = (
                        template.get('reading', 0) + 
                        template.get('writing', 0) + 
                        template.get('grammar', 0)
                    )
                    
                    # Get usage log for this session
                    usage_info = usage_logs.get(activity.id, {
                        "points_deducted": 0,
                        "points_remaining": 0,
                        "status": "unknown",
                        "timestamp": None,
                        "description": None
                    })
                    
                    activity_data = {
                        "session_id": activity.id,
                        "exam_name": activity.exam_name,
                        "session_type": activity.session_type.value if activity.session_type else "exam",
                        "level": activity.level,
                        "language_id": activity.language_id,
                        "template_id": activity.template_id,
                        "template": template,
                        "total_questions": total_questions,
                        "status": activity.status,
                        "created_at": activity.created_at.isoformat() if activity.created_at else None,
                        "started_at": activity.started_at.isoformat() if activity.started_at else None,
                        "completed_at": activity.completed_at.isoformat() if activity.completed_at else None,
                        "analyzed_at": activity.analyzed_at.isoformat() if activity.analyzed_at else None,
                        
                        # Credit usage information
                        "credit_usage": {
                            "points_deducted": usage_info["points_deducted"],
                            "points_remaining_after": usage_info["points_remaining"],
                            "status": usage_info["status"],
                            "deduction_timestamp": usage_info["timestamp"],
                            "description": usage_info["description"]
                        },
                        
                        # Activity breakdown from template
                        "activities": {
                            "reading": template.get('reading', 0),
                            "writing": template.get('writing', 0),
                            "grammar": template.get('grammar', 0)
                        }
                    }
                    
                    # Add exam summary if available
                    if activity.exam_summary:
                        summary = activity.exam_summary
                        if isinstance(summary, dict) and 'overall' in summary:
                            activity_data["results"] = {
                                "overall_score": summary['overall'].get('overall_score', 0),
                                "completed_activities": summary['overall'].get('completed_activities', 0),
                                "total_activities": summary['overall'].get('total_activities', 0),
                                "cefr_level_assessment": summary['overall'].get('cefr_level_assessment', '')
                            }
                    
                    activities_data.append(activity_data)
                
                return {
                    "success": True,
                    "message": "User activities retrieved successfully",
                    "data": {
                        "activities": activities_data,
                        "total_count": total_count,
                        "pagination": {
                            "limit": limit,
                            "skip": skip,
                            "has_more": (skip + limit) < total_count
                        }
                    }
                }
                
        except Exception as e:
            logger.error("Failed to get user activities in school", 
                        school_id=school_id, user_id=user_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve user activities", "data": []}

    # =================
    # TEMPLATE MANAGEMENT (School-Scoped)
    # =================

    def get_school_templates(self, school_id: str, level: Optional[str] = None, session_type: Optional[str] = None) -> Dict[str, Any]:
        """Get templates for a specific school with optional filters"""
        try:
            with self.mysql_service.get_db() as session:
                query = session.query(Templates).filter(
                    Templates.school_id == school_id,
                    Templates.is_active == True
                )
                
                if level:
                    query = query.filter(Templates.level == level)
                if session_type:
                    query = query.filter(Templates.session_type == session_type)
                
                templates = query.order_by(Templates.created_at.desc()).all()
                
                templates_data = []
                for template in templates:
                    template_data = {
                        "id": template.id,
                        "template_name": template.template_name,
                        "level": template.level,
                        "session_type": template.session_type,
                        "template_data": template.template_data,
                        "is_active": template.is_active,
                        "created_at": template.created_at.isoformat() if template.created_at else None,
                        "updated_at": template.updated_at.isoformat() if template.updated_at else None
                    }
                    templates_data.append(template_data)
                
                return {
                    "success": True,
                    "message": "Templates retrieved successfully",
                    "data": templates_data,
                    "active_template_count": len(templates_data),
                    "max_templates": 10
                }
                
        except Exception as e:
            logger.error("Failed to get school templates", school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve templates", "data": []}

    def create_school_template(self, school_id: str, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new template for a school with validation"""
        try:
            # Validate template data structure
            validation_result = self._validate_template_data(template_data)
            if not validation_result["valid"]:
                return {"success": False, "message": validation_result["error"]}
            
            with self.mysql_service.get_db() as session:
                # Check active template count limit (max 10)
                active_template_count = session.query(Templates).filter(
                    Templates.school_id == school_id,
                    Templates.is_active == True
                ).count()
                
                if active_template_count >= 10:
                    return {"success": False, "message": "Maximum template limit reached (10). Please delete or deactivate existing templates before creating new ones."}
                
                # Restrict practice template creation to B2C school only
                if template_data["session_type"] == "practice" and school_id != settings.default_b2c_school_id:
                    return {"success": False, "message": "Practice templates can only be created for individual users, not school accounts"}
                
                # Check if template name already exists for this school
                existing_template = session.query(Templates).filter(
                    Templates.school_id == school_id,
                    Templates.template_name == template_data["template_name"],
                    Templates.is_active == True
                ).first()
                
                if existing_template:
                    return {"success": False, "message": "Template name already exists"}
                
                # Create new template
                new_template = Templates(
                    id=self.generate_id(),
                    school_id=school_id,
                    level=template_data["level"],
                    template_name=template_data["template_name"],
                    template_data=template_data["template_data"],
                    session_type=template_data["session_type"],
                    is_active=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                session.add(new_template)
                session.commit()
                
                logger.info("Template created", template_id=new_template.id, school_id=school_id)
                
                return {
                    "success": True,
                    "message": "Template created successfully",
                    "template_id": new_template.id
                }
                
        except Exception as e:
            logger.error("Failed to create template", school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to create template"}

    def update_school_template(self, school_id: str, template_id: str, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing template with validation"""
        try:
            # Validate template data structure
            validation_result = self._validate_template_data(template_data)
            if not validation_result["valid"]:
                return {"success": False, "message": validation_result["error"]}
            
            with self.mysql_service.get_db() as session:
                # Get existing template
                template = session.query(Templates).filter(
                    Templates.id == template_id,
                    Templates.school_id == school_id,
                    Templates.is_active == True
                ).first()
                
                if not template:
                    return {"success": False, "message": "Template not found"}
                
                # Check if new name conflicts with another template
                if template_data.get("template_name") and template_data["template_name"] != template.template_name:
                    existing_template = session.query(Templates).filter(
                        Templates.school_id == school_id,
                        Templates.template_name == template_data["template_name"],
                        Templates.is_active == True,
                        Templates.id != template_id
                    ).first()
                    
                    if existing_template:
                        return {"success": False, "message": "Template name already exists"}
                
                # Update template fields
                if "template_name" in template_data:
                    template.template_name = template_data["template_name"]
                if "level" in template_data:
                    template.level = template_data["level"]
                if "session_type" in template_data:
                    template.session_type = template_data["session_type"]
                if "template_data" in template_data:
                    template.template_data = template_data["template_data"]
                
                template.updated_at = datetime.utcnow()
                session.commit()
                
                logger.info("Template updated", template_id=template_id, school_id=school_id)
                
                return {
                    "success": True,
                    "message": "Template updated successfully",
                    "template_id": template_id
                }
                
        except Exception as e:
            logger.error("Failed to update template", template_id=template_id, school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to update template"}

    def delete_school_template(self, school_id: str, template_id: str, force_deactivate: bool = False) -> Dict[str, Any]:
        """Delete template (mark as inactive) or check usage and offer deactivation"""
        try:
            with self.mysql_service.get_db() as session:
                # Get existing template
                template = session.query(Templates).filter(
                    Templates.id == template_id,
                    Templates.school_id == school_id,
                    Templates.is_active == True
                ).first()
                
                if not template:
                    return {"success": False, "message": "Template not found"}
                
                # Check if template has ANY usage (completed or active sessions)
                total_sessions = session.query(ExamDetail).filter(
                    ExamDetail.template_id == template_id
                ).count()
                
                # Check for active sessions
                active_sessions = session.query(ExamDetail).filter(
                    ExamDetail.template_id == template_id,
                    ExamDetail.status.in_(["created", "in_progress"])
                ).count()
                
                # If template has no usage at all, allow deletion (deactivation)
                if total_sessions == 0:
                    template.is_active = False
                    template.updated_at = datetime.utcnow()
                    session.commit()
                    
                    logger.info("Template deleted (no usage)", template_id=template_id, school_id=school_id)
                    
                    return {
                        "success": True,
                        "message": "Template deleted successfully",
                        "data": {"action": "deleted", "reason": "no_usage"}
                    }
                
                # If template has usage but force_deactivate is True, deactivate it
                elif force_deactivate:
                    # Still check for active sessions - don't allow deactivation if there are active sessions
                    if active_sessions > 0:
                        return {
                            "success": False, 
                            "message": f"Cannot deactivate template. {active_sessions} active sessions are using this template. Please wait for sessions to complete.",
                            "data": {"action": "blocked", "active_sessions": active_sessions}
                        }
                    
                    template.is_active = False
                    template.updated_at = datetime.utcnow()
                    session.commit()
                    
                    logger.info("Template deactivated (had usage)", template_id=template_id, school_id=school_id, total_sessions=total_sessions)
                    
                    return {
                        "success": True,
                        "message": f"Template deactivated successfully. {total_sessions} completed sessions preserved.",
                        "data": {"action": "deactivated", "total_sessions": total_sessions}
                    }
                
                # Template has usage but force_deactivate is False - ask user to confirm
                else:
                    return {
                        "success": False, 
                        "message": f"Template has been used in {total_sessions} sessions and cannot be deleted. Use deactivation instead.",
                        "data": {
                            "action": "requires_confirmation", 
                            "total_sessions": total_sessions,
                            "active_sessions": active_sessions,
                            "can_deactivate": active_sessions == 0
                        }
                    }
                
        except Exception as e:
            logger.error("Failed to delete template", template_id=template_id, school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to delete template"}

    # =================
    # DASHBOARD ANALYTICS
    # =================

    def get_dashboard_analytics(self, school_id: str) -> Dict[str, Any]:
        """Get basic dashboard analytics for school"""
        try:
            with self.mysql_service.get_db() as session:
                # Get total students count
                total_students = session.query(User).filter(
                    User.school_id == school_id
                ).count()
                
                # Get active students count
                active_students = session.query(User).filter(
                    User.school_id == school_id,
                    User.is_active.is_(True)
                ).count()
                
                # Calculate inactive students
                inactive_students = total_students - active_students
                
                # Get sessions in last 7 days
                seven_days_ago = datetime.utcnow() - timedelta(days=7)
                sessions_last_7_days = session.query(ExamDetail).join(
                    User
                ).filter(
                    User.school_id == school_id,
                    ExamDetail.created_at >= seven_days_ago
                ).count()
                
                # Get total sessions
                total_sessions = session.query(ExamDetail).join(User).filter(
                    User.school_id == school_id
                ).count()
                
                # Calculate average sessions per student
                avg_sessions_per_student = 0.0
                if total_students > 0:
                    avg_sessions_per_student = round(total_sessions / total_students, 2)
                
                return {
                    "success": True,
                    "data": {
                        "total_students": total_students,
                        "active_students": active_students,
                        "inactive_students": inactive_students,
                        "sessions_last_7_days": sessions_last_7_days,
                        "total_sessions": total_sessions,
                        "avg_sessions_per_student": avg_sessions_per_student
                    }
                }
                
        except Exception as e:
            logger.error("Failed to get dashboard analytics", school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve dashboard analytics"}

    def _validate_template_data(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate template data structure and activity limits"""
        try:
            # Required fields
            required_fields = ["template_name", "level", "session_type", "template_data"]
            for field in required_fields:
                if field not in template_data:
                    return {"valid": False, "error": f"Missing required field: {field}"}
            
            # Validate level
            valid_levels = ["A1", "A2", "B1", "B2", "ALL"]
            if template_data["level"] not in valid_levels:
                return {"valid": False, "error": f"Invalid level. Must be one of: {valid_levels}"}
            
            # Validate session type
            valid_session_types = ["exam", "practice"]
            if template_data["session_type"] not in valid_session_types:
                return {"valid": False, "error": f"Invalid session type. Must be one of: {valid_session_types}"}
            
            # Validate template_data structure
            template_activities = template_data["template_data"]
            if not isinstance(template_activities, dict):
                return {"valid": False, "error": "template_data must be a dictionary"}
            
            # Validate activity types and counts
            valid_activities = ["reading", "writing", "grammar", "hearing", "speaking"]
            for activity in valid_activities:
                if activity not in template_activities:
                    return {"valid": False, "error": f"Missing activity: {activity}"}
                
                count = template_activities[activity]
                if not isinstance(count, int) or count < 0:
                    return {"valid": False, "error": f"Invalid count for {activity}. Must be a non-negative integer"}
                
                # Validate max 15 activities per type
                if count > 15:
                    return {"valid": False, "error": f"Maximum 15 activities allowed per type. {activity} has {count}"}
            
            # Validate session-specific rules
            if template_data["session_type"] == "practice":
                # Practice sessions: only one activity type should be > 0
                non_zero_activities = [activity for activity, count in template_activities.items() if count > 0]
                if len(non_zero_activities) != 1:
                    return {"valid": False, "error": "Practice sessions must have exactly one activity type with count > 0"}
            
            elif template_data["session_type"] == "exam":
                # Exam sessions: at least one activity should be > 0
                total_activities = sum(template_activities.values())
                if total_activities == 0:
                    return {"valid": False, "error": "Exam sessions must have at least one activity with count > 0"}
            
            return {"valid": True, "error": None}
            
        except Exception as e:
            return {"valid": False, "error": f"Validation error: {str(e)}"}

    # =================
    # SCHOOL CREDIT MANAGEMENT
    # =================



    # =================
    # USER SESSION REPORTS (School-Scoped)
    # =================

    def get_user_sessions_in_school(self, school_id: str, user_id: str, 
                                   limit: int = 50, skip: int = 0,
                                   session_type: Optional[str] = None,
                                   status: Optional[str] = None,
                                   level: Optional[str] = None,
                                   date_from: Optional[str] = None,
                                   date_to: Optional[str] = None) -> Dict[str, Any]:
        """Get user sessions with detailed metadata within school scope"""
        try:
            with self.mysql_service.get_db() as session:
                # SECURITY: Ensure user belongs to the school
                user = session.query(User).filter(
                    User.id == user_id,
                    User.school_id == school_id  # School scoping
                ).first()
                
                if not user:
                    return {"success": False, "message": "User not found in this school", "data": {"sessions": [], "total_count": 0}}
                
                # Build query for exam details (sessions)
                query = session.query(ExamDetail).filter(ExamDetail.user_id == user_id)
                
                # Apply filters
                if session_type:
                    query = query.filter(ExamDetail.session_type == session_type)
                
                if status:
                    query = query.filter(ExamDetail.status == status)
                
                if level:
                    query = query.filter(ExamDetail.level == level)
                
                if date_from:
                    try:
                        from datetime import datetime
                        date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                        query = query.filter(ExamDetail.created_at >= date_from_dt)
                    except ValueError:
                        logger.warning("Invalid date format - filter ignored", 
                                     date_param=date_from or date_to,
                                     method_context="date_filter")
                        pass  # Filter not applied due to invalid format
                
                if date_to:
                    try:
                        from datetime import datetime
                        date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                        query = query.filter(ExamDetail.created_at <= date_to_dt)
                    except ValueError:
                        logger.warning("Invalid date format - filter ignored", 
                                     date_param=date_from or date_to,
                                     method_context="date_filter")
                        pass  # Filter not applied due to invalid format
                
                # Order by created_at descending (most recent first)
                query = query.order_by(ExamDetail.created_at.desc())
                
                # Get total count before pagination
                total_count = query.count()
                
                # Apply pagination
                sessions = query.offset(skip).limit(limit).all()
                
                # Get usage logs for these sessions to track credit usage
                session_ids = [s.id for s in sessions]
                usage_logs = {}
                if session_ids:
                    logs = session.query(UsageLog).filter(
                        UsageLog.session_id.in_(session_ids)
                    ).all()
                    for log in logs:
                        usage_logs[log.session_id] = {
                            "points_deducted": log.points_deducted,
                            "points_remaining": log.points_remaining,
                            "status": log.status.value if log.status else "unknown",
                            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                            "description": log.description
                        }
                
                # Format response
                sessions_data = []
                for s in sessions:
                    # Calculate duration
                    duration_minutes = None
                    if s.started_at and s.completed_at:
                        duration = s.completed_at - s.started_at
                        duration_minutes = int(duration.total_seconds() / 60)
                    
                    # Get usage info
                    usage_info = usage_logs.get(s.id, {
                        "points_deducted": 0,
                        "points_remaining": 0,
                        "status": "unknown",
                        "timestamp": None,
                        "description": None
                    })
                    
                    # Calculate question counts from template
                    template = s.template or {}
                    total_questions = (
                        template.get('reading', 0) + 
                        template.get('writing', 0) + 
                        template.get('grammar', 0)
                    )
                    
                    session_data = {
                        "session_id": s.id,
                        "exam_name": s.exam_name,
                        "session_type": s.session_type.value if s.session_type else "exam",
                        "level": s.level,
                        "language_id": s.language_id,
                        "template_id": s.template_id,
                        "template": template,
                        "total_questions": total_questions,
                        "status": s.status,
                        "created_at": s.created_at.isoformat() if s.created_at else None,
                        "started_at": s.started_at.isoformat() if s.started_at else None,
                        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                        "analyzed_at": s.analyzed_at.isoformat() if s.analyzed_at else None,
                        "duration_minutes": duration_minutes,
                        
                        # Credit usage information
                        "credit_usage": {
                            "points_deducted": usage_info["points_deducted"],
                            "points_remaining_after": usage_info["points_remaining"],
                            "status": usage_info["status"],
                            "deduction_timestamp": usage_info["timestamp"],
                            "description": usage_info["description"]
                        },
                        
                        # Activity breakdown from template
                        "activities": {
                            "reading": template.get('reading', 0),
                            "writing": template.get('writing', 0),
                            "grammar": template.get('grammar', 0)
                        }
                    }
                    
                    # Add exam summary if available
                    if s.exam_summary:
                        summary = s.exam_summary
                        if isinstance(summary, dict) and 'overall' in summary:
                            session_data["results"] = {
                                "overall_score": summary['overall'].get('overall_score', 0),
                                "completed_activities": summary['overall'].get('completed_activities', 0),
                                "total_activities": summary['overall'].get('total_activities', 0),
                                "cefr_level_assessment": summary['overall'].get('cefr_level_assessment', '')
                            }
                    
                    sessions_data.append(session_data)
                
                return {
                    "success": True,
                    "message": "User sessions retrieved successfully",
                    "data": {
                        "sessions": sessions_data,
                        "total_count": total_count
                    }
                }
                
        except Exception as e:
            logger.error("Failed to get user sessions in school", 
                        school_id=school_id, user_id=user_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve user sessions", "data": {"sessions": [], "total_count": 0}}

    def get_user_session_detail_in_school(self, school_id: str, user_id: str, session_id: str) -> Dict[str, Any]:
        """Get detailed session information within school scope"""
        try:
            with self.mysql_service.get_db() as session:
                # SECURITY: Ensure user belongs to the school
                user = session.query(User).filter(
                    User.id == user_id,
                    User.school_id == school_id  # School scoping
                ).first()
                
                if not user:
                    return {"success": False, "message": "User not found in this school"}
                
                # Get session detail
                exam_detail = session.query(ExamDetail).filter(
                    ExamDetail.id == session_id,
                    ExamDetail.user_id == user_id
                ).first()
                
                if not exam_detail:
                    return {"success": False, "message": "Session not found"}
                
                # Get usage log for credit information
                usage_log = session.query(UsageLog).filter(
                    UsageLog.session_id == session_id
                ).first()
                
                # Calculate duration
                duration_minutes = None
                if exam_detail.started_at and exam_detail.completed_at:
                    duration = exam_detail.completed_at - exam_detail.started_at
                    duration_minutes = int(duration.total_seconds() / 60)
                
                # Get template info
                template = exam_detail.template or {}
                total_questions = (
                    template.get('reading', 0) + 
                    template.get('writing', 0) + 
                    template.get('grammar', 0)
                )
                
                # Format session detail
                session_detail = {
                    "session_id": exam_detail.id,
                    "user_id": exam_detail.user_id,
                    "exam_name": exam_detail.exam_name,
                    "session_type": exam_detail.session_type.value if exam_detail.session_type else "exam",
                    "level": exam_detail.level,
                    "language_id": exam_detail.language_id,
                    "template_id": exam_detail.template_id,
                    "template": template,
                    "total_questions": total_questions,
                    "status": exam_detail.status,
                    "created_at": exam_detail.created_at.isoformat() if exam_detail.created_at else None,
                    "started_at": exam_detail.started_at.isoformat() if exam_detail.started_at else None,
                    "completed_at": exam_detail.completed_at.isoformat() if exam_detail.completed_at else None,
                    "analyzed_at": exam_detail.analyzed_at.isoformat() if exam_detail.analyzed_at else None,
                    "duration_minutes": duration_minutes,
                    
                    # Activity breakdown from template
                    "activities": {
                        "reading": template.get('reading', 0),
                        "writing": template.get('writing', 0),
                        "grammar": template.get('grammar', 0)
                    }
                }
                
                # Add credit usage information if available
                if usage_log:
                    session_detail["credit_usage"] = {
                        "points_deducted": usage_log.points_deducted,
                        "points_remaining_after": usage_log.points_remaining,
                        "status": usage_log.status.value if usage_log.status else "unknown",
                        "deduction_timestamp": usage_log.timestamp.isoformat() if usage_log.timestamp else None,
                        "description": usage_log.description
                    }
                
                # Add exam summary/results if available
                if exam_detail.exam_summary:
                    summary = exam_detail.exam_summary
                    if isinstance(summary, dict):
                        session_detail["results"] = summary
                        
                        # Extract overall results for easy access
                        if 'overall' in summary:
                            session_detail["overall_results"] = {
                                "overall_score": summary['overall'].get('overall_score', 0),
                                "completed_activities": summary['overall'].get('completed_activities', 0),
                                "total_activities": summary['overall'].get('total_activities', 0),
                                "cefr_level_assessment": summary['overall'].get('cefr_level_assessment', '')
                            }
                
                return {
                    "success": True,
                    "message": "Session detail retrieved successfully",
                    "data": session_detail
                }
                
        except Exception as e:
            logger.error("Failed to get user session detail in school", 
                        school_id=school_id, user_id=user_id, session_id=session_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve session detail"}

    # =================
    # TEMPLATE USAGE REPORTS (School-Scoped)
    # =================

    def get_templates_with_usage_stats(self, school_id: str, 
                                     limit: int = 50, skip: int = 0,
                                     level: Optional[str] = None,
                                     session_type: Optional[str] = None) -> Dict[str, Any]:
        """Get all school templates with usage statistics"""
        try:
            with self.mysql_service.get_db() as session:
                # Build query for templates
                query = session.query(Templates).filter(
                    Templates.school_id == school_id,
                    Templates.is_active == True
                )
                
                if level:
                    query = query.filter(Templates.level == level)
                if session_type:
                    query = query.filter(Templates.session_type == session_type)
                
                # Order by created_at descending
                query = query.order_by(Templates.created_at.desc())
                
                # Get total count before pagination
                total_count = query.count()
                
                # Apply pagination
                templates = query.offset(skip).limit(limit).all()
                
                # Get usage statistics for each template
                templates_data = []
                for template in templates:
                    # Count total sessions using this template
                    total_sessions = session.query(ExamDetail).join(User).filter(
                        ExamDetail.template_id == template.id,
                        User.school_id == school_id
                    ).count()
                    
                    # Count completed sessions
                    completed_sessions = session.query(ExamDetail).join(User).filter(
                        ExamDetail.template_id == template.id,
                        User.school_id == school_id,
                        ExamDetail.status == 'completed'
                    ).count()
                    
                    # Count analyzed sessions
                    analyzed_sessions = session.query(ExamDetail).join(User).filter(
                        ExamDetail.template_id == template.id,
                        User.school_id == school_id,
                        ExamDetail.status == 'analyzed'
                    ).count()
                    
                    # Count unique users who used this template
                    unique_users = session.query(ExamDetail.user_id).join(User).filter(
                        ExamDetail.template_id == template.id,
                        User.school_id == school_id
                    ).distinct().count()
                    
                    # Calculate completion rate
                    completion_rate = (completed_sessions + analyzed_sessions) / total_sessions * 100 if total_sessions > 0 else 0
                    
                    template_data = {
                        "template_id": template.id,
                        "template_name": template.template_name,
                        "level": template.level,
                        "session_type": template.session_type,
                        "template_data": template.template_data,
                        "is_active": template.is_active,
                        "created_at": template.created_at.isoformat() if template.created_at else None,
                        "updated_at": template.updated_at.isoformat() if template.updated_at else None,
                        
                        # Usage statistics
                        "usage_stats": {
                            "total_sessions": total_sessions,
                            "completed_sessions": completed_sessions,
                            "analyzed_sessions": analyzed_sessions,
                            "unique_users": unique_users,
                            "completion_rate": round(completion_rate, 2)
                        }
                    }
                    
                    templates_data.append(template_data)
                
                return {
                    "success": True,
                    "message": "Templates with usage stats retrieved successfully",
                    "data": {
                        "templates": templates_data,
                        "total_count": total_count
                    }
                }
                
        except Exception as e:
            logger.error("Failed to get templates with usage stats", school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve templates with usage statistics", "data": {"templates": [], "total_count": 0}}

    def get_template_users(self, school_id: str, template_id: str,
                          limit: int = 50, skip: int = 0,
                          status: Optional[str] = None,
                          date_from: Optional[str] = None,
                          date_to: Optional[str] = None) -> Dict[str, Any]:
        """Get all users who have used a specific template with their session details"""
        try:
            with self.mysql_service.get_db() as session:
                # Verify template belongs to school
                template = session.query(Templates).filter(
                    Templates.id == template_id,
                    Templates.school_id == school_id,
                    Templates.is_active == True
                ).first()
                
                if not template:
                    return {"success": False, "message": "Template not found in this school"}
                
                # Build query for users who used this template
                query = session.query(User, ExamDetail).join(
                    ExamDetail, User.id == ExamDetail.user_id
                ).filter(
                    User.school_id == school_id,
                    ExamDetail.template_id == template_id
                )
                
                # Apply filters
                if status:
                    query = query.filter(ExamDetail.status == status)
                
                if date_from:
                    try:
                        from datetime import datetime
                        date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                        query = query.filter(ExamDetail.created_at >= date_from_dt)
                    except ValueError:
                        pass
                
                if date_to:
                    try:
                        from datetime import datetime
                        date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                        query = query.filter(ExamDetail.created_at <= date_to_dt)
                    except ValueError:
                        pass
                
                # Order by session created_at descending
                query = query.order_by(ExamDetail.created_at.desc())
                
                # Get total count before pagination
                total_count = query.count()
                
                # Apply pagination
                user_sessions = query.offset(skip).limit(limit).all()
                
                # Format response
                users_data = []
                for user, exam_detail in user_sessions:
                    # Calculate duration
                    duration_minutes = None
                    if exam_detail.started_at and exam_detail.completed_at:
                        duration = exam_detail.completed_at - exam_detail.started_at
                        duration_minutes = int(duration.total_seconds() / 60)
                    
                    user_session_data = {
                        "user_id": user.id,
                        "user_name": user.name,
                        "user_email": user.email,
                        "is_active": user.is_active,
                        
                        # Session details
                        "session_id": exam_detail.id,
                        "exam_name": exam_detail.exam_name,
                        "status": exam_detail.status,
                        "created_at": exam_detail.created_at.isoformat() if exam_detail.created_at else None,
                        "started_at": exam_detail.started_at.isoformat() if exam_detail.started_at else None,
                        "completed_at": exam_detail.completed_at.isoformat() if exam_detail.completed_at else None,
                        "analyzed_at": exam_detail.analyzed_at.isoformat() if exam_detail.analyzed_at else None,
                        "duration_minutes": duration_minutes
                    }
                    
                    # Add results if available
                    if exam_detail.exam_summary:
                        summary = exam_detail.exam_summary
                        if isinstance(summary, dict) and 'overall' in summary:
                            user_session_data["results"] = {
                                "overall_score": summary['overall'].get('overall_score', 0),
                                "cefr_level_assessment": summary['overall'].get('cefr_level_assessment', '')
                            }
                    
                    users_data.append(user_session_data)
                
                # Template info
                template_info = {
                    "template_id": template.id,
                    "template_name": template.template_name,
                    "level": template.level,
                    "session_type": template.session_type,
                    "template_data": template.template_data
                }
                
                return {
                    "success": True,
                    "message": "Template users retrieved successfully",
                    "data": {
                        "template_info": template_info,
                        "users": users_data,
                        "total_count": total_count
                    }
                }
                
        except Exception as e:
            logger.error("Failed to get template users", 
                        school_id=school_id, template_id=template_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve template users"}

    def get_template_sessions(self, school_id: str, template_id: str,
                            limit: int = 50, skip: int = 0,
                            status: Optional[str] = None,
                            date_from: Optional[str] = None,
                            date_to: Optional[str] = None) -> Dict[str, Any]:
        """Get all sessions that used a specific template with detailed metadata"""
        try:
            with self.mysql_service.get_db() as session:
                # Verify template belongs to school
                template = session.query(Templates).filter(
                    Templates.id == template_id,
                    Templates.school_id == school_id,
                    Templates.is_active == True
                ).first()
                
                if not template:
                    return {"success": False, "message": "Template not found in this school"}
                
                # Build query for sessions using this template
                query = session.query(ExamDetail, User).join(
                    User, ExamDetail.user_id == User.id
                ).filter(
                    User.school_id == school_id,
                    ExamDetail.template_id == template_id
                )
                
                # Apply filters
                if status:
                    query = query.filter(ExamDetail.status == status)
                
                if date_from:
                    try:
                        from datetime import datetime
                        date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                        query = query.filter(ExamDetail.created_at >= date_from_dt)
                    except ValueError:
                        pass
                
                if date_to:
                    try:
                        from datetime import datetime
                        date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                        query = query.filter(ExamDetail.created_at <= date_to_dt)
                    except ValueError:
                        pass
                
                # Order by created_at descending
                query = query.order_by(ExamDetail.created_at.desc())
                
                # Get total count before pagination
                total_count = query.count()
                
                # Apply pagination
                session_users = query.offset(skip).limit(limit).all()
                
                # Get usage logs for these sessions
                session_ids = [exam_detail.id for exam_detail, user in session_users]
                usage_logs = {}
                if session_ids:
                    logs = session.query(UsageLog).filter(
                        UsageLog.session_id.in_(session_ids)
                    ).all()
                    for log in logs:
                        usage_logs[log.session_id] = {
                            "points_deducted": log.points_deducted,
                            "points_remaining": log.points_remaining,
                            "status": log.status.value if log.status else "unknown",
                            "timestamp": log.timestamp.isoformat() if log.timestamp else None
                        }
                
                # Format response
                sessions_data = []
                for exam_detail, user in session_users:
                    # Calculate duration
                    duration_minutes = None
                    if exam_detail.started_at and exam_detail.completed_at:
                        duration = exam_detail.completed_at - exam_detail.started_at
                        duration_minutes = int(duration.total_seconds() / 60)
                    
                    # Get usage info
                    usage_info = usage_logs.get(exam_detail.id, {
                        "points_deducted": 0,
                        "points_remaining": 0,
                        "status": "unknown",
                        "timestamp": None
                    })
                    
                    session_data = {
                        "session_id": exam_detail.id,
                        "exam_name": exam_detail.exam_name,
                        "status": exam_detail.status,
                        "level": exam_detail.level,
                        "created_at": exam_detail.created_at.isoformat() if exam_detail.created_at else None,
                        "started_at": exam_detail.started_at.isoformat() if exam_detail.started_at else None,
                        "completed_at": exam_detail.completed_at.isoformat() if exam_detail.completed_at else None,
                        "analyzed_at": exam_detail.analyzed_at.isoformat() if exam_detail.analyzed_at else None,
                        "duration_minutes": duration_minutes,
                        
                        # User info
                        "user": {
                            "user_id": user.id,
                            "user_name": user.name,
                            "user_email": user.email,
                            "is_active": user.is_active
                        },
                        
                        # Credit usage
                        "credit_usage": usage_info
                    }
                    
                    # Add results if available
                    if exam_detail.exam_summary:
                        summary = exam_detail.exam_summary
                        if isinstance(summary, dict) and 'overall' in summary:
                            session_data["results"] = {
                                "overall_score": summary['overall'].get('overall_score', 0),
                                "cefr_level_assessment": summary['overall'].get('cefr_level_assessment', '')
                            }
                    
                    sessions_data.append(session_data)
                
                # Template info
                template_info = {
                    "template_id": template.id,
                    "template_name": template.template_name,
                    "level": template.level,
                    "session_type": template.session_type,
                    "template_data": template.template_data
                }
                
                return {
                    "success": True,
                    "message": "Template sessions retrieved successfully",
                    "data": {
                        "template_info": template_info,
                        "sessions": sessions_data,
                        "total_count": total_count
                    }
                }
                
        except Exception as e:
            logger.error("Failed to get template sessions", 
                        school_id=school_id, template_id=template_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve template sessions"}

    def get_template_analytics(self, school_id: str, template_id: str) -> Dict[str, Any]:
        """Get analytics for a specific template including completion rates and performance metrics"""
        try:
            with self.mysql_service.get_db() as session:
                # Verify template belongs to school
                template = session.query(Templates).filter(
                    Templates.id == template_id,
                    Templates.school_id == school_id,
                    Templates.is_active == True
                ).first()
                
                if not template:
                    return {"success": False, "message": "Template not found in this school"}
                
                # Get comprehensive analytics
                total_sessions = session.query(ExamDetail).join(User).filter(
                    ExamDetail.template_id == template_id,
                    User.school_id == school_id
                ).count()
                
                completed_sessions = session.query(ExamDetail).join(User).filter(
                    ExamDetail.template_id == template_id,
                    User.school_id == school_id,
                    ExamDetail.status == 'completed'
                ).count()
                
                analyzed_sessions = session.query(ExamDetail).join(User).filter(
                    ExamDetail.template_id == template_id,
                    User.school_id == school_id,
                    ExamDetail.status == 'analyzed'
                ).count()
                
                unique_users = session.query(ExamDetail.user_id).join(User).filter(
                    ExamDetail.template_id == template_id,
                    User.school_id == school_id
                ).distinct().count()
                
                # Calculate rates
                completion_rate = (completed_sessions + analyzed_sessions) / total_sessions * 100 if total_sessions > 0 else 0
                
                # Get average scores for analyzed sessions
                analyzed_sessions_with_scores = session.query(ExamDetail).join(User).filter(
                    ExamDetail.template_id == template_id,
                    User.school_id == school_id,
                    ExamDetail.status == 'analyzed',
                    ExamDetail.exam_summary.isnot(None)
                ).all()
                
                scores = []
                for s in analyzed_sessions_with_scores:
                    if s.exam_summary and isinstance(s.exam_summary, dict):
                        overall = s.exam_summary.get('overall', {})
                        if 'overall_score' in overall:
                            scores.append(overall['overall_score'])
                
                average_score = sum(scores) / len(scores) if scores else 0
                
                # Calculate average duration for completed sessions
                completed_sessions_with_duration = session.query(ExamDetail).join(User).filter(
                    ExamDetail.template_id == template_id,
                    User.school_id == school_id,
                    ExamDetail.status.in_(['completed', 'analyzed']),
                    ExamDetail.started_at.isnot(None),
                    ExamDetail.completed_at.isnot(None)
                ).all()
                
                durations = []
                for s in completed_sessions_with_duration:
                    if s.started_at and s.completed_at:
                        duration = s.completed_at - s.started_at
                        durations.append(duration.total_seconds() / 60)
                
                average_duration = sum(durations) / len(durations) if durations else 0
                
                # Template info
                template_info = {
                    "template_id": template.id,
                    "template_name": template.template_name,
                    "level": template.level,
                    "session_type": template.session_type,
                    "template_data": template.template_data,
                    "created_at": template.created_at.isoformat() if template.created_at else None
                }
                
                # Analytics data
                analytics = {
                    "total_sessions": total_sessions,
                    "completed_sessions": completed_sessions,
                    "analyzed_sessions": analyzed_sessions,
                    "unique_users": unique_users,
                    "completion_rate": round(completion_rate, 2),
                    "average_score": round(average_score, 2),
                    "average_duration_minutes": round(average_duration, 2),
                    "score_distribution": {
                        "total_scored_sessions": len(scores),
                        "highest_score": max(scores) if scores else 0,
                        "lowest_score": min(scores) if scores else 0
                    }
                }
                
                return {
                    "success": True,
                    "message": "Template analytics retrieved successfully",
                    "data": {
                        "template_info": template_info,
                        "analytics": analytics
                    }
                }
                
        except Exception as e:
            logger.error("Failed to get template analytics", 
                        school_id=school_id, template_id=template_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve template analytics"}

    # =================
    # SESSION CREATION (School Domain)
    # =================
    
    def validate_users_in_school(self, school_id: str, user_ids: List[str]) -> Dict[str, Any]:
        """Validate that all users belong to the specified school"""
        try:
            with self.mysql_service.get_db() as session:
                # Get all users with their details
                users = session.query(User).filter(
                    User.id.in_(user_ids),
                    User.school_id == school_id,
                    User.is_active == True
                ).all()
                
                found_user_ids = {user.id for user in users}
                missing_user_ids = set(user_ids) - found_user_ids
                
                # Build user details
                user_details = {}
                for user in users:
                    user_details[user.id] = {
                        "id": user.id,
                        "name": user.name,
                        "email": user.email,
                        "is_active": user.is_active,
                        "school_id": user.school_id
                    }
                
                return {
                    "success": True,
                    "valid_users": user_details,
                    "invalid_user_ids": list(missing_user_ids),
                    "message": f"Validated {len(user_details)} users"
                }
                
        except Exception as e:
            logger.error("Failed to validate users in school", 
                        school_id=school_id, user_ids=user_ids, error=str(e))
            return {
                "success": False,
                "message": "Failed to validate users",
                "valid_users": {},
                "invalid_user_ids": user_ids
            }
    
    def validate_template_in_school(self, school_id: str, template_id: str) -> Dict[str, Any]:
        """Validate that template belongs to the specified school"""
        try:
            with self.mysql_service.get_db() as session:
                template = session.query(Templates).filter(
                    Templates.id == template_id,
                    Templates.school_id == school_id,
                    Templates.is_active == True
                ).first()
                
                if template:
                    return {
                        "success": True,
                        "template": {
                            "id": template.id,
                            "template_name": template.template_name,
                            "level": template.level,
                            "session_type": template.session_type,
                            "template_data": template.template_data
                        },
                        "message": "Template validated successfully"
                    }
                else:
                    return {
                        "success": False,
                        "message": "Template not found or not accessible to this school"
                    }
                    
        except Exception as e:
            logger.error("Failed to validate template in school", 
                        school_id=school_id, template_id=template_id, error=str(e))
            return {"success": False, "message": "Failed to validate template"}
    
    def create_session_for_user(self, user_id: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create session in exam_detail table (duplicated from CoreRepository for domain isolation)
        This duplication is acceptable for maintaining domain boundaries
        """
        try:
            exam_data = {
                'id': self.generate_id(),
                'user_id': user_id,
                'exam_name': session_data['exam_name'],
                'level': session_data['level'],
                'language_id': session_data['language_id'],
                'template_id': session_data['template_id'],
                'template': session_data['template_data'],
                'session_type': session_data['session_type'],
                'status': 'created',  # Sessions start as 'created'
                'created_at': datetime.utcnow(),
                'created_by_school_id': session_data['school_id'],  # NEW FIELD
                'school_metadata': session_data.get('metadata', {})  # NEW FIELD
            }
            
            with self.mysql_service.get_db() as session:
                from app.common.models.mysql_models import ExamDetail
                exam = ExamDetail(**exam_data)
                session.add(exam)
                session.flush()  # Get the ID without committing
                exam_id = exam.id  # Extract ID while still in session
                session.commit()  # Commit the transaction
            
            logger.info("School session created", 
                       exam_id=exam_id, 
                       user_id=user_id, 
                       school_id=session_data['school_id'])
            return {"success": True, "exam_id": exam_id}
            
        except Exception as e:
            logger.error("Failed to create session for user", 
                        user_id=user_id, 
                        school_id=session_data.get('school_id'), 
                        error=str(e))
            return {"success": False, "message": "Failed to create session"}
    
    def log_school_session_creation(self, school_id: str, session_data: Dict[str, Any]) -> bool:
        """Log school-initiated session creation for audit trail"""
        try:
            # This could be extended to write to a separate audit log table
            logger.info("School session creation logged",
                       school_id=school_id,
                       session_count=session_data.get('session_count', 0),
                       template_id=session_data.get('template_id'),
                       created_by=session_data.get('created_by_admin_id'),
                       timestamp=datetime.utcnow().isoformat())
            return True
            
        except Exception as e:
            logger.error("Failed to log school session creation", 
                        school_id=school_id, error=str(e))
            return False

    # =================
    # SESSION MANAGEMENT METHODS  
    # =================

    def get_session_detail(self, school_id: str, session_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a session and its users"""
        try:
            with self.mysql_service.get_db() as session:
                from app.common.models.mysql_models import ExamDetail, User
                
                # Get session detail - only sessions created by this school
                exam = session.query(ExamDetail).filter(
                    ExamDetail.id == session_id,
                    ExamDetail.created_by_school_id == school_id
                ).first()
                
                if not exam:
                    return None
                
                # Get all users for this session
                users = session.query(User, ExamDetail).join(
                    ExamDetail, User.id == ExamDetail.user_id
                ).filter(
                    ExamDetail.id == session_id
                ).all()
                
                # Build session detail
                session_users = []
                status_counts = {"created": 0, "started": 0, "completed": 0}
                
                for user, exam_detail in users:
                    # Extract overall_score from exam_summary JSON field
                    overall_score = 0
                    if exam_detail.exam_summary and isinstance(exam_detail.exam_summary, dict):
                        overall_summary = exam_detail.exam_summary.get('overall', {})
                        overall_score = overall_summary.get('overall_score', 0)
                    
                    user_data = {
                        "user_id": user.id,
                        "user_name": user.name,
                        "user_email": user.email,
                        "status": exam_detail.status,
                        "created_at": exam_detail.created_at.isoformat() if exam_detail.created_at else None,
                        "started_at": exam_detail.started_at.isoformat() if exam_detail.started_at else None,
                        "completed_at": exam_detail.completed_at.isoformat() if exam_detail.completed_at else None,
                        "overall_score": overall_score
                    }
                    session_users.append(user_data)
                    
                    # Count statuses
                    if exam_detail.status in status_counts:
                        status_counts[exam_detail.status] += 1
                
                # Build session metadata
                template_data = exam.template or {}
                session_detail = {
                    "session_id": exam.id,
                    "session_name": exam.exam_name,
                    "template_id": template_data.get("id", ""),
                    "template_name": template_data.get("name", ""),
                    "level": exam.level,
                    "session_type": exam.session_type,
                    "status": exam.status,
                    "created_at": exam.created_at.isoformat() if exam.created_at else None,
                    "total_users": len(session_users),
                    "started_users": status_counts["started"],
                    "completed_users": status_counts["completed"],
                    "users": session_users
                }
                
                return {
                    "session": session_detail,
                    "pagination": None  # Single session, no pagination needed
                }
                
        except Exception as e:
            logger.error("Failed to get session detail", 
                        school_id=school_id, session_id=session_id, error=str(e))
            return None

    def get_session_users(self, school_id: str, session_id: str, page: int, per_page: int, 
                         status_filter: Optional[str] = None, search: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get users in a session with pagination and filtering"""
        try:
            with self.mysql_service.get_db() as session:
                from app.common.models.mysql_models import ExamDetail, User
                from sqlalchemy import and_, or_
                
                # Verify session belongs to school
                session_check = session.query(ExamDetail).filter(
                    ExamDetail.id == session_id,
                    ExamDetail.created_by_school_id == school_id
                ).first()
                
                if not session_check:
                    return None
                
                # Build query for users in this session
                base_query = session.query(User, ExamDetail).join(
                    ExamDetail, User.id == ExamDetail.user_id
                ).filter(ExamDetail.id == session_id)
                
                # Get status counts for all users (before applying filters)
                all_exam_details = session.query(ExamDetail).filter(ExamDetail.id == session_id).all()
                status_counts = {"created": 0, "started": 0, "completed": 0}
                for exam_detail in all_exam_details:
                    if exam_detail.status in status_counts:
                        status_counts[exam_detail.status] += 1
                
                # Apply filters to the query for pagination
                query = base_query
                
                # Apply status filter
                if status_filter:
                    query = query.filter(ExamDetail.status == status_filter)
                
                # Apply search filter
                if search:
                    search_pattern = f"%{search}%"
                    query = query.filter(
                        or_(
                            User.name.like(search_pattern),
                            User.email.like(search_pattern)
                        )
                    )
                
                # Get total count for pagination
                total_count = query.count()
                
                # Apply pagination
                offset = (page - 1) * per_page
                users_data = query.offset(offset).limit(per_page).all()
                
                # Build user list
                session_users = []
                for user, exam_detail in users_data:
                    # Extract overall_score from exam_summary JSON field
                    overall_score = 0
                    if exam_detail.exam_summary and isinstance(exam_detail.exam_summary, dict):
                        overall_summary = exam_detail.exam_summary.get('overall', {})
                        overall_score = overall_summary.get('overall_score', 0)
                    
                    user_data = {
                        "user_id": user.id,
                        "user_name": user.name,
                        "user_email": user.email,
                        "status": exam_detail.status,
                        "created_at": exam_detail.created_at.isoformat() if exam_detail.created_at else None,
                        "started_at": exam_detail.started_at.isoformat() if exam_detail.started_at else None,
                        "completed_at": exam_detail.completed_at.isoformat() if exam_detail.completed_at else None,
                        "overall_score": overall_score
                    }
                    session_users.append(user_data)
                
                # Build pagination info
                total_pages = (total_count + per_page - 1) // per_page
                pagination = {
                    "page": page,
                    "per_page": per_page,
                    "total": total_count,
                    "total_pages": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1
                }
                
                # Build session information with all required fields
                template_data = session_check.template or {}
                
                return {
                    "session": {
                        "session_id": session_id,
                        "session_name": session_check.exam_name,
                        "template_id": template_data.get("id", ""),
                        "template_name": template_data.get("name", ""),
                        "level": session_check.level,
                        "session_type": session_check.session_type.value if session_check.session_type else "exam",
                        "status": session_check.status,
                        "created_at": session_check.created_at.isoformat() if session_check.created_at else None,
                        "total_users": total_count,
                        "started_users": status_counts.get("started", 0),
                        "completed_users": status_counts.get("completed", 0),
                        "users": session_users
                    },
                    "pagination": pagination
                }
                
        except Exception as e:
            logger.error("Failed to get session users", 
                        school_id=school_id, session_id=session_id, error=str(e))
            return None

    def get_available_users_for_session(self, school_id: str, session_id: str, 
                                       page: int, per_page: int, search: Optional[str] = None) -> Dict[str, Any]:
        """Get users that can be added to a session"""
        try:
            with self.mysql_service.get_db() as session:
                from app.common.models.mysql_models import ExamDetail, User
                from sqlalchemy import and_, or_, func
                
                # Get users in this school who don't already have this session
                subquery = session.query(ExamDetail.user_id).filter(
                    ExamDetail.id == session_id
                ).subquery()
                
                query = session.query(User).filter(
                    and_(
                        User.school_id == school_id,
                        User.is_active == True,
                        User.id.notin_(subquery)
                    )
                )
                
                # Apply search filter
                if search:
                    search_pattern = f"%{search}%"
                    query = query.filter(
                        or_(
                            User.name.like(search_pattern),
                            User.email.like(search_pattern)
                        )
                    )
                
                # Get total count for pagination
                total_count = query.count()
                
                # Apply pagination
                offset = (page - 1) * per_page
                users = query.offset(offset).limit(per_page).all()
                
                # Build available users list
                available_users = []
                for user in users:
                    # Check if user has other sessions (for context)
                    session_count = session.query(func.count(ExamDetail.id)).filter(
                        ExamDetail.user_id == user.id
                    ).scalar() or 0
                    
                    user_data = {
                        "id": user.id,
                        "name": user.name,
                        "email": user.email,
                        "has_session": False,  # They don't have this session by definition
                        "session_count": session_count
                    }
                    available_users.append(user_data)
                
                # Build pagination info
                total_pages = (total_count + per_page - 1) // per_page
                pagination = {
                    "page": page,
                    "per_page": per_page,
                    "total": total_count,
                    "total_pages": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1
                }
                
                return {
                    "users": available_users,
                    "pagination": pagination
                }
                
        except Exception as e:
            logger.error("Failed to get available users for session", 
                        school_id=school_id, session_id=session_id, error=str(e))
            return {
                "users": [],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": 0,
                    "total_pages": 0,
                    "has_next": False,
                    "has_prev": False
                }
            }

    def validate_session_ownership(self, school_id: str, session_id: str) -> bool:
        """Validate that a session belongs to the specified school"""
        try:
            with self.mysql_service.get_db() as session:
                from app.common.models.mysql_models import ExamDetail
                
                exam = session.query(ExamDetail).filter(
                    ExamDetail.id == session_id,
                    ExamDetail.created_by_school_id == school_id
                ).first()
                
                return exam is not None
                
        except Exception as e:
            logger.error("Failed to validate session ownership", 
                        school_id=school_id, session_id=session_id, error=str(e))
            return False

    def add_users_to_session(self, school_id: str, session_id: str, 
                           user_ids: List[str], admin_id: str) -> Dict[str, Any]:
        """Add users to an existing session"""
        try:
            with self.mysql_service.get_db() as session:
                from app.common.models.mysql_models import ExamDetail, User
                
                # Get the original session to copy template data
                original_session = session.query(ExamDetail).filter(
                    ExamDetail.id == session_id,
                    ExamDetail.created_by_school_id == school_id
                ).first()
                
                if not original_session:
                    return {
                        "added_users": [],
                        "failed_users": [{"user_id": "all", "reason": "Session not found"}],
                        "summary": {"added": 0, "failed": len(user_ids)}
                    }
                
                added_users = []
                failed_users = []
                
                for user_id in user_ids:
                    try:
                        # Check if user exists and belongs to school
                        user = session.query(User).filter(
                            User.id == user_id,
                            User.school_id == school_id,
                            User.is_active == True
                        ).first()
                        
                        if not user:
                            failed_users.append({
                                "user_id": user_id,
                                "reason": "User not found or not active"
                            })
                            continue
                        
                        # Check if user already has this session
                        existing_session = session.query(ExamDetail).filter(
                            ExamDetail.id == session_id,
                            ExamDetail.user_id == user_id
                        ).first()
                        
                        if existing_session:
                            failed_users.append({
                                "user_id": user_id,
                                "reason": "User already has this session"
                            })
                            continue
                        
                        # Create new session entry for user (copy from original)
                        new_session_data = {
                            "id": self.generate_id(),
                            "user_id": user_id,
                            "name": original_session.name,
                            "level": original_session.level,
                            "language_id": original_session.language_id,
                            "template": original_session.template,
                            "session_type": original_session.session_type,
                            "status": "created",
                            "created_at": datetime.utcnow(),
                            "created_by_school_id": school_id,
                            "school_metadata": {
                                "added_by_admin": admin_id,
                                "added_at": datetime.utcnow().isoformat(),
                                "original_session_id": session_id
                            }
                        }
                        
                        new_exam = ExamDetail(**new_session_data)
                        session.add(new_exam)
                        added_users.append(user_id)
                        
                    except Exception as e:
                        logger.error("Failed to add user to session", 
                                   user_id=user_id, session_id=session_id, error=str(e))
                        failed_users.append({
                            "user_id": user_id,
                            "reason": f"Internal error: {str(e)}"
                        })
                
                session.commit()
                
                return {
                    "added_users": added_users,
                    "failed_users": failed_users,
                    "summary": {
                        "added": len(added_users),
                        "failed": len(failed_users)
                    }
                }
                
        except Exception as e:
            logger.error("Failed to add users to session", 
                        school_id=school_id, session_id=session_id, error=str(e))
            return {
                "added_users": [],
                "failed_users": [{"user_id": "all", "reason": "Internal error"}],
                "summary": {"added": 0, "failed": len(user_ids)}
            }


def get_school_repository() -> SchoolRepository:
    """Get SchoolRepository instance"""
    return SchoolRepository()
