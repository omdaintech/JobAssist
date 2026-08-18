"""
Admin Models Module
Exports admin-specific models and database services
"""

from .admin_repository import AdminRepository, get_admin_repository

__all__ = [
    "AdminRepository",
    "get_admin_repository"
]
