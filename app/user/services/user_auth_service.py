"""
User Authentication Service - USER DOMAIN
Handles all user authentication, JWT tokens, and user management
"""

import jwt
import bcrypt
import structlog
from datetime import datetime, timedelta
from typing import Dict, Optional
from app.config import settings

logger = structlog.get_logger()


class UserAuthService:
    """User-specific authentication service with JWT management"""

    def __init__(self):
        self.secret_key = settings.jwt_secret_key
        self.algorithm = settings.jwt_algorithm
        self.token_expires = settings.jwt_access_token_expires

    async def authenticate_user(self, email: str, password: str) -> Dict:
        """Authenticate user with email and password"""
        try:
            # Use new UserRepository for proper session management
            from app.dependencies import get_user_repository

            user_repo = get_user_repository()

            # Get user by email
            user_data = user_repo.get_user_by_email(email.lower())
            if not user_data:
                return {"success": False, "message": "Invalid credentials"}

            # User data is now a dictionary, so access values directly
            user_id = user_data["id"]
            user_email = user_data["email"]
            user_name = user_data["name"]
            is_active = user_data["is_active"]
            password_hash = user_data["password_hash"]

            # SECURITY: Check if user account is active (email verified)
            if not is_active:
                return {
                    "success": False, 
                    "message": "Account not activated. Please verify your email."
                }

            # SECURITY: Verify password hash
            import bcrypt
            if not password_hash or not bcrypt.checkpw(
                password.encode("utf-8"), password_hash.encode("utf-8")
            ):
                return {"success": False, "message": "Invalid credentials"}

            # Get user access info
            user_access_data = user_repo.get_user_access(user_id)

            # Generate JWT token for authenticated user
            token = await self.generate_jwt_token(user_id, email)

            return {
                "success": True,
                "user": {
                    "id": user_id,
                    "email": user_email,
                    "name": user_name,
                    "current_level": user_data.get("current_level"),
                    "target_level": user_data.get("target_level"),
                    "is_onboarded": user_data.get("is_onboarded"),
                    "onboarding_goal": user_data.get("onboarding_goal"),
                    "practice_frequency_per_week": user_data.get("practice_frequency_per_week"),
                    "preferred_language_id": user_data.get("preferred_language_id"),
                    "plan_type": (
                        user_access_data.get("plan_type", "basic") 
                        if user_access_data else "basic"
                    ),
                },
                "message": "Authentication successful",
                "access_token": token,
                "email": email,
                "user_id": user_id,
            }

        except Exception as e:
            logger.error("User authentication failed", email=email, error=str(e))
            return {"success": False, "message": "User authentication failed"}

    async def generate_jwt_token(self, user_id: str, email: str) -> str:
        """Generate JWT token for user"""
        try:
            payload = {
                "user_id": user_id,
                "email": email,
                "type": "user",
                "exp": datetime.utcnow() + timedelta(hours=self.token_expires),
                "iat": datetime.utcnow(),
            }

            token = jwt.encode(
                payload, self.secret_key, algorithm=self.algorithm
            )
            logger.info("User JWT token generated", user_id=user_id, email=email)
            return token

        except Exception as e:
            logger.error(
                "Failed to generate user JWT token", 
                user_id=user_id, 
                error=str(e)
            )
            raise Exception("Token generation failed")

    async def validate_jwt_token(self, token: str) -> Dict:
        """Validate user JWT token"""
        try:
            payload = jwt.decode(
                token, self.secret_key, algorithms=[self.algorithm]
            )

            # Ensure this is a user token
            if payload.get("type") != "user":
                return {"valid": False, "message": "Invalid token type"}

            return {
                "valid": True,
                "user_id": payload["user_id"],
                "email": payload["email"],
                "type": payload["type"],
            }

        except jwt.ExpiredSignatureError:
            logger.warning("User JWT token expired")
            return {"valid": False, "message": "Token expired"}
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid user JWT token", error=str(e))
            return {"valid": False, "message": "Invalid token"}
        except Exception as e:
            logger.error("User JWT validation failed", error=str(e))
            return {"valid": False, "message": "Token validation failed"}

    async def create_user(
        self, email: str, password: str, username: str, allocated_count: int = 6
    ) -> Dict:
        """Create new user account - Note: This method is no longer used in standard flows
        Users should be created through email verification or Firebase auth"""
        try:
            logger.warning(
                "Legacy create_user method called - "
                "should use email verification flow instead",
                email=email
            )
            # This method is deprecated - users should be created through 
            # the email verification flow
            return {
                "success": False, 
                "message": "Direct user creation is disabled. "
                          "Use email verification flow."
            }

        except Exception as e:
            logger.error("User creation failed", email=email, error=str(e))
            return {
                "success": False, 
                "message": f"User creation failed: {str(e)}"
            }

    async def change_user_password(
        self, user_id: str, old_password: str, new_password: str
    ) -> Dict:
        """Change user password with validation"""
        try:
            from app.dependencies import get_user_repository

            user_repo = get_user_repository()

            # Get user to verify old password
            user_data = user_repo.get_user_by_id(user_id)
            if not user_data:
                return {"success": False, "message": "User not found"}

            # User data is now a dictionary, so access values directly
            password_hash = user_data["password_hash"]
            
            # Check if user has a password (not a social media user)
            if not password_hash:
                return {
                    "success": False, 
                    "message": "Social media users must use 'Forgot Password' to create a password first. Visit the forgot password page to set up email login."
                }
            
            # Verify old password
            if not bcrypt.checkpw(
                old_password.encode("utf-8"), password_hash.encode("utf-8")
            ):
                return {
                    "success": False, 
                    "message": "Current password is incorrect"
                }

            # Hash new password
            new_password_hash = bcrypt.hashpw(
                new_password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            # Update password
            update_result = user_repo.update_user(
                user_id, {"password_hash": new_password_hash}
            )

            if update_result:
                logger.info(
                    "User password changed successfully", user_id=user_id
                )
                return {
                    "success": True, 
                    "message": "Password changed successfully"
                }
            else:
                return {"success": False, "message": "Failed to update password"}

        except Exception as e:
            logger.error("Password change failed", user_id=user_id, error=str(e))
            return {"success": False, "message": "Password change failed"}

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(
            password.encode("utf-8"), 
            password_hash.encode("utf-8")
        )

    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID for authentication purposes"""
        try:
            from app.dependencies import get_user_repository

            user_repo = get_user_repository()
            user_data = user_repo.get_user_by_id(user_id)

            if user_data:
                return {
                    "id": user_data["id"],
                    "email": user_data["email"],
                    "name": user_data.get("name"),
                    "is_admin": False,  # Regular users are not admin
                }
            return None
        except Exception as e:
            logger.error(
                "Failed to get user by ID", user_id=user_id, error=str(e)
            )
            return None


# Factory function
def get_user_auth_service() -> UserAuthService:
    """Get user authentication service instance"""
    return UserAuthService()
