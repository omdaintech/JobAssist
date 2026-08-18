"""
Admin Dashboard Service - Business Logic Layer

Coordinates repository calls and adds business logic for admin analytics.
Validates inputs, calculates derived metrics, and formats responses.

Key Features:
- Input validation (time periods, date ranges)
- Derived metric calculations (percentages, rates)
- Language validation
- Standardized response formatting
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
import structlog

from app.admin.models.admin_dashboard_repository import AdminDashboardRepository

logger = structlog.get_logger()


class AdminDashboardService:
    """
    Admin Dashboard Service - Business Logic Layer
    
    Coordinates repository calls and adds business logic for analytics.
    """

    def __init__(self, repository: AdminDashboardRepository):
        self.repository = repository

    def get_dashboard_stats(
        self, 
        hours: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        language_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive dashboard statistics with business logic
        
        Args:
            hours: Preset time period (24, 48, 168, 720) - takes precedence
            start_date: Custom start date (ISO string or datetime)
            end_date: Custom end date (ISO string or datetime)
            language_id: Optional language filter UUID
            
        Returns:
            Standardized response with success flag and data
        """
        try:
            # Validate and normalize inputs
            hours = self._validate_hours(hours)
            start_date, end_date = self._validate_date_range(start_date, end_date)
            
            # If hours provided, ignore custom dates
            if hours is not None:
                start_date = None
                end_date = None
            
            # Get raw stats from repository
            stats = self.repository.get_dashboard_stats(
                hours=hours,
                start_date=start_date,
                end_date=end_date,
                language_id=language_id
            )
            
            # Add business logic - calculated metrics
            self._add_calculated_metrics(stats)
            
            # Add display labels
            self._add_display_labels(stats, hours)
            
            logger.info(
                "Dashboard stats service completed",
                total_sessions=stats.get("total_sessions", 0),
                hours=hours,
                start_date=start_date.isoformat() if start_date else None,
                end_date=end_date.isoformat() if end_date else None
            )
            
            return {
                "success": True,
                "data": stats,
                "message": "Dashboard statistics retrieved successfully"
            }
            
        except Exception as e:
            logger.error(
                "Failed to get dashboard stats in service",
                error=str(e),
                hours=hours
            )
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to retrieve dashboard statistics"
            }

    def get_language_filter_options(self) -> Dict[str, Any]:
        """
        Get available languages for filter dropdown
        
        Returns:
            {
                "success": True,
                "languages": [
                    {"id": "lang_123", "name": "German", "code": "de"},
                    {"id": "lang_456", "name": "French", "code": "fr"}
                ]
            }
        """
        try:
            languages = self.repository.get_all_languages()
            
            logger.info("Retrieved language filter options", count=len(languages))
            
            return {
                "success": True,
                "languages": languages,
                "message": "Languages retrieved successfully"
            }
            
        except Exception as e:
            logger.error("Failed to get language options", error=str(e))
            return {
                "success": False,
                "languages": [],
                "error": str(e),
                "message": "Failed to retrieve language options"
            }

    # =================
    # VALIDATION HELPERS
    # =================

    def _validate_hours(self, hours: Optional[int]) -> Optional[int]:
        """
        Validate hours preset value
        
        Args:
            hours: Input hours value
            
        Returns:
            Validated hours or None if invalid
        """
        if hours is None:
            return None
        
        # Valid presets: 24, 48, 168 (7 days), 720 (30 days)
        valid_hours = [24, 48, 168, 720]
        
        if hours not in valid_hours:
            logger.warning(
                "Invalid hours value, defaulting to 168",
                hours=hours,
                valid_values=valid_hours
            )
            return 168  # Default to 7 days
        
        return hours

    def _validate_date_range(
        self, 
        start_date: Optional[datetime], 
        end_date: Optional[datetime]
    ) -> tuple[Optional[datetime], Optional[datetime]]:
        """
        Validate custom date range
        
        Args:
            start_date: Start datetime or ISO string
            end_date: End datetime or ISO string
            
        Returns:
            Tuple of (validated_start, validated_end) or (None, None)
        """
        # If neither provided, return None
        if start_date is None and end_date is None:
            return None, None
        
        # If only one provided, log warning and return None
        if start_date is None or end_date is None:
            logger.warning(
                "Both start_date and end_date must be provided",
                start_date=start_date,
                end_date=end_date
            )
            return None, None
        
        # Parse string dates if needed
        if isinstance(start_date, str):
            try:
                # Handle ISO format with Z timezone
                start_date_str: str = start_date  # Explicit type hint
                start_date_str = start_date_str.replace('Z', '+00:00')  # type: ignore
                start_date = datetime.fromisoformat(start_date_str)
            except ValueError:
                logger.error("Invalid start_date format", start_date=start_date)
                return None, None
        
        if isinstance(end_date, str):
            try:
                # Handle ISO format with Z timezone
                end_date_str: str = end_date  # Explicit type hint
                end_date_str = end_date_str.replace('Z', '+00:00')  # type: ignore
                end_date = datetime.fromisoformat(end_date_str)
            except ValueError:
                logger.error("Invalid end_date format", end_date=end_date)
                return None, None
        
        # Validate date logic
        if start_date >= end_date:
            logger.warning(
                "start_date must be before end_date",
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat()
            )
            return None, None
        
        # Validate max range (e.g., 365 days)
        max_days = 365
        if (end_date - start_date).days > max_days:
            logger.warning(
                f"Date range exceeds max {max_days} days",
                days=(end_date - start_date).days
            )
            # Truncate to max range
            from datetime import timedelta
            start_date = end_date - timedelta(days=max_days)
        
        return start_date, end_date

    # =================
    # BUSINESS LOGIC
    # =================

    def _add_calculated_metrics(self, stats: Dict[str, Any]) -> None:
        """
        Add derived metrics to stats dictionary (in-place)
        
        Calculates:
        - Analysis success rate
        - Exam vs practice percentages
        """
        # Calculate analysis success rate
        total_sessions = stats.get("total_sessions", 0)
        analyzed_sessions = stats.get("analyzed_sessions", 0)
        
        if total_sessions > 0:
            stats["analysis_success_rate"] = round(
                (analyzed_sessions / total_sessions) * 100, 
                1
            )
        else:
            stats["analysis_success_rate"] = 0.0
        
        # Calculate exam vs practice split
        total_exams = stats.get("total_exams", 0)
        total_practice = stats.get("total_practice", 0)
        total_session_type = total_exams + total_practice
        
        if total_session_type > 0:
            stats["exam_percentage"] = round(
                (total_exams / total_session_type) * 100, 
                1
            )
            stats["practice_percentage"] = round(
                (total_practice / total_session_type) * 100, 
                1
            )
        else:
            stats["exam_percentage"] = 0.0
            stats["practice_percentage"] = 0.0

    def _add_display_labels(self, stats: Dict[str, Any], hours: Optional[int]) -> None:
        """
        Add human-readable labels to stats dictionary (in-place)
        
        Args:
            stats: Stats dictionary to modify
            hours: Hours preset used (if any)
        """
        # Add time period label if hours was used
        if hours is not None:
            time_labels = {
                24: "Last 24 Hours",
                48: "Last 48 Hours",
                168: "Last 7 Days",
                720: "Last 30 Days"
            }
            stats["time_period_label"] = time_labels.get(hours, f"Last {hours} hours")
            stats["time_period_hours"] = hours
        else:
            # Custom date range was used
            start = stats.get("start_date", "")
            end = stats.get("end_date", "")
            
            if start and end:
                # Parse dates and calculate days
                try:
                    start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
                    end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
                    days = (end_dt - start_dt).days
                    
                    stats["time_period_label"] = f"Custom Range ({days} days)"
                    stats["time_period_hours"] = days * 24
                except Exception:
                    stats["time_period_label"] = "Custom Date Range"
                    stats["time_period_hours"] = None


# =================
# DEPENDENCY INJECTION
# =================

def get_admin_dashboard_service() -> AdminDashboardService:
    """
    FastAPI dependency for admin dashboard service
    
    Usage:
        @router.get("/stats")
        async def get_stats(
            service: AdminDashboardService = Depends(get_admin_dashboard_service)
        ):
            return service.get_dashboard_stats()
    """
    repository = AdminDashboardRepository()
    return AdminDashboardService(repository)
