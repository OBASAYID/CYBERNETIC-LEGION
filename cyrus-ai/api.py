import os
import time
from typing import Any, Dict

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from loguru import logger
from pydantic import BaseModel, Field
import uvicorn

from actions.action_executor import execute_action
from alerts import maybe_alert_on_error_rate
from audit.logger import load_recent_audit_logs, log_audit, verify_audit_chain
from backup import backup_data, list_backups, restore_data
from benchmarks.history import get_benchmark_history
from benchmarks.test_suite import run_benchmark
from brain import process_input, process_swarm_event
from brain import commander as brain_commander
from config import enforce_required_env
from control.approval import approve_action, list_pending_actions, reject_action
from control.auth import control_token_configured, signed_control_required, verify_operator_assertion
from core.system_orchestrator import SystemOrchestrator
from distributed.identity import NODE_ID
from ingestion.stream_ingestor import ingest_event, queue_size
from ingestion.stream_ingestor import is_backpressured, queue_capacity, queue_utilization, dead_letter_count
from learning_engine import learn_from_feedback
from mission_control.controller import list_active_missions, start_mission, stop_mission
from metrics.tracker import get_metrics
from memory_service import query_memory, store_memory
from models.versioning import get_active_model, get_active_model_path, get_latest_model, get_latest_model_path
from observability import configure_logging, observe_request, prometheus_payload, setup_tracing
from optimization.improver import improve_system
from safety.override import disable_lockdown, enable_lockdown, get_lockdown_state, is_locked
from training.dataset_builder import count_training_examples
from training.safeguards import evaluate_promotion_safeguard, get_promotion_safeguard_state
from training.train import train_model

app = FastAPI(title="CYRUS Intelligence Core", version="1.0.0")

configure_logging()
enforce_required_env()
setup_tracing(app)

orchestrator = SystemOrchestrator()
if os.getenv("CYRUS_TESTING", "").strip().lower() in {"1", "true", "yes", "on"}:
    logger.info("CYRUS_TESTING enabled; skipping orchestrator.start()")
else:
    _ = orchestrator.start()

drone_controller = orchestrator.drone_controller
vision_system = orchestrator.vision_system
mission_engine = orchestrator.mission_engine
human_interaction = orchestrator.human_interaction
swarm_runtime = orchestrator.swarm_runtime
core_loop = orchestrator.core_loop


