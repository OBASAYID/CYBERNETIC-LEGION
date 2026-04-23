from __future__ import annotations

import logging
from threading import Event

try:
    import pyttsx3
except Exception:  # pragma: no cover
    pyttsx3 = None

from cyrus_ai.config.settings import Settings

logger = logging.getLogger(__name__)

try:
    from elevenlabs import ElevenLabs
except Exception:  # pragma: no cover
    ElevenLabs = None


class TTSService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.pyttsx = None
        if pyttsx3 is not None:
            self.pyttsx = pyttsx3.init()
            self.pyttsx.setProperty("rate", 175)
            self.pyttsx.setProperty("volume", 1.0)

            voices = self.pyttsx.getProperty("voices")
            if voices:
                for voice in voices:
                    if "female" in voice.name.lower() or "zira" in voice.name.lower() or "samantha" in voice.name.lower():
                        self.pyttsx.setProperty("voice", voice.id)
                        break

        self.elevenlabs = None
        if settings.elevenlabs_api_key and ElevenLabs is not None:
            try:
                self.elevenlabs = ElevenLabs(api_key=settings.elevenlabs_api_key)
            except Exception as exc:
                logger.warning("ElevenLabs init failed, falling back to pyttsx3: %s", exc)

    def speak(self, text: str, interrupt_event: Event | None = None) -> None:
        if interrupt_event and interrupt_event.is_set():
            return

        if self.elevenlabs:
            # Keep ElevenLabs optional; for local loop reliability, pyttsx3 is default output.
            pass

        if self.pyttsx is None:
            logger.info("TTS backend unavailable; text output only")
            return

        sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
        for sentence in sentences:
            if interrupt_event and interrupt_event.is_set():
                self.pyttsx.stop()
                return
            self.pyttsx.say(sentence)
            self.pyttsx.runAndWait()
