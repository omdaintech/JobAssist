"""
Admin Messages Router
Admin endpoints for managing contact and feedback messages
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import structlog

from app.admin.dependencies import get_admin_user_dependency
from app.admin.models.admin_message_requests import (
    MessageFiltersRequest,
    MarkMessageReadRequest,
    AdminNoteRequest
)
from app.admin.models.admin_message_responses import (
    MessageListResponse,
    MessageDetailResponse,
    MessageStatisticsResponse,
    MessageActionResponse
)
from app.admin.services.admin_messages_service import AdminMessagesService, get_admin_messages_service

logger = structlog.get_logger()

router = APIRouter(prefix="/admin/messages", tags=["Admin - Messages"])


@router.get("", response_model=MessageListResponse)
async def get_messages(
    message_type: Optional[str] = Query(None, description="Filter by message type (contact/feedback/all)"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    category: Optional[str] = Query(None, description="Filter by feedback category"),
    email: Optional[str] = Query(None, description="Search by email"),
    search_text: Optional[str] = Query(None, description="Search in message content"),
    limit: int = Query(50, ge=1, le=200, description="Number of results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    admin: dict = Depends(get_admin_user_dependency),
    messages_service: AdminMessagesService = Depends(get_admin_messages_service)
):
    """
    Get all messages (contact and feedback) with filtering
    
    Supports filtering by:
    - Message type (contact/feedback/all)
    - Read status
    - Feedback category
    - Email search
    - Full-text search
    - Pagination
    """
    try:
        filters = {
            'message_type': message_type,
            'is_read': is_read,
            'category': category,
            'email': email,
            'search_text': search_text,
            'limit': limit,
            'offset': offset
        }
        
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}
        
        result = messages_service.get_messages(filters)
        
        return MessageListResponse(
            success=True,
            message="Messages retrieved successfully",
            data=result
        )
        
    except Exception as e:
        logger.error("Failed to get messages", error=str(e))
        raise


@router.get("/statistics", response_model=MessageStatisticsResponse)
async def get_message_statistics(
    admin: dict = Depends(get_admin_user_dependency),
    messages_service: AdminMessagesService = Depends(get_admin_messages_service)
):
    """
    Get message statistics for admin dashboard
    
    Returns:
    - Total contact messages
    - Total feedback messages
    - Unread counts
    - Overall totals
    """
    try:
        stats = messages_service.get_statistics()
        
        return MessageStatisticsResponse(
            success=True,
            message="Statistics retrieved successfully",
            data=stats
        )
        
    except Exception as e:
        logger.error("Failed to get message statistics", error=str(e))
        raise


@router.get("/{message_id}", response_model=MessageDetailResponse)
async def get_message_detail(
    message_id: str,
    admin: dict = Depends(get_admin_user_dependency),
    messages_service: AdminMessagesService = Depends(get_admin_messages_service)
):
    """
    Get detailed information for a specific message
    
    Returns full message details including:
    - All message fields
    - User context (for feedback)
    - Admin notes
    - Read status and history
    """
    try:
        message = messages_service.get_message_detail(message_id)
        
        return MessageDetailResponse(
            success=True,
            message="Message detail retrieved successfully",
            data=message
        )
        
    except Exception as e:
        logger.error("Failed to get message detail", error=str(e))
        raise


@router.patch("/{message_id}/read", response_model=MessageActionResponse)
async def mark_message_read(
    message_id: str,
    request: MarkMessageReadRequest,
    admin: dict = Depends(get_admin_user_dependency),
    messages_service: AdminMessagesService = Depends(get_admin_messages_service)
):
    """
    Mark message as read or unread
    
    Updates the read status and records which admin performed the action.
    """
    try:
        admin_id = admin.get("admin_id")
        
        success = messages_service.mark_message_read(message_id, admin_id, request.is_read)
        
        return MessageActionResponse(
            success=True,
            message=f"Message marked as {'read' if request.is_read else 'unread'}",
            data={'message_id': message_id, 'is_read': request.is_read}
        )
        
    except Exception as e:
        logger.error("Failed to mark message read", error=str(e))
        raise


@router.post("/{message_id}/notes", response_model=MessageActionResponse)
async def add_admin_note(
    message_id: str,
    request: AdminNoteRequest,
    admin: dict = Depends(get_admin_user_dependency),
    messages_service: AdminMessagesService = Depends(get_admin_messages_service)
):
    """
    Add an admin note to a message
    
    Notes are timestamped and attributed to the admin who wrote them.
    Multiple notes can be added to a single message.
    """
    try:
        admin_id = admin.get("admin_id")
        
        success = messages_service.add_admin_note(message_id, request.note, admin_id)
        
        return MessageActionResponse(
            success=True,
            message="Admin note added successfully",
            data={'message_id': message_id}
        )
        
    except Exception as e:
        logger.error("Failed to add admin note", error=str(e))
        raise


@router.delete("/{message_id}", response_model=MessageActionResponse)
async def delete_message(
    message_id: str,
    admin: dict = Depends(get_admin_user_dependency),
    messages_service: AdminMessagesService = Depends(get_admin_messages_service)
):
    """
    Delete a message permanently
    
    This action cannot be undone.
    """
    try:
        success = messages_service.delete_message(message_id)
        
        return MessageActionResponse(
            success=True,
            message="Message deleted successfully",
            data={'message_id': message_id}
        )
        
    except Exception as e:
        logger.error("Failed to delete message", error=str(e))
        raise
