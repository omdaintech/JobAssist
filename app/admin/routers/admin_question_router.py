"""
Admin Question Management Router
Handles admin question-related endpoints for managing question banks
"""

from fastapi import APIRouter, Depends, HTTPException, status, Body
import structlog
import time
from typing import Dict, Any, Optional
from datetime import datetime

# Import admin models
from app.admin.models.admin_requests import (
    AdminBulkQuestionRequest,
    AdminBulkUploadRequest,
)
from app.admin.models.admin_responses import (
    AdminBulkQuestionResponse,
    AdminBulkUploadResponse,
    AdminStandardResponse,
)
from app.common.models.base_models import LanguageInfo

# Import services
from app.admin.services.admin_question_service import AdminQuestionService

# Import shared admin dependencies
from app.admin.dependencies import get_admin_user_dependency

logger = structlog.get_logger()

# Create question management router
router = APIRouter(
    prefix="/questions",
    tags=["Admins - Question Management"],
    responses={404: {"description": "Not found"}},
)


# ===============================
# DEPENDENCY INJECTION
# ===============================


def get_admin_question_service() -> AdminQuestionService:
    """Get admin question service instance with shared LLM dependencies"""
    from app.dependencies import get_llm_client, get_prompt_manager

    llm_client = get_llm_client()
    prompt_manager = get_prompt_manager()
    return AdminQuestionService(llm_client=llm_client, prompt_manager=prompt_manager)


def get_admin_audio_service():
    """Get admin audio service instance for TTS generation"""
    from app.admin.services.admin_audio_service import AdminAudioService
    return AdminAudioService()


# Use shared admin authentication dependency
get_admin_user = get_admin_user_dependency


# ===============================
# QUESTION MANAGEMENT ENDPOINTS
# ===============================


@router.post("/bulk-generate", response_model=AdminBulkQuestionResponse)
async def bulk_generate_questions(
    request: AdminBulkQuestionRequest,
    admin: Dict[str, Any] = Depends(get_admin_user),
    question_service: AdminQuestionService = Depends(get_admin_question_service),
):
    """Generate questions in bulk using AI/LLM"""
    try:
        logger.info(
            "Admin bulk generating questions",
            admin_id=admin["admin_id"],
            language_id=request.language_id,
            level=request.level,
            activity_type=request.activity_type,
            count=request.count,
        )

        # Generate questions via service
        result = await question_service.bulk_generate_questions(
            language_id=request.language_id,
            activity_type=request.activity_type,
            level=request.level,
            difficulty_level=request.difficulty_level,
            count=request.count,
            admin_id=admin["admin_id"],
        )

        raw_language_info = result.get("language_info")
        if isinstance(raw_language_info, LanguageInfo):
            language_info = raw_language_info
        elif isinstance(raw_language_info, dict):
            language_info = LanguageInfo(
                id=str(raw_language_info.get("id", request.language_id)),
                name=str(raw_language_info.get("name", "")),
                native_name=raw_language_info.get("native_name"),
                flag_emoji=raw_language_info.get("flag_emoji"),
                supported_levels=raw_language_info.get("supported_levels"),
                content_availability=raw_language_info.get("content_availability"),
            )
        else:
            language_info = LanguageInfo(
                id=request.language_id,
                name="",
                native_name=None,
                flag_emoji=None,
            )

        return AdminBulkQuestionResponse(
            success=result["success"],
            message=result["message"],
            language_info=language_info,
            activity_type=result.get("activity_type") or request.activity_type,
            level=result.get("level") or request.level,
            difficulty_level=result.get("difficulty_level") or request.difficulty_level,
            questions_generated=result.get("questions_generated", 0),
            questions_saved=result.get("questions_saved", 0),
            failed_questions=result.get("failed_questions", 0),
            generation_time_seconds=result.get("generation_time_seconds"),
            llm_errors=result.get("error_details") or [],
            saved_question_ids=[
                q.get("_id") for q in result.get("questions", []) if q.get("_id")
            ],
        )

    except Exception as e:
        logger.error(
            "Failed to bulk generate questions",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate questions",
        )


