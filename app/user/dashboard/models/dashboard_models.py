"""
Dashboard Response Models - Isolated Analytics Models

Contains all dashboard-specific Pydantic models for API responses.
Completely separated from regular user business models.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class WeeklyScoreData(BaseModel):
    """Model for weekly score data with gap handling"""
    year_week: int = Field(..., description="Year-week identifier (YYYYWW)")
    week_start: str = Field(..., description="Week start date (ISO format)")
    year: int = Field(..., description="Year")
    week_number: int = Field(..., description="Week number")
    sessions_count: int = Field(..., description="Number of sessions in this week")
    avg_score: float = Field(..., description="Average score for the week")
    best_score: float = Field(..., description="Best score for the week")
    has_activity: bool = Field(..., description="Whether user was active this week")
    gap_filled: bool = Field(..., description="Whether this week's data is interpolated")


class ActivityData(BaseModel):
    """Model for daily/weekly activity data"""
    activity_date: str = Field(..., description="Activity date (ISO format)")
    sessions_done: int = Field(..., description="Total sessions completed")
    practice_sessions: int = Field(..., description="Practice sessions completed")
    exam_sessions: int = Field(..., description="Exam sessions completed")


class TrendAnalysis(BaseModel):
    """Model for trend analysis results"""
    trend_type: str = Field(..., description="Type of trend analysis")
    improvement_trend: str = Field(..., description="Overall improvement trend")
    average_improvement: float = Field(..., description="Average improvement percentage")
    total_weeks_analyzed: int = Field(..., description="Total weeks in analysis")
    weeks_with_activity: int = Field(..., description="Weeks with actual activity")


class LearningInsight(BaseModel):
    """Model for learning insights"""
    area: str = Field(..., description="Learning area (reading, writing, grammar, hearing)")
    score: float = Field(..., description="Average score in this area")
    attempts: int = Field(..., description="Number of attempts")


class PerformanceTrend(BaseModel):
    """Model for monthly performance trends"""
    month: str = Field(..., description="Month identifier (YYYY-MM)")
    sessions: int = Field(..., description="Number of sessions in month")
    avg_score: float = Field(..., description="Average score for month")
    best_score: float = Field(..., description="Best score for month")


class DashboardStatsResponse(BaseModel):
    """Dashboard statistics response - SIMPLIFIED to only what UI uses"""
    
    # Only return what the UI actually uses
    activity_performance: List[Dict[str, Any]] = Field(
        ..., description="Performance stats for all 4 activity types (reading, writing, grammar, hearing)"
    )
    
    # Metadata
    generated_at: str = Field(..., description="Timestamp when data was generated")
    cache_duration: int = Field(..., description="Cache duration in seconds")
    success: Optional[bool] = Field(None, description="Operation success flag")


class DashboardSummaryResponse(BaseModel):
    """Quick dashboard summary for overview widgets"""
    
    success: bool = Field(..., description="Operation success")
    total_sessions: int = Field(..., description="Total completed sessions")
    current_streak: int = Field(..., description="Current weekly streak")
    average_score: float = Field(..., description="Overall average score")
    favorite_level: str = Field(..., description="Most practiced level (A1/A2/B1)")


class DashboardErrorResponse(BaseModel):
    """Error response for dashboard operations"""
    
    success: bool = Field(False, description="Always false for errors")
    error_type: str = Field(..., description="Type of error")
    message: str = Field(..., description="Error message")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
