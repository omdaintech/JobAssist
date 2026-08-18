"""
School Dashboard Service - SCHOOL DOMAIN
Handles dashboard analytics and statistics for schools
Follows the same pattern as other school services
"""

import structlog
from typing import Dict, Any

logger = structlog.get_logger()


class SchoolDashboardService:
    """School dashboard service for analytics and statistics"""

    def __init__(self):
        pass

    def get_dashboard_analytics(self, school_id: str) -> Dict[str, Any]:
        """Get dashboard analytics for a school"""
        try:
            # Use School Repository for dashboard data
            from app.school.models.school_repository import SchoolRepository
            
            school_repo = SchoolRepository()
            
            # Get analytics from repository
            result = school_repo.get_dashboard_analytics(school_id)
            
            if result["success"]:
                return {
                    "success": True,
                    "message": "Dashboard analytics retrieved successfully",
                    "data": result["data"]
                }
            else:
                return {
                    "success": False,
                    "message": result.get("message", "Failed to retrieve dashboard analytics")
                }
                
        except Exception as e:
            logger.error("Dashboard service error", school_id=school_id, error=str(e))
            return {
                "success": False,
                "message": "Internal server error while retrieving dashboard analytics"
            }


def get_school_dashboard_service() -> SchoolDashboardService:
    """Get SchoolDashboardService instance"""
    return SchoolDashboardService()
