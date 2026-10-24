#!/usr/bin/env bash
# Regenerates the README media from the real app on public-domain books:
# docs/media/tour.webp and docs/media/screen-*.png. See tools/tour/README.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOUR="$ROOT/tools/tour"
MEDIA="$ROOT/docs/media"

# The images of compose.yaml under a project of their own: a throwaway database, the app on 8100.
COMPOSE=(docker compose -p book-reader-tour -f "$ROOT/compose.yaml" -f "$TOUR/compose.tour.yaml")

# The images run with backend/.env when it exists, so the tour signs in with its key, as `make e2e` does.
KEY="$(grep -m1 '^ADMIN_API_KEY=' "$ROOT/backend/.env" 2>/dev/null | cut -d= -f2- || true)"
export TOUR_ADMIN_KEY="${KEY:-book-reader-demo-admin-key-0123456789}"

WORK="$(mktemp -d)"

# Stops the stack and drops its database whatever happened; keeps the logs of a failed run.
cleanup() {
  local status=$?
  "${COMPOSE[@]}" logs >"$WORK/compose.log" 2>&1 || true
  "${COMPOSE[@]}" down --volumes >/dev/null 2>&1 || true
  if [ "$status" -eq 0 ]; then rm -rf "$WORK"; else echo "Logs kept in $WORK" >&2; fi
}
trap cleanup EXIT

python3 -I -c 'from PIL import features; assert features.check("webp")' ||
  { echo 'Python 3 with Pillow (WebP support) is needed.' >&2; exit 1; }

echo '>> Images'
"${COMPOSE[@]}" up --build --detach --wait >"$WORK/build.log" 2>&1

echo '>> Books'
# seed.mjs imports the e2e EPUB builder, TypeScript run as is: Node's notice about it is noise here.
node --no-warnings "$TOUR/seed.mjs"

echo '>> Tour'
node "$TOUR/record.mjs" "$WORK/record"
python3 -I "$TOUR/encode_tour.py" "$WORK/record" "$MEDIA/tour.webp"

echo '>> Screens'
# The tour left the text at its largest tier: back to the default one.
node --no-warnings "$TOUR/seed.mjs"
node "$TOUR/shots.mjs" "$WORK/shots"
python3 -I "$TOUR/frame_screens.py" "$WORK/shots" "$MEDIA"
