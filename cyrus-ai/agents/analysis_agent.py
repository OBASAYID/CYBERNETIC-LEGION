from typing import Any, Dict

from agents.base_agent import BaseAgent
from models.reasoning import reason_with_mode


class AnalysisAgent(BaseAgent):
    def __init__(self):
        super().__init__("analysis")

    def process(self, input_text: str, context: Dict[str, Any]) -> str:
        docs = context.get("documents", []) if isinstance(context, dict) else []
        context_text = "\n".join(str(item) for item in docs[:5])

        try:
            response = reason_with_mode(input_text, context_text)
        except Exception as exc:
            self.record_failure()
            return f"Reasoning failed: {exc}"

        if not isinstance(response, str) or not response.strip():
            self.record_failure()
            return "Reasoning failed: empty response"

        self.record_success()
        return response
