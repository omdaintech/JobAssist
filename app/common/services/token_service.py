"""Common token helpers shared across domains."""

from datetime import datetime, timedelta
from typing import Sequence

import jwt
import structlog

from app.config import settings

logger = structlog.get_logger()


def generate_school_impersonation_token(
    *,
    school_admin_id: str,
    school_id: str,
    school_admin_email: str,
    permissions: Sequence[str] | None,
    impersonated_by_admin_id: str,
    impersonated_by_email: str,
    expires_in_seconds: int | None = None,
) -> str:
    """Generate a JWT for admin impersonating a school admin."""
    expires = expires_in_seconds or settings.impersonation_token_expires
    expiry_time = datetime.utcnow() + timedelta(seconds=expires)

    payload = {
        "school_admin_id": school_admin_id,
        "school_id": school_id,
        "email": school_admin_email,
        "type": "school",
        "permissions": list(permissions or ["manage_users", "view_analytics"]),
        "exp": expiry_time,
        "iat": datetime.utcnow(),
        "impersonated_by_admin": impersonated_by_admin_id,
        "impersonated_by_email": impersonated_by_email,
        "impersonation_expires": expiry_time.timestamp(),
    }

    try:
        token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        logger.info(
            "Generated school impersonation token",
            school_id=school_id,
            admin_id=impersonated_by_admin_id,
            expires_in_seconds=expires,
        )
        return token
    except Exception as exc:  # pragma: no cover - defensive guard
        logger.error(
            "Failed to generate school impersonation token",
            school_id=school_id,
            admin_id=impersonated_by_admin_id,
            error=str(exc),
        )
        raise
