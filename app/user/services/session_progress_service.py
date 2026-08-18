"""
Session Progress Service
Centralized progress calculation logic
"""

import structlog
from typing import Dict, Any
from dataclasses import dataclass

logger = structlog.get_logger()


@dataclass
class ProgressData:
    """Simple progress data structure"""
    completed_questions: int
    total_questions: int
    remaining_questions: int
    activity_breakdown: Dict[str, int]


class SessionProgressService:
    """
    Simple service for consistent progress calculation
    Eliminates duplicate logic across endpoints
    """

    def calculate_progress(
        self, 
        template_data: Dict[str, Any], 
        session_progress: Dict[str, Any]
    ) -> ProgressData:
        """
        Calculate session progress from template and progress data
        
        Args:
            template_data: Session template data
            session_progress: Progress data from database
            
        Returns:
            ProgressData with calculated values
        """
        # Parse template data for question counts
        question_counts = self._parse_template_counts(template_data)
        total_questions = sum(question_counts.values())
        
        # Get completed questions from nested progress object
        # session_progress structure: {"success": True, "progress": {"answered_questions": X, ...}, ...}
        progress_obj = session_progress.get("progress", {})
        completed_questions = progress_obj.get("answered_questions", 0)
        remaining_questions = max(0, total_questions - completed_questions)
        
        # Get activity breakdown
        activity_breakdown = progress_obj.get(
                "activity_breakdown",
                {"reading": 0, "writing": 0, "grammar": 0, "hearing": 0, "speaking": 0},
            )
        
        return ProgressData(
            completed_questions=completed_questions,
            total_questions=total_questions,
            remaining_questions=remaining_questions,
            activity_breakdown=activity_breakdown
        )

    def _parse_template_counts(self, template_data: Dict[str, Any]) -> Dict[str, int]:
        """Parse template data for question counts"""
        if not template_data:
            return {}

        valid_activities = ["reading", "writing", "grammar", "hearing", "speaking"]
        question_counts = {}
        
        for activity, count in template_data.items():
            if activity in valid_activities:
                try:
                    numeric_count = (
                        int(count) 
                        if isinstance(count, (int, str)) and str(count).isdigit() 
                        else 0
                    )
                    if numeric_count > 0:
                        question_counts[activity] = numeric_count
                except (ValueError, TypeError):
                    continue
                    
        return question_counts


def get_session_progress_service() -> SessionProgressService:
    """Dependency injection helper"""
    return SessionProgressService()