class StoreMemoryRequest(BaseModel):
    text: str = Field(..., min_length=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class QueryMemoryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    n_results: int = Field(default=5, ge=1, le=20)


class FeedbackRequest(BaseModel):
    input: str = Field(..., min_length=1)
    response: str = Field(..., min_length=1)
    rating: float = Field(..., ge=0, le=5)


class BrainRequest(BaseModel):
    input: str = Field(..., min_length=1)


class EventRequest(BaseModel):
    event: Dict[str, Any]


class ActionRequest(BaseModel):
    action: str = Field(..., min_length=1)
    payload: Dict[str, Any] = Field(default_factory=dict)
    action_id: str | None = None


class ApprovalDecisionRequest(BaseModel):
    approver: str = Field(default="admin", min_length=1)
    reason: str = Field(default="manual_decision", min_length=1)


class MissionStartRequest(BaseModel):
    mission_id: str | None = None
    objective: str = Field(..., min_length=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class LockdownRequest(BaseModel):
    reason: str = Field(default="manual_override", min_length=1)


class BackupRestoreRequest(BaseModel):
    archive_name: str = Field(..., min_length=1)


class EmbodimentStartRequest(BaseModel):
    tick_hz: float = Field(default=2.0, ge=0.1, le=20.0)


class EmbodiedMissionStartRequest(BaseModel):
    goal: Dict[str, Any]


class EmbodiedMissionStopRequest(BaseModel):
    reason: str = Field(default="manual_stop", min_length=1)


class HumanIdentityRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    profile: Dict[str, Any] = Field(default_factory=dict)


class HumanVoiceRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)


class DroneTakeoffRequest(BaseModel):
    altitude: float = Field(default=10.0, gt=0)


class DroneGotoRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    alt: float = Field(..., ge=0)


class SwarmRegisterDroneRequest(BaseModel):
    drone_id: str = Field(..., min_length=1)


class SwarmUpdatePositionRequest(BaseModel):
    drone_id: str = Field(..., min_length=1)
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class SwarmTaskRequest(BaseModel):
    task: Dict[str, Any]


class SwarmFormationRequest(BaseModel):
    pattern: str = Field(default="line", min_length=1)
    anchor_lat: float = Field(..., ge=-90, le=90)
    anchor_lon: float = Field(..., ge=-180, le=180)
    spacing_m: float = Field(default=20.0, gt=0)


class SwarmPursuitRequest(BaseModel):
    max_pursuers: int = Field(default=2, ge=1, le=8)


class SwarmTrackRequest(BaseModel):
    target_id: str = Field(..., min_length=1)
    position: list[float] = Field(..., min_length=2, max_length=2)


class OrchestratorControlRequest(BaseModel):
    reason: str = Field(default="manual_control", min_length=1)


def success(data: Any) -> Dict[str, Any]:
    return {
        "status": "success",
        "data": data,
        "error": None,
    }


def _enforce_platform_api_key(x_platform_key: str | None) -> None:
    expected_key = os.getenv("CYRUS_PLATFORM_API_KEY")
    if not expected_key:
        return

    if x_platform_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid platform API key")


def _require_admin_role(role: str | None) -> None:
    if (role or "").strip().lower() != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")


def _get_operator_context(
    x_operator_assertion: str | None,
    x_operator_role: str | None,
    x_operator_id: str | None,
    require_assertion: bool = False,
    assertion_method: str | None = None,
    assertion_scope: str | None = None,
) -> Dict[str, str]:
    if x_operator_assertion:
        try:
            verified = verify_operator_assertion(
                x_operator_assertion,
                expected_method=assertion_method,
                expected_scope=assertion_scope,
            )
        except ValueError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc

        return {
            "operator_role": verified["operator_role"],
            "operator_id": verified["operator_id"],
        }

    if require_assertion:
        if control_token_configured():
            raise HTTPException(status_code=401, detail="missing_operator_assertion")
        if signed_control_required():
            raise HTTPException(status_code=500, detail="signed_control_not_configured")

    return {
        "operator_role": (x_operator_role or "system").strip().lower(),
        "operator_id": (x_operator_id or "system").strip(),
    }


@app.middleware("http")
async def lockdown_guard(request: Request, call_next):
    if not is_locked():
        return await call_next(request)

    path = request.url.path
    method = request.method.upper()
    allow_paths = {
        "/health",
        "/system/health",
        "/system/node",
        "/control/lockdown/disable",
        "/control/lockdown/state",
        "/control/audit",
        "/control/pending-actions",
    }

    if path in allow_paths and method in {"GET", "POST"}:
        return await call_next(request)

    if method in {"POST", "PUT", "PATCH", "DELETE"} or path.startswith("/platform") or path.startswith("/system"):
        return JSONResponse(status_code=423, content={"error": "System in lockdown"})

    return await call_next(request)


@app.middleware("http")
async def observability_guard(request: Request, call_next):
    started = time.perf_counter()
    method = request.method.upper()
    path = request.url.path
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception:
        status_code = 500
        logger.exception("request_failed")
        raise
    finally:
        duration = time.perf_counter() - started
        observe_request(method, path, status_code, duration)
        maybe_alert_on_error_rate(status_code)
        logger.info(
            "http_request",
            method=method,
            path=path,
            status=status_code,
            duration_ms=round(duration * 1000, 2),
        )


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/healthz")
def healthz() -> Dict[str, Any]:
    return {
        "status": "ok",
        "node": NODE_ID,
        "locked": is_locked(),
    }


@app.get("/metrics")
def metrics() -> Response:
    payload, content_type = prometheus_payload()
    return Response(content=payload, media_type=content_type)


@app.get("/metrics/json")
def metrics_json() -> Dict[str, Any]:
    return {"metrics": get_metrics()}


@app.get("/system/node")
def node_info() -> Dict[str, str]:
    return {
        "node_id": NODE_ID,
    }


@app.get("/system/health")
def system_health() -> Dict[str, str]:
    return {
        "status": "healthy",
        "node": NODE_ID,
    }


@app.post("/memory/store")
def store(data: StoreMemoryRequest) -> Dict[str, str]:
    try:
        memory_id = store_memory(data.text, data.metadata)
        return {"status": "stored", "id": memory_id}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/memory/query")
def query(data: QueryMemoryRequest) -> Dict[str, Any]:
    try:
        return query_memory(data.query, n_results=data.n_results)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/feedback/learn")
def feedback_learn(data: FeedbackRequest) -> Dict[str, Any]:
    record = f"INPUT: {data.input}\nRESPONSE: {data.response}\nRATING: {data.rating}"
    metadata = {"type": "feedback", "rating": data.rating}

    try:
        memory_id = store_memory(record, metadata)
        learning_action = learn_from_feedback(data.model_dump())
        strategy = brain_commander.learning.process(data.model_dump())
        return {
            "status": "learned",
            "id": memory_id,
            "learning": learning_action,
            "strategy": strategy,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/feedback")
def feedback(data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        result = learn_from_feedback(data)
        strategy = brain_commander.learning.process(data)

        return {
            "learning": result,
            "strategy": strategy,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/brain/process")
def process(
    data: BrainRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default="system"),
    x_operator_id: str | None = Header(default="system"),
) -> Dict[str, Any]:
    # Unit-test mode: avoid expensive commander/model execution.
    if os.getenv("CYRUS_TESTING", "").strip().lower() in {"1", "true", "yes", "on"}:
        return {"type": "multi-agent", "result": {"status": "ok"}, "operator_role": (x_operator_role or "system")}

    try:
        operator = _get_operator_context(
            x_operator_assertion,
            x_operator_role,
            x_operator_id,
            assertion_method="POST",
            assertion_scope="/brain/process",
        )
        return process_input(data.input, operator_role=operator["operator_role"], operator_id=operator["operator_id"])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/cognitive/process")
def cognitive_process(
    data: BrainRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default="system"),
    x_operator_id: str | None = Header(default="system"),
) -> Dict[str, Any]:
    try:
        operator = _get_operator_context(
            x_operator_assertion,
            x_operator_role,
            x_operator_id,
            assertion_method="POST",
            assertion_scope="/cognitive/process",
        )
        return process_input(data.input, operator_role=operator["operator_role"], operator_id=operator["operator_id"])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/system/performance")
def system_performance() -> Dict[str, Any]:
    metrics = get_metrics()
    return {
        "metrics": metrics,
        "optimization": improve_system(metrics),
        "agent_stats": brain_commander.get_agent_stats(),
        "benchmark_history": get_benchmark_history(),
    }


@app.get("/system/benchmark")
def system_benchmark() -> Dict[str, Any]:
    try:
        return run_benchmark(brain_commander)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/platform/ingest")
def platform_ingest(data: EventRequest, x_platform_key: str | None = Header(default=None)) -> Dict[str, Any]:
    _enforce_platform_api_key(x_platform_key)
    accepted = ingest_event(data.event)
    if not accepted:
        raise HTTPException(status_code=429, detail="Event queue is full")

    return {
        "status": "accepted",
        "queue_size": queue_size(),
        "queue_utilization": queue_utilization(),
        "backpressured": is_backpressured(),
    }


@app.get("/platform/intelligence")
def platform_intelligence(
    query: str = "latest intelligence",
    x_platform_key: str | None = Header(default=None),
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default="system"),
    x_operator_id: str | None = Header(default="platform"),
) -> Dict[str, Any]:
    _enforce_platform_api_key(x_platform_key)
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        assertion_method="GET",
        assertion_scope="/platform/intelligence",
    )
    return process_input(query, operator_role=operator["operator_role"], operator_id=operator["operator_id"])


