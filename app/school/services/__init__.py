"""
School Services Module
Exports all school service modules following the admin pattern
"""

from .school_auth_service import SchoolAuthService, get_school_auth_service
from .school_user_service import SchoolUserService, get_school_user_service
from .school_info_service import SchoolInfoService, get_school_info_service
from .billing_service import SchoolBillingService, get_school_billing_service

__all__ = [
    "SchoolAuthService",
    "get_school_auth_service",
    "SchoolUserService", 
    "get_school_user_service",
    "SchoolInfoService",
    "get_school_info_service",
    "SchoolBillingService",
    "get_school_billing_service",
]
