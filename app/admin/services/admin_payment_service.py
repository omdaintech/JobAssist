"""
Admin Payment Service - SERVICE LAYER
Orchestrates admin payment management operations
Handles manual captures, credit topups, and email notifications
"""

from typing import Dict, Any, Optional
import structlog
from datetime import datetime

from app.admin.models.admin_payment_repository import AdminPaymentRepository, get_admin_payment_repository
from app.user.models.payment_repository import PaymentRepository, get_payment_repository
from app.common.services.email_service import EmailService, get_email_service

logger = structlog.get_logger()


class AdminPaymentService:
    """
    Admin Payment Service - Service Layer
    Orchestrates admin payment operations:
    - List and view payment transactions
    - Manual payment captures (webhook simulation)
    - Manual credit topups
    - Email notifications
    """

    def __init__(
        self,
        admin_payment_repo: Optional[AdminPaymentRepository] = None,
        payment_repo: Optional[PaymentRepository] = None,
        email_service: Optional[EmailService] = None
    ):
        """
        Initialize Admin Payment Service
        
        Args:
            admin_payment_repo: Admin payment repository instance
            payment_repo: User payment repository instance (for reusing capture logic)
            email_service: Email service instance
        """
        self.admin_payment_repo = admin_payment_repo or get_admin_payment_repository()
        self.payment_repo = payment_repo or get_payment_repository()
        self.email_service = email_service or get_email_service()

    # =================
    # TRANSACTION MANAGEMENT
    # =================

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
        """List payment transactions with filtering and pagination"""
        try:
            result = self.admin_payment_repo.list_transactions(
                status=status,
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
            return result
        except Exception as e:
            logger.error("ADMIN_LIST_TRANSACTIONS_ERROR", error=str(e))
            return {
                "success": False,
                "message": f"Failed to list transactions: {str(e)}",
                "transactions": [],
                "total": 0
            }

    def get_transaction_details(self, transaction_id: str) -> Dict[str, Any]:
        """Get detailed transaction information"""
        try:
            result = self.admin_payment_repo.get_transaction_details(transaction_id)
            return result
        except Exception as e:
            logger.error(
                "ADMIN_GET_TRANSACTION_DETAILS_ERROR",
                transaction_id=transaction_id,
                error=str(e)
            )
            return {
                "success": False,
                "message": f"Failed to get transaction details: {str(e)}"
            }

    # =================
    # MANUAL CAPTURE
    # =================

    async def manual_capture_payment(
        self,
        transaction_id: str,
        admin_id: str,
        admin_email: str,
        send_email: bool = True,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Manually capture payment (simulate webhook for stuck payments)
        Reuses existing payment completion logic from payment_repository
        
        Args:
            transaction_id: Transaction ID to capture
            admin_id: Admin ID performing the action
            admin_email: Admin email for audit
            send_email: Whether to send confirmation email to user
            notes: Admin notes/reason for manual capture
            
        Returns:
            Dict with capture result and credits added
        """
        try:
            # Get transaction details
            transaction = self.admin_payment_repo.get_transaction_by_id(transaction_id)
            if not transaction:
                logger.warning("ADMIN_CAPTURE_TRANSACTION_NOT_FOUND", transaction_id=transaction_id)
                return {
                    "success": False,
                    "message": "Transaction not found"
                }
            
            # Check if already completed
            if transaction["status"] == "completed":
                logger.warning(
                    "ADMIN_CAPTURE_ALREADY_COMPLETED",
                    transaction_id=transaction_id,
                    admin_id=admin_id
                )
                return {
                    "success": False,
                    "message": "Transaction already completed"
                }
            
            # Create webhook-like payload for consistency with existing flow
            webhook_payload = {
                "event_type": "ADMIN_MANUAL_CAPTURE",
                "resource": {
                    "id": f"ADMIN-CAPTURE-{transaction_id}",
                    "supplementary_data": {
                        "related_ids": {
                            "order_id": transaction["gateway_order_id"]
                        }
                    },
                    "amount": {
                        "value": str(transaction["amount_value"]),
                        "currency_code": transaction["currency_code"]
                    }
                },
                "admin_capture": {
                    "admin_id": admin_id,
                    "admin_email": admin_email,
                    "notes": notes,
                    "captured_at": datetime.utcnow().isoformat(),
                    "manual_capture": True
                }
            }
            
            # Get user info for email
            user_data = self.admin_payment_repo.get_user_by_id(transaction["user_id"])
            if not user_data:
                logger.error("ADMIN_CAPTURE_USER_NOT_FOUND", user_id=transaction["user_id"])
                return {
                    "success": False,
                    "message": "User not found"
                }
            
            # Use existing payment completion logic
            result = self.payment_repo.complete_transaction(
                gateway_provider=transaction["gateway_provider"],
                gateway_order_id=transaction["gateway_order_id"],
                gateway_capture_id=f"ADMIN-CAPTURE-{transaction_id}",
                gateway_payer_email=user_data["email"],
                gateway_payer_id=None,
                webhook_payload=webhook_payload
            )
            
            if not result.get("success"):
                logger.error(
                    "ADMIN_CAPTURE_FAILED",
                    transaction_id=transaction_id,
                    admin_id=admin_id,
                    result=result
                )
                return result
            
            # Send confirmation email
            email_sent = False
            if send_email:
                # Get pricing pack name
                pricing_pack_name = None
                if transaction.get("pricing_pack_id"):
                    pack = self.payment_repo.get_pricing_pack(transaction["pricing_pack_id"])
                    if pack:
                        pricing_pack_name = pack["pack_name"]
                
                email_sent = await self._send_payment_confirmation_email(
                    user_email=user_data["email"],
                    user_name=user_data["name"],
                    credits_added=transaction["credits_purchased"],
                    amount_paid=transaction["amount_value"],
                    currency=transaction["currency_code"],
                    pricing_pack_name=pricing_pack_name
                )
            
            logger.info(
                "ADMIN_MANUAL_CAPTURE_SUCCESS",
                transaction_id=transaction_id,
                admin_id=admin_id,
                admin_email=admin_email,
                credits_added=result["credits_added"],
                email_sent=email_sent,
                notes=notes
            )
            
            return {
                "success": True,
                "message": "Payment captured successfully",
                "transaction_id": transaction_id,
                "credits_added": result["credits_added"],
                "user_total_credits": result.get("total_credits"),
                "email_sent": email_sent,
                "admin_action_logged": True
            }
            
        except Exception as e:
            logger.error(
                "ADMIN_MANUAL_CAPTURE_ERROR",
                transaction_id=transaction_id,
                admin_id=admin_id,
                error=str(e),
                exc_info=True
            )
            return {
                "success": False,
                "message": f"Manual capture failed: {str(e)}"
            }

    # =================
    # MANUAL CREDIT TOPUP
    # =================

    async def manual_credit_topup(
        self,
        user_id: str,
        credits: int,
        admin_id: str,
        admin_email: str,
        reason: str,
        send_email: bool = True,
        pricing_pack_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Manually add credits to user account
        Creates topup entry in user_access.topups
        
        Args:
            user_id: User ID to add credits to
            credits: Number of credits to add
            admin_id: Admin ID performing the action
            admin_email: Admin email for audit
            reason: Reason for manual topup
            send_email: Whether to send notification email
            pricing_pack_id: Optional pricing pack reference
            
        Returns:
            Dict with topup result
        """
        try:
            # Validate credits
            if credits <= 0:
                return {
                    "success": False,
                    "message": "Credits must be positive"
                }
            
            # Add credits
            result = self.admin_payment_repo.add_credits_to_user(
                user_id=user_id,
                credits=credits,
                admin_id=admin_id,
                reason=reason,
                pricing_pack_id=pricing_pack_id
            )
            
            if not result.get("success"):
                return result
            
            # Send email notification
            email_sent = False
            if send_email:
                user_data = self.admin_payment_repo.get_user_by_id(user_id)
                if user_data:
                    email_sent = await self._send_topup_confirmation_email(
                        user_email=user_data["email"],
                        user_name=user_data["name"],
                        credits_added=credits,
                        reason=reason
                    )
            
            logger.info(
                "ADMIN_MANUAL_TOPUP_SUCCESS",
                user_id=user_id,
                admin_id=admin_id,
                admin_email=admin_email,
                credits_added=credits,
                reason=reason,
                email_sent=email_sent
            )
            
            return {
                "success": True,
                "message": "Credits added successfully",
                "user_id": user_id,
                "credits_added": credits,
                "new_total_credits": result["new_total_credits"],
                "remaining_credits": result["remaining_credits"],
                "topup_id": result["topup_id"],
                "email_sent": email_sent,
                "admin_action_logged": True
            }
            
        except Exception as e:
            logger.error(
                "ADMIN_MANUAL_TOPUP_ERROR",
                user_id=user_id,
                admin_id=admin_id,
                credits=credits,
                error=str(e),
                exc_info=True
            )
            return {
                "success": False,
                "message": f"Credit topup failed: {str(e)}"
            }

    # =================
    # EMAIL RESEND
    # =================

    async def resend_confirmation_email(
        self,
        transaction_id: str,
        admin_id: str,
        admin_email: str,
        email_type: str = "payment_success"
    ) -> Dict[str, Any]:
        """
        Resend payment confirmation email
        
        Args:
            transaction_id: Transaction ID
            admin_id: Admin ID requesting resend
            admin_email: Admin email for audit
            email_type: Type of email to resend
            
        Returns:
            Dict with email send result
        """
        try:
            # Get transaction details
            result = self.admin_payment_repo.get_transaction_details(transaction_id)
            if not result.get("success"):
                return result
            
            transaction = result["transaction"]
            
            # Validate transaction is completed
            if transaction["status"] != "completed":
                return {
                    "success": False,
                    "message": "Can only resend confirmation for completed transactions"
                }
            
            # Send email based on type
            if email_type == "payment_success":
                email_sent = await self._send_payment_confirmation_email(
                    user_email=transaction["user"]["email"],
                    user_name=transaction["user"]["name"],
                    credits_added=transaction["payment"]["credits_purchased"],
                    amount_paid=transaction["payment"]["amount_value"],
                    currency=transaction["payment"]["currency_code"],
                    pricing_pack_name=transaction["payment"]["pricing_pack"]["name"]
                )
            else:
                return {
                    "success": False,
                    "message": f"Unknown email type: {email_type}"
                }
            
            logger.info(
                "ADMIN_EMAIL_RESENT",
                transaction_id=transaction_id,
                admin_id=admin_id,
                admin_email=admin_email,
                email_type=email_type,
                recipient=transaction["user"]["email"],
                email_sent=email_sent
            )
            
            return {
                "success": True,
                "message": "Email sent successfully",
                "email_sent": email_sent,
                "recipient": transaction["user"]["email"],
                "admin_action_logged": True
            }
            
        except Exception as e:
            logger.error(
                "ADMIN_RESEND_EMAIL_ERROR",
                transaction_id=transaction_id,
                admin_id=admin_id,
                error=str(e),
                exc_info=True
            )
            return {
                "success": False,
                "message": f"Failed to resend email: {str(e)}"
            }

    # =================
    # EMAIL NOTIFICATIONS (Private)
    # =================

    async def _send_payment_confirmation_email(
        self,
        user_email: str,
        user_name: str,
        credits_added: int,
        amount_paid: float,
        currency: str,
        pricing_pack_name: Optional[str] = None
    ) -> bool:
        """Send payment confirmation email"""
        try:
            subject = "✅ Payment Successful - Credits Added to Your Account"
            
            text_content = f"""
Hello {user_name},

Your payment has been successfully processed!

Payment Details:
- Amount Paid: {amount_paid} {currency}
- Credits Added: {credits_added}
- Package: {pricing_pack_name or 'Custom'}

You can now use these credits for practice sessions and exams.

Thank you for choosing Lingali!

Best regards,
The Lingali Team
            """.strip()
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .details {{ background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                    .credits {{ font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Payment Successful!</h1>
                    </div>
                    <div class="content">
                        <h2>Hello {user_name},</h2>
                        <p>Your payment has been successfully processed and credits have been added to your account.</p>
                        
                        <div class="details">
                            <h3>Payment Details:</h3>
                            <p><strong>Amount Paid:</strong> {amount_paid} {currency}</p>
                            <p><strong>Package:</strong> {pricing_pack_name or 'Custom'}</p>
                        </div>
                        
                        <div class="credits">
                            🎉 {credits_added} Credits Added!
                        </div>
                        
                        <p>You can now use these credits for practice sessions and exams to improve your language skills.</p>
                        
                        <p>Thank you for choosing Lingali!</p>
                        
                        <p>Best regards,<br>The Lingali Team</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            return await self.email_service._send_email(
                to_email=user_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            logger.error(
                "SEND_PAYMENT_CONFIRMATION_EMAIL_FAILED",
                user_email=user_email,
                error=str(e)
            )
            return False

    async def _send_topup_confirmation_email(
        self,
        user_email: str,
        user_name: str,
        credits_added: int,
        reason: str
    ) -> bool:
        """Send manual topup confirmation email"""
        try:
            subject = "🎁 Credits Added to Your Account"
            
            text_content = f"""
Hello {user_name},

Great news! Credits have been added to your Lingali account.

Credits Added: {credits_added}
Note: {reason}

You can now use these credits for practice sessions and exams.

Best regards,
The Lingali Team
            """.strip()
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .credits {{ font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; margin: 20px 0; }}
                    .reason {{ background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎁 Credits Added!</h1>
                    </div>
                    <div class="content">
                        <h2>Hello {user_name},</h2>
                        <p>Great news! Credits have been added to your Lingali account.</p>
                        
                        <div class="credits">
                            🎉 {credits_added} Credits Added!
                        </div>
                        
                        <div class="reason">
                            <strong>Note:</strong> {reason}
                        </div>
                        
                        <p>You can now use these credits for practice sessions and exams to improve your language skills.</p>
                        
                        <p>Best regards,<br>The Lingali Team</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            return await self.email_service._send_email(
                to_email=user_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            logger.error(
                "SEND_TOPUP_CONFIRMATION_EMAIL_FAILED",
                user_email=user_email,
                error=str(e)
            )
            return False


def get_admin_payment_service() -> AdminPaymentService:
    """Dependency injection for AdminPaymentService"""
    return AdminPaymentService()
