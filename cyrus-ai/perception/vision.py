from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    cv2 = None


@dataclass
class Track:
    track_id: int
    label: str
    confidence: float
    bbox: Tuple[int, int, int, int]
    last_seen: float


class VisionSystem:
    """Camera + detection + lightweight tracking subsystem.

    If OpenCV is unavailable or disabled, this runs in deterministic simulation mode.
    """

    def __init__(self, camera_index: int = 0) -> None:
        self.simulation_mode = os.getenv("CYRUS_EMBODIMENT_SIMULATE", "false").strip().lower() == "true"
        self.camera_index = camera_index
        self._capture = None
        self._track_seq = 0
        self._tracks: Dict[int, Track] = {}
        self._frame_count = 0

        if not self.simulation_mode and cv2 is not None:
            self._capture = cv2.VideoCapture(camera_index)
            if not self._capture.isOpened():
                self.simulation_mode = True
                self._capture = None
        else:
            self.simulation_mode = True

    def read_frame(self) -> Tuple[Any, float]:
        ts = time.time()
        if self.simulation_mode or self._capture is None:
            self._frame_count += 1
            return {"simulated": True, "frame_id": self._frame_count}, ts

        ok, frame = self._capture.read()
        if not ok:
            return {"error": "camera_read_failed"}, ts
        return frame, ts

    def detect(self, frame: Any, timestamp: float) -> List[Dict[str, Any]]:
        if self.simulation_mode:
            # Deterministic synthetic target every 5th frame for mission-loop exercise.
            frame_id = int(frame.get("frame_id", 0)) if isinstance(frame, dict) else 0
            if frame_id % 5 == 0:
                return [
                    {
                        "label": "person",
                        "confidence": 0.88,
                        "bbox": (100, 100, 80, 180),
                        "timestamp": timestamp,
                    }
                ]
            return []

        if cv2 is None or not hasattr(cv2, "HOGDescriptor"):
            return []

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hog = cv2.HOGDescriptor()
        hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        boxes, weights = hog.detectMultiScale(gray, winStride=(8, 8), padding=(8, 8), scale=1.05)
        detections: List[Dict[str, Any]] = []
        for (x, y, w, h), weight in zip(boxes, weights):
            detections.append(
                {
                    "label": "person",
                    "confidence": float(weight),
                    "bbox": (int(x), int(y), int(w), int(h)),
                    "timestamp": timestamp,
                }
            )
        return detections

    def track(self, detections: List[Dict[str, Any]], max_distance_px: float = 80.0) -> List[Dict[str, Any]]:
        updated_tracks: Dict[int, Track] = {}
        now = time.time()

        for det in detections:
            bbox = det["bbox"]
            cx = bbox[0] + bbox[2] / 2.0
            cy = bbox[1] + bbox[3] / 2.0

            best_id = None
            best_dist = float("inf")
            for tid, tr in self._tracks.items():
                tcx = tr.bbox[0] + tr.bbox[2] / 2.0
                tcy = tr.bbox[1] + tr.bbox[3] / 2.0
                dist = ((cx - tcx) ** 2 + (cy - tcy) ** 2) ** 0.5
                if dist < best_dist and dist <= max_distance_px:
                    best_dist = dist
                    best_id = tid

            if best_id is None:
                self._track_seq += 1
                best_id = self._track_seq

            updated_tracks[best_id] = Track(
                track_id=best_id,
                label=det["label"],
                confidence=float(det["confidence"]),
                bbox=tuple(int(v) for v in bbox),
                last_seen=now,
            )

        self._tracks = {tid: tr for tid, tr in {**self._tracks, **updated_tracks}.items() if now - tr.last_seen < 3.0}

        return [
            {
                "track_id": tr.track_id,
                "label": tr.label,
                "confidence": tr.confidence,
                "bbox": tr.bbox,
                "last_seen": tr.last_seen,
            }
            for tr in self._tracks.values()
        ]

    def perceive(self) -> Dict[str, Any]:
        frame, ts = self.read_frame()
        detections = self.detect(frame, ts)
        tracks = self.track(detections)
        return {
            "timestamp": ts,
            "detections": detections,
            "tracks": tracks,
            "simulation_mode": self.simulation_mode,
        }

    def shutdown(self) -> None:
        if self._capture is not None:
            self._capture.release()
            self._capture = None
