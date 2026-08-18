"""
Session Analysis Service - Main orchestrator
Handles complete session analysis workflow using focused services
"""

import structlog
import asyncio
from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum

from .session_validator import SessionValidator
from .session_data_service import SessionDataService
from .activity_analyzer import ActivityAnalyzer
from .transcription_orchestrator import TranscriptionOrchestrator
from app.credit.services import SessionCreditDeduction

logger = structlog.get_logger()


class AnalysisStatus(Enum):
    """Analysis status enumeration"""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class FeedbackType(Enum):
    """Feedback type enumeration"""

    OBJECTIVE = "objective"  # Reading - correct/incorrect + reason
    SUBJECTIVE = "subjective"  # Writing/Grammar - detailed feedback


@dataclass
class AnalysisConfig:
    """Configuration for activity analysis"""

    feedback_type: FeedbackType
    max_tokens: int
    timeout_seconds: int
    requires_detailed_feedback: bool


@dataclass
class ActivityBatchResult:
    """Result from analyzing one activity type"""

    activity_type: str
    individual_feedback: Dict[int, Dict[str, Any]]  # question_number -> feedback
    section_summary: Dict[str, Any]
    processing_time: float
    token_usage: int
    status: AnalysisStatus
    errors: List[str]

    @classmethod
    def success(
        cls,
        activity_type: str,
        individual_feedback: Dict,
        section_summary: Dict,
        processing_time: float,
        token_usage: int,
    ) -> "ActivityBatchResult":
        return cls(
            activity_type=activity_type,
            individual_feedback=individual_feedback,
            section_summary=section_summary,
            processing_time=processing_time,
            token_usage=token_usage,
            status=AnalysisStatus.COMPLETED,
            errors=[],
        )

    @classmethod
    def failed(cls, activity_type: str, error: str) -> "ActivityBatchResult":
        return cls(
            activity_type=activity_type,
            individual_feedback={},
            section_summary={},
            processing_time=0.0,
            token_usage=0,
            status=AnalysisStatus.FAILED,
            errors=[error],
        )


@dataclass
class SessionAnalysisResult:
    """Complete session analysis result with payment gate verification"""

    session_id: str
    status: AnalysisStatus
    activity_results: Dict[str, ActivityBatchResult]  # activity_type -> result
    overall_summary: Dict[str, Any]
    total_processing_time: float
    total_token_usage: int
    errors: List[str]
    payment_verified: bool = False  # NEW: Payment gate enforcement

    def __post_init__(self):
        """SAFEGUARD: Cannot be successful without payment verification"""
        if self.status == AnalysisStatus.COMPLETED and not self.payment_verified:
            logger.error(
                "ANALYSIS_RESULT_INTEGRITY_VIOLATION",
                session_id=self.session_id,
                status=self.status.value,
                payment_verified=self.payment_verified,
                code_violation=True,
                business_impact="Analysis completed without payment verification",
            )
            raise ValueError(
                f"Analysis {self.session_id}: Cannot complete without payment verification"
            )