@router.post("/bulk-upload", response_model=AdminBulkUploadResponse)
async def bulk_upload_questions(
    request: AdminBulkUploadRequest,
    admin: Dict[str, Any] = Depends(get_admin_user),
    question_service: AdminQuestionService = Depends(get_admin_question_service),
):
    """Upload questions in bulk from JSON/CSV data"""
    try:
        logger.info(
            "Admin bulk uploading questions",
            admin_id=admin["admin_id"],
            question_count=len(request.questions),
        )

        # Upload questions via service
        result = await question_service.bulk_upload_questions(
            language_id=request.language_id,
            questions_data=request.questions,
            upload_metadata={
                "source": "admin_api",
                "activity_type": request.activity_type,
                "level": request.level,
                "timestamp": str(time.time())
            },
            admin_id=admin["admin_id"],
        )

        raw_language_info = result.get("language_info")
        if isinstance(raw_language_info, LanguageInfo):
            language_info = raw_language_info
        elif isinstance(raw_language_info, dict):
            language_info = LanguageInfo(
                id=str(raw_language_info.get("id", request.language_id)),
                name=str(raw_language_info.get("name", "")),
                native_name=raw_language_info.get("native_name"),
                flag_emoji=raw_language_info.get("flag_emoji"),
                supported_levels=raw_language_info.get("supported_levels"),
                content_availability=raw_language_info.get("content_availability"),
            )
        else:
            language_info = LanguageInfo(
                id=request.language_id,
                name="",
                native_name=None,
                flag_emoji=None,
            )

        return AdminBulkUploadResponse(
            success=result["success"],
            message=result["message"],
            language_info=language_info,
            questions_uploaded=result.get("questions_uploaded", 0),
            questions_saved=result.get("questions_saved", 0),
            failed_questions=result.get("failed_questions", 0),
            upload_time_seconds=result.get("upload_time_seconds"),
            validation_errors=result.get("validation_errors", []),
            saved_question_ids=result.get("saved_question_ids", []),
        )

    except Exception as e:
        logger.error(
            "Failed to bulk upload questions",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload questions",
        )


