from uuid import uuid4

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.credit.exceptions import (
    CreditError,
    CreditRepositoryError,
    CreditRulesNotFoundError,
)
from app.credit.models import CEFRLevel, CreditRule, CreditRulesResponse
from app.dependencies import get_current_user, get_user_credit_service_dep
from app.user.services.user_credit_service import UserCreditService

router = APIRouter(tags=["Users - Credit Rules"])
logger = structlog.get_logger()


@router.get("/{level}", response_model=CreditRulesResponse)
async def get_credit_rules(
    level: CEFRLevel,
    request: Request,
    current_user: dict = Depends(get_current_user),
    credit_service: UserCreditService = Depends(get_user_credit_service_dep),
):
    """Get credit rules for a specific CEFR level."""
    user_id = current_user.get("user_id")
    trace_id = (
        request.headers.get("X-Trace-Id")
        or request.headers.get("X-Request-Id")
        or getattr(request.state, "trace_id", None)
        or uuid4().hex
    )
    log = logger.bind(level=level.value, user_id=user_id, trace_id=trace_id)

    try:
        result = credit_service.get_credit_rules(
            level,
            trace_id=trace_id,
            user_id=user_id,
        )
    except CreditRulesNotFoundError as exc:
        log.warning("credit_rules_not_found", detail=str(exc))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except CreditRepositoryError as exc:
        log.error("credit_rules_repository_error", detail=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Credit rules are temporarily unavailable",
        ) from exc
    except CreditError as exc:
        log.warning("credit_rules_invalid_request", detail=str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive guard
        log.error("credit_rules_unhandled_exception", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credit rules",
        ) from exc

    response = CreditRulesResponse(
        success=True,
        level=result.level,
        rules=[
            CreditRule(
                session_type=rule.session_type,
                activity_type=rule.activity_type,
                points_cost=rule.points_cost,
                level=rule.level,
                active=rule.active,
                description=rule.description,
            )
            for rule in result.rules
        ],
        message=result.message,
    )

    log.info("credit_rules_served", rule_count=len(response.rules))
    return response
