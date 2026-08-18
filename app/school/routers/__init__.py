"""
School Routers Module
Exports all school router modules following the admin pattern
"""

from .school_auth_router import router as school_auth_router
from .school_user_router import router as school_user_router
from .school_template_router import router as school_template_router
from .school_template_usage_router import router as school_template_usage_router
from .school_session_router import router as school_session_router
from .school_dashboard_router import router as school_dashboard_router
from .school_info_router import router as school_info_router
from .school_billing_router import router as school_billing_router

__all__ = [
    "school_auth_router",
    "school_user_router",
    "school_template_router",
    "school_template_usage_router",
    "school_session_router",
    "school_dashboard_router",
    "school_info_router",
    "school_billing_router",
]
