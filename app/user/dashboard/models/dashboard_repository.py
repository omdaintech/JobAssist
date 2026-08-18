"""
Dashboard Repository - Isolated Analytics Data Layer

This repository handles ALL dashboard-related database operations.
It's completely separated from regular user business logic.

Key Features:
- Read-only operations (analytics only)
- Optimized queries for dashboard performance  
- Independent caching layer
- Comprehensive error handling
- Gap filling for time series data
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, date
import structlog
from sqlalchemy import text

# Import shared base service and config
from app.config import settings
from app.common.models.mysql_odm_service import BaseMySQLODMService, require_mysql_connection

logger = structlog.get_logger()


class DashboardRepository(BaseMySQLODMService):
    """
    Dashboard Repository - Analytics & Reporting Data Layer
    
    Handles all dashboard analytics queries in complete isolation
    from regular user business operations.
    """

    # =================
    # CORE ANALYTICS QUERIES
    # =================
    
    @require_mysql_connection
    def get_comprehensive_dashboard_data(self, user_id: str, include_benchmarks: bool = True, days: int = 30, language_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get all dashboard analytics - SIMPLIFIED for current UI needs
        
        Args:
            user_id: User identifier
            include_benchmarks: Whether to include platform benchmarks for comparison (unused, kept for compatibility)
            days: Time period in days (default 30)
            language_id: Optional language filter
            
        Returns:
            Dashboard data with only what the UI actually uses
        """
        try:
            # ONLY fetch what the UI actually uses
            activity_performance = self.get_activity_type_performance(user_id, days=days, language_id=language_id)
                
            return {
                "activity_performance": activity_performance,
                "generated_at": datetime.utcnow().isoformat(),
                "cache_duration": settings.dashboard_cache_ttl
            }
                
        except Exception as e:
            logger.error("Failed to get comprehensive dashboard data", user_id=user_id, error=str(e))
            return self._get_empty_dashboard_data()

    # REMOVED: get_daily_weekly_activity - not used in simplified dashboard

    @require_mysql_connection
    def get_practice_exam_split(self, user_id: str, days: int = 30, language_id: Optional[str] = None) -> Dict[str, Any]:
        """Get practice vs exam split for pie chart"""
        try:
            with self.mysql_service.get_db() as session:
                query = text("""
                    SELECT 
                        session_type, 
                        COUNT(*) AS count
                    FROM exam_detail
                    WHERE user_id = :user_id
                      AND status = 'analyzed'
                      AND completed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
                      AND (:language_id IS NULL OR language_id = :language_id)
                    GROUP BY session_type
                """)
                
                result = session.execute(query, {"user_id": user_id, "days": days, "language_id": language_id})
                session_data = dict(result.fetchall())
                
                practice_count = session_data.get('practice', 0)
                exam_count = session_data.get('exam', 0)
                total = practice_count + exam_count
                
                return {
                    "practice": practice_count,
                    "exam": exam_count,
                    "total_sessions": total,
                    "practice_percentage": round((practice_count / max(total, 1)) * 100, 1),
                    "exam_percentage": round((exam_count / max(total, 1)) * 100, 1),
                    "chart_type": "pie_chart"
                }
            
        except Exception as e:
            logger.error("Failed to get session split", user_id=user_id, error=str(e))
            return {"practice": 0, "exam": 0, "total_sessions": 0, "practice_percentage": 0, "exam_percentage": 0, "chart_type": "pie_chart"}

    @require_mysql_connection
    def get_favorite_activity_types(self, user_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get top activity types ordered by frequency
        Limited to top 3 for donut chart display
        """
        try:
            with self.mysql_service.get_db() as session:
                query = text("""
                    SELECT 
                        el.activity_type, 
                        COUNT(*) AS attempts,
                        AVG(CASE 
                            WHEN JSON_VALID(el.feedback_data) 
                            AND JSON_EXTRACT(el.feedback_data, '$.feedback.score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(el.feedback_data, '$.feedback.score') AS UNSIGNED)
                            ELSE 0
                        END) as avg_score,
                        -- Calculate percentage using window function
                        ROUND((COUNT(*) * 100.0) / SUM(COUNT(*)) OVER (), 1) as percentage,
                        -- Rank for easy top-3 selection
                        RANK() OVER (ORDER BY COUNT(*) DESC) as activity_rank
                    FROM exam_log el
                    JOIN exam_detail ed ON el.exam_detail_id = ed.id
                    WHERE el.user_id = :user_id
                      AND ed.status = 'analyzed'
                      AND ed.completed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
                    GROUP BY el.activity_type
                    ORDER BY attempts DESC
                    LIMIT 3
                """)
                
                result = session.execute(query, {"user_id": user_id, "days": days})
                activities = []
                
                for row in result:
                    # Determine performance badge
                    score = row.avg_score or 0
                    if score >= 70:
                        badge = "excellent"
                    elif score >= 50:
                        badge = "good"
                    elif score >= 30:
                        badge = "fair"
                    else:
                        badge = "needs_work"
                    
                    activities.append({
                        "activity_type": row.activity_type,
                        "attempts": row.attempts,
                        "avg_score": round(score, 1),
                        "percentage": float(row.percentage) if row.percentage else 0.0,
                        "rank": row.activity_rank,
                        "badge": badge
                    })
                    
                return activities
            
        except Exception as e:
            logger.error("Failed to get favorite activities", user_id=user_id, error=str(e))
            return []

    @require_mysql_connection
    def get_progress_by_cefr_level(self, user_id: str, days: int = 30, language_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get progress by CEFR level for level distribution chart - OPTIMIZED with window function"""
        try:
            with self.mysql_service.get_db() as session:
                query = text("""
                    SELECT 
                        level, 
                        COUNT(*) AS sessions_done,
                        AVG(CASE 
                            WHEN JSON_VALID(exam_summary) 
                            AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                            ELSE 0
                        END) as avg_score,
                        -- Calculate percentage using window function
                        ROUND((COUNT(*) * 100.0) / SUM(COUNT(*)) OVER (), 1) as percentage
                    FROM exam_detail
                    WHERE user_id = :user_id
                      AND status = 'analyzed'
                      AND completed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
                      AND (:language_id IS NULL OR language_id = :language_id)
                    GROUP BY level
                    ORDER BY FIELD(level,'A0','A1','A2','B1','B2','C1','C2')
                """)
                
                result = session.execute(query, {"user_id": user_id, "days": days, "language_id": language_id})
                levels = []
                
                for row in result:
                    levels.append({
                        "level": row.level,
                        "sessions_done": row.sessions_done,
                        "avg_score": round(row.avg_score or 0, 1),
                        "percentage": float(row.percentage) if row.percentage else 0.0
                    })
                    
                return levels
            
        except Exception as e:
            logger.error("Failed to get level progress", user_id=user_id, error=str(e))
            return []

    @require_mysql_connection
    def get_activity_type_performance(self, user_id: str, days: int = 30, language_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get performance stats per activity type (reading, writing, grammar, hearing)
        
        Returns stats for all 4 activities, with empty state support for activities without data.
        Used for the "Practice by Skill" section in the dashboard.
        
        Args:
            user_id: User identifier
            days: Time period in days (default 30)
            language_id: Optional language filter
            
        Returns:
            List of activity performance data with all 4 activities guaranteed
        """
        try:
            with self.mysql_service.get_db() as session:
                query = text("""
                    SELECT 
                        el.activity_type,
                        COUNT(*) as sessions_done,
                        SUM(CASE WHEN ed.session_type = 'practice' THEN 1 ELSE 0 END) as practice_sessions,
                        SUM(CASE WHEN ed.session_type = 'exam' THEN 1 ELSE 0 END) as exam_sessions,
                        AVG(CASE 
                            WHEN JSON_VALID(el.feedback_data) 
                            AND JSON_EXTRACT(el.feedback_data, '$.feedback.score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(el.feedback_data, '$.feedback.score') AS DECIMAL(5,2)) * 10
                            ELSE 0
                        END) as avg_score,
                        MAX(CASE 
                            WHEN JSON_VALID(el.feedback_data) 
                            AND JSON_EXTRACT(el.feedback_data, '$.feedback.score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(el.feedback_data, '$.feedback.score') AS DECIMAL(5,2)) * 10
                            ELSE 0
                        END) as best_score
                    FROM exam_log el
                    JOIN exam_detail ed ON el.exam_detail_id = ed.id
                    WHERE ed.user_id = :user_id
                      AND ed.status = 'analyzed'
                      AND ed.completed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
                      AND (:language_id IS NULL OR ed.language_id = :language_id)
                    GROUP BY el.activity_type
                    ORDER BY el.activity_type
                """)
                
                result = session.execute(query, {
                    "user_id": user_id,
                    "days": days,
                    "language_id": language_id
                })
                
                # Build activity map from results
                activity_map = {}
                for row in result:
                    activity_map[row.activity_type] = {
                        "activity_type": row.activity_type,
                        "sessions_done": row.sessions_done,
                        "practice_sessions": row.practice_sessions,
                        "exam_sessions": row.exam_sessions,
                        "avg_score": round(row.avg_score or 0, 1),
                        "best_score": round(row.best_score or 0, 1),
                        "has_activity": True
                    }
                
                # Ensure all activities are present (with empty states)
                all_activities = ["reading", "writing", "grammar", "hearing", "speaking"]
                result_list = []
                
                for activity in all_activities:
                    if activity in activity_map:
                        result_list.append(activity_map[activity])
                    else:
                        # Empty state for activity with no data
                        result_list.append({
                            "activity_type": activity,
                            "sessions_done": 0,
                            "practice_sessions": 0,
                            "exam_sessions": 0,
                            "avg_score": 0,
                            "best_score": 0,
                            "has_activity": False
                        })
                
                return result_list
            
        except Exception as e:
            logger.error("Failed to get activity type performance", user_id=user_id, error=str(e))
            # Return empty states for all activities on error
            return [
                {
                    "activity_type": activity,
                    "sessions_done": 0,
                    "practice_sessions": 0,
                    "exam_sessions": 0,
                    "avg_score": 0,
                    "best_score": 0,
                    "has_activity": False
                }
                for activity in ["reading", "writing", "grammar", "hearing", "speaking"]
            ]

    @require_mysql_connection
    def get_exam_readiness(self, user_id: str, language_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get exam readiness status for current and next CEFR level
        
        Returns exam count and average score based on exam_detail (complete exam sessions).
        No activity breakdown - just overall exam performance.
        
        Args:
            user_id: User identifier
            language_id: Optional language filter
            
        Returns:
            Dict with current_level and next_level data
        """
        try:
            with self.mysql_service.get_db() as session:
                # Get user's current level
                user_query = text("""
                    SELECT current_level, preferred_language_id
                    FROM users
                    WHERE id = :user_id
                """)
                
                result = session.execute(user_query, {"user_id": user_id})
                user_data = result.fetchone()
                
                if not user_data:
                    logger.error("User not found in exam readiness", user_id=user_id)
                    return {"error": "User not found"}
                
                current_level = user_data.current_level or "A1"
                
                # Get current level exam performance from exam_detail (source of truth)
                current_level_query = text("""
                    SELECT 
                        COUNT(*) as total_exams,
                        AVG(CASE 
                            WHEN JSON_VALID(exam_summary) 
                            AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                            ELSE 0
                        END) as avg_score,
                        MAX(completed_at) as last_exam_date
                    FROM exam_detail
                    WHERE user_id = :user_id
                      AND level = :current_level
                      AND session_type = 'exam'
                      AND status = 'analyzed'
                      AND (:language_id IS NULL OR language_id = :language_id)
                """)
                
                current_result = session.execute(current_level_query, {
                    "user_id": user_id,
                    "current_level": current_level,
                    "language_id": language_id
                })
                
                current_data = current_result.fetchone()
                total_exams = current_data.total_exams if current_data else 0
                avg_score = round(current_data.avg_score or 0, 1) if current_data else 0
                last_exam_date = current_data.last_exam_date if current_data else None
                
                # Determine next level
                level_order = ["A1", "A2", "B1", "B2", "C1", "C2"]
                try:
                    current_idx = level_order.index(current_level)
                except ValueError:
                    current_idx = 0
                
                next_level = level_order[current_idx + 1] if current_idx < len(level_order) - 1 else None
                
                # Build response
                response = {
                    "current_level": {
                        "level": current_level,
                        "display_name": self._get_level_display_name(current_level),
                        "total_exams": total_exams,
                        "avg_score": avg_score,
                        "last_exam_date": last_exam_date.isoformat() if last_exam_date else None
                    }
                }
                
                if next_level:
                    # Get next level exam performance
                    next_level_query = text("""
                        SELECT 
                            COUNT(*) as total_exams,
                            AVG(CASE 
                                WHEN JSON_VALID(exam_summary) 
                                AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                                THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                                ELSE 0
                            END) as avg_score,
                            MAX(completed_at) as last_exam_date
                        FROM exam_detail
                        WHERE user_id = :user_id
                          AND level = :next_level
                          AND session_type = 'exam'
                          AND status = 'analyzed'
                          AND (:language_id IS NULL OR language_id = :language_id)
                    """)
                    
                    next_result = session.execute(next_level_query, {
                        "user_id": user_id,
                        "next_level": next_level,
                        "language_id": language_id
                    })
                    
                    next_data = next_result.fetchone()
                    
                    # Build next level data structure
                    next_level_response: Dict[str, Any] = {
                        "level": next_level,
                        "display_name": self._get_level_display_name(next_level),
                        "message": self._get_next_level_message(avg_score, total_exams, next_level)
                    }
                    
                    # If user has taken exams for next level, include performance stats
                    if next_data and next_data.total_exams > 0:
                        next_level_response["total_exams"] = next_data.total_exams
                        next_level_response["avg_score"] = round(next_data.avg_score or 0, 1)
                        next_level_response["last_exam_date"] = next_data.last_exam_date.isoformat() if next_data.last_exam_date else None
                    
                    response["next_level"] = next_level_response
                else:
                    response["next_level"] = {}
                
                return response
            
        except Exception as e:
            logger.error("Failed to get exam readiness", user_id=user_id, error=str(e))
            return {
                "error": str(e),
                "current_level": {
                    "level": "A1",
                    "display_name": "Beginner",
                    "total_exams": 0,
                    "avg_score": 0,
                    "last_exam_date": None
                },
                "next_level": None
            }

    def _get_level_display_name(self, level: str) -> str:
        """Map CEFR levels to display names"""
        display_names = {
            "A1": "Beginner",
            "A2": "Elementary", 
            "B1": "Intermediate",
            "B2": "Upper Intermediate",
            "C1": "Advanced",
            "C2": "Mastery"
        }
        return display_names.get(level, level)

    def _get_next_level_message(self, avg_score: float, total_exams: int, next_level: str) -> str:
        """Generate personalized message for next level"""
        if total_exams == 0:
            return f"Complete your first {next_level} exam to get started!"
        elif avg_score >= 80:
            return f"Excellent work! You're ready for {next_level}."
        elif avg_score >= 70:
            return f"Good progress! Try the {next_level} exam when ready."
        else:
            return f"Keep practicing current level. Try {next_level} when you score 70%+."

    # REMOVED: get_recent_exam_results - not used in simplified dashboard (no recent activity section)

    @require_mysql_connection
    def get_current_streak(self, user_id: str) -> Dict[str, Any]:
        """Get current streak from users table and calculate additional streak metrics"""
        try:
            with self.mysql_service.get_db() as session:
                # Get streak from users table
                user_query = text("""
                    SELECT streak_days, last_activity_date
                    FROM users
                    WHERE id = :user_id
                """)
                
                result = session.execute(user_query, {"user_id": user_id})
                user_data = result.fetchone()
                
                if not user_data:
                    return {"streak_days": 0, "weekly_streak": 0, "last_activity": None, "streak_status": "inactive"}
                
                streak_days = user_data.streak_days or 0
                last_activity = user_data.last_activity_date
                
                # Calculate weekly streak (consecutive weeks with at least 1 session)
                weekly_streak = self._calculate_weekly_streak(user_id, session)
                
                # Calculate streak status
                today = date.today()
                
                if last_activity == today:
                    streak_status = "active_today"
                elif last_activity and (today - last_activity).days == 1:
                    streak_status = "can_continue"
                elif streak_days > 0:
                    streak_status = "at_risk"
                else:
                    streak_status = "inactive"
                    
                # Get longest streak (historical)
                streak_query = text("""
                    SELECT MAX(streak_days) as max_streak
                    FROM users 
                    WHERE id = :user_id
                """)
                max_result = session.execute(streak_query, {"user_id": user_id})
                max_streak = max_result.scalar() or streak_days
                
                return {
                    "streak_days": streak_days,
                    "weekly_streak": weekly_streak,
                    "last_activity": last_activity.isoformat() if last_activity else None,
                    "streak_status": streak_status,
                    "longest_streak": max_streak,
                    "streak_badge": self._get_weekly_streak_badge(weekly_streak)
                }
            
        except Exception as e:
            logger.error("Failed to get streak data", user_id=user_id, error=str(e))
            return {"streak_days": 0, "weekly_streak": 0, "last_activity": None, "streak_status": "inactive", "longest_streak": 0, "streak_badge": "🌱"}
    
    def _calculate_weekly_streak(self, user_id: str, session) -> int:
        """Calculate consecutive weeks with at least 1 session"""
        try:
            # Get weeks with activity, ordered by week descending
            query = text("""
                SELECT DISTINCT YEARWEEK(completed_at, 1) as year_week
                FROM exam_detail
                WHERE user_id = :user_id
                  AND status = 'analyzed'
                  AND completed_at IS NOT NULL
                ORDER BY year_week DESC
                LIMIT 52
            """)
            
            result = session.execute(query, {"user_id": user_id})
            active_weeks = [row.year_week for row in result]
            
            if not active_weeks:
                return 0
            
            # Get current week
            from datetime import datetime
            current_week = int(datetime.now().strftime('%Y%U'))
            
            # Check if user was active this week or last week
            if current_week not in active_weeks and (current_week - 1) not in active_weeks:
                return 0
            
            # Count consecutive weeks starting from most recent
            streak = 0
            expected_week = active_weeks[0]
            
            for week in active_weeks:
                if week == expected_week:
                    streak += 1
                    expected_week -= 1
                else:
                    break
            
            return streak
            
        except Exception as e:
            logger.error("Failed to calculate weekly streak", user_id=user_id, error=str(e))
            return 0

    # REMOVED: get_learning_insights - not used in simplified dashboard (merged into comparison)

    @require_mysql_connection
    def get_performance_trends(self, user_id: str, days: int = 30, language_id: Optional[str] = None) -> Dict[str, Any]:
        """Get performance trends over time"""
        try:
            with self.mysql_service.get_db() as session:
                # Get monthly performance trend
                trend_query = text("""
                    SELECT 
                        DATE_FORMAT(completed_at, '%Y-%m') as month,
                        COUNT(*) as sessions,
                        AVG(CASE 
                            WHEN JSON_VALID(exam_summary) 
                            AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                            ELSE 0
                        END) as avg_score,
                        MAX(CASE 
                            WHEN JSON_VALID(exam_summary) 
                            AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                            ELSE 0
                        END) as best_score
                    FROM exam_detail
                    WHERE user_id = :user_id
                      AND status = 'analyzed'
                      AND completed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
                      AND (:language_id IS NULL OR language_id = :language_id)
                    GROUP BY DATE_FORMAT(completed_at, '%Y-%m')
                    ORDER BY month DESC
                    LIMIT 6
                """)
                
                result = session.execute(trend_query, {"user_id": user_id, "days": days, "language_id": language_id})
                trends = []
                total_score = 0
                total_sessions = 0
                best_score = 0
                
                for row in result:
                    month_data = {
                        "month": row.month,
                        "sessions": row.sessions,
                        "avg_score": round(row.avg_score or 0, 1),
                        "best_score": round(row.best_score or 0, 1)
                    }
                    trends.append(month_data)
                    total_score += row.avg_score or 0
                    total_sessions += row.sessions
                    best_score = max(best_score, row.best_score or 0)
                
                overall_avg = round(total_score / max(len(trends), 1), 1) if trends else 0
                
                # Get exam vs practice averages
                type_query = text("""
                    SELECT 
                        session_type,
                        AVG(CASE 
                            WHEN JSON_VALID(exam_summary) 
                            AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                            ELSE 0
                        END) as avg_score
                    FROM exam_detail
                    WHERE user_id = :user_id
                      AND status = 'analyzed'
                      AND completed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
                      AND (:language_id IS NULL OR language_id = :language_id)
                    GROUP BY session_type
                """)
                
                type_result = session.execute(type_query, {"user_id": user_id, "days": days, "language_id": language_id})
                type_scores = dict(type_result.fetchall())
                
                return {
                    "monthly_trends": trends,
                    "average_score": overall_avg,
                    "best_score": round(best_score, 1),
                    "exam_average": round(type_scores.get('exam', 0), 1),
                    "practice_average": round(type_scores.get('practice', 0), 1),
                    "total_sessions_6m": total_sessions,
                    "completion_rate": 85  # Placeholder - could be calculated from actual data
                }
            
        except Exception as e:
            logger.error("Failed to get performance trends", user_id=user_id, error=str(e))
            return {
                "monthly_trends": [],
                "average_score": 0,
                "best_score": 0,
                "exam_average": 0,
                "practice_average": 0,
                "total_sessions_6m": 0,
                "completion_rate": 0
            }

    @require_mysql_connection
    def get_weekly_activity_trends(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get weekly score trends per activity type for multi-line chart"""
        try:
            weeks = (days + 6) // 7
            
            with self.mysql_service.get_db() as session:
                query = text("""
                    WITH RECURSIVE
                    -- Generate week series
                    week_range AS (
                        SELECT 
                            DATE_SUB(CURDATE(), INTERVAL :weeks WEEK) as start_date,
                            CURDATE() as end_date
                    ),
                    week_series AS (
                        SELECT 
                            YEARWEEK(start_date, 1) as year_week,
                            start_date as week_start
                        FROM week_range
                        UNION ALL
                        SELECT 
                            YEARWEEK(DATE_ADD(week_start, INTERVAL 1 WEEK), 1),
                            DATE_ADD(week_start, INTERVAL 1 WEEK)
                        FROM week_series, week_range
                        WHERE week_start < week_range.end_date
                    ),
                    -- Get activity data per week
                    activity_weekly_data AS (
                        SELECT 
                            YEARWEEK(ed.completed_at, 1) as year_week,
                            DATE(DATE_SUB(ed.completed_at, INTERVAL WEEKDAY(ed.completed_at) DAY)) as week_start,
                            el.activity_type,
                            AVG(CASE 
                                WHEN JSON_VALID(el.feedback_data) 
                                AND JSON_EXTRACT(el.feedback_data, '$.feedback.score') IS NOT NULL
                                THEN CAST(JSON_EXTRACT(el.feedback_data, '$.feedback.score') AS UNSIGNED) * 10
                                ELSE 0
                            END) as avg_score,
                            COUNT(*) as attempts
                        FROM exam_log el
                        JOIN exam_detail ed ON el.exam_detail_id = ed.id
                        WHERE el.user_id = :user_id
                          AND ed.status = 'analyzed'
                          AND ed.completed_at >= DATE_SUB(NOW(), INTERVAL :weeks WEEK)
                          AND ed.completed_at IS NOT NULL
                        GROUP BY 
                            YEARWEEK(ed.completed_at, 1),
                            DATE(DATE_SUB(ed.completed_at, INTERVAL WEEKDAY(ed.completed_at) DAY)),
                            el.activity_type
                    )
                    SELECT 
                        ws.year_week,
                        ws.week_start,
                        awd.activity_type,
                        COALESCE(awd.avg_score, 0) as avg_score,
                        COALESCE(awd.attempts, 0) as attempts
                    FROM week_series ws
                    LEFT JOIN activity_weekly_data awd ON ws.year_week = awd.year_week
                    ORDER BY ws.year_week ASC, awd.activity_type ASC
                """)
                
                result = session.execute(query, {"user_id": user_id, "weeks": weeks})
                rows = list(result.fetchall())
                
                if not rows:
                    return {
                        "weeks": [],
                        "activity_trends": {},
                        "chart_type": "multi_line_chart"
                    }
                
                # Organize data by week and activity
                weeks_data = {}
                activity_types = set()
                
                for row in rows:
                    year_week = row.year_week
                    week_start = row.week_start.isoformat() if hasattr(row.week_start, 'isoformat') else str(row.week_start)
                    
                    if year_week not in weeks_data:
                        weeks_data[year_week] = {
                            "year_week": year_week,
                            "week_start": week_start,
                            "activities": {}
                        }
                    
                    if row.activity_type:
                        activity_types.add(row.activity_type)
                        weeks_data[year_week]["activities"][row.activity_type] = {
                            "avg_score": float(row.avg_score or 0),
                            "attempts": int(row.attempts or 0)
                        }
                
                # Convert to list format for frontend
                weeks_list = []
                for year_week in sorted(weeks_data.keys()):
                    week = weeks_data[year_week]
                    week_entry = {
                        "year_week": week["year_week"],
                        "week_start": week["week_start"]
                    }
                    # Add each activity score to the week
                    for activity in ["reading", "writing", "grammar", "hearing", "speaking"]:
                        if activity in week["activities"]:
                            week_entry[activity] = week["activities"][activity]["avg_score"]
                        else:
                            week_entry[activity] = None  # No data for this activity this week
                    weeks_list.append(week_entry)
                
                return {
                    "weeks": weeks_list,
                    "activity_types": sorted(list(activity_types)),
                    "chart_type": "multi_line_chart"
                }
                
        except Exception as e:
            logger.error("Failed to get weekly activity trends", user_id=user_id, error=str(e))
            return {
                "weeks": [],
                "activity_trends": {},
                "chart_type": "multi_line_chart"
            }
    
    @require_mysql_connection
    def get_weekly_score_improvement(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get weekly score improvement with gap handling for inactive weeks"""
        try:
            # Convert days to weeks (rounded up)
            weeks = (days + 6) // 7  # Ceiling division
            
            with self.mysql_service.get_db() as session:
                # Optimized query using recursive CTE and window functions
                query = text("""
                    WITH RECURSIVE 
                    -- Generate complete week series based on days parameter
                    week_range AS (
                        SELECT 
                            DATE_SUB(CURDATE(), INTERVAL :weeks WEEK) as start_date,
                            CURDATE() as end_date
                    ),
                    week_series AS (
                        SELECT 
                            YEARWEEK(start_date, 1) as year_week,
                            start_date as week_start
                        FROM week_range
                        
                        UNION ALL
                        
                        SELECT 
                            YEARWEEK(DATE_ADD(week_start, INTERVAL 1 WEEK), 1),
                            DATE_ADD(week_start, INTERVAL 1 WEEK)
                        FROM week_series, week_range
                        WHERE week_start < week_range.end_date
                    ),
                    -- Get actual user data with window functions
                    user_weekly_data AS (
                        SELECT 
                            YEARWEEK(completed_at, 1) as year_week,
                            YEAR(completed_at) as year,
                            WEEK(completed_at, 1) as week_number,
                            DATE(DATE_SUB(completed_at, INTERVAL WEEKDAY(completed_at) DAY)) as week_start,
                            COUNT(*) as sessions_count,
                            AVG(CASE 
                                WHEN JSON_VALID(exam_summary) 
                                AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                                THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                                ELSE 0
                            END) as avg_score,
                            MAX(CASE 
                                WHEN JSON_VALID(exam_summary) 
                                AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                                THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                                ELSE 0
                            END) as best_score
                        FROM exam_detail
                        WHERE user_id = :user_id
                          AND status = 'analyzed'
                          AND completed_at >= DATE_SUB(NOW(), INTERVAL :weeks WEEK)
                          AND completed_at IS NOT NULL
                        GROUP BY 
                            YEARWEEK(completed_at, 1), 
                            YEAR(completed_at), 
                            WEEK(completed_at, 1),
                            DATE(DATE_SUB(completed_at, INTERVAL WEEKDAY(completed_at) DAY))
                    ),
                    -- Combine with gap filling using window functions
                    complete_weeks AS (
                        SELECT 
                            ws.year_week,
                            COALESCE(uwd.year, YEAR(ws.week_start)) as year,
                            COALESCE(uwd.week_number, WEEK(ws.week_start, 1)) as week_number,
                            COALESCE(DATE(uwd.week_start), DATE(ws.week_start)) as week_start,
                            COALESCE(uwd.sessions_count, 0) as sessions_count,
                            uwd.avg_score as actual_avg_score,
                            COALESCE(uwd.best_score, 0) as best_score,
                            uwd.avg_score IS NOT NULL as has_activity,
                            uwd.avg_score IS NULL as gap_filled
                        FROM week_series ws
                        LEFT JOIN user_weekly_data uwd ON ws.year_week = uwd.year_week
                    ),
                    -- Fill gaps with last known score using subquery (MySQL compatible)
                    weeks_with_filled_scores AS (
                        SELECT 
                            cw.year_week,
                            cw.year,
                            cw.week_number,
                            cw.week_start,
                            cw.sessions_count,
                            COALESCE(
                                cw.actual_avg_score,
                                (SELECT actual_avg_score 
                                 FROM complete_weeks prev 
                                 WHERE prev.year_week < cw.year_week 
                                   AND prev.actual_avg_score IS NOT NULL 
                                 ORDER BY prev.year_week DESC 
                                 LIMIT 1)
                            ) as avg_score,
                            cw.best_score,
                            cw.has_activity,
                            cw.gap_filled
                        FROM complete_weeks cw
                    ),
                    -- Calculate trends using subqueries (MySQL compatible)
                    weeks_with_trends AS (
                        SELECT 
                            wfs.*,
                            LAG(wfs.avg_score) OVER (ORDER BY wfs.year_week) as prev_week_score,
                            (SELECT actual_avg_score 
                             FROM complete_weeks 
                             WHERE actual_avg_score IS NOT NULL 
                             ORDER BY year_week ASC 
                             LIMIT 1) as first_active_score,
                            (SELECT actual_avg_score 
                             FROM complete_weeks 
                             WHERE actual_avg_score IS NOT NULL 
                             ORDER BY year_week DESC 
                             LIMIT 1) as last_active_score
                        FROM weeks_with_filled_scores wfs
                    )
                    SELECT 
                        year_week,
                        year,
                        week_number,
                        week_start,
                        sessions_count,
                        ROUND(COALESCE(avg_score, 0), 1) as avg_score,
                        ROUND(best_score, 1) as best_score,
                        has_activity,
                        gap_filled,
                        first_active_score,
                        last_active_score,
                        COUNT(CASE WHEN has_activity THEN 1 END) OVER () as total_weeks_with_activity
                    FROM weeks_with_trends
                    ORDER BY year_week ASC
                """)
                
                result = session.execute(query, {"user_id": user_id, "weeks": weeks})
                rows = list(result.fetchall())
            
            if not rows:
                return {
                    "weeks": [],
                    "improvement_trend": "no_data",
                    "total_weeks_analyzed": 0,
                    "weeks_with_activity": 0,
                    "average_improvement": 0,
                    "chart_type": "line_chart"
                }
            
            # Convert to list of dicts for response
            weeks = []
            first_active_score = None
            last_active_score = None
            weeks_with_activity = 0
            
            for row in rows:
                weeks.append({
                    "year_week": row.year_week,
                    "year": row.year,
                    "week_number": row.week_number,
                    "week_start": row.week_start.isoformat() if hasattr(row.week_start, 'isoformat') else str(row.week_start),
                    "sessions_count": row.sessions_count,
                    "avg_score": float(row.avg_score),
                    "best_score": float(row.best_score),
                    "has_activity": bool(row.has_activity),
                    "gap_filled": bool(row.gap_filled)
                })
                
                if row.has_activity:
                    weeks_with_activity += 1
                    
                if row.first_active_score is not None and first_active_score is None:
                    first_active_score = float(row.first_active_score)
                if row.last_active_score is not None:
                    last_active_score = float(row.last_active_score)
            
            # Calculate improvement trend using SQL-provided values
            improvement_trend = self._calculate_improvement_trend_from_scores(
                first_active_score, last_active_score, weeks_with_activity
            )
            
            # Calculate average improvement from consecutive active weeks
            avg_improvement = self._calculate_average_improvement(weeks)
            
            return {
                "weeks": weeks,
                "improvement_trend": improvement_trend,
                "total_weeks_analyzed": len(weeks),
                "weeks_with_activity": weeks_with_activity,
                "average_improvement": avg_improvement,
                "chart_type": "line_chart",
                "gap_handling": "carry_forward_last_known_score"
            }
            
        except Exception as e:
            logger.error("Failed to get weekly score improvement", user_id=user_id, error=str(e))
            return {
                "weeks": [],
                "improvement_trend": "error",
                "total_weeks_analyzed": 0,
                "weeks_with_activity": 0,
                "average_improvement": 0,
                "chart_type": "line_chart"
            }

    # =================
    # HELPER METHODS
    # =================

    def _get_streak_badge(self, streak_days: int) -> str:
        """Get streak badge emoji based on streak length"""
        if streak_days == 0:
            return "🌱"  # New start
        elif streak_days < 7:
            return "🔥"   # Building
        elif streak_days < 30:
            return "⚡"   # Strong
        elif streak_days < 100:
            return "🚀"   # Excellent
        else:
            return "👑"   # Master
    
    def _get_weekly_streak_badge(self, weekly_streak: int) -> str:
        """Get weekly streak badge emoji based on weeks"""
        if weekly_streak == 0:
            return "🌱"  # New start
        elif weekly_streak < 4:
            return "🔥"   # Building (less than a month)
        elif weekly_streak < 12:
            return "⚡"   # Strong (3 months)
        elif weekly_streak < 26:
            return "🚀"   # Excellent (6 months)
        else:
            return "👑"   # Master (6+ months)

    def _calculate_improvement_trend_from_scores(
        self, 
        first_score: Optional[float], 
        last_score: Optional[float], 
        weeks_with_activity: int
    ) -> str:
        """Calculate improvement trend from first and last active scores"""
        if weeks_with_activity < 2:
            return "insufficient_activity"
        
        if first_score is None or last_score is None:
            return "insufficient_data"
        
        if first_score == 0:
            return "no_baseline"
        
        # Calculate percentage improvement
        improvement_percent = ((last_score - first_score) / first_score) * 100
        
        if improvement_percent > 10:
            return "strong_improvement"
        elif improvement_percent > 5:
            return "moderate_improvement"
        elif improvement_percent > -5:
            return "stable"
        elif improvement_percent > -10:
            return "slight_decline"
        else:
            return "declining"
    
    def _calculate_average_improvement(self, weeks: List[Dict[str, Any]]) -> float:
        """Calculate average week-over-week improvement for active weeks"""
        active_weeks = [w for w in weeks if w["has_activity"] and w["avg_score"] > 0]
        
        if len(active_weeks) < 2:
            return 0.0
        
        improvements = []
        for i in range(1, len(active_weeks)):
            prev_score = active_weeks[i-1]["avg_score"]
            curr_score = active_weeks[i]["avg_score"]
            if prev_score > 0:
                improvement = ((curr_score - prev_score) / prev_score) * 100
                improvements.append(improvement)
        
        if improvements:
            return round(sum(improvements) / len(improvements), 1)
        
        return 0.0

    @require_mysql_connection
    def get_session_distribution(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Get session distribution by day of week and time patterns
        More meaningful than engagement score
        """
        try:
            with self.mysql_service.get_db() as session:
                # Distribution by day of week
                day_query = text("""
                    SELECT 
                        DAYNAME(completed_at) as day_name,
                        DAYOFWEEK(completed_at) as day_num,
                        COUNT(*) as sessions
                    FROM exam_detail
                    WHERE user_id = :user_id
                      AND status = 'analyzed'
                      AND completed_at IS NOT NULL
                      AND completed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
                    GROUP BY DAYNAME(completed_at), DAYOFWEEK(completed_at)
                    ORDER BY DAYOFWEEK(completed_at)
                """)
                
                result = session.execute(day_query, {"user_id": user_id, "days": days})
                day_distribution = []
                total_sessions = 0
                
                for row in result:
                    sessions = row.sessions
                    total_sessions += sessions
                    day_distribution.append({
                        "day": row.day_name,
                        "day_num": row.day_num,
                        "sessions": sessions
                    })
                
                # Calculate percentages
                for day in day_distribution:
                    day["percentage"] = round((day["sessions"] / max(total_sessions, 1)) * 100, 1)
                
                # Most active day
                most_active_day = max(day_distribution, key=lambda x: x["sessions"]) if day_distribution else None
                
                # Distribution by session type over time period
                type_query = text("""
                    SELECT 
                        DATE(completed_at) as date,
                        session_type,
                        COUNT(*) as sessions
                    FROM exam_detail
                    WHERE user_id = :user_id
                      AND status = 'analyzed'
                      AND completed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
                      AND completed_at IS NOT NULL
                    GROUP BY DATE(completed_at), session_type
                    ORDER BY date DESC
                """)
                
                result = session.execute(type_query, {"user_id": user_id, "days": days})
                recent_activity = []
                
                for row in result:
                    recent_activity.append({
                        "date": row.date.isoformat() if hasattr(row.date, 'isoformat') else str(row.date),
                        "session_type": row.session_type,
                        "sessions": row.sessions
                    })
                
                return {
                    "day_distribution": day_distribution,
                    "most_active_day": most_active_day["day"] if most_active_day else None,
                    "total_sessions": total_sessions,
                    "recent_activity_30d": recent_activity,
                    "chart_type": "bar_chart"
                }
                
        except Exception as e:
            logger.error("Failed to get session distribution", user_id=user_id, error=str(e))
            return {
                "day_distribution": [],
                "most_active_day": None,
                "total_sessions": 0,
                "recent_activity_30d": [],
                "chart_type": "bar_chart"
            }

    @require_mysql_connection
    def get_platform_benchmarks(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get platform-wide benchmarks for comparison
        
        Args:
            user_id: Optional user ID to exclude from benchmarks (avoid self-comparison)
            
        Returns:
            Platform benchmarks including level averages, activity averages, etc.
        """
        try:
            with self.mysql_service.get_db() as session:
                # Level benchmarks (last 90 days for relevance)
                level_query = text("""
                    SELECT 
                        level,
                        COUNT(DISTINCT user_id) as total_users,
                        COUNT(*) as total_sessions,
                        AVG(CASE 
                            WHEN JSON_VALID(exam_summary) 
                            AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                            ELSE NULL
                        END) as avg_score,
                        MIN(CASE 
                            WHEN JSON_VALID(exam_summary) 
                            AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                            ELSE NULL
                        END) as min_score,
                        MAX(CASE 
                            WHEN JSON_VALID(exam_summary) 
                            AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                            ELSE NULL
                        END) as max_score
                    FROM exam_detail
                    WHERE status = 'analyzed'
                      AND completed_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                      AND (:user_id IS NULL OR user_id != :user_id)
                    GROUP BY level
                    ORDER BY FIELD(level,'A0','A1','A2','B1','B2','C1','C2')
                """)
                
                result = session.execute(level_query, {"user_id": user_id})
                level_benchmarks = []
                for row in result:
                    level_benchmarks.append({
                        "level": row.level,
                        "users": row.total_users,
                        "sessions": row.total_sessions,
                        "avg_score": round(row.avg_score, 1) if row.avg_score else 0,
                        "min_score": round(row.min_score, 1) if row.min_score else 0,
                        "max_score": round(row.max_score, 1) if row.max_score else 0
                    })
                
                # Activity type benchmarks
                activity_query = text("""
                    SELECT 
                        el.activity_type,
                        COUNT(DISTINCT el.user_id) as total_users,
                        COUNT(*) as total_attempts,
                        AVG(CASE 
                            WHEN JSON_VALID(el.feedback_data) 
                            AND JSON_EXTRACT(el.feedback_data, '$.feedback.score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(el.feedback_data, '$.feedback.score') AS UNSIGNED) * 10
                            ELSE NULL
                        END) as avg_score
                    FROM exam_log el
                    JOIN exam_detail ed ON el.exam_detail_id = ed.id
                    WHERE ed.status = 'analyzed'
                      AND ed.completed_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                      AND (:user_id IS NULL OR el.user_id != :user_id)
                    GROUP BY el.activity_type
                    ORDER BY total_attempts DESC
                    LIMIT 10
                """)
                
                result = session.execute(activity_query, {"user_id": user_id})
                activity_benchmarks = []
                for row in result:
                    activity_benchmarks.append({
                        "activity_type": row.activity_type,
                        "users": row.total_users,
                        "attempts": row.total_attempts,
                        "avg_score": round(row.avg_score, 1) if row.avg_score else 0
                    })
                
                # Overall platform stats
                overall_query = text("""
                    SELECT 
                        COUNT(DISTINCT user_id) as total_active_users,
                        COUNT(*) as total_sessions,
                        AVG(CASE 
                            WHEN JSON_VALID(exam_summary) 
                            AND JSON_EXTRACT(exam_summary, '$.overall.overall_score') IS NOT NULL
                            THEN CAST(JSON_EXTRACT(exam_summary, '$.overall.overall_score') AS DECIMAL(5,2))
                            ELSE NULL
                        END) as platform_avg_score,
                        COUNT(*) / COUNT(DISTINCT user_id) as avg_sessions_per_user
                    FROM exam_detail
                    WHERE status = 'analyzed'
                      AND completed_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                      AND (:user_id IS NULL OR user_id != :user_id)
                """)
                
                result = session.execute(overall_query, {"user_id": user_id})
                overall = result.fetchone()
                
                return {
                    "level_benchmarks": level_benchmarks,
                    "activity_benchmarks": activity_benchmarks,
                    "overall": {
                        "active_users": overall.total_active_users if overall else 0,
                        "total_sessions": overall.total_sessions if overall else 0,
                        "avg_score": round(overall.platform_avg_score, 1) if overall and overall.platform_avg_score else 0,
                        "avg_sessions_per_user": round(overall.avg_sessions_per_user, 1) if overall and overall.avg_sessions_per_user else 0
                    },
                    "period": "last_90_days",
                    "generated_at": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error("Failed to get platform benchmarks", error=str(e))
            return {
                "level_benchmarks": [],
                "activity_benchmarks": [],
                "overall": {
                    "active_users": 0,
                    "total_sessions": 0,
                    "avg_score": 0,
                    "avg_sessions_per_user": 0
                },
                "period": "last_90_days",
                "generated_at": datetime.utcnow().isoformat()
            }

    def _get_empty_dashboard_data(self) -> Dict[str, Any]:
        """Return empty dashboard data structure for error cases - SIMPLIFIED"""
        return {
            "activity_performance": [
                {
                    "activity_type": activity,
                    "sessions_done": 0,
                    "practice_sessions": 0,
                    "exam_sessions": 0,
                    "avg_score": 0,
                    "best_score": 0,
                    "has_activity": False
                }
                for activity in ["reading", "writing", "grammar", "hearing", "speaking"]
            ],
            "generated_at": datetime.utcnow().isoformat(),
            "cache_duration": settings.dashboard_cache_ttl
        }


def get_dashboard_repository() -> DashboardRepository:
    """Factory function to get dashboard repository instance"""
    return DashboardRepository()
