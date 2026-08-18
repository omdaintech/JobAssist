from fastapi import APIRouter, Depends, HTTPException, status, Query
from datetime import datetime
from typing import Optional

from app.dependencies import get_current_user, get_user_profile_service_dep
from app.user.models.request_models import (
    UserProfileUpdateRequest,
    LearningPreferencesRequest,
    PasswordChangeRequest,
)
from app.user.models.onboarding_models import (
    CompleteOnboardingRequest,
    CompleteOnboardingResponse,
)
from app.user.models.response_models import (
    UserProfileResponse,
    LearningPreferencesResponse,
    PasswordChangeResponse,
    PracticeLogResponse,
    UsageResponse,
)
from app.user.services.user_profile_service import UserProfileService

router = APIRouter(tags=["Users - Profile"])


@router.post("/me/complete-onboarding", response_model=CompleteOnboardingResponse)
async def complete_onboarding(
    request: CompleteOnboardingRequest,
    user: dict = Depends(get_current_user),
    profile_service: UserProfileService = Depends(get_user_profile_service_dep),
):
    """
    Complete user onboarding in a single atomic operation.
    Replaces separate profile + preferences updates.
    Sets is_onboarded=true and all onboarding fields in one transaction.
    """
    try:
        from app.config import settings

        # Build update payloads
        profile_data = {
            "current_level": request.current_level,
            "is_onboarded": True,
        }

        if request.target_level:
            profile_data["target_level"] = request.target_level

        # Update profile
        profile_result = profile_service.update_user_profile(
            user["user_id"], profile_data
        )

        if not profile_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=profile_result["message"],
            )

        # Build preferences payload
        preferences_data = {
            "preferred_language_id": request.preferred_language_id
            or settings.default_language_id,
            "practice_frequency_per_week": request.practice_frequency_per_week or 3,
            "daily_goal": request.practice_frequency_per_week or 3,
        }

        if request.onboarding_goal:
            preferences_data["onboarding_goal"] = request.onboarding_goal

        # Update preferences
        prefs_result = profile_service.update_user_preferences(
            user["user_id"], preferences_data
        )

        if not prefs_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=prefs_result["message"],
            )

        return CompleteOnboardingResponse(
            success=True,
            message="Onboarding completed successfully",
            user_info=profile_result["user_info"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete onboarding: {str(e)}",
        )


@router.get("/me/preferences", response_model=LearningPreferencesResponse)
async def get_learning_preferences(
    user: dict = Depends(get_current_user),
    profile_service: UserProfileService = Depends(get_user_profile_service_dep),
):
    """Get user learning preferences"""
    try:
        result = profile_service.get_user_preferences(user["user_id"])
        return LearningPreferencesResponse(success=result["success"], preferences=result["preferences"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve preferences",
        )


@router.put("/me/preferences", response_model=LearningPreferencesResponse)
async def update_learning_preferences(
    request: LearningPreferencesRequest,
    user: dict = Depends(get_current_user),
    profile_service: UserProfileService = Depends(get_user_profile_service_dep),
):
    """Update user learning preferences"""
    try:
        update_data = request.dict(exclude_unset=True)
        result = profile_service.update_user_preferences(user["user_id"], update_data)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=result["message"]
            )

        return LearningPreferencesResponse(success=result["success"], preferences=result["preferences"])
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update preferences",
        )


@router.put("/me/profile", response_model=UserProfileResponse)
async def update_user_profile(
    request: UserProfileUpdateRequest,
    user: dict = Depends(get_current_user),
    profile_service: UserProfileService = Depends(get_user_profile_service_dep),
):
    """Update user profile information"""
    try:
        update_data = request.dict(exclude_unset=True)
        result = profile_service.update_user_profile(user["user_id"], update_data)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=result["message"]
            )

        return UserProfileResponse(
            success=True, 
            user_info=result["user_info"]
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile",
        )


@router.put("/me/password", response_model=PasswordChangeResponse)
async def change_password(
    request: PasswordChangeRequest,
    user: dict = Depends(get_current_user),
    profile_service: UserProfileService = Depends(get_user_profile_service_dep),
):
    """Change user password"""
    try:
        result = profile_service.change_user_password(
            user["user_id"], request.current_password, request.new_password
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )

        return PasswordChangeResponse(
            success=True,
            message=result["message"]
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password",
        )


@router.get("/usage-history", response_model=PracticeLogResponse)
async def get_usage_history(
    user: dict = Depends(get_current_user),
    profile_service: UserProfileService = Depends(get_user_profile_service_dep),
    limit: Optional[int] = Query(50, ge=1, le=1000, description="Number of records to retrieve"),
    skip: Optional[int] = Query(0, ge=0, description="Number of records to skip"),
    session_type: Optional[str] = Query(None, description="Filter by session type (practice, exam)"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
):
    """Get user usage history with pagination and filtering"""
    try:
        result = profile_service.get_user_usage_history(
            user["user_id"], limit=limit or 50, offset=skip or 0
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve usage history"),
            )

        return PracticeLogResponse(
            success=True,
            practice_log=result.get("usage_history", []),
            status="success",
            message="Usage history retrieved successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage history",
        )


@router.get("/usage-statistics", response_model=UsageResponse)
async def get_usage_statistics(
    user: dict = Depends(get_current_user),
    profile_service: UserProfileService = Depends(get_user_profile_service_dep),
):
    """Get user usage statistics"""
    try:
        result = profile_service.get_usage_statistics(user["user_id"])
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve usage statistics"),
            )

        return UsageResponse(
            success=True,
            usage_info=result.get("usage_stats", {})
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage statistics",
        )