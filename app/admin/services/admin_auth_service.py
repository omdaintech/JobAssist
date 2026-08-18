"""
Admin Authentication Service - ADMIN DOMAIN
Handles all admin authentication, JWT tokens, and admin user management
"""

import jwt
import bcrypt
import structlog
from datetime import datetime, timedelta
from typing import Dict, Optional
from app.config import settings

logger = structlog.get_logger()


class AdminAuthService:
    """Admin-specific authentication service with JWT management"""

    def __init__(self):
        self.secret_key = settings.jwt_secret_key
        self.algorithm = settings.jwt_algorithm
        self.admin_token_expires = (
            settings.admin_jwt_expires
        )  # 24 hours for admin tokens
        self.admin_token_expires_remember_me = 2592000  # 30 days for remember me

    async def authenticate_admin(self, email: str, password: str, remember_me: bool = False) -> Dict:
        """Authenticate admin user with email and password"""
        try:
            # Use Admin Repository for authentication
            from app.admin.dependencies import get_admin_repository_dependency

            admin_repo = get_admin_repository_dependency()

            # Admin Repository handles authentication logic
            result = admin_repo.authenticate_admin(email, password)

            if result["success"]:
                # Generate JWT token for authenticated admin
                admin_data = result["admin"]
                token = await self.generate_admin_jwt_token(
                    admin_id=admin_data["id"],
                    email=admin_data["email"],
                    role=admin_data["role"],
                    permissions=admin_data["permissions"],
                    remember_me=remember_me,
                )
                result["token"] = token
                result["email"] = email

            return result

        except Exception as e:
            logger.error("Admin authentication failed", email=email, error=str(e))
            return {"success": False, "message": "Admin authentication failed"}

    async def generate_admin_jwt_token(
        self, admin_id: str, email: str, role: str = "admin", permissions: list = None, remember_me: bool = False
    ) -> str:
        """Generate JWT token for admin with role and permissions"""
        try:
            # Use longer expiration if remember_me is True
            expiration_seconds = self.admin_token_expires_remember_me if remember_me else self.admin_token_expires
            
            payload = {
                "admin_id": admin_id,
                "email": email,
                "role": role,
                "permissions": permissions or ["read", "write", "admin"],
                "type": "admin",
                "exp": datetime.utcnow() + timedelta(seconds=expiration_seconds),
                "iat": datetime.utcnow(),
            }

            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            logger.info(
                "Admin JWT token generated", 
                admin_id=admin_id, 
                email=email, 
                role=role,
                remember_me=remember_me,
                expires_in_days=expiration_seconds / 86400
            )
            return token

        except Exception as e:
            logger.error(
                "Failed to generate admin JWT token", admin_id=admin_id, error=str(e)
            )
            raise Exception("Admin token generation failed")

    async def validate_admin_jwt_token(self, token: str) -> Dict:
        """Validate admin JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            # Ensure this is an admin token
            if payload.get("type") != "admin":
                return {"valid": False, "message": "Invalid token type - not admin"}

            return {
                "valid": True,
                "admin_id": payload["admin_id"],
                "email": payload["email"],
                "role": payload["role"],
                "permissions": payload["permissions"],
                "type": payload["type"],
            }

        except jwt.ExpiredSignatureError:
            logger.warning("Admin JWT token expired")
            return {"valid": False, "message": "Admin token expired"}
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid admin JWT token", error=str(e))
            return {"valid": False, "message": "Invalid admin token"}
        except Exception as e:
            logger.error("Admin JWT validation failed", error=str(e))
            return {"valid": False, "message": "Admin token validation failed"}

    async def create_admin_user(
        self,
        email: str,
        password: str,
        name: str,
        role: str = "admin",
        permissions: list = None,
    ) -> Dict:
        """Create new admin user account"""
        try:
            # Use Admin Repository for admin creation
            from app.admin.dependencies import get_admin_repository_dependency

            admin_repo = get_admin_repository_dependency()

            # Hash password
            password_hash = bcrypt.hashpw(
                password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            # Admin Repository handles admin creation
            result = admin_repo.create_admin_user(
                email=email, password_hash=password_hash, name=name, role=role
            )

            if result["success"]:
                logger.info(
                    "Admin user created successfully",
                    admin_id=result["admin_id"],
                    email=email,
                    role=role,
                )

            return result

        except Exception as e:
            logger.error("Admin user creation failed", email=email, error=str(e))
            return {"success": False, "message": f"Admin creation failed: {str(e)}"}

    async def change_admin_password(
        self, admin_id: str, current_password: str, new_password: str
    ) -> Dict:
        """Change admin user password with current password verification"""
        try:
            # Use Admin Repository for password change
            from app.admin.dependencies import get_admin_repository_dependency

            admin_repo = get_admin_repository_dependency()

            # First, verify admin exists and current password is correct
            admin_data = admin_repo.get_admin_by_id(admin_id)
            
            if not admin_data:
                return {"success": False, "message": "Admin user not found"}

            # Verify current password
            if not self.verify_password(current_password, admin_data["password_hash"]):
                return {"success": False, "message": "Current password is incorrect"}

            # Hash new password
            new_password_hash = self.hash_password(new_password)

            # Update password via Repository
            result = admin_repo.change_admin_password(admin_id, new_password_hash)

            if result["success"]:
                logger.info(
                    "Admin password changed successfully",
                    admin_id=admin_id,
                )

            return result

        except Exception as e:
            logger.error("Admin password change failed", admin_id=admin_id, error=str(e))
            return {"success": False, "message": f"Password change failed: {str(e)}"}

    async def generate_admin_token(self, admin_id: str = "admin") -> str:
        """Generate simple admin token (legacy compatibility)"""
        try:
            # Generate a simple admin token for basic admin operations
            payload = {
                "admin_id": admin_id,
                "type": "admin_simple",
                "exp": datetime.utcnow() + timedelta(seconds=self.admin_token_expires),
                "iat": datetime.utcnow(),
            }

            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            logger.info("Simple admin token generated", admin_id=admin_id)
            return token

        except Exception as e:
            logger.error("Failed to generate simple admin token", error=str(e))
            raise Exception("Simple admin token generation failed")

    async def validate_admin_token(self, token: str) -> Dict:
        """Validate simple admin token (legacy compatibility)"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            # Check for simple admin token
            if payload.get("type") == "admin_simple":
                return {
                    "valid": True,
                    "admin_id": payload["admin_id"],
                    "type": payload["type"],
                }
            else:
                return {"valid": False, "message": "Invalid simple admin token"}

        except jwt.ExpiredSignatureError:
            logger.warning("Simple admin token expired")
            return {"valid": False, "message": "Simple admin token expired"}
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid simple admin token", error=str(e))
            return {"valid": False, "message": "Invalid simple admin token"}
        except Exception as e:
            logger.error("Simple admin token validation failed", error=str(e))
            return {"valid": False, "message": "Simple admin token validation failed"}

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

    def check_admin_permission(
        self, permissions: list, required_permission: str
    ) -> bool:
        """Check if admin has required permission"""
        return required_permission in permissions


# Factory function
def get_admin_auth_service() -> AdminAuthService:
    """Get admin authentication service instance"""
    return AdminAuthService()
