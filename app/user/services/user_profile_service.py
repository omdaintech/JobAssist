"""
User Profile Service - USER DOMAIN SERVICE LAYER
Handles user profile, preferences, and account management operations
Follows BE_ARCH_v2.md guidelines with proper service layer abstraction
"""

from typing import Dict, Any
import structlog
from app.user.models.user_repository import UserRepository

logger = structlog.get_logger()


class UserProfileService:
    """
    User Profile Service - Service Layer
    Orchestrates user profile and preferences business logic
    """

    def __init__(self):
        self.user_repo = UserRepository()

    def get_user_status(self, user_id: str) -> Dict[str, Any]:
        """Get user status and profile information"""
        try:
            result = self.user_repo.get_user_status_data(user_id)
            if result:
                return {
                    "success": True,
                    "user_info": result.get("user_info", {}),
                    "message": "User status retrieved successfully"
                }
            else:
                return {
                    "success": False,
                    "message": "User not found"
                }
        except Exception as e:
            logger.error("Failed to get user status", user_id=user_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to retrieve user status"
            }

    def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user learning preferences"""
        try:
            preferences = self.user_repo.get_user_preferences_data(user_id)
            return {
                "success": True,
                "preferences": preferences,
                "message": "Preferences retrieved successfully"
            }
        except Exception as e:
            logger.error("Failed to get user preferences", user_id=user_id, error=str(e))
            return {
                "success": False,
                "preferences": {},
                "message": "Failed to retrieve preferences"
            }

    def update_user_preferences(self, user_id: str, preferences_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user learning preferences"""
        try:
            result = self.user_repo.update_user_preferences(user_id, preferences_data)
            if result.get("success", False):
                # Get updated preferences
                updated_preferences = self.user_repo.get_user_preferences_data(user_id)
                return {
                    "success": True,
                    "preferences": updated_preferences,
                    "message": "Preferences updated successfully"
                }
            else:
                return {
                    "success": False,
                    "message": result.get("message", "Failed to update preferences")
                }
        except Exception as e:
            logger.error("Failed to update user preferences", user_id=user_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to update preferences"
            }

    def update_user_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile information"""
        try:
            result = self.user_repo.update_user_profile(user_id, profile_data)
            if result["success"]:
                # Get updated user status
                user_status_data = self.user_repo.get_user_status_data(user_id)
                return {
                    "success": True,
                    "user_info": user_status_data.get("user_info", {}),
                    "message": "Profile updated successfully"
                }
            else:
                return {
                    "success": False,
                    "message": result.get("message", "Failed to update profile")
                }
        except Exception as e:
            logger.error("Failed to update user profile", user_id=user_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to update profile"
            }

    def change_user_password(self, user_id: str, current_password: str, new_password: str) -> Dict[str, Any]:
        """Change user password with validation"""
        try:
            result = self.user_repo.change_user_password(user_id, current_password, new_password)
            return result
        except Exception as e:
            logger.error("Failed to change password", user_id=user_id, error=str(e))
            return {
                "success": False,
                "message": "Failed to change password"
            }

    def get_user_usage_history(self, user_id: str, limit: int = 10, offset: int = 0) -> Dict[str, Any]:
        """Get user usage history"""
        try:
            result = self.user_repo.get_user_usage_history(
                user_id=user_id,
                limit=limit,
                offset=offset  # Clean method accepts offset directly
            )
            return result
        except Exception as e:
            logger.error("Failed to get usage history", user_id=user_id, error=str(e))
            return {
                "success": False,
                "usage_history": [],
                "message": "Failed to retrieve usage history"
            }

    def get_usage_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get user usage statistics"""
        try:
            usage_stats = self.user_repo.get_usage_statistics(user_id)
            user_access = self.user_repo.get_user_access_limits(user_id)
            
            current_points = user_access.get("remaining_count", 0) if user_access else 0
            
            return {
                "success": True,
                "usage_stats": usage_stats,
                "current_points": current_points,
                "message": "Statistics retrieved successfully"
            }
        except Exception as e:
            logger.error("Failed to get usage statistics", user_id=user_id, error=str(e))
            return {
                "success": False,
                "usage_stats": None,
                "current_points": 0,
                "message": "Failed to retrieve statistics"
            }


def get_user_profile_service() -> UserProfileService:
    """Get UserProfileService instance"""
    return UserProfileService()
