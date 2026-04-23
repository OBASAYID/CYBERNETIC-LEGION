import json
import os
from pathlib import Path
from typing import Any, Dict, List

from models.local_model import local_infer, reload_local_model


def _dataset_path() -> Path:
    default = Path(__file__).resolve().parent.parent / "runtime-data" / "training_data.jsonl"
    return Path(os.getenv("CYRUS_TRAINING_DATASET_FILE", str(default)))


def _load_examples(sample_size: int) -> List[Dict[str, str]]:
    path = _dataset_path()
    if not path.exists():
        return []

    records: List[Dict[str, str]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                continue

            input_text = str(payload.get("input", "")).strip()
            output_text = str(payload.get("output", "")).strip()
            if not input_text or not output_text:
                continue
            records.append({"input": input_text, "output": output_text})

    if sample_size <= 0:
        return records
    return records[-sample_size:]


def _token_overlap_score(actual: str, expected: str) -> float:
    actual_tokens = {tok for tok in actual.lower().split() if tok}
    expected_tokens = {tok for tok in expected.lower().split() if tok}

    if not expected_tokens:
        return 0.0
    if not actual_tokens:
        return 0.0

    overlap = len(actual_tokens.intersection(expected_tokens))
    precision = overlap / len(actual_tokens)
    recall = overlap / len(expected_tokens)

    if precision + recall == 0:
        return 0.0
    return (2 * precision * recall) / (precision + recall)


def evaluate_candidate_model(model_path: str) -> Dict[str, Any]:
    sample_size = int(os.getenv("CYRUS_MODEL_EVAL_SAMPLE_SIZE", "20"))
    min_eval_examples = int(os.getenv("CYRUS_MODEL_EVAL_MIN_EXAMPLES", "5"))
    passing_score = float(os.getenv("CYRUS_MODEL_PROMOTION_MIN_SCORE", "0.35"))

    examples = _load_examples(sample_size)
    if len(examples) < min_eval_examples:
        return {
            "status": "skipped",
            "reason": "insufficient_eval_examples",
            "required": min_eval_examples,
            "available": len(examples),
            "score": None,
            "promoted": False,
        }

    reload_local_model(model_path)

    scores: List[float] = []
    failures = 0

    max_new_tokens = int(os.getenv("CYRUS_MODEL_EVAL_MAX_NEW_TOKENS", "128"))
    for example in examples:
        prompt = f"Input:\n{example['input']}\n\nProvide a direct answer."
        try:
            candidate = local_infer(prompt, max_new_tokens=max_new_tokens)
        except Exception:
            failures += 1
            continue

        score = _token_overlap_score(candidate, example["output"])
        scores.append(score)

    usable = len(scores)
    avg_score = round(sum(scores) / usable, 4) if usable else 0.0
    pass_rate = round(usable / len(examples), 4) if examples else 0.0
    promoted = usable >= min_eval_examples and avg_score >= passing_score

    return {
        "status": "evaluated",
        "score": avg_score,
        "pass_rate": pass_rate,
        "usable_examples": usable,
        "total_examples": len(examples),
        "inference_failures": failures,
        "threshold": passing_score,
        "promoted": promoted,
    }
