"""
Admin Payment Repository - ADMIN DOMAIN PAYMENT MANAGEMENT
Handles payment transaction queries, manual credit topups, and admin payment operations
Following layered architecture: Domain Layer for admin payment data access
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal
import structlog
import json

from app.common.models.mysql_odm_service import BaseMySQLODMService, require_mysql_connection
from app.common.models.mysql_models import (
    PaymentTransaction,
    PaymentStatusEnum,
    UserAccess,
    PricingPack,
    User
)
from app.common.models.id_generator import generate_id

logger = structlog.get_logger()


class AdminPaymentRepository(BaseMySQLODMService):
    """
    Admin Payment Repository - Admin Domain
    Handles all admin payment management operations: transaction listing,
    manual captures, credit topups, and payment history
    """

    # =================
    # TRANSACTION LISTING
    # =================

    @require_mysql_connection
    def list_transactions(
        self,
        status: Optional[str] = None,
        user_email: Optional[str] = None,
        gateway: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """
        List payment transactions with filtering and pagination
        Joins with users table to include user information
        
        Args:
            status: Filter by transaction status
            user_email: Filter by user email
            gateway: Filter by payment gateway
            start_date: Filter by start date (ISO format)
            end_date: Filter by end date (ISO format)
            search: Search in user email, name, or order ID
            limit: Number of results to return
            offset: Pagination offset
            sort_by: Field to sort by
            sort_order: Sort order (asc/desc)
            
        Returns:
            Dict with transactions list and total count
        """
        try:
            with self.mysql_service.get_db() as session:
                # Build query with joins
                query = session.query(
                    PaymentTransaction,
                    User.email.label('user_email'),
                    User.name.label('user_name'),
                    PricingPack.pack_name.label('pricing_pack_name')
                ).join(
                    User,
                    PaymentTransaction.user_id == User.id
                ).outerjoin(
                    PricingPack,
                    PaymentTransaction.pricing_pack_id == PricingPack.id
                )
                
                # Apply filters
                if status:
                    query = query.filter(PaymentTransaction.status == status)
                
                if user_email:
                    query = query.filter(User.email.ilike(f"%{user_email}%"))
                
                if gateway:
                    query = query.filter(PaymentTransaction.gateway_provider == gateway)
                
                if start_date:
                    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    query = query.filter(PaymentTransaction.created_at >= start_dt)
                
                if end_date:
                    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    query = query.filter(PaymentTransaction.created_at <= end_dt)
                
                if search:
                    search_pattern = f"%{search}%"
                    query = query.filter(
                        (User.email.ilike(search_pattern)) |
                        (User.name.ilike(search_pattern)) |
                        (PaymentTransaction.gateway_order_id.ilike(search_pattern)) |
                        (PaymentTransaction.id.ilike(search_pattern))
                    )
                
                # Get total count before pagination
                total = query.count()
                
                # Apply sorting
                if sort_by == "created_at":
                    sort_column = PaymentTransaction.created_at
                elif sort_by == "completed_at":
                    sort_column = PaymentTransaction.completed_at
                elif sort_by == "amount_value":
                    sort_column = PaymentTransaction.amount_value
                else:
                    sort_column = PaymentTransaction.created_at
                
                if sort_order == "asc":
                    query = query.order_by(sort_column.asc())
                else:
                    query = query.order_by(sort_column.desc())
                
                # Apply pagination
                query = query.limit(limit).offset(offset)
                
                # Execute query
                results = query.all()
                
                # Format results
                transactions = []
                for row in results:
                    txn = row[0]  # PaymentTransaction object
                    transactions.append({
                        "id": txn.id,
                        "user_id": txn.user_id,
                        "user_email": row.user_email,
                        "user_name": row.user_name,
                        "gateway_provider": txn.gateway_provider,
                        "gateway_order_id": txn.gateway_order_id,
                        "gateway_capture_id": txn.gateway_capture_id,
                        "amount_value": float(txn.amount_value),
                        "currency_code": txn.currency_code,
                        "credits_purchased": txn.credits_purchased,
                        "pricing_pack_id": txn.pricing_pack_id,
                        "pricing_pack_name": row.pricing_pack_name,
                        "status": txn.status.value,
                        "created_at": txn.created_at.isoformat() if txn.created_at else None,
                        "completed_at": txn.completed_at.isoformat() if txn.completed_at else None,
                        "webhook_received_at": txn.webhook_received_at.isoformat() if txn.webhook_received_at else None
                    })
                
                logger.info(
                    "ADMIN_TRANSACTIONS_LISTED",
                    total=total,
                    returned=len(transactions),
                    filters={
                        "status": status,
                        "user_email": user_email,
                        "gateway": gateway,
                        "search": search
                    }
                )
                
                return {
                    "success": True,
                    "transactions": transactions,
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "filters_applied": {
                        "status": status,
                        "user_email": user_email,
                        "gateway": gateway,
                        "start_date": start_date,
                        "end_date": end_date,
                        "search": search
                    }
                }
                
        except Exception as e:
            logger.error(
                "ADMIN_LIST_TRANSACTIONS_FAILED",
                error=str(e),
                exc_info=True
            )
            return {
                "success": False,
                "message": f"Failed to list transactions: {str(e)}",
                "transactions": [],
                "total": 0
            }

    # =================
    # TRANSACTION DETAILS
    # =================

    @require_mysql_connection
    def get_transaction_details(self, transaction_id: str) -> Dict[str, Any]:
        """
        Get detailed transaction information with user and credit data
        
        Args:
            transaction_id: Transaction ID
            
        Returns:
            Dict with complete transaction details
        """
        try:
            with self.mysql_service.get_db() as session:
                # Query with joins
                result = session.query(
                    PaymentTransaction,
                    User.email.label('user_email'),
                    User.name.label('user_name'),
                    UserAccess.allocated_count.label('user_current_credits'),
                    UserAccess.used_count.label('user_used_credits'),
                    UserAccess.topups.label('user_topups'),
                    PricingPack.pack_name.label('pricing_pack_name'),
                    PricingPack.price_euros.label('pricing_pack_price')
                ).join(
                    User,
                    PaymentTransaction.user_id == User.id
                ).outerjoin(
                    UserAccess,
                    PaymentTransaction.user_id == UserAccess.user_id
                ).outerjoin(
                    PricingPack,
                    PaymentTransaction.pricing_pack_id == PricingPack.id
                ).filter(
                    PaymentTransaction.id == transaction_id
                ).first()
                
                if not result:
                    logger.warning("ADMIN_TRANSACTION_NOT_FOUND", transaction_id=transaction_id)
                    return {
                        "success": False,
                        "message": "Transaction not found"
                    }
                
                txn = result[0]  # PaymentTransaction object
                
                # Find related topup record
                topup_record = None
                if result.user_topups:
                    topups = result.user_topups if isinstance(result.user_topups, list) else json.loads(result.user_topups)
                    for topup in topups:
                        if topup.get("transaction_id") == transaction_id or topup.get("gateway_order_id") == txn.gateway_order_id:
                            topup_record = topup
                            break
                
                transaction_details = {
                    "id": txn.id,
                    "user": {
                        "id": txn.user_id,
                        "email": result.user_email,
                        "name": result.user_name,
                        "current_credits": result.user_current_credits or 0,
                        "used_credits": result.user_used_credits or 0,
                        "remaining_credits": (result.user_current_credits or 0) - (result.user_used_credits or 0)
                    },
                    "payment": {
                        "gateway_provider": txn.gateway_provider,
                        "gateway_order_id": txn.gateway_order_id,
                        "gateway_capture_id": txn.gateway_capture_id,
                        "gateway_payer_email": txn.gateway_payer_email,
                        "gateway_payer_id": txn.gateway_payer_id,
                        "amount_value": float(txn.amount_value),
                        "currency_code": txn.currency_code,
                        "credits_purchased": txn.credits_purchased,
                        "pricing_pack": {
                            "id": txn.pricing_pack_id,
                            "name": result.pricing_pack_name,
                            "price": float(result.pricing_pack_price) if result.pricing_pack_price else None
                        }
                    },
                    "status": txn.status.value,
                    "timestamps": {
                        "created_at": txn.created_at.isoformat() if txn.created_at else None,
                        "completed_at": txn.completed_at.isoformat() if txn.completed_at else None,
                        "webhook_received_at": txn.webhook_received_at.isoformat() if txn.webhook_received_at else None
                    },
                    "webhook_payload": txn.webhook_payload,
                    "topup_record": topup_record
                }
                
                logger.info(
                    "ADMIN_TRANSACTION_DETAILS_RETRIEVED",
                    transaction_id=transaction_id,
                    status=txn.status.value
                )
                
                return {
                    "success": True,
                    "transaction": transaction_details
                }
                
        except Exception as e:
            logger.error(
                "ADMIN_GET_TRANSACTION_DETAILS_FAILED",
                transaction_id=transaction_id,
                error=str(e),
                exc_info=True
            )
            return {
                "success": False,
                "message": f"Failed to get transaction details: {str(e)}"
            }

    # =================
    # HELPER METHODS
    # =================

    @require_mysql_connection
    def get_transaction_by_id(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """
        Get transaction by ID (simple lookup without joins)
        
        Args:
            transaction_id: Transaction ID
            
        Returns:
            Transaction dict or None
        """
        try:
            with self.mysql_service.get_db() as session:
                txn = session.query(PaymentTransaction).filter(
                    PaymentTransaction.id == transaction_id
                ).first()
                
                if not txn:
                    return None
                
                return {
                    "id": txn.id,
                    "user_id": txn.user_id,
                    "gateway_provider": txn.gateway_provider,
                    "gateway_order_id": txn.gateway_order_id,
                    "gateway_capture_id": txn.gateway_capture_id,
                    "amount_value": float(txn.amount_value),
                    "currency_code": txn.currency_code,
                    "credits_purchased": txn.credits_purchased,
                    "pricing_pack_id": txn.pricing_pack_id,
                    "status": txn.status.value,
                    "created_at": txn.created_at.isoformat() if txn.created_at else None,
                    "completed_at": txn.completed_at.isoformat() if txn.completed_at else None
                }
                
        except Exception as e:
            logger.error(
                "GET_TRANSACTION_BY_ID_FAILED",
                transaction_id=transaction_id,
                error=str(e)
            )
            return None

    @require_mysql_connection
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user basic information
        
        Args:
            user_id: User ID
            
        Returns:
            User dict or None
        """
        try:
            with self.mysql_service.get_db() as session:
                user = session.query(User).filter(User.id == user_id).first()
                
                if not user:
                    return None
                
                return {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "is_active": user.is_active
                }
                
        except Exception as e:
            logger.error(
                "GET_USER_BY_ID_FAILED",
                user_id=user_id,
                error=str(e)
            )
            return None

    # =================
    # MANUAL CREDIT TOPUP
    # =================

    @require_mysql_connection
    def add_credits_to_user(
        self,
        user_id: str,
        credits: int,
        admin_id: str,
        reason: str,
        pricing_pack_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Manually add credits to user account
        Updates allocated_count and appends to topups JSON
        
        Args:
            user_id: User ID
            credits: Number of credits to add
            admin_id: Admin ID performing the action
            reason: Reason for manual topup
            pricing_pack_id: Optional pricing pack reference
            
        Returns:
            Dict with success status and updated credit info
        """
        try:
            with self.mysql_service.get_db() as session:
                # Get user_access record with lock
                user_access = session.query(UserAccess).filter(
                    UserAccess.user_id == user_id
                ).with_for_update().first()
                
                if not user_access:
                    logger.error("USER_ACCESS_NOT_FOUND", user_id=user_id)
                    return {
                        "success": False,
                        "message": "User access record not found"
                    }
                
                # Store old values for logging
                old_allocated = user_access.allocated_count
                
                # Add credits
                user_access.allocated_count += credits
                
                # Generate topup ID
                topup_id = generate_id()
                
                # Update topups JSON array
                topups = user_access.topups or []
                if isinstance(topups, str):
                    topups = json.loads(topups)
                
                topup_entry = {
                    "topup_id": topup_id,
                    "credits_added": credits,
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "admin",
                    "admin_id": admin_id,
                    "reason": reason,
                    "pricing_pack_id": pricing_pack_id
                }
                topups.append(topup_entry)
                user_access.topups = topups
                
                session.commit()
                
                logger.info(
                    "ADMIN_MANUAL_TOPUP_SUCCESS",
                    user_id=user_id,
                    admin_id=admin_id,
                    credits_added=credits,
                    old_allocated=old_allocated,
                    new_allocated=user_access.allocated_count,
                    topup_id=topup_id,
                    reason=reason
                )
                
                return {
                    "success": True,
                    "message": "Credits added successfully",
                    "topup_id": topup_id,
                    "credits_added": credits,
                    "old_allocated": old_allocated,
                    "new_total_credits": user_access.allocated_count,
                    "remaining_credits": user_access.allocated_count - user_access.used_count
                }
                
        except Exception as e:
            logger.error(
                "ADMIN_ADD_CREDITS_FAILED",
                user_id=user_id,
                admin_id=admin_id,
                credits=credits,
                error=str(e),
                exc_info=True
            )
            return {
                "success": False,
                "message": f"Failed to add credits: {str(e)}"
            }


def get_admin_payment_repository() -> AdminPaymentRepository:
    """Dependency injection for AdminPaymentRepository"""
    return AdminPaymentRepository()
