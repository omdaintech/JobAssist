"""
Unit tests for TranscriptionOrchestrator
Tests the isolated transcription pre-step logic
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.user.services.session_analysis.transcription_orchestrator import (
    TranscriptionOrchestrator,
)


@pytest.fixture
def mock_speaking_service():
    """Mock SpeakingAudioService"""
    service = Mock()
    service.process_audio_from_s3 = AsyncMock()
    return service


@pytest.fixture
def mock_core_repo():
    """Mock CoreRepository"""
    repo = Mock()
    repo.update_exam_answer = Mock(return_value=True)
    return repo


@pytest.fixture
def orchestrator(mock_speaking_service, mock_core_repo):
    """Create TranscriptionOrchestrator with mocked dependencies"""
    return TranscriptionOrchestrator(
        speaking_service=mock_speaking_service,
        core_repo=mock_core_repo,
    )


@pytest.mark.asyncio
async def test_no_pending_transcriptions(orchestrator):
    """Test when no transcriptions are pending"""
    session_answers = [
        {
            "id": "ans1",
            "user_answer": "existing answer",
            "user_audio_meta": None,  # No audio
        },
        {
            "id": "ans2",
            "user_answer": "another answer",
            "user_audio_meta": {"transcription_pending": False},  # Already transcribed
        },
    ]

    success, errors = await orchestrator.process_pending_transcriptions(
        session_answers=session_answers,
        session_id="test_session",
        user_id="test_user",
    )

    assert success is True
    assert errors == []
    orchestrator.speaking_service.process_audio_from_s3.assert_not_called()


@pytest.mark.asyncio
async def test_successful_transcription(orchestrator, mock_speaking_service, mock_core_repo):
    """Test successful transcription flow"""
    mock_speaking_service.process_audio_from_s3.return_value = {
        "transcript": "This is the transcribed text",
        "audio_meta": {
            "duration_seconds": 5.2,
            "word_count": 5,
            "speaking_rate_wpm": 57.7,
        },
    }

    session_answers = [
        {
            "id": "ans1",
            "user_answer": "",
            "user_audio_meta": {
                "transcription_pending": True,
                "s3_key": "speaking/2025/11/test.mp3",
                "duration_seconds": 5.2,
            },
            "question_data": {
                "id": "q1",
                "language_code": "de",
            },
        },
    ]

    success, errors = await orchestrator.process_pending_transcriptions(
        session_answers=session_answers,
        session_id="test_session",
        user_id="test_user",
    )

    assert success is True
    assert errors == []

    # Verify speaking service was called
    mock_speaking_service.process_audio_from_s3.assert_called_once_with(
        s3_key="speaking/2025/11/test.mp3",
        duration_seconds=5.2,
        question_data={"id": "q1", "language_code": "de"},
        user_id="test_user",
        session_id="test_session",
    )

    # Verify database was updated
    mock_core_repo.update_exam_answer.assert_called_once()

    # Verify in-memory answer was updated
    assert session_answers[0]["user_answer"] == "This is the transcribed text"
    assert session_answers[0]["user_audio_transcript"] == "This is the transcribed text"


@pytest.mark.asyncio
async def test_empty_transcript_error(orchestrator, mock_speaking_service):
    """Test error handling when transcript is empty"""
    mock_speaking_service.process_audio_from_s3.return_value = {
        "transcript": "",  # Empty transcript
        "audio_meta": {},
    }

    session_answers = [
        {
            "id": "ans1",
            "user_answer": "",
            "user_audio_meta": {
                "transcription_pending": True,
                "s3_key": "speaking/2025/11/test.mp3",
            },
            "question_data": {"id": "q1"},
        },
    ]

    success, errors = await orchestrator.process_pending_transcriptions(
        session_answers=session_answers,
        session_id="test_session",
        user_id="test_user",
    )

    assert success is False
    assert len(errors) == 1
    assert errors[0]["question_id"] == "q1"
    assert "No speech detected" in errors[0]["error"]


@pytest.mark.asyncio
async def test_missing_s3_key_error(orchestrator):
    """Test error handling when s3_key is missing"""
    session_answers = [
        {
            "id": "ans1",
            "user_answer": "",
            "user_audio_meta": {
                "transcription_pending": True,
                "s3_key": None,  # Missing S3 key
            },
            "question_data": {"id": "q1"},
        },
    ]

    success, errors = await orchestrator.process_pending_transcriptions(
        session_answers=session_answers,
        session_id="test_session",
        user_id="test_user",
    )

    assert success is False
    assert len(errors) == 1
    assert errors[0]["question_id"] == "q1"
    assert "Missing S3 key" in errors[0]["error"]


@pytest.mark.asyncio
async def test_transcription_exception_handling(orchestrator, mock_speaking_service):
    """Test exception handling during transcription"""
    mock_speaking_service.process_audio_from_s3.side_effect = Exception(
        "Network error"
    )

    session_answers = [
        {
            "id": "ans1",
            "user_answer": "",
            "user_audio_meta": {
                "transcription_pending": True,
                "s3_key": "speaking/2025/11/test.mp3",
            },
            "question_data": {"id": "q1"},
        },
    ]

    success, errors = await orchestrator.process_pending_transcriptions(
        session_answers=session_answers,
        session_id="test_session",
        user_id="test_user",
    )

    assert success is False
    assert len(errors) == 1
    assert errors[0]["question_id"] == "q1"
    assert "Network error" in errors[0]["error"]


@pytest.mark.asyncio
async def test_mixed_success_and_failure(orchestrator, mock_speaking_service, mock_core_repo):
    """Test batch with both successful and failed transcriptions"""
    # First call succeeds, second fails
    mock_speaking_service.process_audio_from_s3.side_effect = [
        {
            "transcript": "Good transcript",
            "audio_meta": {},
        },
        Exception("Failed"),
    ]

    session_answers = [
        {
            "id": "ans1",
            "user_answer": "",
            "user_audio_meta": {
                "transcription_pending": True,
                "s3_key": "speaking/2025/11/test1.mp3",
            },
            "question_data": {"id": "q1"},
        },
        {
            "id": "ans2",
            "user_answer": "",
            "user_audio_meta": {
                "transcription_pending": True,
                "s3_key": "speaking/2025/11/test2.mp3",
            },
            "question_data": {"id": "q2"},
        },
    ]

    success, errors = await orchestrator.process_pending_transcriptions(
        session_answers=session_answers,
        session_id="test_session",
        user_id="test_user",
    )

    assert success is False  # At least one failure
    assert len(errors) == 1
    assert errors[0]["question_id"] == "q2"

    # First answer should be updated
    assert session_answers[0]["user_answer"] == "Good transcript"
    # Second answer should remain empty
    assert session_answers[1]["user_answer"] == ""