@router.get("", response_model=AdminStandardResponse)
async def list_questions(
    page: int = 1,
    per_page: int = 10,
    language: Optional[str] = None,
    language_id: Optional[str] = None,
    level: Optional[str] = None,
    activity_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    reviewed: Optional[bool] = None,
    difficulty_level: Optional[str] = None,
    has_audio: Optional[bool] = None,
    filter: Optional[str] = None,
    selector: Optional[str] = None,
    admin: Dict[str, Any] = Depends(get_admin_user),
    question_service: AdminQuestionService = Depends(get_admin_question_service),
):
    """List questions with filtering and pagination
    
    Query parameters:
    - filter: JSON string for filtering (e.g., {"level": "A1", "activity_type": "reading"})
    - selector: JSON string for field selection (e.g., {"question_text": 1, "level": 1})
    """
    try:
        import json
        
        # Parse filter and selector if provided
        filter_dict = {}
        selector_dict = {}
        
        if filter:
            try:
                filter_dict = json.loads(filter)
                logger.info("Parsed filter from query string", filter=filter_dict)
            except json.JSONDecodeError as e:
                logger.warning("Invalid filter JSON", error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid filter JSON: {str(e)}"
                )
        
        if selector:
            try:
                selector_dict = json.loads(selector)
                logger.info("Parsed selector from query string", selector=selector_dict)
            except json.JSONDecodeError as e:
                logger.warning("Invalid selector JSON", error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid selector JSON: {str(e)}"
                )
        
        # Merge filter_dict with individual parameters (individual params take precedence)
        if filter_dict:
            language = language or filter_dict.get("language") or filter_dict.get("language_id")
            language_id = language_id or filter_dict.get("language_id") or filter_dict.get("language")
            level = level or filter_dict.get("level")
            activity_type = activity_type or filter_dict.get("activity_type")
            reviewed = reviewed if reviewed is not None else filter_dict.get("reviewed")
            difficulty_level = difficulty_level or filter_dict.get("difficulty_level")
            has_audio = has_audio if has_audio is not None else filter_dict.get("has_audio")
            date_from = date_from or filter_dict.get("date_from")
            date_to = date_to or filter_dict.get("date_to")
        
        # Enforce maximum limit of 50 questions per query
        if per_page > 50:
            per_page = 50
        # Use language_id if provided, otherwise use language
        language_filter = language_id if language_id else language

        logger.info(
            "Admin listing questions with filters",
            admin_id=admin["admin_id"],
            page=page,
            per_page=per_page,
            language=language_filter,
            level=level,
            activity_type=activity_type,
            date_from=date_from,
            date_to=date_to,
            reviewed=reviewed,
            difficulty_level=difficulty_level,
            has_audio=has_audio,
            filter_dict=filter_dict,
            selector_dict=selector_dict,
        )

        # Get questions from service using the filtered method with pagination
        result = await question_service.list_questions(
            page=page,
            per_page=per_page,
            language=language_filter or "",
            level=level or "",
            activity_type=activity_type or "",
            status="",
            reviewed=reviewed,
            date_from=date_from,
            date_to=date_to,
            has_audio=has_audio,
        )
        
        # Apply selector to filter fields if provided
        if selector_dict and result["success"]:
            questions_data = result["data"]["questions"]
            filtered_questions = []
            for question in questions_data:
                filtered_question = {}
                for field, include in selector_dict.items():
                    if include and field in question:
                        filtered_question[field] = question[field]
                    elif include and field == "id" and "_id" in question:
                        # Map _id to id if requested
                        filtered_question["id"] = question["_id"]
                filtered_questions.append(filtered_question)
            result["data"]["questions"] = filtered_questions

        # Extract data from service response
        if result["success"]:
            questions_data = result["data"]["questions"]
            total_count = result["data"]["pagination"]["total_count"]
            message = result["message"]
        else:
            questions_data = []
            total_count = 0
            message = result["message"]

        # Wrap questions result in data object with pagination info
        data = {
            "questions": questions_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": ((total_count + per_page - 1) // per_page),
            },
        }

        return AdminStandardResponse(
            success=result["success"],
            message=result["message"],
            data=data,
        )

    except Exception as e:
        logger.error(
            "Failed to list questions",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve questions",
        )


@router.put("/{question_id}", response_model=AdminStandardResponse)
async def update_question(
    question_id: str,
    question_data: Dict[str, Any] = Body(...),
    admin: Dict[str, Any] = Depends(get_admin_user),
    question_service: AdminQuestionService = Depends(get_admin_question_service),
):
    """Update a specific question"""
    try:
        logger.info(
            "Admin updating question",
            admin_id=admin["admin_id"],
            question_id=question_id,
        )

        # Update question via service
        result = await question_service.update_question(question_id, question_data)

        return AdminStandardResponse(
            success=result["success"],
            message=result["message"],
            data=result.get("data", {}),
        )

    except Exception as e:
        logger.error(
            "Failed to update question",
            admin_id=admin["admin_id"],
            question_id=question_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update question",
        )


