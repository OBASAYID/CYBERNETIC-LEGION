from time import perf_counter
import uuid
from typing import Any, Dict

from actions.action_executor import execute_action
from agents.analysis_agent import AnalysisAgent
from agents.learning_agent import LearningAgent
from agents.memory_agent import MemoryAgent
from agents.mission_agent import MissionAgent
from agents.security_agent import SecurityAgent
from audit.logger import log_audit
from evaluation.evaluator import evaluate_response
from fusion.fusion_engine import fuse_intelligence
from ingestion.stream_ingestor import get_event
from metrics.tracker import log_metric
from memory_service import store_memory
from mission_control.controller import start_mission
from distributed.task_router import route_task
from safety.override import is_locked
from training.dataset_builder import log_training_example


class Commander:
    def __init__(self):
        self.memory = MemoryAgent()
        self.analysis = AnalysisAgent()
        self.mission = MissionAgent()
        self.learning = LearningAgent()
        self.security = SecurityAgent()

    def generate_explanation(self, input_text: str, result: Dict[str, Any]) -> Dict[str, Any]:
        _ = input_text
        return {
            "summary": "Decision based on memory, analysis, and mission plan",
            "factors": {
                "memory_used": bool(result.get("memory")),
                "analysis_used": True,
                "mission_generated": True,
            },
        }

    def execute(self, input_text: str, operator_role: str = "system", operator_id: str = "system") -> Dict[str, Any]:
        start = perf_counter()

        if is_locked():
            blocked = {
                "status": "blocked",
                "reason": "system_lockdown",
            }
            evaluation = evaluate_response(input_text, blocked)
            explanation = self.generate_explanation(input_text, blocked)
            log_audit(
                {
                    "event_type": "decision",
                    "input": input_text,
                    "operator_role": operator_role,
                    "operator_id": operator_id,
                    "output": blocked,
                    "evaluation": evaluation,
                    "explanation": explanation,
                }
            )
            return {
                "result": blocked,
                "evaluation": evaluation,
                "explanation": explanation,
                "agent_stats": self.get_agent_stats(),
            }

        security = self.security.process(input_text)
        if security.get("status") != "ok":
            latency_ms = (perf_counter() - start) * 1000
            evaluation = evaluate_response(input_text, security)
            explanation = self.generate_explanation(input_text, security)
            log_metric({
                "input": input_text,
                "latency": round(latency_ms, 3),
                "confidence": evaluation.get("overall", 0),
                "score": evaluation.get("overall", 0),
                "status": security.get("status", "blocked"),
            })
            log_audit(
                {
                    "event_type": "decision",
                    "input": input_text,
                    "operator_role": operator_role,
                    "operator_id": operator_id,
                    "output": security,
                    "evaluation": evaluation,
                    "explanation": explanation,
                }
            )
            return {
                "result": security,
                "evaluation": evaluation,
                "explanation": explanation,
                "agent_stats": self.get_agent_stats(),
            }

        try:
            memory = self.memory.process(input_text)
        except Exception as exc:
            memory = {
                "ids": [],
                "documents": [],
                "metadatas": [],
                "distances": [],
                "error": f"memory unavailable: {exc}",
            }

        analysis = self.analysis.process(input_text, memory)
        try:
            log_training_example(
                input_text,
                analysis,
                metadata={
                    "source": "commander",
                    "stage": "analysis",
                },
            )
        except Exception:
            pass

        mission = self.mission.process(input_text)
        mission_id = str(uuid.uuid4())
        mission_state = start_mission(
            mission_id,
            input_text,
            metadata={"plan": mission.get("mission_plan", [])},
            initiated_by=operator_id,
        )
        live_data = get_event()
        fusion = fuse_intelligence(memory, live_data, analysis)

        try:
            store_memory(str(fusion), {"type": "fusion", "source": "commander"})
        except Exception:
            pass

        analysis_action = analysis.get("action") if isinstance(analysis, dict) else None
        mission_action = mission.get("action") if isinstance(mission, dict) else None
        fallback_action = "alert" if fusion.get("confidence", 0) < 0.6 else "log"
        action_name = str(analysis_action or mission_action or fallback_action)
        action_id = str(uuid.uuid4())
        action_result = execute_action(
            action_name,
            {
                "input": input_text,
                "confidence": fusion.get("confidence", 0),
                "mission": mission,
                "action_id": action_id,
                "operator_role": operator_role,
                "operator_id": operator_id,
            },
        )
        task_route = route_task({"input": input_text, "mission": mission})

        result = {
            "memory": memory,
            "analysis": analysis,
            "mission": mission,
            "fusion": fusion,
            "action": action_result,
            "action_id": action_id,
            "task_route": task_route,
            "live_data": live_data,
            "mission_state": mission_state,
        }
        evaluation = evaluate_response(input_text, result)
        explanation = self.generate_explanation(input_text, result)
        latency_ms = (perf_counter() - start) * 1000

        log_metric({
            "input": input_text,
            "latency": round(latency_ms, 3),
            "confidence": evaluation.get("overall", 0),
            "score": evaluation.get("overall", 0),
            "status": "ok",
        })

        log_audit(
            {
                "event_type": "decision",
                "input": input_text,
                "operator_role": operator_role,
                "operator_id": operator_id,
                "output": result,
                "evaluation": evaluation,
                "explanation": explanation,
            }
        )

        return {
            "result": result,
            "evaluation": evaluation,
            "explanation": explanation,
            "agent_stats": self.get_agent_stats(),
        }

    def get_agent_stats(self) -> Dict[str, Dict[str, int | str]]:
        return {
            "memory": self.memory.get_stats(),
            "analysis": self.analysis.get_stats(),
            "mission": self.mission.get_stats(),
            "learning": self.learning.get_stats(),
            "security": self.security.get_stats(),
        }
