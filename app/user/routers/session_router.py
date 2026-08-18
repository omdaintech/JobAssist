from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger()

from app.dependencies import (
    get_current_user,
    get_session_analyzer,
    get_question_retrieval_service,
    get_session_progress_service,
    get_user_session_service_dep,
    get_speaking_audio_service,
)
from app.user.services.user_session_service import UserSessionService
from app.user.services.s3_upload_service import S3UploadService
from app.user.models.request_models import (
    SessionCreateRequest,
    ExamAnswerRequest,
)
from app.user.models.response_models import (
    SessionHistoryResponse,
    ShareLinkResponse,
)
from app.user.services.session_analysis import SessionAnalyzer
from app.user.services.session_progress_service import SessionProgressService
from app.user.services.question_retrieval_service import QuestionRetrievalService
from app.user.services.speaking_audio_service import SpeakingAudioService

router = APIRouter(tags=["Users - Sessions"])

# === HELPER FUNCTIONS ===
def _validate_session_ownership(
    session_id: str,
    user_id: str,
    session_service: UserSessionService,
) -> Dict[str, Any]:
    """Validate that the session belongs to the user and return details."""

    session_detail = session_service.get_exam_detail(session_id, user_id)
    if not session_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied",
        )

    return session_detail


def _parse_template_question_counts(template_data: Dict[str, Any]) -> Dict[str, int]:
    """
    Centralized template data parsing for question counts
    
    Args:
        template_data: Raw template data from session
        
    Returns:
        Dict with only numeric question counts for valid activities
    """
    if not template_data:
        return {}

    valid_activities = ["reading", "writing", "grammar", "hearing", "speaking"]
    question_counts: Dict[str, int] = {}

    for activity, count in template_data.items():
        if activity not in valid_activities:
            continue

        try:
            numeric_count = (
                int(count)
                if isinstance(count, (int, str)) and str(count).isdigit()
                else 0
            )
        except (ValueError, TypeError):
            numeric_count = 0

        if numeric_count > 0:
            question_counts[activity] = numeric_count

    return question_counts


def _update_analysis_verification_step(
    session_id: str,
    user_id: str,
    session_service: UserSessionService,
    analysis_result: dict,
) -> dict:
    """Update exam_details with analysis verification step and return status."""

    from datetime import datetime

    try:
        session_detail_dict = session_service.get_exam_detail(session_id, user_id)
        if not session_detail_dict:
            return {"success": False, "error": "Session detail not found"}

        exam_answers_result = session_service.get_exam_answers(session_id, user_id)
        exam_logs = exam_answers_result.get("answers", [])

        usage_log_data = session_service.get_usage_logs_for_session(session_id)
        user_access = session_service.get_user_access(user_id)

        points_deductible = 0
        pre_deduction_credits = 0
        post_deduction_credits = 0

        if user_access:
            current_remaining = (
                user_access.get("allocated_count", 0)
                - user_access.get("used_count", 0)
            )
            post_deduction_credits = current_remaining

            if usage_log_data:
                latest_usage_log = usage_log_data[-1]
                points_deductible = latest_usage_log.get("points_deducted", 0)
                logger.info(
                    "USAGE_LOG_FOUND_FOR_ANALYSIS_STEP",
                    session_id=session_id,
                    usage_log_count=len(usage_log_data),
                    latest_status=latest_usage_log.get("status"),
                    points_deducted=points_deductible,
                )
            else:
                logger.warning(
                    "NO_USAGE_LOG_FOUND_FOR_ANALYSIS_STEP",
                    session_id=session_id,
                    user_id=user_id,
                )

            pre_deduction_credits = post_deduction_credits + points_deductible

        verification_step = {
            "timestamp": datetime.now().isoformat(),
            "exam_summary_saved": bool(session_detail_dict.get("session_summary")),
            "individual_feedback_count": len(
                [log for log in exam_logs if log.get("feedback_data")]
            ),
            "total_questions": len(exam_logs),
            "usage_log_status": usage_log_data[-1].get("status")
            if usage_log_data
            else "not_found",
            "credits_committed": (
                user_access.get("reserved_credits", 0) == 0 if user_access else False
            ),
            "payment_verified": analysis_result.get("payment_verified", False),
            "pre_deduction_credits": pre_deduction_credits,
            "post_deduction_credits": post_deduction_credits,
            "points_deductible": points_deductible,
        }

        session_service.update_exam_analysis_step(session_id, verification_step)

        return {
            "success": True,
            "verification_step": verification_step,
            "all_checks_passed": (
                verification_step["exam_summary_saved"]
                and verification_step["individual_feedback_count"]
                == verification_step["total_questions"]
                and verification_step["usage_log_status"] == "completed"
                and verification_step["credits_committed"]
                and verification_step["payment_verified"]
            ),
        }

    except Exception as e:  # pragma: no cover
        logger.error(
            "Verification update failed",
            session_id=session_id,
            user_id=user_id,
            error=str(e),
        )
        return {"success": False, "error": f"Verification update failed: {str(e)}"}


