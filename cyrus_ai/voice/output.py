from __future__ import annotations

from threading import Event

from cyrus_ai.config.settings import Settings
from cyrus_ai.services.tts_service import TTSService


class VoiceOutput:
    def __init__(self, settings: Settings):
        self.tts = TTSService(settings)

    def speak(self, text: str, interrupt_event: Event | None = None) -> None:
        self.tts.speak(text=text, interrupt_event=interrupt_event)
