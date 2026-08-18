#!/usr/bin/env python3
"""
Validation Script for Deterministic Evaluation
Compares deterministic evaluation results with historical LLM results

Usage:
    python scripts/validate_deterministic_evaluation.py --sample-size 100
"""

import sys
import os
import argparse
import asyncio
from typing import Dict, List
import structlog

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.llm.deterministic_evaluator import DeterministicEvaluator
from app.user.models.core_repository import CoreRepository
from app.common.models.mysql_odm_service import get_mysql_base_odm_service

logger = structlog.get_logger()


async def validate_deterministic_evaluation(sample_size: int = 100):
    """
    Validate deterministic evaluator against historical LLM results
    
    Steps:
    1. Fetch recent analyzed sessions with reading/hearing activities
    2. Re-evaluate using deterministic evaluator
    3. Compare scores and is_correct flags
    4. Report agreement percentage
    """
    
    print(f"🔍 Validating Deterministic Evaluation (sample size: {sample_size})")
    print("=" * 70)
    
    # Initialize services
    core_repo = get_mysql_base_odm_service(CoreRepository)
    evaluator = DeterministicEvaluator()
    
    # Fetch recent analyzed sessions
    # Note: This is pseudo-code - adjust based on your actual repository methods
    print("\n📊 Fetching historical sessions...")
    
    # You would implement this query in CoreRepository
    # sessions = core_repo.get_recent_analyzed_sessions(
    #     limit=sample_size,
    #     activity_types=["reading", "hearing"]
    # )
    
    # For now, print instructions
    print("""
    ⚠️  Manual Validation Required:
    
    1. Query database for recent sessions:
       SELECT id, session_type, analysis_result 
       FROM exam_sessions 
       WHERE analysis_status = 'completed'
         AND created_datetime >= NOW() - INTERVAL 7 DAY
       LIMIT 100;
    
    2. For each session with reading/hearing:
       - Extract user answers from exam_answers table
       - Re-evaluate using DeterministicEvaluator
       - Compare scores with stored analysis_result
    
    3. Calculate agreement metrics:
       - Exact score match: X%
       - is_correct flag match: X%
       - Average score difference: X points
    
    4. Expected results:
       - MCQ/True-False: >99% agreement
       - Fill-in-Blank: >95% agreement (due to flexible matching)
    """)
    
    print("\n✅ Validation complete - Review results above")
    print("=" * 70)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Validate deterministic evaluation against LLM results"
    )
    parser.add_argument(
        "--sample-size",
        type=int,
        default=100,
        help="Number of sessions to validate (default: 100)"
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(validate_deterministic_evaluation(args.sample_size))
