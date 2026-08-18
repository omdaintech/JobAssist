"""
Enhanced AdminQuestionService - Fast FastAPI-compatible implementation
Uses extended PromptManager as single source of truth for ALL prompts
Built for performance and reliability
"""

import asyncio
import time

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta, timezone
import structlog


from app.admin.dependencies import get_admin_repository_dependency
from app.common.models.mysql_models import QuestionBank

logger = structlog.get_logger()


class AdminQuestionService:
    """
    Admin service for bulk question generation and management
    Uses PromptManager as single source of truth for all prompt types
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
        self.admin_repo = get_admin_repository_dependency()
        # Create admin_odm alias for backward compatibility
        self.admin_odm = self.admin_repo

        # Activity configuration - reuse from existing patterns
        self.activity_configs = {
            "reading": {"max_tokens": 1500},
            "writing": {"max_tokens": 1000},
            "grammar": {"max_tokens": 800},
            "hearing": {"max_tokens": 1600},
            "speaking": {"max_tokens": 1400},
        }

    def _parse_date_filter(
        self,
        value: Optional[str],
        *,
        include_end_of_day: bool = False,
    ) -> Optional[datetime]:
        """Parse user-supplied date filters into naive UTC datetimes."""
        if not value:
            return None

        raw_value = value.strip()
        if not raw_value:
            return None

        parsed: Optional[datetime] = None

        try:
            if "T" in raw_value or len(raw_value) > 10:
                parsed = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
            else:
                parsed = datetime.strptime(raw_value, "%Y-%m-%d")
        except ValueError:
            logger.warning("Invalid date filter provided", value=value)
            return None

        if parsed.tzinfo is not None:
            parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

        if include_end_of_day:
            parsed = parsed + timedelta(days=1)

        return parsed

    def _create_mock_admin_odm(self):
        """Create a mock admin_odm object for backward compatibility"""
        class MockAdminODM:
            def __init__(self, admin_repo):
                self.admin_repo = admin_repo
                self.sync_engine = self
                
            def find(self, model_class, condition):
                """Mock find method"""
                return []
                
            def find_one(self, model_class, condition):
                """Mock find_one method"""
                return None
                
            def save(self, obj):
                """Mock save method"""
                return True
                
            def save_question(self, question_data):
                """Mock save question"""
                return {"success": True, "question_id": "mock_id"}
                
            def delete_question_by_id_odm(self, question_id):
                """Mock delete question"""
                return {"success": True}
                
            def bulk_delete_questions_by_ids_odm(self, question_ids):
                """Mock bulk delete"""
                return {"success": True, "deleted_count": len(question_ids)}
                
            def find_questions_filtered_odm(self, filters, skip=0, limit=50):
                """Mock find questions with filters"""
                return {"success": True, "questions": []}
        
        return MockAdminODM(self.admin_repo)

    def _get_admin_model_name(self) -> str:
        """Get LLM model for admin operations (bypasses credit system)"""
        try:
            pricing_pack = self.admin_repo.get_pricing_pack_by_id("pp_admin_ai")
        except Exception as exc:
            logger.error(
                "CRITICAL: Failed to get admin model - FAILING FAST",
                pack_id="pp_admin_ai",
                error=str(exc),
                action_required="Verify admin pricing pack configuration",
            )
            raise

        if not pricing_pack:
            message = "Pricing pack 'pp_admin_ai' returned no data"
            logger.error(
                "CRITICAL: Missing admin pricing pack data",
                pack_id="pp_admin_ai",
            )
            raise ValueError(message)

        model_name = pricing_pack.get("llm_model")
        if not model_name:
            message = "Pricing pack 'pp_admin_ai' has no associated model"
            logger.error(
                "CRITICAL: Admin pricing pack missing model",
                pack_id="pp_admin_ai",
            )
            raise ValueError(message)

        logger.info(
            "Admin model selected from pricing pack",
            model_name=model_name,
            pack_id="pp_admin_ai",
        )
        return model_name

    async def bulk_generate_questions(
        self,
        language_id: str,  # REQUIRED - no fallback
        activity_type: str,
        level: str,
        difficulty_level: str = "medium",
        count: int = 10,
        questions_per_batch: int = 10,  # Changed from questions_per_call
        max_parallel_batches: int = 5,  # New: control parallelism
        admin_id: str = "admin",
    ) -> Dict[str, Any]:
        """
        Generate multiple questions in bulk using parallel LLM calls
        
        Supports up to 50 questions with intelligent batching:
        - Processes in batches of 10 questions (configurable)
        - Runs up to 5 batches in parallel (configurable)
        - Efficiently handles any count from 1-50

        Args:
            language_id: Language ID from master table (required)
            activity_type: Type of activity (reading, writing, grammar, hearing)
            level: CEFR level (A1, A2, B1)
            difficulty_level: Difficulty level within CEFR level
            count: Number of questions to generate (max 50)
            questions_per_batch: Questions per LLM call (default 10)
            max_parallel_batches: Max concurrent LLM calls (default 5)
            admin_id: Admin user ID for tracking

        Returns:
            Dictionary with generation results and statistics
        """
        start_time = time.time()

        # Get actual language info from database
        from app.dependencies import get_core_repository
        core_repo = get_core_repository()
        language_obj = core_repo.get_language_by_id(language_id)

        # Create language_info for response model
        language_info = {
            "id": language_id,
            "name": language_obj.get("name", "") if language_obj else "",
            "native_name": language_obj.get("native_name", "") if language_obj else "",
            "flag_emoji": "",
        }

        logger.info(
            "Starting bulk question generation with parallel processing",
            language_id=language_id,
            activity_type=activity_type,
            level=level,
            difficulty_level=difficulty_level,
            count=count,
            questions_per_batch=questions_per_batch,
            max_parallel_batches=max_parallel_batches,
            admin_id=admin_id,
        )

        # Validate question count (max 50)
        if count > 50:
            return {
                "success": False,
                "message": f"Question count ({count}) exceeds maximum limit of 50",
                "language_info": language_info,
                "activity_type": activity_type,
                "level": level,
                "difficulty_level": difficulty_level,
                "questions_generated": 0,
                "questions_saved": 0,
                "failed_questions": count,
                "generation_time_seconds": 0.0,
                "questions": [],
                "error_details": [
                    f"Question count ({count}) exceeds maximum limit of 50"
                ],
            }

        generated_questions = []
        failed_count = 0
        error_details = []

        try:
            # Get activity configuration
            config = self.activity_configs.get(activity_type)
            if not config:
                raise ValueError(f"Unsupported activity type: {activity_type}")

            # Calculate batches: each batch generates questions_per_batch questions
            # We'll process max_parallel_batches at a time
            num_batches = (count + questions_per_batch - 1) // questions_per_batch
            
            logger.info(
                "Batch calculation",
                total_questions=count,
                questions_per_batch=questions_per_batch,
                num_batches=num_batches,
                max_parallel=max_parallel_batches,
            )

            # Process in chunks of max_parallel_batches
            for chunk_start in range(0, num_batches, max_parallel_batches):
                chunk_end = min(chunk_start + max_parallel_batches, num_batches)
                chunk_num = (chunk_start // max_parallel_batches) + 1
                total_chunks = (num_batches + max_parallel_batches - 1) // max_parallel_batches
                
                logger.info(
                    "Processing parallel chunk",
                    chunk_num=chunk_num,
                    total_chunks=total_chunks,
                    batches_in_chunk=chunk_end - chunk_start,
                )

                # Create parallel tasks for this chunk
                batch_tasks = []
                expected_counts = []
                
                for batch_idx in range(chunk_start, chunk_end):
                    # Calculate how many questions this batch should generate
                    questions_generated_so_far = batch_idx * questions_per_batch
                    remaining = count - questions_generated_so_far
                    batch_count = min(questions_per_batch, remaining)
                    
                    if batch_count <= 0:
                        continue
                    
                    task = self._generate_single_question(
                        language_id,
                        activity_type,
                        level,
                        difficulty_level,
                        batch_count,
                        batch_idx + 1,  # Call number for logging
                        admin_id,
                    )
                    batch_tasks.append(task)
                    expected_counts.append(batch_count)
                    
                    logger.debug(
                        "Created batch task",
                        batch_idx=batch_idx + 1,
                        batch_count=batch_count,
                        questions_so_far=questions_generated_so_far,
                    )

                # Execute all tasks in this chunk in parallel
                batch_results = await asyncio.gather(
                    *batch_tasks, return_exceptions=True
                )

                # Process results from this parallel chunk
                for i, result in enumerate(batch_results):
                    batch_num = chunk_start + i + 1
                    expected_in_batch = expected_counts[i] if i < len(expected_counts) else 0

                    if isinstance(result, Exception):
                        failed_count += expected_in_batch or 1
                        error_msg = f"Batch {batch_num}: {str(result)}"
                        error_details.append(error_msg)
                        logger.warning(
                            "Question batch generation failed",
                            batch_num=batch_num,
                            error=str(result),
                        )
                    elif result and isinstance(result, dict):
                        saved_questions = result.get("saved_questions", [])
                        failed_saves = result.get("failed_saves", 0)
                        save_errors = result.get("save_errors", [])

                        generated_questions.extend(saved_questions)
                        failed_count += failed_saves

                        for err in save_errors:
                            error_details.append(f"Batch {batch_num}: {err}")

                        logger.info(
                            "Question batch generated successfully",
                            batch_num=batch_num,
                            questions_count=len(saved_questions),
                        )
                    elif result and isinstance(result, list):
                        generated_questions.extend(result)
                        logger.info(
                            "Question batch generated successfully",
                            batch_num=batch_num,
                            questions_count=len(result),
                        )
                    else:
                        failed_count += expected_in_batch or 1
                        error_msg = f"Batch {batch_num}: Unknown generation failure"
                        error_details.append(error_msg)

                # Small delay between parallel chunks to be respectful to LLM APIs
                if chunk_end < num_batches:
                    await asyncio.sleep(1)

            generation_time = time.time() - start_time
            total_generated = len(generated_questions)
            failed_questions = max(0, count - total_generated)

            logger.info(
                "Bulk generation completed",
                total_requested=count,
                total_generated=total_generated,
                failed_count=failed_questions,
                generation_time=generation_time,
            )

            return {
                "success": failed_questions == 0,
                "message": (
                    f"Successfully generated {total_generated} out of {count} requested questions"
                    if failed_questions == 0
                    else f"Generated {total_generated} out of {count} requested questions"
                ),
                "language_info": language_info,  # Required LanguageInfo object
                "activity_type": activity_type,
                "level": level,
                "difficulty_level": difficulty_level,  # Required field
                "questions_generated": total_generated,
                "questions_saved": total_generated,
                "failed_questions": failed_questions,
                "generation_time_seconds": round(generation_time, 2),
                "questions": generated_questions,
                "error_details": error_details if error_details else None,
            }

        except Exception as e:
            generation_time = time.time() - start_time
            total_generated = len(generated_questions)
            failed_questions = max(0, count - total_generated)

            logger.error(
                "Bulk generation failed",
                activity_type=activity_type,
                level=level,
                error=str(e),
                generation_time=generation_time,
            )

            return {
                "success": False,
                "message": f"Question generation failed: {str(e)}",
                "language_info": language_info,  # Required LanguageInfo object
                "activity_type": activity_type,
                "level": level,
                "difficulty_level": difficulty_level,  # Required field
                "questions_generated": total_generated,
                "questions_saved": total_generated,
                "failed_questions": failed_questions,
                "generation_time_seconds": round(generation_time, 2),
                "questions": generated_questions,
                "error_details": [str(e)] + error_details,
            }

    async def _generate_single_question(
        self,
        language_id: str,  # Use language_id directly
        activity_type: str,
        level: str,
        difficulty_level: str,
        question_count: int,  # Actual number of questions to generate
        call_num: int,
        admin_id: str,
    ) -> Dict[str, Any]:
        """Generate questions in one LLM call and persist successful results"""

        try:
            # Use PromptManager with language_id - it will resolve internally
            system_prompt_template = self.prompt_manager.get_prompt_content(
                activity_type=activity_type,
                level=level,
                prompt_type="bulk_question",
                language_id=language_id,
            )

            if not system_prompt_template:
                raise ValueError(
                    f"No bulk_question prompt found for language_id {language_id}/{activity_type}/{level}"
                )

            # Generate difficulty instructions - use language_id directly
            difficulty_instruction = self._get_difficulty_instruction(
                difficulty_level, level, language_id
            )
            system_prompt = system_prompt_template.replace(
                "{{difficulty_instructions}}", difficulty_instruction
            )
            # Use the actual question_count parameter
            system_prompt = system_prompt.replace(
                "{{question_count}}", str(question_count)
            )

            # Build simple user request
            mode = "exam assessment (formal, comprehensive)"
            user_prompt = f"Generate for {mode}. This is LLM call #{call_num}. Ensure variety in topics and question types."

            # Get max tokens for activity type
            max_tokens = self.activity_configs[activity_type]["max_tokens"]

            # Get model name for admin (admin bypasses credit system)
            model_name = self._get_admin_model_name()

            # Make LLM call using existing client with model name
            response = await self.llm_client.call_llm(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model_name=model_name,
                activity_type=activity_type,
                level=level,
                max_tokens=max_tokens,
            )

            # Parse JSON response from LLM
            llm_response = self._extract_json_from_response(response)
            if not llm_response:
                raise ValueError("Failed to parse LLM response")

            # Handle case where LLM returns a list directly
            if isinstance(llm_response, list):
                questions_array = llm_response
            elif isinstance(llm_response, dict):
                # Extract questions array from LLM response
                questions_array = llm_response.get("questions", [])
                if not questions_array:
                    # Fallback: if no 'questions' key, treat entire response as single question
                    questions_array = [llm_response]
            else:
                raise ValueError(f"Unexpected LLM response type: {type(llm_response)}")

            # Process and save each individual question as separate row
            saved_questions: List[Dict[str, Any]] = []
            save_failures = 0
            save_errors: List[str] = []
            for individual_question in questions_array:
                # Add metadata to each individual question for flattened structure
                individual_question["activity_type"] = activity_type
                individual_question["level"] = level
                individual_question["difficulty_level"] = difficulty_level
                individual_question["language_id"] = language_id
                individual_question["generated_by_admin"] = admin_id
                individual_question["generation_method"] = "bulk_admin_api"

                if activity_type == "hearing":
                    audio_url = individual_question.get("audio_url")
                    if audio_url in ("", "N/A", "n/a", "none"):
                        individual_question["audio_url"] = None
                    else:
                        individual_question.setdefault("audio_url", None)

                elif activity_type == "speaking":
                    # Speaking questions also support audio_url (for prompts)
                    audio_url = individual_question.get("audio_url")
                    if audio_url in ("", "N/A", "n/a", "none"):
                        individual_question["audio_url"] = None
                    else:
                        individual_question.setdefault("audio_url", None)
                    
                    # Ensure question_type is set for speaking
                    if "question_type" not in individual_question or not individual_question["question_type"]:
                        individual_question["question_type"] = "monologue"

                # Save individual question to database with language_data
                if self.admin_odm:
                    try:
                        save_result = self.admin_repo.save_single_question(
                            individual_question
                        )
                        if save_result and save_result.get("success"):
                            question_id = save_result.get("question_id", "unknown")
                            individual_question["_id"] = question_id
                            saved_questions.append(individual_question)
                            logger.info(
                                "Question saved to database",
                                question_id=question_id,
                                call_num=call_num,
                                activity_type=activity_type,
                                level=level,
                            )
                        else:
                            save_failures += 1
                            error_message = (
                                str(save_result.get("message"))
                                if isinstance(save_result, dict)
                                else "Unknown save failure"
                            )
                            save_errors.append(error_message)
                            logger.error(
                                "Failed to save individual question to database",
                                call_num=call_num,
                                error=error_message,
                                question_data=individual_question,
                            )
                    except Exception as save_error:
                        save_failures += 1
                        error_message = str(save_error)
                        save_errors.append(error_message)
                        logger.error(
                            "Failed to save individual question to database",
                            call_num=call_num,
                            error=error_message,
                            question_data=individual_question,
                        )
                        # Continue with other questions even if one fails
                else:
                    save_failures += 1
                    error_message = "Admin repository is not configured for saving questions"
                    save_errors.append(error_message)
                    logger.error(
                        "Admin repository unavailable; question not saved",
                        call_num=call_num,
                        question_data=individual_question,
                    )

            # Return all saved questions plus save failure metadata
            return {
                "saved_questions": saved_questions,
                "failed_saves": save_failures,
                "save_errors": save_errors,
                "requested_questions": len(questions_array),
            }

        except Exception as e:
            logger.error(
                "Question batch generation failed",
                activity_type=activity_type,
                level=level,
                difficulty_level=difficulty_level,
                call_num=call_num,
                error=str(e),
            )
            raise e

    def _get_difficulty_instruction(
        self, difficulty_level: str, level: str, language_id: str
    ) -> str:
        """Load difficulty-specific instructions from JSON configuration"""
        import json
        import os

        try:
            # Load difficulty instructions from language-specific JSON file
            # Use language_id for directory path (ID-based system)
            config_path = os.path.join(
                "app/llm/prompts", language_id, "difficulty_instructions.json"
            )

            if not os.path.exists(config_path):
                logger.warning(
                    f"Difficulty instructions config not found: {config_path}, using fallback"
                )
                # Fallback to hardcoded values if JSON not found
                if difficulty_level == "difficult":
                    return f"""DIFFICULTY LEVEL: DIFFICULT for {level}
