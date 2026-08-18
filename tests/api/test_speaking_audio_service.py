"""Unit tests for the SpeakingAudioService helpers."""

import base64
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from app.config import settings  # noqa: E402
from app.user.services.speaking_audio_service import SpeakingAudioService  # noqa: E402


class DummyS3Client:
    def __init__(self):
        self.objects = []

    def put_object(self, **kwargs):
        self.objects.append(kwargs)
        return {"status": "ok"}


class DummyTranscriptions:
    def create(self, *_, **__):
        return SimpleNamespace(text="hello world", duration=4.0)


class DummyOpenAI:
    def __init__(self):
        self.audio = SimpleNamespace(transcriptions=DummyTranscriptions())


@pytest.fixture()
def speaking_service(monkeypatch):
    monkeypatch.setattr(settings, "enable_speaking_exams", True)
    return SpeakingAudioService(
        s3_client=DummyS3Client(),
        openai_client=DummyOpenAI(),
    )


@pytest.mark.asyncio
async def test_process_audio_returns_expected_payload(speaking_service):
    question = {
        "id": "q-1",
        "level": "A1",
        "question_metadata": {
            "max_answer_seconds": 55,
            "min_answer_seconds": 5,
        },
    }

    audio_bytes = base64.b64encode(b"dummy audio")

    result = await speaking_service.process_audio(
        audio_base64=audio_bytes.decode(),
        audio_format="mp3",
        duration_seconds=10,
        question_data=question,
        user_id="user-1",
        session_id="session-1",
    )

    assert "audio_url" in result
    assert result["transcript"] == "hello world"
    assert result["audio_meta"]["speaking_rate_wpm"] == pytest.approx(12.0)
    assert result["audio_meta"]["format"] == "mp3"


@pytest.mark.asyncio
async def test_process_audio_rejects_long_recordings(speaking_service):
    question = {
        "id": "q-1",
        "level": "A1",
        "question_metadata": {"max_answer_seconds": 30},
    }

    audio_bytes = base64.b64encode(b"dummy audio")

    with pytest.raises(ValueError) as exc:
        await speaking_service.process_audio(
            audio_base64=audio_bytes.decode(),
            audio_format="mp4",
            duration_seconds=75,
            question_data=question,
            user_id="user-1",
            session_id="session-1",
        )

    assert "too long" in str(exc.value)