@router.get("/list", response_model=AdminStandardResponse)
async def list_questions_explicit(
    page: int = 1,
    per_page: int = 10,
    language: Optional[str] = None,
    language_id: Optional[str] = None,
    level: Optional[str] = None,
    activity_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    reviewed: Optional[bool] = None,
    difficulty_level: Optional[str] = None,
    has_audio: Optional[bool] = None,
    filter: Optional[str] = None,
    selector: Optional[str] = None,
    admin: Dict[str, Any] = Depends(get_admin_user),
    question_service: AdminQuestionService = Depends(get_admin_question_service),
):
    """List questions with filtering and pagination (explicit /list endpoint)
    
    Query parameters:
    - filter: JSON string for filtering (e.g., {"level": "A1", "activity_type": "reading"})
    - selector: JSON string for field selection (e.g., {"question_text": 1, "level": 1})
    """
    try:
        import json
        
        # Parse filter and selector if provided
        filter_dict = {}
        selector_dict = {}
        
        if filter:
            try:
                filter_dict = json.loads(filter)
                logger.info("Parsed filter from query string", filter=filter_dict)
            except json.JSONDecodeError as e:
                logger.warning("Invalid filter JSON", error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid filter JSON: {str(e)}"
                )
        
        if selector:
            try:
                selector_dict = json.loads(selector)
                logger.info("Parsed selector from query string", selector=selector_dict)
            except json.JSONDecodeError as e:
                logger.warning("Invalid selector JSON", error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid selector JSON: {str(e)}"
                )
        
        # Merge filter_dict with individual parameters (individual params take precedence)
        if filter_dict:
            language = language or filter_dict.get("language") or filter_dict.get("language_id")
            language_id = language_id or filter_dict.get("language_id") or filter_dict.get("language")
            level = level or filter_dict.get("level")
            activity_type = activity_type or filter_dict.get("activity_type")
            reviewed = reviewed if reviewed is not None else filter_dict.get("reviewed")
            difficulty_level = difficulty_level or filter_dict.get("difficulty_level")
            has_audio = has_audio if has_audio is not None else filter_dict.get("has_audio")
            date_from = date_from or filter_dict.get("date_from")
            date_to = date_to or filter_dict.get("date_to")
        
        # Enforce maximum limit of 50 questions per query
        if per_page > 50:
            per_page = 50
        # Use language_id if provided, otherwise use language
        language_filter = language_id if language_id else language

        logger.info(
            "Admin listing questions with filters (/list endpoint)",
            admin_id=admin["admin_id"],
            page=page,
            per_page=per_page,
            language=language_filter,
            level=level,
            activity_type=activity_type,
            date_from=date_from,
            date_to=date_to,
            reviewed=reviewed,
            difficulty_level=difficulty_level,
            has_audio=has_audio,
            filter_dict=filter_dict,
            selector_dict=selector_dict,
        )

        # Get questions from service using the filtered method with pagination
        result = await question_service.list_questions(
            page=page,
            per_page=per_page,
            language=language_filter or "",
            level=level or "",
            activity_type=activity_type or "",
            status="",
            reviewed=reviewed,
            date_from=date_from,
            date_to=date_to,
            has_audio=has_audio,
        )
        
        # Apply selector to filter fields if provided
        if selector_dict and result["success"]:
            questions_data = result["data"]["questions"]
            filtered_questions = []
            for question in questions_data:
                filtered_question = {}
                for field, include in selector_dict.items():
                    if include and field in question:
                        filtered_question[field] = question[field]
                    elif include and field == "id" and "_id" in question:
                        # Map _id to id if requested
                        filtered_question["id"] = question["_id"]
                filtered_questions.append(filtered_question)
            result["data"]["questions"] = filtered_questions

        # Extract data from service response
        if result["success"]:
            questions_data = result["data"]["questions"]
            total_count = result["data"]["pagination"]["total_count"]
            message = result["message"]
        else:
            questions_data = []
            total_count = 0
            message = result["message"]

        # Wrap questions result in data object with pagination info
        data = {
            "questions": questions_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": ((total_count + per_page - 1) // per_page),
            },
        }

        return AdminStandardResponse(
            success=result["success"],
            message=result["message"],
            data=data,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to list questions",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve questions",
        )


