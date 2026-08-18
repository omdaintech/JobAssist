"""
Admin Messages Service
Handles admin operations for contact and feedback messages
"""

import structlog
from typing import Dict, Any
from fastapi import HTTPException

from app.common.models.message_repository import MessageRepository

logger = structlog.get_logger()


class AdminMessagesService:
    """Service for admin message management"""

    def __init__(self):
        self.message_repository = MessageRepository()

    def get_messages(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get messages with filtering
        
        Args:
            filters: Filter parameters
            
        Returns:
            Dict with messages list and count
        """
        try:
            limit = filters.pop('limit', 50)
            offset = filters.pop('offset', 0)
            
            # Convert 'all' message_type to None
            if filters.get('message_type') == 'all':
                filters['message_type'] = None
            
            messages = self.message_repository.get_messages(filters, limit, offset)
            
            logger.info("Messages retrieved for admin", count=len(messages))
            
            return {
                'messages': messages,
                'count': len(messages),
                'limit': limit,
                'offset': offset
            }
            
        except Exception as e:
            logger.error("Failed to get messages", error=str(e))
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve messages"
            )

    def get_message_detail(self, message_id: str) -> Dict[str, Any]:
        """
        Get single message detail
        
        Args:
            message_id: Message ID
            
        Returns:
            Message detail dict
        """
        try:
            message = self.message_repository.get_message_by_id(message_id)
            
            if not message:
                raise HTTPException(
                    status_code=404,
                    detail="Message not found"
                )
            
            return message
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to get message detail", message_id=message_id, error=str(e))
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve message detail"
            )

    def mark_message_read(self, message_id: str, admin_id: str, is_read: bool) -> bool:
        """
        Mark message as read/unread
        
        Args:
            message_id: Message ID
            admin_id: Admin user ID
            is_read: Read status
            
        Returns:
            Success boolean
        """
        try:
            success = self.message_repository.mark_as_read(message_id, admin_id, is_read)
            
            if not success:
                raise HTTPException(
                    status_code=404,
                    detail="Message not found"
                )
            
            logger.info("Message read status updated", message_id=message_id, is_read=is_read)
            return success
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to update message read status", error=str(e))
            raise HTTPException(
                status_code=500,
                detail="Failed to update message status"
            )

    def add_admin_note(self, message_id: str, note: str, admin_id: str) -> bool:
        """
        Add admin note to message
        
        Args:
            message_id: Message ID
            note: Note content
            admin_id: Admin user ID
            
        Returns:
            Success boolean
        """
        try:
            success = self.message_repository.add_admin_note(message_id, note, admin_id)
            
            if not success:
                raise HTTPException(
                    status_code=404,
                    detail="Message not found"
                )
            
            logger.info("Admin note added to message", message_id=message_id)
            return success
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to add admin note", error=str(e))
            raise HTTPException(
                status_code=500,
                detail="Failed to add note"
            )

    def delete_message(self, message_id: str) -> bool:
        """
        Delete a message
        
        Args:
            message_id: Message ID
            
        Returns:
            Success boolean
        """
        try:
            success = self.message_repository.delete_message(message_id)
            
            if not success:
                raise HTTPException(
                    status_code=404,
                    detail="Message not found"
                )
            
            logger.info("Message deleted", message_id=message_id)
            return success
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to delete message", error=str(e))
            raise HTTPException(
                status_code=500,
                detail="Failed to delete message"
            )

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get message statistics
        
        Returns:
            Statistics dict
        """
        try:
            stats = self.message_repository.get_message_statistics()
            return stats
            
        except Exception as e:
            logger.error("Failed to get message statistics", error=str(e))
            return {}


def get_admin_messages_service() -> AdminMessagesService:
    """Dependency for FastAPI endpoints"""
    return AdminMessagesService()
