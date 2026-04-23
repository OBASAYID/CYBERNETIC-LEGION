from typing import Any


class BaseAgent:
    def __init__(self, name: str):
        self.name = name
        self.success_count = 0
        self.fail_count = 0

    def record_success(self) -> None:
        self.success_count += 1

    def record_failure(self) -> None:
        self.fail_count += 1

    def get_stats(self) -> dict[str, int | str]:
        return {
            "name": self.name,
            "success_count": self.success_count,
            "fail_count": self.fail_count,
        }

    def process(self, input_data: Any):
        raise NotImplementedError("Agent must implement process()")
