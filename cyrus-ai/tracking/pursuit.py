from __future__ import annotations

import math
import time
from dataclasses import dataclass
from typing import List, Tuple

import numpy as np


@dataclass
class TargetSample:
    x: float
    y: float
    ts: float


class PursuitEngine:
    """Predictive pursuit engine with time-aware velocity estimation.

    Uses recent target samples to estimate velocity in meters/second (or coordinate units/sec)
    and predicts future intercept points with bounded horizon.
    """

    def __init__(self, history_size: int = 10, prediction_horizon_s: float = 1.5) -> None:
        self.history_size = max(3, history_size)
        self.prediction_horizon_s = max(0.1, prediction_horizon_s)
        self.history: List[TargetSample] = []

    def update_target(self, position: Tuple[float, float], timestamp: float | None = None) -> None:
        ts = float(timestamp if timestamp is not None else time.time())
        self.history.append(TargetSample(float(position[0]), float(position[1]), ts))
        if len(self.history) > self.history_size:
            self.history.pop(0)

    def predict_position(self, horizon_s: float | None = None) -> Tuple[float, float]:
        if not self.history:
            raise ValueError("no target history available")
        if len(self.history) == 1:
            sample = self.history[-1]
            return sample.x, sample.y

        horizon = float(horizon_s if horizon_s is not None else self.prediction_horizon_s)
        vx, vy = self._estimate_velocity()
        last = self.history[-1]
        return last.x + vx * horizon, last.y + vy * horizon

    def generate_intercept(self, drone_pos: Tuple[float, float], drone_speed: float = 8.0) -> Tuple[float, float]:
        if not self.history:
            raise ValueError("no target history available")

        speed = max(0.1, float(drone_speed))
        target_pred = self.predict_position(horizon_s=0.5)
        dx = target_pred[0] - float(drone_pos[0])
        dy = target_pred[1] - float(drone_pos[1])
        distance = math.sqrt(dx * dx + dy * dy)

        intercept_time = min(8.0, distance / speed)
        return self.predict_position(horizon_s=intercept_time)

    def _estimate_velocity(self) -> Tuple[float, float]:
        if len(self.history) < 2:
            return 0.0, 0.0

        velocities_x: List[float] = []
        velocities_y: List[float] = []
        recency_weights: List[float] = []

        for idx in range(1, len(self.history)):
            prev = self.history[idx - 1]
            cur = self.history[idx]
            dt = max(1e-3, cur.ts - prev.ts)
            velocities_x.append((cur.x - prev.x) / dt)
            velocities_y.append((cur.y - prev.y) / dt)
            recency_weights.append(float(idx))

        vx = float(np.average(np.array(velocities_x), weights=np.array(recency_weights)))
        vy = float(np.average(np.array(velocities_y), weights=np.array(recency_weights)))
        return vx, vy
