"""
School User Management Router - SCHOOL DOMAIN
Handles school-scoped user management endpoints
All operations are automatically scoped to the school admin's school
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
import structlog
from typing import Dict, Any, Optional

# Import school models
from app.school.models.school_requests import (
    SchoolUserCreateRequest, SchoolUserUpdateRequest
)
from app.school.models.school_responses import (
    SchoolUserListResponse, SchoolUserCreateResponse, SchoolStandardResponse
)

# Import school services (will create next)
from app.school.services.school_user_service import (
    SchoolUserService, get_school_user_service
)

# Import shared school dependencies
from app.school.dependencies import get_school_admin_dependency

logger = structlog.get_logger()

# Create user management router
router = APIRouter(
    prefix="/users",
    tags=["Schools - User Management"],
    responses={404: {"description": "Not found"}},
)


# ===============================
# DEPENDENCY INJECTION
# ===============================

get_school_admin = get_school_admin_dependency


# ===============================
# USER MANAGEMENT ENDPOINTS
# ===============================

@router.get("", response_model=SchoolUserListResponse)
async def list_school_users(
    page: Optional[int] = Query(None, ge=1, description="Page number"),
    per_page: Optional[int] = Query(
        None, ge=1, le=100, description="Items per page"
    ),
    skip: Optional[int] = Query(
        None, ge=0, description="Number of items to skip (alternative to page)"
    ),
    limit: Optional[int] = Query(
        None, ge=1, le=100,
        description="Number of items to return (alternative to per_page)"
    ),
    search: Optional[str] = Query(
        None, description="Search term for user name or email"
    ),
    is_active: Optional[bool] = Query(
        None, description="Filter by user active status"
    ),
    email_verified: Optional[bool] = Query(
        None, description="Filter by email verification status"
    ),
    current_level: Optional[str] = Query(
        None, description="Filter by CEFR level (A1, A2, B1)"
    ),
    created_after: Optional[str] = Query(
        None, description="Filter users created after this date (ISO format)"
    ),
    created_before: Optional[str] = Query(
        None, description="Filter users created before this date (ISO format)"
    ),
    last_login_after: Optional[str] = Query(
        None, description="Filter users with last login after this date (ISO format)"
    ),
    last_login_before: Optional[str] = Query(
        None, description="Filter users with last login before this date (ISO format)"
    ),
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    user_service: SchoolUserService = Depends(get_school_user_service),
):
    """List users in school admin's school with pagination, search, and filtering"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping

        # Handle both pagination formats for backward compatibility
        if skip is not None and limit is not None:
            # Convert skip/limit to page/per_page
            final_page = (skip // limit) + 1 if limit > 0 else 1
            final_per_page = limit
        elif page is not None and per_page is not None:
            # Use page/per_page directly
            final_page = page
            final_per_page = per_page
        else:
            # Default values
            final_page = page or 1
            final_per_page = per_page or limit or 10
            
        logger.info(
            "School admin listing users with filters",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            page=final_page,
            per_page=final_per_page,
            skip=skip,
            limit=limit,
            search=search,
            is_active=is_active,
            email_verified=email_verified,
            current_level=current_level,
            created_after=created_after,
            created_before=created_before,
            last_login_after=last_login_after,
            last_login_before=last_login_before
        )

        result = user_service.list_users_in_school(
            school_id=school_id,
            page=final_page,
            per_page=final_per_page,
            search=search,
            is_active=is_active,
            email_verified=email_verified,
            current_level=current_level,
            created_after=created_after,
            created_before=created_before,
            last_login_after=last_login_after,
            last_login_before=last_login_before
        )

        if result["success"]:
            return SchoolUserListResponse(
                success=True,
                message=result["message"],
                users=result["data"]["users"],
                total_count=result["data"]["total_count"],
                pagination=result["data"]["pagination"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )

    except Exception as e:
        logger.error(
            "Failed to list school users",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )


@router.post("", response_model=SchoolUserCreateResponse)
async def create_user_in_school(
    user_data: SchoolUserCreateRequest,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    user_service: SchoolUserService = Depends(get_school_user_service),
):
    """Create a new user in school admin's school"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin creating user",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            user_email=user_data.email
        )

        # Convert Pydantic model to dict
        user_dict = user_data.model_dump()

        result = await user_service.create_user_in_school(
            school_id=school_id,
            user_data=user_dict,
            created_by=school_admin["school_admin_id"]
        )

        return SchoolUserCreateResponse(
            success=result["success"],
            message=result["message"],
            user_id=result.get("user_id"),
            data=result.get("data", {})
        )

    except Exception as e:
        logger.error(
            "Failed to create user in school",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )


@router.get("/{user_id}/details", response_model=SchoolStandardResponse)
async def get_comprehensive_user_details_in_school(
    user_id: str,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    user_service: SchoolUserService = Depends(get_school_user_service),
):
    """Get comprehensive user details within school scope (similar to admin details)"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        
        logger.info(
            "School admin getting comprehensive user details",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            user_id=user_id
        )

        result = user_service.get_comprehensive_user_details_in_school(
            school_id=school_id,
            user_id=user_id
        )

        if result["success"]:
            return SchoolStandardResponse(
                success=True,
                message=result["message"],
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get comprehensive user details",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            user_id=user_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve comprehensive user details"
        )


@router.get("/{user_id}", response_model=SchoolStandardResponse)
async def get_user_details_in_school(
    user_id: str,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    user_service: SchoolUserService = Depends(get_school_user_service),
):
    """Get detailed user information (school-scoped)"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin getting user details",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            user_id=user_id
        )

        result = user_service.get_user_details_in_school(
            school_id=school_id,
            user_id=user_id
        )

        if result["success"]:
            return SchoolStandardResponse(
                success=True,
                message=result["message"],
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get user details",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            user_id=user_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user details"
        )


@router.put("/{user_id}", response_model=SchoolStandardResponse)
async def update_user_in_school(
    user_id: str,
    user_data: SchoolUserUpdateRequest,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    user_service: SchoolUserService = Depends(get_school_user_service),
):
    """Update user in school admin's school"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin updating user",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            user_id=user_id
        )

        # Convert Pydantic model to dict, excluding None values
        user_dict = user_data.model_dump(exclude_none=True)

        result = user_service.update_user_in_school(
            school_id=school_id,
            user_id=user_id,
            user_data=user_dict,
            updated_by=school_admin["school_admin_id"]
        )

        return SchoolStandardResponse(
            success=result["success"],
            message=result["message"],
            data=result.get("data", {})
        )

    except Exception as e:
        logger.error(
            "Failed to update user in school",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            user_id=user_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )


@router.delete("/{user_id}", response_model=SchoolStandardResponse)
async def deactivate_user_in_school(
    user_id: str,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    user_service: SchoolUserService = Depends(get_school_user_service),
):
    """Deactivate user in school admin's school (soft delete)"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin deactivating user",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            user_id=user_id
        )

        result = user_service.deactivate_user_in_school(
            school_id=school_id,
            user_id=user_id,
            deactivated_by=school_admin["school_admin_id"]
        )

        return SchoolStandardResponse(
            success=result["success"],
            message=result["message"],
            data=result.get("data", {})
        )

    except Exception as e:
        logger.error(
            "Failed to deactivate user in school",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            user_id=user_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate user"
        )


@router.get("/{user_id}/activities", response_model=SchoolStandardResponse)
async def get_user_activities_in_school(
    user_id: str,
    page: Optional[int] = Query(1, ge=1, description="Page number"),
    per_page: Optional[int] = Query(50, ge=1, le=100, description="Items per page"),
    session_type: Optional[str] = Query(None, description="Filter by session type (exam, practice)"),
    activity_type: Optional[str] = Query(None, description="Filter by activity type"),
    level: Optional[str] = Query(None, description="Filter by CEFR level (A1, A2, B1)"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    user_service: SchoolUserService = Depends(get_school_user_service),
):
    """Get user activities (exams and practice sessions) with credit usage within school scope"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin getting user activities",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            user_id=user_id,
            page=page,
            per_page=per_page,
            session_type=session_type,
            level=level
        )

        result = user_service.get_user_activities_in_school(
            school_id=school_id,
            user_id=user_id,
            page=page,
            per_page=per_page,
            session_type=session_type,
            activity_type=activity_type,
            level=level,
            date_from=date_from,
            date_to=date_to
        )

        if result["success"]:
            return SchoolStandardResponse(
                success=True,
                message=result["message"],
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get user activities",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            user_id=user_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user activities"
        )


