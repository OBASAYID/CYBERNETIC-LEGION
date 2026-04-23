import os
import sys
from pathlib import Path

from loguru import logger


def configure_logging() -> None:
    log_level = os.getenv("CYRUS_LOG_LEVEL", "INFO").upper()
    log_dir = Path(os.getenv("CYRUS_LOG_DIR", "runtime-data/logs"))
    log_dir.mkdir(parents=True, exist_ok=True)

    logger.remove()
    logger.add(
        sys.stdout,
        level=log_level,
        enqueue=True,
        backtrace=False,
        diagnose=False,
        serialize=True,
    )
    logger.add(
        log_dir / "cyrus.log",
        level=log_level,
        rotation="10 MB",
        retention="14 days",
        enqueue=True,
        backtrace=False,
        diagnose=False,
        serialize=True,
    )
