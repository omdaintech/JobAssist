"""
Email Service for User Communications
Handles email verification and notifications using Mailgun API (preferred) or SMTP (fallback)
"""

import hashlib
import secrets
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
import structlog
import requests

from app.config import settings

logger = structlog.get_logger()



class EmailService:
    """Email service for user verification and notifications using Mailgun API or SMTP"""

    def __init__(self):
        # Email sender configuration
        self.from_email = getattr(settings, "from_email", "noreply@example.com")
        self.from_name = getattr(settings, "from_name", "Example App")
        self.frontend_url = getattr(settings, "frontend_url", "http://localhost")
        
        # Mailgun API configuration (preferred)
        self.mailgun_api_key = getattr(settings, "mailgun_api_key", None)
        self.mailgun_domain = getattr(settings, "mailgun_domain", "example.com")
        self.mailgun_api_base_url = getattr(settings, "mailgun_api_base_url", "https://api.mailgun.net/v3")
        self.use_mailgun_api = getattr(settings, "use_mailgun_api", True)
        
        # SMTP configuration (fallback)
        self.smtp_server = getattr(settings, "smtp_server", None)
        self.smtp_port = getattr(settings, "smtp_port", 587)
        self.smtp_username = getattr(settings, "smtp_username", None)
        self.smtp_password = getattr(settings, "smtp_password", None)
        self.smtp_use_tls = getattr(settings, "smtp_use_tls", True)
        
        # Check if Mailgun API is configured
        self.mailgun_configured = bool(self.mailgun_api_key and self.mailgun_domain)
        
        # Check if SMTP is configured
        self.smtp_configured = bool(
            self.smtp_server and self.smtp_username and self.smtp_password
        )
        
        # Determine which method to use
        if self.use_mailgun_api and self.mailgun_configured:
            self.email_method = "mailgun_api"
        elif self.smtp_configured:
            self.email_method = "smtp"
        else:
            self.email_method = "none"
        
        # Log email service initialization
        logger.info(
            "EmailService initialized",
            email_method=self.email_method,
            mailgun_configured=self.mailgun_configured,
            mailgun_domain=self.mailgun_domain,
            smtp_configured=self.smtp_configured,
            smtp_server=self.smtp_server,
            smtp_port=self.smtp_port,
            from_email=self.from_email,
            from_name=self.from_name,
            frontend_url=self.frontend_url
        )

    def generate_verification_code(self) -> str:
        """Generate 6-digit verification code"""
        return f"{secrets.randbelow(1000000):06d}"

    def generate_email_hash(self, email: str) -> str:
        """Generate MD5 hash for email verification URL"""
        return hashlib.md5(email.lower().encode()).hexdigest()

    async def _send_mailgun_api_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str, 
        text_content: str
    ) -> bool:
        """
        Send email via Mailgun API
        
        This is the preferred method - faster, more reliable, better tracking
        """
        if not self.mailgun_api_key:
            logger.error("Mailgun API key not configured")
            return False
            
        try:
            # Mailgun API endpoint
            url = f"{self.mailgun_api_base_url}/{self.mailgun_domain}/messages"
            
            # Prepare email data
            data = {
                "from": f"{self.from_name} <{self.from_email}>",
                "to": to_email,
                "subject": subject,
                "text": text_content,
                "html": html_content
            }
            
            # Send via Mailgun API
            response = requests.post(
                url,
                auth=("api", self.mailgun_api_key),
                data=data,
                timeout=10
            )
            
            # Check response
            if response.status_code == 200:
                logger.info(
                    "Email sent successfully via Mailgun API", 
                    to_email=to_email,
                    message_id=response.json().get("id"),
                    response_message=response.json().get("message")
                )
                return True
            else:
                logger.error(
                    "Failed to send email via Mailgun API",
                    to_email=to_email,
                    status_code=response.status_code,
                    response=response.text
                )
                return False
                
        except requests.exceptions.Timeout:
            logger.error(
                "Mailgun API request timed out",
                to_email=to_email
            )
            return False
        except requests.exceptions.RequestException as e:
            logger.error(
                "Failed to send email via Mailgun API - request error",
                to_email=to_email,
                error=str(e),
                error_type=type(e).__name__
            )
            return False
        except Exception as e:
            logger.error(
                "Failed to send email via Mailgun API - general error",
                to_email=to_email,
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    async def _send_smtp_email(self, to_email: str, subject: str, 
                              html_content: str, text_content: str) -> bool:
        """Send email via SMTP (fallback method)"""
        if not self.smtp_server:
            logger.error("SMTP server not configured")
            return False
            
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = formataddr((self.from_name, self.from_email))
            msg['To'] = to_email
            
            # Add text and HTML parts
            msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            # Send email
            context = ssl.create_default_context()
            
            if self.smtp_use_tls:
                # Use STARTTLS
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls(context=context)
                    if self.smtp_username and self.smtp_password:
                        server.login(self.smtp_username, self.smtp_password)
                    server.send_message(msg)
            else:
                # Use SSL/TLS (usually port 465)
                with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context) as server:
                    if self.smtp_username and self.smtp_password:
                        server.login(self.smtp_username, self.smtp_password)
                    server.send_message(msg)
            
            logger.info("Email sent successfully via SMTP", to_email=to_email)
            return True
            
        except Exception as e:
            logger.error(
                "Failed to send email via SMTP",
                to_email=to_email,
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    async def _send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str, 
        text_content: str
    ) -> bool:
        """
        Send email using configured method (Mailgun API preferred, SMTP fallback)
        
        Returns True if email sent successfully
        """
        # Development mode: Log instead of sending if nothing is configured
        if self.email_method == "none":
            logger.info(
                "Email - DEVELOPMENT MODE (No email service configured)",
                to_email=to_email,
                subject=subject,
                frontend_url=self.frontend_url
            )
            return True
        
        # Try Mailgun API first (if configured and preferred)
        if self.email_method == "mailgun_api":
            success = await self._send_mailgun_api_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
            # If Mailgun API fails and SMTP is available, try SMTP as fallback
            if not success and self.smtp_configured:
                logger.warning(
                    "Mailgun API failed, falling back to SMTP",
                    to_email=to_email
                )
                return await self._send_smtp_email(
                    to_email=to_email,
                    subject=subject,
                    html_content=html_content,
                    text_content=text_content
                )
            
            return success
        
        # Use SMTP method
        elif self.email_method == "smtp":
            return await self._send_smtp_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
        
        return False

    async def send_verification_email(
        self, email: str, verification_code: str, email_hash: str
    ) -> bool:
        """
        Send email verification with code using SMTP

        Returns True if email sent (or would be sent in dev)
        """
        try:
            verification_url = (
                f"{self.frontend_url}/verify-email?hash={email_hash}"
            )

            subject = "One-CEFR - Verify Your Email"
            
            # Plain text version
            text_content = f"""
Welcome to One-CEFR!

Thank you for signing up! Please verify your email address to activate your account.

Your verification code is: {verification_code}

Click the link below to verify your email:
{verification_url}

This code expires in 24 hours.

If you didn't create an account, please ignore this email.
            """

            # HTML version
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                    }}
                    .header {{
                        background-color: #003399;
                        color: white;
                        padding: 20px;
                        text-align: center;
                    }}
                    .content {{ padding: 20px; }}
                    .verification-code {{
                        font-size: 24px;
                        font-weight: bold;
                        text-align: center;
                        background-color: #f0f0f0;
                        padding: 15px;
                        margin: 20px 0;
                    }}
                    .button {{
                        background-color: #003399;
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        display: inline-block;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Welcome to One-CEFR!</h2>
                </div>
                <div class="content">
                    <p>Thank you for signing up! Please verify your email address to activate your account.</p>

                    <p><strong>Your verification code is:</strong></p>
                    <div class="verification-code">{verification_code}</div>

                    <p>Click the button below to open the verification page:</p>
                    <p style="text-align: center;">
                        <a href="{verification_url}"
                           class="button">Verify Email Address</a>
                    </p>

                    <p>
                        Or copy and paste this link into your browser:<br>
                        <a href="{verification_url}">{verification_url}</a>
                    </p>

                    <p><strong>This code expires in 24 hours.</strong></p>

                    <p>If you didn't create an account, please ignore this email.</p>
                </div>
            </body>
            </html>
            """

            # Send email using configured method
            success = await self._send_email(
                to_email=email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
            if success:
                logger.info("Verification email sent successfully", email=email)
            else:
                logger.error("Failed to send verification email", email=email)
                
            return success

        except Exception as e:
            logger.error(
                "CRITICAL: Failed to send verification email - general error",
                email=email,
                error=str(e),
                error_type=type(e).__name__,
                verification_code=verification_code,
                verification_url=verification_url,
                email_method=self.email_method
            )
            return False

    async def send_password_reset_email(self, email: str, reset_token: str) -> bool:
        """Send password reset email with token"""
        try:
            # Generate reset URL
            reset_url = f"{self.frontend_url}/reset-password?token={reset_token}&email={email}"
            
            # Email subject and content
            subject = "🔐 Reset Your Password - One-CEFR"
            
            # Plain text version
            text_content = f"""
            Password Reset Request

            Hi there!

            You requested to reset your password for your One-CEFR account.

            Reset Token: {reset_token}

            Click the link below to reset your password:
            {reset_url}

            This link expires in 24 hours for security reasons.

            If you didn't request this password reset, please ignore this email.
            Your password will remain unchanged.

            Best regards,
            The One-CEFR Team
            """

            # HTML version with styling
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }}
                    .reset-token {{ background: #e9ecef; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; border: 2px dashed #6c757d; }}
                    .warning {{ background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Reset Your Password</h1>
                        <p>One-CEFR - Secure Password Reset</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hi there!</h2>
                        
                        <p>You requested to reset your password for your One-CEFR account. No worries, it happens to the best of us!</p>

                        <p>Click the button below to reset your password:</p>
                        <p style="text-align: center;">
                            <a href="{reset_url}" class="button">Reset My Password</a>
                        </p>

                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                            <a href="{reset_url}">{reset_url}</a>
                        </p>

                        <div class="warning">
                            <strong>⚠️ Security Notice:</strong>
                            <ul>
                                <li>This link expires in <strong>24 hours</strong></li>
                                <li>If you didn't request this reset, please ignore this email</li>
                                <li>Your password will remain unchanged if you don't click the link</li>
                            </ul>
                        </div>

                        <p>Questions? Just reply to this email and we'll help you out!</p>
                        
                        <p>Best regards,<br>
                        The One-CEFR Team</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Send email using configured method
            success = await self._send_email(
                to_email=email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
            if success:
                logger.info("Password reset email sent successfully", email=email)
            else:
                logger.error("Failed to send password reset email", email=email)
                
            return success

        except Exception as e:
            logger.error(
                "CRITICAL: Failed to send password reset email - general error",
                email=email,
                error=str(e),
                error_type=type(e).__name__,
                reset_token=reset_token,
                email_method=self.email_method
            )
            return False

    async def send_student_welcome_email(
        self, 
        email: str, 
        password: str, 
        student_name: str, 
        school_name: str
    ) -> bool:
        """
        Send welcome email to newly created student with login credentials
        """
        try:
            logger.info(
                "Preparing student welcome email",
                email=email,
                student_name=student_name,
                school_name=school_name,
                smtp_configured=self.smtp_configured
            )

            subject = f"Welcome to {school_name} - Your One-CEFR Account"
            
            # Plain text content
            text_content = f"""
Welcome to {school_name}!

Hello {student_name},

Your One-CEFR account has been created successfully. You can now start practicing and improving your language skills.

Login Details:
Email: {email}
Password: {password}

Please log in to your account and consider changing your password from your profile settings for security.

Best regards,
{school_name} Team
            """.strip()

            # HTML content
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to {school_name}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                    .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
                    .credentials {{ background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 20px; color: #666; }}
                    .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to {school_name}!</h1>
                    </div>
                    <div class="content">
                        <h2>Hello {student_name},</h2>
                        
                        <p>Your One-CEFR account has been created successfully. You can now start practicing and improving your language skills.</p>
                        
                        <div class="credentials">
                            <h3>Your Login Details:</h3>
                            <p><strong>Email:</strong> {email}</p>
                            <p><strong>Password:</strong> {password}</p>
                        </div>
                        
                        <div class="warning">
                            <strong>🔐 Security Recommendation:</strong>
                            <p>For your security, we recommend changing your password after your first login. You can do this from your profile settings.</p>
                        </div>
                        
                        <p>Questions? Contact your school administrator or reply to this email.</p>
                        
                        <p>Best regards,<br>
                        {school_name} Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from One-CEFR platform.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Check if email sending is enabled
            if not getattr(settings, 'student_joining_mail', False):
                logger.info(
                    "Student welcome email - DISABLED by configuration",
                    email=email,
                    student_name=student_name,
                    school_name=school_name,
                    subject=subject,
                    config_flag="student_joining_mail=False"
                )
                return True  # Return True since this is expected behavior

            # Send email using configured method
            success = await self._send_email(
                to_email=email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
            if success:
                logger.info(
                    "Student welcome email sent successfully", 
                    email=email,
                    student_name=student_name,
                    school_name=school_name
                )
            else:
                logger.error(
                    "Failed to send student welcome email", 
                    email=email,
                    student_name=student_name,
                    school_name=school_name
                )
                
            return success

        except Exception as e:
            logger.error(
                "CRITICAL: Failed to send student welcome email - general error",
                email=email,
                student_name=student_name,
                school_name=school_name,
                error=str(e),
                error_type=type(e).__name__,
                email_method=self.email_method
            )
            return False

    async def send_direct_learner_welcome_email(
        self,
        email: str,
        name: str
    ) -> bool:
        """
        Send welcome email to self-signup users after email verification
        """
        try:
            logger.info(
                "Preparing direct learner welcome email",
                email=email,
                name=name,
                smtp_configured=self.smtp_configured
            )

            subject = "Welcome to One-CEFR - Your Account is Ready!"
            
            # Plain text content
            text_content = f"""
Welcome to One-CEFR!

Hello {name},

Your account has been successfully verified and is now active! 🎉

You can now log in and start your CEFR language learning journey:
- Take practice sessions to improve your skills
- Track your progress with detailed analytics
- Prepare for official CEFR exams with confidence

Login URL: {self.frontend_url}/login

Your trial account includes:
✓ Access to practice sessions
✓ Personalized learning analytics
✓ Progress tracking

Questions or need help? Just reply to this email - we're here to support you!

Best regards,
The One-CEFR Team
            """.strip()

            # HTML content
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to One-CEFR</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                    .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
                    .features {{ background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }}
                    .feature-item {{ margin: 10px 0; }}
                    .feature-item::before {{ content: "✓"; color: #667eea; font-weight: bold; margin-right: 10px; }}
                    .button {{ display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 14px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Welcome to One-CEFR!</h1>
                    </div>
                    <div class="content">
                        <h2>Hello {name},</h2>
                        
                        <p>Your account has been successfully verified and is now active!</p>
                        
                        <p>You're all set to start your CEFR language learning journey. Our platform helps you prepare for official CEFR exams with practice sessions, detailed feedback, and progress tracking.</p>
                        
                        <div class="features">
                            <h3>What's included in your trial account:</h3>
                            <div class="feature-item">Access to practice sessions across all skill areas</div>
                            <div class="feature-item">Personalized learning analytics and insights</div>
                            <div class="feature-item">Progress tracking to monitor your improvement</div>
                            <div class="feature-item">Instant feedback on your responses</div>
                        </div>
                        
                        <center>
                            <a href="{self.frontend_url}/login" class="button">Start Learning Now</a>
                        </center>
                        
                        <p>Questions or need help? Just reply to this email - we're here to support you every step of the way!</p>
                        
                        <p>Best regards,<br>
                        The One-CEFR Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from One-CEFR platform.</p>
                        <p>© 2025 One-CEFR. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Check if email sending is enabled
            if not getattr(settings, 'direct_learner_welcome_mail', True):
                logger.info(
                    "Direct learner welcome email - DISABLED by configuration",
                    email=email,
                    name=name,
                    subject=subject,
                    config_flag="direct_learner_welcome_mail=False"
                )
                return True  # Return True since this is expected behavior

            # Send email using configured method
            success = await self._send_email(
                to_email=email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
            if success:
                logger.info(
                    "Direct learner welcome email sent successfully", 
                    email=email,
                    name=name
                )
            else:
                logger.error(
                    "Failed to send direct learner welcome email", 
                    email=email,
                    name=name
                )
                
            return success

        except Exception as e:
            logger.error(
                "CRITICAL: Failed to send direct learner welcome email - general error",
                email=email,
                name=name,
                error=str(e),
                error_type=type(e).__name__,
                email_method=self.email_method
            )
            return False


def get_email_service() -> EmailService:
    """Dependency for FastAPI endpoints"""
    return EmailService()


