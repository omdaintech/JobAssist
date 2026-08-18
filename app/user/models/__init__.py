"""
User Models Module
Exports user-specific models and database services
"""

from .user_repository import UserRepository, get_user_repository
from .core_repository import CoreRepository, get_core_repository

# For consistency with admin pattern - use dependencies.py
# Direct import deprecated, use app.dependencies.get_user_odm_service

__all__ = [
    "UserRepository", "get_user_repository",   # New user-specific operations
    "CoreRepository", "get_core_repository"    # New core operations
]
