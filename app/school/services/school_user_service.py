"""
School User Service - SCHOOL DOMAIN SERVICE LAYER
Orchestrates school-scoped user management business logic
All operations are automatically scoped to the specified school
"""

from typing import Optional, Dict, Any
import structlog

# Import SchoolRepository following BE_ARCH.md guidelines
from app.school.models.school_repository import SchoolRepository
from app.common.services.email_service import EmailService

logger = structlog.get_logger()


class SchoolUserService:
    """
    School User Service - Service Layer
    Orchestrates school-scoped user management business logic
    """

    def __init__(self):
        self.school_repo = SchoolRepository()
        self.email_service = EmailService()

    def list_users_in_school(
        self, 
        school_id: str, 
        page: int = 1, 
        per_page: int = 10, 
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        email_verified: Optional[bool] = None,
        current_level: Optional[str] = None,
        created_after: Optional[str] = None,
        created_before: Optional[str] = None,
        last_login_after: Optional[str] = None,
        last_login_before: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get paginated list of users in a specific school with filtering"""
        try:
            # Validate input parameters
            if not school_id or not school_id.strip():
                return {
                    "success": False,
                    "message": "School ID is required",
                    "data": None
                }
            
            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 10
            
            # Calculate offset for pagination
            offset = (page - 1) * per_page
            
            # Prepare filter parameters
            filter_params = {
                "search": search,
                "is_active": is_active,
                "email_verified": email_verified,
                "current_level": current_level,
                "created_after": created_after,
                "created_before": created_before,
                "last_login_after": last_login_after,
                "last_login_before": last_login_before
            }
            
            # Get users from repository (school-scoped)
            users = self.school_repo.get_school_users(
                school_id=school_id,
                limit=per_page + 1,  # Get one extra to check if there are more pages
                skip=offset,
                **filter_params
            )
            
            # Check if there are more pages
            has_more = len(users) > per_page
            if has_more:
                users = users[:per_page]  # Remove the extra item
            
            # Get total count for pagination with same filters
            total_count = self.school_repo.get_school_users_count(
                school_id=school_id,
                **filter_params
            )
            
            return {
                "success": True,
                "message": "Users retrieved successfully",
                "data": {
                    "users": users,
                    "total_count": total_count,
                    "pagination": {
                        "page": page,
                        "per_page": per_page,
                        "has_more": has_more,
                        "total_pages": (total_count + per_page - 1) // per_page if per_page > 0 else 0,
                    }
                }
            }
        except Exception as e:
            logger.error("Failed to list users in school", school_id=school_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to retrieve users",
                "data": {"users": [], "total_count": 0, "pagination": {}}
            }

    async def create_user_in_school(
        self, 
        school_id: str, 
        user_data: Dict[str, Any], 
        created_by: str
    ) -> Dict[str, Any]:
        """Create a new user in the specified school"""
        try:
            # Validate required fields
            required_fields = ["email", "name"]
            missing_fields = [field for field in required_fields if not user_data.get(field)]
            
            if missing_fields:
                return {
                    "success": False,
                    "message": f"Missing required fields: {', '.join(missing_fields)}",
                    "data": None
                }
            
            # Validate email format (basic validation)
            email = user_data.get("email", "").strip().lower()
            if not email or "@" not in email:
                return {
                    "success": False,
                    "message": "Invalid email format",
                    "data": None
                }
            
            # Create user via repository (school-scoped)
            result = self.school_repo.create_user_in_school(
                school_id=school_id,
                user_data=user_data,
                created_by=created_by
            )
            
            if result.get("success"):
                logger.info("User created in school successfully", 
                           user_id=result.get("user_id"), 
                           school_id=school_id)
                
                # Send welcome email if user creation was successful and we have user data
                user_creation_data = result.get("user_data")
                if user_creation_data and user_creation_data.get("password"):
                    try:
                        # Get school information for email
                        school_info = self.school_repo.get_school_info(school_id)
                        school_name = school_info.get("name", "Your School") if school_info else "Your School"
                        
                        # Send welcome email synchronously - blocks until complete
                        # Note: Email failure won't block user creation (in try/catch)
                        await self.email_service.send_student_welcome_email(
                            email=user_creation_data["email"],
                            password=user_creation_data["password"],
                            student_name=user_creation_data["name"],
                            school_name=school_name
                        )
                        logger.info("Welcome email sent successfully", 
                                   user_id=result.get("user_id"),
                                   email=user_creation_data["email"],
                                   school_name=school_name)
                    except Exception as e:
                        # Email failure should not affect user creation success
                        logger.error("Failed to send welcome email for new student", 
                                   user_id=result.get("user_id"),
                                   error=str(e))
            
            return result
            
        except Exception as e:
            logger.error("Failed to create user in school", school_id=school_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to create user",
                "data": None
            }

    def get_user_details_in_school(
        self, 
        school_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """Get detailed user information within school scope"""
        try:
            user_details = self.school_repo.get_user_details_in_school(school_id, user_id)
            
            if not user_details:
                return {
                    "success": False,
                    "message": "User not found in this school",
                    "data": None
                }
            
            return {
                "success": True,
                "message": "User details retrieved successfully",
                "data": {"user": user_details}
            }
        except Exception as e:
            logger.error("Failed to get user details in school", 
                        school_id=school_id, user_id=user_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to retrieve user details",
                "data": None
            }

    def update_user_in_school(
        self, 
        school_id: str, 
        user_id: str, 
        user_data: Dict[str, Any], 
        updated_by: str
    ) -> Dict[str, Any]:
        """Update user within school scope"""
        try:
            # Update user via repository
            result = self.school_repo.update_user_in_school(school_id, user_id, user_data, updated_by)
            
            if result["success"]:
                return {
                    "success": True,
                    "message": result["message"],
                    "data": {"user_id": result["user_id"]}
                }
            else:
                return {
                    "success": False,
                    "message": result["message"],
                    "data": None
                }
            
        except Exception as e:
            logger.error("Failed to update user in school", 
                        school_id=school_id, user_id=user_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to update user",
                "data": None
            }

    def deactivate_user_in_school(
        self, 
        school_id: str, 
        user_id: str, 
        deactivated_by: str
    ) -> Dict[str, Any]:
        """Deactivate user within school scope (soft delete)"""
        try:
            # First verify user exists in school
            existing_user = self.school_repo.get_user_details_in_school(school_id, user_id)
            if not existing_user:
                return {
                    "success": False,
                    "message": "User not found in this school",
                    "data": None
                }
            
            # Deactivate user (set is_active = False)
            update_result = self.update_user_in_school(
                school_id=school_id,
                user_id=user_id,
                user_data={"is_active": False},
                updated_by=deactivated_by
            )
            
            if update_result["success"]:
                logger.info("User deactivated in school", 
                           user_id=user_id, 
                           school_id=school_id, 
                           deactivated_by=deactivated_by)
                return {
                    "success": True,
                    "message": "User deactivated successfully",
                    "data": {"user_id": user_id}
                }
            else:
                return update_result
            
        except Exception as e:
            logger.error("Failed to deactivate user in school", 
                        school_id=school_id, user_id=user_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to deactivate user",
                "data": None
            }

    def get_school_info(self, school_id: str) -> Dict[str, Any]:
        """Get school information"""
        try:
            school_info = self.school_repo.get_school_info(school_id)
            
            if not school_info:
                return {
                    "success": False,
                    "message": "School not found",
                    "data": None
                }
            
            return {
                "success": True,
                "message": "School information retrieved successfully",
                "data": {"school": school_info}
            }
        except Exception as e:
            logger.error("Failed to get school info", school_id=school_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to retrieve school information",
                "data": None
            }

    def get_comprehensive_user_details_in_school(
        self, 
        school_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """Get comprehensive user details within school scope"""
        try:
            user_details = self.school_repo.get_comprehensive_user_details_in_school(school_id, user_id)
            
            if not user_details:
                return {
                    "success": False,
                    "message": "User not found in this school",
                    "data": None
                }
            
            return {
                "success": True,
                "message": "Comprehensive user details retrieved successfully",
                "data": user_details
            }
        except Exception as e:
            logger.error("Failed to get comprehensive user details in school", 
                        school_id=school_id, user_id=user_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to retrieve comprehensive user details",
                "data": None
            }

    def get_user_activities_in_school(
        self, 
        school_id: str, 
        user_id: str,
        page: int = 1,
        per_page: int = 50,
        session_type: Optional[str] = None,
        activity_type: Optional[str] = None,
        level: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get user activities (exams and practice sessions) with credit usage within school scope"""
        try:
            # Validate input parameters
            if not school_id or not school_id.strip():
                return {
                    "success": False,
                    "message": "School ID is required",
                    "data": None
                }
            
            if not user_id or not user_id.strip():
                return {
                    "success": False,
                    "message": "User ID is required",
                    "data": None
                }
            
            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 50
            
            # Calculate offset for pagination
            skip = (page - 1) * per_page
            
            # Get activities from repository
            result = self.school_repo.get_user_activities_in_school(
                school_id=school_id,
                user_id=user_id,
                limit=per_page,
                skip=skip,
                session_type=session_type,
                activity_type=activity_type,
                level=level,
                date_from=date_from,
                date_to=date_to
            )
            
            if result["success"]:
                # Add pagination info
                data = result["data"]
                total_count = data["total_count"]
                
                data["pagination"] = {
                    "page": page,
                    "per_page": per_page,
                    "total_count": total_count,
                    "total_pages": (total_count + per_page - 1) // per_page if per_page > 0 else 0,
                    "has_more": (skip + per_page) < total_count
                }
                
                return {
                    "success": True,
                    "message": "User activities retrieved successfully",
                    "data": data
                }
            else:
                return result
                
        except Exception as e:
            logger.error("Failed to get user activities in school", 
                        school_id=school_id, user_id=user_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to retrieve user activities",
                "data": None
            }


    def get_user_sessions_in_school(
        self,
        school_id: str,
        user_id: str,
        page: int = 1,
        per_page: int = 50,
        session_type: Optional[str] = None,
        status: Optional[str] = None,
        level: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get user sessions with detailed metadata within school scope"""
        try:
            # Validate input parameters
            if not school_id or not school_id.strip():
                return {"success": False, "message": "School ID is required"}
            
            if not user_id or not user_id.strip():
                return {"success": False, "message": "User ID is required"}
            
            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 50
            
            # Calculate offset
            offset = (page - 1) * per_page
            
            # Get sessions from repository
            result = self.school_repo.get_user_sessions_in_school(
                school_id=school_id,
                user_id=user_id,
                limit=per_page,
                skip=offset,
                session_type=session_type,
                status=status,
                level=level,
                date_from=date_from,
                date_to=date_to
            )
            
            if not result["success"]:
                return result
            
            sessions_data = result["data"]
            
            return {
                "success": True,
                "message": "User sessions retrieved successfully",
                "data": {
                    "sessions": sessions_data["sessions"],
                    "total_count": sessions_data["total_count"],
                    "pagination": {
                        "page": page,
                        "per_page": per_page,
                        "total_pages": (sessions_data["total_count"] + per_page - 1) // per_page,
                        "has_more": (page * per_page) < sessions_data["total_count"]
                    }
                }
            }
            
        except Exception as e:
            logger.error("Failed to get user sessions in school", 
                        school_id=school_id, user_id=user_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve user sessions"}

    def get_user_session_detail_in_school(
        self,
        school_id: str,
        user_id: str,
        session_id: str
    ) -> Dict[str, Any]:
        """Get detailed session information within school scope"""
        try:
            # Validate input parameters
            if not school_id or not school_id.strip():
                return {"success": False, "message": "School ID is required"}
            
            if not user_id or not user_id.strip():
                return {"success": False, "message": "User ID is required"}
                
            if not session_id or not session_id.strip():
                return {"success": False, "message": "Session ID is required"}
            
            # Get session detail from repository
            result = self.school_repo.get_user_session_detail_in_school(
                school_id=school_id,
                user_id=user_id,
                session_id=session_id
            )
            
            return result
            
        except Exception as e:
            logger.error("Failed to get user session detail in school", 
                        school_id=school_id, user_id=user_id, session_id=session_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve user session detail"}


def get_school_user_service() -> SchoolUserService:
    """Get SchoolUserService instance"""
    return SchoolUserService()
