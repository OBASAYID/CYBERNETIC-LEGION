import os
import time

from ingestion.stream_ingestor import get_event
from metrics.tracker import get_metrics
from optimization.improver import improve_system
from safety.override import is_locked
from training.dataset_builder import count_training_examples
from training.safeguards import evaluate_promotion_safeguard
from training.train import train_model


_last_training_time = 0.0


def metrics_indicate_learning_needed() -> bool:
    metrics = get_metrics()
    if not metrics:
        return False

    signal = improve_system(metrics)
    action = signal.get("action")
    return action in {"optimize_quality", "improve_reliability"}


def _training_allowed_by_cooldown() -> bool:
    global _last_training_time

    cooldown_seconds = int(os.getenv("CYRUS_TRAINING_COOLDOWN_SECONDS", "3600"))
    now = time.time()
    if now - _last_training_time < cooldown_seconds:
        return False

    _last_training_time = now
    return True


def autonomous_loop() -> None:
    while True:
        if is_locked():
            print("Autonomy paused: system lockdown active")
            time.sleep(30)
            continue

        event = get_event()
        if event:
            print("Processing live event:", event)

        metrics = get_metrics()

        if metrics:
            decision = improve_system(metrics)
            print("Optimization:", decision)
        else:
            print("CYRUS monitoring system...")

        safeguard_result = evaluate_promotion_safeguard()
        if safeguard_result.get("status") not in {"inactive", "monitoring"}:
            print("Model safeguard:", safeguard_result)

        min_examples = int(os.getenv("CYRUS_MIN_TRAINING_EXAMPLES", "20"))
        if metrics_indicate_learning_needed() and count_training_examples() >= min_examples:
            if _training_allowed_by_cooldown():
                training_result = train_model()
                print("Autonomous training:", training_result)

        time.sleep(30)
