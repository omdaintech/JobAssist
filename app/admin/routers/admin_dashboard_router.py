"""
Admin Dashboard Router - Analytics API Endpoints

Provides dashboard statistics for system administrators.
All endpoints require admin authentication (type="admin").

Key Features:
- Time-based filtering (hours presets: 24, 48, 168, 720)
- Custom date range support (start_date + end_date)
- Language filtering
- Comprehensive error handling
- API documentation with OpenAPI/Swagger
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from datetime import datetime
import structlog

from app.admin.dependencies import get_admin_user_dependency
from app.admin.services.admin_dashboard_service import (
    AdminDashboardService, 
    get_admin_dashboard_service
)
from app.admin.models.admin_dashboard_models import (
    AdminDashboardStatsResponse,
    LanguageFilterOptionsResponse,
    AdminDashboardErrorResponse,
    AdminDashboardHealthResponse
)

logger = structlog.get_logger()

router = APIRouter(
    prefix="/dashboard",
    tags=["Admin - Dashboard Analytics"],
    responses={
        401: {"description": "Unauthorized - Admin token required"},
        403: {"description": "Forbidden - Insufficient permissions"},
        500: {"model": AdminDashboardErrorResponse, "description": "Internal server error"}
    }
)


@router.get(
    "/stats", 
    response_model=AdminDashboardStatsResponse,
    summary="Get Dashboard Statistics",
    description="""
    Get comprehensive dashboard statistics for system administrators.
    
    **Returns all key metrics:**
    - Total sessions (completed + analyzed)
    - Session type split (exam vs practice)
    - New user registrations
    - Top activity type with count
    - New feedback and contact messages
    - Calculated percentages and success rates
    
    **Filtering Options:**
    
    1. **Preset Time Periods** (hours parameter):
       - `24` - Last 24 hours
       - `48` - Last 48 hours
       - `168` - Last 7 days (default)
       - `720` - Last 30 days
    
    2. **Custom Date Range** (start_date + end_date):
       - Provide both start_date and end_date in ISO format
       - Example: `2025-11-07T00:00:00Z` to `2025-11-14T23:59:59Z`
       - Max range: 365 days
       - **Note**: If `hours` is provided, custom dates are ignored
    
    3. **Language Filter** (language_id):
       - Optional language UUID to filter by specific language
       - If not provided, shows data for all languages
    
    **Authentication:** Admin JWT token required with `type="admin"`
    """,
    response_description="Dashboard statistics with all metrics and metadata"
)
async def get_dashboard_stats(
    admin: dict = Depends(get_admin_user_dependency),
    dashboard_service: AdminDashboardService = Depends(get_admin_dashboard_service),
    hours: Optional[int] = Query(
        default=None,
        description="Preset time period: 24, 48, 168 (7 days), 720 (30 days). Takes precedence over custom dates.",
        ge=1,
        le=720,
        examples=[168]
    ),
    start_date: Optional[str] = Query(
        default=None,
        description="Custom start date (ISO format: 2025-11-07T00:00:00Z). Requires end_date. Ignored if hours is provided.",
        examples=["2025-11-07T00:00:00Z"]
    ),
    end_date: Optional[str] = Query(
        default=None,
        description="Custom end date (ISO format: 2025-11-14T23:59:59Z). Requires start_date. Ignored if hours is provided.",
        examples=["2025-11-14T23:59:59Z"]
    ),
    language_id: Optional[str] = Query(
        default=None,
        description="Optional language filter UUID. Shows all languages if not provided.",
        examples=["lang_67890abcdef123456"]
    )
):
    """
    Get comprehensive dashboard statistics for system administrators
    """
    try:
        admin_id = admin.get("admin_id")
        logger.info(
            "Admin fetching dashboard stats",
            admin_id=admin_id,
            hours=hours,
            start_date=start_date,
            end_date=end_date,
            language_id=language_id
        )
        
        # Parse datetime strings if provided
        start_dt = None
        end_dt = None
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid start_date format. Use ISO format (e.g., 2025-11-07T00:00:00Z)"
                )
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid end_date format. Use ISO format (e.g., 2025-11-14T23:59:59Z)"
                )
        
        # Get stats from service
        result = dashboard_service.get_dashboard_stats(
            hours=hours,
            start_date=start_dt,
            end_date=end_dt,
            language_id=language_id
        )
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve dashboard statistics")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error in admin dashboard stats",
            admin_id=admin.get("admin_id"),
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while retrieving dashboard statistics"
        )


@router.get(
    "/languages", 
    response_model=LanguageFilterOptionsResponse,
    summary="Get Language Filter Options",
    description="""
    Get all active languages available for dashboard filtering.
    
    **Returns:**
    - List of languages with id, name, and code
    - Ordered by display_order
    - Only active languages included
    
    **Use Case:**
    - Populate language filter dropdown in admin dashboard UI
    - Get language_id values for /stats endpoint filtering
    
    **Authentication:** Admin JWT token required with `type="admin"`
    """,
    response_description="List of available languages for filtering"
)
async def get_language_options(
    admin: dict = Depends(get_admin_user_dependency),
    dashboard_service: AdminDashboardService = Depends(get_admin_dashboard_service)
):
    """
    Get available languages for dashboard filter dropdown
    """
    try:
        admin_id = admin.get("admin_id")
        logger.info("Admin fetching language filter options", admin_id=admin_id)
        
        result = dashboard_service.get_language_filter_options()
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve language options")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error fetching language options",
            admin_id=admin.get("admin_id"),
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve language options"
        )


@router.get(
    "/health",
    response_model=AdminDashboardHealthResponse,
    summary="Dashboard Service Health Check",
    description="""
    Health check endpoint for admin dashboard service.
    
    **Returns:**
    - Service status (healthy/unhealthy)
    - Service version
    - Current timestamp
    - List of available features
    
    **No authentication required** - public health check endpoint
    """,
    response_description="Service health status and metadata",
    tags=["Admin - System Health"]
)
async def dashboard_health_check():
    """
    Health check endpoint for admin dashboard service
    No authentication required
    """
    try:
        return {
            "status": "healthy",
            "service": "admin_dashboard",
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat() + 'Z',
            "features": [
                "time_based_filtering",
                "custom_date_ranges",
                "language_filtering",
                "session_analytics",
                "user_tracking",
                "message_monitoring"
            ]
        }
    except Exception as e:
        logger.error("Admin dashboard health check failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin dashboard service is currently unavailable"
        )
