#!/usr/bin/env bash
# Sync GitHub main (Replit/Railway merges, PR #66, UI commits) into main-push and push.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE="${CYRUS_GIT_REMOTE:-new-github}"
BRANCH="${CYRUS_SYNC_BRANCH:-main-push}"

echo "==> Fetching ${REMOTE} (main, ${BRANCH}, PR #66 head)…"
git fetch "$REMOTE" main "$BRANCH" 'refs/pull/66/head:refs/remotes/'"$REMOTE"'/pr-66-hINjQA' 2>/dev/null \
  || git fetch "$REMOTE" main "$BRANCH"

CURRENT="$(git branch --show-current)"
if [[ "$CURRENT" != "$BRANCH" ]]; then
  git checkout "$BRANCH"
fi

echo "==> Merging ${REMOTE}/main into ${BRANCH}…"
if git merge "${REMOTE}/main" -m "merge: sync GitHub main (PR #66, dashboard UI, PWA, auth-activity)"; then
  echo "Merge completed cleanly."
else
  echo "Merge conflicts — resolve, then: git add -A && git commit && $0 --push-only"
  exit 1
fi

echo "==> Patch news-trend-feed NewsItem.color (if present)…"
bash "$ROOT/scripts/fix-news-trend-feed-color.sh"

echo "==> Typecheck…"
npm run typecheck:all

if [[ "${1:-}" == "--push-only" ]] && git diff --cached --quiet && ! git diff --quiet; then
  echo "Nothing to merge; pushing existing commits…"
elif [[ "${1:-}" == "--push-only" ]]; then
  :
fi

echo "==> Pushing ${BRANCH} to ${REMOTE}…"
git push -u "$REMOTE" "$BRANCH"

echo "Done. ${BRANCH} is synced with ${REMOTE}/main and pushed."
