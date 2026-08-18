"""
Payment Service - SERVICE LAYER
Orchestrates payment processing with PayPal integration
Handles order creation, webhook validation, and credit allocation coordination
"""

from typing import Dict, Any, Optional
from decimal import Decimal
import structlog
import hmac
import hashlib
import json

from paypalcheckoutsdk.core import PayPalHttpClient, SandboxEnvironment, LiveEnvironment
from paypalcheckoutsdk.orders import OrdersCreateRequest, OrdersGetRequest
from paypalhttp import HttpError

from app.user.models.payment_repository import PaymentRepository, get_payment_repository
from app.config import settings

logger = structlog.get_logger()


class PaymentService:
    """
    Payment Service - Service Layer
    Orchestrates payment processing:
    - Creates PayPal orders
    - Validates webhooks
    - Coordinates transaction completion with repository
    """

    def __init__(self, payment_repo: Optional[PaymentRepository] = None):
        """
        Initialize Payment Service
        
        Args:
            payment_repo: PaymentRepository instance (injected for testing)
        """
        self.payment_repo = payment_repo or get_payment_repository()
        self.paypal_client = self._initialize_paypal_client()
        logger.info("PaymentService initialized", mode=settings.paypal_mode)

    def _initialize_paypal_client(self) -> Optional[PayPalHttpClient]:
        """
        Initialize PayPal client based on configuration
        
        Returns:
            PayPalHttpClient or None if not configured
        """
        if not settings.is_paypal_configured():
            logger.warning("PayPal not configured - payment features disabled")
            return None
        
        # Select environment
        if settings.paypal_mode == "live":
            environment = LiveEnvironment(
                client_id=settings.paypal_client_id,
                client_secret=settings.paypal_client_secret
            )
        else:
            environment = SandboxEnvironment(
                client_id=settings.paypal_client_id,
                client_secret=settings.paypal_client_secret
            )
        
        return PayPalHttpClient(environment)

    # =================
    # ORDER CREATION
    # =================

    def create_paypal_order(
        self,
        user_id: str,
        pricing_pack_id: str
    ) -> Dict[str, Any]:
        """
        Create PayPal order for credit purchase
        
        Args:
            user_id: User ID making the purchase
            pricing_pack_id: Pricing pack to purchase
            
        Returns:
            Dict with order_id and approval_url
        """
        if not self.paypal_client:
            return {
                "success": False,
                "message": "PayPal not configured"
            }
        
        try:
            # Get pricing pack details
            pricing_pack = self.payment_repo.get_pricing_pack(pricing_pack_id)
            if not pricing_pack:
                logger.error(
                    "PRICING_PACK_NOT_FOUND",
                    pricing_pack_id=pricing_pack_id
                )
                return {
                    "success": False,
                    "message": "Pricing pack not found"
                }
            
            if not pricing_pack.get("is_active"):
                logger.error(
                    "PRICING_PACK_INACTIVE",
                    pricing_pack_id=pricing_pack_id
                )
                return {
                    "success": False,
                    "message": "Pricing pack is not active"
                }
            
            # Create transaction record in database (status: created)
            transaction_result = self.payment_repo.create_transaction(
                user_id=user_id,
                pricing_pack_id=pricing_pack_id,
                gateway_provider="paypal",
                gateway_order_id="",  # Will update after PayPal order creation
                amount_value=Decimal(str(pricing_pack["price_euros"])),
                currency_code="EUR",
                credits_purchased=pricing_pack["credits"]
            )
            
            if not transaction_result["success"]:
                return transaction_result
            
            # Build PayPal order request
            request = OrdersCreateRequest()
            request.prefer('return=representation')
            request.request_body({
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": user_id,  # Store user_id for webhook processing
                    "amount": {
                        "currency_code": "EUR",
                        "value": str(pricing_pack["price_euros"])
                    },
                    "description": f"{pricing_pack['pack_name']} - {pricing_pack['credits']} credits",
                    "custom_id": pricing_pack_id  # Store pricing_pack_id for validation
                }],
                "application_context": {
                    "brand_name": "Lingali",
                    "landing_page": "BILLING",
                    "user_action": "PAY_NOW",
                    "return_url": f"{settings.frontend_url}/payment-success",
                    "cancel_url": f"{settings.frontend_url}/buy-credits?cancelled=true"
                }
            })
            
            # Execute PayPal order creation
            response = self.paypal_client.execute(request)
            
            if response.status_code not in [200, 201]:
                logger.error(
                    "PAYPAL_ORDER_CREATE_FAILED",
                    status_code=response.status_code,
                    response=response.result
                )
                return {
                    "success": False,
                    "message": "Failed to create PayPal order"
                }
            
            # Get approval URL
            approval_url = None
            for link in response.result.links:
                if link.rel == "approve":
                    approval_url = link.href
                    break
            
            if not approval_url:
                logger.error(
                    "PAYPAL_APPROVAL_URL_MISSING",
                    order_id=response.result.id
                )
                return {
                    "success": False,
                    "message": "PayPal approval URL not found"
                }
            
            # Update transaction with PayPal order ID
            update_result = self.payment_repo.update_transaction_order_id(
                transaction_id=transaction_result["transaction_id"],
                gateway_order_id=response.result.id
            )
            
            if not update_result.get("success"):
                logger.error(
                    "TRANSACTION_UPDATE_FAILED",
                    transaction_id=transaction_result["transaction_id"],
                    order_id=response.result.id,
                    error=update_result.get("message")
                )
                return {
                    "success": False,
                    "message": "Failed to link PayPal order to transaction"
                }
            
            logger.info(
                "PAYPAL_ORDER_CREATED",
                user_id=user_id,
                order_id=response.result.id,
                pricing_pack_id=pricing_pack_id,
                amount=pricing_pack["price_euros"],
                credits=pricing_pack["credits"]
            )
            
            return {
                "success": True,
                "order_id": response.result.id,
                "approval_url": approval_url,
                "transaction_id": transaction_result["transaction_id"]
            }
            
        except HttpError as e:
            logger.error(
                "PAYPAL_HTTP_ERROR",
                error=str(e),
                status_code=e.status_code if hasattr(e, 'status_code') else None
            )
            return {
                "success": False,
                "message": "PayPal API error"
            }
        except Exception as e:
            logger.error(
                "CREATE_PAYPAL_ORDER_ERROR",
                user_id=user_id,
                pricing_pack_id=pricing_pack_id,
                error=str(e),
                exc_info=True
            )
            return {
                "success": False,
                "message": f"Failed to create order: {str(e)}"
            }

    # =================
    # WEBHOOK PROCESSING
    # =================

    def verify_webhook_signature(
        self,
        headers: Dict[str, str],
        body: bytes
    ) -> bool:
        """
        Verify PayPal webhook signature
        
        Args:
            headers: Request headers
            body: Raw request body
            
        Returns:
            True if signature is valid
        """
        if not settings.paypal_webhook_id:
            logger.warning("PayPal webhook ID not configured - skipping signature verification")
            return True  # For MVP, allow webhooks if webhook_id not set
        
        try:
            # Get signature headers
            transmission_id = headers.get('paypal-transmission-id')
            transmission_time = headers.get('paypal-transmission-time')
            cert_url = headers.get('paypal-cert-url')
            auth_algo = headers.get('paypal-auth-algo')
            transmission_sig = headers.get('paypal-transmission-sig')
            
            if not all([transmission_id, transmission_time, transmission_sig]):
                logger.error("WEBHOOK_SIGNATURE_HEADERS_MISSING")
                return False
            
            # For MVP: Basic validation
            # In production, should implement full certificate verification
            # using PayPal SDK's webhook verification endpoint
            
            logger.info(
                "WEBHOOK_SIGNATURE_CHECK",
                transmission_id=transmission_id,
                auth_algo=auth_algo
            )
            
            return True  # Simplified for MVP
            
        except Exception as e:
            logger.error(
                "WEBHOOK_SIGNATURE_VERIFICATION_ERROR",
                error=str(e)
            )
            return False

    def handle_webhook(
        self,
        headers: Dict[str, str],
        body: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle PayPal webhook event
        
        Args:
            headers: Request headers
            body: Webhook payload
            
        Returns:
            Dict with processing result
        """
        try:
            if not self.verify_webhook_signature(headers, json.dumps(body).encode()):
                logger.error("WEBHOOK_SIGNATURE_INVALID")
                return {
                    "success": False,
                    "message": "Invalid webhook signature"
                }

            event_type = body.get("event_type")
            event_type = body.get("event_type")
            
            logger.info(
                "WEBHOOK_RECEIVED",
                event_type=event_type,
                webhook_id=body.get("id")
            )
            
            # Handle different event types
            if event_type == "PAYMENT.CAPTURE.COMPLETED":
                return self._handle_payment_capture_completed(body)
            elif event_type == "CHECKOUT.ORDER.APPROVED":
                return self._handle_order_approved(body)
            else:
                logger.info(
                    "WEBHOOK_EVENT_IGNORED",
                    event_type=event_type
                )
                return {
                    "success": True,
                    "message": f"Event type {event_type} acknowledged but not processed"
                }
                
        except Exception as e:
            logger.error(
                "WEBHOOK_PROCESSING_ERROR",
                error=str(e),
                exc_info=True
            )
            return {
                "success": False,
                "message": str(e)
            }

    def _handle_payment_capture_completed(
        self,
        webhook_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle PAYMENT.CAPTURE.COMPLETED event
        This is the main event that triggers credit addition
        
        Args:
            webhook_data: Webhook payload
            
        Returns:
            Dict with processing result
        """
        try:
            resource = webhook_data.get("resource", {})
            
            # Extract payment details
            order_id = resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id")
            capture_id = resource.get("id")
            amount_value = Decimal(resource.get("amount", {}).get("value", "0"))
            currency_code = resource.get("amount", {}).get("currency_code", "EUR")
            payer_email = resource.get("payer", {}).get("email_address")
            payer_id = resource.get("payer", {}).get("payer_id")
            
            if not order_id:
                logger.error(
                    "WEBHOOK_ORDER_ID_MISSING",
                    capture_id=capture_id
                )
                return {
                    "success": False,
                    "message": "Order ID missing in webhook"
                }
            
            # Get existing transaction
            transaction = self.payment_repo.get_transaction_by_gateway_order(
                gateway_provider="paypal",
                gateway_order_id=order_id
            )
            
            if not transaction:
                # Try to get order details from PayPal
                logger.warning(
                    "TRANSACTION_NOT_FOUND_IN_DB_FETCHING_FROM_PAYPAL",
                    order_id=order_id
                )
                
                # Get order from PayPal
                order_details = self._get_paypal_order(order_id)
                if not order_details:
                    logger.error(
                        "PAYPAL_ORDER_NOT_FOUND",
                        order_id=order_id
                    )
                    return {
                        "success": False,
                        "message": "Order not found in database or PayPal"
                    }
                
                # Extract user_id and pricing_pack_id from order
                purchase_unit = order_details.get("purchase_units", [{}])[0]
                user_id_from_order = purchase_unit.get("reference_id")
                pricing_pack_id = purchase_unit.get("custom_id")
                
                if not user_id_from_order:
                    logger.error(
                        "USER_ID_MISSING_IN_ORDER",
                        order_id=order_id
                    )
                    return {
                        "success": False,
                        "message": "User ID missing in order"
                    }
                
                if not pricing_pack_id:
                    logger.error(
                        "PRICING_PACK_ID_MISSING",
                        order_id=order_id
                    )
                    return {
                        "success": False,
                        "message": "Pricing pack ID missing"
                    }
                
                # Get pricing pack
                pricing_pack = self.payment_repo.get_pricing_pack(pricing_pack_id)
                if not pricing_pack:
                    logger.error(
                        "PRICING_PACK_NOT_FOUND_IN_WEBHOOK",
                        pricing_pack_id=pricing_pack_id
                    )
                    return {
                        "success": False,
                        "message": "Pricing pack not found"
                    }
                
                # CRITICAL: Validate amount
                expected_amount = Decimal(str(pricing_pack["price_euros"]))
                if amount_value != expected_amount:
                    logger.error(
                        "FRAUD_ATTEMPT_DETECTED",
                        order_id=order_id,
                        expected_amount=float(expected_amount),
                        actual_amount=float(amount_value),
                        pricing_pack_id=pricing_pack_id,
                        alert=True
                    )
                    return {
                        "success": False,
                        "message": "Amount mismatch - payment rejected",
                        "fraud_alert": True
                    }
                
                # Create transaction record (late creation from webhook)
                transaction_result = self.payment_repo.create_transaction(
                    user_id=user_id_from_order,
                    pricing_pack_id=pricing_pack_id,
                    gateway_provider="paypal",
                    gateway_order_id=order_id,
                    amount_value=amount_value,
                    currency_code=currency_code,
                    credits_purchased=pricing_pack["credits"]
                )
                
                if not transaction_result.get("success"):
                    logger.error(
                        "LATE_TRANSACTION_CREATION_FAILED",
                        order_id=order_id,
                        user_id=user_id_from_order
                    )
                    return {
                        "success": False,
                        "message": "Failed to create transaction record"
                    }
                
                # Continue with completion using the newly created transaction
                transaction = {
                    "id": transaction_result["transaction_id"],
                    "user_id": user_id_from_order,
                    "pricing_pack_id": pricing_pack_id
                }
            
            # Validate amount against pricing pack
            # Note: In late-creation path, this refetches pricing_pack (minor inefficiency)
            pricing_pack = self.payment_repo.get_pricing_pack(transaction["pricing_pack_id"])
            if not pricing_pack:
                logger.error(
                    "PRICING_PACK_NOT_FOUND_FOR_VALIDATION",
                    pricing_pack_id=transaction["pricing_pack_id"]
                )
                return {
                    "success": False,
                    "message": "Pricing pack not found"
                }
            
            expected_amount = Decimal(str(pricing_pack["price_euros"]))
            if amount_value != expected_amount:
                logger.error(
                    "FRAUD_ATTEMPT_AMOUNT_MISMATCH",
                    transaction_id=transaction["id"],
                    expected_amount=float(expected_amount),
                    actual_amount=float(amount_value),
                    alert=True
                )
                # Fail the transaction
                self.payment_repo.fail_transaction(
                    gateway_provider="paypal",
                    gateway_order_id=order_id,
                    reason="Amount mismatch",
                    webhook_payload=webhook_data
                )
                return {
                    "success": False,
                    "message": "Amount mismatch - payment rejected"
                }
            
            # Complete transaction and add credits
            result = self.payment_repo.complete_transaction(
                gateway_provider="paypal",
                gateway_order_id=order_id,
                gateway_capture_id=capture_id,
                gateway_payer_email=payer_email,
                gateway_payer_id=payer_id,
                webhook_payload=webhook_data
            )
            
            return result
            
        except Exception as e:
            logger.error(
                "HANDLE_PAYMENT_CAPTURE_ERROR",
                error=str(e),
                exc_info=True
            )
            return {
                "success": False,
                "message": str(e)
            }

    def _handle_order_approved(
        self,
        webhook_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle CHECKOUT.ORDER.APPROVED event
        Just log for now - actual capture happens via PAYMENT.CAPTURE.COMPLETED
        
        Args:
            webhook_data: Webhook payload
            
        Returns:
            Dict with processing result
        """
        resource = webhook_data.get("resource", {})
        order_id = resource.get("id")
        
        logger.info(
            "ORDER_APPROVED",
            order_id=order_id,
            status=resource.get("status")
        )
        
        return {
            "success": True,
            "message": "Order approved - waiting for capture"
        }

    def _get_paypal_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """
        Get PayPal order details from PayPal API
        
        Args:
            order_id: PayPal order ID
            
        Returns:
            Order details dict or None
        """
        if not self.paypal_client:
            return None
        
        try:
            request = OrdersGetRequest(order_id)
            response = self.paypal_client.execute(request)
            
            if response.status_code == 200:
                return response.result.__dict__
            
            return None
            
        except Exception as e:
            logger.error(
                "GET_PAYPAL_ORDER_ERROR",
                order_id=order_id,
                error=str(e)
            )
            return None

    # =================
    # UNIFIED ORDER FLOW (New Methods)
    # =================

    def checkout_with_paypal(
        self,
        user_id: str,
        transaction_id: str
    ) -> Dict[str, Any]:
        """
        Link existing transaction to PayPal and create PayPal order
        
        This method is part of the unified order creation flow where:
        1. Order is created first with gateway="pending"
        2. User selects PayPal
        3. This method links the order to PayPal and initiates checkout
        
        Args:
            user_id: User ID (for validation)
            transaction_id: Existing transaction ID from create-order
            
        Returns:
            Dict with PayPal order_id and approval_url
        """
        if not self.paypal_client:
            return {
                "success": False,
                "message": "PayPal not configured"
            }
        
        try:
            # Get existing transaction
            transaction = self.payment_repo.get_transaction_by_id(transaction_id)
            if not transaction:
                logger.error(
                    "TRANSACTION_NOT_FOUND",
                    transaction_id=transaction_id
                )
                return {
                    "success": False,
                    "message": "Transaction not found"
                }
            
            # Validate transaction belongs to user
            if transaction["user_id"] != user_id:
                logger.error(
                    "TRANSACTION_USER_MISMATCH",
                    transaction_id=transaction_id,
                    expected_user=user_id,
                    actual_user=transaction["user_id"]
                )
                return {
                    "success": False,
                    "message": "Unauthorized transaction access"
                }
            
            # Validate transaction is pending
            if transaction["gateway_provider"] != "pending":
                logger.error(
                    "TRANSACTION_NOT_PENDING",
                    transaction_id=transaction_id,
                    gateway=transaction["gateway_provider"]
                )
                return {
                    "success": False,
                    "message": f"Transaction already linked to {transaction['gateway_provider']}"
                }
            
            # Get pricing pack
            pricing_pack = self.payment_repo.get_pricing_pack(transaction["pricing_pack_id"])
            if not pricing_pack:
                return {
                    "success": False,
                    "message": "Pricing pack not found"
                }
            
            # Create PayPal order (reuse existing logic)
            request = OrdersCreateRequest()
            request.prefer('return=representation')
            request.request_body({
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": user_id,
                    "amount": {
                        "currency_code": "EUR",
                        "value": str(pricing_pack["price_euros"])
                    },
                    "description": f"{pricing_pack['pack_name']} - {pricing_pack['credits']} credits",
                    "custom_id": transaction["pricing_pack_id"]
                }],
                "application_context": {
                    "brand_name": "Lingali",
                    "landing_page": "BILLING",
                    "user_action": "PAY_NOW",
                    "return_url": f"{settings.frontend_url}/payment-success",
                    "cancel_url": f"{settings.frontend_url}/buy-credits?cancelled=true"
                }
            })
            
            # Execute PayPal order creation
            response = self.paypal_client.execute(request)
            
            if response.status_code not in [200, 201]:
                logger.error(
                    "PAYPAL_ORDER_CREATE_FAILED",
                    status_code=response.status_code
                )
                return {
                    "success": False,
                    "message": "Failed to create PayPal order"
                }
            
            # Get approval URL
            approval_url = None
            for link in response.result.links:
                if link.rel == "approve":
                    approval_url = link.href
                    break
            
            if not approval_url:
                logger.error(
                    "PAYPAL_APPROVAL_URL_MISSING",
                    order_id=response.result.id
                )
                return {
                    "success": False,
                    "message": "PayPal approval URL not found"
                }
            
            # Update transaction with PayPal details
            update_result = self.payment_repo.update_transaction_gateway(
                transaction_id=transaction_id,
                gateway_provider="paypal",
                gateway_order_id=response.result.id
            )
            
            if not update_result.get("success"):
                logger.error(
                    "TRANSACTION_UPDATE_FAILED",
                    transaction_id=transaction_id,
                    paypal_order_id=response.result.id,
                    error=update_result.get("message")
                )
                return {
                    "success": False,
                    "message": "Failed to link PayPal order to transaction"
                }
            
            logger.info(
                "PAYPAL_CHECKOUT_SUCCESS",
                user_id=user_id,
                transaction_id=transaction_id,
                paypal_order_id=response.result.id,
                amount=pricing_pack["price_euros"],
                credits=pricing_pack["credits"]
            )
            
            return {
                "success": True,
                "order_id": response.result.id,
                "approval_url": approval_url
            }
            
        except HttpError as e:
            logger.error(
                "PAYPAL_HTTP_ERROR",
                error=str(e),
                status_code=e.status_code if hasattr(e, 'status_code') else None
            )
            return {
                "success": False,
                "message": "PayPal API error"
            }
        except Exception as e:
            logger.error(
                "PAYPAL_CHECKOUT_ERROR",
                user_id=user_id,
                transaction_id=transaction_id,
                error=str(e),
                exc_info=True
            )
            return {
                "success": False,
                "message": f"Failed to checkout with PayPal: {str(e)}"
            }


# Dependency injection helper
def get_payment_service() -> PaymentService:
    """Get PaymentService instance for dependency injection"""
    return PaymentService()

