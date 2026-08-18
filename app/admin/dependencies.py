"""
Admin Dependencies
Shared dependency injection for admin routers
"""

from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
import structlog

# Import admin repository
from app.admin.models.admin_repository import AdminRepository, get_admin_repository

logger = structlog.get_logger()


# =================
# REPOSITORY DEPENDENCIES
# =================

def get_admin_repository_dependency() -> AdminRepository:
    """Get AdminRepository instance for dependency injection"""
    return get_admin_repository()


class AdminHTTPBearer(HTTPBearer):
    """Custom HTTPBearer that returns 422 for missing auth header instead of 403"""

    async def __call__(
        self, request: Request
    ) -> Optional[HTTPAuthorizationCredentials]:
        authorization = request.headers.get("Authorization")

        # Check if Authorization header is missing
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Authorization header is required",
            )

        # Check if Authorization header format is correct
        scheme, _, credentials = authorization.partition(" ")
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Authorization header must use Bearer scheme",
            )

        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Bearer token is required",
            )

        return HTTPAuthorizationCredentials(scheme=scheme, credentials=credentials)


# Create admin security instance
admin_security = AdminHTTPBearer()


async def get_admin_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(admin_security),
) -> Dict[str, Any]:
    """Shared admin user dependency for all admin routers"""
    from app.admin.services import get_admin_auth_service

    auth_service = get_admin_auth_service()
    token = credentials.credentials

    validation = await auth_service.validate_admin_jwt_token(token)
    if not validation["valid"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=validation["message"]
        )

    return validation
