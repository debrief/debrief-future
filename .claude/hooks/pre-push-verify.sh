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

# Resolve project root (where Taskfile.yml lives)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Prefer `task` if available, otherwise run the commands directly
if command -v task >/dev/null 2>&1; then
  if ! task verify; then
    echo "task verify failed — push blocked. Fix the errors above before pushing." >&2
    exit 2
  fi
else
  echo "Running CI checks (task not found, using fallback commands)..." >&2

  # Step 1: Lint
  echo "==> Lint" >&2
  if ! (uv run ruff check . && pnpm lint); then
    echo "Lint failed — push blocked." >&2
    exit 2
  fi

  # Step 2: Typecheck
  echo "==> Typecheck" >&2
  if ! (uv run pyright && pnpm -r typecheck); then
    echo "Typecheck failed — push blocked." >&2
    exit 2
  fi

  # Step 3: Tests
  echo "==> Test" >&2
  if ! (uv run pytest && pnpm test); then
    echo "Tests failed — push blocked." >&2
    exit 2
  fi
fi

exit 0
