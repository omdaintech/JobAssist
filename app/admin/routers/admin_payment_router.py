"""
Admin Payment Router - API LAYER
Handles admin payment management HTTP endpoints
Following layered architecture: Router → Service → Repository
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from pydantic import BaseModel, Field
import structlog

from app.admin.services.admin_payment_service import AdminPaymentService, get_admin_payment_service
from app.admin.dependencies import get_admin_user_dependency
from app.admin.models.admin_repository import AdminRepository, get_admin_repository

logger = structlog.get_logger()

# Create router
router = APIRouter(prefix="/payments", tags=["admin-payments"])


# =================
# REQUEST MODELS
# =================

class ManualCaptureRequest(BaseModel):
    """Request model for manual payment capture"""
    send_email: bool = Field(True, description="Send confirmation email to user")
    notes: Optional[str] = Field(None, description="Admin notes/reason for manual capture")


class ManualTopupRequest(BaseModel):
    """Request model for manual credit topup"""
    credits: int = Field(..., gt=0, description="Number of credits to add")
    reason: str = Field(..., min_length=5, description="Reason for manual topup")
    send_email: bool = Field(True, description="Send notification email to user")
    pricing_pack_id: Optional[str] = Field(None, description="Optional pricing pack reference")


class ResendEmailRequest(BaseModel):
    """Request model for resending confirmation email"""
    email_type: str = Field("payment_success", description="Type of email to resend")
    admin_reason: Optional[str] = Field(None, description="Admin reason for resending")


# =================
# ENDPOINTS
# =================

@router.get(
    "/orders",
    summary="List Payment Orders",
    description="List all payment transactions with filtering, search, and pagination"
)
async def list_payment_orders(
    txn_status: Optional[str] = Query(None, alias="status", description="Filter by transaction status"),
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    gateway: Optional[str] = Query(None, description="Filter by payment gateway"),
    start_date: Optional[str] = Query(None, description="Filter by start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (ISO format)"),
    search: Optional[str] = Query(None, description="Search in user email, name, or order ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    admin: dict = Depends(get_admin_user_dependency),
    payment_service: AdminPaymentService = Depends(get_admin_payment_service)
):
    """
    List payment transactions with filtering and pagination
    
    Admin only endpoint - requires admin authentication
    """
    try:
        logger.info(
            "ADMIN_LIST_ORDERS_REQUEST",
            admin_id=admin.get("admin_user_id") or admin.get("school_admin_id"),
            admin_email=admin.get("email"),
            filters={
                "status": txn_status,
                "user_email": user_email,
                "gateway": gateway,
                "search": search
            }
        )
        
        result = payment_service.list_transactions(
            status=txn_status,
            user_email=user_email,
            gateway=gateway,
            start_date=start_date,
            end_date=end_date,
            search=search,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "Failed to list payment orders")
            )
        
        return {
            "success": True,
            "transactions": result["transactions"],
            "total": result["total"],
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total_pages": (result["total"] + limit - 1) // limit
            },
            "filters_applied": result.get("filters_applied", {})
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "LIST_ORDERS_ERROR",
            admin_id=admin.get("admin_user_id") or admin.get("school_admin_id"),
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list payment orders"
        )


@router.get(
    "/orders/{transaction_id}",
    summary="Get Payment Order Details",
    description="Get detailed information about a specific payment transaction"
)
async def get_payment_order_details(
    transaction_id: str,
    admin: dict = Depends(get_admin_user_dependency),
    payment_service: AdminPaymentService = Depends(get_admin_payment_service)
):
    """
    Get detailed payment transaction information
    
    Includes:
    - Transaction details
    - User information and current credit balance
    - Payment details and pricing pack info
    - Timeline of events
    - Webhook payload
    - Related topup record
    """
    try:
        logger.info(
            "ADMIN_GET_ORDER_DETAILS_REQUEST",
            admin_id=admin.get("admin_user_id") or admin.get("school_admin_id"),
            admin_email=admin.get("email"),
            transaction_id=transaction_id
        )
        
        result = payment_service.get_transaction_details(transaction_id)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get("message", "Transaction not found")
            )
        
        return {
            "success": True,
            "transaction": result["transaction"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "GET_ORDER_DETAILS_ERROR",
            admin_id=admin.get("admin_user_id") or admin.get("school_admin_id"),
            transaction_id=transaction_id,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get order details"
        )


@router.post(
    "/orders/{transaction_id}/capture",
    summary="Manual Payment Capture",
    description="Manually capture payment for stuck/pending transactions (simulates webhook)"
)
async def manual_payment_capture(
    transaction_id: str,
    request: ManualCaptureRequest,
    admin: dict = Depends(get_admin_user_dependency),
    payment_service: AdminPaymentService = Depends(get_admin_payment_service)
):
    """
    Manually capture payment
    
    Use cases:
    - PayPal webhook failed or delayed
    - User contacted support about missing credits
    - Admin needs to manually complete stuck transactions
    
    This endpoint:
    - Simulates webhook capture event
    - Adds credits to user account
    - Creates topup audit record
    - Optionally sends confirmation email
    """
    try:
        admin_id = admin.get("admin_user_id") or admin.get("school_admin_id") or ""
        admin_email = admin.get("email") or ""
        
        logger.info(
            "ADMIN_MANUAL_CAPTURE_REQUEST",
            admin_id=admin_id,
            admin_email=admin_email,
            transaction_id=transaction_id,
            send_email=request.send_email,
            notes=request.notes
        )
        
        result = await payment_service.manual_capture_payment(
            transaction_id=transaction_id,
            admin_id=admin_id,
            admin_email=admin_email,
            send_email=request.send_email,
            notes=request.notes
        )
        
        if not result.get("success"):
            status_code = status.HTTP_400_BAD_REQUEST
            if "not found" in result.get("message", "").lower():
                status_code = status.HTTP_404_NOT_FOUND
            
            raise HTTPException(
                status_code=status_code,
                detail=result.get("message", "Failed to capture payment")
            )
        
        return {
            "success": True,
            "message": result["message"],
            "data": {
                "transaction_id": result["transaction_id"],
                "credits_added": result["credits_added"],
                "user_total_credits": result.get("user_total_credits"),
                "email_sent": result["email_sent"],
                "admin_action_logged": result["admin_action_logged"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "MANUAL_CAPTURE_ERROR",
            admin_id=admin.get("admin_user_id") or admin.get("school_admin_id"),
            transaction_id=transaction_id,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to capture payment"
        )


@router.post(
    "/users/{user_id}/topup",
    summary="Manual Credit Topup",
    description="Manually add credits to user account (admin credit allocation)"
)
async def manual_credit_topup(
    user_id: str,
    request: ManualTopupRequest,
    admin: dict = Depends(get_admin_user_dependency),
    payment_service: AdminPaymentService = Depends(get_admin_payment_service)
):
    """
    Manually add credits to user account
    
    Use cases:
    - Promotional credits
    - Compensation for service issues
    - Beta tester rewards
    - Manual credit adjustments
    
    This endpoint:
    - Adds credits to user allocated_count
    - Creates topup audit record with admin info
    - Optionally sends notification email
    - Logs admin action
    """
    try:
        admin_id = admin.get("admin_user_id") or admin.get("school_admin_id") or ""
        admin_email = admin.get("email") or ""
        
        logger.info(
            "ADMIN_MANUAL_TOPUP_REQUEST",
            admin_id=admin_id,
            admin_email=admin_email,
            user_id=user_id,
            credits=request.credits,
            reason=request.reason
        )
        
        result = await payment_service.manual_credit_topup(
            user_id=user_id,
            credits=request.credits,
            admin_id=admin_id,
            admin_email=admin_email,
            reason=request.reason,
            send_email=request.send_email,
            pricing_pack_id=request.pricing_pack_id
        )
        
        if not result.get("success"):
            status_code = status.HTTP_400_BAD_REQUEST
            if "not found" in result.get("message", "").lower():
                status_code = status.HTTP_404_NOT_FOUND
            
            raise HTTPException(
                status_code=status_code,
                detail=result.get("message", "Failed to add credits")
            )
        
        return {
            "success": True,
            "message": result["message"],
            "data": {
                "user_id": result["user_id"],
                "credits_added": result["credits_added"],
                "new_total_credits": result["new_total_credits"],
                "remaining_credits": result["remaining_credits"],
                "topup_id": result["topup_id"],
                "email_sent": result["email_sent"],
                "admin_action_logged": result["admin_action_logged"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "MANUAL_TOPUP_ERROR",
            admin_id=admin.get("admin_user_id") or admin.get("school_admin_id"),
            user_id=user_id,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add credits"
        )


@router.post(
    "/orders/{transaction_id}/send-email",
    summary="Resend Confirmation Email",
    description="Resend payment confirmation email to user"
)
async def resend_confirmation_email(
    transaction_id: str,
    request: ResendEmailRequest,
    admin: dict = Depends(get_admin_user_dependency),
    payment_service: AdminPaymentService = Depends(get_admin_payment_service)
):
    """
    Resend payment confirmation email
    
    Use cases:
    - User didn't receive original email
    - Email bounced or went to spam
    - User requested resend
    
    This endpoint:
    - Validates transaction is completed
    - Sends confirmation email to user
    - Logs admin action
    """
    try:
        admin_id = admin.get("admin_user_id") or admin.get("school_admin_id") or ""
        admin_email = admin.get("email") or ""
        
        logger.info(
            "ADMIN_RESEND_EMAIL_REQUEST",
            admin_id=admin_id,
            admin_email=admin_email,
            transaction_id=transaction_id,
            email_type=request.email_type
        )
        
        result = await payment_service.resend_confirmation_email(
            transaction_id=transaction_id,
            admin_id=admin_id,
            admin_email=admin_email,
            email_type=request.email_type
        )
        
        if not result.get("success"):
            status_code = status.HTTP_400_BAD_REQUEST
            if "not found" in result.get("message", "").lower():
                status_code = status.HTTP_404_NOT_FOUND
            
            raise HTTPException(
                status_code=status_code,
                detail=result.get("message", "Failed to resend email")
            )
        
        return {
            "success": True,
            "message": result["message"],
            "data": {
                "email_sent": result["email_sent"],
                "recipient": result["recipient"],
                "admin_action_logged": result["admin_action_logged"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "RESEND_EMAIL_ERROR",
            admin_id=admin.get("admin_user_id") or admin.get("school_admin_id"),
            transaction_id=transaction_id,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend email"
        )


@router.get(
    "/search-users",
    summary="Search B2C Users for Topup",
    description="Search B2C users (non-school members) by email or name for manual credit topup"
)
async def search_b2c_users(
    search: str = Query(..., min_length=2, description="Search term (email or name)"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results to return"),
    admin: dict = Depends(get_admin_user_dependency),
    admin_repo: AdminRepository = Depends(get_admin_repository)
):
    """
    Search B2C users for manual credit topup
    
    Filters:
    - Only B2C users (is_school_member = False)
    - Active users only
    - Searches email and name
    
    Returns user info with current credit balance
    """
    try:
        logger.info(
            "ADMIN_SEARCH_B2C_USERS_REQUEST",
            admin_id=admin.get("admin_user_id") or admin.get("school_admin_id"),
            admin_email=admin.get("email"),
            search_term=search
        )
        
        # Get all matching users
        all_users = admin_repo.search_users(search_term=search, limit=limit * 3)
        
        # Filter for B2C users only (users in default B2C school)
        # B2C users have school_id = '886eb0635e5a4825bc3323d0' (default school)
        from app.common.models.mysql_models import User
        from app.common.services.mysql_service import mysql_service
        
        DEFAULT_B2C_SCHOOL_ID = '886eb0635e5a4825bc3323d0'
        b2c_users = []
        
        with mysql_service.get_db() as session:
            for user in all_users:
                if len(b2c_users) >= limit:
                    break
                
                # Query to check if user is B2C (in default school)
                user_obj = session.query(User).filter(User.id == user["id"]).first()
                
                # B2C users are those in the default school
                if user_obj and user_obj.school_id == DEFAULT_B2C_SCHOOL_ID:
                    user_info = {
                        "id": user["id"],
                        "email": user["email"],
                        "name": user["name"],
                        "is_active": user["is_active"],
                        "created_at": user["created_at"],
                        "last_login": user.get("last_login"),
                        "current_credits": user.get("access", {}).get("allocated_count", 0),
                        "used_credits": user.get("access", {}).get("used_count", 0),
                        "remaining_credits": (
                            user.get("access", {}).get("allocated_count", 0) - 
                            user.get("access", {}).get("used_count", 0)
                        )
                    }
                    b2c_users.append(user_info)
        
        logger.info(
            "ADMIN_SEARCH_B2C_USERS_SUCCESS",
            admin_id=admin.get("admin_user_id") or admin.get("school_admin_id"),
            search_term=search,
            results_found=len(b2c_users)
        )
        
        return {
            "success": True,
            "users": b2c_users,
            "total": len(b2c_users),
            "search_term": search
        }
        
    except Exception as e:
        logger.error(
            "ADMIN_SEARCH_B2C_USERS_ERROR",
            admin_id=admin.get("admin_user_id") or admin.get("school_admin_id"),
            search_term=search,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search users"
        )


# Health check endpoint
@router.get(
    "/health",
    summary="Admin Payment Service Health",
    description="Check admin payment service status"
)
async def admin_payment_health(
    admin: dict = Depends(get_admin_user_dependency)
):
    """
    Check admin payment service health
    
    Returns service status and configuration
    """
    return {
        "success": True,
        "service": "admin-payment-management",
        "status": "operational",
        "features": {
            "list_orders": True,
            "order_details": True,
            "manual_capture": True,
            "manual_topup": True,
            "email_notifications": True
        }
    }
