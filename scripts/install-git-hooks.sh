#!/bin/sh
# Links the versioned hooks into .git/hooks, leaving any other local hook (graphify's) untouched.
# Run by `npm install` in frontend/; a no-op outside a git checkout (Docker build).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS="$(git -C "$ROOT" rev-parse --git-path hooks 2>/dev/null)" || exit 0

case "$HOOKS" in
  /*) ;;
  *) HOOKS="$ROOT/$HOOKS" ;;
esac

for hook in "$ROOT"/scripts/git-hooks/*; do
  ln -sf "$hook" "$HOOKS/$(basename "$hook")"
done
