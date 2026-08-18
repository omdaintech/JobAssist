"""
Activity Analyzer Service - Focused LLM analysis only
Handles analysis of individual activity types (reading, writing, grammar)
"""

import structlog
import json
import time
from typing import Dict, List, Tuple, Optional, Any

logger = structlog.get_logger()


class ActivityAnalyzer:
    """
    Focused service for activity analysis
    Handles only LLM analysis logic - no validation or data operations
    """

    def __init__(self, llm_client=None, prompt_manager=None):
        # Accept injected dependencies or import for backward compatibility
        if llm_client is not None:
            self.llm_client = llm_client
        else:
            from app.llm.langchain_client import LangChainLLMClient

            self.llm_client = LangChainLLMClient()

        if prompt_manager is not None:
            self.prompt_manager = prompt_manager
        else:
            from app.llm.prompt_manager import PromptManager

            self.prompt_manager = PromptManager()

        # Activity-specific configs (PRESERVED)
        self.analysis_configs = {
            "reading": {"max_tokens": 1000, "timeout_seconds": 30},
            "writing": {"max_tokens": 2000, "timeout_seconds": 60},
            "grammar": {"max_tokens": 2000, "timeout_seconds": 45},
            "hearing": {"max_tokens": 1500, "timeout_seconds": 45},
            "speaking": {"max_tokens": 2200, "timeout_seconds": 70},
        }

    async def analyze_activity(
        self,
        answers: List[Dict],
        model_name: str,
        activity_type: str,
        level: str,
        exam_detail: Dict,
        user_id: str,
        session_id: Optional[str] = None,
        activity_mapping: Optional[Dict] = None,  # NEW: Pass evaluation method from database
    ) -> Dict:
        """
        Analyze all questions of one activity type together.
        Routes to deterministic evaluator for reading/hearing (cost optimization).
        
        Routing is DATABASE-DRIVEN via activity_mapping parameter:
        - If provider == "deterministic" → Use DeterministicEvaluator
        - If provider == "openai" (or other LLM) → Use LangChainLLMClient
        
        NO HARDCODING of activity types in this method.
        """
        # 🎯 DATABASE-DRIVEN ROUTING: Check provider from activity_mapping
        # activity_mapping comes from credit_rules.evaluation_method via get_model_for_activity()
        from app.config import settings
        use_deterministic = getattr(settings, 'enable_deterministic_evaluation', True)
        
        start_time = time.time()  # Track time for all paths
        
        # Route based on database provider field (not hardcoded activity type)
        if (
            use_deterministic
            and activity_mapping
            and activity_mapping.get("provider") == "deterministic"
        ):
            short_answer_questions = [
                answer
                for answer in answers
                if answer.get("question_data", {}).get("question_type") == "short_answer"
            ]

            if not short_answer_questions:
                logger.info(
                    "ROUTING_TO_DETERMINISTIC_EVALUATOR",
                    activity_type=activity_type,
                    session_id=session_id,
                    user_id=user_id,
                    provider=activity_mapping.get("provider"),
                    model=activity_mapping.get("model"),
                    reason="Database indicates deterministic evaluation",
                    cost_optimization="Skip LLM call, use rule-based evaluation",
                    estimated_savings_usd=0.0015,
                )

                return await self._run_deterministic_analysis(
                    answers=answers,
                    activity_type=activity_type,
                    level=level,
                    exam_detail=exam_detail,
                    user_id=user_id,
                    session_id=session_id,
                    start_time=start_time,
                )

            # Use model from activity_mapping (set in credit_rules.llm_model)
            # Fallback to llm_fallback_model if provided by session_analyzer
            llm_model_name = activity_mapping.get("llm_fallback_model") or activity_mapping.get("model")
            llm_provider = activity_mapping.get("llm_fallback_provider") or activity_mapping.get("provider")

            # Validate LLM model is configured (not "rule-based" placeholder)
            if not llm_model_name or llm_model_name == "rule-based":
                logger.error(
                    "MIXED_EVALUATION_MISSING_LLM_MODEL",
                    activity_type=activity_type,
                    session_id=session_id,
                    user_id=user_id,
                    model=activity_mapping.get("model"),
                    fallback_model=activity_mapping.get("llm_fallback_model"),
                    mapping_provider=activity_mapping.get("provider"),
                    reason="Credit rules missing LLM model for short-answer evaluation in deterministic activity",
                )
                return {
                    "success": False,
                    "activity_type": activity_type,
                    "error": "LLM model not configured for short-answer evaluation",
                    "step_failed": "llm_model_selection",
                }

            logger.info(
                "MIXED_EVALUATION_ROUTE",
                activity_type=activity_type,
                session_id=session_id,
                user_id=user_id,
                short_answer_questions=len(short_answer_questions),
                total_questions=len(answers),
                provider=activity_mapping.get("provider"),
                model=activity_mapping.get("model"),
                llm_model_used=llm_model_name,
                llm_provider_used=llm_provider,
                reason="Short-answer items require LLM evaluation while keeping deterministic savings",
            )

            deterministic_questions = [
                answer for answer in answers if answer not in short_answer_questions
            ]

            return await self._run_mixed_analysis(
                deterministic_questions=deterministic_questions,
                short_answer_questions=short_answer_questions,
                llm_model_name=llm_model_name,
                activity_type=activity_type,
                level=level,
                exam_detail=exam_detail,
                user_id=user_id,
                session_id=session_id,
                start_time=start_time,
            )
        
        # LLM path for other scenarios
        return await self._run_llm_analysis(
            answers=answers,
            model_name=model_name,
            activity_type=activity_type,
            level=level,
            exam_detail=exam_detail,
            user_id=user_id,
            session_id=session_id,
            start_time=start_time,
        )

    def _create_question_mapping(self, answers: List[Dict]) -> Dict[int, int]:
        """Create mapping from activity question order to actual exam question numbers"""
        question_number_mapping = {}

        for i, answer in enumerate(answers):
            raw_question_num = answer.get("question_number", i + 1)
            try:
                actual_question_num = (
                    int(raw_question_num) if raw_question_num is not None else i + 1
                )
            except (ValueError, TypeError):
                logger.warning(
                    "Invalid question number",
                    raw_value=raw_question_num,
                    fallback=i + 1,
                )
                actual_question_num = i + 1

            activity_question_num = i + 1
            question_number_mapping[activity_question_num] = actual_question_num

        return question_number_mapping

    def _build_batch_prompt(
        self, answers: List[Dict], activity_type: str, level: str, exam_detail: Dict
    ) -> Dict[str, str]:
        """Build activity-specific batch prompt (PRESERVED logic)"""
        try:
            logger.info(
                "PROMPT_BUILDING_START",
                activity_type=activity_type,
                level=level,
                answers_count=len(answers),
                exam_detail_keys=list(exam_detail.keys()) if exam_detail else None,
                first_answer_keys=list(answers[0].keys()) if answers else None,
                first_answer_question_data_keys=list(answers[0].get("question_data", {}).keys()) if answers and isinstance(answers[0].get("question_data"), dict) else None
            )
            
            # Load specialized batch analysis prompt via PromptManager
            # Use language_id directly
            language_id = exam_detail.get("language_id", "default_lang")

            try:
                system_prompt = self.prompt_manager.get_prompt_content(
                    activity_type=activity_type,
                    level=level,
                    prompt_type="batch_analysis",
                    language_id=language_id,
                )
            except Exception as prompt_error:
                logger.error(
                    "PROMPT_MANAGER_ERROR",
                    activity_type=activity_type,
                    level=level,
                    language_id=language_id,
                    error=str(prompt_error),
                    error_type=type(prompt_error).__name__
                )
                system_prompt = None

            if not system_prompt:
                logger.warning(
                    "Batch prompt not found via PromptManager",
                    language_id=language_id,
                    activity_type=activity_type,
                    level=level,
                )
                # Use language_id in the fallback prompt
                system_prompt = (
                    f"You are analyzing {activity_type} questions from a "
                    f"CEFR {level} exam (language: {language_id}). "
                    "Analyze ALL questions together and provide detailed feedback."
                )

            # Build user prompt with all answers
            user_prompt = (
                f"Please analyze these {len(answers)} {activity_type} questions "
                f"from a {level}-level exam (language: {language_id}):\n\n"
            )

            for i, answer in enumerate(answers, 1):
                try:
                    question_num = answer.get("question_number", i)
                    question_data = answer.get("question_data", {})
                    
                    # 🛡️ SAFETY CHECK: Skip speaking questions without transcripts
                    # This should never happen (transcription is pre-step), but defensive coding
                    if activity_type == "speaking":
                        user_audio_transcript = answer.get("user_audio_transcript")
                        if not user_audio_transcript or not user_audio_transcript.strip():
                            logger.error(
                                "SPEAKING_QUESTION_MISSING_TRANSCRIPT",
                                activity_type=activity_type,
                                question_num=question_num,
                                question_id=question_data.get("id"),
                                reason="Transcript should exist after transcription pre-step",
                                action="Skipping question from analysis",
                            )
                            # Skip this question - don't include in prompt
                            continue
                    
                    user_prompt += f"=== Question {question_num} ===\n"

                    # Add question data with safe string conversion
                    if isinstance(question_data, dict) and question_data:
                        if question_data.get("question"):
                            user_prompt += f"Question: {str(question_data['question'])}\n"
                        if question_data.get("instruction"):
                            user_prompt += f"Instruction: {str(question_data['instruction'])}\n"
                        if question_data.get("prompt") and question_data.get("prompt") != question_data.get("question"):
                            user_prompt += f"Prompt: {str(question_data['prompt'])}\n"
                        if question_data.get("text"):
                            user_prompt += f"Text: {str(question_data['text'])}\n"
                        if question_data.get("transcript"):
                            user_prompt += f"Audio Transcript: {str(question_data['transcript'])}\n"
                        elif question_data.get("audio_url"):
                            user_prompt += (
                                "Audio URL provided (model cannot access audio). "
                                "If transcript is missing, explain this and set needs_transcript=true.\n"
                            )
                        if question_data.get("options"):
                            # Handle options safely - could be list or string
                            options = question_data['options']
                            if isinstance(options, list):
                                user_prompt += f"Options: {', '.join(str(opt) for opt in options)}\n"
                            else:
                                user_prompt += f"Options: {str(options)}\n"
                    else:
                        user_prompt += f"Question Data: {str(question_data)}\n"

                    # Add user's answer with safe string conversion
                    user_answer = answer.get("user_answer", "No answer provided")
                    user_prompt += f"Student Answer: {str(user_answer)}\n"

                    # Add correct answer if available
                    correct_answer = answer.get("correct_answer")
                    if not correct_answer and question_data:
                        correct_answer = question_data.get("correct_answer")
                    if correct_answer:
                        user_prompt += f"Correct Answer: {str(correct_answer)}\n"

                    user_audio_transcript = answer.get("user_audio_transcript")
                    if user_audio_transcript:
                        user_prompt += f"Learner Spoken Transcript (auto): {str(user_audio_transcript)}\n"

                    user_audio_meta = answer.get("user_audio_meta")
                    if user_audio_meta:
                        try:
                            user_prompt += f"Learner audio metrics: {json.dumps(user_audio_meta)}\n"
                        except Exception:
                            user_prompt += f"Learner audio metrics: {str(user_audio_meta)}\n"

                    if answer.get("user_audio_url"):
                        user_prompt += "User audio reference stored in S3 (not accessible to you). Use transcript + metrics.\n"

                    user_prompt += "\n"
                    
                except Exception as question_error:
                    logger.error(
                        "PROMPT_BUILDING_QUESTION_ERROR",
                        activity_type=activity_type,
                        question_index=i,
                        question_data_keys=list(question_data.keys()) if isinstance(question_data, dict) else None,
                        answer_keys=list(answer.keys()) if isinstance(answer, dict) else None,
                        error=str(question_error),
                        error_type=type(question_error).__name__
                    )
                    # Continue with next question instead of failing completely
                    user_prompt += f"=== Question {i} ===\n"
                    user_prompt += f"[Error processing question data: {str(question_error)}]\n\n"
                    continue

            user_prompt += (
                f"\nPlease provide comprehensive batch analysis following "
                f"the format specified in your instructions for {activity_type} "
                f"at {level} level."
            )
            
            # 🛡️ SAFETY CHECK: Ensure we have actual questions to analyze
            # If all questions were skipped (e.g., missing transcripts), fail fast
            question_count = user_prompt.count("=== Question")
            if question_count == 0:
                logger.error(
                    "PROMPT_BUILDING_NO_VALID_QUESTIONS",
                    activity_type=activity_type,
                    level=level,
                    original_answer_count=len(answers),
                    reason="All questions skipped during prompt building",
                )
                # Return empty dict to signal failure to caller
                return {}

            return {"system": system_prompt, "user": user_prompt}

        except Exception as e:
            logger.error(
                "PROMPT_BUILDING_FAILED_WITH_EXCEPTION",
                activity_type=activity_type,
                level=level,
                answers_count=len(answers),
                error=str(e),
                error_type=type(e).__name__,
                exam_detail_keys=list(exam_detail.keys()) if exam_detail else []
            )
            
            # Enhanced fallback prompt with JSON instructions
            logger.warning(
                "PROMPT_BUILDING_USING_FALLBACK_PROMPT",
                activity_type=activity_type,
                level=level
            )
            
            system_prompt = (
                f"You are analyzing {activity_type} questions from a CEFR {level} exam. "
                f"Return ONLY valid JSON in this exact format: "
                f'{{"individual_feedback": {{"1": {{"quality": "Poor/Ok/Good/Perfect", "score": 0, "explanation": "..."}}}}, '
                f'"section_summary": {{"quality": "Poor/Ok/Good/Perfect", "strengths": "...", "improvements": "..."}}}}'
            )
            user_prompt = f"Analyze these {len(answers)} questions and provide feedback in JSON format."
            return {
                "system": system_prompt,
                "user": user_prompt,
            }

    def _parse_json_response(
        self, response: str, activity_type: str, question_number_mapping: Dict[int, int]
    ) -> Tuple[Dict[int, Dict], Dict]:
        """Parse LLM response as JSON (PRESERVED logic)"""
        try:
            # Log raw response for debugging
            logger.info(
                "Parsing LLM response", 
                activity_type=activity_type,
                response_length=len(response),
                response_preview=response[:200] + "..." if len(response) > 200 else response
            )
            
            # Clean response
            clean_response = response.strip()

            # Remove markdown code blocks
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            elif clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]

            clean_response = clean_response.strip()

            # Parse JSON
            parsed_response = json.loads(clean_response)

            # Validate structure
            if (
                isinstance(parsed_response, dict)
                and "individual_feedback" in parsed_response
                and "section_summary" in parsed_response
            ):
                # Map question numbers (PRESERVED logic)
                individual_feedback = {}
                for question_key, feedback_data in parsed_response[
                    "individual_feedback"
                ].items():
                    try:
                        # Handle both "9" and "Question 9" formats
                        if isinstance(question_key, str) and question_key.lower().startswith("question "):
                            # Extract number from "Question 9" format
                            activity_question_num = int(question_key.split()[-1])
                        else:
                            activity_question_num = int(question_key)

                        if (
                            question_number_mapping
                            and activity_question_num in question_number_mapping
                        ):
                            actual_question_num = question_number_mapping[
                                activity_question_num
                            ]
                            individual_feedback[actual_question_num] = feedback_data
                        else:
                            individual_feedback[activity_question_num] = feedback_data

                    except (ValueError, TypeError, IndexError):
                        logger.warning("Invalid question key", key=question_key, activity_type=activity_type)

                section_summary = parsed_response["section_summary"]
                section_summary["parsing_success"] = True

                logger.info(
                    "JSON parsing successful",
                    activity_type=activity_type,
                    questions_parsed=len(individual_feedback),
                )
                return individual_feedback, section_summary
            else:
                logger.warning(
                    "JSON missing required structure", activity_type=activity_type
                )
                return {}, {"parsing_success": False}

        except json.JSONDecodeError as e:
            logger.warning(
                "JSON parsing failed",
                activity_type=activity_type,
                error=str(e),
                raw_response=clean_response[:500] + "..." if len(clean_response) > 500 else clean_response,
                response_length=len(clean_response)
            )
            return {}, {"parsing_success": False}

    async def _run_deterministic_analysis(
        self,
        answers: List[Dict],
        activity_type: str,
        level: str,
        exam_detail: Dict,
        user_id: str,
        session_id: Optional[str],
        start_time: float,
    ) -> Dict:
        try:
            from app.llm.deterministic_evaluator import DeterministicEvaluator

            evaluator = DeterministicEvaluator()
            result = await evaluator.evaluate_activity(
                answers=answers,
                activity_type=activity_type,
                level=level,
                exam_detail=exam_detail,
                user_id=user_id,
                session_id=session_id,
            )

            logger.info(
                "DETERMINISTIC_EVALUATION_COMPLETE",
                activity_type=activity_type,
                session_id=session_id,
                processing_time=result.get("processing_time"),
                success=result.get("success"),
            )

            if answers and result.get("success"):
                result.setdefault("evaluation_method", "deterministic")

            return result

        except Exception as e:
            logger.error(
                "DETERMINISTIC_EVALUATOR_EXCEPTION",
                activity_type=activity_type,
                session_id=session_id,
                error=str(e),
                error_type=type(e).__name__,
                action="FAILING - no fallback (fail-fast design)",
            )
            return {
                "success": False,
                "activity_type": activity_type,
                "error": f"Deterministic evaluation failed: {str(e)}",
                "processing_time": time.time() - start_time,
            }

    async def _run_llm_analysis(
        self,
        answers: List[Dict],
        model_name: str,
        activity_type: str,
        level: str,
        exam_detail: Dict,
        user_id: str,
        session_id: Optional[str],
        start_time: float,
    ) -> Dict:
        try:
            logger.info(
                "Analyzing activity",
                activity_type=activity_type,
                model=model_name,
                question_count=len(answers),
                evaluation_method="llm",
            )

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_1_PROMPT_BUILDING",
                activity_type=activity_type,
                level=level,
                question_count=len(answers),
            )

            prompt_data = self._build_batch_prompt(
                answers, activity_type, level, exam_detail
            )

            if not prompt_data or not prompt_data.get("system") or not prompt_data.get("user"):
                logger.error(
                    "ACTIVITY_ANALYSIS_STEP_1_FAILED_PROMPT_BUILDING",
                    activity_type=activity_type,
                    prompt_data=prompt_data,
                    error="Prompt building returned empty or invalid data",
                )
                return {
                    "success": False,
                    "activity_type": activity_type,
                    "error": f"Prompt building failed for {activity_type}",
                    "step_failed": "prompt_building",
                    "processing_time": time.time() - start_time,
                }

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_1_SUCCESS",
                activity_type=activity_type,
                system_prompt_length=len(prompt_data["system"]),
                user_prompt_length=len(prompt_data["user"]),
            )

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_2_MAPPING_CREATION",
                activity_type=activity_type,
            )

            question_number_mapping = self._create_question_mapping(answers)

            if not question_number_mapping:
                logger.error(
                    "ACTIVITY_ANALYSIS_STEP_2_FAILED_MAPPING",
                    activity_type=activity_type,
                    answers_count=len(answers),
                    error="Question number mapping creation failed",
                )
                return {
                    "success": False,
                    "activity_type": activity_type,
                    "error": f"Question mapping failed for {activity_type}",
                    "step_failed": "question_mapping",
                    "processing_time": time.time() - start_time,
                }

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_2_SUCCESS",
                activity_type=activity_type,
                mapping_count=len(question_number_mapping),
            )

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_3_CONFIG_LOADING",
                activity_type=activity_type,
            )

            config = self.analysis_configs.get(activity_type, {})
            max_tokens = config.get("max_tokens", 1000)

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_3_SUCCESS",
                activity_type=activity_type,
                max_tokens=max_tokens,
            )

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_4_LLM_CALL_START",
                activity_type=activity_type,
                model_name=model_name,
                max_tokens=max_tokens,
            )

            logger.info(
                "FULL_SYSTEM_PROMPT",
                activity_type=activity_type,
                system_prompt=prompt_data["system"][:500]
                + ("..." if len(prompt_data["system"]) > 500 else ""),
            )
            logger.info(
                "FULL_USER_PROMPT",
                activity_type=activity_type,
                user_prompt=prompt_data["user"][:500]
                + ("..." if len(prompt_data["user"]) > 500 else ""),
            )

            response = await self.llm_client.call_llm(
                system_prompt=prompt_data["system"],
                user_prompt=prompt_data["user"],
                model_name=model_name,
                max_tokens=max_tokens,
                activity_type=activity_type,
                level=level,
                user_id=user_id,
                session_id=session_id,
            )

            if not response or not isinstance(response, str) or len(response.strip()) == 0:
                logger.error(
                    "ACTIVITY_ANALYSIS_STEP_4_FAILED_LLM_CALL",
                    activity_type=activity_type,
                    model_name=model_name,
                    response_type=type(response),
                    response_length=len(response) if response else 0,
                    error="LLM returned empty or invalid response",
                )
                return {
                    "success": False,
                    "activity_type": activity_type,
                    "error": f"LLM call failed for {activity_type} - empty response",
                    "step_failed": "llm_call",
                    "processing_time": time.time() - start_time,
                }

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_4_SUCCESS",
                activity_type=activity_type,
                response_length=len(response),
                model_name=model_name,
            )

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_5_JSON_PARSING_START",
                activity_type=activity_type,
                response_length=len(response),
            )

            individual_feedback, section_summary = self._parse_json_response(
                response, activity_type, question_number_mapping
            )

            parsing_success = section_summary.get("parsing_success", False)

            if not parsing_success or (not individual_feedback and not section_summary):
                logger.error(
                    "ACTIVITY_ANALYSIS_STEP_5_FAILED_JSON_PARSING",
                    activity_type=activity_type,
                    parsing_success=parsing_success,
                    individual_feedback_count=len(individual_feedback)
                    if individual_feedback
                    else 0,
                    section_summary_keys=list(section_summary.keys())
                    if section_summary
                    else [],
                    response_preview=response[:200] + "..."
                    if len(response) > 200
                    else response,
                    error="JSON parsing failed or returned empty results",
                )
                return {
                    "success": False,
                    "activity_type": activity_type,
                    "error": f"JSON parsing failed for {activity_type}",
                    "step_failed": "json_parsing",
                    "raw_response": response[:500] + "..."
                    if len(response) > 500
                    else response,
                    "processing_time": time.time() - start_time,
                }

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_5_SUCCESS",
                activity_type=activity_type,
                individual_feedback_count=len(individual_feedback),
                section_summary_keys=list(section_summary.keys()),
            )

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_6_SCORE_VALIDATION",
                activity_type=activity_type,
            )

            individual_scores = [
                feedback.get("score", 0)
                for feedback in individual_feedback.values()
            ]
            calculated_score = (
                sum(individual_scores) / len(individual_scores)
                if individual_scores
                else 0
            )

            percentage_score = calculated_score * 10

            section_summary["score"] = round(percentage_score, 1)

            logger.info(
                "ACTIVITY_ANALYSIS_STEP_6_SUCCESS",
                activity_type=activity_type,
                calculated_score=calculated_score,
                individual_scores=individual_scores,
            )

            processing_time = time.time() - start_time

            logger.info(
                "ACTIVITY_ANALYSIS_COMPLETED_SUCCESSFULLY",
                activity_type=activity_type,
                processing_time=processing_time,
                individual_feedback_count=len(individual_feedback),
                calculated_score=calculated_score,
                all_steps_completed=True,
            )

            return {
                "success": True,
                "activity_type": activity_type,
                "individual_feedback": individual_feedback,
                "section_summary": section_summary,
                "processing_time": processing_time,
                "evaluation_method": "llm",
                "token_usage": 0,
            }

        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(
                "ACTIVITY_ANALYSIS_UNEXPECTED_EXCEPTION",
                activity_type=activity_type,
                error=str(e),
                error_type=type(e).__name__,
                processing_time=processing_time,
                step_failed="unexpected_exception",
            )

            return {
                "success": False,
                "activity_type": activity_type,
                "error": f"Unexpected error in {activity_type} analysis: {str(e)}",
                "step_failed": "unexpected_exception",
                "processing_time": processing_time,
            }

    async def _run_mixed_analysis(
        self,
        deterministic_questions: List[Dict],
        short_answer_questions: List[Dict],
        llm_model_name: str,
        activity_type: str,
        level: str,
        exam_detail: Dict,
        user_id: str,
        session_id: Optional[str],
        start_time: float,
    ) -> Dict:
        deterministic_result: Optional[Dict] = None

        if deterministic_questions:
            deterministic_result = await self._run_deterministic_analysis(
                answers=deterministic_questions,
                activity_type=activity_type,
                level=level,
                exam_detail=exam_detail,
                user_id=user_id,
                session_id=session_id,
                start_time=start_time,
            )

            if not deterministic_result.get("success"):
                logger.error(
                    "MIXED_EVALUATION_DETERMINISTIC_FAILED",
                    activity_type=activity_type,
                    session_id=session_id,
                    error=deterministic_result.get("error"),
                )
                return deterministic_result

        llm_result = await self._run_llm_analysis(
            answers=short_answer_questions,
            model_name=llm_model_name,
            activity_type=activity_type,
            level=level,
            exam_detail=exam_detail,
            user_id=user_id,
            session_id=session_id,
            start_time=start_time,
        )

        if not llm_result.get("success"):
            logger.error(
                "MIXED_EVALUATION_LLM_FAILED",
                activity_type=activity_type,
                session_id=session_id,
                error=llm_result.get("error"),
            )
            return llm_result

        combined_feedback: Dict[str, Dict] = {}
        if deterministic_result and deterministic_result.get("individual_feedback"):
            combined_feedback.update(deterministic_result["individual_feedback"])
        combined_feedback.update(llm_result.get("individual_feedback", {}))

        combined_summary: Dict[str, Any] = {}
        if deterministic_result and deterministic_result.get("section_summary"):
            combined_summary.update(deterministic_result["section_summary"])
        combined_summary.update(llm_result.get("section_summary", {}))

        individual_scores = [
            feedback.get("score", 0)
            for feedback in combined_feedback.values()
        ]
        calculated_score = (
            sum(individual_scores) / len(individual_scores)
            if individual_scores
            else 0
        )
        percentage_score = calculated_score * 10

        combined_summary["score"] = round(percentage_score, 1)
        combined_summary["parsing_success"] = True
        combined_summary["evaluation_mix"] = {
            "deterministic": len(deterministic_questions),
            "llm": len(short_answer_questions),
        }

        processing_time = time.time() - start_time

        logger.info(
            "MIXED_EVALUATION_COMPLETE",
            activity_type=activity_type,
            session_id=session_id,
            total_questions=len(deterministic_questions) + len(short_answer_questions),
            deterministic_questions=len(deterministic_questions),
            llm_questions=len(short_answer_questions),
            processing_time=processing_time,
        )

        return {
            "success": True,
            "activity_type": activity_type,
            "individual_feedback": combined_feedback,
            "section_summary": combined_summary,
            "processing_time": processing_time,
            "evaluation_method": "llm",
            "token_usage": llm_result.get("token_usage", 0),
        }
