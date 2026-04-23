from __future__ import annotations

import logging
import signal
import argparse
from pathlib import Path
from threading import Event
from typing import Any, Dict

import sys

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel

from cyrus_ai.config.settings import load_settings
from cyrus_ai.core.brain import CyrusBrain
from cyrus_ai.core.memory import CyrusMemory
from cyrus_ai.services.embedding_service import build_embedding_provider
from cyrus_ai.services.mission_bus import MissionBus

settings = load_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("cyrus.app")


class ChatRequest(BaseModel):
    message: str
    source: str = "api"


class CyrusRuntime:
    def __init__(self):
        memory_dir = Path(__file__).resolve().parent / "data" / "memory_store"
        embedding_provider = build_embedding_provider(
            settings.embedding_provider,
            settings.memory_vector_dim,
            openai_api_key=settings.openai_api_key,
            openai_model=settings.embedding_model,
        )
        self.memory = CyrusMemory(
            store_dir=memory_dir,
            vector_dim=settings.memory_vector_dim,
            embedding_provider=embedding_provider,
        )
        self.mission_bus = MissionBus()
        self.brain = CyrusBrain(settings=settings, memory=self.memory, mission_bus=self.mission_bus)
        self.voice_input = None
        self.voice_output = None
        self.voice_enabled = False

        try:
            from cyrus_ai.voice.input import VoiceInput
            from cyrus_ai.voice.output import VoiceOutput

            self.voice_input = VoiceInput()
            self.voice_output = VoiceOutput(settings=settings)
            self.voice_enabled = True
        except Exception as exc:
            logger.warning("Voice stack unavailable, running text-only mode: %s", exc)

        self.stop_event = Event()
        self.interrupt_event = Event()

    def _handle_signal(self, *_: Any) -> None:
        logger.info("Shutdown requested")
        self.stop_event.set()
        self.interrupt_event.set()

    def install_signal_handlers(self) -> None:
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

    def process_text(self, message: str, source: str = "text") -> Dict[str, Any]:
        result = self.brain.process(user_text=message, source=source)
        if result.confidence < 0.45:
            fallback = (
                "I am not fully confident about that request yet. "
                "Please provide one more detail so I can answer precisely."
            )
            return {
                "response": fallback,
                "mode": result.mode,
                "confidence": result.confidence,
                "needs_clarification": True,
            }

        return {
            "response": result.response,
            "mode": result.mode,
            "confidence": result.confidence,
            "needs_clarification": result.needs_clarification,
        }

    def run_voice_loop(self) -> None:
        self.install_signal_handlers()
        logger.info("CYRUS voice loop started. Say 'exit' or press Ctrl+C to stop.")

        if not self.voice_enabled or self.voice_input is None or self.voice_output is None:
            logger.info("Voice dependencies unavailable. Falling back to interactive text loop.")
            while not self.stop_event.is_set():
                user_text = input("You> ").strip()
                if not user_text:
                    continue
                if user_text.lower() in {"exit", "quit", "shutdown cyrus"}:
                    self.stop_event.set()
                    break
                result = self.process_text(user_text, source="text")
                print(f"CYRUS> {result['response']}")
            logger.info("CYRUS text loop stopped")
            return

        while not self.stop_event.is_set():
            try:
                packet = self.voice_input.capture()
                text = str(packet.get("text", "")).strip()
                confidence = float(packet.get("confidence", 0.0))

                if not text:
                    continue

                logger.info("User(%s): %s", packet.get("engine", "stt"), text)
                if text.lower() in {"exit", "quit", "shutdown cyrus"}:
                    self.stop_event.set()
                    break

                if confidence < 0.35:
                    response = "I did not catch that clearly. Please repeat your request."
                else:
                    result = self.process_text(text, source="voice")
                    response = result["response"]

                logger.info("CYRUS: %s", response)
                self.voice_output.speak(response, interrupt_event=self.interrupt_event)
            except KeyboardInterrupt:
                self.stop_event.set()
            except Exception as exc:
                logger.exception("Runtime loop error: %s", exc)

        logger.info("CYRUS voice loop stopped")


runtime = CyrusRuntime()
app = FastAPI(title="CYRUS AI Assistant", version="1.0.0")
ui_file = Path(__file__).resolve().parent / "static" / "index.html"


@app.get("/")
def index() -> FileResponse:
    return FileResponse(ui_file)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "cyrus-ai"}


@app.post("/chat")
def chat(req: ChatRequest) -> Dict[str, Any]:
    return runtime.process_text(req.message, source=req.source)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CYRUS runtime entrypoint")
    parser.add_argument(
        "--api",
        action="store_true",
        help="Run FastAPI server on configured host/port instead of interactive voice/text loop.",
    )
    args = parser.parse_args()

    if args.api:
        import uvicorn

        logger.info(
            "Starting CYRUS API at http://%s:%s (domain hint: http://%s:%s)",
            settings.api_host,
            settings.api_port,
            settings.api_domain,
            settings.api_port,
        )
        uvicorn.run("cyrus_ai.app:app", host=settings.api_host, port=settings.api_port, reload=False)
    else:
        runtime.run_voice_loop()
