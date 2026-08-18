"""Pydantic schemas for credit API responses."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field

from app.credit.models.domain import CEFRLevel


class CreditRule(BaseModel):
    """API representation of a credit rule."""

    session_type: str = Field(..., description="Type of session (practice/exam)")
    activity_type: str = Field(..., description="Activity type (reading/writing/etc)")
    points_cost: int = Field(..., description="Points required for this rule")
    level: CEFRLevel = Field(..., description="CEFR level for this rule")
    active: bool = Field(..., description="Whether the rule is active")
    description: str | None = Field(None, description="Human-readable description")

    class Config:
        use_enum_values = True


class CreditRulesResponse(BaseModel):
    """Response envelope for credit rule lookups."""

    success: bool = Field(..., description="Whether the lookup succeeded")
    level: CEFRLevel = Field(..., description="CEFR level for the rules")
    rules: List[CreditRule] = Field(..., description="List of active credit rules")
    message: str = Field(..., description="Status message")

    class Config:
        use_enum_values = True
