from __future__ import annotations

import logging
from typing import Dict

try:
    import speech_recognition as sr
except Exception:  # pragma: no cover
    sr = None

logger = logging.getLogger(__name__)


class STTService:
    def __init__(self):
        self.recognizer = sr.Recognizer() if sr else None

    def transcribe_from_mic(self, timeout: float = 5, phrase_time_limit: float = 12) -> Dict[str, str | float]:
        if self.recognizer is None or sr is None:
            return {"text": "", "confidence": 0.0, "engine": "unavailable"}

        with sr.Microphone() as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)

        try:
            # Whisper can be available through SpeechRecognition if installed.
            text = self.recognizer.recognize_whisper(audio)
            return {"text": text.strip(), "confidence": 0.8, "engine": "whisper"}
        except Exception:
            pass

        try:
            text = self.recognizer.recognize_google(audio)
            return {"text": text.strip(), "confidence": 0.65, "engine": "google"}
        except Exception as exc:
            logger.warning("STT failed: %s", exc)
            return {"text": "", "confidence": 0.0, "engine": "none"}
