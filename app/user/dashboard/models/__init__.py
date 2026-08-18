"""
Dashboard Models - Analytics Data Models

Contains dashboard-specific data models, repositories, and response schemas.
Completely isolated from core user business logic.
"""

from .dashboard_repository import DashboardRepository, get_dashboard_repository
from .dashboard_models import (
    DashboardStatsResponse,
    WeeklyScoreData,
    ActivityData,
    TrendAnalysis
)

__all__ = [
    "DashboardRepository",
    "get_dashboard_repository", 
    "DashboardStatsResponse",
    "WeeklyScoreData",
    "ActivityData",
    "TrendAnalysis"
]
