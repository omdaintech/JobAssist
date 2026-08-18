"""
Onboarding-specific request/response models
Simplifies onboarding completion to a single endpoint
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal


class CompleteOnboardingRequest(BaseModel):
    """Single request to complete onboarding flow"""

    current_level: Literal["A0", "A1", "A2", "B1", "B2", "C1", "C2"] = Field(
        ..., description="User's self-reported current CEFR level"
    )
    target_level: Optional[Literal["A1", "A2", "B1", "B2", "C1", "C2"]] = Field(
        None, description="User's target CEFR level (optional, must be A1 or higher)"
    )
    onboarding_goal: Optional[
        Literal["exam_prep", "level_check", "skill_improvement"]
    ] = Field(None, description="Primary learning goal")
    practice_frequency_per_week: Optional[int] = Field(
        3, ge=1, le=14, description="Desired weekly practice sessions"
    )
    preferred_language_id: Optional[str] = Field(
        None, description="Assessment language ID (defaults to German)"
    )

    @field_validator("preferred_language_id")
    @classmethod
    def validate_language_id(cls, v):
        """Validate language exists and is active"""
        if v:
            from app.dependencies import get_core_repository

            try:
                core_repo = get_core_repository()
                language = core_repo.get_language_by_id(v)

                if not language:
                    raise ValueError(f"Language with ID '{v}' not found")

                if not language.get("is_active", False):
                    raise ValueError(
                        f"Language '{language.get('name', 'Unknown')}' is not currently active"
                    )

                return v
            except Exception as e:
                raise ValueError(f"Language validation failed: {str(e)}")
        return v


class CompleteOnboardingResponse(BaseModel):
    """Response after completing onboarding"""

    success: bool
    message: str
    user_info: Optional[dict] = None