@app.post("/platform/action")
def platform_action(
    data: ActionRequest,
    x_platform_key: str | None = Header(default=None),
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default="admin"),
    x_operator_id: str | None = Header(default="platform"),
) -> Dict[str, Any]:
    _enforce_platform_api_key(x_platform_key)
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/platform/action",
    )
    _require_admin_role(operator["operator_role"])

    payload = dict(data.payload)
    if data.action_id:
        payload["action_id"] = data.action_id
    payload["operator_role"] = operator["operator_role"]
    payload["operator_id"] = operator["operator_id"]

    result = execute_action(data.action, payload)
    log_audit(
        {
            "event_type": "platform_action",
            "operator_role": payload.get("operator_role"),
            "operator_id": payload.get("operator_id"),
            "input": {"action": data.action, "payload": payload},
            "output": result,
            "evaluation": {"overall": 1.0 if result.get("status") in {"executed", "pending"} else 0.0},
        }
    )
    return {
        "status": "ok",
        "action": data.action,
        "result": result,
    }


@app.get("/system/state")
def system_state() -> Dict[str, Any]:
    pending_actions = list_pending_actions()
    return {
        "status": "active",
        "node_id": NODE_ID,
        "events_queue": queue_size(),
        "events_capacity": queue_capacity(),
        "queue_utilization": queue_utilization(),
        "backpressured": is_backpressured(),
        "dead_letter_count": dead_letter_count(),
        "training_examples": count_training_examples(),
        "active_model": get_active_model(),
        "latest_model": get_latest_model(),
        "model_safeguard": get_promotion_safeguard_state(),
        "lockdown": get_lockdown_state(),
        "pending_action_count": len(pending_actions),
        "active_missions": list_active_missions(),
        "embodiment": {
            "running": core_loop.status().get("running", False),
            "mission_active": mission_engine.status().get("active", False),
            "simulation_mode": drone_controller.state.get("simulation_mode", True),
        },
        "orchestrator": orchestrator.status(),
    }


