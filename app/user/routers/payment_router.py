"""
Payment Router - API LAYER
Handles payment-related HTTP endpoints
Following layered architecture: Routers → Services → Repositories
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from typing import Optional
from pydantic import BaseModel, Field, validator
from decimal import Decimal
import structlog
import re

from app.user.services.payment_service import PaymentService, get_payment_service
from app.user.models.payment_repository import PaymentRepository, get_payment_repository
from app.user.models.response_models import (
    PricingPacksResponse,
    PayPalOrderResponse,
    PaymentHistoryResponse,
    WebhookResponse
)
from app.dependencies import get_current_user_id
from app.config import settings

logger = structlog.get_logger()

# Create router
router = APIRouter(prefix="/payments", tags=["payments"])


# =================
# REQUEST MODELS
# =================

class CreateOrderRequest(BaseModel):
    """Request model for creating PayPal order"""
    pricing_pack_id: str = Field(..., description="Pricing pack ID to purchase")


class PaymentHistoryRequest(BaseModel):
    """Request parameters for payment history"""
    limit: int = Field(20, ge=1, le=100, description="Number of transactions to return")
    offset: int = Field(0, ge=0, description="Pagination offset")


class PayPalCheckoutRequest(BaseModel):
    """Request model for PayPal checkout with existing transaction"""
    transaction_id: str = Field(..., description="Transaction ID from create-order")


class UPISubmitRequest(BaseModel):
    """Request model for UPI payment submission"""
    transaction_id: str = Field(..., description="Transaction ID from create-order")
    upi_transaction_id: str = Field(..., min_length=5, max_length=100, description="UPI transaction ID from payment app")
    
    @validator('upi_transaction_id')
    def validate_upi_format(cls, v):
        """Validate UPI transaction ID format"""
        # Strip whitespace
        v = v.strip()
        
        # UPI IDs are typically alphanumeric (8-50 characters)
        # Examples: "123456789012", "UPI4R3N7W2K5Z8", "402093715258"
        if not re.match(r'^[A-Za-z0-9]{8,50}$', v):
            raise ValueError('Invalid UPI transaction ID format. Please enter alphanumeric characters only (8-50 characters).')
        
        return v


# =================
# ENDPOINTS
# =================

@router.get(
    "/pricing-packs",
    response_model=PricingPacksResponse,
    summary="Get Active Pricing Packs",
    description="Retrieve all active pricing packs with current pricing and discounts"
)
async def get_pricing_packs(
    payment_repo: PaymentRepository = Depends(get_payment_repository)
):
    """
    Get all active pricing packs
    
    Returns pricing packs from database with calculated original prices
    if discounts are active.
    """
    try:
        pricing_packs = payment_repo.get_active_pricing_packs()
        
        # Check if any pack has discount
        has_discount = any(pack.get("discount_percentage", 0) > 0 for pack in pricing_packs)
        
        # Build promotion info if discounts exist
        promotion = None
        if has_discount:
            # Get max discount percentage
            max_discount = max(
                pack.get("discount_percentage", 0) 
                for pack in pricing_packs
            )
            promotion = {
                "active": True,
                "title": "Beta Launch Special",
                "message": f"Up to {max_discount}% OFF - Limited Time!",
                "badge_text": "Beta Launch"
            }
        
        logger.info(
            "PRICING_PACKS_REQUESTED",
            count=len(pricing_packs),
            has_discount=has_discount
        )
        
        return PricingPacksResponse(
            success=True,
            pricing_packs=pricing_packs,
            promotion=promotion
        )
        
    except Exception as e:
        logger.error(
            "GET_PRICING_PACKS_ERROR",
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pricing packs"
        )


@router.post(
    "/create-order",
    summary="Create Payment Order",
    description="Create a payment order before selecting payment method (Unified Order Flow)"
)
async def create_payment_order(
    request: CreateOrderRequest,
    user_id: str = Depends(get_current_user_id),
    payment_repo: PaymentRepository = Depends(get_payment_repository)
):
    """
    Step 1: Create payment order (gateway-agnostic)
    
    Creates transaction record with gateway="pending"
    Returns order ID for user to select payment method (PayPal or UPI)
    
    Part of unified order creation flow:
    1. Create order (this endpoint)
    2. User selects payment method
    3. Call /paypal/checkout or /upi/submit
    """
    try:
        # Validate pricing pack
        pricing_pack = payment_repo.get_pricing_pack(request.pricing_pack_id)
        if not pricing_pack:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pricing pack not found"
            )
        
        if not pricing_pack.get("is_active"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pricing pack is not active"
            )
        
        # Create transaction with gateway="pending"
        transaction_result = payment_repo.create_transaction(
            user_id=user_id,
            pricing_pack_id=request.pricing_pack_id,
            gateway_provider="pending",
            gateway_order_id=None,  # NULL until payment method selected
            amount_value=Decimal(str(pricing_pack["price_euros"])),
            currency_code="EUR",  # Default, may change for UPI
            credits_purchased=pricing_pack["credits"]
        )
        
        if not transaction_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=transaction_result.get("message", "Failed to create order")
            )
        
        logger.info(
            "PAYMENT_ORDER_CREATED",
            user_id=user_id,
            transaction_id=transaction_result["transaction_id"],
            pricing_pack_id=request.pricing_pack_id,
            credits=pricing_pack["credits"],
            amount=pricing_pack["price_euros"]
        )
        
        return {
            "success": True,
            "transaction_id": transaction_result["transaction_id"],
            "order_id": transaction_result["transaction_id"],  # Show to user
            "pricing_pack": {
                "id": pricing_pack["id"],
                "name": pricing_pack["pack_name"],
                "credits": pricing_pack["credits"],
                "price_euros": pricing_pack["price_euros"]
            },
            "message": "Order created. Please select payment method."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "CREATE_ORDER_ERROR",
            user_id=user_id,
            pricing_pack_id=request.pricing_pack_id,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order"
        )


@router.post(
    "/paypal/checkout",
    response_model=PayPalOrderResponse,
    summary="Checkout with PayPal",
    description="Link existing order to PayPal and initiate checkout (Unified Order Flow)"
)
async def paypal_checkout(
    request: PayPalCheckoutRequest,
    user_id: str = Depends(get_current_user_id),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """
    Step 2 (PayPal path): Link transaction to PayPal and create PayPal order
    
    Flow:
    1. Get existing transaction (must be pending)
    2. Validate it belongs to current user
    3. Create PayPal order
    4. Update transaction with PayPal order ID and gateway="paypal"
    5. Return approval URL for redirect
    """
    try:
        logger.info(
            "PAYPAL_CHECKOUT_REQUEST",
            user_id=user_id,
            transaction_id=request.transaction_id
        )
        
        result = payment_service.checkout_with_paypal(
            user_id=user_id,
            transaction_id=request.transaction_id
        )
        
        if not result.get("success"):
            logger.warning(
                "PAYPAL_CHECKOUT_FAILED",
                user_id=user_id,
                transaction_id=request.transaction_id,
                reason=result.get("message")
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Failed to initiate PayPal checkout")
            )
        
        return PayPalOrderResponse(
            success=True,
            order_id=result["order_id"],
            approval_url=result["approval_url"],
            message="PayPal checkout initiated"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "PAYPAL_CHECKOUT_ERROR",
            user_id=user_id,
            transaction_id=request.transaction_id,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate PayPal checkout"
        )


@router.post(
    "/upi/submit",
    summary="Submit UPI Payment",
    description="Submit UPI transaction ID for manual verification"
)
async def submit_upi_payment(
    request: UPISubmitRequest,
    user_id: str = Depends(get_current_user_id),
    payment_repo: PaymentRepository = Depends(get_payment_repository)
):
    """
    Step 2 (UPI path): Submit UPI transaction ID for verification
    
    Flow:
    1. Get existing transaction (must be pending)
    2. Validate it belongs to current user
    3. Update with UPI transaction ID and gateway="upi"
    4. Return WhatsApp instructions for screenshot submission
    
    Admin will manually verify payment via WhatsApp screenshot
    and capture using /api/admin/payments/orders/{transaction_id}/capture
    """
    try:
        # Get transaction
        transaction = payment_repo.get_transaction_by_id(request.transaction_id)
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        # Validate user
        if transaction["user_id"] != user_id:
            logger.warning(
                "UPI_SUBMIT_UNAUTHORIZED",
                transaction_id=request.transaction_id,
                user_id=user_id,
                transaction_user=transaction["user_id"]
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized"
            )
        
        # Validate pending
        if transaction["gateway_provider"] != "pending":
            logger.warning(
                "UPI_SUBMIT_NOT_PENDING",
                transaction_id=request.transaction_id,
                current_gateway=transaction["gateway_provider"]
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transaction already linked to {transaction['gateway_provider']}"
            )
        
        # Update with UPI details
        update_result = payment_repo.update_transaction_gateway(
            transaction_id=request.transaction_id,
            gateway_provider="upi",
            gateway_order_id=request.upi_transaction_id
        )
        
        if not update_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update transaction"
            )
        
        logger.info(
            "UPI_PAYMENT_SUBMITTED",
            user_id=user_id,
            transaction_id=request.transaction_id,
            upi_transaction_id=request.upi_transaction_id,
            credits=transaction["credits_purchased"]
        )
        
        return {
            "success": True,
            "transaction_id": request.transaction_id,
            "order_id": request.transaction_id,
            "upi_transaction_id": request.upi_transaction_id,
            "whatsapp_number": settings.whatsapp_support_number,
            "whatsapp_message": f"Please send payment screenshot to WhatsApp with Order ID: {request.transaction_id}",
            "message": "UPI payment submitted for verification. Credits will be added after admin verification."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "UPI_SUBMIT_ERROR",
            user_id=user_id,
            transaction_id=request.transaction_id,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit UPI payment"
        )


@router.post(
    "/paypal/create-order",
    response_model=PayPalOrderResponse,
    summary="Create PayPal Order",
    description="Create a PayPal order for credit purchase"
)
async def create_paypal_order(
    request: CreateOrderRequest,
    user_id: str = Depends(get_current_user_id),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """
    Create PayPal order for credit purchase
    
    1. Validates pricing pack
    2. Creates PayPal order
    3. Returns approval URL for checkout
    
    User will be redirected to PayPal to complete payment.
    """
    try:
        logger.info(
            "CREATE_PAYPAL_ORDER_REQUEST",
            user_id=user_id,
            pricing_pack_id=request.pricing_pack_id
        )
        
        result = payment_service.create_paypal_order(
            user_id=user_id,
            pricing_pack_id=request.pricing_pack_id
        )
        
        if not result.get("success"):
            logger.warning(
                "CREATE_PAYPAL_ORDER_FAILED",
                user_id=user_id,
                pricing_pack_id=request.pricing_pack_id,
                reason=result.get("message")
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Failed to create PayPal order")
            )
        
        return PayPalOrderResponse(
            success=True,
            order_id=result["order_id"],
            approval_url=result["approval_url"],
            message="PayPal order created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "CREATE_PAYPAL_ORDER_ERROR",
            user_id=user_id,
            pricing_pack_id=request.pricing_pack_id,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create PayPal order"
        )


@router.post(
    "/paypal/webhook",
    response_model=WebhookResponse,
    summary="PayPal Webhook",
    description="Receive and process PayPal webhook events (PUBLIC endpoint - no auth)",
    include_in_schema=False  # Hide from Swagger docs for security
)
async def paypal_webhook(
    request: Request,
    payment_service: PaymentService = Depends(get_payment_service)
):
    """
    PayPal Webhook Endpoint (PUBLIC - No Authentication)
    
    This endpoint receives webhooks from PayPal when payment events occur.
    Critical security: Validates webhook signature before processing.
    
    Events handled:
    - PAYMENT.CAPTURE.COMPLETED: Payment captured, add credits
    - CHECKOUT.ORDER.APPROVED: Order approved, waiting for capture
    """
    try:
        # Get headers
        headers = dict(request.headers)
        
        # Get raw body
        body = await request.json()
        
        logger.info(
            "WEBHOOK_RECEIVED",
            event_type=body.get("event_type"),
            event_id=body.get("id")
        )
        
        # Process webhook
        result = payment_service.handle_webhook(
            headers=headers,
            body=body
        )
        
        if not result.get("success"):
            logger.warning(
                "WEBHOOK_PROCESSING_FAILED",
                event_type=body.get("event_type"),
                reason=result.get("message")
            )
            # Return 200 OK even on processing failure to prevent PayPal retries
            # Log the error but acknowledge receipt
            return WebhookResponse(
                success=False,
                message=result.get("message", "Webhook processing failed"),
                transaction_id=result.get("transaction_id")
            )
        
        return WebhookResponse(
            success=True,
            message="Webhook processed successfully",
            transaction_id=result.get("transaction_id")
        )
        
    except Exception as e:
        logger.error(
            "WEBHOOK_ENDPOINT_ERROR",
            error=str(e),
            exc_info=True
        )
        # Return 200 OK to prevent PayPal retries on server errors
        return WebhookResponse(
            success=False,
            message="Webhook acknowledged but processing failed"
        )


@router.get(
    "/history",
    response_model=PaymentHistoryResponse,
    summary="Get Payment History",
    description="Retrieve user's payment transaction history"
)
async def get_payment_history(
    limit: int = 20,
    offset: int = 0,
    user_id: str = Depends(get_current_user_id),
    payment_repo: PaymentRepository = Depends(get_payment_repository)
):
    """
    Get user's payment transaction history
    
    Returns paginated list of payment transactions for the authenticated user.
    Includes:
    - Transaction ID
    - Amount paid
    - Credits purchased
    - Status (created, completed, failed, refunded)
    - Timestamps
    """
    try:
        # Validate pagination parameters
        if limit < 1 or limit > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Limit must be between 1 and 100"
            )
        
        if offset < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Offset must be non-negative"
            )
        
        logger.info(
            "PAYMENT_HISTORY_REQUEST",
            user_id=user_id,
            limit=limit,
            offset=offset
        )
        
        result = payment_repo.get_user_payment_history(
            user_id=user_id,
            limit=limit,
            offset=offset
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to retrieve payment history")
            )
        
        return PaymentHistoryResponse(
            success=True,
            transactions=result["transactions"],
            total=result["total"],
            message=f"Retrieved {len(result['transactions'])} transactions"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "GET_PAYMENT_HISTORY_ERROR",
            user_id=user_id,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payment history"
        )


# Health check endpoint for payments
@router.get(
    "/health",
    summary="Payment Service Health",
    description="Check payment service configuration status"
)
async def payment_health():
    """
    Check payment service health
    
    Returns configuration status without exposing sensitive data
    """
    from app.config import settings
    
    return {
        "success": True,
        "paypal_configured": settings.is_paypal_configured(),
        "paypal_mode": settings.paypal_mode,
        "message": "Payment service is operational" if settings.is_paypal_configured() else "PayPal not configured"
    }

