"""
FastAPI Dependencies - Shared dependency injection
Provides authentication, ODM services, and LLM components
"""

import jwt
import structlog
from typing import Dict, Any
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache

from app.config import settings
# Infrastructure base class (with compatibility)
from app.common.models.mysql_odm_service import (
    get_mysql_base_odm_service,
    MySQLUserODMService
)
# New repository structure
from app.user.models import (
    UserRepository, 
    CoreRepository,
    get_user_repository,
    get_core_repository
)
from app.user.services.user_auth_service import UserAuthService
from app.user.services.session_analysis import (
    SessionAnalyzer,
    SessionValidator,
    ActivityAnalyzer,
)
from app.user.services.session_analysis.transcription_orchestrator import TranscriptionOrchestrator
from app.credit.services import SessionCreditDeduction
from app.user.services.question_retrieval_service import QuestionRetrievalService
from app.user.services.speaking_audio_service import SpeakingAudioService
from app.user.services.credit_service import CreditService
from app.user.services.session_analysis.session_data_service import SessionDataService

# New service layer services
from app.user.services.user_profile_service import UserProfileService, get_user_profile_service
from app.user.services.user_session_service import UserSessionService, get_user_session_service
from app.user.services.user_credit_service import UserCreditService, get_user_credit_service





# New LLM dependencies
from app.llm.prompt_manager import PromptManager
from app.llm.langchain_client import LangChainLLMClient

# Question Bank Service
from app.user.services.session_progress_service import get_session_progress_service
from app.common.services.email_service import get_email_service, EmailService
from app.common.services.captcha_service import get_captcha_service, CaptchaService

# Admin Repository (new architecture)
try:
    from app.admin.models.admin_repository import AdminRepository, get_admin_repository
except ImportError:
    pass

# Legacy admin service imports removed - use AdminRepository instead

logger = structlog.get_logger()
security = HTTPBearer()

