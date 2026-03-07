#!/bin/bash
# Pre-push hook for Claude Code sessions.
# Intercepts `git push` commands and runs `task verify` first.
# If verify fails, the push is blocked (exit 2).

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Only intercept git push commands
if ! echo "$COMMAND" | grep -qE '^git\s+push'; then
  exit 0
fi

# Run full CI checks (lint + typecheck + test)
if task verify; then
  exit 0
else
  echo "task verify failed — push blocked. Fix the errors above before pushing." >&2
  exit 2
fi
