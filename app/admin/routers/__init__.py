"""
Admin Routers Module
Exports all admin router modules following the user pattern
"""

from .admin_auth_router import router as admin_auth_router
from .admin_question_router import router as admin_question_router
from .admin_system_router import router as admin_system_router
from .admin_school_router import router as admin_school_router
from . import admin_payment_router

__all__ = [
    "admin_auth_router",
    "admin_question_router",
    "admin_system_router",
    "admin_school_router",
    "admin_payment_router",
]
