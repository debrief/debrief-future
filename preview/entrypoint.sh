#!/bin/bash
# Preview environment entrypoint
# Starts code-server bound to $PORT (required by Heroku) with the preview workspace.

set -e

PORT="${PORT:-8080}"

echo "=== Debrief Preview Environment ==="
echo "Starting code-server on port ${PORT}"

# Diagnostic: verify extension is installed
echo "--- Installed extensions ---"
code-server --list-extensions 2>&1 || true
echo "--- Extensions directory ---"
ls -la ~/.local/share/code-server/extensions/ 2>/dev/null || \
  ls -la ~/.config/code-server/extensions/ 2>/dev/null || \
  echo "WARN: extensions directory not found"
echo "==================================="

exec code-server \
  --auth none \
  --bind-addr "0.0.0.0:${PORT}" \
  --disable-telemetry \
  /workspace/preview/debrief-preview.code-workspace
