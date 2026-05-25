#!/usr/bin/env bash
# Ensure news-trend-feed.tsx NewsItem includes optional color (GitHub main / Replit UI).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILE="${1:-$ROOT/cyrus-ui/src/components/dashboard-fresh/news-trend-feed.tsx}"

if [[ ! -f "$FILE" ]]; then
  echo "Skip: $FILE not found (fetch GitHub main first)."
  exit 0
fi

if grep -qE 'color\?\s*:\s*string' "$FILE"; then
  echo "OK: NewsItem.color already present in $FILE"
  exit 0
fi

python3 - "$FILE" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()

if re.search(r"color\?\s*:\s*string", text):
    sys.exit(0)

# Inline interface/type NewsItem — add color after category field.
pat = r"((?:export\s+)?(?:interface|type)\s+NewsItem\s*(?:=\s*)?\{[^}]*?category\s*:\s*[^;]+;)"
new_text, n = re.subn(pat, r"\1\n  color?: string;", text, count=1, flags=re.DOTALL)
if n:
    open(path, "w", encoding="utf-8").write(new_text)
    print(f"Patched inline NewsItem in {path}")
    sys.exit(0)

# Use shared type from ./types when file references NewsItem but defines no color field.
if "NewsItem" in text and './types' not in text and '@/components/dashboard-fresh/types' not in text:
    text = re.sub(
        r'^import ',
        'import type { NewsItem } from "./types";\nimport ',
        text,
        count=1,
        flags=re.MULTILINE,
    )
    text = re.sub(
        r"(?ms)^(?:export\s+)?(?:interface|type)\s+NewsItem\s*(?:=\s*)?\{.*?\}\n?",
        "",
        text,
        count=1,
    )
    open(path, "w", encoding="utf-8").write(text)
    print(f"Rewired {path} to import NewsItem from ./types")
    sys.exit(0)

print(f"Could not auto-patch {path} — add `color?: string` to NewsItem manually.", file=sys.stderr)
sys.exit(1)
PY