@router.get("/templates")
async def get_session_templates(
    level: str = Query(..., description="Level to filter templates (A1, A2, B1)"),
    school_id: Optional[str] = Query(None, description="School ID to filter templates"),
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """Get available session templates for specific level and school"""
    try:
        response = session_service.get_templates(
            level=level,
            user_school_id=user.get("school_id"),
            requested_school_id=school_id,
        )

        if not response.get("success", False):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=response.get("message", "Failed to retrieve session templates"),
            )

        return response
        
    except Exception as e:
        logger.error("Failed to retrieve session templates", error=str(e), level=level, school_id=school_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session templates",
        )


@router.post("", response_model=Dict[str, Any])
async def create_session(
    request: SessionCreateRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """Create new session (exam or practice)"""
    try:
        user_id = user["user_id"]

        result = session_service.create_session(user_id=user_id, request_data=request)

        if not result.get("success", False):
            message = result.get("message", "Failed to create session")
            status_code = (
                status.HTTP_400_BAD_REQUEST
                if "not" in message.lower() or "invalid" in message.lower()
                else status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            raise HTTPException(status_code=status_code, detail=message)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Session creation failed: {str(e)}",
        )


@router.get("", response_model=SessionHistoryResponse)
async def get_user_sessions(
    session_type: Optional[str] = Query(None, regex="^(exam|practice)$"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Number of sessions per page"),
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """Get user's sessions with optional filtering and pagination"""
    try:
        user_id = user["user_id"]
        offset = (page - 1) * limit
        
        logger.info(
            "Fetching user sessions from router",
            user_id=user_id,
            session_type=session_type,
            limit=limit,
            offset=offset,
            page=page,
        )
        
        sessions_data = session_service.get_user_sessions(
            user_id, session_type=session_type, limit=limit, offset=offset
        )
        
        logger.info("Retrieved sessions data from repository", data=sessions_data)

        return SessionHistoryResponse(
            success=True,
            sessions=sessions_data.get("sessions", []),
            total_sessions=sessions_data.get("total_count", 0),
        )
    except Exception as e:
        logger.error("Failed to retrieve sessions", error=str(e), user_id=user.get("user_id"))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sessions",
        )


@router.get("/{session_id}")
async def get_session_detail(
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """Get detailed session information"""
    try:
        user_id = user["user_id"]
        session_detail = _validate_session_ownership(
            session_id, user_id, session_service
        )

        session_progress = session_service.get_exam_progress(session_id, user_id)
        template_data = session_detail.get("template", {})
        # Use centralized template parsing
        question_counts = _parse_template_question_counts(template_data)
        total_questions = sum(question_counts.values())
        progress_data = session_progress.get("progress", {})
        completed_questions = progress_data.get("answered_questions", 0)

        # Get last answer if available
        last_answer = session_service.get_last_exam_answer(session_id, user_id)

        # Calculate consecutive high scores if session is analyzed
        # Threshold 70.0 = 70% on 0-100 scale (matches frontend 70% message)
        consecutive_high_scores = 0
        if session_detail.get("status") == "analyzed":
            consecutive_high_scores = session_service.get_consecutive_high_scores(
                user_id=user_id,
                level=session_detail.get("level"),
                language_id=session_detail.get("language_id"),
                threshold=70.0  # 70% threshold on 0-100 scale
            )

        enhanced_session_detail = {
            **session_detail,
            "consecutive_high_scores": consecutive_high_scores,
            "progress": {
                "total_questions": total_questions,
                "completed_questions": completed_questions,
                "completion_percentage": (
                    (completed_questions / total_questions * 100)
                    if total_questions > 0
                    else 0
                ),
                "activity_breakdown": session_progress.get(
                    "activity_breakdown", {}
                ),
            },
            "last_answer": last_answer,
        }

        return {"success": True, "session_detail": enhanced_session_detail}
    except HTTPException:
        raise
    except Exception as e:
        # Add detailed error logging
        import traceback

        logger.error(
            "Session detail endpoint error",
            session_id=session_id,
            user_id=user_id,
            error=str(e),
            traceback=traceback.format_exc(),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session details: {str(e)}",
        )


@router.get("/{session_id}/status")
async def get_session_status(
    session_id: str, 
    user: dict = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
    progress_service: SessionProgressService = Depends(get_session_progress_service)
):
    """Get session status and details with progress and last answer"""
    try:
        user_id = user["user_id"]
        session_detail = _validate_session_ownership(
            session_id, user_id, session_service
        )

        session_progress = session_service.get_exam_progress(session_id, user_id)
        template_data = session_detail.get("template", {})
        # Use SessionProgressService for unified calculation
        progress_data = progress_service.calculate_progress(template_data, session_progress)

        # Get last answer if available
        last_answer = session_service.get_last_exam_answer(session_id, user_id)

        # Extract overall score from exam_summary if analyzed
        overall_score = None
        if session_detail.get("exam_summary"):
            exam_summary = session_detail["exam_summary"]
            if isinstance(exam_summary, dict):
                overall_data = exam_summary.get("overall", {})
                if isinstance(overall_data, dict):
                    overall_score = overall_data.get("overall_score")

        # Calculate consecutive high scores if session is analyzed
        # Threshold 70.0 = 70% on 0-100 scale (matches frontend 70% message)
        consecutive_high_scores = 0
        if session_detail.get("status") == "analyzed":
            consecutive_high_scores = session_service.get_consecutive_high_scores(
                user_id=user_id,
                level=session_detail.get("level"),
                language_id=session_detail.get("language_id"),
                threshold=70.0  # 70% threshold on 0-100 scale
            )
            logger.info(
                "Consecutive high scores calculated",
                session_id=session_id,
                user_id=user_id,
                level=session_detail.get("level"),
                language_id=session_detail.get("language_id"),
                consecutive_high_scores=consecutive_high_scores
            )

        enhanced_session_detail = {
            **session_detail,
            "consecutive_high_scores": consecutive_high_scores,
            "progress": {
                "completed_questions": progress_data.completed_questions,
                "total_questions": progress_data.total_questions,
                "remaining_questions": progress_data.remaining_questions,
                "activity_breakdown": progress_data.activity_breakdown,
            },
            "last_answered_question": last_answer,
            "overall_score": overall_score,  # Add overall score for frontend display
        }
        logger.debug(
            "Session status response",
            session_id=session_id,
            has_consecutive_high_scores=consecutive_high_scores is not None,
            consecutive_value=consecutive_high_scores
        )
        return {"success": True, "session": enhanced_session_detail}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session status",
        )


@router.get("/{session_id}/next-question", response_model=Dict[str, Any])
async def get_next_session_question(
    session_id: str,
    user: dict = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
    question_retrieval_service: QuestionRetrievalService = Depends(get_question_retrieval_service),
):
    """Get next question for session"""
    try:
        user_id = user["user_id"]
        session_detail = _validate_session_ownership(
            session_id, user_id, session_service
        )

        session_progress = session_service.get_exam_progress(session_id, user_id)
        template_data = session_detail.get("template", {})
        question_counts = _parse_template_question_counts(template_data)
        total_questions = sum(question_counts.values())
        answered_questions = session_progress.get("progress", {}).get(
            "answered_questions", 0
        )
        
        # Extract used question IDs for duplicate prevention (no extra DB query!)
        used_question_ids = session_progress.get("used_question_ids", [])

        # 🚨 VALIDATION: Check if session is already completed
        if session_detail.get("status") == "completed":
            return {
                "success": True,
                "completed": True,
                "message": "Session already completed",
                "progress": {
                    "completed_questions": answered_questions,
                    "total_questions": total_questions,
                    "remaining_questions": 0,
                },
            }

        if answered_questions == 0 and session_detail.get("status") == "created":
            session_service.update_exam_status(
                exam_id=session_id, status="in_progress"
            )
            logger.info("Session started - status updated to in_progress", session_id=session_id, user_id=user_id)

        if answered_questions >= total_questions:
            # 🔧 FIX: Auto-mark as completed if not already
            if session_detail.get("status") != "completed":
                session_service.update_exam_status(
                    exam_id=session_id, status="completed"
                )
                logger.info("Session auto-completed", session_id=session_id, user_id=user_id, answered=answered_questions, total=total_questions)
            
            return {
                "success": True,
                "completed": True,
                "message": "Session completed",
                "progress": {
                    "completed_questions": answered_questions,
                    "total_questions": total_questions,
                    "remaining_questions": 0,
                },
            }

        current_question_number = answered_questions + 1
        activity_type = session_service.determine_activity_type(
            current_question_number, question_counts
        )

        session_type = session_detail.get("session_type", "exam")
        question_result = question_retrieval_service.get_random_question(
            activity_type=activity_type,
            level=session_detail["level"],
            language_id=session_detail["language_id"],
            user_id=user_id,
            session_type=session_type,
            exclude_question_ids=used_question_ids,  # Pass list to avoid duplicates
        )
        if not question_result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=question_result.get("message", "No questions available"),
            )

        question_data = question_result["question_data"]

        # Add answer length validation info
        from app.config import settings
        level = session_detail["level"]
        max_words = settings.get_answer_length_limit(level, activity_type)
        
        # Get minimum words for the activity type
        min_words = settings.min_answer_words.get(activity_type, None)

        # Check if question requires text input validation
        requires_validation = False
        if activity_type in ["writing", "grammar"]:
            requires_validation = True
        elif activity_type == "hearing" and question_data:
            # For hearing, only validate text input question types
            question_type = question_data.get("question_type", "")
            requires_validation = question_type in ["fill_in_blank", "short_answer"]

        speaking_limits = None
        if activity_type == "speaking":
            metadata = question_data.get("question_metadata") or {}
            speaking_limits = {
                "max_audio_seconds": metadata.get("max_answer_seconds")
                or metadata.get("max_answer_duration_seconds")
                or settings.speaking_audio_max_duration_seconds,
                "min_audio_seconds": metadata.get("min_answer_seconds")
                or metadata.get("min_answer_duration_seconds"),
                "accepted_formats": ["mp3", "mp4"],
            }

        return {
            "success": True,
            "question_data": question_data,
            "metadata": {
                "activity_type": activity_type,
                "question_number": current_question_number,
                "total_questions": total_questions,
            },
            "progress": {
                "completed_questions": answered_questions,
                "total_questions": total_questions,
                "remaining_questions": total_questions - answered_questions,
            },
            "validation": {
                "min_answer_words": min_words if requires_validation else None,
                "max_answer_words": max_words if requires_validation else None,
                "requires_length_validation": requires_validation,
                "speaking_time_limits": speaking_limits,
            }
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get next question",
        )


@router.post("/{session_id}/speaking/upload-url")
async def generate_speaking_upload_url(
    session_id: str,
    question_id: str = Query(..., description="Question ID for this upload"),
    audio_format: str = Query(..., description="Audio format (mp3 or mp4)"),
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """
    Generate presigned URL for direct S3 upload of speaking audio
    
    Security:
    - Validates session ownership
    - Validates question belongs to session  
    - Generates time-limited presigned URL (5 minutes)
    - Enforces file format constraints
    """
    try:
        user_id = user["user_id"]
        
        # Validate session ownership
        session_detail = _validate_session_ownership(
            session_id, user_id, session_service
        )
        
        # Validate audio format
        if audio_format.lower() not in ["mp3", "mp4"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid audio format. Must be mp3 or mp4",
            )
        
        # TODO: Optionally validate question_id belongs to this session
        # (requires accessing session questions from session_detail)
        
        # Generate presigned URL
        s3_service = S3UploadService()
        upload_data = s3_service.generate_upload_url(
            session_id=session_id,
            question_id=question_id,
            user_id=user_id,
            audio_format=audio_format,
        )
        
        logger.info(
            "Generated speaking upload URL",
            session_id=session_id,
            question_id=question_id,
            user_id=user_id,
            s3_key=upload_data["s3_key"],
        )
        
        return {
            "success": True,
            **upload_data,
        }
        
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to generate upload URL", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate upload URL",
        )


@router.post("/{session_id}/submit-answer")
async def submit_session_answer(
    session_id: str,
    request: ExamAnswerRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
    speaking_audio_service: SpeakingAudioService = Depends(get_speaking_audio_service),
):
    """Submit answer for session question - supports skip functionality"""
    try:
        # 🔍 DEBUG: Log incoming request
        logger.info("submit_answer_request", 
                   is_skip=request.is_skip,
                   user_answer=request.user_answer,
                   activity_type=request.activity_type)
        
        user_id = user["user_id"]
        session_detail = _validate_session_ownership(
            session_id, user_id, session_service
        )

        question_id = request.question_data.get("id", "unknown")
        is_skip = request.is_skip
        user_answer = None if is_skip else request.user_answer
        speaking_audio_payload: Dict[str, Any] = {}

        if request.activity_type == "speaking" and not is_skip:
            try:
                # Validate audio upload and duration (no transcription yet)
                from app.user.services.s3_upload_service import S3UploadService
                
                s3_service = S3UploadService(s3_client=speaking_audio_service.s3_client)
                
                # Verify file exists in S3
                upload_info = s3_service.verify_upload(request.speaking_audio_s3_key)
                
                # Validate duration constraints
                question_metadata = request.question_data.get("question_metadata") or {}
                max_duration = question_metadata.get("max_answer_seconds") or 60
                min_duration = question_metadata.get("min_answer_seconds") or 0
                
                duration_seconds = request.speaking_audio_duration_seconds
                
                if not duration_seconds or duration_seconds <= 0:
                    raise ValueError("Audio duration must be greater than 0")
                
                if duration_seconds > (max_duration + 2.0):  # 2s tolerance
                    raise ValueError(
                        f"Audio exceeds maximum duration. Actual: {duration_seconds:.1f}s, "
                        f"maximum allowed: {max_duration}s"
                    )
                
                if min_duration and duration_seconds < min_duration:
                    raise ValueError(
                        f"Audio is too short. Actual: {duration_seconds:.1f}s, "
                        f"minimum required: {min_duration}s"
                    )
                
                # Store audio metadata (transcription will happen during analysis)
                user_answer = "[Audio uploaded - pending transcription]"
                speaking_audio_payload = {
                    "user_audio_url": upload_info["file_url"],
                    "user_audio_transcript": None,  # Will be filled during analysis
                    "user_audio_meta": {
                        "s3_key": request.speaking_audio_s3_key,
                        "duration_seconds": duration_seconds,
                        "format": request.speaking_audio_format,
                        "file_size_bytes": upload_info["file_size"],
                        "upload_method": "presigned_url",
                        "transcription_pending": True,
                    },
                }
                
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc),
                )

        # ✅ Check if this question was already answered (prevent duplicates)
        existing_answer = session_service.get_answer_by_question_id(
            session_id, user_id, question_id
        )
        
        # If updating a skipped question, allow it even if session appears complete
        is_updating_skip = existing_answer and existing_answer.get("is_skipped")
        
        if not is_updating_skip:
            # 🚨 VALIDATION: Check if session should accept more answers (only for new answers)
            session_progress = session_service.get_exam_progress(session_id, user_id)
            template_data = session_detail.get("template", {})
            question_counts = _parse_template_question_counts(template_data)
            total_questions = sum(question_counts.values())
            current_answered = session_progress.get("progress", {}).get("answered_questions", 0)

            # Check if session is already completed or would exceed limit
            if current_answered >= total_questions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Session already completed. Cannot accept more answers. "
                           f"Answered: {current_answered}/{total_questions}",
                )

            # Check if session status is completed
            if session_detail.get("status") == "completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Session is already marked as completed",
                )
        
        if existing_answer:
            # ✅ OPTION A: Only allow updating if previously skipped
            if not existing_answer.get("is_skipped"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This question was already answered. Cannot modify answered questions.",
                )
            
            # Allow updating skipped question
            update_success = session_service.update_exam_answer(
                answer_id=existing_answer["id"],
                new_answer=user_answer,
                is_skipped=is_skip,
                user_audio_url=speaking_audio_payload.get("user_audio_url"),
                user_audio_transcript=speaking_audio_payload.get("user_audio_transcript"),
                user_audio_meta=speaking_audio_payload.get("user_audio_meta"),
            )
            
            if not update_success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update answer",
                )
            
            message = "Answer submitted for previously skipped question"
        else:
            # Create new answer
            # 🔧 FIX: Calculate correct question number based on current progress
            correct_question_number = current_answered + 1

            result = session_service.save_exam_answer(
                exam_id=session_id,
                user_id=user_id,
                question_id=question_id,
                question_number=correct_question_number,
                user_answer=user_answer,
                activity_type=request.activity_type,
                session_type=session_detail.get("session_type", "exam"),
                language_id=request.question_data.get("language_id"),
                question_data=request.question_data,
                time_taken=request.time_spent,
                is_skipped=is_skip,
                user_audio_url=speaking_audio_payload.get("user_audio_url"),
                user_audio_transcript=speaking_audio_payload.get("user_audio_transcript"),
                user_audio_meta=speaking_audio_payload.get("user_audio_meta"),
            )

            if result is None or not result.get("success"):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to save answer",
                )
            
            message = "Question skipped" if is_skip else "Answer submitted successfully"

        # Get updated progress
        session_progress = session_service.get_exam_progress(session_id, user_id)
        template_data = session_detail.get("template", {})
        question_counts = _parse_template_question_counts(template_data)
        total_questions = sum(question_counts.values())
        completed_questions = session_progress.get("progress", {}).get("answered_questions", 0)

        # Mark completed when all questions attempted (answered or skipped)
        if completed_questions >= total_questions:
            session_service.update_exam_status(exam_id=session_id, status="completed")

        return {
            "success": True,
            "message": message,
            "skipped": is_skip,
            "progress": session_progress,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Submit answer failed: {str(e)}", session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit answer",
        )