@app.get("/system/orchestrator/status")
def orchestrator_status() -> Dict[str, Any]:
    return success(orchestrator.status())


@app.post("/system/orchestrator/start")
def orchestrator_start(
    data: OrchestratorControlRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/system/orchestrator/start",
    )
    _require_admin_role(operator["operator_role"])
    result = orchestrator.start()
    log_audit(
        {
            "event_type": "orchestrator_start",
            "operator_id": operator["operator_id"],
            "input": {"reason": data.reason},
            "output": result,
            "evaluation": {"overall": 1.0},
        }
    )
    return success(result)


@app.post("/system/orchestrator/stop")
def orchestrator_stop(
    data: OrchestratorControlRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/system/orchestrator/stop",
    )
    _require_admin_role(operator["operator_role"])
    result = orchestrator.shutdown()
    log_audit(
        {
            "event_type": "orchestrator_stop",
            "operator_id": operator["operator_id"],
            "input": {"reason": data.reason},
            "output": result,
            "evaluation": {"overall": 1.0},
        }
    )
    return success(result)


@app.post("/system/orchestrator/restart")
def orchestrator_restart(
    data: OrchestratorControlRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/system/orchestrator/restart",
    )
    _require_admin_role(operator["operator_role"])
    result = orchestrator.restart()
    log_audit(
        {
            "event_type": "orchestrator_restart",
            "operator_id": operator["operator_id"],
            "input": {"reason": data.reason},
            "output": result,
            "evaluation": {"overall": 1.0},
        }
    )
    return success(result)


