import os
import time

import requests
from loguru import logger


def send_alert(message: str, severity: str = "critical") -> None:
    payload = {
        "service": "cyrus-intelligence-core",
        "severity": severity,
        "message": message,
        "timestamp": int(time.time()),
    }
    logger.warning("ALERT: {}", payload)

    webhook_url = os.getenv("CYRUS_ALERT_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return

    try:
        requests.post(webhook_url, json=payload, timeout=3)
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to deliver alert webhook: {}", exc)
