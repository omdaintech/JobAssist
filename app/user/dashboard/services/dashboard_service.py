"""
Dashboard Service - Analytics Business Logic

This service handles dashboard-specific business logic, data processing,
and caching. It's completely isolated from regular user operations.

Key Features:
- Analytics data processing and transformation
- Caching layer for performance optimization
- Data validation and sanitization
- Trend analysis and insights generation
"""

from typing import Dict, Any, Optional, List
import structlog
from datetime import datetime

from app.config import settings
from ..models.dashboard_repository import DashboardRepository, get_dashboard_repository
from ..models.dashboard_models import DashboardStatsResponse, DashboardSummaryResponse

logger = structlog.get_logger()


class DashboardService:
    """
    Dashboard Service - Analytics Business Logic Layer
    
    Handles analytics processing, caching, and business rules
    for dashboard functionality.
    """
    
    def __init__(self, dashboard_repo: Optional[DashboardRepository] = None):
        self.dashboard_repo = dashboard_repo or get_dashboard_repository()
        self._cache = {}  # Simple in-memory cache (can be replaced with Redis)
    
    def get_user_dashboard_stats(self, user_id: str, use_cache: bool = True, days: int = 30, language_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get comprehensive dashboard statistics for a user
        
        Args:
            user_id: User identifier
            use_cache: Whether to use cached data if available
            days: Time period in days (default 30)
            language_id: Optional language filter (MongoDB ObjectId string)
            
        Returns:
            Complete dashboard analytics data
        """
        try:
            # Check cache first (include language_id in cache key for language-specific caching)
            cache_key = f"dashboard_stats_{user_id}_{language_id or 'all'}"
            if use_cache and cache_key in self._cache:
                cached_data = self._cache[cache_key]
                # Check if cache is still valid (configurable TTL)
                cache_time = datetime.fromisoformat(cached_data["generated_at"])
                cache_age_seconds = (datetime.utcnow() - cache_time).total_seconds()
                if cache_age_seconds < settings.dashboard_cache_ttl:
                    logger.info("Returning cached dashboard data", 
                              user_id=user_id, 
                              language_id=language_id,
                              cache_age_seconds=cache_age_seconds,
                              cache_ttl=settings.dashboard_cache_ttl)
                    return cached_data
            
            # Get fresh data from repository
            logger.info("Fetching fresh dashboard data", user_id=user_id, days=days, language_id=language_id)
            dashboard_data = self.dashboard_repo.get_comprehensive_dashboard_data(
                user_id, include_benchmarks=False, days=days, language_id=language_id
            )
            
            # Return data directly without enhancement (unused insights removed)
            dashboard_data["success"] = True
            
            # Cache the result
            if use_cache:
                self._cache[cache_key] = dashboard_data
            
            return dashboard_data
            
        except Exception as e:
            logger.error("Failed to get dashboard stats", user_id=user_id, error=str(e))
            return self._get_error_dashboard_data(str(e))
    
    def get_dashboard_summary(self, user_id: str, days: int = 30, language_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get quick dashboard summary - DEPRECATED/MINIMAL
        
        Stats cards have been removed from frontend UI.
        This method now returns minimal data to avoid breaking API contract.
        
        Args:
            user_id: User identifier
            days: Time period in days (default 30)
            language_id: Optional language filter
            
        Returns:
            Minimal summary data (stats cards removed from UI)
        """
        try:
            # Return minimal data - stats cards removed from frontend
            # Keeping endpoint for API compatibility but skipping queries
            logger.info("Dashboard summary called (stats cards removed from UI)", user_id=user_id)
            
            return {
                "success": True,
                "total_sessions": 0,  # No longer queried
                "current_streak": 0,  # No longer queried
                "average_score": 0,  # No longer queried
                "favorite_level": "None",  # No longer queried
                "note": "Stats cards removed from UI - queries disabled for performance"
            }
            
        except Exception as e:
            logger.error("Failed to get dashboard summary", user_id=user_id, error=str(e))
            return {
                "success": False,
                "error_type": "summary_generation_failed",
                "message": f"Failed to generate dashboard summary: {str(e)}",
                "timestamp": datetime.utcnow().isoformat()
            }

    def get_exam_readiness(self, user_id: str, language_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get exam readiness data from repository
        
        Args:
            user_id: User identifier
            
        Returns:
            Exam readiness data with current and next level info
        """
        try:
            return self.dashboard_repo.get_exam_readiness(user_id, language_id)
        except Exception as e:
            logger.error("Failed to get exam readiness", user_id=user_id, error=str(e))
            raise
    
    def invalidate_cache(self, user_id: str) -> bool:
        """
        Invalidate cached dashboard data for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            True if cache was invalidated successfully
        """
        try:
            cache_key = f"dashboard_stats_{user_id}"
            if cache_key in self._cache:
                del self._cache[cache_key]
                logger.info("Dashboard cache invalidated", user_id=user_id)
            return True
        except Exception as e:
            logger.error("Failed to invalidate cache", user_id=user_id, error=str(e))
            return False

    def _get_error_dashboard_data(self, error_message: str) -> Dict[str, Any]:
        """Return error dashboard data structure"""
        return {
            "success": False,
            "error_type": "dashboard_generation_failed",
            "message": f"Failed to generate dashboard: {error_message}",
            "timestamp": datetime.utcnow().isoformat(),
            "data": self.dashboard_repo._get_empty_dashboard_data()
        }


def get_dashboard_service() -> DashboardService:
    """Factory function to get dashboard service instance"""
    return DashboardService()
