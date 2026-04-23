import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any, Dict


def _normalize_scope(scope: str) -> str:
    normalized = (scope or "").strip()
    if not normalized:
        raise ValueError("invalid_assertion_scope")
    if not normalized.startswith("/"):
        normalized = f"/{normalized}"
    return normalized


def _build_audience(method: str, scope: str) -> str:
    normalized_method = (method or "").strip().upper()
    if not normalized_method:
        raise ValueError("invalid_assertion_method")
    return f"{normalized_method}:{_normalize_scope(scope)}"


def _secret() -> str:
    return os.getenv("CYRUS_CONTROL_TOKEN_SECRET", "").strip()


def control_token_configured() -> bool:
    return bool(_secret())


def signed_control_required() -> bool:
    if os.getenv("CYRUS_ENFORCE_SIGNED_CONTROL", "").strip().lower() in {"1", "true", "yes", "on"}:
        return True
    return os.getenv("NODE_ENV", "").strip().lower() == "production"


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def create_operator_assertion(
    operator_id: str,
    role: str,
    source: str = "control-plane",
    ttl_seconds: int = 120,
    issued_at: int | None = None,
    method: str | None = None,
    scope: str | None = None,
    audience: str | None = None,
) -> str:
    secret = _secret()
    if not secret:
        raise ValueError("CYRUS_CONTROL_TOKEN_SECRET is not configured")

    now = int(issued_at or time.time())
    payload = {
        "sub": operator_id,
        "role": role,
        "source": source,
        "iat": now,
        "exp": now + max(ttl_seconds, 1),
    }
    if audience:
        payload["aud"] = audience.strip()
    elif method and scope:
        payload["aud"] = _build_audience(method, scope)

    payload_json = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    encoded_payload = _b64url_encode(payload_json)
    signature = hmac.new(secret.encode("utf-8"), encoded_payload.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{encoded_payload}.{signature}"


def verify_operator_assertion(
    token: str,
    max_clock_skew_seconds: int = 15,
    expected_method: str | None = None,
    expected_scope: str | None = None,
    expected_audience: str | None = None,
) -> Dict[str, Any]:
    secret = _secret()
    if not secret:
        raise ValueError("CYRUS_CONTROL_TOKEN_SECRET is not configured")

    if not token or "." not in token:
        raise ValueError("invalid_assertion_format")

    encoded_payload, signature = token.split(".", 1)
    expected_signature = hmac.new(secret.encode("utf-8"), encoded_payload.encode("ascii"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError("invalid_assertion_signature")

    payload = json.loads(_b64url_decode(encoded_payload).decode("utf-8"))
    now = int(time.time())
    issued_at = int(payload.get("iat", 0))
    expires_at = int(payload.get("exp", 0))

    if issued_at > now + max_clock_skew_seconds:
        raise ValueError("assertion_not_yet_valid")
    if expires_at < now - max_clock_skew_seconds:
        raise ValueError("assertion_expired")

    operator_id = str(payload.get("sub", "")).strip()
    role = str(payload.get("role", "")).strip().lower()
    if not operator_id or not role:
        raise ValueError("assertion_missing_claims")

    required_audience = expected_audience
    if not required_audience and expected_method and expected_scope:
        required_audience = _build_audience(expected_method, expected_scope)
    if required_audience:
        actual_audience = str(payload.get("aud", "")).strip()
        if actual_audience != required_audience:
            raise ValueError("assertion_scope_mismatch")

    return {
        "operator_id": operator_id,
        "operator_role": role,
        "source": str(payload.get("source", "control-plane")),
        "issued_at": issued_at,
        "expires_at": expires_at,
        "audience": str(payload.get("aud", "")).strip(),
    }
