#!/usr/bin/env python3
"""
Orphaned Credit Reservation Cleanup Cron Job

Run every 3 hours to clean up credits stuck in 'reserved' state.

This is a SAFETY NET for:
- Application crashes during analysis
- Exceptions that escape rollback logic
- Database connection issues
- Any edge case where explicit rollback fails

Cron schedule: 0 */3 * * * (every 3 hours)

Usage:
    python jobs/cleanup_orphaned_credit_reservations.py
    
For dry-run (test mode):
    DRY_RUN=true python jobs/cleanup_orphaned_credit_reservations.py
"""

import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import structlog
from app.common.models.mysql_odm_service import BaseMySQLODMService
from app.common.models.mysql_models import UserAccess, UsageLog, StatusEnum, UsageStatusEnum
from app.config import settings

logger = structlog.get_logger()

# Configuration
ORPHAN_THRESHOLD_MINUTES = 60  # Reservations older than 60 minutes
DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"


def cleanup_orphaned_reservations():
    """
    Clean up credit reservations that are older than threshold.
    
    This handles cases where:
    - Application crashed during analysis
    - Exception escaped rollback logic
    - Database transaction failed
    """
    
    odm_service = BaseMySQLODMService()
    threshold_time = datetime.utcnow() - timedelta(minutes=ORPHAN_THRESHOLD_MINUTES)
    
    logger.info(
        "Starting orphaned reservation cleanup",
        threshold_time=threshold_time.isoformat(),
        threshold_minutes=ORPHAN_THRESHOLD_MINUTES,
        dry_run=DRY_RUN
    )
    
    try:
        with odm_service.mysql_service.get_db() as session:
            # Find orphaned reservations
            orphaned_users = session.query(UserAccess).filter(
                UserAccess.status == "analysis_initiated",
                UserAccess.reservation_time < threshold_time,
                UserAccess.reserved_credits > 0
            ).all()
            
            if not orphaned_users:
                logger.info("No orphaned reservations found")
                return {
                    "success": True,
                    "cleaned_count": 0,
                    "orphaned_users": []
                }
            
            logger.warning(
                "Found orphaned reservations",
                count=len(orphaned_users),
                user_ids=[u.user_id for u in orphaned_users]
            )
            
            cleaned_count = 0
            orphaned_details = []
            
            for user_access in orphaned_users:
                reserved_points = user_access.reserved_credits
                reservation_age = datetime.utcnow() - user_access.reservation_time
                
                logger.warning(
                    "Cleaning orphaned reservation",
                    user_id=user_access.user_id,
                    reserved_credits=reserved_points,
                    reservation_time=user_access.reservation_time.isoformat(),
                    age_minutes=int(reservation_age.total_seconds() / 60),
                    dry_run=DRY_RUN
                )
                
                orphaned_details.append({
                    "user_id": user_access.user_id,
                    "reserved_credits": reserved_points,
                    "reservation_time": user_access.reservation_time.isoformat(),
                    "age_minutes": int(reservation_age.total_seconds() / 60)
                })
                
                if not DRY_RUN:
                    # Release reserved credits
                    user_access.reserved_credits = 0
                    user_access.status = "available"
                    user_access.reservation_time = None
                    
                    # Find and mark associated usage logs as failed
                    failed_logs = session.query(UsageLog).filter(
                        UsageLog.user_id == user_access.user_id,
                        UsageLog.status == UsageStatusEnum.pending,
                        UsageLog.timestamp >= (user_access.reservation_time or threshold_time)
                    ).all()
                    
                    for log in failed_logs:
                        log.status = UsageStatusEnum.failed
                        log.llm_analytics = {
                            "cleanup_reason": "Orphaned reservation cleanup",
                            "cleanup_timestamp": datetime.utcnow().isoformat(),
                            "reservation_age_minutes": int(reservation_age.total_seconds() / 60)
                        }
                    
                    cleaned_count += 1
            
            if not DRY_RUN:
                session.commit()
                logger.info(
                    "Orphaned reservations cleaned successfully",
                    cleaned_count=cleaned_count
                )
            else:
                logger.info(
                    "DRY RUN - would have cleaned orphaned reservations",
                    would_clean_count=len(orphaned_users)
                )
            
            return {
                "success": True,
                "cleaned_count": cleaned_count if not DRY_RUN else 0,
                "orphaned_users": orphaned_details,
                "dry_run": DRY_RUN
            }
            
    except Exception as e:
        logger.error(
            "Orphan cleanup failed",
            error=str(e),
            error_type=type(e).__name__
        )
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    print("=" * 60)
    print("Credit Orphan Cleanup - Starting")
    print(f"Mode: {'DRY RUN' if DRY_RUN else 'LIVE'}")
    print("=" * 60)
    
    result = cleanup_orphaned_reservations()
    
    print("\n" + "=" * 60)
    print("Cleanup Result:")
    print(f"  Success: {result['success']}")
    
    if result['success']:
        print(f"  Cleaned: {result.get('cleaned_count', 0)}")
        print(f"  Dry Run: {result.get('dry_run', False)}")
        
        if result.get('orphaned_users'):
            print(f"\nOrphaned Users ({len(result['orphaned_users'])}):")
            for user in result['orphaned_users']:
                print(f"  - {user['user_id']}: {user['reserved_credits']} credits "
                      f"(age: {user['age_minutes']} min)")
    else:
        print(f"  Error: {result.get('error', 'Unknown error')}")
    
    print("=" * 60)
    
    sys.exit(0 if result['success'] else 1)

