"""
Admin Services Module
Exports admin-specific services for system administration
"""

from .admin_auth_service import AdminAuthService, get_admin_auth_service
from .admin_school_service import AdminSchoolService, get_admin_school_service
from .question_bank_service import AdminQuestionBankService, get_admin_question_bank_service
from .admin_system_service import AdminSystemService, get_admin_system_service

__all__ = [
    "AdminAuthService", "get_admin_auth_service", 
    "AdminSchoolService", "get_admin_school_service",
    "AdminQuestionBankService", "get_admin_question_bank_service",
    "AdminSystemService", "get_admin_system_service",
]