class SessionAnalyzer:
    """
    SIMPLIFIED Session Analysis Orchestrator
    Coordinates focused services to analyze completed sessions
    """

    def __init__(
        self,
        llm_client: "LangChainLLMClient",
        prompt_manager: "PromptManager",
        session_validator: "SessionValidator",
        session_data_service: "SessionDataService",
        activity_analyzer: "ActivityAnalyzer",
        session_credit_deduction: "SessionCreditDeduction",
        transcription_orchestrator: "TranscriptionOrchestrator",
    ):
        # Initialize focused services from session-analysis domain
        self.llm_client = llm_client
        self.prompt_manager = prompt_manager
        self.validator = session_validator
        self.data_service = session_data_service
        self.activity_analyzer = activity_analyzer
        self.credit_deduction = session_credit_deduction
        self.transcription_orchestrator = transcription_orchestrator

    async def analyze_session_batch(self, session_id: str, user_id: str) -> Dict:
        """
        SIMPLIFIED Main entry point for session analysis

        Returns simple dict instead of complex dataclass
        Preserves all business logic with cleaner implementation
        """
        start_time = asyncio.get_event_loop().time()
        logger.info("Starting session analysis", session_id=session_id, user_id=user_id)

        try:
            # 1. Validate session (PRESERVED business rules)
            validation_result = self.validator.validate_session_for_analysis(
                session_id, user_id
            )
            if not validation_result["success"]:
                return {
                    "success": False,
                    "session_id": session_id,
                    "reason": validation_result["reason"],
                    "processing_time": 0.0,
                }

            session_detail = validation_result["session_detail"]
            session_type = session_detail.get("session_type", "exam")
            level = session_detail.get("level", "A1")
            language_id = session_detail.get("language_id")

            # 1.5. IDEMPOTENCY CHECK: Prevent re-analysis of already analyzed sessions
            current_status = session_detail.get("status")
            if current_status == "analyzed":
                logger.warning(
                    "Session already analyzed - blocking duplicate analysis",
                    session_id=session_id,
                    user_id=user_id,
                    analyzed_at=session_detail.get("analyzed_at"),
                    current_status=current_status
                )
                return {
                    "success": False,
                    "session_id": session_id,
                    "reason": "Session already analyzed. Analysis can only be performed once per session.",
                    "status": current_status,
                    "analyzed_at": session_detail.get("analyzed_at"),
                    "processing_time": 0.0,
                }

            # 2. Get session data (BEFORE credit reservation)
            session_answers = self.data_service.get_session_answers(session_id, user_id)
            if not session_answers:
                return {
                    "success": False,
                    "session_id": session_id,
                    "reason": "No answers found for this session",
                    "processing_time": 0.0,
                }

            # 2.5. ✅ PRE-STEP: Process pending speaking transcriptions
            # This happens BEFORE credit reservation to validate data quality
            # User only pays if transcription succeeds
            logger.info(
                "SESSION_ANALYSIS_TRANSCRIPTION_PRE_STEP",
                session_id=session_id,
                user_id=user_id,
                total_answers=len(session_answers),
            )

            transcription_success, transcription_errors = (
                await self.transcription_orchestrator.process_pending_transcriptions(
                    session_answers=session_answers,
                    session_id=session_id,
                    user_id=user_id,
                )
            )

            if not transcription_success:
                logger.error(
                    "SESSION_ANALYSIS_TRANSCRIPTION_FAILED",
                    session_id=session_id,
                    user_id=user_id,
                    failed_count=len(transcription_errors),
                    errors=transcription_errors,
                )

                return {
                    "success": False,
                    "session_id": session_id,
                    "reason": f"Audio transcription failed. Please re-record your speaking answer(s) and try again.",
                    "processing_time": 0.0,
                    "transcription_errors": transcription_errors,
                }

            logger.info(
                "SESSION_ANALYSIS_TRANSCRIPTION_COMPLETE",
                session_id=session_id,
                user_id=user_id,
            )

            # 2.6. ✅ Check for skipped questions (after transcription)
            skipped_questions = [
                ans
                for ans in session_answers
                if ans.get("is_skipped")
                or not ans.get("user_answer")
                or ans["user_answer"].strip() == ""
            ]

            if skipped_questions:
                skipped_count = len(skipped_questions)
                total_count = len(session_answers)

                logger.warning(
                    "SESSION_ANALYSIS_SKIPPED_QUESTIONS_FOUND",
                    session_id=session_id,
                    user_id=user_id,
                    skipped_count=skipped_count,
                    total_count=total_count,
                    skipped_question_ids=[q.get("question_id") for q in skipped_questions],
                )

                return {
                    "success": False,
                    "session_id": session_id,
                    "reason": f"Cannot analyze: {skipped_count} out of {total_count} questions are still unanswered. Please answer all skipped questions before analysis.",
                    "skipped_count": skipped_count,
                    "total_count": total_count,
                    "processing_time": 0.0,
                }

            # 3. Reserve credits (DATABASE-DRIVEN PRICING)
            # Determine activity_type from session template for accurate credit_rules lookup
            # - Practice: Single activity (reading, writing, grammar, hearing)
            # - Exam: Multiple activities (use "multiple")
            template = session_detail.get("template", {})
            if session_type == "practice":
                # Find the single active activity from template
                activity_type = "any"  # Default fallback
                for activity, count in template.items():
                    if count > 0:
                        activity_type = activity
                        break
            else:
                activity_type = "multiple"
            reservation_result = self.credit_deduction.reserve_credits_and_log(
                user_id=user_id,
                session_type=session_type,
                activity_type=activity_type,
                level=level,
                exam_id=session_id,
                session_id=session_id,
                language_id=language_id,
            )

            if not reservation_result.success:
                logger.error(
                    "Credit reservation failed",
                    session_id=session_id,
                    error=reservation_result.reason,
                )
                return {
                    "success": False,
                    "session_id": session_id,
                    "reason": f"Credit reservation failed: {reservation_result.reason}",
                    "processing_time": 0.0,
                }

            # Store usage_log_id for rollback
            usage_log_id = reservation_result.usage_log_id

            # 4. Group answers by activity (session_answers already validated above)
            grouped_answers = self.data_service.group_answers_by_activity(
                session_answers
            )
            
            logger.info(
                "SESSION_ANALYSIS_ANSWERS_GROUPED",
                session_id=session_id,
                total_answers=len(session_answers),
                activities_found=list(grouped_answers.keys()),
                activity_counts={k: len(v) for k, v in grouped_answers.items()}
            )

            # 5. Activity-specific model selection (V1: Global mappings)
            # NOTE: Admin never uses this endpoint - they use question generation service
            # All sessions here are USER sessions, so no admin detection needed
            
            # Pre-select models for all activities BEFORE parallel execution
            activity_models = {}
            
            # USER: Get activity-specific models from credit_rules table
            logger.info(
                "USER_ANALYSIS_MODEL_SELECTION",
                session_id=session_id,
                activities=list(grouped_answers.keys()),
                language_id=session_detail.get("language_id"),
                level=level
            )
            
            for activity_type, answers in grouped_answers.items():
                if not answers:
                    continue
                activity_mapping = self.data_service.get_model_for_activity(
                    activity_type=activity_type,
                    language_id=session_detail.get("language_id"),  # V1: Ignored (global only)
                    level=level  # V1: Ignored (global only)
                )

                if not activity_mapping:
                    # 🚨 FAIL FAST: No credit rule found for activity
                    logger.error(
                        "CRITICAL: No credit rule found for user analysis",
                        activity_type=activity_type,
                        session_id=session_id,
                        user_id=user_id,
                        language_id=session_detail.get("language_id"),
                        level=level,
                        action_required=f"INSERT INTO credit_rules for {activity_type}",
                        business_impact="User session analysis blocked"
                    )

                    # Rollback credits
                    self.credit_deduction.release_reserved_credits(
                        user_id=user_id,
                        usage_log_id=usage_log_id,
                        reason=f"No model mapping for {activity_type}"
                    )

                    return {
                        "success": False,
                        "session_id": session_id,
                        "reason": f"Activity model not configured for {activity_type}",
                        "processing_time": asyncio.get_event_loop().time() - start_time,
                    }

                activity_models[activity_type] = activity_mapping

            logger.info(
                "USER_ANALYSIS_MODELS_SELECTED",
                session_id=session_id,
                models={k: v["model"] for k, v in activity_models.items()},
                providers={k: v["provider"] for k, v in activity_models.items()}
            )

            # Attach LLM fallback configuration for deterministic activities (short-answer safety)
            deterministic_activities = [
                act for act, mapping in activity_models.items()
                if mapping.get("provider") == "deterministic"
            ]

            llm_fallback_mapping = None
            if deterministic_activities:
                fallback_activity_type = "multiple" if session_type == "exam" else "any"
                llm_fallback_mapping = self.data_service.get_model_for_activity(
                    activity_type=fallback_activity_type,
                    language_id=session_detail.get("language_id"),
                    level=level
                )

                if (
                    llm_fallback_mapping
                    and llm_fallback_mapping.get("provider") != "deterministic"
                ):
                    logger.info(
                        "ATTACHED_LLM_FALLBACK_FOR_DETERMINISTIC_ACTIVITIES",
                        session_id=session_id,
                        deterministic_activities=deterministic_activities,
                        fallback_activity=fallback_activity_type,
                        fallback_model=llm_fallback_mapping.get("model"),
                        fallback_provider=llm_fallback_mapping.get("provider"),
                    )

                    for activity_type in deterministic_activities:
                        activity_models[activity_type] = {
                            **activity_models[activity_type],
                            "llm_fallback_model": llm_fallback_mapping.get("model"),
                            "llm_fallback_provider": llm_fallback_mapping.get("provider"),
                            "llm_fallback_source_activity": fallback_activity_type,
                        }
                else:
                    logger.error(
                        "MISSING_LLM_FALLBACK_FOR_DETERMINISTIC_ACTIVITIES",
                        session_id=session_id,
                        deterministic_activities=deterministic_activities,
                        fallback_activity=fallback_activity_type,
                        fallback_mapping=llm_fallback_mapping,
                        action_required="Ensure credit_rules has an LLM row for fallback activity",
                    )

            # 6. Analyze each activity (PARALLEL PROCESSING)
            activity_results = {}
            total_tokens = 0

            logger.info(
                "SESSION_ANALYSIS_STARTING_PARALLEL_ACTIVITIES",
                session_id=session_id,
                grouped_answers_keys=list(grouped_answers.keys()),
                activity_counts={k: len(v) for k, v in grouped_answers.items()},
                parallel_enabled=True
            )

            # Create parallel analysis tasks with activity-specific models
            analysis_tasks = []
            for activity_type, answers in grouped_answers.items():
                if not answers:
                    logger.warning(
                        "SESSION_ANALYSIS_SKIPPING_EMPTY_ACTIVITY",
                        session_id=session_id,
                        activity_type=activity_type
                    )
                    continue

                # USER: Use pre-selected activity-specific model from credit_rules
                mapping = activity_models[activity_type]
                final_model = mapping["model"]
                provider = mapping["provider"]
                
                logger.info(
                    "USER_ANALYSIS_MODEL_SELECTED",
                    session_id=session_id,
                    activity_type=activity_type,
                    provider=provider,
                    model=final_model,
                    source="credit_rules[merged]"
                )

                # Create coroutine for this activity
                task = self.activity_analyzer.analyze_activity(
                    answers=answers,
                    model_name=final_model,
                    activity_type=activity_type,
                    level=level,
                    exam_detail=session_detail,
                    user_id=user_id,
                    session_id=session_id,
                    activity_mapping=activity_models.get(activity_type),  # Pass database-driven routing info
                )
                analysis_tasks.append((activity_type, answers, task))

            # Execute all tasks in parallel
            if analysis_tasks:
                logger.info(
                    "SESSION_ANALYSIS_EXECUTING_PARALLEL_TASKS",
                    session_id=session_id,
                    task_count=len(analysis_tasks),
                    activities=[task[0] for task in analysis_tasks]
                )

                # Gather all results (return_exceptions=True to handle partial failures)
                results = await asyncio.gather(
                    *[task for _, _, task in analysis_tasks],
                    return_exceptions=True
                )

                # Process results
                for (activity_type, answers, _), result in zip(analysis_tasks, results):
                    # Handle exceptions
                    if isinstance(result, Exception):
                        logger.error(
                            "SESSION_ANALYSIS_ACTIVITY_EXCEPTION",
                            session_id=session_id,
                            activity_type=activity_type,
                            error=str(result),
                            error_type=type(result).__name__
                        )
                        continue

                    # Type guard: ensure result is a dict
                    if not isinstance(result, dict):
                        logger.error(
                            "SESSION_ANALYSIS_INVALID_RESULT_TYPE",
                            session_id=session_id,
                            activity_type=activity_type,
                            result_type=type(result).__name__
                        )
                        continue

                    # Process successful results
                    if result.get("success"):
                        activity_results[activity_type] = result
                        # Estimate tokens for analytics
                        total_tokens += len(str(answers)) // 4
                        
                        logger.info(
                            "SESSION_ANALYSIS_ACTIVITY_SUCCESS",
                            session_id=session_id,
                            activity_type=activity_type,
                            llm_score=result.get("section_summary", {}).get("score", "N/A"),
                            feedback_count=len(result.get("individual_feedback", {}))
                        )
                    else:
                        logger.error(
                            "SESSION_ANALYSIS_ACTIVITY_FAILED",
                            session_id=session_id,
                            activity_type=activity_type,
                            error=result.get("error"),
                            reason=result.get("reason")
                        )

            logger.info(
                "SESSION_ANALYSIS_ALL_PARALLEL_ACTIVITIES_COMPLETED",
                session_id=session_id,
                successful_activities=len(activity_results),
                total_activities=len(grouped_answers),
                activity_results_summary={k: v.get("success", False) for k, v in activity_results.items()},
                parallel_execution=True
            )
            
            # Check if we have any results
            if not activity_results:
                # ✅ EXPLICIT ROLLBACK
                self.credit_deduction.release_reserved_credits(
                    user_id=user_id,
                    usage_log_id=usage_log_id,
                    reason="All activity analyses failed"
                )
                return {
                    "success": False,
                    "session_id": session_id,
                    "reason": "All activity analyses failed",
                    "processing_time": asyncio.get_event_loop().time() - start_time,
                }

            # 6. Generate overall summary (PRESERVED logic)
            overall_summary = self._generate_overall_summary(activity_results, level)
            
            logger.info(
                "SESSION_ANALYSIS_SUMMARY_GENERATED",
                session_id=session_id,
                overall_score=overall_summary.get("overall_score"),
                completed_activities=overall_summary.get("completed_activities"),
                total_activities=overall_summary.get("total_activities")
            )

            # 7. Save results (PRESERVED logic)
            logger.info(
                "SESSION_ANALYSIS_SAVING_RESULTS",
                session_id=session_id,
                activity_results_count=len(activity_results),
                overall_summary_keys=list(overall_summary.keys())
            )
            
            save_success = self.data_service.save_analysis_results(
                session_id, activity_results, overall_summary
            )
            
            if save_success:
                logger.info(
                    "SESSION_ANALYSIS_RESULTS_SAVED_SUCCESS",
                    session_id=session_id
                )
            else:
                logger.error(
                    "SESSION_ANALYSIS_RESULTS_SAVE_FAILED",
                    session_id=session_id
                )
                # ✅ EXPLICIT ROLLBACK
                self.credit_deduction.release_reserved_credits(
                    user_id=user_id,
                    usage_log_id=usage_log_id,
                    reason="Failed to save analysis results"
                )
                return {
                    "success": False,
                    "session_id": session_id,
                    "reason": "Failed to save analysis results",
                    "processing_time": asyncio.get_event_loop().time() - start_time,
                }

            # 8. Update status
            final_status = "analyzed" if save_success else "completed"
            logger.info(
                "SESSION_ANALYSIS_UPDATING_STATUS",
                session_id=session_id,
                final_status=final_status,
                save_success=save_success
            )
            
            status_update_success = self.data_service.update_session_status(session_id, final_status)
            
            if status_update_success:
                logger.info(
                    "SESSION_ANALYSIS_STATUS_UPDATED_SUCCESS",
                    session_id=session_id,
                    new_status=final_status
                )
            else:
                logger.error(
                    "SESSION_ANALYSIS_STATUS_UPDATE_FAILED",
                    session_id=session_id,
                    attempted_status=final_status
                )

            processing_time = asyncio.get_event_loop().time() - start_time

            # 9. Commit credits (PRESERVED logic)
            payment_verified = False
            if save_success:
                # Critical check: Ensure we have usage_log_id
                if not reservation_result.usage_log_id:
                    logger.error(
                        "MISSING_USAGE_LOG_ID_FOR_COMMIT",
                        session_id=session_id,
                        user_id=user_id,
                        reservation_success=reservation_result.success,
                    )
                    return {
                        "success": False,
                        "session_id": session_id,
                        "reason": "Missing usage_log_id for credit commit",
                        "processing_time": processing_time,
                    }

                logger.info(
                    "COMMITTING_CREDITS",
                    session_id=session_id,
                    user_id=user_id,
                    usage_log_id=reservation_result.usage_log_id,
                )

                # Build models_used and evaluation_methods dicts for analytics
                models_used = {}
                evaluation_methods = {}  # Track deterministic vs LLM
                
                # User: Each activity has its own model from activity_models
                for act_type in activity_results.keys():
                    # Check evaluation method first
                    eval_method = activity_results[act_type].get("evaluation_method", "llm")
                    evaluation_methods[act_type] = eval_method
                    
                    if eval_method == "deterministic":
                        models_used[act_type] = "deterministic"  # Mark as rule-based
                    elif act_type in activity_models:
                        models_used[act_type] = activity_models[act_type]["model"]
                    else:
                        models_used[act_type] = "unknown"

                # Calculate cost savings from deterministic evaluation
                deterministic_count = sum(1 for m in evaluation_methods.values() if m == "deterministic")
                estimated_cost_saved = deterministic_count * 0.0015  # ~$0.0015 per GPT-4o-mini call

                commit_result = self.credit_deduction.commit_reserved_credits(
                    user_id=user_id,
                    usage_log_id=reservation_result.usage_log_id,
                    llm_analytics={
                        "total_token_usage": total_tokens,
                        "total_processing_time_ms": int(processing_time * 1000),
                        "activities_processed": len(activity_results),
                        "session_type": session_type,
                        "models_used": models_used,  # Per-activity model tracking
                        "evaluation_methods": evaluation_methods,  # Track deterministic vs LLM
                        "is_admin": False,  # This endpoint is always user
                        "deterministic_activities": deterministic_count,  # Count deterministic evals
                        "estimated_cost_saved_usd": round(estimated_cost_saved, 4)  # Cost savings
                    },
                )
                payment_verified = commit_result.success

                if not payment_verified:
                    logger.error(
                        "CREDIT_COMMIT_FAILED_IN_ANALYZER",
                        session_id=session_id,
                        user_id=user_id,
                        usage_log_id=reservation_result.usage_log_id,
                        commit_reason=commit_result.reason,
                    )

            logger.info(
                "Session analysis completed",
                session_id=session_id,
                success=save_success,
                processing_time=processing_time,
            )

            return {
                "success": save_success,
                "session_id": session_id,
                "activity_results": activity_results,
                "overall_summary": overall_summary,
                "processing_time": processing_time,
                "payment_verified": payment_verified,
            }

        except Exception as e:
            processing_time = asyncio.get_event_loop().time() - start_time
            
            # ✅ EXPLICIT ROLLBACK on any unexpected error
            # Only rollback if we have a usage_log_id (meaning reservation succeeded)
            if 'usage_log_id' in locals() and usage_log_id:
                logger.warning(
                    "Exception during analysis - rolling back credits",
                    session_id=session_id,
                    user_id=user_id,
                    error=str(e)
                )
                self.credit_deduction.release_reserved_credits(
                    user_id=user_id,
                    usage_log_id=usage_log_id,
                    reason=f"Exception: {str(e)}"
                )
            
            logger.error(
                "Session analysis failed with exception",
                session_id=session_id,
                error=str(e),
                error_type=type(e).__name__
            )

            return {
                "success": False,
                "session_id": session_id,
                "reason": str(e),
                "processing_time": processing_time,
            }

    def _generate_overall_summary(self, activity_results: Dict, level: str) -> Dict:
        """Generate overall session summary (SIMPLIFIED)"""
        total_score = 0
        completed_activities = 0

        for activity_type, result in activity_results.items():
            if result.get("success"):
                # Activity scores are now already in 0-100 scale (percentages)
                activity_score = result.get("section_summary", {}).get(
                    "score", 0
                )
                total_score += activity_score
                completed_activities += 1

        # Calculate average - already in percentage scale (0-100)
        avg_score = (
            total_score / completed_activities if completed_activities > 0 else 0
        )

        return {
            "overall_score": round(avg_score, 1),
            "cefr_level_assessment": f"Analysis for {level} level",
            "completed_activities": completed_activities,
            "total_activities": len(activity_results),
        }

