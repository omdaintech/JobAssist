"""Unit tests for speaking-specific request validation."""

import base64
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from app.user.models.request_models import ExamAnswerRequest  # noqa: E402


@pytest.fixture()
def speaking_question():
    return {
        "id": "q_speaking_1",
        "level": "A1",
        "question_metadata": {
            "max_answer_seconds": 55,
            "min_answer_seconds": 5,
        },
    }


def _audio_payload() -> str:
    return base64.b64encode(b"fake audio payload").decode()


def test_exam_answer_request_accepts_valid_speaking_payload(speaking_question):
    payload = ExamAnswerRequest(
        activity_type="speaking",
        question_number=1,
        question_data=speaking_question,
        speaking_audio_base64=_audio_payload(),
        speaking_audio_format="mp3",
        speaking_audio_duration_seconds=12.5,
    )

    assert payload.activity_type == "speaking"
    assert payload.speaking_audio_format == "mp3"
    assert payload.speaking_audio_base64.startswith("Z")


def test_exam_answer_request_rejects_missing_audio(speaking_question):
    with pytest.raises(ValidationError) as exc:
        ExamAnswerRequest(
            activity_type="speaking",
            question_number=1,
            question_data=speaking_question,
        )

    assert "audio payload" in str(exc.value)


def test_exam_answer_request_rejects_invalid_format(speaking_question):
    with pytest.raises(ValidationError) as exc:
        ExamAnswerRequest(
            activity_type="speaking",
            question_number=1,
            question_data=speaking_question,
            speaking_audio_base64=_audio_payload(),
            speaking_audio_format="wav",
        )

    assert "audio format" in str(exc.value)


def test_exam_answer_request_rejects_non_positive_duration(speaking_question):
    with pytest.raises(ValidationError) as exc:
        ExamAnswerRequest(
            activity_type="speaking",
            question_number=1,
            question_data=speaking_question,
            speaking_audio_base64=_audio_payload(),
            speaking_audio_format="mp4",
            speaking_audio_duration_seconds=0,
        )

    assert "duration" in str(exc.value)
