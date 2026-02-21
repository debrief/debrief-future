#!/bin/bash
# Preview environment entrypoint
# Starts code-server bound to $PORT (required by Heroku) with the preview workspace.
#
# Extension installation happens HERE at runtime, not during Docker build.
# code-server's --install-extension at build time writes to extensions.json,
# but this manifest can be lost at runtime (known issue: coder/code-server#7326).
# Installing at container startup guarantees code-server discovers the extension.

set -e

PORT="${PORT:-8080}"

echo "=== Debrief Preview Environment ==="
echo "Starting code-server on port ${PORT}"

# Install extension at runtime to ensure extensions.json is fresh
echo "--- Installing extension ---"
if [ -f /opt/debrief.vsix ]; then
  code-server --install-extension /opt/debrief.vsix --force 2>&1
  echo "Extension install exit code: $?"
else
  echo "WARNING: /opt/debrief.vsix not found!"
fi

echo "--- Installed extensions ---"
code-server --list-extensions --show-versions 2>&1 || echo "Failed to list extensions"
echo "--- Extension files ---"
ls -la ~/.local/share/code-server/extensions/ 2>&1 || echo "No extensions directory"
ls ~/.local/share/code-server/extensions/*/dist/extension.js 2>&1 || echo "No extension.js found"
echo "--- Workspace ---"
cat /workspace/preview/debrief-preview.code-workspace 2>/dev/null || echo "No workspace file"
echo "==================================="

exec code-server \
  --auth none \
  --bind-addr "0.0.0.0:${PORT}" \
  --disable-telemetry \
  --log trace \
  /workspace/preview/debrief-preview.code-workspace
