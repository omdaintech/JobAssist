"""
School Session Router - SCHOOL DOMAIN
Handles school-initiated session creation endpoints
All operations are automatically scoped to the school admin's school
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from typing import Dict, Any, Optional
import structlog

# Import school models
from app.school.models.school_requests import (
    SchoolSessionCreateRequest, 
    SchoolSessionAddUsersRequest
)
from app.school.models.school_responses import (
    SchoolSessionCreateResponse,
    SchoolSessionDetailResponse,
    SchoolSessionUsersResponse,
    SchoolSessionAvailableUsersResponse,
    SchoolSessionAddUsersResponse
)

# Import school services
from app.school.services.school_session_service import (
    SchoolSessionService, get_school_session_service
)

# Import shared school dependencies
from app.school.dependencies import get_school_admin_dependency

logger = structlog.get_logger()

# Create session management router
router = APIRouter(
    prefix="/sessions",
    tags=["Schools - Session Management"],
    responses={404: {"description": "Not found"}},
)


# ===============================
# DEPENDENCY INJECTION
# ===============================

get_school_admin = get_school_admin_dependency


# ===============================
# SESSION CREATION ENDPOINTS
# ===============================

@router.post("/create-for-users", response_model=SchoolSessionCreateResponse)
async def create_sessions_for_users(
    request: SchoolSessionCreateRequest,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    session_service: SchoolSessionService = Depends(get_school_session_service),
):
    """Create sessions for selected users in the school"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        school_admin_id = school_admin["school_admin_id"]
        admin_email = school_admin["email"]

        logger.info(
            "School admin creating sessions for users",
            school_admin_id=school_admin_id,
            school_id=school_id,
            template_id=request.template_id,
            user_count=len(request.user_ids),
            session_name=request.session_name
        )

        # Add admin context to metadata
        request_data = request.dict()
        if 'metadata' not in request_data:
            request_data['metadata'] = {}
        
        request_data['metadata'].update({
            'created_by_admin_id': school_admin_id,
            'created_by_admin_email': admin_email,
            'created_via': 'school_admin_interface'
        })

        # Validate request
        validation_result = session_service.validate_session_request(school_id, request_data)
        if not validation_result["success"]:
            logger.warning("Session creation request validation failed",
                          school_id=school_id,
                          error=validation_result["message"])
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=validation_result["message"]
            )

        # Create sessions
        result = session_service.create_sessions_for_users(school_id, request_data)

        if result["success"]:
            logger.info("School session creation completed successfully",
                       school_id=school_id,
                       successful=result["data"]["summary"]["successful"],
                       failed=result["data"]["summary"]["failed"])
            
            # Return success even if some sessions failed (partial success)
            return SchoolSessionCreateResponse(
                success=result["success"],
                message=result["message"],
                data=result["data"]
            )
        else:
            logger.error("School session creation failed completely",
                        school_id=school_id,
                        error=result["message"])
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "School session creation endpoint failed",
            school_admin_id=school_admin.get("school_admin_id"),
            school_id=school_admin.get("school_id"),
            error=str(e)
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create sessions due to internal error"
        )


# ===============================
# SESSION MANAGEMENT ENDPOINTS
# ===============================

@router.get("/{session_id}", response_model=SchoolSessionDetailResponse)
async def get_school_session_detail(
    session_id: str,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    session_service: SchoolSessionService = Depends(get_school_session_service),
):
    """Get details of a specific session created by this school"""
    try:
        school_id = school_admin["school_id"]
        
        logger.info(
            "School admin requesting session detail",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            session_id=session_id
        )

        # Get session detail with users
        result = session_service.get_session_detail(school_id, session_id)
        
        if result["success"]:
            return SchoolSessionDetailResponse(
                success=result["success"],
                message=result["message"],
                data=result["data"]
            )
        else:
            logger.warning("Session detail not found",
                          school_id=school_id,
                          session_id=session_id,
                          error=result["message"])
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Session detail endpoint failed",
            school_admin_id=school_admin.get("school_admin_id"),
            school_id=school_admin.get("school_id"),
            session_id=session_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get session detail due to internal error"
        )


@router.get("/{session_id}/users", response_model=SchoolSessionUsersResponse)
async def get_school_session_users(
    session_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by user status"),
    search: Optional[str] = Query(None, description="Search by user name or email"),
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    session_service: SchoolSessionService = Depends(get_school_session_service),
):
    """Get users in a specific session with pagination"""
    try:
        school_id = school_admin["school_id"]
        
        logger.info(
            "School admin requesting session users",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            session_id=session_id,
            page=page,
            per_page=per_page
        )

        # Get session users with pagination
        result = session_service.get_session_users(
            school_id, session_id, page, per_page, status, search
        )
        
        if result["success"]:
            return SchoolSessionUsersResponse(
                success=result["success"],
                message=result["message"],
                data=result["data"]
            )
        else:
            logger.warning("Session users not found",
                          school_id=school_id,
                          session_id=session_id,
                          error=result["message"])
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Session users endpoint failed",
            school_admin_id=school_admin.get("school_admin_id"),
            school_id=school_admin.get("school_id"),
            session_id=session_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get session users due to internal error"
        )


