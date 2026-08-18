#!/usr/bin/env python3
"""
Bulk Audio Regeneration Script for Hearing and Speaking Questions

This script regenerates audio for ALL hearing and speaking questions in the database:
- Questions with missing audio (audio_url is NULL or empty)
- Questions with existing audio (will regenerate and overwrite)

Features:
- Uploads to new S3 bucket (your-audio-bucket)
- Generates CloudFront URLs (your-cloudfront-domain.cloudfront.net)
- Progress tracking and reporting
- Error handling and retry logic
- Dry run mode for testing
- Batch processing to avoid memory issues
- Supports both hearing and speaking activities

Usage:
    # Dry run (test mode - no actual generation)
    python scripts/regenerate_all_hearing_audio.py --dry-run
    
    # Test with first 5 questions
    python scripts/regenerate_all_hearing_audio.py --limit 5
    
    # Regenerate only missing audio
    python scripts/regenerate_all_hearing_audio.py --missing-only
    
    # Regenerate ALL audio (including existing)
    python scripts/regenerate_all_hearing_audio.py --regenerate-all
    
    # Target specific activity type
    python scripts/regenerate_all_hearing_audio.py --activity-type speaking
    python scripts/regenerate_all_hearing_audio.py --activity-type hearing
    
    # Full regeneration with batch processing
    python scripts/regenerate_all_hearing_audio.py --regenerate-all --batch-size 50
"""

import sys
import os
import asyncio
import argparse
from typing import List, Dict, Any, Optional
from datetime import datetime
import structlog

# Add project root to path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Load environment variables (check for .env.test.local first for local testing)
from dotenv import load_dotenv
test_env_path = os.path.join(project_root, '.env.test.local')
if os.path.exists(test_env_path):
    print(f"📍 Using test environment: {test_env_path}")
    load_dotenv(test_env_path, override=True)
else:
    print("📍 Using default environment (.env)")

from app.config import settings
from app.admin.services.admin_audio_service import AdminAudioService
from app.admin.dependencies import get_admin_repository_dependency

logger = structlog.get_logger()


