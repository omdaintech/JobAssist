"""
Health Service - Centralized health checks for application monitoring

This service consolidates all health-related checks to maintain separation of
concerns and provide comprehensive application health monitoring.
"""

import structlog
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
# MySQLOperations import removed - not used in health service

logger = structlog.get_logger()


@dataclass
class HealthCheckResult:
    """Result of a health check operation"""

    healthy: bool
    component: str
    status: str
    details: Dict[str, Any]
    error: Optional[str] = None


class HealthService:
    """
    Centralized health monitoring service

    Provides comprehensive health checks for:
    - Database connectivity and transactions
    - Pricing packs availability (critical for LLM model selection)
    - LLM providers status
    - Available languages
    - Overall application health
    """

    def __init__(self):
        """Initialize health service"""
        logger.info("HealthService initialized")

    async def get_comprehensive_health(self) -> Dict[str, Any]:
        """
        Get comprehensive health status for the entire application

        Returns:
            Complete health report with all components
        """
        try:
            health_checks = []
            overall_healthy = True

            # Check database and transactions (CRITICAL)
            db_health = await self._check_database_health()
            health_checks.append(db_health)
            if not db_health.healthy:
                overall_healthy = False

            # Check pricing packs (CRITICAL for LLM access)
            pricing_health = await self._check_pricing_packs_health()
            health_checks.append(pricing_health)
            if not pricing_health.healthy:
                overall_healthy = False

            # Check LLM providers
            llm_health = await self._check_llm_providers_health()
            health_checks.append(llm_health)

            # Check available languages
            languages_health = await self._check_languages_health()
            health_checks.append(languages_health)

            # Build comprehensive response
            return {
                "status": "healthy" if overall_healthy else "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "overall_healthy": overall_healthy,
                "components": {
                    check.component: {
                        "healthy": check.healthy,
                        "status": check.status,
                        "details": check.details,
                        "error": check.error,
                    }
                    for check in health_checks
                },
                "critical_components": ["database", "pricing_packs"],
                "summary": self._generate_health_summary(health_checks),
            }

        except Exception as e:
            logger.error("Health service error", error=str(e))
            return {
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "overall_healthy": False,
                "error": f"Health service failure: {str(e)}",
                "components": {},
            }

    async def _check_database_health(self) -> HealthCheckResult:
        """Check database connectivity and transaction availability"""
        try:
            from app.common.services.mysql_service import get_mysql_service

            mysql_service = get_mysql_service()

            # Check MySQL connectivity and health
            connection_ok = await mysql_service.test_connection()

            if not connection_ok:
                return HealthCheckResult(
                    healthy=False,
                    component="database",
                    status="unhealthy",
                    details={
                        "connectivity": "failed",
                        "reason": "MySQL database connection failed",
                        "action": "Check MySQL service status",
                    },
                    error="MySQL connection test failed",
                )

            return HealthCheckResult(
                healthy=True,
                component="database",
                status="operational",
                details={
                    "database_type": "mysql",
                    "connectivity": "operational",
                },
            )

        except Exception as e:
            return HealthCheckResult(
                healthy=False,
                component="database",
                status="unhealthy",
                details={"connectivity": "failed"},
                error=str(e),
            )

    async def _check_pricing_packs_health(self) -> HealthCheckResult:
        """Check pricing packs availability - MySQL lookup"""
        try:
            from app.common.services.mysql_service import get_mysql_service

            mysql_service = get_mysql_service()
            
            # Get all pricing packs - simplified for health check
            from app.common.models.mysql_models import PricingPack
            
            pricing_packs = []
            with mysql_service.get_db() as session:
                all_packs = session.query(PricingPack).all()
                
                # Extract data while in session
                for pack in all_packs:
                    pack_dict = {
                        'id': str(pack.id),
                        'pack_name': pack.pack_name,
                        'credits': pack.credits,
                        'active': pack.is_active
                    }
                    if pack_dict['active']:
                        pricing_packs.append(pack_dict)

            if not pricing_packs:
                return HealthCheckResult(
                    healthy=False,
                    component="pricing_packs",
                    status="unhealthy",
                    details={
                        "available_models": {},
                        "total_packs": 0,
                        "active_packs": 0,
                        "business_impact": "Cannot determine LLM models for users",
                        "action": "Check pricing_packs table in database",
                    },
                    error="No active pricing packs found in database",
                )

            # Extract available pack names
            available_packs = {}
            active_packs = len(pricing_packs)

            for pack in pricing_packs:
                pack_name = pack.get('pack_name')
                credits = pack.get('credits')
                if pack_name and credits:
                    available_packs[pack_name] = credits

            return HealthCheckResult(
                healthy=True,
                component="pricing_packs",
                status="operational",
                details={
                    "available_packs": available_packs,
                    "total_packs": "checked",
                    "active_packs": active_packs,
                    "pack_names": list(available_packs.keys()),
                },
            )

        except Exception as e:
            return HealthCheckResult(
                healthy=False,
                component="pricing_packs",
                status="unhealthy",
                details={"error_type": "service_exception"},
                error=str(e),
            )

    async def _check_llm_providers_health(self) -> HealthCheckResult:
        """Check LLM providers status"""
        try:
            # For now, assume operational. In future, could ping providers
            return HealthCheckResult(
                healthy=True,
                component="llm_providers",
                status="operational",
                details={
                    "openai": "operational",
                    "note": "OpenAI provider assumed operational (no ping implemented)",
                },
            )

        except Exception as e:
            return HealthCheckResult(
                healthy=False,
                component="llm_providers",
                status="unknown",
                details={},
                error=str(e),
            )

    async def _check_languages_health(self) -> HealthCheckResult:
        """Check available languages - MySQL lookup"""
        try:
            from app.common.services.mysql_service import get_mysql_service

            mysql_service = get_mysql_service()

            # Get all languages from database - with session context manager
            from app.common.models.mysql_models import Language
            
            languages_data = []
            with mysql_service.get_db() as session:
                all_languages = session.query(Language).all()
                
                # Extract data while in session
                for lang in all_languages:
                    languages_data.append(
                        {
                            "id": str(lang.id),
                            "name": lang.name,
                            "native_name": getattr(lang, "native_name", ""),
                            "flag_emoji": getattr(lang, "flag_emoji", ""),
                            "status": getattr(lang, "status", "active"),
                            "available_for_testing": getattr(lang, "available_for_testing", False),
                            "available_for_practice": getattr(lang, "available_for_practice", False),
                            "supported_levels": getattr(lang, "supported_levels", []),
                        }
                    )

            return HealthCheckResult(
                healthy=True,
                component="languages",
                status="operational",
                details={
                    "total_languages": len(all_languages),
                    "languages": languages_data,
                },
            )

        except Exception as e:
            return HealthCheckResult(
                healthy=False,
                component="languages",
                status="unhealthy",
                details={"total_languages": 0},
                error=str(e),
            )

    def _generate_health_summary(
        self, health_checks: List[HealthCheckResult]
    ) -> Dict[str, Any]:
        """Generate abstract summary of health check results"""
        total_checks = len(health_checks)
        healthy_checks = sum(1 for check in health_checks if check.healthy)
        critical_unhealthy = sum(
            1
            for check in health_checks
            if not check.healthy and check.component in ["database", "pricing_packs"]
        )

        # Abstract health metrics
        health_percentage = round((healthy_checks / total_checks) * 100, 1)
        
        if health_percentage == 100:
            overall_status = "optimal"
        elif health_percentage >= 75:
            overall_status = "stable"
        elif health_percentage >= 50:
            overall_status = "degraded"
        else:
            overall_status = "critical"

        return {
            "system_status": overall_status,
            "availability": f"{health_percentage}%",
            "service_level": "production_ready" if critical_unhealthy == 0 else "limited_functionality",
            "operational_state": "fully_operational" if healthy_checks == total_checks else "partial_functionality"
        }

    def _generate_abstract_status(self, health_checks: List[HealthCheckResult]) -> Dict[str, Any]:
        """Generate abstract status response for external consumption"""
        # Find specific components
        db_check = next((c for c in health_checks if c.component == "database"), None)
        pricing_check = next((c for c in health_checks if c.component == "pricing_packs"), None)
        llm_check = next((c for c in health_checks if c.component == "llm_providers"), None)
        lang_check = next((c for c in health_checks if c.component == "languages"), None)

        # Abstract core services status (database + pricing)
        core_healthy = (db_check and db_check.healthy) and (pricing_check and pricing_check.healthy)
        core_services_status = "operational" if core_healthy else "degraded"

        # Abstract AI capabilities
        ai_healthy = (llm_check and llm_check.healthy) and (pricing_check and pricing_check.healthy)
        ai_capabilities_status = "operational" if ai_healthy else "limited"

        # Abstract language support
        lang_total = lang_check.details.get("total_languages", 0) if lang_check else 0
        if lang_check and lang_check.healthy and lang_total > 0:
            if lang_total == 1:
                lang_coverage = "single_language"
            elif lang_total <= 3:
                lang_coverage = "multi_language" 
            else:
                lang_coverage = "extensive_coverage"
            
            language_support = {
                "status": "operational",
                "coverage": lang_coverage,
                "active_languages": lang_total
            }
        else:
            language_support = {
                "status": "unavailable",
                "coverage": "none",
                "active_languages": 0
            }

        return {
            "core_services": core_services_status,
            "ai_capabilities": ai_capabilities_status,
            "language_support": language_support
        }

    async def is_application_ready(self) -> bool:
        """
        Quick check if application is ready to serve requests

        Only checks critical components for fast readiness probe
        """
        try:
            # Check only critical components
            db_health = await self._check_database_health()
            pricing_health = await self._check_pricing_packs_health()

            return db_health.healthy and pricing_health.healthy

        except Exception as e:
            logger.error("Readiness check failed", error=str(e))
            return False
