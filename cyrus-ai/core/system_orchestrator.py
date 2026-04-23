from __future__ import annotations

import threading
from typing import Any, Dict

from audit.logger import log_audit
from autonomy import autonomous_loop
from brain import process_embodied_input
from distributed.listener import start_listener
from embodiment.core_loop import CyrusCoreLoop
from embodiment.drone_controller import DroneController
from human.interaction import HumanInteraction
from memory_service import store_memory
from mission.engine import MissionEngine
from perception.vision import VisionSystem
from swarm.runtime import SwarmRuntime
from training.dataset_builder import log_training_example

from config.settings import settings

from .event_router import EventRouter
from .global_loop import GlobalCyrusLoop


class SystemOrchestrator:
    """Central lifecycle manager for all CYRUS subsystems."""

    def __init__(self) -> None:
        self.drone_controller = DroneController()
        self.vision_system = VisionSystem()
        self.mission_engine = MissionEngine(log_audit, store_memory, log_training_example)
        self.human_interaction = HumanInteraction(store_memory, log_training_example, log_audit)

        self.swarm_runtime = SwarmRuntime(
            process_embodied_input,
            self.mission_engine,
            log_audit,
            store_memory,
            log_training_example,
        )
        self.swarm_runtime.register_drone("drone-1", self.drone_controller)

        self.core_loop = CyrusCoreLoop(
            drone_controller=self.drone_controller,
            vision_system=self.vision_system,
            mission_engine=self.mission_engine,
            human_interaction=self.human_interaction,
            brain_processor=process_embodied_input,
            audit_log=log_audit,
            swarm_runtime=self.swarm_runtime,
        )

        self.event_router = EventRouter(
            mission_engine=self.mission_engine,
            swarm_runtime=self.swarm_runtime,
            memory_service=store_memory,
            dataset_builder=log_training_example,
            audit_log=log_audit,
        )

        self.global_loop = GlobalCyrusLoop(
            brain_processor=process_embodied_input,
            vision_system=self.vision_system,
            drone_controller=self.drone_controller,
            event_router=self.event_router,
            nxi_map=self.swarm_runtime.nxi_map,
        )

        self._threads: list[threading.Thread] = []
        self._started = False

    def start(self) -> Dict[str, Any]:
        if self._started:
            return {"status": "ok", "message": "already_started", "orchestrator": self.status()}

        listener_thread = threading.Thread(target=start_listener, daemon=True)
        autonomy_thread = threading.Thread(target=autonomous_loop, daemon=True)
        listener_thread.start()
        autonomy_thread.start()
        self._threads = [listener_thread, autonomy_thread]

        self.core_loop.start(tick_hz=settings.EMBODIED_LOOP_HZ)
        self.global_loop.start()
        self._started = True

        return {"status": "ok", "message": "started", "orchestrator": self.status()}

    def shutdown(self) -> Dict[str, Any]:
        if not self._started:
            return {"status": "ok", "message": "already_stopped", "orchestrator": self.status()}

        self.global_loop.stop()
        self.core_loop.stop()
        self.vision_system.shutdown()
        self._started = False
        return {"status": "ok", "message": "stopped", "orchestrator": self.status()}

    def restart(self) -> Dict[str, Any]:
        _ = self.shutdown()
        return self.start()

    def status(self) -> Dict[str, Any]:
        return {
            "started": self._started,
            "core_loop": self.core_loop.status(),
            "global_loop": self.global_loop.status(),
            "swarm": self.swarm_runtime.status(),
            "mission": self.mission_engine.status(),
            "drone": self.drone_controller.state,
        }
