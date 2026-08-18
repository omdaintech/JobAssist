"""
School Authentication Service - SCHOOL DOMAIN
Handles school admin authentication with simplified JWT security
Follows the same pattern as admin auth but with school scoping
"""

import jwt
import bcrypt
import structlog
from datetime import datetime, timedelta
from typing import Dict

from app.common.services.token_service import generate_school_impersonation_token
from app.config import settings

logger = structlog.get_logger()


class SchoolAuthService:
    """School admin authentication service with simplified JWT management"""

    def __init__(self):
        # Use same JWT secret as admin for simplicity (simplified security approach)
        self.secret_key = settings.jwt_secret_key
        self.algorithm = settings.jwt_algorithm
        self.token_expires = settings.admin_jwt_expires  # Same expiry as admin
        self.token_expires_remember_me = 2592000  # 30 days for remember me

    def authenticate_school_admin(self, email: str, password: str, remember_me: bool = False) -> Dict:
        """Authenticate school admin with email and password"""
        try:
            # Use School Repository for authentication
            from app.school.models.school_repository import SchoolRepository
            
            school_repo = SchoolRepository()
            
            # School Repository handles authentication logic
            result = school_repo.authenticate_school_admin(email, password)
            
            if result["success"]:
                # Generate JWT token for authenticated school admin
                school_admin_data = result["school_admin"]
                token = self.generate_school_jwt_token(
                    school_admin_id=school_admin_data["id"],
                    school_id=school_admin_data["school_id"],
                    email=school_admin_data["email"],
                    permissions=school_admin_data["permissions"],
                    remember_me=remember_me,
                )
                result["token"] = token
                result["email"] = email
                
            return result
            
        except Exception as e:
            logger.error("School admin authentication failed", email=email, error=str(e))
            return {"success": False, "message": "School admin authentication failed"}

    def generate_school_jwt_token(
        self, school_admin_id: str, school_id: str, email: str, permissions: list = None, remember_me: bool = False
    ) -> str:
        """Generate JWT token for school admin with school scoping"""
        try:
            # Use longer expiration if remember_me is True
            expiration_seconds = self.token_expires_remember_me if remember_me else self.token_expires
            
            payload = {
                "school_admin_id": school_admin_id,
                "school_id": school_id,  # KEY: School scoping for security
                "email": email,
                "type": "school",  # KEY: Different from "admin" type
                "permissions": permissions or ["manage_users", "view_analytics"],
                "exp": datetime.utcnow() + timedelta(seconds=expiration_seconds),
                "iat": datetime.utcnow(),
            }

            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            logger.info(
                "School JWT token generated", 
                school_admin_id=school_admin_id, 
                school_id=school_id,
                email=email,
                remember_me=remember_me,
                expires_in_days=expiration_seconds / 86400
            )
            return token

        except Exception as e:
            logger.error(
                "Failed to generate school JWT token", 
                school_admin_id=school_admin_id, 
                error=str(e)
            )
            raise Exception("School token generation failed")

    def generate_impersonation_jwt_token(
        self, school_id: str, admin_id: str, admin_email: str
    ) -> str:
        """Generate JWT token for admin impersonating a school"""
        try:
            from app.config import settings
            from app.school.models.school_repository import SchoolRepository

            # Get school details and first active school admin
            school_repo = SchoolRepository()
            school_admin = school_repo.get_school_admin_for_school(school_id)

            if not school_admin:
                raise Exception(f"No active school admin found for school {school_id}")

            token = generate_school_impersonation_token(
                school_admin_id=school_admin["id"],
                school_id=school_id,
                school_admin_email=school_admin["email"],
                permissions=school_admin.get("permissions") or [],
                impersonated_by_admin_id=admin_id,
                impersonated_by_email=admin_email,
                expires_in_seconds=settings.impersonation_token_expires,
            )
            logger.info(
                "Impersonation JWT token generated", 
                school_id=school_id,
                admin_id=admin_id,
                admin_email=admin_email,
                expires_in_hours=settings.impersonation_token_expires / 3600
            )
            return token

        except Exception as e:
            logger.error(
                "Failed to generate impersonation JWT token", 
                school_id=school_id,
                admin_id=admin_id,
                error=str(e)
            )
            raise Exception("Impersonation token generation failed")

    def validate_school_jwt_token(self, token: str) -> Dict:
        """Validate school admin JWT token with simplified security"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            # SECURITY: Ensure this is a school token (simplified approach)
            if payload.get("type") != "school":
                return {"valid": False, "message": "Invalid token type - not school"}

            # SECURITY: Ensure school_id exists (school scoping)
            if not payload.get("school_id"):
                return {"valid": False, "message": "Missing school scope"}

            # Optional: Log impersonation access
            if payload.get("impersonated_by_admin"):
                logger.info("Impersonated school access", 
                           school_id=payload["school_id"],
                           admin_id=payload["impersonated_by_admin"],
                           admin_email=payload.get("impersonated_by_email"))

            return {
                "valid": True,
                "school_admin_id": payload["school_admin_id"],
                "school_id": payload["school_id"],  # KEY: School scope for all operations
                "email": payload["email"],
                "permissions": payload["permissions"],
                "type": payload["type"],
                # Include impersonation info for audit
                "impersonated_by": payload.get("impersonated_by_admin"),
                "impersonated_by_email": payload.get("impersonated_by_email"),
            }

        except jwt.ExpiredSignatureError:
            logger.warning("School JWT token expired")
            return {"valid": False, "message": "School token expired"}
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid school JWT token", error=str(e))
            return {"valid": False, "message": "Invalid school token"}
        except Exception as e:
            logger.error("School JWT validation failed", error=str(e))
            return {"valid": False, "message": "School token validation failed"}

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# Factory function
def get_school_auth_service() -> SchoolAuthService:
    """Get school authentication service instance"""
    return SchoolAuthService()
