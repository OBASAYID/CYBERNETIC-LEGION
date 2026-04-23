from __future__ import annotations

import logging
from typing import Dict

from cyrus_ai.services.stt_service import STTService

logger = logging.getLogger(__name__)


class VoiceInput:
    def __init__(self):
        self.stt = STTService()

    def capture(self) -> Dict[str, str | float]:
        return self.stt.transcribe_from_mic()