@router.get("/{session_id}/available-users", response_model=SchoolSessionAvailableUsersResponse)
async def get_school_session_available_users(
    session_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by user name or email"),
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    session_service: SchoolSessionService = Depends(get_school_session_service),
):
    """Get users available to be added to this session"""
    try:
        school_id = school_admin["school_id"]
        
        logger.info(
            "School admin requesting available users for session",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            session_id=session_id,
            page=page,
            per_page=per_page
        )

        # Get available users for session
        result = session_service.get_available_users_for_session(
            school_id, session_id, page, per_page, search
        )
        
        if result["success"]:
            return SchoolSessionAvailableUsersResponse(
                success=result["success"],
                message=result["message"],
                data=result["data"]
            )
        else:
            logger.warning("Available users not found",
                          school_id=school_id,
                          session_id=session_id,
                          error=result["message"])
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Available users endpoint failed",
            school_admin_id=school_admin.get("school_admin_id"),
            school_id=school_admin.get("school_id"),
            session_id=session_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get available users due to internal error"
        )


@router.post("/{session_id}/users", response_model=SchoolSessionAddUsersResponse)
async def add_users_to_school_session(
    session_id: str,
    request: SchoolSessionAddUsersRequest,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    session_service: SchoolSessionService = Depends(get_school_session_service),
):
    """Add users to an existing session"""
    try:
        school_id = school_admin["school_id"]
        school_admin_id = school_admin["school_admin_id"]
        
        logger.info(
            "School admin adding users to session",
            school_admin_id=school_admin_id,
            school_id=school_id,
            session_id=session_id,
            user_count=len(request.user_ids)
        )

        # Add users to session
        result = session_service.add_users_to_session(
            school_id, session_id, request.user_ids, school_admin_id
        )
        
        if result["success"]:
            logger.info("Users added to session successfully",
                       school_id=school_id,
                       session_id=session_id,
                       added=result["data"]["summary"]["added"],
                       failed=result["data"]["summary"]["failed"])
            
            return SchoolSessionAddUsersResponse(
                success=result["success"],
                message=result["message"],
                data=result["data"]
            )
        else:
            logger.warning("Failed to add users to session",
                          school_id=school_id,
                          session_id=session_id,
                          error=result["message"])
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Add users to session endpoint failed",
            school_admin_id=school_admin.get("school_admin_id"),
            school_id=school_admin.get("school_id"),
            session_id=session_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add users to session due to internal error"
        )


# ===============================
# FUTURE SESSION ENDPOINTS
# ===============================

# These endpoints can be implemented in future phases

# @router.get("", response_model=SchoolSessionListResponse)
# async def list_school_sessions(
#     page: int = Query(1, ge=1, description="Page number"),
#     per_page: int = Query(20, ge=1, le=100, description="Items per page"),
#     status: Optional[str] = Query(None, description="Filter by status"),
#     template_id: Optional[str] = Query(None, description="Filter by template"),
#     school_admin: Dict[str, Any] = Depends(get_school_admin),
#     session_service: SchoolSessionService = Depends(get_school_session_service),
# ):
#     """List sessions created by this school"""
#     pass

# @router.get("/{session_id}", response_model=SchoolSessionDetailResponse)
# async def get_school_session_detail(
#     session_id: str,
#     school_admin: Dict[str, Any] = Depends(get_school_admin),
#     session_service: SchoolSessionService = Depends(get_school_session_service),
# ):
#     """Get details of a specific session created by this school"""
#     pass

# @router.delete("/{session_id}", response_model=SchoolStandardResponse)
# async def cancel_school_session(
#     session_id: str,
#     school_admin: Dict[str, Any] = Depends(get_school_admin),
#     session_service: SchoolSessionService = Depends(get_school_session_service),
# ):
#     """Cancel a session (only if not started by user)"""
#     pass

# @router.get("/analytics", response_model=SchoolSessionAnalyticsResponse)
# async def get_school_session_analytics(
#     days: int = Query(30, ge=1, le=365, description="Days to analyze"),
#     school_admin: Dict[str, Any] = Depends(get_school_admin),
#     session_service: SchoolSessionService = Depends(get_school_session_service),
# ):
#     """Get session completion analytics for school-created sessions"""
#     pass