@app.get("/system/models/latest")
def latest_model() -> Dict[str, Any]:
    return {
        "active_model": get_active_model(),
        "active_model_path": get_active_model_path(),
        "latest_model": get_latest_model(),
        "latest_model_path": get_latest_model_path(),
        "model_mode": os.getenv("CYRUS_MODEL_MODE", "hybrid"),
    }


@app.post("/system/train")
def trigger_training(
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default=None),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/system/train",
    )
    _require_admin_role(operator["operator_role"])
    try:
        return train_model()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/system/model/safeguard")
def model_safeguard_state() -> Dict[str, Any]:
    return get_promotion_safeguard_state()


@app.post("/system/model/safeguard/evaluate")
def model_safeguard_evaluate() -> Dict[str, Any]:
    return evaluate_promotion_safeguard()


@app.get("/control/audit")
def get_audit(limit: int = 100) -> Dict[str, Any]:
    safe_limit = min(max(limit, 1), 1000)
    return {"logs": load_recent_audit_logs(limit=safe_limit)}


@app.get("/control/audit/verify")
def verify_audit() -> Dict[str, Any]:
    return verify_audit_chain()


@app.get("/control/pending-actions")
def pending_actions() -> Dict[str, Dict[str, Any]]:
    return list_pending_actions()


@app.post("/control/pending-actions/{action_id}/approve")
def approve_pending_action(
    action_id: str,
    data: ApprovalDecisionRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default=None),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/control/pending-actions/approve",
    )
    _require_admin_role(operator["operator_role"])
    approved = approve_action(action_id, approver=data.approver)
    if not approved:
        raise HTTPException(status_code=404, detail="action_not_found")
    log_audit(
        {
            "event_type": "approval",
            "input": {"action_id": action_id},
            "output": approved,
            "evaluation": {"overall": 1.0},
        }
    )
    return {"status": "approved", "action": approved}


@app.post("/control/pending-actions/{action_id}/reject")
def reject_pending_action(
    action_id: str,
    data: ApprovalDecisionRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default=None),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/control/pending-actions/reject",
    )
    _require_admin_role(operator["operator_role"])
    rejected = reject_action(action_id, approver=data.approver, reason=data.reason)
    if not rejected:
        raise HTTPException(status_code=404, detail="action_not_found")
    log_audit(
        {
            "event_type": "approval",
            "input": {"action_id": action_id},
            "output": rejected,
            "evaluation": {"overall": 1.0},
        }
    )
    return {"status": "rejected", "action": rejected}


@app.post("/control/missions/start")
def start_control_mission(
    data: MissionStartRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/control/missions/start",
    )
    _require_admin_role(operator["operator_role"])
    mission_id = data.mission_id or f"mission-{int(time.time() * 1000)}"
    mission = start_mission(mission_id, data.objective, metadata=data.metadata, initiated_by=operator["operator_id"])
    return {"status": "started", "mission": mission}


@app.post("/control/missions/{mission_id}/stop")
def stop_control_mission(
    mission_id: str,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/control/missions/stop",
    )
    _require_admin_role(operator["operator_role"])
    mission = stop_mission(mission_id, stopped_by=operator["operator_id"])
    if not mission:
        raise HTTPException(status_code=404, detail="mission_not_found")
    return {"status": "stopped", "mission": mission}


@app.get("/control/missions")
def control_missions() -> Dict[str, Dict[str, Any]]:
    return list_active_missions()


@app.get("/control/lockdown/state")
def lockdown_state() -> Dict[str, Any]:
    return get_lockdown_state()


@app.get("/control/backup")
def control_backup_list(
    limit: int = 20,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default=None),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="GET",
        assertion_scope="/control/backup/list",
    )
    _require_admin_role(operator["operator_role"])
    return {"backups": list_backups(limit=limit)}