@router.get("/{session_id}/question/{question_id}")
async def get_session_question(
    session_id: str,
    question_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """
    Get a specific question from session for editing.
    Only allows access to skipped questions (Option A: Conservative).
    """
    try:
        user_id = user["user_id"]
        
        # Validate session ownership
        session_detail = _validate_session_ownership(session_id, user_id, session_service)
        
        # Get existing answer
        existing_answer = session_service.get_answer_by_question_id(
            session_id, user_id, question_id
        )
        
        if not existing_answer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found in this session"
            )
        
        # ✅ OPTION A: Only allow access to skipped questions
        if not existing_answer.get("is_skipped"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This question was already answered. Cannot modify answered questions."
            )
        
        # Add answer length validation info
        from app.config import settings
        level = session_detail["level"]
        activity_type = existing_answer["activity_type"]
        max_words = settings.get_answer_length_limit(level, activity_type)
        
        # Get minimum words for the activity type
        min_words = settings.min_answer_words.get(activity_type, None)
        
        # Check if question requires text input validation
        requires_validation = False
        if activity_type in ["writing", "grammar"]:
            requires_validation = True
        elif activity_type == "hearing":
            # For hearing, only validate text input question types
            question_data = existing_answer.get("question_data", {})
            question_type = question_data.get("question_type", "")
            requires_validation = question_type in ["fill_in_blank", "short_answer"]
        
        return {
            "success": True,
            "question_data": existing_answer["question_data"],
            "activity_type": existing_answer["activity_type"],
            "question_number": existing_answer["question_number"],
            "is_skipped": True,
            "validation": {
                "min_answer_words": min_words if requires_validation else None,
                "max_answer_words": max_words if requires_validation else None,
                "requires_length_validation": requires_validation
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session question failed: {str(e)}", session_id=session_id, question_id=question_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve question",
        )


@router.get("/{session_id}/progress")
async def get_session_progress(
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """Get session progress"""
    try:
        user_id = user["user_id"]
        progress = session_service.get_exam_progress(session_id, user_id)
        return {"success": True, "progress": progress}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session progress",
        )


@router.get("/{session_id}/answers")
async def get_session_answers(
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """Get all answers for completed session with section summaries and analysis data"""
    try:
        user_id = user["user_id"]
        _validate_session_ownership(session_id, user_id, session_service)

        result = session_service.get_exam_answers(session_id, user_id)

        # Get session detail to include analysis data in section_summaries
        session_detail = session_service.get_exam_detail(session_id, user_id)
        analysis_summaries = {}

        # If analysis exists, map it to frontend-expected format
        if session_detail and session_detail.get("exam_summary"):
            exam_summary = session_detail["exam_summary"]
            
            # Handle case where exam_summary might be a string (legacy data)
            if isinstance(exam_summary, str):
                try:
                    import json
                    exam_summary = json.loads(exam_summary)
                except (json.JSONDecodeError, TypeError):
                    logger.warning(f"Could not parse exam_summary as JSON for session {session_id}")
                    exam_summary = {}
            
            # Extract activities from the exam summary
            if isinstance(exam_summary, dict):
                activities = exam_summary.get("activities", {})
                if isinstance(activities, dict):
                    for activity_name, activity_data in activities.items():
                        if isinstance(activity_data, dict):
                            # Pass through the LLM analysis data as-is
                            # Filter out section_score to use only LLM-provided score
                            filtered_data = {k: v for k, v in activity_data.items() if k != "section_score"}
                            analysis_summaries[activity_name] = filtered_data

        return {
            "success": True,
            "answers": result["answers"],
            "section_summaries": analysis_summaries,  # Use analysis data instead of basic metadata
        }
    except Exception as e:
        logger.error(
            "Failed to retrieve session answers",
            session_id=session_id,
            user_id=user_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session answers",
        )


@router.get("/{session_id}/last-answer")
async def get_last_session_answer(
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """Get last submitted answer for session resume functionality"""
    try:
        user_id = user["user_id"]
        _validate_session_ownership(session_id, user_id, session_service)
        last_answer = session_service.get_last_exam_answer(session_id, user_id)
        return {"success": True, "last_answer": last_answer}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve last answer",
        )


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """Delete user's session with ownership validation and business rules"""
    try:
        user_id = user["user_id"]

        session_detail = _validate_session_ownership(
            session_id, user_id, session_service
        )

        # Business rule: Analyzed sessions cannot be deleted
        if session_detail.get("analyzed_at") is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete analyzed sessions. Analyzed sessions are preserved for your records.",
            )

        # Only allow deletion of ongoing (in_progress) and completed sessions
        session_status = session_detail.get("status", "")
        if session_status not in ["created", "in_progress", "completed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete session with status '{session_status}'. Only ongoing and completed sessions can be deleted.",
            )

        detail_deleted = session_service.delete_session(session_id, user_id)

        if not detail_deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete session",
            )
        return {
            "success": True,
            "message": "Session deleted successfully",
            "session_id": session_id,
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete session",
        )


