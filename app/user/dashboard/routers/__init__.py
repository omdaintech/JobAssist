"""
Dashboard Routers - Isolated API Endpoints

Contains dashboard-specific API endpoints completely isolated
from regular user business operations.
"""

from .dashboard_router import router as dashboard_router

__all__ = ["dashboard_router"]