@app.post("/control/backup/create")
def control_backup_create(
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default=None),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/control/backup/create",
    )
    _require_admin_role(operator["operator_role"])
    result = backup_data()
    log_audit(
        {
            "event_type": "backup_create",
            "operator_role": operator["operator_role"],
            "operator_id": operator["operator_id"],
            "output": result,
            "evaluation": {"overall": 1.0},
        }
    )
    return result


@app.post("/control/backup/restore")
def control_backup_restore(
    data: BackupRestoreRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default=None),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/control/backup/restore",
    )
    _require_admin_role(operator["operator_role"])
    result = restore_data(data.archive_name)
    if result.get("status") != "ok":
        raise HTTPException(status_code=404, detail=result.get("error", "restore_failed"))

    log_audit(
        {
            "event_type": "backup_restore",
            "operator_role": operator["operator_role"],
            "operator_id": operator["operator_id"],
            "input": {"archive_name": data.archive_name},
            "output": result,
            "evaluation": {"overall": 1.0},
        }
    )
    return result


@app.post("/control/lockdown/enable")
def lockdown_enable(
    data: LockdownRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default=None),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/control/lockdown/enable",
    )
    _require_admin_role(operator["operator_role"])
    return enable_lockdown(data.reason)


@app.post("/control/lockdown/disable")
def lockdown_disable(
    data: LockdownRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default=None),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/control/lockdown/disable",
    )
    _require_admin_role(operator["operator_role"])
    return disable_lockdown(data.reason)


@app.get("/embodiment/status")
def embodiment_status() -> Dict[str, Any]:
    return core_loop.status()


@app.post("/embodiment/start")
def embodiment_start(
    data: EmbodimentStartRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/embodiment/start",
    )
    _require_admin_role(operator["operator_role"])
    return core_loop.start(tick_hz=data.tick_hz)


@app.post("/embodiment/stop")
def embodiment_stop(
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/embodiment/stop",
    )
    _require_admin_role(operator["operator_role"])
    return core_loop.stop()


@app.post("/embodiment/mission/start")
def embodiment_mission_start(
    data: EmbodiedMissionStartRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/embodiment/mission/start",
    )
    _require_admin_role(operator["operator_role"])
    return mission_engine.start_goal(operator=operator["operator_id"], goal=data.goal)


@app.post("/embodiment/mission/stop")
def embodiment_mission_stop(
    data: EmbodiedMissionStopRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/embodiment/mission/stop",
    )
    _require_admin_role(operator["operator_role"])
    return mission_engine.stop_goal(operator=operator["operator_id"], reason=data.reason)


@app.post("/embodiment/human/register")
def embodiment_human_register(
    data: HumanIdentityRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/embodiment/human/register",
    )
    _require_admin_role(operator["operator_role"])
    return human_interaction.register_identity(data.user_id, data.profile)


@app.post("/embodiment/human/process")
def embodiment_human_process(
    data: HumanVoiceRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default=None),
) -> Dict[str, Any]:
    _ = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/embodiment/human/process",
    )
    return human_interaction.process_voice_text(data.user_id, data.text)


@app.post("/embodiment/drone/arm")
def embodiment_drone_arm(
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/embodiment/drone/arm",
    )
    _require_admin_role(operator["operator_role"])
    return drone_controller.arm()


@app.post("/embodiment/drone/disarm")
def embodiment_drone_disarm(
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/embodiment/drone/disarm",
    )
    _require_admin_role(operator["operator_role"])
    return drone_controller.disarm()


@app.post("/embodiment/drone/takeoff")
def embodiment_drone_takeoff(
    data: DroneTakeoffRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/embodiment/drone/takeoff",
    )
    _require_admin_role(operator["operator_role"])
    return drone_controller.takeoff(data.altitude)