- Use more challenging vocabulary within {level} level
- Create longer, more complex sentences
- Include less familiar but {level}-appropriate topics
- Add subtle nuances and context clues
- Require deeper comprehension and analysis"""
                else:  # standard
                    return f"""DIFFICULTY LEVEL: STANDARD for {level}
- Use core vocabulary appropriate for {level} level
- Create clear, straightforward sentences
- Focus on familiar, everyday topics
- Provide direct context and clear clues
- Test basic comprehension skills"""

            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)

            # Get instruction for specific difficulty and level
            instruction = config.get(difficulty_level, {}).get(level)

            if not instruction:
                logger.warning(
                    f"No instruction found for {difficulty_level}/{level} in {config_path}"
                )
                # Fallback if specific combination not found
                if difficulty_level == "difficult":
                    return f"DIFFICULTY LEVEL: DIFFICULT for {level}\n- Use more challenging content within {level} level"
                else:
                    return f"DIFFICULTY LEVEL: STANDARD for {level}\n- Use standard content for {level} level"

            return instruction

        except Exception as e:
            logger.error(
                f"Failed to load difficulty instructions from JSON",
                error=str(e),
                difficulty_level=difficulty_level,
                level=level,
                language_id=language_id,
            )
            # Final fallback
            return f"DIFFICULTY LEVEL: {difficulty_level.upper()} for {level}"

    def _extract_json_from_response(self, response: str) -> Optional[dict]:
        """Extract JSON object from LLM response with robust error handling"""
        import json
        import re

        try:
            # First, try to find JSON block between ```json and ``` markers
            json_match = re.search(r"```json\s*(\{.*?\})\s*```", response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                logger.debug(
                    "Found JSON in markdown block", json_preview=json_str[:100]
                )
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError as e:
                    logger.warning("JSON in markdown block is malformed", error=str(e))
                    # Try to fix common JSON issues
                    fixed_json = self._attempt_json_fix(json_str)
                    if fixed_json:
                        return fixed_json

            # Try to find any JSON object in the response
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                logger.debug(
                    "Found JSON object in response", json_preview=json_str[:100]
                )
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError as e:
                    logger.warning("Found JSON object is malformed", error=str(e))
                    # Try to fix common JSON issues
                    fixed_json = self._attempt_json_fix(json_str)
                    if fixed_json:
                        return fixed_json

            # If no JSON found, try parsing the entire response as JSON
            logger.debug("Attempting to parse entire response as JSON")
            return json.loads(response.strip())

        except json.JSONDecodeError as e:
            logger.error(
                "Failed to parse JSON from LLM response",
                error=str(e),
                response_preview=response[:200],
            )
            # As a last resort, log the full response for debugging
            logger.debug("Full LLM response for debugging", full_response=response)
            return None
        except Exception as e:
            logger.error("Unexpected error parsing LLM response", error=str(e))
            return None

    def _attempt_json_fix(self, json_str: str) -> Optional[dict]:
        """Attempt to fix common JSON formatting issues and truncated responses"""
        import json
        import re

        try:
            # Common fixes for LLM-generated JSON
            fixed_str = json_str

            # Fix trailing commas before closing braces/brackets
            fixed_str = re.sub(r",\s*}", "}", fixed_str)
            fixed_str = re.sub(r",\s*]", "]", fixed_str)

            # Handle truncated JSON by adding missing closing brackets
            # Count open vs closed braces and brackets
            open_braces = fixed_str.count("{")
            close_braces = fixed_str.count("}")
            open_brackets = fixed_str.count("[")
            close_brackets = fixed_str.count("]")

            # If truncated, try to close open structures
            if open_braces > close_braces or open_brackets > close_brackets:
                logger.info(
                    "Detected truncated JSON, attempting to close open structures"
                )

                # Remove trailing incomplete content (likely cut off)
                # Find the last complete question entry
                last_complete_entry = fixed_str.rfind('"topic":')
                if last_complete_entry > 0:
                    # Find the end of this entry
                    after_topic = fixed_str[last_complete_entry:]
                    # Look for the closing of this question object
                    quote_end = after_topic.find('"', after_topic.find(":") + 1)
                    if quote_end > 0:
                        quote_end_pos = (
                            last_complete_entry
                            + after_topic.find('"', after_topic.find(":") + 1)
                            + 1
                        )
                        # Truncate after this complete entry
                        fixed_str = fixed_str[:quote_end_pos]

                        # Add necessary closing brackets/braces
                        # Close the current question object
                        fixed_str += "\n    }"
                        # Close the questions array
                        fixed_str += "\n  ]"
                        # Close the main object
                        fixed_str += "\n}"

                        logger.info("Reconstructed truncated JSON")

            # Try parsing the fixed JSON
            result = json.loads(fixed_str)
            logger.info("Successfully fixed malformed JSON")
            return result

        except json.JSONDecodeError as e:
            logger.warning("Could not fix malformed JSON", error=str(e))
            return None
        except Exception as e:
            logger.error("Error attempting JSON fix", error=str(e))
            return None

    # ===============================
    # ADMIN QUESTION CRUD METHODS
    # ===============================

    async def get_template_preview(
        self,
        language_id: str,
        activity_type: str,
        level: str,
        difficulty_level: str = "medium",
        count: int = 5,
    ) -> Dict[str, Any]:
        """Get template content with actual parameter substitution for admin UI"""
        try:
            # Use language_id directly for prompts
            logger.info(
                "Getting template preview with parameter substitution",
                language_id=language_id,
                activity_type=activity_type,
                level=level,
                difficulty_level=difficulty_level,
                count=count,
            )

            # Get actual language info from database
            from app.dependencies import get_core_repository
            core_repo = get_core_repository()
            language_obj = core_repo.get_language_by_id(language_id)

            # Use PromptManager as single source of truth for bulk_question templates
            raw_template_content = self.prompt_manager.get_prompt_content(
                activity_type=activity_type,
                level=level,
                prompt_type="bulk_question",
                language_id=language_id,
            )

            if not raw_template_content:
                raise FileNotFoundError(
                    f"Template not found: {language_id}/{activity_type}/{level}/bulk_question"
                )

            # Extract parameters BEFORE substitution
            import re

            # Find all {{param}} patterns but filter out instructional {{ or }}
            all_matches = re.findall(r"\{\{([^{}]+)\}\}", raw_template_content)
            # Only treat as parameters if they're actual parameter names (not instructional text)
            actual_parameters = []
            # Define known instructional patterns to filter out
            instructional_patterns = ["or", "...", "…", "and", "etc"]
            
            for match in all_matches:
                param_name = match.strip()
                # Skip instructional text, empty strings, and patterns that are clearly not parameters
                if param_name in instructional_patterns or not param_name:
                    continue  # This is instructional text, not a parameter
                actual_parameters.append(param_name)

            unique_parameters = list(set(actual_parameters))  # Remove duplicates

            # PARAMETER SUBSTITUTION: Use same logic as actual LLM generation
            substituted_template = raw_template_content

            # 1. Substitute {{difficulty_instructions}} with actual instruction
            if "{{difficulty_instructions}}" in substituted_template:
                # Use language_id directly
                difficulty_instruction = self._get_difficulty_instruction(
                    difficulty_level, level, language_id
                )
                substituted_template = substituted_template.replace(
                    "{{difficulty_instructions}}", f"**{difficulty_instruction}**"
                )

            # 2. Substitute {{question_count}} with actual count
            if "{{question_count}}" in substituted_template:
                substituted_template = substituted_template.replace(
                    "{{question_count}}", f"**{str(count)}**"
                )

            # 3. Leave {{ or }} unchanged - it's instructional text, not a parameter
            # No action needed - it stays as {{ or }} in the output

            # 4. Check for any remaining actual template parameters (not instructional text)
            remaining_matches = re.findall(r"\{\{([^{}]+)\}\}", substituted_template)
            # Filter out instructional text AND empty strings using same patterns as above
            actual_remaining = []
            for match in remaining_matches:
                param_name = match.strip()
                if (
                    param_name not in instructional_patterns and param_name
                ):  # Skip instructional text AND empty strings
                    actual_remaining.append(param_name)

            if actual_remaining:
                raise ValueError(
                    f"Unsubstituted template parameters: {actual_remaining}. "
                    f"System breaks as per requirement - no fallback allowed."
                )

            # Calculate template stats (use substituted content)
            line_count = len(substituted_template.split("\n"))
            word_count = len(substituted_template.split())

            return {
                "success": True,
                "template_content": substituted_template,
                "available_parameters": unique_parameters,
                "template_stats": {
                    "file_path": f"PromptManager: {language_id}/{activity_type}/{level}/bulk_question",
                    "line_count": line_count,
                    "word_count": word_count,
                    "character_count": len(substituted_template),
                },
                "language_info": {
                    "id": language_id,
                    "name": language_obj.get("name", "") if language_obj else "",
                    "native_name": language_obj.get("native_name", "") if language_obj else "",
                    "flag_emoji": ""
                },
                "activity_type": activity_type,
                "level": level,
                "substitution_info": {
                    "difficulty_level": difficulty_level,
                    "count": count,
                    "parameters_substituted": len(unique_parameters)
                    - len(actual_remaining),
                    "parameters_remaining": actual_remaining,
                },
            }

        except Exception as e:
            logger.error(
                "Failed to get template preview with substitution",
                language_id=language_id,
                activity_type=activity_type,
                level=level,
                difficulty_level=difficulty_level,
                count=count,
                error=str(e),
            )
            # Re-raise the exception to ensure system breaks on failure
            raise e

    async def get_questions_with_filters(
        self,
        language_id: Optional[str] = None,  # OPTIONAL - can list all languages
        activity_type: Optional[str] = None,
        level: Optional[str] = None,
        difficulty_level: Optional[str] = None,
        reviewed: Optional[bool] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        skip: int = 0,  # Add pagination parameters
        limit: int = 50,  # Default to 50 per page
    ) -> Dict[str, Any]:
        """Get questions with admin filters - simplified implementation"""
        try:
            # For now, return empty results to avoid breaking the API
            # This can be enhanced later with proper question filtering
            return {
                "success": True,
                "questions": [],
                "total": 0,
                "message": "Question filtering not yet implemented"
            }
            # Optional language resolution - allow listing all questions
            if language_id:
                # Use language_id directly - no resolution needed
                pass  # language_id is already validated by the caller
            
            logger.info(
                "Admin filtering questions",
                language_id=language_id,
                level=level,
            )

            # Build filter query with optional language support
            query = {}

            # Language filtering (optional)
            if language_data:
                query["language_id"] = language_data.get("language_id")

            if activity_type:
                query["activity_type"] = activity_type
            if level:
                query["level"] = level
            if difficulty_level:
                query["difficulty_level"] = difficulty_level

            # Handle reviewed filter separately to combine with other filters
            if reviewed is not None:
                if reviewed:
                    # Only show explicitly reviewed questions
                    query["reviewed"] = True
                else:
                    # Show questions that are either explicitly false or don't have the field
                    # We need to wrap this in $and to combine with other filters
                    reviewed_condition = {
                        "$or": [{"reviewed": False}, {"reviewed": {"$exists": False}}]
                    }
                    # If we have other filters, combine them with $and
                    if len(query) > 0:
                        existing_query = query.copy()
                        query = {"$and": [existing_query, reviewed_condition]}
                    else:
                        query = reviewed_condition

            # Add date filtering
            if date_from or date_to:
                date_filter = {}
                if date_from:
                    try:
                        # Parse date_from and set to start of day
                        from_date = datetime.fromisoformat(
                            date_from.replace("Z", "+00:00")
                        )
                        date_filter["$gte"] = from_date
                    except (ValueError, TypeError):
                        logger.warning("Invalid date_from format", date_from=date_from)

                if date_to:
                    try:
                        # Parse date_to and set to end of day
                        to_date = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
                        # Add 24 hours to include the entire day
                        from datetime import timedelta

                        to_date = to_date + timedelta(days=1)
                        date_filter["$lt"] = to_date
                    except (ValueError, TypeError):
                        logger.warning("Invalid date_to format", date_to=date_to)

                if date_filter:
                    query["created_datetime"] = date_filter

            # Get questions from database using ODM service with validation and pagination
            questions = self.admin_repo.get_questions_by_filters(
                language_id=language,
                activity_type=activity_type,
                level=level,
                limit=limit,
                skip=skip
            )

            # Ensure questions is a list
            if not isinstance(questions, list):
                questions = []

            # Questions from repository are already in dict format
            # Add _id field for compatibility
            for q in questions:
                if "id" in q and "_id" not in q:
                    q["_id"] = q["id"]

            logger.info(
                "Questions retrieved with filters", count=len(questions), language=language
            )

            # For now, use the returned count as total (TODO: implement proper count query)
            total_count = len(questions)
            
            return {
                "success": True,
                "message": f"Retrieved {len(questions)} questions (total: {total_count})",
                "questions": questions,
                "total": total_count,  # Use the total count for pagination
                "language_filter": {
                    "id": language_id
                } if language_id else None,
            }

        except Exception as e:
            logger.error("Failed to get questions with filters", error=str(e))
            return {
                "success": False,
                "message": f"Failed to retrieve questions: {str(e)}",
                "questions": [],
                "total": 0,
            }

    async def modify_question(
        self, question_id: str, update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Modify a question's content"""

        try:

            # Remove None values from update data
            clean_update_data = {k: v for k, v in update_data.items() if v is not None}

            if not clean_update_data:
                return {
                    "success": False,
                    "message": "No valid data provided for update",
                    "question_id": question_id,
                }

            # Add modification timestamp and version increment
            clean_update_data["modified_datetime"] = datetime.utcnow()
            clean_update_data["reviewed"] = False  # Reset review status when modified
            clean_update_data["reviewed_at"] = None
            clean_update_data["reviewed_by"] = None

            # Find and update question directly using sync_engine
            obj_id = question_id
            question_result = self.admin_repo.find_question_by_id(question_id)
            if not question_result.get("found"):
                question = None
            else:
                question = question_result.get("question")

            if not question:
                return {
                    "success": False,
                    "message": "Question not found",
                    "question_id": question_id,
                }

            # Apply updates with validation
            for field, value in clean_update_data.items():
                if hasattr(question, field):
                    setattr(question, field, value)

            # Save question with updated data
            update_result = self.admin_repo.update_question(question_id, clean_update_data)

            logger.info(
                "Question modified",
                question_id=question_id,
                updated_fields=list(clean_update_data.keys()),
            )

            return {
                "success": True,
                "message": "Question updated successfully",
                "question_id": question_id,
            }

        except Exception as e:
            logger.error(
                "Failed to modify question", question_id=question_id, error=str(e)
            )
            return {
                "success": False,
                "message": f"Failed to update question: {str(e)}",
                "question_id": question_id,
            }

    async def delete_question(self, question_id: str) -> Dict[str, Any]:
        """Delete a single question"""

        try:
            # Use the admin repository to delete the question
            result = self.admin_repo.delete_question(question_id)

            if not result.get("success", False):
                return {
                    "success": False,
                    "message": result.get("message", "Failed to delete question"),
                    "question_id": question_id,
                }

            logger.info("Question deleted", question_id=question_id)

            return {
                "success": True,
                "message": "Question deleted successfully",
                "question_id": question_id,
            }

        except Exception as e:
            logger.error(
                "Failed to delete question", question_id=question_id, error=str(e)
            )
            return {
                "success": False,
                "message": f"Failed to delete question: {str(e)}",
                "question_id": question_id,
            }

    async def bulk_delete_questions(self, question_ids: List[str]) -> Dict[str, Any]:
        """Delete multiple questions (up to 100)"""

        try:

            if len(question_ids) > 100:
                return {
                    "success": False,
                    "message": "Cannot delete more than 100 questions at once",
                    "deleted_count": 0,
                }

            

            # Convert string IDs to ObjectIds
            object_ids = []
            for qid in question_ids:
                try:
                    object_ids.append(qid)
                except Exception as e:
                    logger.warning("Invalid question ID", question_id=qid, error=str(e))

            if not object_ids:
                return {
                    "success": False,
                    "message": "No valid question IDs provided",
                    "deleted_count": 0,
                }

            # Bulk delete questions using ODM with validation
            result = self.admin_repo.bulk_delete_questions_by_ids(question_ids)

            # ODM method already includes logging and proper response format
            return result

        except Exception as e:
            logger.error("Failed to bulk delete questions", error=str(e))
            return {
                "success": False,
                "message": f"Failed to delete questions: {str(e)}",
                "deleted_count": 0,
            }

    async def mark_question_reviewed(
        self, question_id: str, reviewed_by: str
    ) -> Dict[str, Any]:
        """Mark a question as reviewed with timestamp"""

        try:
            # Use the admin repository to find and update the question
            result = self.admin_repo.find_question_by_id(question_id)

            if not result.get("success", False) or not result.get("found", False):
                return {
                    "success": False,
                    "message": "Question not found",
                    "question_id": question_id,
                }

            question = result["question"]

            # Get existing metadata or create new dict
            existing_metadata = question.get("question_metadata") or {}

            # Update review information in metadata
            review_data = {
                "reviewed": True,
                "reviewed_at": datetime.utcnow().isoformat(),
                "reviewed_by": reviewed_by
            }

            # Merge with existing metadata
            updated_metadata = {**existing_metadata, **review_data}

            # Update the question using the repository
            update_result = self.admin_repo.update_question(question_id, {"question_metadata": updated_metadata})

            if not update_result.get("success", False):
                return {
                    "success": False,
                    "message": "Failed to update question metadata",
                    "question_id": question_id,
                }

            logger.info(
                "Question marked as reviewed",
                question_id=question_id,
                reviewed_by=reviewed_by,
            )

            return {
                "success": True,
                "message": "Question marked as reviewed",
                "question_id": question_id,
            }

        except Exception as e:
            logger.error(
                "Failed to mark question as reviewed",
                question_id=question_id,
                error=str(e),
            )
            return {
                "success": False,
                "message": f"Failed to mark question as reviewed: {str(e)}",
                "question_id": question_id,
            }

    async def list_available_prompts(self, language_id: str) -> Dict[str, Any]:
        """List all available prompt files in hierarchical structure"""
        try:
            # Use language_id directly
            logger.info(
                "Listing available prompt files",
                language_id=language_id,
            )

            import os

            levels = ["A1", "A2", "B1", "B2"]
            activities = ["reading", "writing", "grammar"]
            prompt_types = [
                {
                    "file": "bulk_question.txt",
                    "type": "bulk_question",
                    "display": "Bulk Question Generation",
                },
                {
                    "file": "batch_analysis.txt",
                    "type": "batch_analysis",
                    "display": "Batch Analysis",
                },
                {
                    "file": "feedback.txt",
                    "type": "feedback",
                    "display": "Practice Feedback",
                },
            ]

            prompts = []

            for level in levels:
                level_data = {"level": level, "activities": {}}

                for activity in activities:
                    activity_files = []

                    for prompt_type in prompt_types:
                        file_path = os.path.join(
                            "app/llm/prompts",
                            language_id,
                            level,
                            f"{activity}_{prompt_type['file']}",
                        )

                        activity_files.append(
                            {
                                "name": f"{activity}_{prompt_type['file']}",
                                "display_name": prompt_type["display"],
                                "type": prompt_type["type"],
                                "exists": os.path.exists(file_path),
                                "file_path": file_path,
                            }
                        )

                    level_data["activities"][activity] = activity_files

                prompts.append(level_data)

            return {"success": True, "language_info": {"id": language_id}, "prompts": prompts}

        except Exception as e:
            logger.error(
                "Failed to list available prompts",
                language_id=language_id,
                error=str(e),
            )
            raise e

    async def get_raw_prompt_content(
        self, language_id: str, level: str, activity: str, prompt_type: str
    ) -> Dict[str, Any]:
        """Get raw prompt content without parameter substitution"""
        try:
            # Use language_id directly
            logger.info(
                "Getting raw prompt content",
                language_id=language_id,
                level=level,
                activity=activity,
                prompt_type=prompt_type,
            )

            import os
            import re

            # Map prompt_type to file suffix
            type_mapping = {
                "bulk_question": "bulk_question.txt",
                "batch_analysis": "batch_analysis.txt",
                "feedback": "feedback.txt",
            }

            if prompt_type not in type_mapping:
                raise ValueError(f"Invalid prompt_type: {prompt_type}")

            file_path = os.path.join(
                "app/llm/prompts",
                language_id,
                level,
                f"{activity}_{type_mapping[prompt_type]}",
            )

            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Prompt file not found: {file_path}")

            # Read raw content (no substitution)
            with open(file_path, "r", encoding="utf-8") as f:
                raw_content = f.read().strip()

            # Extract variables ({{}} patterns)
            variable_matches = re.findall(r"\{\{([^{}]+)\}\}", raw_content)
            variables = []
            for match in variable_matches:
                param_name = match.strip()
                if param_name not in ["or"]:  # Skip instructional text
                    variables.append(param_name)

            unique_variables = list(set(variables))

            # Get example variable values for display
            variable_values = {}
            for var in unique_variables:
                if var == "question_count":
                    variable_values[var] = "5 (example count)"
                elif var == "difficulty_instructions":
                    # Get full instruction (no truncation)
                    sample_instruction = self._get_difficulty_instruction(
                        "difficult", level, language_id
                    )
                    variable_values[var] = sample_instruction
                else:
                    variable_values[var] = f"{{{{ {var} }}}} (dynamic value)"

            # Calculate file stats
            line_count = len(raw_content.split("\n"))
            word_count = len(raw_content.split())

            return {
                "success": True,
                "content": raw_content,
                "variables": unique_variables,
                "variable_values": variable_values,
                "file_stats": {
                    "file_path": file_path,
                    "line_count": line_count,
                    "word_count": word_count,
                    "character_count": len(raw_content),
                },
                "language_info": {"id": language_id},
                "level": level,
                "activity": activity,
                "prompt_type": prompt_type,
            }

        except Exception as e:
            logger.error(
                "Failed to get raw prompt content",
                language_id=language_id,
                level=level,
                activity=activity,
                prompt_type=prompt_type,
                error=str(e),
            )
            raise e

    async def bulk_upload_questions(
        self,
        language_id: str,
        questions_data: List[Dict[str, Any]],
    upload_metadata: Optional[Dict[str, Any]] = None,
    admin_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Upload multiple questions from JSON file
        Reuses same validation and saving logic as bulk generation

        Args:
            language_id: Language ID from master table (required)
            questions_data: List of question dictionaries (same structure as bulk generation)
            upload_metadata: Optional metadata about the upload source
            admin_id: Admin user ID for tracking

        Returns:
            Dictionary with upload results and statistics
        """
        start_time = time.time()

        # Use default admin ID if none provided
        if admin_id is None:
            from app.config import settings

            admin_id = settings.admin_user_id

        # Use language_id directly - no resolution needed
        logger.info(
            "Starting bulk question upload",
            language_id=language_id,
            questions_count=len(questions_data),
            admin_id=admin_id,
            upload_metadata=upload_metadata,
        )

        saved_questions = []
        failed_count = 0
        validation_errors = []
        saved_question_ids = []

        try:
            # Extract activity_type and level from upload_metadata
            activity_type = upload_metadata.get("activity_type") if upload_metadata else None
            level = upload_metadata.get("level") if upload_metadata else None

            # Process each question using the same logic as bulk generation
            for i, question_data in enumerate(questions_data, 1):
                try:
                    # Add metadata to each question (same as bulk generation)
                    enhanced_question = {**question_data}

                    # Add required metadata fields (reuse bulk generation logic)
                    enhanced_question["language_id"] = language_id
                    enhanced_question["language_name"] = ""  # Could be resolved if needed
                    enhanced_question["generated_by_admin"] = admin_id
                    enhanced_question["generation_method"] = "json_upload"

                    # Add activity_type and level from top-level request
                    if activity_type:
                        enhanced_question["activity_type"] = activity_type
                    if level:
                        enhanced_question["level"] = level

                    # Set default difficulty if not provided
                    if "difficulty_level" not in enhanced_question:
                        enhanced_question["difficulty_level"] = "difficult"

                    # For grammar questions, set options to None if not provided (validator requires 2+ if not None)
                    if activity_type == "grammar" and "options" not in enhanced_question:
                        enhanced_question["options"] = None

                    # Add upload metadata if provided
                    if upload_metadata:
                        enhanced_question["upload_metadata"] = upload_metadata

                    # Save using existing ODM service (same as bulk generation)
                    if self.admin_odm:
                        saved_question = self.admin_repo.save_single_question(enhanced_question)
                        if saved_question and saved_question.get("success"):
                            # save_question returns dict with question_id
                            question_id = saved_question.get("question_id", "unknown")
                            enhanced_question["_id"] = question_id
                            saved_question_ids.append(question_id)
                            saved_questions.append(enhanced_question)

                            logger.info(
                                "Question uploaded and saved to database",
                                question_id=question_id,
                                question_num=i,
                                activity_type=enhanced_question.get("activity_type"),
                                level=enhanced_question.get("level"),
                            )
                        else:
                            failed_count += 1
                            error_msg = f"Question {i}: Failed to save to database"
                            validation_errors.append(error_msg)
                    else:
                        failed_count += 1
                        error_msg = f"Question {i}: ODM service not available"
                        validation_errors.append(error_msg)

                except Exception as question_error:
                    failed_count += 1
                    error_msg = f"Question {i}: {str(question_error)}"
                    validation_errors.append(error_msg)
                    logger.error(
                        "Failed to process uploaded question",
                        question_num=i,
                        error=str(question_error),
                        question_data=question_data,
                    )

            upload_time = time.time() - start_time

            logger.info(
                "Bulk upload completed",
                total_uploaded=len(questions_data),
                total_saved=len(saved_questions),
                failed_count=failed_count,
                upload_time=upload_time,
            )

            # Create language_info structure
            language_info = {
                "id": language_id,
                "name": "",  # Could be resolved from database if needed
                "native_name": "",
                "flag_emoji": "",
            }

            return {
                "success": len(saved_questions) > 0,
                "message": (
                    f"Successfully uploaded {len(saved_questions)} out of "
                    f"{len(questions_data)} questions"
                ),
                "language_info": language_info,
                "questions_uploaded": len(questions_data),
                "questions_saved": len(saved_questions),
                "failed_questions": failed_count,
                "upload_time_seconds": round(upload_time, 2),
                "validation_errors": validation_errors if validation_errors else [],
                "saved_question_ids": saved_question_ids,
            }

        except Exception as e:
            upload_time = time.time() - start_time
            logger.error(
                "Bulk upload failed",
                language_id=language_id,
                error=str(e),
                upload_time=upload_time,
            )

            return {
                "success": False,
                "message": f"Question upload failed: {str(e)}",
                "language_info": language_info,
                "questions_uploaded": len(questions_data),
                "questions_saved": len(saved_questions),
                "failed_questions": failed_count,
                "upload_time_seconds": round(upload_time, 2),
                "validation_errors": validation_errors + [str(e)],
                "saved_question_ids": saved_question_ids,
            }

    async def list_questions(
        self,
        page: int = 1,
        per_page: int = 10,
        language: str = "",
        level: str = "",
        activity_type: str = "",
        status: str = "",
        reviewed: Optional[bool] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        has_audio: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """List questions with filtering and pagination using admin repository"""
        try:
            # Calculate skip for pagination
            skip = (page - 1) * per_page

            created_from = self._parse_date_filter(date_from)
            created_to = self._parse_date_filter(date_to, include_end_of_day=True)

            if created_from and created_to and created_from >= created_to:
                logger.warning(
                    "date_from is on/after date_to; ignoring end date filter",
                    date_from=date_from,
                    date_to=date_to,
                )
                created_to = None

            # Use admin repository method for database queries
            questions = self.admin_repo.get_questions_by_filters(
                language_id=language if language else None,
                activity_type=activity_type if activity_type else None,
                level=level if level else None,
                limit=per_page,
                skip=skip,
                created_from=created_from,
                created_to=created_to,
                has_audio=has_audio,
            )

            # Apply reviewed filter if specified
            if reviewed is not None:
                filtered_questions = []
                for question in questions:
                    question_metadata = question.get("question_metadata") or {}
                    is_reviewed = question_metadata.get("reviewed", False)
                    if reviewed == is_reviewed:
                        filtered_questions.append(question)
                questions = filtered_questions

            # Get total count for pagination
            # For now, we'll use a simple count query
            with self.admin_repo.mysql_service.get_db() as session:
                query = session.query(QuestionBank).filter(QuestionBank.is_active.is_(True))
                
                if language:
                    query = query.filter(QuestionBank.language_id == language)
                if activity_type:
                    query = query.filter(QuestionBank.activity_type == activity_type)
                if level:
                    query = query.filter(QuestionBank.level == level)

                if created_from:
                    query = query.filter(QuestionBank.created_datetime >= created_from)
                if created_to:
                    query = query.filter(QuestionBank.created_datetime < created_to)
                
                # Apply has_audio filter for count
                if has_audio is not None:
                    if has_audio:
                        query = query.filter(QuestionBank.audio_url.isnot(None))
                        query = query.filter(QuestionBank.audio_url != '')
                    else:
                        query = query.filter((QuestionBank.audio_url.is_(None)) | (QuestionBank.audio_url == ''))
                
                # For reviewed filter, we need to filter in Python since it's stored in JSON
                if reviewed is not None:
                    all_questions = query.all()
                    filtered_count = 0
                    for question in all_questions:
                        question_metadata = question.question_metadata or {}
                        is_reviewed = question_metadata.get("reviewed", False) if isinstance(question_metadata, dict) else False
                        if reviewed == is_reviewed:
                            filtered_count += 1
                    total_count = filtered_count
                else:
                    total_count = query.count()

            logger.info(
                "Questions listed using admin repository",
                count=len(questions),
                total_count=total_count,
                filters={
                    "language": language,
                    "level": level,
                    "activity_type": activity_type,
                    "date_from": date_from,
                    "date_to": date_to,
                },
                page=page,
                per_page=per_page,
            )

            return {
                "success": True,
                "message": "Questions retrieved successfully",
                "data": {
                    "questions": questions,
                    "pagination": {
                        "page": page,
                        "per_page": per_page,
                        "total_count": total_count,
                        "total_pages": ((total_count + per_page - 1) // per_page),
                    },
                },
            }
        except Exception as e:
            logger.error("Failed to list questions", error=str(e))
            return {
                "success": False,
                "message": f"Failed to list questions: {str(e)}",
                "data": {"questions": [], "pagination": {}},
            }

    async def update_question(
        self, question_id: str, question_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a specific question"""
        try:
            # Use existing modify_question method
            result = await self.modify_question(question_id, question_data)
            return result
        except Exception as e:
            logger.error(
                "Failed to update question", question_id=question_id, error=str(e)
            )
            return {"success": False, "message": f"Failed to update question: {str(e)}"}

    async def review_question(
        self, question_id: str, review_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Review and approve/reject a question"""
        try:
            # Use existing mark_question_reviewed method
            result = await self.mark_question_reviewed(
                question_id=question_id,
                reviewed_by=review_data.get("reviewed_by", "admin"),
            )
            return result
        except Exception as e:
            logger.error(
                "Failed to review question", question_id=question_id, error=str(e)
            )
            return {"success": False, "message": f"Failed to review question: {str(e)}"}

    async def get_question_bank_stats(self) -> Dict[str, Any]:
        """Get comprehensive question bank statistics"""
        try:
            # Use AdminRepository for statistics
            stats_result = self.admin_repo.get_question_statistics()

            return {
                "success": True,
                "total_questions": stats_result.get("total_questions", 0),
                "by_activity_type": stats_result.get("activity_distribution", {}),
                "by_level": stats_result.get("level_distribution", {}),
                "by_language": stats_result.get("language_distribution", {}),
                "generated_at": stats_result.get("generated_at"),
            }

        except Exception as e:
            logger.error("Failed to get question bank statistics", error=str(e))
            return {
                "success": False,
                "total_questions": 0,
                "by_activity_type": {},
                "by_level": {},
                "by_language": {},
                "error": str(e),
            }

    async def get_question_dashboard_summary(self, language_id: Optional[str] = None) -> Dict[str, Any]:
        """Get aggregated question dashboard summary data for a single language"""
        try:
            summary = self.admin_repo.get_question_dashboard_summary(
                language_id=language_id
            )

            return {
                "success": True,
                "available_languages": summary.get("available_languages", []),
                "language_summary": summary.get("language_summary"),
                "selected_language_id": summary.get("selected_language_id"),
                "generated_at": summary.get("generated_at"),
            }

        except Exception as e:
            logger.error("Failed to get question dashboard summary", error=str(e))
            return {
                "success": False,
                "available_languages": [],
                "language_summary": None,
                "selected_language_id": None,
                "generated_at": None,
                "error": str(e),
            }
