from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from app.user.models.response_models import HealthResponse

router = APIRouter(tags=["System - Health"])

@router.get("/")
async def root():
    """Root endpoint - API health check"""
    return {"message": "Lingali API is running"}


@router.get("/ready")
async def readiness_check():
    """Readiness probe endpoint - checks if app is ready to serve requests"""
    try:
        from app.common.services.health_service import HealthService

        health_service = HealthService()
        is_ready = await health_service.is_application_ready()

        if not is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Application not ready - critical components unhealthy",
            )

        return {"status": "ready", "message": "Application ready to serve requests"}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Readiness check failed",
        )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        from app.common.services.health_service import HealthService

        health_service = HealthService()
        health_report = await health_service.get_comprehensive_health()

        if not health_report["overall_healthy"]:
            for component_name in health_report.get("critical_components", []):
                component = health_report.get("components", {}).get(component_name, {})
                if not component.get("healthy", True):
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail={
                            "error": f"Service unavailable - {component_name} not operational",
                            "component": component_name,
                            "reason": component.get("error"),
                            "details": component.get("details", {}),
                            "action": component.get("details", {}).get(
                                "action", "Check system status"
                            ),
                        },
                    )

        # Get abstract status information
        health_checks = []
        for component_name, component_data in health_report["components"].items():
            from app.common.services.health_service import HealthCheckResult
            health_checks.append(HealthCheckResult(
                healthy=component_data["healthy"],
                component=component_name,
                status=component_data["status"],
                details=component_data["details"],
                error=component_data.get("error")
            ))

        health_service = HealthService()
        abstract_status = health_service._generate_abstract_status(health_checks)

        return HealthResponse(
            status="healthy" if health_report["overall_healthy"] else "degraded",
            core_services=abstract_status["core_services"],
            ai_capabilities=abstract_status["ai_capabilities"],
            language_support=abstract_status["language_support"],
            timestamp=datetime.utcnow(),
            system_health=health_report.get("summary", {}),
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service health check failed",
        )
