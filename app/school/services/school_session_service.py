"""
School Session Service - SCHOOL DOMAIN SERVICE LAYER
Orchestrates school-initiated session creation business logic
Follows BE_ARCH_v2.md guidelines with strict domain boundaries
"""

from typing import Dict, Any, List, Optional
import structlog
from datetime import datetime

# Import SchoolRepository following BE_ARCH.md guidelines
from app.school.models.school_repository import SchoolRepository

logger = structlog.get_logger()


class SchoolSessionService:
    """
    School Session Service - Service Layer
    Orchestrates school-initiated session creation business logic
    """

    def __init__(self):
        self.school_repo = SchoolRepository()
        # NO CoreRepository - violates domain boundaries!

    def create_sessions_for_users(self, school_id: str, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Business logic for creating sessions for multiple users
        
        Args:
            school_id: School ID from JWT token
            request_data: Session creation request data
            
        Returns:
            Dict with creation results and summary
        """
        try:
            # Extract request data
            template_id = request_data['template_id']
            session_name = request_data['session_name']
            user_ids = request_data['user_ids']
            language_id = request_data['language_id']
            level = request_data['level']
            session_type = request_data['session_type']
            metadata = request_data.get('metadata', {})

            logger.info("Starting school session creation",
                       school_id=school_id,
                       template_id=template_id,
                       user_count=len(user_ids))

            # Step 1: Validate template belongs to school
            template_validation = self.school_repo.validate_template_in_school(school_id, template_id)
            if not template_validation["success"]:
                return {
                    "success": False,
                    "message": template_validation["message"],
                    "data": {
                        "created_sessions": [],
                        "failed_sessions": [],
                        "summary": {
                            "total_requested": len(user_ids),
                            "successful": 0,
                            "failed": len(user_ids)
                        }
                    }
                }

            template_info = template_validation["template"]

            # Step 2: Validate all users belong to school
            user_validation = self.school_repo.validate_users_in_school(school_id, user_ids)
            if not user_validation["success"]:
                return {
                    "success": False,
                    "message": user_validation["message"],
                    "data": {
                        "created_sessions": [],
                        "failed_sessions": [],
                        "summary": {
                            "total_requested": len(user_ids),
                            "successful": 0,
                            "failed": len(user_ids)
                        }
                    }
                }

            valid_users = user_validation["valid_users"]
            invalid_user_ids = user_validation["invalid_user_ids"]

            # Step 3: Prepare session data template
            session_data_template = {
                'school_id': school_id,
                'exam_name': session_name,
                'level': level,
                'language_id': language_id,
                'template_id': template_id,
                'template_data': template_info['template_data'],
                'session_type': session_type,
                'metadata': {
                    **metadata,
                    'created_by_school': True,
                    'school_session_name': session_name,
                    'template_name': template_info['template_name'],
                    'batch_id': f"batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                    'created_at': datetime.utcnow().isoformat()
                }
            }

            # Step 4: Create sessions for valid users
            created_sessions = []
            failed_sessions = []

            # Handle invalid users first
            for user_id in invalid_user_ids:
                failed_sessions.append({
                    "user_id": user_id,
                    "user_name": None,
                    "user_email": None,
                    "error": "User not found or not active in this school"
                })

            # Create sessions for valid users
            for user_id, user_info in valid_users.items():
                try:
                    # Add user-specific metadata
                    user_session_data = {
                        **session_data_template,
                        'metadata': {
                            **session_data_template['metadata'],
                            'target_user_name': user_info['name'],
                            'target_user_email': user_info['email']
                        }
                    }

                    # Create session via repository
                    creation_result = self.school_repo.create_session_for_user(user_id, user_session_data)
                    
                    if creation_result["success"]:
                        created_sessions.append({
                            "session_id": creation_result["exam_id"],
                            "user_id": user_id,
                            "user_name": user_info['name'],
                            "user_email": user_info['email'],
                            "status": "created"
                        })
                        logger.info("Session created successfully",
                                   session_id=creation_result["exam_id"],
                                   user_id=user_id,
                                   school_id=school_id)
                    else:
                        failed_sessions.append({
                            "user_id": user_id,
                            "user_name": user_info['name'],
                            "user_email": user_info['email'],
                            "error": creation_result.get("message", "Failed to create session")
                        })

                except Exception as e:
                    logger.error("Failed to create session for user",
                               user_id=user_id,
                               school_id=school_id,
                               error=str(e))
                    failed_sessions.append({
                        "user_id": user_id,
                        "user_name": user_info.get('name'),
                        "user_email": user_info.get('email'),
                        "error": f"Session creation failed: {str(e)}"
                    })

            # Step 5: Log the operation for audit trail
            audit_data = {
                'session_count': len(created_sessions),
                'template_id': template_id,
                'created_by_admin_id': metadata.get('created_by_admin_id'),
                'batch_id': session_data_template['metadata']['batch_id']
            }
            self.school_repo.log_school_session_creation(school_id, audit_data)

            # Step 6: Prepare response
            total_requested = len(user_ids)
            successful = len(created_sessions)
            failed = len(failed_sessions)

            overall_success = successful > 0  # Success if at least one session created

            response_message = self._build_response_message(successful, failed, total_requested)

            return {
                "success": overall_success,
                "message": response_message,
                "data": {
                    "created_sessions": created_sessions,
                    "failed_sessions": failed_sessions,
                    "summary": {
                        "total_requested": total_requested,
                        "successful": successful,
                        "failed": failed
                    }
                }
            }

        except Exception as e:
            logger.error("School session creation failed",
                        school_id=school_id,
                        error=str(e))
            return {
                "success": False,
                "message": "Session creation failed due to internal error",
                "data": {
                    "created_sessions": [],
                    "failed_sessions": [],
                    "summary": {
                        "total_requested": len(request_data.get('user_ids', [])),
                        "successful": 0,
                        "failed": len(request_data.get('user_ids', []))
                    }
                }
            }

    def _build_response_message(self, successful: int, failed: int, total: int) -> str:
        """Build appropriate response message based on results"""
        if successful == total:
            return f"All {successful} sessions created successfully"
        elif successful == 0:
            return f"Failed to create any sessions. {failed} failures."
        else:
            return f"Partially successful: {successful} sessions created, {failed} failed"

    def validate_session_request(self, school_id: str, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate session creation request data
        This could be extended for more complex validation logic
        """
        try:
            # Basic validation - could be extended
            required_fields = ['template_id', 'session_name', 'user_ids', 'language_id', 'level', 'session_type']
            
            for field in required_fields:
                if field not in request_data or not request_data[field]:
                    return {
                        "success": False,
                        "message": f"Missing required field: {field}"
                    }

            # Validate user count
            user_ids = request_data['user_ids']
            if len(user_ids) > 50:
                return {
                    "success": False,
                    "message": "Maximum 50 users allowed per session creation request"
                }

            return {"success": True, "message": "Request validation passed"}

        except Exception as e:
            logger.error("Request validation failed", error=str(e))
            return {"success": False, "message": "Request validation failed"}

    def get_session_detail(self, school_id: str, session_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a session and its users
        
        Args:
            school_id: School ID from JWT token
            session_id: Session ID to get details for
            
        Returns:
            Dict with session detail and users
        """
        try:
            logger.info("Getting session detail",
                       school_id=school_id,
                       session_id=session_id)

            # Get session detail from repository
            session_data = self.school_repo.get_session_detail(school_id, session_id)
            
            if not session_data:
                return {
                    "success": False,
                    "message": "Session not found or does not belong to this school"
                }

            return {
                "success": True,
                "message": "Session detail retrieved successfully",
                "data": session_data
            }

        except Exception as e:
            logger.error("Failed to get session detail",
                        school_id=school_id,
                        session_id=session_id,
                        error=str(e))
            return {
                "success": False,
                "message": "Failed to get session detail"
            }

    def get_session_users(self, school_id: str, session_id: str, page: int, per_page: int, 
                         status_filter: Optional[str] = None, search: Optional[str] = None) -> Dict[str, Any]:
        """
        Get users in a session with pagination and filtering
        
        Args:
            school_id: School ID from JWT token
            session_id: Session ID 
            page: Page number
            per_page: Items per page
            status_filter: Filter by user status
            search: Search term for user name/email
            
        Returns:
            Dict with session users and pagination
        """
        try:
            logger.info("Getting session users",
                       school_id=school_id,
                       session_id=session_id,
                       page=page,
                       per_page=per_page)

            # Get session users from repository
            users_data = self.school_repo.get_session_users(
                school_id, session_id, page, per_page, status_filter, search
            )
            
            if not users_data:
                return {
                    "success": False,
                    "message": "Session not found or does not belong to this school"
                }

            return {
                "success": True,
                "message": "Session users retrieved successfully",
                "data": users_data
            }

        except Exception as e:
            logger.error("Failed to get session users",
                        school_id=school_id,
                        session_id=session_id,
                        error=str(e))
            return {
                "success": False,
                "message": "Failed to get session users"
            }

    def get_available_users_for_session(self, school_id: str, session_id: str, 
                                      page: int, per_page: int, search: Optional[str] = None) -> Dict[str, Any]:
        """
        Get users that can be added to a session
        
        Args:
            school_id: School ID from JWT token
            session_id: Session ID 
            page: Page number
            per_page: Items per page
            search: Search term for user name/email
            
        Returns:
            Dict with available users and pagination
        """
        try:
            logger.info("Getting available users for session",
                       school_id=school_id,
                       session_id=session_id,
                       page=page,
                       per_page=per_page)

            # Get available users from repository
            users_data = self.school_repo.get_available_users_for_session(
                school_id, session_id, page, per_page, search
            )
            
            return {
                "success": True,
                "message": "Available users retrieved successfully",
                "data": users_data
            }

        except Exception as e:
            logger.error("Failed to get available users",
                        school_id=school_id,
                        session_id=session_id,
                        error=str(e))
            return {
                "success": False,
                "message": "Failed to get available users"
            }

    def add_users_to_session(self, school_id: str, session_id: str, 
                           user_ids: List[str], admin_id: str) -> Dict[str, Any]:
        """
        Add users to an existing session
        
        Args:
            school_id: School ID from JWT token
            session_id: Session ID 
            user_ids: List of user IDs to add
            admin_id: School admin ID for metadata
            
        Returns:
            Dict with addition results
        """
        try:
            logger.info("Adding users to session",
                       school_id=school_id,
                       session_id=session_id,
                       user_count=len(user_ids),
                       admin_id=admin_id)

            # Validate session exists and belongs to school
            session_exists = self.school_repo.validate_session_ownership(school_id, session_id)
            if not session_exists:
                return {
                    "success": False,
                    "message": "Session not found or does not belong to this school"
                }

            # Add users to session
            result = self.school_repo.add_users_to_session(
                school_id, session_id, user_ids, admin_id
            )
            
            return {
                "success": True,
                "message": f"Successfully processed {len(user_ids)} user additions",
                "data": result
            }

        except Exception as e:
            logger.error("Failed to add users to session",
                        school_id=school_id,
                        session_id=session_id,
                        error=str(e))
            return {
                "success": False,
                "message": "Failed to add users to session"
            }


# Factory function
def get_school_session_service() -> SchoolSessionService:
    """Get SchoolSessionService instance"""
    return SchoolSessionService()
