"""
Dashboard Router - Isolated Analytics API Endpoints

This router handles ALL dashboard-related API endpoints.
It's completely separated from regular user business operations.

Key Features:
- Comprehensive analytics endpoints
- Performance-optimized queries
- Caching support
- Error handling and logging
- Rate limiting ready
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
import structlog

from app.config import settings
from app.dependencies import get_current_user
from ..services.dashboard_service import DashboardService, get_dashboard_service
from ..models.dashboard_models import (
    DashboardStatsResponse, 
    DashboardSummaryResponse,
    DashboardErrorResponse
)

logger = structlog.get_logger()

router = APIRouter(
    prefix="/dashboard",
    tags=["Users - Dashboard Analytics"],
    responses={
        500: {"model": DashboardErrorResponse, "description": "Internal server error"}
    }
)


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_comprehensive_dashboard_stats(
    user: dict = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    days: int = Query(30, description="Time period in days (30, 60, or 90)", ge=1, le=365),
    language_id: Optional[str] = Query(None, description="Filter by language ID (optional)"),
    use_cache: bool = Query(True, description="Use cached data if available")
):
    """
    Get comprehensive dashboard statistics for the authenticated user
    
    Returns all analytics data including:
    - Daily/weekly activity patterns
    - Practice vs exam session split
    - Favorite activity types with performance
    - CEFR level progress distribution
    - Recent exam results with scores
    - Streak data with badges
    - Learning insights and recommendations
    - Performance trends over time
    - Weekly score improvement with gap handling
    - Activity-specific performance (reading, writing, grammar, hearing)
    
    Optional language filtering for multi-language learners.
    """
    try:
        user_id = user["user_id"]
        logger.info("Fetching comprehensive dashboard stats", user_id=user_id, days=days, language_id=language_id, use_cache=use_cache)
        
        dashboard_data = dashboard_service.get_user_dashboard_stats(user_id, use_cache, days=days, language_id=language_id)
        
        if not dashboard_data.get("success", True):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=dashboard_data.get("message", "Failed to generate dashboard statistics")
            )
        
        return dashboard_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error in dashboard stats", user_id=user.get("user_id"), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating dashboard statistics"
        )


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    user: dict = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    days: int = Query(30, description="Time period in days (30, 60, or 90)", ge=1, le=365),
    language_id: Optional[str] = Query(None, description="Filter by language ID (optional)")
):
    """
    Get quick dashboard summary for overview widgets
    
    Returns essential metrics:
    - Total completed sessions
    - Current learning streak
    - Overall average score
    - Favorite activity type
    - Last session date
    - General improvement trend
    """
    try:
        user_id = user["user_id"]
        logger.info("Fetching dashboard summary", user_id=user_id, days=days, language_id=language_id)
        
        summary_data = dashboard_service.get_dashboard_summary(user_id, days=days, language_id=language_id)
        
        if not summary_data.get("success", True):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=summary_data.get("message", "Failed to generate dashboard summary")
            )
        
        return summary_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error in dashboard summary", user_id=user.get("user_id"), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating dashboard summary"
        )


@router.get("/weekly-improvement")
async def get_weekly_improvement_analysis(
    user: dict = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service)
):
    """
    Get detailed weekly score improvement analysis with gap handling
    
    Returns:
    - 12 weeks of score data with gaps filled
    - Improvement trend analysis
    - Personalized recommendations
    - Activity consistency metrics
    """
    try:
        user_id = user["user_id"]
        logger.info("Fetching weekly improvement analysis", user_id=user_id)
        
        weekly_data = dashboard_service.get_weekly_improvement_analysis(user_id)
        
        return {
            "success": True,
            "data": weekly_data,
            "message": "Weekly improvement analysis generated successfully"
        }
        
    except Exception as e:
        logger.error("Unexpected error in weekly improvement analysis", user_id=user.get("user_id"), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating weekly improvement analysis"
        )


@router.get("/exam-readiness")
async def get_exam_readiness(
    user: dict = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    language_id: Optional[str] = Query(None, description="Filter by language ID (optional)")
):
    """
    Get exam readiness for current and next CEFR level
    
    Returns detailed breakdown of:
    - Current level performance by activity (reading, writing, grammar, hearing)
    - Total exams completed and average score
    - Next level unlock status and personalized recommendation
    - Activity-level progress for targeted practice
    
    Used for the "Exam Readiness" section in the user dashboard.
    """
    try:
        user_id = user["user_id"]
        logger.info("Fetching exam readiness", user_id=user_id, language_id=language_id)
        
        readiness_data = dashboard_service.get_exam_readiness(user_id, language_id=language_id)
        
        if "error" in readiness_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=readiness_data.get("error", "Failed to generate exam readiness data")
            )
        
        return {
            "success": True,
            "data": readiness_data,
            "message": "Exam readiness generated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in exam readiness", user_id=user.get("user_id"), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate exam readiness data"
        )


@router.post("/cache/invalidate")
async def invalidate_dashboard_cache(
    user: dict = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service)
):
    """
    Invalidate cached dashboard data for the authenticated user
    
    Useful when:
    - User completes a new session
    - User updates their profile/preferences
    - Manual cache refresh is needed
    """
    try:
        user_id = user["user_id"]
        logger.info("Invalidating dashboard cache", user_id=user_id)
        
        success = dashboard_service.invalidate_cache(user_id)
        
        return {
            "success": success,
            "message": "Dashboard cache invalidated successfully" if success else "Failed to invalidate cache",
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error("Unexpected error in cache invalidation", user_id=user.get("user_id"), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while invalidating cache"
        )


@router.get("/health")
async def dashboard_health_check():
    """
    Health check endpoint for dashboard service
    
    Returns service status and basic metrics
    """
    try:
        from datetime import datetime
        return {
            "status": "healthy",
            "service": "user_dashboard",
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "configuration": {
                "cache_ttl_seconds": settings.dashboard_cache_ttl,
                "cache_ttl_minutes": settings.dashboard_cache_ttl / 60
            },
            "features": [
                "comprehensive_analytics",
                "weekly_improvement_tracking", 
                "gap_handling",
                "configurable_caching",
                "personalized_insights"
            ]
        }
    except Exception as e:
        logger.error("Dashboard health check failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dashboard service is currently unavailable"
        )
