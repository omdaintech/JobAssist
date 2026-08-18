"""
Transcription Orchestrator - Pre-Analysis Step
Handles pending audio transcriptions BEFORE credit reservation
Isolated from analysis logic for clarity and testability
"""

import structlog
from typing import Dict, List, Tuple

logger = structlog.get_logger()


class TranscriptionOrchestrator:
    """
    Handles audio transcription as a pre-analysis step
    
    Responsibilities:
    - Identify pending transcriptions (transcription_pending=true)
    - Download audio from S3 and transcribe
    - Update database with transcript
    - Return errors if transcription fails
    
    Does NOT:
    - Reserve credits (happens after transcription)
    - Perform analysis (separate service)
    - Make business logic decisions
    """

    def __init__(self, speaking_service, core_repo):
        """
        Args:
            speaking_service: SpeakingAudioService for audio processing
            core_repo: CoreRepository for database updates
        """
        self.speaking_service = speaking_service
        self.core_repo = core_repo

    async def process_pending_transcriptions(
        self,
        session_answers: List[Dict],
        session_id: str,
        user_id: str,
    ) -> Tuple[bool, List[Dict]]:
        """
        Process all pending audio transcriptions for a session
        
        Args:
            session_answers: List of answer dictionaries (modified in-place)
            session_id: Session identifier for logging
            user_id: User identifier for logging
        
        Returns:
            Tuple of (success: bool, errors: List[Dict])
            - success=True if all transcriptions succeeded or none pending
            - success=False if any transcription failed
            - errors contains details for failed transcriptions
        """
        transcription_errors = []
        pending_count = 0

        for answer in session_answers:
            audio_meta = answer.get("user_audio_meta")
            if not audio_meta:
                continue

            # Check if transcription is pending
            if not audio_meta.get("transcription_pending"):
                continue

            pending_count += 1
            s3_key = audio_meta.get("s3_key")
            question_id = answer.get("question_data", {}).get("id", "unknown")

            if not s3_key:
                logger.warning(
                    "TRANSCRIPTION_MISSING_S3_KEY",
                    session_id=session_id,
                    answer_id=answer.get("id"),
                    question_id=question_id,
                )
                transcription_errors.append({
                    "question_id": question_id,
                    "error": "Missing S3 key for audio file",
                })
                continue

            # Process audio transcription
            try:
                logger.info(
                    "TRANSCRIPTION_PROCESSING_START",
                    session_id=session_id,
                    s3_key=s3_key,
                    question_id=question_id,
                )

                # Download from S3 and transcribe
                audio_result = await self.speaking_service.process_audio_from_s3(
                    s3_key=s3_key,
                    duration_seconds=audio_meta.get("duration_seconds", 0),
                    question_data=answer.get("question_data", {}),
                    user_id=user_id,
                    session_id=session_id,
                )

                transcript = audio_result.get("transcript", "")

                # Validate transcript is not empty
                if not transcript or not transcript.strip():
                    logger.error(
                        "TRANSCRIPTION_EMPTY_RESULT",
                        session_id=session_id,
                        question_id=question_id,
                        s3_key=s3_key,
                    )
                    transcription_errors.append({
                        "question_id": question_id,
                        "error": "No speech detected in audio. Please re-record your answer.",
                    })
                    continue

                # Update database with transcript
                answer_id = answer.get("id")
                if not answer_id:
                    logger.error(
                        "TRANSCRIPTION_MISSING_ANSWER_ID",
                        session_id=session_id,
                        question_id=question_id,
                    )
                    transcription_errors.append({
                        "question_id": question_id,
                        "error": "Internal error: Answer missing ID",
                    })
                    continue

                logger.info(
                    "TRANSCRIPTION_UPDATING_DATABASE",
                    answer_id=answer_id,
                    transcript_length=len(transcript),
                    has_audio_meta=bool(audio_result.get("audio_meta")),
                )

                # Update exam_answers table
                update_success = self.core_repo.update_exam_answer(
                    answer_id=answer_id,
                    new_answer=transcript,
                    is_skipped=False,
                    user_audio_transcript=transcript,
                    user_audio_meta=audio_result.get("audio_meta", {}),
                )

                if not update_success:
                    logger.error(
                        "TRANSCRIPTION_DATABASE_UPDATE_FAILED",
                        answer_id=answer_id,
                        session_id=session_id,
                    )
                    transcription_errors.append({
                        "question_id": question_id,
                        "error": "Failed to save transcript to database",
                    })
                    continue

                logger.info(
                    "TRANSCRIPTION_DATABASE_UPDATE_SUCCESS",
                    answer_id=answer_id,
                    session_id=session_id,
                )

                # Update in-memory answer for immediate use in analysis
                answer["user_answer"] = transcript
                answer["user_audio_transcript"] = transcript
                answer["user_audio_meta"] = audio_result.get("audio_meta", {})

                logger.info(
                    "TRANSCRIPTION_COMPLETED_SUCCESSFULLY",
                    session_id=session_id,
                    question_id=question_id,
                    answer_id=answer_id,
                    transcript_length=len(transcript),
                )

            except Exception as e:
                logger.error(
                    "TRANSCRIPTION_EXCEPTION",
                    session_id=session_id,
                    question_id=question_id,
                    s3_key=s3_key,
                    error=str(e),
                    error_type=type(e).__name__,
                )
                transcription_errors.append({
                    "question_id": question_id,
                    "error": f"Transcription failed: {str(e)}",
                })

        # Summary logging
        if pending_count > 0:
            logger.info(
                "TRANSCRIPTION_BATCH_COMPLETE",
                session_id=session_id,
                total_pending=pending_count,
                successful=pending_count - len(transcription_errors),
                failed=len(transcription_errors),
            )

        # Return success status and errors
        success = len(transcription_errors) == 0
        return success, transcription_errors
