from __future__ import annotations

import math
from typing import List, Tuple


def circle_formation(center: Tuple[float, float], radius: float, num_drones: int) -> List[Tuple[float, float]]:
    if num_drones <= 0:
        return []
    if radius <= 0:
        raise ValueError("radius must be positive")

    positions: List[Tuple[float, float]] = []
    cx, cy = float(center[0]), float(center[1])
    for i in range(num_drones):
        angle = (2.0 * math.pi / float(num_drones)) * float(i)
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        positions.append((x, y))
    return positions
