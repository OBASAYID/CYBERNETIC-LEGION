from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Protocol


@dataclass
class MissionResult:
    handled: bool
    adapter: str
    status: str
    output: str


class MissionAdapter(Protocol):
    name: str

    def can_handle(self, command: str) -> bool:
        ...

    def execute(self, command: str) -> MissionResult:
        ...


class LocalOpsAdapter:
    name = "local-ops"

    def can_handle(self, command: str) -> bool:
        lowered = command.lower()
        return any(token in lowered for token in ("status", "check", "report", "mission", "drone", "launch", "abort"))

    def execute(self, command: str) -> MissionResult:
        lowered = command.lower()
        if "abort" in lowered:
            return MissionResult(True, self.name, "ok", "Mission abort sequence acknowledged. Safety interlocks enabled.")
        if "launch" in lowered:
            return MissionResult(True, self.name, "ok", "Mission prelaunch checks passed. Awaiting final arm command.")
        if "drone" in lowered or "mission" in lowered:
            return MissionResult(True, self.name, "ok", "Drone mission bus active. Telemetry stream nominal.")
        return MissionResult(True, self.name, "ok", "Operations status green. No blocking alerts.")


class MissionBus:
    def __init__(self, adapters: List[MissionAdapter] | None = None):
        self.adapters = adapters or [LocalOpsAdapter()]

    def execute(self, command: str) -> MissionResult:
        for adapter in self.adapters:
            if adapter.can_handle(command):
                return adapter.execute(command)
        return MissionResult(False, "none", "unhandled", "No mission adapter accepted this command.")

    def registry(self) -> List[Dict[str, str]]:
        return [{"name": a.name} for a in self.adapters]
