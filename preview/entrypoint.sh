#!/bin/bash
# Preview environment entrypoint
# Starts code-server bound to $PORT (required by Heroku) with the preview workspace.

set -e

PORT="${PORT:-8080}"

echo "=== Debrief Preview Environment ==="
echo "Starting code-server on port ${PORT}"
echo "--- Extensions ---"
ls ~/.local/share/code-server/extensions/ 2>/dev/null || echo "No extensions found"
echo "==================================="

exec code-server \
  --auth none \
  --bind-addr "0.0.0.0:${PORT}" \
  --disable-telemetry \
  /workspace/preview/debrief-preview.code-workspace
