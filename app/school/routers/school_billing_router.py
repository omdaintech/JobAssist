"""School billing router - exposes usage aggregation and billing projections."""

from typing import Any, Dict, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query

from app.school.dependencies import get_school_admin_dependency
from app.school.services.billing_service import (
    SchoolBillingService,
    get_school_billing_service,
)
from app.school.models.school_responses import (
    SchoolBillingOverviewResponse,
    SchoolUsageResponse,
    SchoolBillingReportResponse,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/billing", tags=["Schools - Billing"])


@router.get("/overview", response_model=SchoolBillingOverviewResponse)
async def get_billing_overview(
    school_admin: Dict[str, Any] = Depends(get_school_admin_dependency),
    billing_service: SchoolBillingService = Depends(get_school_billing_service),
) -> SchoolBillingOverviewResponse:
    try:
        school_id = school_admin.get("school_id")
        if not school_id:
            raise HTTPException(status_code=400, detail="School ID missing from authentication context")
        result = billing_service.get_billing_overview(school_id)

        if not result.get("success"):
            raise _http_error_from_message(result.get("message", "Unable to fetch billing overview"))

        return SchoolBillingOverviewResponse(
            success=True,
            message="Billing overview retrieved successfully",
            data=result["data"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Billing overview endpoint failed",
            school_id=school_admin.get("school_id"),
            error=str(exc),
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve billing overview")


@router.get("/usage", response_model=SchoolUsageResponse)
async def get_usage_for_period(
    start_date: str = Query(..., description="Inclusive usage period start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="Inclusive usage period end date (YYYY-MM-DD)"),
    school_admin: Dict[str, Any] = Depends(get_school_admin_dependency),
    billing_service: SchoolBillingService = Depends(get_school_billing_service),
) -> SchoolUsageResponse:
    try:
        school_id = school_admin.get("school_id")
        if not school_id:
            raise HTTPException(status_code=400, detail="School ID missing from authentication context")
        result = billing_service.aggregate_school_usage(school_id, start_date, end_date)

        if not result.get("success"):
            raise _http_error_from_message(result.get("message", "Unable to retrieve usage"))

        return SchoolUsageResponse(
            success=True,
            message="Usage aggregated successfully",
            data=result["data"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Usage aggregation endpoint failed",
            school_id=school_admin.get("school_id"),
            start_date=start_date,
            end_date=end_date,
            error=str(exc),
        )
        raise HTTPException(status_code=500, detail="Failed to aggregate usage")


@router.get("/projection", response_model=SchoolBillingReportResponse)
async def get_billing_projection(
    school_admin: Dict[str, Any] = Depends(get_school_admin_dependency),
    billing_service: SchoolBillingService = Depends(get_school_billing_service),
) -> SchoolBillingReportResponse:
    try:
        school_id = school_admin.get("school_id")
        if not school_id:
            raise HTTPException(status_code=400, detail="School ID missing from authentication context")
        result = billing_service.calculate_monthly_bill(school_id)

        if not result.get("success"):
            raise _http_error_from_message(result.get("message", "Unable to calculate billing projection"))

        return SchoolBillingReportResponse(
            success=True,
            message="Billing projection generated successfully",
            data=result["data"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Billing projection endpoint failed",
            school_id=school_admin.get("school_id"),
            error=str(exc),
        )
        raise HTTPException(status_code=500, detail="Failed to generate billing projection")


@router.get("/report", response_model=SchoolBillingReportResponse)
async def get_billing_report(
    start_date: Optional[str] = Query(None, description="Optional custom period start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Optional custom period end date (YYYY-MM-DD)"),
    school_admin: Dict[str, Any] = Depends(get_school_admin_dependency),
    billing_service: SchoolBillingService = Depends(get_school_billing_service),
) -> SchoolBillingReportResponse:
    if bool(start_date) != bool(end_date):
        raise HTTPException(status_code=422, detail="Both start_date and end_date must be provided")

    try:
        school_id = school_admin.get("school_id")
        if not school_id:
            raise HTTPException(status_code=400, detail="School ID missing from authentication context")
        result = billing_service.generate_billing_report(school_id, start_date, end_date)

        if not result.get("success"):
            raise _http_error_from_message(result.get("message", "Unable to generate billing report"))

        return SchoolBillingReportResponse(
            success=True,
            message="Billing report generated successfully",
            data=result["data"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Billing report endpoint failed",
            school_id=school_admin.get("school_id"),
            start_date=start_date,
            end_date=end_date,
            error=str(exc),
        )
        raise HTTPException(status_code=500, detail="Failed to generate billing report")


# ---------------------------------------------------------------------

def _http_error_from_message(message: str) -> HTTPException:
    normalized = (message or "").lower()
    status = 400
    if "not found" in normalized:
        status = 404
    elif "not" in normalized and "authorized" in normalized:
        status = 403
    return HTTPException(status_code=status, detail=message or "Request failed")