# ================================
# AUTHENTICATION DEPENDENCIES
# ================================


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """Extract and validate JWT token"""
    token = credentials.credentials

    try:
        logger.debug("Validating JWT token")

        # Decode JWT directly
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )

        # Extract user_id from payload
        user_id: str = payload.get("user_id")
        if user_id is None:
            logger.warning("JWT missing user_id", payload_keys=list(payload.keys()))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format",
            )

        logger.debug("JWT validation successful", user_id=user_id)
        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "payload": payload,
        }

    except jwt.InvalidTokenError as e:
        logger.warning("JWT validation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )
    except Exception as e:
        logger.error("Unexpected auth error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication error",
        )


async def get_current_user_id(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> str:
    """
    Extract just the user_id from the current user
    Convenience dependency for endpoints that only need user_id
    """
    return current_user["user_id"]


# ================================
# ODM SERVICE DEPENDENCIES
# ================================


def get_base_odm_service() -> MySQLUserODMService:
    """
    Base ODM service dependency - returns the user service by default.
    """
    logger.info("Using MySQL base ODM service")
    return get_mysql_base_odm_service(MySQLUserODMService)


def get_core_repository_service():
    """
    Core repository dependency - New repository structure  
    Returns CoreRepository for exam/credit/language operations
    """
    logger.info("Using Core Repository service")
    return get_core_repository()


# NEW: Repository-based dependencies for migration
def get_user_repository_service():
    """
    User repository dependency - New repository structure
    """
    logger.info("Using User Repository service")
    return get_user_repository()


# COMPATIBILITY: Legacy ODM service for migration period
def get_mysql_user_odm_service() -> MySQLUserODMService:
    """
    Provides a singleton instance of the MySQLUserODMService.
    """
    return get_mysql_base_odm_service(MySQLUserODMService)


# ================================
# LLM SERVICE DEPENDENCIES (SHARED)
# ================================


@lru_cache(maxsize=1)
def get_prompt_manager() -> PromptManager:
    """Singleton PromptManager - loads prompts once for entire app"""
    logger.info("Creating singleton PromptManager instance")
    return PromptManager("app/llm/prompts")


@lru_cache(maxsize=1)
def get_llm_client() -> LangChainLLMClient:
    """Singleton LangChain client - shared across admin and user services"""
    logger.info("Creating singleton LangChain client instance")
    return LangChainLLMClient()


@lru_cache(maxsize=1)
def get_speaking_audio_service() -> SpeakingAudioService:
    """Singleton service for speaking audio handling."""
    from app.user.services.stt_service import STTService
    from app.user.services.stt_providers import WhisperSTT
    
    logger.info("Creating singleton SpeakingAudioService instance")
    
    # Initialize STT service with Whisper provider
    whisper_provider = WhisperSTT()
    stt_service = STTService(provider=whisper_provider)
    
    return SpeakingAudioService(stt_service=stt_service)


def get_auth_service() -> UserAuthService:
    """Dependency for UserAuthService"""
    return UserAuthService()


def get_session_validator(
    core_repo: CoreRepository = Depends(get_core_repository),
) -> SessionValidator:
    """Dependency for SessionValidator"""
    return SessionValidator(core_repo=core_repo)


def get_activity_analyzer(
    llm_client: LangChainLLMClient = Depends(get_llm_client),
    prompt_manager: PromptManager = Depends(get_prompt_manager),
) -> ActivityAnalyzer:
    """Dependency for ActivityAnalyzer"""
    return ActivityAnalyzer(llm_client=llm_client, prompt_manager=prompt_manager)


def get_session_credit_deduction(
    core_repo: CoreRepository = Depends(get_core_repository),
) -> SessionCreditDeduction:
    """Dependency for SessionCreditDeduction"""
    return SessionCreditDeduction(core_repo=core_repo)


def get_session_data_service(
    core_repo: CoreRepository = Depends(get_core_repository),
) -> SessionDataService:
    """Dependency for SessionDataService"""
    return SessionDataService(core_repo=core_repo)


def get_transcription_orchestrator(
    speaking_service: SpeakingAudioService = Depends(get_speaking_audio_service),
    core_repo: CoreRepository = Depends(get_core_repository),
) -> TranscriptionOrchestrator:
    """Dependency for TranscriptionOrchestrator"""
    return TranscriptionOrchestrator(
        speaking_service=speaking_service,
        core_repo=core_repo,
    )


def get_session_analyzer(
    llm_client: LangChainLLMClient = Depends(get_llm_client),
    prompt_manager: PromptManager = Depends(get_prompt_manager),
    session_validator: SessionValidator = Depends(get_session_validator),
    session_data_service: SessionDataService = Depends(get_session_data_service),
    activity_analyzer: ActivityAnalyzer = Depends(get_activity_analyzer),
    session_credit_deduction: SessionCreditDeduction = Depends(get_session_credit_deduction),
    transcription_orchestrator: TranscriptionOrchestrator = Depends(get_transcription_orchestrator),
) -> SessionAnalyzer:
    """Dependency for SessionAnalyzer with shared LLM components"""
    return SessionAnalyzer(
        llm_client=llm_client,
        prompt_manager=prompt_manager,
        session_validator=session_validator,
        session_data_service=session_data_service,
        activity_analyzer=activity_analyzer,
        session_credit_deduction=session_credit_deduction,
        transcription_orchestrator=transcription_orchestrator,
    )


# ================================
# REQUEST HELPERS
# ================================


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request"""
    forwarded_ip = request.headers.get("X-Forwarded-For")
    if forwarded_ip:
        return forwarded_ip.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    return request.client.host if request.client else "unknown"


def get_question_retrieval_service(
    core_repo: CoreRepository = Depends(get_core_repository),
) -> QuestionRetrievalService:
    """Dependency for QuestionRetrievalService"""
    return QuestionRetrievalService(core_repo=core_repo)

def get_credit_service(
    core_repo: CoreRepository = Depends(get_core_repository),
) -> CreditService:
    """Dependency for CreditService"""
    return CreditService(core_repo=core_repo)


# ================================
# NEW SERVICE LAYER DEPENDENCIES (MIGRATION-READY)
# ================================

def get_user_profile_service_dep() -> UserProfileService:
    """Dependency for UserProfileService - replaces direct UserRepository access"""
    return get_user_profile_service()


def get_user_session_service_dep() -> UserSessionService:
    """Dependency for UserSessionService - replaces direct CoreRepository access"""  
    return get_user_session_service()


def get_user_credit_service_dep() -> UserCreditService:
    """Dependency for UserCreditService - replaces direct CoreRepository credit access"""
    return get_user_credit_service()


# Note: Repository access still available for services that need it
