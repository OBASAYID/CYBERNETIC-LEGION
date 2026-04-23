import tarfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parents[1]
BACKUP_DIR = BASE_DIR / "runtime-data" / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

BACKUP_TARGETS = [
    BASE_DIR / "runtime-data" / "training_data.jsonl",
    BASE_DIR / "runtime-data" / "metrics.json",
    BASE_DIR / "runtime-data" / "audit_log.jsonl",
    BASE_DIR / "runtime-data" / "pending_actions.json",
    BASE_DIR / "runtime-data" / "approved_actions.json",
    BASE_DIR / "runtime-data" / "missions.json",
    BASE_DIR / "runtime-data" / "lockdown_state.json",
    BASE_DIR / "runtime-data" / "model-safeguard.json",
    BASE_DIR / "runtime-data" / "active_model.json",
]


def backup_data() -> Dict[str, Any]:
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    archive_path = BACKUP_DIR / f"cyrus-backup-{timestamp}.tar.gz"

    added: List[str] = []
    with tarfile.open(archive_path, mode="w:gz") as archive:
        for target in BACKUP_TARGETS:
            if target.exists() and target.is_file():
                archive.add(target, arcname=str(target.relative_to(BASE_DIR)))
                added.append(str(target.relative_to(BASE_DIR)))

    return {
        "status": "ok",
        "archive": str(archive_path.relative_to(BASE_DIR)),
        "files": added,
    }


def list_backups(limit: int = 20) -> List[Dict[str, Any]]:
    archives = sorted(BACKUP_DIR.glob("cyrus-backup-*.tar.gz"), reverse=True)[: max(limit, 1)]
    output: List[Dict[str, Any]] = []
    for archive in archives:
        stat = archive.stat()
        output.append(
            {
                "name": archive.name,
                "path": str(archive.relative_to(BASE_DIR)),
                "size": stat.st_size,
                "modified": datetime.utcfromtimestamp(stat.st_mtime).isoformat() + "Z",
            }
        )
    return output


def restore_data(archive_name: str) -> Dict[str, Any]:
    archive_path = BACKUP_DIR / archive_name
    if not archive_path.exists() or not archive_path.is_file():
        return {"status": "error", "error": "backup_not_found"}

    restored: List[str] = []
    with tarfile.open(archive_path, mode="r:gz") as archive:
        for member in archive.getmembers():
            if not member.isfile():
                continue
            archive.extract(member, path=BASE_DIR)
            restored.append(member.name)

    return {
        "status": "ok",
        "archive": str(archive_path.relative_to(BASE_DIR)),
        "restored": restored,
    }