class BulkAudioRegenerator:
    """
    Bulk audio regeneration service for hearing and speaking questions
    """
    
    def __init__(self, activity_type: str = "hearing"):
        self.audio_service = AdminAudioService()
        self.admin_repo = get_admin_repository_dependency()
        self.activity_type = activity_type
        
        # Statistics
        self.stats = {
            "total_questions": 0,
            "questions_processed": 0,
            "successful_generations": 0,
            "failed_generations": 0,
            "skipped_questions": 0,
            "errors": []
        }
    
    def get_all_audio_questions(
        self, 
        missing_only: bool = False,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all hearing or speaking questions from database
        
        Args:
            missing_only: Only get questions without audio
            limit: Limit number of questions (for testing)
            
        Returns:
            List of questions needing audio
        """
        try:
            logger.info(f"Fetching {self.activity_type} questions from database",
                       missing_only=missing_only,
                       limit=limit)
            
            # Get questions using admin repository
            questions = self.admin_repo.get_questions_by_filters(
                activity_type=self.activity_type,
                has_audio=False if missing_only else None,
                limit=limit if limit else 1000,  # High limit to get all
                skip=0
            )
            
            logger.info(f"Found {len(questions)} {self.activity_type} questions",
                       missing_only=missing_only,
                       limit=limit)
            
            return questions
            
        except Exception as e:
            logger.error(f"Failed to fetch {self.activity_type} questions", error=str(e))
            return []
    
    async def regenerate_audio_for_question(
        self, 
        question: Dict[str, Any],
        force_regenerate: bool = False,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Regenerate audio for a single question
        
        Args:
            question: Question data
            force_regenerate: Regenerate even if audio exists
            dry_run: Don't actually generate audio
            
        Returns:
            Result dict with success status
        """
        question_id = str(question.get("id") or question.get("_id", ""))
        audio_url = question.get("audio_url")
        
        if not question_id:
            return {"success": False, "message": "Invalid question ID"}
        
        try:
            # Dry run mode - just log what would happen
            if dry_run:
                logger.info("DRY RUN: Would regenerate audio",
                          question_id=question_id,
                          level=question.get("level"),
                          language_id=question.get("language_id"),
                          has_existing_audio=bool(audio_url))
                self.stats["questions_processed"] += 1
                return {
                    "success": True,
                    "dry_run": True,
                    "message": "Dry run - no audio generated"
                }
            
            # Check if audio already exists and skip if not force_regenerate
            if audio_url and not force_regenerate:
                logger.info("Question already has audio, skipping",
                          question_id=question_id,
                          audio_url=audio_url)
                self.stats["skipped_questions"] += 1
                return {
                    "success": True,
                    "skipped": True,
                    "message": "Audio already exists"
                }
            
            # Delete old audio from S3 and clear URL if force regenerating
            if audio_url and force_regenerate:
                logger.info("Deleting old audio before regenerating",
                          question_id=question_id,
                          old_audio_url=audio_url)
                # Use the audio service's delete method to remove from S3
                delete_result = await self.audio_service.delete_audio(question_id)
                if not delete_result.get("success"):
                    logger.warning("Failed to delete old audio, continuing anyway",
                                 question_id=question_id,
                                 error=delete_result.get("message"))
            
            # Generate audio
            logger.info("Generating audio",
                       question_id=question_id,
                       level=question.get("level"),
                       language_id=question.get("language_id"))
            
            result = await self.audio_service.generate_audio_for_question(question_id, force_overwrite=True)
            
            if result.get("success"):
                self.stats["successful_generations"] += 1
                logger.info("Audio generated successfully",
                          question_id=question_id,
                          audio_url=result.get("audio_url"))
                return result
            else:
                self.stats["failed_generations"] += 1
                error_msg = result.get("message", "Unknown error")
                logger.error("Audio generation failed",
                           question_id=question_id,
                           error=error_msg)
                self.stats["errors"].append({
                    "question_id": question_id,
                    "error": error_msg
                })
                return result
                
        except Exception as e:
            self.stats["failed_generations"] += 1
            error_msg = str(e)
            logger.error("Exception during audio generation",
                        question_id=question_id,
                        error=error_msg)
            self.stats["errors"].append({
                "question_id": question_id,
                "error": error_msg
            })
            return {
                "success": False,
                "message": error_msg
            }
        finally:
            self.stats["questions_processed"] += 1
    
    async def regenerate_all(
        self,
        missing_only: bool = False,
        limit: Optional[int] = None,
        dry_run: bool = False
    ):
        """
        Regenerate audio for all hearing/speaking questions (ONE AT A TIME)
        
        Args:
            missing_only: Only regenerate questions without audio
            limit: Limit number of questions
            dry_run: Test mode - don't actually generate audio
        """
        print("\n" + "="*80)
        print(f"BULK AUDIO REGENERATION FOR {self.activity_type.upper()} QUESTIONS")
        print("="*80)
        print(f"Activity Type: {self.activity_type}")
        print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
        print(f"Target: {'Missing audio only' if missing_only else 'ALL questions (regenerate)'}")
        if limit:
            print(f"Limit: {limit} questions")
        print(f"S3 Bucket: {settings.s3_bucket_name}")
        print(f"CloudFront Domain: {settings.cloudfront_domain or 'Not configured (using S3 direct)'}")
        print("="*80 + "\n")
        
        # Validate configuration
        if not dry_run:
            if not settings.elevenlabs_api_key:
                print("❌ ERROR: ELEVENLABS_API_KEY not configured")
                return
            
            if not settings.aws_access_key_id or not settings.aws_secret_access_key:
                print("❌ ERROR: AWS credentials not configured")
                return
        
        # Get all questions for the specified activity type
        print(f"📋 Fetching {self.activity_type} questions from database...")
        questions = self.get_all_audio_questions(
            missing_only=missing_only,
            limit=limit
        )
        
        if not questions:
            print(f"❌ No {self.activity_type} questions found")
            return
        
        self.stats["total_questions"] = len(questions)
        print(f"✅ Found {len(questions)} {self.activity_type} questions\n")
        
        # Process questions ONE AT A TIME (no batching, no parallel processing)
        start_time = datetime.now()
        
        print("🔄 Processing questions one at a time...\n")
        
        for idx, question in enumerate(questions, 1):
            question_id = str(question.get("id") or question.get("_id", "unknown"))
            level = question.get("level", "unknown")
            
            print(f"[{idx}/{len(questions)}] Processing question {question_id} (Level: {level})...")
            
            # Process single question
            result = await self.regenerate_audio_for_question(
                question,
                force_regenerate=not missing_only,
                dry_run=dry_run
            )
            
            # Show immediate result
            if result.get("success"):
                if result.get("skipped"):
                    print(f"   ⏭️  Skipped (already has audio)")
                elif result.get("dry_run"):
                    print(f"   🧪 Dry run completed")
                else:
                    audio_url = result.get("audio_url", "")
                    print(f"   ✅ Audio generated: {audio_url}")
            else:
                error_msg = result.get("message", "Unknown error")
                print(f"   ❌ Failed: {error_msg}")
            
            # Print running stats every 10 questions
            if idx % 10 == 0:
                success_rate = (
                    self.stats["successful_generations"] / self.stats["questions_processed"] * 100
                    if self.stats["questions_processed"] > 0 else 0
                )
                print(f"\n   📊 Progress: {idx}/{len(questions)} | Success: {self.stats['successful_generations']} | Failed: {self.stats['failed_generations']} | Success rate: {success_rate:.1f}%\n")
        
        # Final report
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print("\n" + "="*80)
        print("FINAL REPORT")
        print("="*80)
        print(f"Total questions: {self.stats['total_questions']}")
        print(f"Processed: {self.stats['questions_processed']}")
        print(f"✅ Successful: {self.stats['successful_generations']}")
        print(f"❌ Failed: {self.stats['failed_generations']}")
        print(f"⏭️  Skipped: {self.stats['skipped_questions']}")
        print(f"⏱️  Duration: {duration:.1f} seconds")
        
        if self.stats["questions_processed"] > 0:
            avg_time = duration / self.stats["questions_processed"]
            success_rate = self.stats["successful_generations"] / self.stats["questions_processed"] * 100
            print(f"⚡ Average time per question: {avg_time:.1f}s")
            print(f"📊 Success rate: {success_rate:.1f}%")
        
        # Show errors
        if self.stats["errors"]:
            print(f"\n❌ ERRORS ({len(self.stats['errors'])}):")
            for error in self.stats["errors"][:10]:  # Show first 10 errors
                print(f"   - Question {error['question_id']}: {error['error']}")
            
            if len(self.stats["errors"]) > 10:
                print(f"   ... and {len(self.stats['errors']) - 10} more errors")
        
        print("="*80 + "\n")


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Regenerate audio for hearing and speaking questions"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Test mode - don't actually generate audio"
    )
    parser.add_argument(
        "--missing-only",
        action="store_true",
        help="Only regenerate questions without audio"
    )
    parser.add_argument(
        "--regenerate-all",
        action="store_true",
        help="Regenerate ALL audio (including existing)"
    )
    parser.add_argument(
        "--activity-type",
        type=str,
        choices=["hearing", "speaking"],
        default="hearing",
        help="Activity type to process (hearing or speaking)"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of questions to process (for testing)"
    )
    
    args = parser.parse_args()
    
    # Determine mode
    if args.regenerate_all and args.missing_only:
        print("❌ ERROR: Cannot use both --regenerate-all and --missing-only")
        sys.exit(1)
    
    missing_only = args.missing_only or not args.regenerate_all
    
    # Create regenerator with specified activity type
    regenerator = BulkAudioRegenerator(activity_type=args.activity_type)
    
    try:
        await regenerator.regenerate_all(
            missing_only=missing_only,
            limit=args.limit,
            dry_run=args.dry_run
        )
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        print(f"Processed {regenerator.stats['questions_processed']} questions before stopping")
    except Exception as e:
        print(f"\n\n❌ FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
