from typing import Any, Dict

from agents.base_agent import BaseAgent
from learning_engine import update_behavior


class LearningAgent(BaseAgent):
    def __init__(self):
        super().__init__("learning")

    def process(self, feedback: Dict[str, Any]) -> Dict[str, str]:
        try:
            result = update_behavior(feedback)
            self.record_success()
            return result
        except Exception:
            self.record_failure()
            raise
