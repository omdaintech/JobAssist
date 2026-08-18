"""
FastAPI main application
Single point of entry for all API communication
"""

import os
import structlog
import sentry_sdk
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

import time

# Import settings
from app.config import settings

# Import standardized error response
from app.common.models.base_models import ErrorApiResponse

# Import routers
from app.admin.routers import (
    admin_auth_router,
    admin_system_router,
    admin_question_router,
    admin_school_router,
    admin_payment_router,
)
from app.admin.routers.admin_messages_router import router as admin_messages_router
from app.admin.routers.admin_language_router import router as admin_language_router
from app.admin.routers.admin_dashboard_router import router as admin_dashboard_router
from app.school.routers import (
    school_auth_router,
    school_user_router,
    school_template_router,
    school_template_usage_router,
    school_dashboard_router,
    school_info_router,
    school_billing_router,
    school_session_router,
)
from app.user.routers import (
    auth_router,
    user_router,
    language_router,
    system_router,
    credit_router,
    session_router,
    public_router,
    payment_router,
)
from app.user.routers.user_feedback_router import router as user_feedback_router
# Import isolated dashboard router
from app.user.dashboard.routers import dashboard_router
# Import public routers
from app.public.routers.contact_router import router as contact_router

logger = structlog.get_logger()


# ===============================
# SENTRY ERROR TRACKING
# ===============================

# Initialize Sentry if DSN is configured
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        profiles_sample_rate=settings.sentry_profiles_sample_rate,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
        ],
        # Capture request data for debugging
        send_default_pii=True,  # Include IP, user info for context
        
        # Customize what gets sent
        before_send=lambda event, hint: _filter_sentry_event(event, hint),
        
        # Performance monitoring
        enable_tracing=True,
        
        # Solo engineer optimizations
        max_breadcrumbs=50,  # Keep more context (default: 100)
        attach_stacktrace=True,  # Always include stack traces
        
        # Release tracking (helps identify when bugs were introduced)
        release=f"lingali@{settings.sentry_environment}",
    )
    logger.info(
        "sentry_initialized",
        environment=settings.sentry_environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        release=f"lingali@{settings.sentry_environment}"
    )
else:
    logger.info("sentry_disabled", reason="No SENTRY_DSN configured")


def _filter_sentry_event(event, hint):
    """
    Filter sensitive data and noise before sending to Sentry
    Optimized for solo engineer: Focus on actionable errors
    """
    
    # Skip health checks and monitoring endpoints
    url = event.get("request", {}).get("url", "")
    if any(endpoint in url for endpoint in ["/health", "/metrics", "/favicon.ico"]):
        return None
    
    # Skip common client errors (4xx) unless critical
    # Solo engineer tip: Focus on 500s, not user input errors
    if "exception" in event:
        status_code = event.get("contexts", {}).get("response", {}).get("status_code")
        if status_code and 400 <= status_code < 500:
            # Skip common validation errors (but keep 401/403 for security)
            if status_code not in [401, 403]:
                return None
    
    # Add business context for faster debugging
    if "request" in event:
        headers = event["request"].get("headers", {})
        
        # Extract useful context (school_id, user_id from JWT, etc.)
        # This helps you immediately know WHICH customer is affected
        event.setdefault("tags", {})
        event.setdefault("extra", {})
        
        # Redact sensitive data
        sensitive_headers = ["authorization", "cookie", "x-api-key", "x-csrf-token"]
        for header in sensitive_headers:
            if header in headers:
                headers[header] = "[REDACTED]"
    
    # Redact passwords/tokens from request body
    if "request" in event and "data" in event["request"]:
        data = event["request"]["data"]
        if isinstance(data, dict):
            for key in ["password", "token", "secret", "api_key"]:
                if key in data:
                    data[key] = "[REDACTED]"
    
    return event


