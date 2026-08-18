"""
School Dependencies - SCHOOL DOMAIN
Provides dependency injection for school authentication and services
Follows the same pattern as admin dependencies with school scoping
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
import structlog

from app.school.models.school_repository import SchoolRepository, get_school_repository

logger = structlog.get_logger()


def get_school_repository_dependency() -> SchoolRepository:
    """Get SchoolRepository instance for dependency injection"""
    return get_school_repository()


class SchoolHTTPBearer(HTTPBearer):
    """Custom HTTPBearer for school admin authentication"""

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


# Create school security instance
school_security = SchoolHTTPBearer()


async def get_school_admin_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(school_security),
) -> Dict[str, Any]:
    """
    Shared school admin dependency for all school routers
    Implements simplified security with token type and school scoping
    """
    from app.school.services.school_auth_service import get_school_auth_service

    auth_service = get_school_auth_service()
    token = credentials.credentials

    validation = auth_service.validate_school_jwt_token(token)
    
    if not validation["valid"]:
        logger.warning("Invalid school admin token", error=validation["message"])
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=validation["message"]
        )

    # SECURITY: Ensure this is a school token (simplified security)
    if validation.get("type") != "school":
        logger.warning("Non-school token used for school access", token_type=validation.get("type"))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="School admin access required"
        )

    # SECURITY: Ensure school_id exists (school scoping)
    if not validation.get("school_id"):
        logger.warning("School token missing school_id")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="School scope required"
        )

    logger.info("School admin authenticated", 
                school_admin_id=validation["school_admin_id"],
                school_id=validation["school_id"])

    return validation


# Alias for consistency with admin pattern
get_school_admin = get_school_admin_dependency
