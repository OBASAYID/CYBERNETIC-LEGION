import unittest

from fastapi.testclient import TestClient

from api import app
from benchmarks.history import reset_benchmark_history
from metrics.tracker import log_metric
from metrics.tracker import reset_metrics


class SystemContractsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        reset_metrics()
        reset_benchmark_history()

    def test_system_performance_contract(self):
        log_metric({
            "input": "contract probe",
            "latency": 123.4,
            "confidence": 0.8,
            "score": 0.8,
            "status": "ok",
        })

        response = self.client.get("/system/performance")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertIn("metrics", payload)
        self.assertIn("optimization", payload)
        self.assertIn("agent_stats", payload)
        self.assertIsInstance(payload["metrics"], list)
        self.assertIsInstance(payload["optimization"], dict)
        self.assertIsInstance(payload["agent_stats"], dict)

    def test_system_benchmark_contract(self):
        response = self.client.get("/system/benchmark")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertIn("results", payload)
        self.assertIn("summary", payload)
        self.assertIn("history", payload)
        self.assertEqual(payload["summary"]["count"], 3)
        self.assertIsInstance(payload["history"], list)

    def test_platform_ingestion_and_state_contract(self):
        ingest_response = self.client.post("/platform/ingest", json={"event": {"source": "unittest", "value": 7}})
        self.assertEqual(ingest_response.status_code, 200)
        ingest_payload = ingest_response.json()
        self.assertEqual(ingest_payload.get("status"), "accepted")
        self.assertIn("queue_size", ingest_payload)
        self.assertIn("queue_utilization", ingest_payload)
        self.assertIn("backpressured", ingest_payload)

        state_response = self.client.get("/system/state")
        self.assertEqual(state_response.status_code, 200)
        state_payload = state_response.json()
        self.assertEqual(state_payload.get("status"), "active")
        self.assertIn("events_queue", state_payload)
        self.assertIn("events_capacity", state_payload)
        self.assertIn("queue_utilization", state_payload)
        self.assertIn("backpressured", state_payload)
        self.assertIn("dead_letter_count", state_payload)
        self.assertIsInstance(state_payload["dead_letter_count"], int)

    def test_platform_intelligence_contract(self):
        response = self.client.get("/platform/intelligence", params={"query": "Assess live signals"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get("type"), "multi-agent")
        self.assertIn("result", payload)


if __name__ == "__main__":
    unittest.main()