# ===============================
# SECURITY MIDDLEWARE
# ===============================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Add HSTS header for HTTPS (only in production)
        if not settings.debug:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sessions path rate limiting only"""
    
    def __init__(self, app):
        super().__init__(app)
        self.sessions_requests = []  # Sessions API requests only
        
    async def dispatch(self, request: Request, call_next):
        current_time = time.time()
        minute_ago = current_time - 60
        path = request.url.path
        
        # Only apply rate limiting to sessions API endpoints
        if path.startswith("/api/sessions"):
            # Clean up old requests (older than 1 minute)
            self.sessions_requests = [
                t for t in self.sessions_requests if t > minute_ago
            ]
            
            # Check if rate limit exceeded
            if len(self.sessions_requests) >= settings.sessions_path_rate_limit_per_minute:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "message": "Sessions rate limit exceeded",
                        "error": f"Max {settings.sessions_path_rate_limit_per_minute} requests per minute for sessions API"
                    }
                )
            
            # Add current request to counter
            self.sessions_requests.append(current_time)
        
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("FastAPI application starting up")
    yield
    logger.info("FastAPI application shutting down")


# Create FastAPI app with conditional documentation
app_kwargs = {
    "title": "Lingali API",
    "description": "API for CEFR-level exam preparation",
    "version": "2.0.0",
    "lifespan": lifespan,
}

# Configure documentation URLs
if settings.enable_swagger_docs:
    app_kwargs.update({
        "docs_url": "/api/docs",       # Swagger UI at /api/docs
        "redoc_url": "/api/redoc",     # ReDoc at /api/redoc  
        "openapi_url": "/api/openapi.json",  # OpenAPI spec at /api/openapi.json
    })
else:
    app_kwargs.update({
        "docs_url": None,      # Disable documentation
        "redoc_url": None,     # Disable ReDoc
        "openapi_url": None,   # Disable OpenAPI spec
    })

app = FastAPI(**app_kwargs)

# ===============================
# SECURITY MIDDLEWARE CONFIGURATION
# ===============================

# 1. HTTPS Redirect (first - redirects before other processing)
if settings.enable_https_redirect:
    app.add_middleware(HTTPSRedirectMiddleware)

# 2. Trusted Host Protection
if settings.trusted_hosts != ["*"]:  # Only if specific hosts configured
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)

# 3. Security Headers
if settings.enable_security_headers:
    app.add_middleware(SecurityHeadersMiddleware)

# 4. Rate Limiting (sessions API only)
app.add_middleware(RateLimitMiddleware)

# 5. CORS (last - most permissive)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # More restrictive
    allow_headers=["*"],
)


# ===============================
# STANDARDIZED ERROR HANDLING
# ===============================

@app.exception_handler(HTTPException)
async def standardize_http_exceptions(request: Request, exc: HTTPException):
    """Convert all HTTPException to standardized ErrorApiResponse format"""

    # Map HTTP status codes to user-friendly messages
    status_messages = {
        400: "Bad request - please check your input",
        401: "Authentication required",
        403: "Access denied",
        404: "Resource not found",
        422: "Validation error - please check your input",
        429: "Rate limit exceeded - please try again later",
        500: "Internal server error - please contact support"
    }

    user_message = status_messages.get(exc.status_code, "An error occurred")

    # Create standardized error response
    error_response = ErrorApiResponse(
        success=False,
        message=user_message,
        error=str(exc.detail),
        data={
            "status_code": exc.status_code,
            "path": str(request.url.path)
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump()
    )


# Root redirect
@app.get("/")
async def root():
    """Root endpoint - redirects to docs if enabled, otherwise returns API info"""
    if settings.enable_swagger_docs:
        return RedirectResponse(url="/api/docs")
    else:
        return JSONResponse(
            content={
                "message": "Lingali API is running",
                "version": "2.0.0",
                "status": "healthy",
                "documentation": "disabled"
            }
        )


# Include routers
# Admin routers (System Admin - School Management Only)
app.include_router(admin_auth_router, prefix="/api/admin")
app.include_router(admin_question_router, prefix="/api/admin")
app.include_router(admin_school_router, prefix="/api/admin")
app.include_router(admin_system_router, prefix="/api/admin")
app.include_router(admin_payment_router.router, prefix="/api/admin")  # Payment management
app.include_router(admin_messages_router, prefix="/api")  # Message management (contact & feedback)
app.include_router(admin_language_router, prefix="/api/admin")  # Language management
app.include_router(admin_dashboard_router, prefix="/api/admin")  # Dashboard analytics (NEW)

# School routers (School Admin - User Management)
app.include_router(school_auth_router, prefix="/api/school")
app.include_router(school_user_router, prefix="/api/school")
app.include_router(school_template_router, prefix="/api/school")
app.include_router(school_template_usage_router, prefix="/api/school")
app.include_router(school_session_router, prefix="/api/school")
app.include_router(school_dashboard_router, prefix="/api/school")
app.include_router(school_info_router, prefix="/api/school")
app.include_router(school_billing_router, prefix="/api/school")

# User routers (End Users)
app.include_router(auth_router.router, prefix="/api/auth")
app.include_router(user_router.router, prefix="/api/users")
app.include_router(user_feedback_router, prefix="/api")  # User feedback
app.include_router(language_router.router, prefix="/api/languages")
app.include_router(session_router.router, prefix="/api/sessions")
app.include_router(public_router.router, prefix="/api")  # Public router (no auth)
app.include_router(
    credit_router.router, prefix="/api/credit-rules"
)
app.include_router(system_router.router, prefix="/api")
app.include_router(payment_router.router, prefix="/api/user")  # Payment endpoints

# Dashboard router - Isolated analytics endpoints
app.include_router(dashboard_router, prefix="/api/user")

# Public routers (No authentication)
app.include_router(contact_router, prefix="/api")  # Contact form


# ===============================
# SENTRY TEST ENDPOINT (Development & Production)
# ===============================

# Enable in both development and production for testing
_sentry_env = os.getenv("SENTRY_ENVIRONMENT", "development").lower()
logger.info("checking_sentry_environment", sentry_env=_sentry_env)

if _sentry_env in ["production", "development"]:
    @app.get("/api/sentry-debug")
    async def trigger_sentry_error():
        """
        Debug endpoint to test Sentry error tracking
        Available in development and production environments
        """
        logger.info("sentry_debug_endpoint_called", environment=_sentry_env)
        division_by_zero = 1 / 0  # This will trigger a ZeroDivisionError
        return {"message": "This should never be reached"}
    
    logger.info("sentry_debug_endpoint_registered", path="/api/sentry-debug", environment=_sentry_env)
