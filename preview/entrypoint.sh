#!/bin/bash
# Preview environment entrypoint
# Installs the Debrief extension at runtime (coder/code-server#7326),
# seeds sample config, then starts code-server.

set -e

PORT="${PORT:-8080}"

# Install extension at runtime to ensure extensions.json is fresh
if [ -f /opt/debrief.vsix ]; then
  code-server --install-extension /opt/debrief.vsix --force 2>&1
else
  echo "WARNING: /opt/debrief.vsix not found!"
fi

# Pre-seed Debrief config with sample STAC store
DEBRIEF_CONFIG_DIR="${HOME}/.config/debrief"
DEBRIEF_CONFIG_FILE="${DEBRIEF_CONFIG_DIR}/config.json"
if [ ! -f "${DEBRIEF_CONFIG_FILE}" ]; then
  mkdir -p "${DEBRIEF_CONFIG_DIR}"
  cat > "${DEBRIEF_CONFIG_FILE}" <<'SEED'
{
  "stores": [
    {
      "id": "store-preview-sample",
      "path": "/workspace/preview/samples/local-store",
      "displayName": "Sample Maritime Data",
      "status": "available"
    }
  ],
  "preferences": {}
}
SEED
fi

exec code-server \
  --auth none \
  --bind-addr "0.0.0.0:${PORT}" \
  --disable-telemetry \
  /workspace/preview/debrief-preview.code-workspace
