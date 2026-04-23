from typing import Any, Dict

from agents.base_agent import BaseAgent
from memory_service import query_memory


class MemoryAgent(BaseAgent):
    def __init__(self):
        super().__init__("memory")

    def process(self, input_text: str) -> Dict[str, Any]:
        try:
            result = query_memory(input_text)
            self.record_success()
            return result
        except Exception:
            self.record_failure()
            raise
