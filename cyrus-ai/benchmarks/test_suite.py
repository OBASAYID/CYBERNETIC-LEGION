from time import perf_counter
from typing import Any, Dict, List

from benchmarks.history import log_benchmark


def run_benchmark(commander: Any) -> Dict[str, Any]:
    tests = [
        "Analyze system performance",
        "Plan mission for delivery drone",
        "Retrieve stored memory",
    ]

    results: List[Dict[str, Any]] = []

    for test in tests:
        start = perf_counter()
        result = commander.execute(test)
        latency_ms = (perf_counter() - start) * 1000
        evaluation = result.get("evaluation", {}) if isinstance(result, dict) else {}
        results.append({
            "input": test,
            "latency": round(latency_ms, 3),
            "evaluation": evaluation,
            "status": result.get("status", "ok") if isinstance(result, dict) else "ok",
        })

    avg_latency = sum(item["latency"] for item in results) / len(results) if results else 0.0
    avg_score = sum(float(item["evaluation"].get("overall", 0)) for item in results) / len(results) if results else 0.0

    benchmark_run = {
        "results": results,
        "summary": {
            "count": len(results),
            "avg_latency": round(avg_latency, 3),
            "avg_score": round(avg_score, 3),
        },
    }
    history = log_benchmark(benchmark_run)

    return {
        **benchmark_run,
        "history": history,
        "history_count": len(history),
    }
