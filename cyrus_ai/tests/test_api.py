from fastapi.testclient import TestClient

from cyrus_ai.app import app


client = TestClient(app)


def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_chat_endpoint_contract():
    payload = {"message": "execute status check", "source": "api"}
    resp = client.post("/chat", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert "response" in body
    assert "mode" in body
    assert "confidence" in body
