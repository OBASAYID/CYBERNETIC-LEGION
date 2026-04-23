from typing import List


def create_plan(input_text: str) -> List[str]:
    _ = input_text
    return [
        "analyze_input",
        "retrieve_memory",
        "reason_decision",
        "execute_action",
        "evaluate_result",
    ]
