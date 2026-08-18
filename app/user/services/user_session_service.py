"""User Session Service - orchestration layer for session operations."""

from typing import Dict, Any, Optional, List
import structlog

from app.config import settings
from app.user.models.core_repository import CoreRepository
from app.user.models.user_repository import UserRepository
from app.user.models.request_models import SessionCreateRequest
from app.common.models.mysql_models import UsageLog, ExamDetail

logger = structlog.get_logger()


class UserSessionService:
    """Service layer that wraps session-related business logic."""

    def __init__(self, core_repo: CoreRepository, user_repo: UserRepository):
        self.core_repo = core_repo
        self.user_repo = user_repo

    # ------------------------------------------------------------------
    # Template handling
    # ------------------------------------------------------------------
    def get_templates(
        self,
        level: str,
        user_school_id: Optional[str],
        requested_school_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Return session templates with both school-specific and B2C templates."""

        final_school_id = (
            requested_school_id
            or user_school_id
        )

        response_payload: Dict[str, Dict[str, Dict[str, Any]]] = {
            "exam": {},
            "practice": {},
        }

        hearing_enabled = bool(settings.enable_hearing_exams)
        
        # First, get school-specific templates if we have a school_id
        school_templates = []
        if final_school_id:
            try:
                school_templates = self.core_repo.get_templates_by_school_and_level(
                    final_school_id, level
                )
            except Exception as exc:  # pragma: no cover
                logger.error(
                    "Failed to fetch school templates from repository",
                    level=level,
                    school_id=final_school_id,
                    error=str(exc),
                )

        # Then, get B2C templates (generic templates for everyone)
        b2c_templates = []
        try:
            b2c_templates = self.core_repo.get_templates_by_school_and_level(
                settings.default_b2c_school_id, level
            )
        except Exception as exc:  # pragma: no cover
            logger.error(
                "Failed to fetch B2C templates from repository",
                level=level,
                school_id=settings.default_b2c_school_id,
                error=str(exc),
            )

        # Process school-specific templates first (they appear first in response)
        if school_templates:
            for template in school_templates:
                template_data = template.get("template_data", {})
                template_activity_data = self._extract_activity_counts(template_data)

                if not hearing_enabled:
                    template_activity_data["hearing"] = 0

                session_type_key = str(template.get("session_type", "exam"))
                formatted_template = {
                    "template_id": template.get("id"),
                    "template_name": template.get("template_name"),
                    "name": template.get("template_name"),
                    "source": "school",  # Mark as school template
                    **template_activity_data,
                }

                template_key = str(
                    template.get("template_name", "")
                    .lower()
                    .replace(" ", "_")
                    or template.get("id")
                )

                response_payload.setdefault(session_type_key, {})[
                    template_key
                ] = formatted_template

        # Then process B2C templates (they appear after school templates)
        if b2c_templates:
            for template in b2c_templates:
                template_data = template.get("template_data", {})
                template_activity_data = self._extract_activity_counts(template_data)

                if not hearing_enabled:
                    template_activity_data["hearing"] = 0

                session_type_key = str(template.get("session_type", "exam"))
                formatted_template = {
                    "template_id": template.get("id"),
                    "template_name": template.get("template_name"),
                    "name": template.get("template_name"),
                    "source": "b2c",  # Mark as B2C template
                    **template_activity_data,
                }

                template_key = str(
                    template.get("template_name", "")
                    .lower()
                    .replace(" ", "_")
                    or template.get("id")
                )

                # Add B2C template only if not already present (avoid duplicates)
                if template_key not in response_payload.setdefault(session_type_key, {}):
                    response_payload[session_type_key][template_key] = formatted_template

        has_templates = bool(school_templates or b2c_templates)

        return {
            "success": True,
            "templates": response_payload,
            "school_id": final_school_id or settings.default_b2c_school_id,
            "level": level,
            "source": "mixed" if school_templates and b2c_templates else ("school_template" if school_templates else "b2c_template"),
        }

    def _format_practice_templates(
        self, templates: Dict[str, Dict[str, Any]], hearing_enabled: bool
    ) -> Dict[str, Dict[str, Any]]:
        formatted: Dict[str, Dict[str, Any]] = {}
        for template_id, template in templates.items():
            activity_data = self._extract_activity_counts(template)
            if not hearing_enabled:
                activity_data["hearing"] = 0

            formatted[template_id] = {
                "name": template.get("template_name"),
                **activity_data,
            }
        return formatted

    # ------------------------------------------------------------------
    # Session creation
    # ------------------------------------------------------------------
    def create_session(
        self,
        user_id: str,
    request_data: SessionCreateRequest,
    ) -> Dict[str, Any]:
        """Create exam or practice session with hearing feature validation."""

        language_obj = self.core_repo.get_language_by_id(request_data.language_id)
        if not language_obj:
            return {
                "success": False,
                "message": f"Language with ID '{request_data.language_id}' not found or inactive",
            }

        # SIMPLIFIED: Both exam and practice sessions require template_id
        if not request_data.template_id:
            return {
                "success": False,
                "message": "template_id is required",
            }

        # Get template from database by ID - NO name matching, NO overrides
        db_template = self.core_repo.get_template_by_id(request_data.template_id)
        
        if not db_template:
            return {
                "success": False, 
                "message": f"Template ID '{request_data.template_id}' not found. Failed to create session."
            }

        # Validate session_type matches template
        if db_template.get("session_type") != request_data.session_type:
            return {
                "success": False,
                "message": f"Template type mismatch. Template is '{db_template.get('session_type')}' but request is '{request_data.session_type}'"
            }

        # Use template data EXACTLY as defined in database - NO modifications
        template_counts = self._extract_activity_counts(db_template["template_data"])
        
        # Validate template has at least one activity
        if not any(template_counts.get(activity, 0) > 0 for activity in ['reading', 'writing', 'grammar', 'hearing', 'speaking']):
            return {
                "success": False,
                "message": "Template must have at least one activity with questions",
            }

        template_id = db_template["id"]
        session_name = request_data.session_name or db_template["template_name"]

        enforce_result = self._enforce_hearing_rules(
            language_id=request_data.language_id,
            level=request_data.level,
            session_type=request_data.session_type,
            activity_type=request_data.activity_type,
            template_counts=template_counts,
        )

        if enforce_result is not None:
            return enforce_result

        total_questions = sum(template_counts.values())

        repo_result = self.core_repo.create_exam_detail(
            user_id=user_id,
            session_type=request_data.session_type,
            level=request_data.level,
            language_id=request_data.language_id,
            exam_name=session_name,
            template_id=template_id,
            template_data=template_counts,
        )

        if not repo_result.get("success"):
            return {
                "success": False,
                "message": repo_result.get("message", "Failed to create session"),
            }

        return {
            "success": True,
            "session_id": repo_result.get("exam_id"),
            "session_name": session_name,
            "language_info": {
                "language_id": request_data.language_id,
                "language_name": language_obj.get("name")
                or language_obj.get("language_name", "Unknown"),
            },
            "template": template_counts,
            "total_questions": total_questions,
        }

    def _enforce_hearing_rules(
        self,
        language_id: str,
        level: str,
        session_type: str,
        template_counts: Dict[str, int],
        activity_type: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Validate hearing feature flag and content availability."""

        hearing_requested = template_counts.get("hearing", 0) > 0
        speaking_requested = template_counts.get("speaking", 0) > 0

        if hearing_requested and not settings.enable_hearing_exams:
            return {
                "success": False,
                "message": "Hearing exams are currently disabled",
            }

        if speaking_requested and not settings.enable_speaking_exams:
            return {
                "success": False,
                "message": "Speaking exams are currently disabled",
            }

        if hearing_requested:
            has_hearing_questions = self.core_repo.check_audio_activity_availability(
                language_id=language_id,
                level=level,
            )
            if not has_hearing_questions:
                return {
                    "success": False,
                    "message": "Hearing questions are not available for the selected language/level",
                }

        if speaking_requested:
            has_speaking_questions = self.core_repo.check_audio_activity_availability(
                language_id=language_id,
                level=level,
                activity_type="speaking",
            )
            if not has_speaking_questions:
                return {
                    "success": False,
                    "message": "Speaking questions are not available for the selected language/level",
                }

        if (
            session_type == "practice"
            and activity_type == "hearing"
            and template_counts.get("hearing", 0) == 0
        ):
            return {
                "success": False,
                "message": "No hearing questions available for practice",
            }

        if (
            session_type == "practice"
            and activity_type == "speaking"
            and template_counts.get("speaking", 0) == 0
        ):
            return {
                "success": False,
                "message": "No speaking questions available for practice",
            }

        return None

    # ------------------------------------------------------------------
    # Repository proxies (service-facing methods)
    # ------------------------------------------------------------------
    def get_exam_detail(self, exam_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        return self.core_repo.get_exam_detail(exam_id, user_id)

    def get_exam_progress(self, exam_id: str, user_id: str) -> Dict[str, Any]:
        return self.core_repo.get_exam_progress(exam_id, user_id)

    def get_last_exam_answer(self, exam_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        return self.core_repo.get_last_exam_answer(exam_id, user_id)

    def update_exam_status(self, exam_id: str, status: str) -> bool:
        return self.core_repo.update_exam_status(exam_id, status)

    def save_exam_answer(
        self,
        exam_id: str,
        user_id: str,
        question_id: str,
        question_number: int,
        user_answer: str,
        activity_type: str,
        session_type: str,
        language_id: Optional[str],
        question_data: Dict[str, Any],
        time_taken: Optional[int] = None,
        is_skipped: bool = False,
        user_audio_url: Optional[str] = None,
        user_audio_transcript: Optional[str] = None,
        user_audio_meta: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return self.core_repo.save_exam_answer(
            exam_id=exam_id,
            user_id=user_id,
            question_id=question_id,
            question_number=question_number,
            user_answer=user_answer,
            activity_type=activity_type,
            session_type=session_type,
            language_id=language_id,
            question_data=question_data,
            time_taken=time_taken,
            is_skipped=is_skipped,
            user_audio_url=user_audio_url,
            user_audio_transcript=user_audio_transcript,
            user_audio_meta=user_audio_meta,
        )

    def get_exam_answers(self, exam_id: str, user_id: str) -> Dict[str, Any]:
        return self.core_repo.get_exam_answers(exam_id, user_id)
    
    def get_answer_by_question_id(
        self, exam_id: str, user_id: str, question_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get a specific answer by question_id"""
        return self.core_repo.get_answer_by_question_id(exam_id, user_id, question_id)
    
    def update_exam_answer(
        self,
        answer_id: str,
        new_answer: str,
        is_skipped: bool = False,
        user_audio_url: Optional[str] = None,
        user_audio_transcript: Optional[str] = None,
        user_audio_meta: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Update an existing exam answer"""
        return self.core_repo.update_exam_answer(
            answer_id,
            new_answer,
            is_skipped,
            user_audio_url=user_audio_url,
            user_audio_transcript=user_audio_transcript,
            user_audio_meta=user_audio_meta,
        )

    def get_user_sessions(
        self,
        user_id: str,
        session_type: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        return self.core_repo.get_user_sessions(
            user_id, session_type=session_type, limit=limit, offset=offset
        )

    def get_consecutive_high_scores(
        self,
        user_id: str,
        level: str,
        language_id: Optional[str] = None,
        threshold: float = 70.0
    ) -> int:
        """
        Calculate consecutive high scores for user at specific level.
        
        A "high score" is defined as >= 70.0 on a 0-100 scale (70%).
        
        Args:
            user_id: User identifier
            level: CEFR level (A1, A2, B1, etc.)
            language_id: Optional language filter
            threshold: Score threshold on 0-100 scale (default 70.0 = 70%)
            
        Returns:
            Number of consecutive sessions with score >= threshold
        """
        # Fetch last 5 analyzed sessions (ordered by analyzed_at DESC)
        sessions = self.core_repo.get_recent_analyzed_sessions(
            user_id=user_id,
            level=level,
            language_id=language_id,
            limit=5
        )
        
        streak = 0
        # Sessions are ordered by analyzed_at DESC (newest first)
        for session in sessions:
            if session.get("score", 0) >= threshold:
                streak += 1
            else:
                # Break streak on first non-high score
                break
                
        return streak

    def get_available_activity_types(self, language_id: str, level: str) -> List[str]:
        if not settings.enable_hearing_exams:
            # Shortcut when feature is disabled globally
            return [activity for activity in ["reading", "writing", "grammar"]]

        return self.core_repo.get_available_activity_types(language_id, level)

    def get_user_access(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self.user_repo.get_user_access(user_id)

    def get_usage_logs_for_session(self, session_id: str) -> List[Dict[str, Any]]:
        try:
            with self.core_repo.mysql_service.get_db() as db_session:
                logs = (
                    db_session.query(UsageLog)
                    .filter(UsageLog.session_id == session_id)
                    .order_by(UsageLog.timestamp.asc())
                    .all()
                )

                return [
                    {
                        "points_deducted": log.points_deducted,
                        "status": log.status,
                        "id": log.id,
                    }
                    for log in logs
                ]
        except Exception as exc:  # pragma: no cover
            logger.error(
                "Failed to fetch usage logs",
                session_id=session_id,
                error=str(exc),
            )
            return []

    def update_exam_analysis_step(
        self, session_id: str, verification_step: Dict[str, Any]
    ) -> None:
        try:
            with self.core_repo.mysql_service.get_db() as db_session:
                session_detail_obj = (
                    db_session.query(ExamDetail)
                    .filter(ExamDetail.id == session_id)
                    .first()
                )
                if session_detail_obj is None:
                    return

                session_detail_obj.analysis_step = verification_step
                db_session.commit()
        except Exception as exc:  # pragma: no cover
            logger.error(
                "Failed to update exam analysis step",
                session_id=session_id,
                error=str(exc),
            )

    def delete_session(self, session_id: str, user_id: str) -> bool:
        try:
            self.core_repo.delete_exam_answers(session_id, user_id)
            return self.core_repo.delete_exam_detail(session_id, user_id)
        except Exception as exc:  # pragma: no cover
            logger.error(
                "Failed to delete session",
                session_id=session_id,
                user_id=user_id,
                error=str(exc),
            )
            return False

    def determine_activity_type(
        self, question_number: int, template_counts: Dict[str, int]
    ) -> str:
        current_position = 0
        for activity_type, count in template_counts.items():
            if current_position < question_number <= current_position + count:
                return activity_type
            current_position += count
        return next(iter(template_counts.keys()), "reading")

    def get_feature_flags(
        self, language_id: str, level: str
    ) -> Dict[str, Dict[str, Any]]:
        features = {
            "hearing": {
                "enabled": bool(settings.enable_hearing_exams),
                "available": False,
            },
            "speaking": {
                "enabled": bool(settings.enable_speaking_exams),
                "available": False,
            },
        }

        if settings.enable_hearing_exams:
            features["hearing"]["available"] = self.core_repo.check_audio_activity_availability(
                language_id=language_id,
                level=level,
            )

        if settings.enable_speaking_exams:
            features["speaking"]["available"] = self.core_repo.check_audio_activity_availability(
                language_id=language_id,
                level=level,
                activity_type="speaking",
            )

        return features

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _extract_activity_counts(self, template: Dict[str, Any]) -> Dict[str, int]:
        activities = {"reading": 0, "writing": 0, "grammar": 0, "hearing": 0, "speaking": 0}

        for activity in activities.keys():
            try:
                value = template.get(activity, 0)
                activities[activity] = int(value) if value is not None else 0
            except (ValueError, TypeError):
                activities[activity] = 0

        return activities


    # ------------------------------------------------------------------
    # Session Sharing
    # ------------------------------------------------------------------
    def generate_share_link(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """
        Generate shareable link for a session
        
        Args:
            session_id: Session to share
            user_id: Session owner
            
        Returns:
            Dict with share_code and share_url
            
        Raises:
            ValueError: If session not found or not shareable
        """
        # Validate session ownership
        session_detail = self.core_repo.get_exam_detail(session_id, user_id)
        if not session_detail:
            raise ValueError("Session not found or access denied")
        
        # Validate session is completed/analyzed
        if session_detail.get('status') not in ['completed', 'analyzed']:
            raise ValueError("Only completed or analyzed sessions can be shared")
        
        # Create share code
        result = self.core_repo.create_session_share(session_id, user_id)
        
        if not result.get('success'):
            raise ValueError("Failed to create share link")
        
        share_code = result['share_code']
        share_url = f"{settings.frontend_url}/shared/{share_code}"
        
        return {
            "success": True,
            "share_code": share_code,
            "share_url": share_url,
            "expires_at": result.get('expires_at')
        }

    def get_public_session_data(self, share_code: str) -> Dict[str, Any]:
        """
        Get public session data (no auth required)
        
        Args:
            share_code: Share code from URL
            
        Returns:
            Anonymized session data
            
        Raises:
            ValueError: If share code invalid or expired
        """
        session_data = self.core_repo.get_session_by_share_code(share_code)
        
        if not session_data:
            raise ValueError("Share link not found or has been disabled")
        
        return session_data

    def get_public_session_answers(self, share_code: str) -> Dict[str, Any]:
        """
        Get public session answers (no auth required)
        
        Args:
            share_code: Share code from URL
            
        Returns:
            Anonymized answers and summaries
            
        Raises:
            ValueError: If share code invalid
        """
        answers_data = self.core_repo.get_answers_by_share_code(share_code)
        
        if not answers_data:
            raise ValueError("Share link not found or has been disabled")
        
        return answers_data


# Dependency helper ---------------------------------------------------------
def get_user_session_service(
    core_repo: Optional[CoreRepository] = None,
    user_repo: Optional[UserRepository] = None,
) -> UserSessionService:
    core_repo = core_repo or CoreRepository()
    user_repo = user_repo or UserRepository()
    return UserSessionService(core_repo=core_repo, user_repo=user_repo)
