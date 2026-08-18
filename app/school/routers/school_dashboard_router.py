"""
School Dashboard Router - SCHOOL DOMAIN
Handles dashboard analytics and statistics endpoints for schools
Follows the same pattern as other school routers
"""

from fastapi import APIRouter, Depends, HTTPException, status
import structlog
from typing import Dict, Any

# Import school models
from app.school.models.school_responses import SchoolDashboardResponse

# Import services
from app.school.services.school_dashboard_service import get_school_dashboard_service

# Import shared school dependencies
from app.school.dependencies import get_school_admin_dependency

logger = structlog.get_logger()

# Create dashboard router
router = APIRouter(
    prefix="/dashboard",
    tags=["Schools - Dashboard"],
    responses={404: {"description": "Not found"}},
)


# ===============================
# DEPENDENCY INJECTION
# ===============================

def get_dashboard_service():
    """Get school dashboard service instance"""
    return get_school_dashboard_service()


# Use shared school authentication dependency
get_school_admin = get_school_admin_dependency


# ===============================
# DASHBOARD ENDPOINTS
# ===============================

@router.get("/analytics", response_model=SchoolDashboardResponse)
async def get_dashboard_analytics(
    dashboard_service=Depends(get_dashboard_service),
    school_admin: Dict[str, Any] = Depends(get_school_admin)
):
    """
    Get dashboard analytics for the school
    
    Returns basic statistics including:
    - Total students (active/inactive)
    - Sessions in last 7 days
    - Total sessions
    - Average sessions per student
    """
    try:
        # Extract school_id from authenticated school admin
        school_id = school_admin.get("school_id")
        
        if not school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="School ID missing from authentication context"
            )
        
        # Get dashboard analytics from service
        result = dashboard_service.get_dashboard_analytics(school_id)
        
        if result["success"]:
            return SchoolDashboardResponse(
                success=True,
                message=result["message"],
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Dashboard analytics endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while retrieving dashboard analytics"
        )
