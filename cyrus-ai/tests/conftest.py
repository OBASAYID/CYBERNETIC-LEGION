import os
import sys
from pathlib import Path

# Ensure test imports like `import api` / `from actions...` resolve correctly when
# running `pytest` from the repo root.
CYRUS_AI_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CYRUS_AI_ROOT))

# Prevent heavy background loops during unit tests.
os.environ.setdefault("CYRUS_TESTING", "true")
os.environ.setdefault("NODE_ENV", "test")
