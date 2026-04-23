import importlib
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from actions.action_executor import execute_action
from control.approval import approve_action, list_pending_actions
from control.auth import create_operator_assertion, verify_operator_assertion


class SelfImprovementPlatformTest(unittest.TestCase):
    def test_operator_assertion_round_trip(self):
        with patch.dict(os.environ, {"CYRUS_CONTROL_TOKEN_SECRET": "unit-test-secret"}):
            token = create_operator_assertion(
                "operator-1",
                "admin",
                source="unit-test",
                ttl_seconds=60,
                issued_at=1_700_000_000,
                method="POST",
                scope="/control/lockdown/enable",
            )
            with patch("control.auth.time.time", return_value=1_700_000_010):
                claims = verify_operator_assertion(
                    token,
                    expected_method="POST",
                    expected_scope="/control/lockdown/enable",
                )

        self.assertEqual(claims["operator_id"], "operator-1")
        self.assertEqual(claims["operator_role"], "admin")
        self.assertEqual(claims["source"], "unit-test")
        self.assertEqual(claims["audience"], "POST:/control/lockdown/enable")

    def test_operator_assertion_scope_mismatch_rejected(self):
        with patch.dict(os.environ, {"CYRUS_CONTROL_TOKEN_SECRET": "unit-test-secret"}):
            token = create_operator_assertion(
                "operator-1",
                "admin",
                source="unit-test",
                ttl_seconds=60,
                issued_at=1_700_000_000,
                method="POST",
                scope="/platform/action",
            )
            with patch("control.auth.time.time", return_value=1_700_000_010):
                with self.assertRaises(ValueError) as exc:
                    verify_operator_assertion(
                        token,
                        expected_method="POST",
                        expected_scope="/system/train",
                    )

        self.assertEqual(str(exc.exception), "assertion_scope_mismatch")

    def test_signed_admin_endpoint_rejects_missing_assertion_when_secret_configured(self):
        from fastapi.testclient import TestClient

        with patch.dict(os.environ, {"CYRUS_CONTROL_TOKEN_SECRET": "unit-test-secret"}):
            from api import app

            client = TestClient(app)
            response = client.post("/control/lockdown/enable", json={"reason": "test"})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "missing_operator_assertion")

    def test_commander_execute_returns_explanation(self):
        from agents.commander import Commander

        commander = Commander()
        result = commander.execute("validate explanation")
        self.assertIn("explanation", result)
        self.assertIn("summary", result["explanation"])
        self.assertIn("factors", result["explanation"])

    def test_high_risk_action_requires_approval(self):
        action_result = execute_action(
            "webhook",
            {
                "url": "https://example.org/hook",
                "operator_role": "admin",
                "operator_id": "test-admin",
                "action_id": "approval-test-1",
            },
        )
        self.assertEqual(action_result["status"], "pending")
        self.assertEqual(action_result["action_id"], "approval-test-1")

        approved = approve_action("approval-test-1", approver="test-admin")
        self.assertIsNotNone(approved)

        execute_result = execute_action(
            "webhook",
            {
                "url": "https://example.org/hook",
                "operator_role": "admin",
                "operator_id": "test-admin",
                "action_id": "approval-test-1",
            },
        )
        self.assertEqual(execute_result["status"], "executed")

    def test_pending_actions_endpoint_contract(self):
        from fastapi.testclient import TestClient

        from api import app

        client = TestClient(app)
        _ = execute_action(
            "external_call",
            {
                "target": "https://example.org",
                "operator_role": "admin",
                "operator_id": "test-admin",
                "action_id": "approval-test-2",
            },
        )

        response = client.get("/control/pending-actions")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("approval-test-2", payload)

        self.assertIn("approval-test-2", list_pending_actions())

    def test_audit_endpoint_contract(self):
        from fastapi.testclient import TestClient

        from api import app

        client = TestClient(app)
        _ = client.post("/brain/process", json={"input": "audit me"})

        response = client.get("/control/audit")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("logs", payload)
        self.assertIsInstance(payload["logs"], list)

    def test_lockdown_blocks_sensitive_routes(self):
        from fastapi.testclient import TestClient

        from api import app

        client = TestClient(app)
        with patch.dict(os.environ, {"CYRUS_CONTROL_TOKEN_SECRET": "unit-test-secret"}):
            enable_token = create_operator_assertion(
                "admin-user",
                "admin",
                ttl_seconds=60,
                method="POST",
                scope="/control/lockdown/enable",
            )
            enable = client.post(
                "/control/lockdown/enable",
                json={"reason": "unit_test"},
                headers={"x-operator-assertion": enable_token},
            )
            self.assertEqual(enable.status_code, 200)
            self.assertTrue(enable.json()["locked"])

            replay = client.post(
                "/control/lockdown/disable",
                json={"reason": "replay_attempt"},
                headers={"x-operator-assertion": enable_token},
            )
            self.assertEqual(replay.status_code, 401)
            self.assertEqual(replay.json()["detail"], "assertion_scope_mismatch")

            blocked = client.post("/platform/ingest", json={"event": {"source": "test"}})
            self.assertEqual(blocked.status_code, 423)

            disable_token = create_operator_assertion(
                "admin-user",
                "admin",
                ttl_seconds=60,
                method="POST",
                scope="/control/lockdown/disable",
            )

            disable = client.post(
                "/control/lockdown/disable",
                json={"reason": "unit_test_complete"},
                headers={"x-operator-assertion": disable_token},
            )
            self.assertEqual(disable.status_code, 200)
            self.assertFalse(disable.json()["locked"])

    def test_reason_with_mode_local(self):
        from models import reasoning

        with patch.dict(os.environ, {"CYRUS_MODEL_MODE": "local"}), patch(
            "models.reasoning.local_infer", return_value="local-ok"
        ):
            result = reasoning.reason_with_mode("input", "ctx")
            self.assertEqual(result, "local-ok")

    def test_reason_with_mode_hybrid_fallback(self):
        from models import reasoning

        with patch("models.reasoning.local_infer", side_effect=RuntimeError("local down")), patch(
            "models.reasoning.reason", return_value="external-ok"
        ):
            result = reasoning.hybrid_reason("input", "ctx")
            self.assertEqual(result, "external-ok")

    def test_dataset_builder_logs_and_counts(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            dataset_path = os.path.join(tmp_dir, "training_data.jsonl")
            with patch.dict(os.environ, {"CYRUS_TRAINING_DATASET_FILE": dataset_path, "CYRUS_NODE_ID": "node-test"}):
                import training.dataset_builder as builder

                importlib.reload(builder)
                builder.log_training_example("input text", {"analysis": "result"})
                builder.log_training_example("input text 2", "output text")

                self.assertEqual(builder.count_training_examples(), 2)

                with open(dataset_path, "r", encoding="utf-8") as f:
                    lines = [line.strip() for line in f if line.strip()]

                first = json.loads(lines[0])
                self.assertEqual(first["input"], "input text")
                self.assertEqual(first["node_id"], "node-test")
                self.assertIn("output", first)

    def test_train_model_skips_when_dataset_missing(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            dataset_path = os.path.join(tmp_dir, "not-found.jsonl")
            with patch.dict(os.environ, {"CYRUS_TRAINING_DATASET_FILE": dataset_path}):
                import training.train as train_module

                importlib.reload(train_module)
                result = train_module.train_model()
                self.assertEqual(result["status"], "skipped")
                self.assertEqual(result["reason"], "dataset_missing")

    def test_train_model_skips_when_examples_insufficient(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            dataset_path = os.path.join(tmp_dir, "training_data.jsonl")
            with open(dataset_path, "w", encoding="utf-8") as f:
                f.write(json.dumps({"input": "a", "output": "b"}) + "\n")

            with patch.dict(
                os.environ,
                {"CYRUS_TRAINING_DATASET_FILE": dataset_path, "CYRUS_MIN_TRAINING_EXAMPLES": "5"},
            ):
                import training.train as train_module

                importlib.reload(train_module)
                result = train_module.train_model()
                self.assertEqual(result["status"], "skipped")
                self.assertEqual(result["reason"], "insufficient_examples")

    def test_autonomy_learning_signal(self):
        import autonomy

        with patch("autonomy.get_metrics", return_value=[{"score": 0.2, "status": "ok", "latency": 1000.0}]), patch(
            "autonomy.improve_system", return_value={"action": "optimize_quality"}
        ):
            self.assertTrue(autonomy.metrics_indicate_learning_needed())

        with patch("autonomy.get_metrics", return_value=[{"score": 0.9, "status": "ok", "latency": 100.0}]), patch(
            "autonomy.improve_system", return_value={"action": "stable"}
        ):
            self.assertFalse(autonomy.metrics_indicate_learning_needed())

    def test_versioning_active_model_pointer(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            with patch.dict(os.environ, {"CYRUS_MODEL_OUTPUT_DIR": tmp_dir}):
                import models.versioning as versioning

                importlib.reload(versioning)

                model_dir = Path(tmp_dir) / "model-1"
                model_dir.mkdir(parents=True, exist_ok=True)
                (model_dir / "config.json").write_text("{}", encoding="utf-8")

                record = versioning.set_active_model(str(model_dir), metadata={"source": "test"})

                self.assertIn("path", record)
                self.assertEqual(versioning.get_active_model_path(), str(model_dir.resolve()))
                self.assertEqual(versioning.get_active_model(), "model-1")

    def test_latest_model_endpoint_includes_active_fields(self):
        from fastapi.testclient import TestClient

        from api import app

        client = TestClient(app)
        response = client.get("/system/models/latest")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("active_model", payload)
        self.assertIn("active_model_path", payload)
        self.assertIn("latest_model", payload)
        self.assertIn("latest_model_path", payload)

    def test_model_safeguard_endpoints_exist(self):
        from fastapi.testclient import TestClient

        from api import app

        client = TestClient(app)

        state_response = client.get("/system/model/safeguard")
        self.assertEqual(state_response.status_code, 200)
        self.assertIsInstance(state_response.json(), dict)

        eval_response = client.post("/system/model/safeguard/evaluate")
        self.assertEqual(eval_response.status_code, 200)
        payload = eval_response.json()
        self.assertIn("status", payload)
        self.assertIn("rolled_back", payload)

    def test_safeguard_rollback_on_degradation(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            safeguard_file = os.path.join(tmp_dir, "model-safeguard.json")
            model_root = os.path.join(tmp_dir, "model_output")
            os.makedirs(model_root, exist_ok=True)

            old_model = Path(model_root) / "model-old"
            new_model = Path(model_root) / "model-new"
            old_model.mkdir(parents=True, exist_ok=True)
            new_model.mkdir(parents=True, exist_ok=True)
            (old_model / "config.json").write_text("{}", encoding="utf-8")
            (new_model / "config.json").write_text("{}", encoding="utf-8")

            with patch.dict(
                os.environ,
                {
                    "CYRUS_MODEL_SAFEGUARD_FILE": safeguard_file,
                    "CYRUS_MODEL_OUTPUT_DIR": model_root,
                    "CYRUS_MODEL_SAFEGUARD_WINDOW_SIZE": "3",
                    "CYRUS_MODEL_SAFEGUARD_MIN_SCORE_RATIO": "0.95",
                    "CYRUS_MODEL_SAFEGUARD_MAX_LATENCY_RATIO": "1.05",
                    "CYRUS_MODEL_SAFEGUARD_MAX_FAILURE_DELTA": "0.01",
                },
            ):
                import training.safeguards as safeguards

                importlib.reload(safeguards)

                safeguards.register_promotion_safeguard(str(new_model), str(old_model))

                bad_metrics = [
                    {"timestamp": 10**10, "score": 0.1, "latency": 5000, "status": "failed"},
                    {"timestamp": 10**10 + 1, "score": 0.1, "latency": 4500, "status": "failed"},
                    {"timestamp": 10**10 + 2, "score": 0.1, "latency": 4200, "status": "failed"},
                ]

                with patch("training.safeguards.get_metrics", return_value=bad_metrics), patch(
                    "training.safeguards.reload_local_model", return_value=str(old_model)
                ):
                    result = safeguards.evaluate_promotion_safeguard()

                self.assertEqual(result["status"], "rolled_back")
                self.assertTrue(result["rolled_back"])


if __name__ == "__main__":
    unittest.main()
