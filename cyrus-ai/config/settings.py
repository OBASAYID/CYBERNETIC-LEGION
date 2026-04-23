from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    MAX_DRONES: int = int(os.getenv("CYRUS_MAX_DRONES", "10"))
    LOOP_INTERVAL: float = float(os.getenv("CYRUS_GLOBAL_LOOP_INTERVAL", "0.5"))
    TRACKING_HISTORY: int = int(os.getenv("CYRUS_TRACKING_HISTORY", "5"))
    PERCEPTION_MAX_FPS: float = float(os.getenv("CYRUS_PERCEPTION_MAX_FPS", "10"))
    EMBODIED_LOOP_HZ: float = float(os.getenv("CYRUS_EMBODIED_LOOP_HZ", "2.0"))
    MEMORY_BATCH_SIZE: int = int(os.getenv("CYRUS_MEMORY_BATCH_SIZE", "8"))


settings = Settings()
