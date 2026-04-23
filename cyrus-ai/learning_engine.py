from typing import Any, Dict


def learn_from_feedback(feedback: Dict[str, Any]) -> Dict[str, Any]:
    rating = float(feedback.get("rating", 0))

    if rating < 3:
        return {
            "action": "adjust",
            "reason": "low_feedback_rating",
            "target": "strategy_refinement",
        }

    return {
        "action": "reinforce",
        "reason": "positive_feedback_rating",
        "target": "pattern_retention",
    }


def update_behavior(feedback: Dict[str, Any]) -> Dict[str, str]:
    rating = float(feedback.get("rating", 0))

    if rating < 3:
        return {"strategy": "adjust"}
    if rating >= 4:
        return {"strategy": "reinforce"}
    return {"strategy": "observe"}
