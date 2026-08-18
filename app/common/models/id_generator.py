"""
Standardized ID Generation - COMMON MODEL
Provides consistent ID generation across all domains
Centralized utility for maintaining ID format consistency
"""

import uuid
import secrets
import string
from datetime import datetime
from typing import Optional


class IDGenerator:
    """
    Centralized ID generation utility
    Ensures consistent ID formats across all domains
    """
    
    @staticmethod
    def generate_standard_id() -> str:
        """
        Generate standard 24-character hex ID
        Used for: users, sessions, questions, schools, etc.
        
        Returns:
            str: 24-character hexadecimal string
        """
        return uuid.uuid4().hex[:24]
    
    @staticmethod
    def generate_short_id(length: int = 12) -> str:
        """
        Generate shorter ID for specific use cases
        
        Args:
            length: Length of ID to generate (default 12)
            
        Returns:
            str: Hexadecimal string of specified length
        """
        return uuid.uuid4().hex[:length]
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """
        Generate cryptographically secure token
        Used for: password reset tokens, email verification, etc.
        
        Args:
            length: Length of token (default 32)
            
        Returns:
            str: Cryptographically secure token
        """
        return secrets.token_urlsafe(length)[:length]
    
    @staticmethod
    def generate_verification_code(length: int = 6) -> str:
        """
        Generate numeric verification code
        Used for: email verification, 2FA, etc.
        
        Args:
            length: Length of code (default 6)
            
        Returns:
            str: Numeric verification code
        """
        return ''.join(secrets.choice(string.digits) for _ in range(length))
    
    @staticmethod
    def generate_session_id(prefix: Optional[str] = None) -> str:
        """
        Generate session ID with optional prefix
        
        Args:
            prefix: Optional prefix for the ID
            
        Returns:
            str: Session ID with optional prefix
        """
        base_id = IDGenerator.generate_standard_id()
        if prefix:
            return f"{prefix}_{base_id}"
        return base_id
    
    @staticmethod
    def generate_timestamped_id(prefix: Optional[str] = None) -> str:
        """
        Generate ID with timestamp component
        Useful for debugging and ordering
        
        Args:
            prefix: Optional prefix for the ID
            
        Returns:
            str: Timestamped ID
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        random_part = IDGenerator.generate_short_id(8)
        
        if prefix:
            return f"{prefix}_{timestamp}_{random_part}"
        return f"{timestamp}_{random_part}"


# Convenience functions for common use cases
def generate_id() -> str:
    """Generate standard 24-character ID"""
    return IDGenerator.generate_standard_id()


def generate_user_id() -> str:
    """Generate user ID"""
    return IDGenerator.generate_standard_id()


def generate_session_id() -> str:
    """Generate session ID"""
    return IDGenerator.generate_standard_id()


def generate_question_id() -> str:
    """Generate question ID"""
    return IDGenerator.generate_standard_id()


def generate_school_id() -> str:
    """Generate school ID"""
    return IDGenerator.generate_standard_id()


def generate_admin_id() -> str:
    """Generate admin ID"""
    return IDGenerator.generate_standard_id()


def generate_reset_token() -> str:
    """Generate password reset token"""
    return IDGenerator.generate_secure_token(32)


def generate_verification_code() -> str:
    """Generate email verification code"""
    return IDGenerator.generate_verification_code(6)


# Export main class and convenience functions
__all__ = [
    'IDGenerator',
    'generate_id',
    'generate_user_id', 
    'generate_session_id',
    'generate_question_id',
    'generate_school_id',
    'generate_admin_id',
    'generate_reset_token',
    'generate_verification_code'
]
