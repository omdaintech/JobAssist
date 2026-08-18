"""
Dashboard Services - Analytics Processing Layer

Contains dashboard-specific business logic and data processing.
Completely isolated from regular user business services.
"""

from .dashboard_service import DashboardService, get_dashboard_service

__all__ = [
    "DashboardService",
    "get_dashboard_service"
]
