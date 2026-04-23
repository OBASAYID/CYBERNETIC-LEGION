import os

REQUIRED = [
    "CYRUS_NODE_ID",
    "CYRUS_MODEL_MODE",
]


def enforce_required_env() -> None:
    enforce = os.getenv("CYRUS_ENFORCE_REQUIRED_ENV", "").strip().lower() in {"1", "true", "yes", "on"}
    if not enforce and os.getenv("NODE_ENV", "").strip().lower() != "production":
        return

    missing = [var for var in REQUIRED if not os.getenv(var)]
    if missing:
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")
