"""
School Template Service - SCHOOL DOMAIN
Handles template management operations for school admins
Follows the same pattern as other school services
"""

from typing import Dict, Any, Optional
import structlog

from app.school.models.school_repository import SchoolRepository, get_school_repository

logger = structlog.get_logger()


class SchoolTemplateService:
    """
    School Template Service - School Domain
    Handles template management operations within school scope
    """

    def __init__(self, school_repo: SchoolRepository):
        self.school_repo = school_repo

    def get_school_templates(
        self, 
        school_id: str, 
        level: Optional[str] = None, 
        session_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get templates for school with optional filters"""
        try:
            result = self.school_repo.get_school_templates(school_id, level, session_type)
            
            if result["success"]:
                return {
                    "success": True,
                    "message": result["message"],
                    "templates": result["data"],
                    "active_template_count": result.get("active_template_count", 0),
                    "max_templates": result.get("max_templates", 10)
                }
            else:
                return {
                    "success": False,
                    "message": result["message"],
                    "templates": []
                }
            
        except Exception as e:
            logger.error("Failed to get school templates", 
                        school_id=school_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to retrieve templates",
                "templates": []
            }

    def create_school_template(
        self, 
        school_id: str, 
        template_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create new template for school"""
        try:
            result = self.school_repo.create_school_template(school_id, template_data)
            
            return {
                "success": result["success"],
                "message": result["message"],
                "template_id": result.get("template_id")
            }
            
        except Exception as e:
            logger.error("Failed to create school template", 
                        school_id=school_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to create template",
                "template_id": None
            }

    def update_school_template(
        self, 
        school_id: str, 
        template_id: str, 
        template_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update existing template for school"""
        try:
            result = self.school_repo.update_school_template(school_id, template_id, template_data)
            
            return {
                "success": result["success"],
                "message": result["message"],
                "template_id": result.get("template_id")
            }
            
        except Exception as e:
            logger.error("Failed to update school template", 
                        school_id=school_id, template_id=template_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to update template",
                "template_id": None
            }

    def delete_school_template(
        self, 
        school_id: str, 
        template_id: str,
        force_deactivate: bool = False
    ) -> Dict[str, Any]:
        """Delete (soft delete) template for school or deactivate if used"""
        try:
            result = self.school_repo.delete_school_template(school_id, template_id, force_deactivate)
            
            return {
                "success": result["success"],
                "message": result["message"],
                "data": result.get("data")
            }
            
        except Exception as e:
            logger.error("Failed to delete school template", 
                        school_id=school_id, template_id=template_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to delete template"
            }


def get_school_template_service() -> SchoolTemplateService:
    """Get SchoolTemplateService instance"""
    return SchoolTemplateService(get_school_repository())
