from typing import Any, Dict

from agents.base_agent import BaseAgent


class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__("security")

    def process(self, input_text: Any) -> Dict[str, str]:
        if not isinstance(input_text, str):
            self.record_success()
            return {"status": "blocked", "reason": "Input must be a string"}

        if len(input_text) > 5000:
            self.record_success()
            return {"status": "blocked", "reason": "Input too large"}

        if not input_text.strip():
            self.record_success()
            return {"status": "blocked", "reason": "Input is empty"}

        self.record_success()
        return {"status": "ok"}
