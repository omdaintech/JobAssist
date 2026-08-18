"""
Message Repository - Message Operations for Contact & Feedback
Handles all message-related database operations for both contact and feedback
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
import structlog
from sqlalchemy import and_, or_, desc

from app.common.models.mysql_odm_service import BaseMySQLODMService, require_mysql_connection
from app.common.models.mysql_models import Message, MessageTypeEnum, FeedbackCategoryEnum, SeverityEnum
from app.common.services.mysql_service import MySQLOperations

logger = structlog.get_logger()


class MessageRepository(BaseMySQLODMService):
    """
    Message Repository
    Handles all message operations for both contact forms and feedback
    """

    def __init__(self):
        super().__init__()
        self.message_ops = MySQLOperations(Message, self.mysql_service)
        logger.info("Message Repository initialized")

    @require_mysql_connection
    def create_contact_message(self, message_data: Dict[str, Any]) -> str:
        """
        Create new contact message
        
        Args:
            message_data: Dict with name, email, subject, message, source, ip_address, user_agent
            
        Returns:
            str: Message ID
        """
        try:
            message_id = self.generate_id()
            
            contact_message = {
                'id': message_id,
                'message_type': MessageTypeEnum.contact,
                'name': message_data.get('name'),
                'email': message_data.get('email'),
                'subject': message_data.get('subject'),
                'message': message_data.get('message'),
                'source': message_data.get('source', 'website'),
                'ip_address': message_data.get('ip_address'),
                'user_agent': message_data.get('user_agent'),
                'is_read': False
            }
            
            self.message_ops.create(**contact_message)
            logger.info("Contact message created", message_id=message_id, email=message_data.get('email'))
            return message_id
            
        except Exception as e:
            logger.error("Failed to create contact message", error=str(e))
            raise Exception(f"Failed to create contact message: {str(e)}")

    @require_mysql_connection
    def create_feedback_message(self, user_id: str, feedback_data: Dict[str, Any]) -> str:
        """
        Create new feedback message
        
        Args:
            user_id: User ID who submitted feedback
            feedback_data: Dict with message, category, user_context, severity, source, ip_address, user_agent
            
        Returns:
            str: Message ID
        """
        try:
            message_id = self.generate_id()
            
            # Get user email if available
            user = self.user_ops.get_by_id(user_id)
            user_email = user.email if user else None
            user_name = user.name if user else None
            
            feedback_message = {
                'id': message_id,
                'message_type': MessageTypeEnum.feedback,
                'user_id': user_id,
                'email': user_email,
                'name': user_name,
                'message': feedback_data.get('message'),
                'category': feedback_data.get('category'),
                'user_context': feedback_data.get('user_context', {}),
                'severity': feedback_data.get('severity', SeverityEnum.medium),
                'source': feedback_data.get('source', 'app'),
                'ip_address': feedback_data.get('ip_address'),
                'user_agent': feedback_data.get('user_agent'),
                'is_read': False
            }
            
            self.message_ops.create(**feedback_message)
            logger.info("Feedback message created", message_id=message_id, user_id=user_id)
            return message_id
            
        except Exception as e:
            logger.error("Failed to create feedback message", error=str(e), user_id=user_id)
            raise Exception(f"Failed to create feedback message: {str(e)}")

    @require_mysql_connection
    def get_messages(self, filters: Dict[str, Any], limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Get messages with filtering
        
        Args:
            filters: Dict with message_type, is_read, category, severity, email, search_text, start_date, end_date
            limit: Max number of results
            offset: Pagination offset
            
        Returns:
            List of message dictionaries
        """
        try:
            with self.mysql_service.get_db() as session:
                query = session.query(Message)
                
                # Apply filters
                if filters.get('message_type'):
                    query = query.filter(Message.message_type == filters['message_type'])
                
                if filters.get('is_read') is not None:
                    query = query.filter(Message.is_read == filters['is_read'])
                
                if filters.get('category'):
                    query = query.filter(Message.category == filters['category'])
                
                if filters.get('severity'):
                    query = query.filter(Message.severity == filters['severity'])
                
                if filters.get('email'):
                    query = query.filter(Message.email.like(f"%{filters['email']}%"))
                
                if filters.get('search_text'):
                    search = f"%{filters['search_text']}%"
                    query = query.filter(
                        or_(
                            Message.message.like(search),
                            Message.subject.like(search),
                            Message.name.like(search),
                            Message.email.like(search)
                        )
                    )
                
                if filters.get('start_date'):
                    query = query.filter(Message.created_at >= filters['start_date'])
                
                if filters.get('end_date'):
                    query = query.filter(Message.created_at <= filters['end_date'])
                
                # Order by created_at desc
                query = query.order_by(desc(Message.created_at))
                
                # Pagination
                query = query.limit(limit).offset(offset)
                
                messages = query.all()
                
                # Convert to dict
                result = []
                for msg in messages:
                    result.append({
                        'id': msg.id,
                        'message_type': msg.message_type.value if msg.message_type else None,
                        'name': msg.name,
                        'email': msg.email,
                        'subject': msg.subject,
                        'message': msg.message,
                        'user_id': msg.user_id,
                        'category': msg.category.value if msg.category else None,
                        'severity': msg.severity.value if msg.severity else None,
                        'source': msg.source,
                        'is_read': msg.is_read,
                        'admin_notes': msg.admin_notes,
                        'read_at': msg.read_at.isoformat() if msg.read_at else None,
                        'read_by': msg.read_by,
                        'created_at': msg.created_at.isoformat() if msg.created_at else None,
                        'updated_at': msg.updated_at.isoformat() if msg.updated_at else None
                    })
                
                return result
                
        except Exception as e:
            logger.error("Failed to get messages", error=str(e))
            return []

    @require_mysql_connection
    def get_message_by_id(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Get single message by ID"""
        try:
            message = self.message_ops.get_by_id(message_id)
            if message:
                return {
                    'id': message.id,
                    'message_type': message.message_type.value if message.message_type else None,
                    'name': message.name,
                    'email': message.email,
                    'subject': message.subject,
                    'message': message.message,
                    'user_id': message.user_id,
                    'category': message.category.value if message.category else None,
                    'user_context': message.user_context,
                    'severity': message.severity.value if message.severity else None,
                    'source': message.source,
                    'ip_address': message.ip_address,
                    'user_agent': message.user_agent,
                    'is_read': message.is_read,
                    'admin_notes': message.admin_notes,
                    'read_at': message.read_at.isoformat() if message.read_at else None,
                    'read_by': message.read_by,
                    'created_at': message.created_at.isoformat() if message.created_at else None,
                    'updated_at': message.updated_at.isoformat() if message.updated_at else None
                }
            return None
        except Exception as e:
            logger.error("Failed to get message by id", message_id=message_id, error=str(e))
            return None

    @require_mysql_connection
    def mark_as_read(self, message_id: str, admin_id: str, is_read: bool = True) -> bool:
        """Mark message as read/unread"""
        try:
            update_data = {
                'is_read': is_read,
                'read_by': admin_id if is_read else None,
                'read_at': datetime.utcnow() if is_read else None
            }
            
            success = self.message_ops.update(message_id, **update_data)
            logger.info("Message read status updated", message_id=message_id, is_read=is_read)
            return success
            
        except Exception as e:
            logger.error("Failed to update message read status", message_id=message_id, error=str(e))
            return False

    @require_mysql_connection
    def add_admin_note(self, message_id: str, note: str, admin_id: str) -> bool:
        """Add admin note to message"""
        try:
            # Get existing message to preserve current notes
            message = self.message_ops.get_by_id(message_id)
            if not message:
                return False
            
            # Append new note with timestamp
            timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            new_note = f"[{timestamp}] Admin {admin_id}: {note}"
            
            existing_notes = message.admin_notes or ""
            updated_notes = f"{existing_notes}\n\n{new_note}".strip()
            
            success = self.message_ops.update(message_id, admin_notes=updated_notes)
            logger.info("Admin note added to message", message_id=message_id)
            return success
            
        except Exception as e:
            logger.error("Failed to add admin note", message_id=message_id, error=str(e))
            return False

    @require_mysql_connection
    def get_user_feedback_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get feedback history for specific user"""
        try:
            with self.mysql_service.get_db() as session:
                messages = session.query(Message).filter(
                    and_(
                        Message.message_type == MessageTypeEnum.feedback,
                        Message.user_id == user_id
                    )
                ).order_by(desc(Message.created_at)).limit(limit).all()
                
                result = []
                for msg in messages:
                    result.append({
                        'id': msg.id,
                        'message': msg.message,
                        'category': msg.category.value if msg.category else None,
                        'severity': msg.severity.value if msg.severity else None,
                        'is_read': msg.is_read,
                        'created_at': msg.created_at.isoformat() if msg.created_at else None
                    })
                
                return result
                
        except Exception as e:
            logger.error("Failed to get user feedback history", user_id=user_id, error=str(e))
            return []

    @require_mysql_connection
    def get_message_statistics(self) -> Dict[str, Any]:
        """Get message statistics for admin dashboard"""
        try:
            with self.mysql_service.get_db() as session:
                from sqlalchemy import func
                
                # Total counts by type
                total_contact = session.query(func.count(Message.id)).filter(
                    Message.message_type == MessageTypeEnum.contact
                ).scalar() or 0
                
                total_feedback = session.query(func.count(Message.id)).filter(
                    Message.message_type == MessageTypeEnum.feedback
                ).scalar() or 0
                
                # Unread counts
                unread_contact = session.query(func.count(Message.id)).filter(
                    and_(
                        Message.message_type == MessageTypeEnum.contact,
                        Message.is_read == False
                    )
                ).scalar() or 0
                
                unread_feedback = session.query(func.count(Message.id)).filter(
                    and_(
                        Message.message_type == MessageTypeEnum.feedback,
                        Message.is_read == False
                    )
                ).scalar() or 0
                
                # Return with frontend-expected field names
                return {
                    'total_messages': total_contact + total_feedback,
                    'contact_messages': total_contact,
                    'feedback_messages': total_feedback,
                    'unread_messages': unread_contact + unread_feedback,
                    'by_category': {},  # Can be populated later if needed
                    'by_severity': {}   # Can be populated later if needed
                }
                
        except Exception as e:
            logger.error("Failed to get message statistics", error=str(e))
            return {}

    @require_mysql_connection
    def delete_message(self, message_id: str) -> bool:
        """Delete a message"""
        try:
            success = self.message_ops.delete(message_id)
            logger.info("Message deleted", message_id=message_id)
            return success
        except Exception as e:
            logger.error("Failed to delete message", message_id=message_id, error=str(e))
            return False


def get_message_repository() -> MessageRepository:
    """Dependency for FastAPI endpoints"""
    return MessageRepository()
