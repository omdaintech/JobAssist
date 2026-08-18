"""
School Template Usage Service - SCHOOL DOMAIN SERVICE LAYER
Orchestrates school-scoped template usage reporting business logic
All operations are automatically scoped to the specified school
"""

from typing import Optional, Dict, Any
import structlog

# Import SchoolRepository following BE_ARCH.md guidelines
from app.school.models.school_repository import SchoolRepository

logger = structlog.get_logger()


class SchoolTemplateUsageService:
    """
    School Template Usage Service - Service Layer
    Orchestrates school-scoped template usage reporting business logic
    """

    def __init__(self):
        self.school_repo = SchoolRepository()

    def get_templates_with_usage_stats(
        self,
        school_id: str,
        page: int = 1,
        per_page: int = 50,
        level: Optional[str] = None,
        session_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get all school templates with usage statistics"""
        try:
            # Validate input parameters
            if not school_id or not school_id.strip():
                return {"success": False, "message": "School ID is required"}
            
            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 50
            
            # Calculate offset
            offset = (page - 1) * per_page
            
            # Get templates with usage stats from repository
            result = self.school_repo.get_templates_with_usage_stats(
                school_id=school_id,
                limit=per_page,
                skip=offset,
                level=level,
                session_type=session_type
            )
            
            if not result["success"]:
                return result
            
            templates_data = result["data"]
            
            return {
                "success": True,
                "message": "Templates with usage stats retrieved successfully",
                "data": {
                    "templates": templates_data["templates"],
                    "total_count": templates_data["total_count"],
                    "pagination": {
                        "page": page,
                        "per_page": per_page,
                        "total_pages": (templates_data["total_count"] + per_page - 1) // per_page,
                        "has_more": (page * per_page) < templates_data["total_count"]
                    }
                }
            }
            
        except Exception as e:
            logger.error("Failed to get templates with usage stats", 
                        school_id=school_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve templates with usage statistics"}

    def get_template_users(
        self,
        school_id: str,
        template_id: str,
        page: int = 1,
        per_page: int = 50,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get all users who have used a specific template with their session details"""
        try:
            # Validate input parameters
            if not school_id or not school_id.strip():
                return {"success": False, "message": "School ID is required"}
            
            if not template_id or not template_id.strip():
                return {"success": False, "message": "Template ID is required"}
            
            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 50
            
            # Calculate offset
            offset = (page - 1) * per_page
            
            # Get template users from repository
            result = self.school_repo.get_template_users(
                school_id=school_id,
                template_id=template_id,
                limit=per_page,
                skip=offset,
                status=status,
                date_from=date_from,
                date_to=date_to
            )
            
            if not result["success"]:
                return result
            
            users_data = result["data"]
            
            return {
                "success": True,
                "message": "Template users retrieved successfully",
                "data": {
                    "template_info": users_data["template_info"],
                    "users": users_data["users"],
                    "total_count": users_data["total_count"],
                    "pagination": {
                        "page": page,
                        "per_page": per_page,
                        "total_pages": (users_data["total_count"] + per_page - 1) // per_page,
                        "has_more": (page * per_page) < users_data["total_count"]
                    }
                }
            }
            
        except Exception as e:
            logger.error("Failed to get template users", 
                        school_id=school_id, template_id=template_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve template users"}

    def get_template_sessions(
        self,
        school_id: str,
        template_id: str,
        page: int = 1,
        per_page: int = 50,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get all sessions that used a specific template with detailed metadata"""
        try:
            # Validate input parameters
            if not school_id or not school_id.strip():
                return {"success": False, "message": "School ID is required"}
            
            if not template_id or not template_id.strip():
                return {"success": False, "message": "Template ID is required"}
            
            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 50
            
            # Calculate offset
            offset = (page - 1) * per_page
            
            # Get template sessions from repository
            result = self.school_repo.get_template_sessions(
                school_id=school_id,
                template_id=template_id,
                limit=per_page,
                skip=offset,
                status=status,
                date_from=date_from,
                date_to=date_to
            )
            
            if not result["success"]:
                return result
            
            sessions_data = result["data"]
            
            return {
                "success": True,
                "message": "Template sessions retrieved successfully",
                "data": {
                    "template_info": sessions_data["template_info"],
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
            logger.error("Failed to get template sessions", 
                        school_id=school_id, template_id=template_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve template sessions"}

    def get_template_analytics(
        self,
        school_id: str,
        template_id: str
    ) -> Dict[str, Any]:
        """Get analytics for a specific template including completion rates and performance metrics"""
        try:
            # Validate input parameters
            if not school_id or not school_id.strip():
                return {"success": False, "message": "School ID is required"}
            
            if not template_id or not template_id.strip():
                return {"success": False, "message": "Template ID is required"}
            
            # Get template analytics from repository
            result = self.school_repo.get_template_analytics(
                school_id=school_id,
                template_id=template_id
            )
            
            return result
            
        except Exception as e:
            logger.error("Failed to get template analytics", 
                        school_id=school_id, template_id=template_id, error=str(e))
            return {"success": False, "message": "Failed to retrieve template analytics"}


def get_school_template_usage_service() -> SchoolTemplateUsageService:
    """Get SchoolTemplateUsageService instance"""
    return SchoolTemplateUsageService()