@app.post("/embodiment/drone/goto")
def embodiment_drone_goto(
    data: DroneGotoRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/embodiment/drone/goto",
    )
    _require_admin_role(operator["operator_role"])
    return drone_controller.goto(data.lat, data.lon, data.alt)


@app.post("/embodiment/drone/land")
def embodiment_drone_land(
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/embodiment/drone/land",
    )
    _require_admin_role(operator["operator_role"])
    return drone_controller.land()


@app.get("/swarm/status")
def swarm_status() -> Dict[str, Any]:
    return swarm_runtime.status()


@app.get("/swarm/map")
def swarm_map() -> Dict[str, Any]:
    return swarm_runtime.nxi_map.snapshot()


@app.post("/swarm/drones/register")
def swarm_register_drone(
    data: SwarmRegisterDroneRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/swarm/drones/register",
    )
    _require_admin_role(operator["operator_role"])
    return swarm_runtime.register_drone(data.drone_id, None)


@app.post("/swarm/drones/position")
def swarm_update_position(
    data: SwarmUpdatePositionRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/swarm/drones/position",
    )
    _require_admin_role(operator["operator_role"])
    return swarm_runtime.controller.update_position(data.drone_id, data.lat, data.lon)


@app.post("/swarm/tasks/assign")
def swarm_assign_task(
    data: SwarmTaskRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/swarm/tasks/assign",
    )
    _require_admin_role(operator["operator_role"])
    return swarm_runtime.controller.assign_task(data.task)


@app.post("/swarm/formation")
def swarm_set_formation(
    data: SwarmFormationRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/swarm/formation",
    )
    _require_admin_role(operator["operator_role"])
    return swarm_runtime.controller.set_formation(data.pattern, data.anchor_lat, data.anchor_lon, data.spacing_m)


@app.post("/swarm/pursuit")
def swarm_plan_pursuit(
    data: SwarmPursuitRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/swarm/pursuit",
    )
    _require_admin_role(operator["operator_role"])
    state = swarm_runtime.nxi_map.get_state()
    targets = state.get("targets", {}) if isinstance(state, dict) else {}
    if not isinstance(targets, dict) or not targets:
        return {"status": "idle", "reason": "no_targets"}

    first_target_id = next(iter(targets.keys()))
    first_target = targets[first_target_id]
    position = first_target.get("position", [0.0, 0.0]) if isinstance(first_target, dict) else [0.0, 0.0]
    if not isinstance(position, list) or len(position) < 2:
        return {"status": "idle", "reason": "invalid_target_position"}

    result = None
    for _ in range(data.max_pursuers):
        result = swarm_runtime.coordinator.handle_detection(
            str(first_target_id),
            (float(position[0]), float(position[1])),
        )
    return result or {"status": "idle", "reason": "no_assignment"}


@app.post("/swarm/track")
def swarm_track_target(
    data: SwarmTrackRequest,
    x_operator_assertion: str | None = Header(default=None),
    x_operator_role: str | None = Header(default=None),
    x_operator_id: str | None = Header(default="admin"),
) -> Dict[str, Any]:
    operator = _get_operator_context(
        x_operator_assertion,
        x_operator_role,
        x_operator_id,
        require_assertion=True,
        assertion_method="POST",
        assertion_scope="/swarm/track",
    )
    _require_admin_role(operator["operator_role"])

    result = process_swarm_event(
        {
            "type": "target_detected",
            "id": data.target_id,
            "position": [float(data.position[0]), float(data.position[1])],
        },
        swarm_runtime.coordinator,
    )
    assigned = result.get("assigned") if isinstance(result, dict) else None
    assigned_drone = None
    if isinstance(assigned, dict):
        task = assigned.get("task")
        if isinstance(task, dict):
            assigned_drone = task.get("assigned_drone")

    return {
        "status": "ok",
        "assigned_drone": assigned_drone,
        "result": result,
    }


if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=int(os.getenv("CYRUS_AI_PORT", "8001")),
    )
