"""
User Repository - USER DOMAIN USER-SPECIFIC OPERATIONS
Handles user authentication, profile, preferences, and status operations
Replaces the broken UserODMService user-specific methods
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, date, timedelta
import structlog
import bcrypt
import hashlib
from sqlalchemy import text

# Import shared base service
from app.common.models.mysql_odm_service import BaseMySQLODMService, require_mysql_connection
from app.common.models.mysql_models import User, UserAccess, School, UsageLog, Language, PricingPack
from app.config import settings

logger = structlog.get_logger()


class UserRepository(BaseMySQLODMService):
    """
    User Repository - User Domain
    Handles all user-specific database operations: auth, profile, preferences, status
    """

    # =================
    # USER MANAGEMENT
    # =================

    def create_user(self, user_data: dict) -> User:
        """Create user with full validation - HARD FAILURE on any error"""
        try:
            # Generate ID if not provided
            if 'id' not in user_data:
                user_data['id'] = self.generate_id()
            
            user = self.user_ops.create(**user_data)
            logger.info("User created via User Repository", user_id=str(user.id))
            return user
        except Exception as e:
            logger.error("Failed to create user via User Repository", error=str(e))
            raise Exception(f"CRITICAL: User creation failed - {str(e)}")

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email with type safety - returns dict to avoid session issues"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.email == email.lower()).first()
                if user:
                    # Extract all data while session is active to avoid detached instance issues
                    created_at = getattr(user, 'created_at', None)
                    updated_at = getattr(user, 'updated_at', None)
                    verification_expires = getattr(user, 'verification_expires', None)
                    reset_password_expires = getattr(user, 'reset_password_expires', None)
                    
                    return {
                        "id": str(user.id),
                        "email": user.email,
                        "name": user.name,
                        "is_active": bool(user.is_active),
                        "password_hash": user.password_hash,
                        "firebase_uid": user.firebase_uid,
                        "current_level": user.current_level.value if user.current_level else None,
                        "is_onboarded": bool(user.is_onboarded),
                        "onboarding_goal": user.onboarding_goal,
                        "target_level": user.target_level.value if user.target_level else None,
                        "practice_frequency_per_week": user.practice_frequency_per_week,
                        "preferred_language_id": user.preferred_language_id,
                        "created_at": created_at.isoformat() if created_at else None,
                        "updated_at": updated_at.isoformat() if updated_at else None,
                        "verification_code": user.verification_code,
                        "verification_expires": verification_expires.isoformat() if verification_expires else None,
                        "reset_password_token": user.reset_password_token,
                        "reset_password_expires": reset_password_expires.isoformat() if reset_password_expires else None
                    }
                return None
        except Exception as e:
            logger.error("Failed to get user by email", email=email, error=str(e))
            return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID - returns dict to avoid session issues"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.id == user_id).first()
                if user:
                    # Extract all data while session is active to avoid detached instance issues
                    created_at = getattr(user, 'created_at', None)
                    updated_at = getattr(user, 'updated_at', None)
                    verification_expires = getattr(user, 'verification_expires', None)
                    reset_password_expires = getattr(user, 'reset_password_expires', None)
                    
                    return {
                        "id": str(user.id),
                        "email": user.email,
                        "name": user.name,
                        "is_active": bool(user.is_active),
                        "password_hash": user.password_hash,
                        "firebase_uid": user.firebase_uid,
                        "current_level": user.current_level.value if user.current_level else None,
                        "target_level": user.target_level.value if user.target_level else None,
                        "is_onboarded": bool(user.is_onboarded),
                        "onboarding_goal": user.onboarding_goal,
                        "practice_frequency_per_week": user.practice_frequency_per_week,
                        "preferred_language_id": user.preferred_language_id,
                        "created_at": created_at.isoformat() if created_at else None,
                        "updated_at": updated_at.isoformat() if updated_at else None,
                        "verification_code": user.verification_code,
                        "verification_expires": verification_expires.isoformat() if verification_expires else None,
                        "reset_password_token": user.reset_password_token,
                        "reset_password_expires": reset_password_expires.isoformat() if reset_password_expires else None
                    }
                return None
        except Exception as e:
            logger.error("Failed to get user by ID", user_id=user_id, error=str(e))
            return None

    def update_user(self, user_id: str, update_data: dict) -> bool:
        """Update user with validation"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.id == user_id).first()
                if not user:
                    return False

                # Update fields
                for field, value in update_data.items():
                    if hasattr(user, field):
                        setattr(user, field, value)

                session.commit()
                logger.info("User updated via User Repository", user_id=user_id)
                return True
        except Exception as e:
            logger.error("Failed to update user", user_id=user_id, error=str(e))
            raise Exception(f"CRITICAL: User update failed for {user_id} - {str(e)}")

    # =================
    # FIREBASE USER OPERATIONS
    # =================

    def find_user_by_firebase_uid(self, firebase_uid: str) -> Optional[dict]:
        """Find user by Firebase UID"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.firebase_uid == firebase_uid).first()
                if user:
                    created_at = getattr(user, 'created_at', None)
                    return {
                        "id": str(user.id),
                        "email": user.email,
                        "name": user.name,
                        "firebase_uid": user.firebase_uid,
                        "is_active": bool(user.is_active),
                        "created_at": created_at.isoformat() if created_at else None
                    }
                return None
        except Exception as e:
            logger.error("Failed to find user by Firebase UID", firebase_uid=firebase_uid, error=str(e))
            return None

    def create_user_with_firebase(self, user_data: dict) -> dict:
        """Create user with Firebase integration"""
        try:
            # Generate ID if not provided
            if 'id' not in user_data:
                user_data['id'] = self.generate_id()
            
            # Set default values
            user_data.setdefault('is_active', True)
            user_data.setdefault('email_verified', True)  # Firebase users are pre-verified
            
            user = self.user_ops.create(**user_data)
            
            # Get default trial plan details using ODM operations (following architecture standards)
            trial_pack = self.pricing_pack_ops.get_by_field('id', settings.default_pricing_pack_id)
            if not trial_pack:
                logger.error("default trial pricing pack not found in database")
                raise Exception("Default trial pack not configured")
            
            # Create default user access with default trial plan details
            access_data = {
                'user_id': user.id,
                'allocated_count': trial_pack.credits,  # From database
                'used_count': 0,
                'current_pack_id': settings.default_pricing_pack_id,  # Proper pack assignment
                'reset_at': datetime.utcnow(),
                'last_used': datetime.utcnow()
            }
            self.user_access_ops.create(**access_data)
            
            logger.info("User created with Firebase", user_id=user.id)
            
            # Extract data safely to avoid session issues
            created_at = getattr(user, 'created_at', None)
            
            user_payload = {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "firebase_uid": user.firebase_uid,
                "is_active": bool(user.is_active),
                "created_at": created_at.isoformat() if created_at else None
            }

            return {
                "success": True,
                "user": user_payload
            }
        except Exception as e:
            logger.error("Failed to create user with Firebase", error=str(e))
            raise Exception(f"CRITICAL: Firebase user creation failed - {str(e)}")

    # =================
    # USER ACCESS MANAGEMENT
    # =================

    def create_user_access(
        self, 
        user_id: str, 
        allocated_count: Optional[int] = None
    ) -> UserAccess:
        """Create user access record"""
        try:
            # Get default trial plan details using ODM operations if no allocated_count provided
            if allocated_count is None:
                trial_pack = self.pricing_pack_ops.get_by_field('id', settings.default_pricing_pack_id)
                if not trial_pack:
                    logger.error("default trial pricing pack not found in database")
                    raise Exception("Default trial pack not configured")
                allocated_count = trial_pack.credits
            
            access_data = {
                'user_id': user_id,
                'allocated_count': allocated_count,
                'used_count': 0,
                'current_pack_id': settings.default_pricing_pack_id,  # Default to trial pack
                'reset_at': datetime.utcnow(),
                'last_used': datetime.utcnow()
            }
            
            user_access = self.user_access_ops.create(**access_data)
            logger.info("User access created", user_id=user_id)
            return user_access
        except Exception as e:
            logger.error("Failed to create user access", user_id=user_id, error=str(e))
            raise Exception(f"CRITICAL: User access creation failed - {str(e)}")

    def get_user_access(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user access information including plan and usage"""
        try:
            with self.mysql_service.get_db() as session:
                user_access = session.query(UserAccess).filter(UserAccess.user_id == user_id).first()
                
                if user_access:
                    return {
                        "user_id": str(user_access.user_id),
                        "plan_type": user_access.current_pack_id,
                        "allocated_count": user_access.allocated_count,
                        "used_count": user_access.used_count,
                        "reserved_credits": user_access.reserved_credits,
                        "status": user_access.status,
                        "reset_at": user_access.reset_at.isoformat() if user_access.reset_at else None,
                        "last_used": user_access.last_used.isoformat() if user_access.last_used else None,
                        "created_at": user_access.created_at.isoformat() if user_access.created_at else None
                    }
                
                return None
        except Exception as e:
            logger.error("Failed to get user access", user_id=user_id, error=str(e))
            return None

    def get_user_access_object(self, user_id: str) -> Optional[UserAccess]:
        """Get user access as SQLAlchemy model object (for internal operations)"""
        try:
            with self.mysql_service.get_db() as session:
                user_access = session.query(UserAccess).filter(UserAccess.user_id == user_id).first()
                return user_access
        except Exception as e:
            logger.error("Failed to get user access object", user_id=user_id, error=str(e))
            return None

    # =================
    # AUTHENTICATION
    # =================

    def authenticate_user(self, email: str, password: str) -> dict:
        """Authenticate user with email and password"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.email == email.lower()).first()
                
                if not user or not user.password_hash:
                    return {"success": False, "message": "Invalid credentials"}
                
                # Check password
                if bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
                    # Update last activity
                    user.last_login = datetime.utcnow()
                    session.commit()
                    
                    return {
                        "success": True,
                        "user": {
                            "id": user.id,
                            "email": user.email,
                            "name": user.name,
                            "is_active": user.is_active,
                            "email_verified": user.email_verified
                        }
                    }
                
                return {"success": False, "message": "Invalid credentials"}
        except Exception as e:
            logger.error("Authentication failed", email=email, error=str(e))
            return {"success": False, "message": "Authentication error"}

    def change_user_password(self, user_id: str, current_password: str, new_password: str) -> dict:
        """Change user password with current password verification"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.id == user_id).first()
                
                if not user:
                    return {"success": False, "message": "User not found"}
                
                # Check if user has a password (not a social media user)
                if not user.password_hash:
                    return {
                        "success": False, 
                        "message": "Social media users must use 'Forgot Password' to create a password first. Visit the forgot password page to set up email login."
                    }
                
                # Verify current password
                if not bcrypt.checkpw(current_password.encode('utf-8'), user.password_hash.encode('utf-8')):
                    return {"success": False, "message": "Current password is incorrect"}
                
                # Hash new password
                salt = bcrypt.gensalt()
                new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')
                
                # Update password
                user.password_hash = new_password_hash
                user.updated_at = datetime.utcnow()
                session.commit()
                
                logger.info("Password changed successfully", user_id=user_id)
                return {"success": True, "message": "Password changed successfully"}
                
        except Exception as e:
            logger.error("Failed to change password", user_id=user_id, error=str(e))
            return {"success": False, "message": "Password change failed"}

    # =================
    # PASSWORD RESET
    # =================

    def request_password_reset(self, email: str, reset_token: str, expires_at: datetime) -> dict:
        """Request password reset"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.email == email.lower()).first()
                
                if not user:
                    return {"success": False, "message": "User not found"}
                
                # Hash the reset token for security
                reset_token_hash = hashlib.sha256(reset_token.encode()).hexdigest()
                
                # Update user with reset token
                user.reset_password_token = reset_token_hash
                user.reset_password_expires = expires_at
                user.updated_at = datetime.utcnow()
                session.commit()
                
                logger.info("Password reset requested", user_id=user.id)
                return {"success": True, "message": "Password reset token set", "user_id": user.id}
                
        except Exception as e:
            logger.error("Failed to request password reset", email=email, error=str(e))
            return {"success": False, "message": "Password reset request failed"}

    def validate_reset_token(self, email: str, reset_token: str) -> dict:
        """Validate password reset token"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.email == email.lower()).first()
                
                if not user:
                    return {"success": False, "message": "User not found"}
                
                if not user.reset_password_token or not user.reset_password_expires:
                    return {"success": False, "message": "No reset token found"}
                
                # Check if token has expired
                if datetime.utcnow() > user.reset_password_expires:
                    return {"success": False, "message": "Reset token has expired"}
                
                # Validate token
                reset_token_hash = hashlib.sha256(reset_token.encode()).hexdigest()
                if reset_token_hash != user.reset_password_token:
                    return {"success": False, "message": "Invalid reset token"}
                
                return {"success": True, "user_id": user.id}
                
        except Exception as e:
            logger.error("Failed to validate reset token", email=email, error=str(e))
            return {"success": False, "message": "Token validation failed"}

    def reset_password_with_token(self, email: str, reset_token: str, new_password_hash: str) -> dict:
        """Reset password using valid token"""
        try:
            with self.mysql_service.get_db() as session:
                # First validate the token
                validation_result = self.validate_reset_token(email, reset_token)
                if not validation_result.get("success"):
                    return validation_result
                
                user = session.query(User).filter(User.email == email.lower()).first()
                
                # Update password and clear reset token
                user.password_hash = new_password_hash
                user.reset_password_token = None
                user.reset_password_expires = None
                user.updated_at = datetime.utcnow()
                session.commit()
                
                logger.info("Password reset completed", user_id=user.id)
                return {"success": True, "message": "Password reset successfully"}
                
        except Exception as e:
            logger.error("Failed to reset password", email=email, error=str(e))
            return {"success": False, "message": "Password reset failed"}

    # =================
    # USER STATUS & PREFERENCES
    # =================

    def get_user_status_data(self, user_id: str) -> Optional[dict]:
        """Get comprehensive user status data"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.id == user_id).first()
                
                if not user:
                    return None
                
                # Get user access data
                user_access = session.query(UserAccess).filter(
                    UserAccess.user_id == user_id
                ).first()
                
                # Get school info if available
                school = None
                if user.school_id:
                    school = session.query(School).filter(School.id == user.school_id).first()
                
                # Get preferred language info if available
                preferred_language_info = None
                if user.preferred_language_id:
                    language = session.query(Language).filter(
                        Language.id == user.preferred_language_id,
                        Language.is_active.is_(True)
                    ).first()
                    if language:
                        preferred_language_info = {
                            "language_id": language.id,
                            "language_name": language.name,
                            "native_name": language.native_name,
                            "flag_emoji": language.flag_emoji,
                            "code": language.code,
                            "supported_levels": language.supported_levels if language.supported_levels else [],
                            "is_active": language.is_active,
                            "display_order": language.display_order
                        }
                
                result = {
                    "user_info": {
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                        "is_active": user.is_active,
                        "email_verified": user.email_verified,
                        "school_id": user.school_id,
                        "school_name": school.name if school else None,
                        "created_at": user.created_at.isoformat() if user.created_at else None,
                        "last_login": user.last_login.isoformat() if user.last_login else None,
                        "current_level": user.current_level.value if user.current_level else None,
                        "target_level": user.target_level.value if user.target_level else None,
                        "is_onboarded": bool(user.is_onboarded),
                        "onboarding_goal": user.onboarding_goal,
                        "practice_frequency_per_week": user.practice_frequency_per_week,
                        "preferred_language_id": user.preferred_language_id,
                        "auth_provider": user.auth_provider.value if user.auth_provider else "email",
                        "firebase_uid": user.firebase_uid,
                        "has_password": bool(user.password_hash)  # Explicit flag for frontend
                    },
                    "usage_info": {
                        "allocated_count": user_access.allocated_count if user_access else 0,
                        "used_count": user_access.used_count if user_access else 0,
                        "remaining_count": (user_access.allocated_count - user_access.used_count) if user_access else 0,
                        "reset_at": user_access.reset_at.isoformat() if user_access and user_access.reset_at else None
                    }
                }
                
                # Add preferred language info if available
                if preferred_language_info:
                    result["preferred_language_info"] = preferred_language_info
                
                return result
        except Exception as e:
            logger.error("Failed to get user status data", user_id=user_id, error=str(e))
            return None

    def get_user_preferences_data(self, user_id: str) -> Optional[dict]:
        """Get user preferences data"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.id == user_id).first()
                
                if not user:
                    # Return default preferences if user not found
                    logger.warning(
                        "No user found, returning default preferences", user_id=user_id
                    )
                    return {
                        "preferred_language_id": settings.default_language_id,
                        "favorite_activities": [],
                        "daily_goal": 10,
                        "practice_frequency_per_week": 3,
                        "onboarding_goal": None
                    }
                
                # Build preferences from user data
                preferences = {
                    "preferred_language_id": user.preferred_language_id or settings.default_language_id,
                    "favorite_activities": user.favorite_activities or [],
                    "daily_goal": user.daily_goal or 10,
                    "practice_frequency_per_week": user.practice_frequency_per_week or 3,
                    "onboarding_goal": user.onboarding_goal
                }
                
                return preferences
        except Exception as e:
            logger.error("Failed to get user preferences", user_id=user_id, error=str(e))
            return None

    def update_user_preferences(self, user_id: str, update_data: dict) -> dict:
        """Update user preferences"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.id == user_id).first()
                
                if not user:
                    return {"success": False, "message": "User not found"}
                
                # Update user fields based on preferences
                preference_mappings = {
                    "preferred_language_id": "preferred_language_id",
                    "favorite_activities": "favorite_activities",
                    "daily_goal": "daily_goal",
                    "practice_frequency_per_week": "practice_frequency_per_week",
                    "onboarding_goal": "onboarding_goal"
                }
                
                # Update fields
                for pref_key, user_field in preference_mappings.items():
                    if pref_key in update_data and hasattr(user, user_field):
                        setattr(user, user_field, update_data[pref_key])
                
                user.updated_at = datetime.utcnow()
                session.commit()
                
                return {"success": True, "message": "Preferences updated successfully"}
        except Exception as e:
            logger.error("Failed to update user preferences", user_id=user_id, error=str(e))
            return {"success": False, "message": "Failed to update preferences"}

    def update_user_profile(self, user_id: str, update_data: dict) -> dict:
        """Update user profile information"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.id == user_id).first()
                
                if not user:
                    return {"success": False, "message": "User not found"}
                
                # Update allowed profile fields
                allowed_fields = [
                    'name',
                    'phone_number',
                    'school_id',
                    'current_level',
                    'target_level',
                    'preferred_language_id',
                    'is_onboarded'
                ]
                updated_fields = []
                
                for field in allowed_fields:
                    if field in update_data and hasattr(user, field):
                        setattr(user, field, update_data[field])
                        updated_fields.append(field)
                
                if updated_fields:
                    user.updated_at = datetime.utcnow()
                    session.commit()
                    
                    logger.info("User profile updated", user_id=user_id, fields=updated_fields)
                    return {"success": True, "message": "Profile updated successfully", "updated_fields": updated_fields}
                else:
                    return {"success": False, "message": "No valid fields to update"}
                
        except Exception as e:
            logger.error("Failed to update user profile", user_id=user_id, error=str(e))
            return {"success": False, "message": "Failed to update profile"}

    # =================
    # EMAIL VERIFICATION
    # =================

    def create_inactive_user(
        self, 
        email: str, 
        password_hash: str, 
        verification_code: str, 
        verification_expires: datetime
    ) -> dict:
        """Create inactive user pending email verification"""
        try:
            user_data = {
                'email': email.lower(),
                'password_hash': password_hash,
                'name': email.split('@')[0],  # Default name from email
                'is_active': False,
                'email_verified': False,
                'verification_code': verification_code,
                'verification_expires': verification_expires,
                'preferred_language_id': settings.default_language_id  # German as default
            }
            
            user = self.user_ops.create(**user_data)
            
            logger.info("Inactive user created for verification", user_id=user.id)
            return {"success": True, "user_id": user.id}
            
        except Exception as e:
            logger.error("Failed to create inactive user", email=email, error=str(e))
            return {"success": False, "message": "Failed to create user"}

    def verify_user_email(self, email_hash: str, verification_code: str) -> dict:
        """Verify user email with MD5 hash and verification code"""
        try:
            with self.mysql_service.get_db() as session:
                # Find user by matching MD5(email) with email_hash
                from sqlalchemy import func
                
                user = session.query(User).filter(
                    func.md5(func.lower(User.email)) == email_hash.lower()
                ).first()
                
                if not user:
                    return {"success": False, "message": "User not found"}
                
                if user.email_verified:
                    return {"success": False, "message": "Email already verified"}
                
                if user.verification_code != verification_code:
                    return {"success": False, "message": "Invalid verification code"}
                
                if datetime.utcnow() > user.verification_expires:
                    return {"success": False, "message": "Verification code expired"}
                
                # Verify user
                user.email_verified = True
                user.is_active = True
                user.verification_code = None
                user.verification_expires = None
                user.updated_at = datetime.utcnow()
                
                # Get default trial plan details using ODM operations (following architecture standards)
                trial_pack = self.pricing_pack_ops.get_by_field('id', settings.default_pricing_pack_id)
                if not trial_pack:
                    logger.error("default trial pricing pack not found in database")
                    return {"success": False, "message": "Default trial pack not configured"}
                
                # Create default user access with default trial plan details
                access_data = {
                    'user_id': user.id,
                    'allocated_count': trial_pack.credits,  # From database
                    'used_count': 0,
                    'current_pack_id': settings.default_pricing_pack_id,  # Proper pack assignment
                    'reset_at': datetime.utcnow(),
                    'last_used': datetime.utcnow()
                }
                self.user_access_ops.create(**access_data)
                
                session.commit()
                
                logger.info("User email verified", user_id=user.id, email_hash=email_hash)
                return {
                    "success": True, 
                    "user_id": user.id,
                    "user_email": user.email,
                    "user_name": user.name
                }
                
        except Exception as e:
            logger.error("Failed to verify user email", error=str(e), email_hash=email_hash)
            return {"success": False, "message": "Email verification failed"}

    def get_user_for_resend_verification(self, email: str) -> dict:
        """Get user data for resending verification"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.email == email.lower()).first()
                
                if not user:
                    return {"success": False, "message": "User not found"}
                
                if user.email_verified:
                    return {"success": False, "message": "Email already verified"}
                
                return {
                    "success": True,
                    "user_id": user.id,
                    "email": user.email,
                    "name": user.name
                }
        except Exception as e:
            logger.error("Failed to get user for resend verification", email=email, error=str(e))
            return {"success": False, "message": "Failed to get user data"}

    def update_verification_code(self, user_id: str, verification_code: str, verification_expires: datetime) -> dict:
        """Update verification code for user"""
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.id == user_id).first()
                
                if not user:
                    return {"success": False, "message": "User not found"}
                
                user.verification_code = verification_code
                user.verification_expires = verification_expires
                user.updated_at = datetime.utcnow()
                session.commit()
                
                logger.info("Verification code updated", user_id=user_id)
                return {"success": True, "message": "Verification code updated"}
                
        except Exception as e:
            logger.error("Failed to update verification code", user_id=user_id, error=str(e))
            return {"success": False, "message": "Failed to update verification code"}

    # =================
    # DASHBOARD STATISTICS - MOVED TO ISOLATED SERVICE
    # =================
    
    # NOTE: Dashboard functionality has been moved to:
    # app/user/dashboard/services/dashboard_service.py
    # app/user/dashboard/models/dashboard_repository.py
    # app/user/dashboard/routers/dashboard_router.py
    #
    # This separation ensures complete isolation of analytics logic
    # from regular user business operations.

    # All dashboard methods have been moved to the isolated dashboard service
    # See: app/user/dashboard/
    
    def get_usage_statistics_odm(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get usage statistics for user - simplified for now"""
        # TODO: Will be moved to separate dashboard repo
        return {
            "total_sessions": 0,
            "total_points_used": 0,
            "activity_breakdown": {"message": "WIP - dashboard moved to separate repo"},
            "last_activity": None
        }
    
    def get_user_access_limits_odm(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user access limits - reusing existing method"""
        user_access = self.get_user_access(user_id)
        if user_access:
            return {
                "remaining_count": user_access["allocated_count"] - user_access["used_count"],
                "allocated_count": user_access["allocated_count"],
                "used_count": user_access["used_count"]
            }
        return None

    # =================
    # USAGE HISTORY
    # =================
    
    def get_user_usage_history_odm(
        self,
        user_id: str,
        limit: int = 50,
        skip: int = 0,
        session_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Get user usage history with pagination and filtering"""
        try:
            with self.mysql_service.get_db() as session:
                from sqlalchemy.orm import joinedload
                query = session.query(UsageLog).options(joinedload(UsageLog.language)).filter(UsageLog.user_id == user_id)

                if session_type:
                    query = query.filter(UsageLog.session_type == session_type)
                if start_date:
                    query = query.filter(UsageLog.timestamp >= start_date)
                if end_date:
                    query = query.filter(UsageLog.timestamp <= end_date)

                total_count = query.count()

                usage_logs = (
                    query.order_by(UsageLog.timestamp.desc()).offset(skip).limit(limit).all()
                )

                usage_data = []
                for log in usage_logs:
                    # Get language information if available
                    language_name = None
                    language_flag_emoji = None
                    if log.language:
                        language_name = log.language.name
                        language_flag_emoji = log.language.flag_emoji
                    
                    usage_data.append(
                        {
                            "id": log.id,
                            "session_type": log.session_type.value if hasattr(log.session_type, 'value') else log.session_type,
                            "activity_type": log.activity_type.value if hasattr(log.activity_type, 'value') else log.activity_type,
                            "level": log.level.value if hasattr(log.level, 'value') else log.level,
                            "points_deducted": log.points_deducted,
                            "points_remaining": log.points_remaining,
                            "timestamp": log.timestamp.isoformat()
                            if log.timestamp
                            else None,
                            "session_id": log.session_id,
                            "exam_id": log.exam_id,
                            "description": log.description,
                            "status": log.status.value if hasattr(log.status, 'value') else log.status,
                            "language_name": language_name,
                            "language_flag_emoji": language_flag_emoji,
                        }
                    )

                return {
                    "success": True,
                    "usage_history": usage_data,
                    "total_count": total_count,
                    "limit": limit,
                    "skip": skip,
                }
        except Exception as e:
            logger.error("Failed to get usage history", user_id=user_id, error=str(e))
            return {"success": False, "error": str(e), "usage_history": []}

    # ================= 
    # CLEAN REPOSITORY PATTERN METHODS (Non-ODM)
    # =================
    
    def get_user_usage_history(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        session_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Get user usage history - Clean Repository Pattern (No ODM suffix)"""
        # Delegate to ODM method for now, during transition period
        return self.get_user_usage_history_odm(
            user_id=user_id,
            limit=limit, 
            skip=offset,  # Convert offset to skip for ODM method
            session_type=session_type,
            start_date=start_date,
            end_date=end_date
        )
    
    def get_usage_statistics(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get usage statistics - Clean Repository Pattern (No ODM suffix)"""
        # Delegate to ODM method for now, during transition period
        return self.get_usage_statistics_odm(user_id)
    
    def get_user_access_limits(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user access limits - Clean Repository Pattern (No ODM suffix)"""
        # Delegate to ODM method for now, during transition period  
        return self.get_user_access_limits_odm(user_id)

def get_user_repository() -> UserRepository:
    """Get UserRepository instance"""
    return UserRepository()