@router.get("/template-preview", response_model=AdminStandardResponse)
async def get_template_preview(
    level: str,
    activity_type: str,
    language: Optional[str] = None,
    language_id: Optional[str] = None,
    difficulty_level: Optional[str] = None,
    count: Optional[int] = None,
    admin: Dict[str, Any] = Depends(get_admin_user),
    question_service: AdminQuestionService = Depends(get_admin_question_service),
):
    """Get preview of question generation templates"""
    try:
        # Use language_id if provided, otherwise use language
        language_filter = language_id if language_id else language

        if not language_filter:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'language' or 'language_id' parameter is required",
            )

        logger.info(
            "Admin getting template preview",
            admin_id=admin["admin_id"],
            language=language_filter,
            level=level,
            activity_type=activity_type,
            difficulty_level=difficulty_level,
            count=count,
        )

        # Get template preview from service
        result = await question_service.get_template_preview(
            language_id=language_filter,
            level=level,
            activity_type=activity_type,
            difficulty_level=difficulty_level or "medium",
            count=count or 5,
        )

        return AdminStandardResponse(
            success=result.get("success", True),
            message="Template preview generated successfully",
            data=result,
        )

    except Exception as e:
        logger.error(
            "Failed to get template preview",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get template preview",
        )


@router.delete("/{question_id}", response_model=AdminStandardResponse)
async def delete_question(
    question_id: str,
    admin: Dict[str, Any] = Depends(get_admin_user),
    question_service: AdminQuestionService = Depends(get_admin_question_service),
):
    """Delete a specific question"""
    try:
        logger.info(
            "Admin deleting question",
            admin_id=admin["admin_id"],
            question_id=question_id,
        )

        # Delete question via service
        result = await question_service.delete_question(question_id)

        return AdminStandardResponse(
            success=result["success"],
            message=result["message"],
            data=result.get("data", {}),
        )

    except Exception as e:
        logger.error(
            "Failed to delete question",
            admin_id=admin["admin_id"],
            question_id=question_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete question",
        )


@router.post("/bulk-delete", response_model=AdminStandardResponse)
async def bulk_delete_questions(
    question_ids: Dict[str, Any] = Body(...),
    admin: Dict[str, Any] = Depends(get_admin_user),
    question_service: AdminQuestionService = Depends(get_admin_question_service),
):
    """Delete multiple questions in bulk"""
    try:
        ids = question_ids.get("question_ids")
        if not isinstance(ids, list) or not ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="'question_ids' must be a non-empty list",
            )

        logger.info(
            "Admin bulk deleting questions",
            admin_id=admin["admin_id"],
            question_count=len(ids),
        )

        result = await question_service.bulk_delete_questions(ids)

        return AdminStandardResponse(
            success=result["success"],
            message=result["message"],
            data=result.get("data", {}),
        )

    except Exception as e:
        logger.error(
            "Failed to bulk delete questions",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete questions",
        )


@router.put("/{question_id}/review", response_model=AdminStandardResponse)
async def review_question(
    question_id: str,
    review_data: Dict[str, Any] = Body(...),
    admin: Dict[str, Any] = Depends(get_admin_user),
    question_service: AdminQuestionService = Depends(get_admin_question_service),
):
    """Review and approve/reject a question"""
    try:
        logger.info(
            "Admin reviewing question",
            admin_id=admin["admin_id"],
            question_id=question_id,
        )

        # Review question via service
        result = await question_service.review_question(question_id, review_data)

        return AdminStandardResponse(
            success=result["success"],
            message=result["message"],
            data=result.get("data", {}),
        )

    except Exception as e:
        logger.error(
            "Failed to review question",
            admin_id=admin["admin_id"],
            question_id=question_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to review question",
        )


