"""
LangChain-based LLM client - OpenAI-only version
Clean, focused client that uses only OpenAI models
"""

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from openai import OpenAI
import asyncio
import structlog
import time
from typing import Optional
from app.config import settings

logger = structlog.get_logger()


class LangChainLLMClient:
    """
    OpenAI-only LLM client using LangChain
    Takes explicit model parameter - no fallback logic
    """

    def __init__(self):
        logger.info("LangChainLLMClient initialized (OpenAI-only)")

    def _is_gpt5_model(self, model_name: str) -> bool:
        """
        Detect if model is GPT-5 Mini which requires different API format
        """
        gpt5_indicators = ["gpt-5", "gpt5"]
        return any(indicator in model_name.lower() for indicator in gpt5_indicators)

    def _get_gpt5_api_key(self) -> Optional[str]:
        """
        Get GPT-5 API key from config, fallback to regular OpenAI key
        """
        return settings.gpt5_mini_api_key or settings.openai_api_key

    async def _call_gpt5_model(
        self,
        system_prompt: str,
        user_prompt: str,
        model_name: str,
        max_tokens: Optional[int] = None,
        activity_type: str = "practice",
        level: str = "A1",
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> str:
        """
        Handle GPT-5 Mini models using the responses API format
        """
        try:
            # Get GPT-5 API key
            api_key = self._get_gpt5_api_key()
            if not api_key:
                raise ValueError("No GPT-5 API key available")

            # Initialize direct OpenAI client for GPT-5
            client = OpenAI(api_key=api_key)

            # Combine system and user prompts for GPT-5 input format
            combined_input = f"{system_prompt}\n\nUser request: {user_prompt}"

            # Determine model name for GPT-5 API
            gpt5_model = "gpt-5-mini" if "gpt-5-mini" in model_name.lower() else "gpt-5-mini"

            logger.info(
                "GPT-5 API call initiated",
                model=gpt5_model,
                activity_type=activity_type,
                level=level,
                user_id=user_id,
            )

            # Use GPT-5 responses API without blocking the event loop
            result = await asyncio.to_thread(
                client.responses.create,
                model=gpt5_model,
                input=combined_input,
                reasoning={
                    "effort": settings.gpt5_mini_reasoning_effort
                },
                text={
                    "verbosity": settings.gpt5_mini_text_verbosity
                }
            )

            response_content = result.output_text or ""

            logger.info(
                "GPT-5 API call successful",
                model=gpt5_model,
                response_length=len(response_content),
                input_tokens=getattr(result.usage, 'input_tokens', 0),
                output_tokens=getattr(result.usage, 'output_tokens', 0),
                reasoning_tokens=getattr(getattr(result.usage, 'output_tokens_details', None), 'reasoning_tokens', 0)
            )

            return response_content

        except Exception as e:
            logger.error(
                "GPT-5 API call failed",
                model=model_name,
                error=str(e),
            )
            raise Exception("GPT-5 AI tutor is currently unavailable")

    async def call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        model_name: str,  # ✅ EXPLICIT MODEL PARAMETER
        max_tokens: Optional[int] = None,
        activity_type: str = "practice",  # For logging only
        level: str = "A1",  # For logging only
        user_id: Optional[str] = None,  # For logging only
        session_id: Optional[str] = None,  # For logging only
        **kwargs,
    ) -> str:
        """
        Make LLM call with explicit OpenAI model

        Args:
            system_prompt: System prompt for LLM
            user_prompt: User prompt for LLM
            model_name: Explicit OpenAI model to use
            max_tokens: Maximum tokens for response
            activity_type: Type of activity for logging
            level: CEFR level for logging
            user_id: User ID for logging only

        Returns:
            LLM response string
        """

        # Route to GPT-5 handler if it's a GPT-5 model
        if self._is_gpt5_model(model_name):
            logger.info(f"Routing {model_name} to GPT-5 responses API handler")
            return await self._call_gpt5_model(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model_name=model_name,
                max_tokens=max_tokens,
                activity_type=activity_type,
                level=level,
                user_id=user_id,
                session_id=session_id,
            )

        # Continue with standard LangChain flow for non-GPT-5 models
        start_time = time.time()

        logger.info(
            "LangChain OpenAI call initiated",
            model=model_name,
            activity_type=activity_type,
            level=level,
            user_id=user_id,
        )

        # Create messages
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        try:
            # Create OpenAI instance with explicit model
            llm = ChatOpenAI(
                model=model_name,
                temperature=settings.openai_temperature,
            )

            # Make API call asynchronously to avoid blocking the event loop
            response = await llm.ainvoke(messages)

            processing_time_ms = round((time.time() - start_time) * 1000, 2)

            # Extract response content as string
            response_content = str(response.content) if response.content else ""

            logger.info(
                "OpenAI LLM call successful",
                model=model_name,
                processing_time_ms=processing_time_ms,
                response_length=len(response_content),
            )

            # Save enhanced LLM log
            await self._save_llm_log(
                model_name=model_name,
                activity_type=activity_type,
                level=level,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_content=response_content,
                processing_time_ms=int(processing_time_ms),
                user_id=user_id,
                session_id=session_id,
            )

            return response_content

        except Exception as e:
            processing_time_ms = round((time.time() - start_time) * 1000, 2)

            logger.error(
                "OpenAI LLM call failed",
                model=model_name,
                error=str(e),
                processing_time_ms=processing_time_ms,
            )

            raise Exception("AI tutor is currently unavailable")

    async def _save_llm_log(
        self,
        model_name: str,
        activity_type: str,
        level: str,
        system_prompt: str,
        user_prompt: str,
        response_content: str,
        processing_time_ms: Optional[int] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ):
        """Save comprehensive LLM log to database"""
        try:
            from app.dependencies import get_base_odm_service

            odm_service = get_base_odm_service()

            # Calculate token usage estimates (rough approximation: 1 token ≈ 4 characters)
            request_token_usage = (len(system_prompt) + len(user_prompt)) // 4
            response_token_usage = len(response_content) // 4
            total_token_usage = request_token_usage + response_token_usage

            # Create comprehensive log entry with full request/response data
            log_data = {
                "user_id": user_id,
                "session_id": session_id,
                "activity_type": activity_type,
                "prompt_type": f"{activity_type}_analysis",
                "model_used": model_name,
                "request_data": {
                    "system_prompt": system_prompt,
                    "user_prompt": user_prompt,
                    "model_name": model_name,
                    "level": level,
                    "activity_type": activity_type,
                    "token_usage": request_token_usage,
                },
                "response_data": {
                    "content": response_content,
                    "model_used": model_name,
                    "response_length": len(response_content),
                    "token_usage": response_token_usage,
                },
                "token_usage": {
                    "prompt_tokens": request_token_usage,
                    "completion_tokens": response_token_usage,
                    "total_tokens": total_token_usage,
                },
                "processing_time_ms": processing_time_ms,
                "status": "success"
            }

            odm_service.log_llm_request_odm(**log_data)

            logger.info(
                "LLM request logged successfully",
                user_id=user_id,
                session_id=session_id,
                model_used=model_name,
                activity_type=activity_type,
                processing_time_ms=processing_time_ms,
                prompt_tokens=request_token_usage,
                completion_tokens=response_token_usage,
                total_tokens=total_token_usage,
                request_size=len(system_prompt) + len(user_prompt),
                response_size=len(response_content)
            )

        except Exception as e:
            logger.warning(
                "Failed to save LLM log", 
                error=str(e),
                user_id=user_id,
                session_id=session_id,
                model_name=model_name,
                activity_type=activity_type
            )
