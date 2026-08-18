"""
Payment Repository - USER DOMAIN PAYMENT OPERATIONS
Handles payment transaction logging, credit allocation, and payment history
Following layered architecture: Domain Layer for payment-specific data access
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal
import structlog
import json

# Import shared base service
from app.common.models.mysql_odm_service import BaseMySQLODMService, require_mysql_connection
from app.common.models.mysql_models import (
    PaymentTransaction, 
    PaymentStatusEnum,
    UserAccess,
    PricingPack,
    User
)

logger = structlog.get_logger()


class PaymentRepository(BaseMySQLODMService):
    """
    Payment Repository - Payment Domain
    Handles all payment-specific database operations: transaction logging, 
    credit allocation, payment history
    """

    # =================
    # TRANSACTION MANAGEMENT
    # =================

    @require_mysql_connection
    def create_transaction(
        self,
        user_id: str,
        pricing_pack_id: str,
        gateway_provider: str,
        gateway_order_id: Optional[str],
        amount_value: Decimal,
        currency_code: str,
        credits_purchased: int
    ) -> Dict[str, Any]:
        """
        Create a new payment transaction record
        
        Args:
            user_id: User ID
            pricing_pack_id: Pricing pack ID
            gateway_provider: Payment gateway (paypal, stripe, etc.)
            gateway_order_id: Gateway's order ID
            amount_value: Amount to be paid
            currency_code: Currency (EUR, USD, etc.)
            credits_purchased: Number of credits to be purchased
            
        Returns:
            Dict with success status and transaction_id
        """
        try:
            with self.mysql_service.get_db() as session:
                # Generate transaction ID
                transaction_id = self.generate_id()
                
                # Create transaction record
                transaction = PaymentTransaction(
                    id=transaction_id,
                    user_id=user_id,
                    gateway_provider=gateway_provider,
                    gateway_order_id=gateway_order_id,
                    amount_value=amount_value,
                    currency_code=currency_code,
                    credits_purchased=credits_purchased,
                    pricing_pack_id=pricing_pack_id,
                    status=PaymentStatusEnum.created,
                    created_at=datetime.utcnow()
                )
                
                session.add(transaction)
                session.commit()
                
                logger.info(
                    "PAYMENT_TRANSACTION_CREATED",
                    transaction_id=transaction_id,
                    user_id=user_id,
                    gateway_provider=gateway_provider,
                    gateway_order_id=gateway_order_id,
                    amount=float(amount_value),
                    credits=credits_purchased
                )
                
                return {
                    "success": True,
                    "transaction_id": transaction_id,
                    "gateway_order_id": gateway_order_id
                }
                
        except Exception as e:
            logger.error(
                "PAYMENT_TRANSACTION_CREATE_FAILED",
                user_id=user_id,
                gateway_order_id=gateway_order_id,
                error=str(e)
            )
            return {
                "success": False,
                "message": f"Failed to create transaction: {str(e)}"
            }

    @require_mysql_connection
    def update_transaction_order_id(
        self,
        transaction_id: str,
        gateway_order_id: str
    ) -> Dict[str, Any]:
        """
        Update transaction with PayPal order ID after order creation
        
        Args:
            transaction_id: Internal transaction ID
            gateway_order_id: PayPal's order ID
            
        Returns:
            Dict with success status
        """
        try:
            # Validate gateway_order_id is not empty
            if not gateway_order_id or not gateway_order_id.strip():
                logger.error(
                    "EMPTY_GATEWAY_ORDER_ID",
                    transaction_id=transaction_id
                )
                return {
                    "success": False,
                    "message": "Gateway order ID cannot be empty"
                }
            
            with self.mysql_service.get_db() as session:
                transaction = session.query(PaymentTransaction).filter(
                    PaymentTransaction.id == transaction_id
                ).first()
                
                if not transaction:
                    logger.error(
                        "TRANSACTION_NOT_FOUND_FOR_UPDATE",
                        transaction_id=transaction_id
                    )
                    return {
                        "success": False,
                        "message": "Transaction not found"
                    }
                
                # Update with PayPal order ID
                transaction.gateway_order_id = gateway_order_id
                session.commit()
                
                logger.info(
                    "TRANSACTION_ORDER_ID_UPDATED",
                    transaction_id=transaction_id,
                    gateway_order_id=gateway_order_id
                )
                
                return {
                    "success": True,
                    "transaction_id": transaction_id
                }
                
        except Exception as e:
            logger.error(
                "UPDATE_TRANSACTION_ORDER_ID_FAILED",
                transaction_id=transaction_id,
                gateway_order_id=gateway_order_id,
                error=str(e)
            )
            return {
                "success": False,
                "message": str(e)
            }

    @require_mysql_connection
    def get_transaction_by_gateway_order(
        self,
        gateway_provider: str,
        gateway_order_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get transaction by gateway provider and order ID
        
        Args:
            gateway_provider: Payment gateway name
            gateway_order_id: Gateway's order ID
            
        Returns:
            Transaction dict or None
        """
        try:
            with self.mysql_service.get_db() as session:
                transaction = session.query(PaymentTransaction).filter(
                    PaymentTransaction.gateway_provider == gateway_provider,
                    PaymentTransaction.gateway_order_id == gateway_order_id
                ).first()
                
                if not transaction:
                    return None
                
                return {
                    "id": transaction.id,
                    "user_id": transaction.user_id,
                    "gateway_provider": transaction.gateway_provider,
                    "gateway_order_id": transaction.gateway_order_id,
                    "gateway_capture_id": transaction.gateway_capture_id,
                    "amount_value": float(transaction.amount_value),
                    "currency_code": transaction.currency_code,
                    "credits_purchased": transaction.credits_purchased,
                    "pricing_pack_id": transaction.pricing_pack_id,
                    "status": transaction.status.value,
                    "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
                    "completed_at": transaction.completed_at.isoformat() if transaction.completed_at else None
                }
                
        except Exception as e:
            logger.error(
                "GET_TRANSACTION_BY_GATEWAY_ORDER_FAILED",
                gateway_provider=gateway_provider,
                gateway_order_id=gateway_order_id,
                error=str(e)
            )
            return None

    @require_mysql_connection
    def complete_transaction(
        self,
        gateway_provider: str,
        gateway_order_id: str,
        gateway_capture_id: str,
        gateway_payer_email: Optional[str],
        gateway_payer_id: Optional[str],
        webhook_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Mark transaction as completed and add credits to user
        
        Args:
            gateway_provider: Payment gateway name
            gateway_order_id: Gateway's order ID
            gateway_capture_id: Gateway's capture/transaction ID
            gateway_payer_email: Payer's email
            gateway_payer_id: Payer's ID from gateway
            webhook_payload: Full webhook payload for audit
            
        Returns:
            Dict with success status and credits added
        """
        try:
            with self.mysql_service.get_db() as session:
                # Find transaction
                transaction = session.query(PaymentTransaction).filter(
                    PaymentTransaction.gateway_provider == gateway_provider,
                    PaymentTransaction.gateway_order_id == gateway_order_id
                ).first()
                
                if not transaction:
                    logger.error(
                        "COMPLETE_TRANSACTION_NOT_FOUND",
                        gateway_provider=gateway_provider,
                        gateway_order_id=gateway_order_id
                    )
                    return {
                        "success": False,
                        "message": "Transaction not found"
                    }
                
                # Check if already completed (idempotency)
                if transaction.status == PaymentStatusEnum.completed:
                    logger.warning(
                        "TRANSACTION_ALREADY_COMPLETED",
                        transaction_id=transaction.id,
                        gateway_order_id=gateway_order_id
                    )
                    return {
                        "success": True,
                        "message": "Transaction already completed",
                        "transaction_id": transaction.id,
                        "credits_added": 0,  # Already added before
                        "idempotent": True
                    }
                
                # Update transaction
                transaction.status = PaymentStatusEnum.completed
                transaction.gateway_capture_id = gateway_capture_id
                transaction.gateway_payer_email = gateway_payer_email
                transaction.gateway_payer_id = gateway_payer_id
                transaction.completed_at = datetime.utcnow()
                transaction.webhook_received_at = datetime.utcnow()
                transaction.webhook_payload = webhook_payload
                
                # Add credits to user
                user_access = session.query(UserAccess).filter(
                    UserAccess.user_id == transaction.user_id
                ).first()
                
                if not user_access:
                    logger.error(
                        "USER_ACCESS_NOT_FOUND",
                        user_id=transaction.user_id,
                        transaction_id=transaction.id
                    )
                    return {
                        "success": False,
                        "message": "User access record not found"
                    }
                
                # Add credits
                old_allocated = user_access.allocated_count
                user_access.allocated_count += transaction.credits_purchased
                
                # Update topups JSON array
                topups = user_access.topups or []
                if isinstance(topups, str):
                    topups = json.loads(topups)
                
                topup_entry = {
                    "transaction_id": transaction.id,
                    "credits_added": transaction.credits_purchased,
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": gateway_provider,
                    "gateway_order_id": gateway_order_id,
                    "amount_paid": float(transaction.amount_value),
                    "currency": transaction.currency_code
                }
                topups.append(topup_entry)
                user_access.topups = topups
                
                session.commit()
                
                logger.info(
                    "PAYMENT_COMPLETED",
                    transaction_id=transaction.id,
                    user_id=transaction.user_id,
                    gateway_order_id=gateway_order_id,
                    credits_added=transaction.credits_purchased,
                    old_allocated=old_allocated,
                    new_allocated=user_access.allocated_count
                )
                
                return {
                    "success": True,
                    "message": "Payment completed and credits added",
                    "transaction_id": transaction.id,
                    "credits_added": transaction.credits_purchased,
                    "total_credits": user_access.allocated_count,
                    "remaining_credits": user_access.allocated_count - user_access.used_count
                }
                
        except Exception as e:
            logger.error(
                "COMPLETE_TRANSACTION_FAILED",
                gateway_provider=gateway_provider,
                gateway_order_id=gateway_order_id,
                error=str(e),
                exc_info=True
            )
            return {
                "success": False,
                "message": f"Failed to complete transaction: {str(e)}"
            }

    @require_mysql_connection
    def fail_transaction(
        self,
        gateway_provider: str,
        gateway_order_id: str,
        reason: str,
        webhook_payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Mark transaction as failed
        
        Args:
            gateway_provider: Payment gateway name
            gateway_order_id: Gateway's order ID
            reason: Failure reason
            webhook_payload: Webhook payload if available
            
        Returns:
            Dict with success status
        """
        try:
            with self.mysql_service.get_db() as session:
                transaction = session.query(PaymentTransaction).filter(
                    PaymentTransaction.gateway_provider == gateway_provider,
                    PaymentTransaction.gateway_order_id == gateway_order_id
                ).first()
                
                if not transaction:
                    return {
                        "success": False,
                        "message": "Transaction not found"
                    }
                
                transaction.status = PaymentStatusEnum.failed
                if webhook_payload:
                    transaction.webhook_received_at = datetime.utcnow()
                    transaction.webhook_payload = webhook_payload
                
                session.commit()
                
                logger.warning(
                    "PAYMENT_FAILED",
                    transaction_id=transaction.id,
                    gateway_order_id=gateway_order_id,
                    reason=reason
                )
                
                return {
                    "success": True,
                    "message": "Transaction marked as failed"
                }
                
        except Exception as e:
            logger.error(
                "FAIL_TRANSACTION_ERROR",
                gateway_order_id=gateway_order_id,
                error=str(e)
            )
            return {
                "success": False,
                "message": str(e)
            }

    # =================
    # PAYMENT HISTORY
    # =================

    @require_mysql_connection
    def get_user_payment_history(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get user's payment transaction history
        
        Args:
            user_id: User ID
            limit: Number of transactions to return
            offset: Pagination offset
            
        Returns:
            Dict with transactions list and total count
        """
        try:
            with self.mysql_service.get_db() as session:
                # Get total count
                total = session.query(PaymentTransaction).filter(
                    PaymentTransaction.user_id == user_id
                ).count()
                
                # Get transactions
                transactions = session.query(PaymentTransaction).filter(
                    PaymentTransaction.user_id == user_id
                ).order_by(
                    PaymentTransaction.created_at.desc()
                ).limit(limit).offset(offset).all()
                
                transaction_list = []
                for txn in transactions:
                    transaction_list.append({
                        "id": txn.id,
                        "gateway_provider": txn.gateway_provider,
                        "gateway_order_id": txn.gateway_order_id,
                        "amount_value": float(txn.amount_value),
                        "currency_code": txn.currency_code,
                        "credits_purchased": txn.credits_purchased,
                        "status": txn.status.value,
                        "created_at": txn.created_at.isoformat() if txn.created_at else None,
                        "completed_at": txn.completed_at.isoformat() if txn.completed_at else None
                    })
                
                logger.info(
                    "PAYMENT_HISTORY_RETRIEVED",
                    user_id=user_id,
                    total=total,
                    returned=len(transaction_list)
                )
                
                return {
                    "success": True,
                    "transactions": transaction_list,
                    "total": total
                }
                
        except Exception as e:
            logger.error(
                "GET_PAYMENT_HISTORY_FAILED",
                user_id=user_id,
                error=str(e)
            )
            return {
                "success": False,
                "message": str(e),
                "transactions": [],
                "total": 0
            }

    # =================
    # PRICING PACKS
    # =================

    @require_mysql_connection
    def get_pricing_pack(self, pricing_pack_id: str) -> Optional[Dict[str, Any]]:
        """
        Get pricing pack by ID
        
        Args:
            pricing_pack_id: Pricing pack ID
            
        Returns:
            Pricing pack dict or None
        """
        try:
            with self.mysql_service.get_db() as session:
                pack = session.query(PricingPack).filter(
                    PricingPack.id == pricing_pack_id
                ).first()
                
                if not pack:
                    return None
                
                return {
                    "id": pack.id,
                    "pack_name": pack.pack_name,
                    "credits": pack.credits,
                    "price_euros": float(pack.price_euros),
                    "price_cents": pack.price_cents,
                    "description": pack.description,
                    "features": pack.features,
                    "is_popular": pack.is_popular,
                    "is_active": pack.is_active,
                    "discount_percentage": pack.discount_percentage,
                    "llm_model": pack.llm_model
                }
                
        except Exception as e:
            logger.error(
                "GET_PRICING_PACK_FAILED",
                pricing_pack_id=pricing_pack_id,
                error=str(e)
            )
            return None

    @require_mysql_connection
    def get_active_pricing_packs(self) -> List[Dict[str, Any]]:
        """
        Get all active pricing packs for user purchase
        
        Filters out:
        - Packs with display_order = 0 (internal/admin use only)
        - pp_admin_ai (admin-only pack)
        - pp_trial (trial pack, not for purchase)
        - pp_school_light (school-only pack)
        
        Returns:
            List of purchasable pricing packs
        """
        # Hardcoded excluded pack IDs
        EXCLUDED_PACK_IDS = ['pp_admin_ai', 'pp_trial', 'pp_school_light']
        
        try:
            with self.mysql_service.get_db() as session:
                packs = session.query(PricingPack).filter(
                    PricingPack.is_active == True,
                    PricingPack.display_order > 0  # Exclude display_order = 0
                ).order_by(
                    PricingPack.display_order
                ).all()
                
                pack_list = []
                for pack in packs:
                    # Skip excluded packs
                    if pack.id in EXCLUDED_PACK_IDS:
                        logger.debug(
                            "PRICING_PACK_EXCLUDED",
                            pack_id=pack.id,
                            reason="Excluded from user purchase"
                        )
                        continue
                    
                    pack_dict = {
                        "id": pack.id,
                        "pack_name": pack.pack_name,
                        "credits": pack.credits,
                        "price_euros": float(pack.price_euros),
                        "discount_percentage": pack.discount_percentage or 0,  # Ensure always returns integer
                        "description": pack.description,
                        "features": pack.features,
                        "is_popular": pack.is_popular,
                        "is_active": pack.is_active
                    }
                    
                    # Calculate original price if discount exists
                    if pack.discount_percentage and pack.discount_percentage > 0:
                        original_price = float(pack.price_euros) / (1 - pack.discount_percentage / 100)
                        pack_dict["original_price"] = round(original_price, 2)
                    else:
                        pack_dict["original_price"] = None
                    
                    pack_list.append(pack_dict)
                
                logger.info(
                    "ACTIVE_PRICING_PACKS_RETRIEVED",
                    count=len(pack_list),
                    excluded_count=len([p for p in packs if p.id in EXCLUDED_PACK_IDS or p.display_order == 0])
                )
                
                return pack_list
                
        except Exception as e:
            logger.error(
                "GET_ACTIVE_PRICING_PACKS_FAILED",
                error=str(e)
            )
            return []

    @require_mysql_connection
    def get_transaction_by_id(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """
        Get transaction by internal transaction ID
        
        Args:
            transaction_id: Internal transaction ID
            
        Returns:
            Transaction dict or None
        """
        try:
            with self.mysql_service.get_db() as session:
                transaction = session.query(PaymentTransaction).filter(
                    PaymentTransaction.id == transaction_id
                ).first()
                
                if not transaction:
                    return None
                
                return {
                    "id": transaction.id,
                    "user_id": transaction.user_id,
                    "gateway_provider": transaction.gateway_provider,
                    "gateway_order_id": transaction.gateway_order_id,
                    "amount_value": float(transaction.amount_value),
                    "currency_code": transaction.currency_code,
                    "credits_purchased": transaction.credits_purchased,
                    "pricing_pack_id": transaction.pricing_pack_id,
                    "status": transaction.status.value,
                    "created_at": transaction.created_at.isoformat() if transaction.created_at else None
                }
                
        except Exception as e:
            logger.error(
                "GET_TRANSACTION_BY_ID_ERROR",
                transaction_id=transaction_id,
                error=str(e)
            )
            return None

    @require_mysql_connection
    def update_transaction_gateway(
        self,
        transaction_id: str,
        gateway_provider: str,
        gateway_order_id: str
    ) -> Dict[str, Any]:
        """
        Update transaction with payment gateway details
        
        Args:
            transaction_id: Internal transaction ID
            gateway_provider: Payment gateway (paypal, upi, etc.)
            gateway_order_id: Gateway's order/transaction ID
            
        Returns:
            Dict with success status
        """
        try:
            # Validate gateway_order_id is not empty
            if not gateway_order_id or not gateway_order_id.strip():
                logger.error(
                    "EMPTY_GATEWAY_ORDER_ID",
                    transaction_id=transaction_id,
                    gateway_provider=gateway_provider
                )
                return {
                    "success": False,
                    "message": "Gateway order ID cannot be empty"
                }
            
            with self.mysql_service.get_db() as session:
                transaction = session.query(PaymentTransaction).filter(
                    PaymentTransaction.id == transaction_id
                ).first()
                
                if not transaction:
                    logger.error(
                        "UPDATE_GATEWAY_TRANSACTION_NOT_FOUND",
                        transaction_id=transaction_id
                    )
                    return {
                        "success": False,
                        "message": "Transaction not found"
                    }
                
                # Check for duplicate gateway_order_id (prevents UPI transaction ID reuse)
                existing = session.query(PaymentTransaction).filter(
                    PaymentTransaction.gateway_provider == gateway_provider,
                    PaymentTransaction.gateway_order_id == gateway_order_id
                ).first()
                
                if existing and existing.id != transaction_id:
                    logger.error(
                        "DUPLICATE_GATEWAY_ORDER_ID",
                        gateway_provider=gateway_provider,
                        gateway_order_id=gateway_order_id,
                        existing_transaction=existing.id,
                        new_transaction=transaction_id
                    )
                    return {
                        "success": False,
                        "message": "This transaction ID has already been used. Please verify your transaction ID and try again."
                    }
                
                # Update gateway details
                transaction.gateway_provider = gateway_provider
                transaction.gateway_order_id = gateway_order_id
                session.commit()
                
                logger.info(
                    "TRANSACTION_GATEWAY_UPDATED",
                    transaction_id=transaction_id,
                    gateway_provider=gateway_provider,
                    gateway_order_id=gateway_order_id
                )
                
                return {
                    "success": True,
                    "transaction_id": transaction_id
                }
                
        except Exception as e:
            logger.error(
                "UPDATE_TRANSACTION_GATEWAY_ERROR",
                transaction_id=transaction_id,
                gateway_provider=gateway_provider,
                error=str(e)
            )
            return {
                "success": False,
                "message": f"Failed to update transaction: {str(e)}"
            }


# Dependency injection helper
def get_payment_repository() -> PaymentRepository:
    """Get PaymentRepository instance for dependency injection"""
    return PaymentRepository()

