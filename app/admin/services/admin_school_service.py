"""
Admin School Service - ADMIN DOMAIN
Handles school management operations for system administrators
Follows the service layer pattern established in the admin domain
"""

from typing import Any, Dict, List, Optional

import structlog

from app.admin.models.admin_repository import AdminRepository
from app.common.services.token_service import generate_school_impersonation_token
from app.config import settings

logger = structlog.get_logger()


class AdminSchoolService:
    """Admin school management service"""

    def __init__(self):
        self.admin_repo = AdminRepository()

    def get_all_schools(self, page: int = 1, per_page: int = 100, search: Optional[str] = None) -> Dict[str, Any]:
        """Get all schools with comprehensive details for admin view"""
        try:
            # Convert page-based pagination to offset-based pagination for repository
            offset = (page - 1) * per_page
            limit = per_page
            
            repo_result = self.admin_repo.get_schools(limit=limit, offset=offset, search=search)
            schools = repo_result["schools"]
            total_count = repo_result["total_count"]
            
            # Convert to comprehensive format
            school_details = []
            for school in schools:
                # Get additional details for each school
                detailed_school = self.admin_repo.get_school_by_id(school["id"])
                if detailed_school:
                    school_details.append(detailed_school)
            
            # Calculate total pages
            total_pages = (total_count + per_page - 1) // per_page
            
            return {
                "success": True,
                "message": "Schools retrieved successfully",
                "schools": school_details,
                "total_count": total_count,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages
            }
        except Exception as e:
            logger.error("Failed to get schools", error=str(e))
            return {
                "success": False,
                "message": "Failed to retrieve schools",
                "schools": [],
                "total_count": 0,
                "page": page,
                "per_page": per_page,
                "total_pages": 0
            }

    def get_school_details(self, school_id: str) -> Dict[str, Any]:
        """Get comprehensive school details for admin view"""
        try:
            school = self.admin_repo.get_school_by_id(school_id)
            
            if not school:
                return {
                    "success": False,
                    "message": "School not found",
                    "school": None
                }
            
            return {
                "success": True,
                "message": "School details retrieved successfully",
                "school": school
            }
        except Exception as e:
            logger.error("Failed to get school details", school_id=school_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to retrieve school details",
                "school": None
            }

    def update_school_details(self, school_id: str, school_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update comprehensive school details"""
        try:
            # Validate school exists
            existing_school = self.admin_repo.get_school_by_id(school_id)
            if not existing_school:
                return {
                    "success": False,
                    "message": "School not found"
                }

            # Update school details
            result = self.admin_repo.update_school(school_id, school_data)
            
            if result["success"]:
                logger.info("School details updated by admin", school_id=school_id, updated_fields=list(school_data.keys()))
            
            return result
        except Exception as e:
            logger.error("Failed to update school details", school_id=school_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to update school details"
            }

    def create_school(self, school_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new school with comprehensive details"""
        try:
            result = self.admin_repo.create_school(school_data)
            
            if result["success"]:
                logger.info("School created by admin", school_id=result.get("school_id"), school_name=school_data.get("name"))
            
            return result
        except Exception as e:
            logger.error("Failed to create school", error=str(e))
            return {
                "success": False,
                "message": "Failed to create school"
            }

    def deactivate_school(self, school_id: str) -> Dict[str, Any]:
        """Deactivate school (soft delete)"""
        try:
            result = self.admin_repo.delete_school(school_id)
            
            if result["success"]:
                logger.info("School deactivated by admin", school_id=school_id)
            
            return result
        except Exception as e:
            logger.error("Failed to deactivate school", school_id=school_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to deactivate school"
            }

    def get_school_statistics(self) -> Dict[str, Any]:
        """Get overall school statistics"""
        try:
            stats = self.admin_repo.get_school_stats()
            return {
                "success": True,
                "message": "School statistics retrieved successfully",
                "statistics": stats
            }
        except Exception as e:
            logger.error("Failed to get school statistics", error=str(e))
            return {
                "success": False,
                "message": "Failed to retrieve school statistics",
                "statistics": {}
            }


    # =================
    # IMPERSONATION MANAGEMENT
    # =================

    def generate_impersonation_token(self, school_id: str, admin_id: str, admin_email: str) -> Dict[str, Any]:
        """Generate a school impersonation token for the admin."""
        try:
            school_details = self.admin_repo.get_school_by_id(school_id)
            if not school_details:
                return {"success": False, "message": "School not found"}

            school_admin = self.admin_repo.get_active_school_admin_for_school(school_id)
            if not school_admin:
                return {
                    "success": False,
                    "message": "No active school admin available for impersonation",
                }

            token = generate_school_impersonation_token(
                school_admin_id=school_admin["id"],
                school_id=school_id,
                school_admin_email=school_admin["email"],
                permissions=school_admin.get("permissions") or [],
                impersonated_by_admin_id=admin_id,
                impersonated_by_email=admin_email,
                expires_in_seconds=settings.impersonation_token_expires,
            )

            logger.info(
                "Generated school impersonation token",
                school_id=school_id,
                admin_id=admin_id,
            )

            return {
                "success": True,
                "token": token,
                "expires_in": settings.impersonation_token_expires,
                "school_id": school_id,
                "school_name": school_details.get("name"),
                "school_admin_email": school_admin["email"],
            }
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error(
                "Failed to generate impersonation token",
                school_id=school_id,
                admin_id=admin_id,
                error=str(exc),
            )
            return {
                "success": False,
                "message": "Failed to generate impersonation token",
            }


# Factory function
def get_admin_school_service() -> AdminSchoolService:
    """Get admin school service instance"""
    return AdminSchoolService()