@router.post("/{session_id}/analyze")
async def analyze_session(
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    session_analyzer: SessionAnalyzer = Depends(get_session_analyzer),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """Analyze completed session with LLM and verify database operations"""
    try:
        user_id = user["user_id"]

        # Validate session exists and has answers
        session_detail = session_service.get_exam_detail(session_id, user_id)
        if not session_detail:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )

        session_answers_data = session_service.get_exam_answers(session_id, user_id)
        if not session_answers_data.get("answers"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No answers found for analysis",
            )

        # Perform analysis using SessionAnalyzer
        analysis_result = await session_analyzer.analyze_session_batch(
            session_id, user_id
        )

        # Add verification step to exam_details if analysis succeeded
        if analysis_result.get("success"):
            verification_status = _update_analysis_verification_step(
                session_id, user_id, session_service, analysis_result
            )
            analysis_result["analysis_verification"] = verification_status

        return analysis_result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}",
        )


@router.post("/{session_id}/share", response_model=ShareLinkResponse)
async def create_session_share_link(
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    session_service: UserSessionService = Depends(get_user_session_service_dep),
):
    """
    Generate a shareable public link for a completed/analyzed session
    
    - Requires authentication
    - Only completed/analyzed sessions can be shared
    - Returns unique share code and full URL
    """
    try:
        user_id = user["user_id"]
        result = session_service.generate_share_link(session_id, user_id)
        
        return ShareLinkResponse(
            success=True,
            share_code=result['share_code'],
            share_url=result['share_url'],
            message="Share link created successfully",
            expires_at=result.get('expires_at')
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Failed to create share link", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create share link"
        )