@router.get("/{user_id}/sessions", response_model=SchoolStandardResponse)
async def get_user_sessions_in_school(
    user_id: str,
    page: Optional[int] = Query(1, ge=1, description="Page number"),
    per_page: Optional[int] = Query(50, ge=1, le=100, description="Items per page"),
    session_type: Optional[str] = Query(None, description="Filter by session type (exam, practice)"),
    status: Optional[str] = Query(None, description="Filter by session status"),
    level: Optional[str] = Query(None, description="Filter by CEFR level (A1, A2, B1)"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    user_service: SchoolUserService = Depends(get_school_user_service),
):
    """Get user sessions with detailed metadata within school scope"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin getting user sessions",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            user_id=user_id,
            page=page,
            per_page=per_page,
            session_type=session_type,
            status=status,
            level=level
        )

        result = user_service.get_user_sessions_in_school(
            school_id=school_id,
            user_id=user_id,
            page=page,
            per_page=per_page,
            session_type=session_type,
            status=status,
            level=level,
            date_from=date_from,
            date_to=date_to
        )

        if result["success"]:
            return SchoolStandardResponse(
                success=True,
                message=result["message"],
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get user sessions",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            user_id=user_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user sessions"
        )


@router.get("/{user_id}/sessions/{session_id}", response_model=SchoolStandardResponse)
async def get_user_session_detail_in_school(
    user_id: str,
    session_id: str,
    school_admin: Dict[str, Any] = Depends(get_school_admin),
    user_service: SchoolUserService = Depends(get_school_user_service),
):
    """Get detailed session information within school scope"""
    try:
        school_id = school_admin["school_id"]  # Automatic school scoping
        logger.info(
            "School admin getting user session detail",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_id,
            user_id=user_id,
            session_id=session_id
        )

        result = user_service.get_user_session_detail_in_school(
            school_id=school_id,
            user_id=user_id,
            session_id=session_id
        )

        if result["success"]:
            return SchoolStandardResponse(
                success=True,
                message=result["message"],
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get user session detail",
            school_admin_id=school_admin["school_admin_id"],
            school_id=school_admin["school_id"],
            user_id=user_id,
            session_id=session_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user session detail"
        )