@router.get("/stats", response_model=Dict[str, Any])
async def get_question_stats(
    admin: Dict[str, Any] = Depends(get_admin_user),
    question_service: AdminQuestionService = Depends(get_admin_question_service),
):
    """Get question bank statistics"""
    try:
        logger.info(
            "Admin getting question stats", admin_id=admin["admin_id"]
        )

        # Get question statistics via service
        result = await question_service.get_question_bank_stats()

        return {
            "success": True,
            "message": "Question statistics retrieved successfully",
            "data": {
                "total_questions": result.get("total_questions", 0),
                "by_activity_type": result.get("by_activity_type", {}),
                "by_level": result.get("by_level", {}),
                "by_date": {},  # TODO: Implement date-based stats
                "recent_activity": [],  # TODO: Implement recent activity
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(
            "Failed to get question stats",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve question statistics",
        )


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_question_dashboard_summary(
    language_id: Optional[str] = None,
    admin: Dict[str, Any] = Depends(get_admin_user),
    question_service: AdminQuestionService = Depends(get_admin_question_service),
):
    """Get dashboard-ready question summary grouped by language and level"""
    try:
        logger.info(
            "Admin getting question dashboard summary",
            admin_id=admin["admin_id"],
            language_id=language_id,
        )

        summary = await question_service.get_question_dashboard_summary(
            language_id=language_id
        )

        if not summary.get("success", False):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve question dashboard summary",
            )

        return {
            "success": True,
            "message": "Question dashboard summary retrieved successfully",
            "data": {
                "available_languages": summary.get("available_languages", []),
                "language_summary": summary.get("language_summary"),
                "selected_language_id": summary.get("selected_language_id"),
                "generated_at": summary.get("generated_at"),
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get question dashboard summary",
            admin_id=admin["admin_id"],
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve question dashboard summary",
        )


@router.post("/{question_id}/generate-audio", response_model=AdminStandardResponse)
async def generate_audio(
    question_id: str,
    force_overwrite: bool = False,
    admin: Dict[str, Any] = Depends(get_admin_user),
    audio_service=Depends(get_admin_audio_service),
):
    """
    Generate TTS audio for a hearing/speaking question, upload to S3, and update database
    
    Args:
        question_id: The question ID to generate audio for
        force_overwrite: If True, regenerate audio even if it already exists
    
    Workflow:
    1. Fetch question from database
    2. Parse transcript (JSON for hearing, plain text for speaking)
    3. Generate audio using ElevenLabs
    4. Upload MP3 to S3
    5. Update question_bank.audio_url
    """
    try:
        logger.info(
            "Admin generating audio for question",
            admin_id=admin["admin_id"],
            question_id=question_id,
            force_overwrite=force_overwrite,
        )
        
        # Generate audio
        result = await audio_service.generate_audio_for_question(
            question_id, 
            force_overwrite=force_overwrite
        )
        
        if not result.get("success"):
            return AdminStandardResponse(
                success=False,
                message=result.get("message", "Audio generation failed"),
                data=result
            )
        
        return AdminStandardResponse(
            success=True,
            message=result.get("message", "Audio generated successfully"),
            data={
                "question_id": question_id,
                "audio_url": result.get("audio_url"),
                "filename": result.get("filename")
            }
        )
        
    except Exception as e:
        logger.error(
            "Failed to generate audio",
            admin_id=admin["admin_id"],
            question_id=question_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate audio: {str(e)}",
        )


@router.delete("/{question_id}/audio", response_model=AdminStandardResponse)
async def delete_audio(
    question_id: str,
    admin: Dict[str, Any] = Depends(get_admin_user),
    audio_service=Depends(get_admin_audio_service),
):
    """Delete audio file from S3 and clear audio_url in database"""
    try:
        logger.info(
            "Admin deleting audio for question",
            admin_id=admin["admin_id"],
            question_id=question_id,
        )
        
        result = await audio_service.delete_audio(question_id)
        
        if not result.get("success"):
            return AdminStandardResponse(
                success=False,
                message=result.get("message", "Audio deletion failed"),
                data=result
            )
        
        return AdminStandardResponse(
            success=True,
            message=result.get("message", "Audio deleted successfully"),
            data={"question_id": question_id}
        )
        
    except Exception as e:
        logger.error(
            "Failed to delete audio",
            admin_id=admin["admin_id"],
            question_id=question_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete audio: {str(e)}",
        )
