"""
School Models Module
Exports all school model modules following the admin pattern
"""

from .school_repository import SchoolRepository, get_school_repository

__all__ = [
    "SchoolRepository",
    "get_school_repository",
]
