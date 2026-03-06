// Contract: CI Pipeline Type Checking
// File: Taskfile.yml addition + ci.yml modification
//
// This contract defines the CI pipeline changes for type checking enforcement.

/**
 * New Taskfile.yml task:
 *
 * typecheck:
 *   desc: Run type checking across all languages
 *   cmds:
 *     - pnpm -r typecheck          # TypeScript: tsc --noEmit per-package
 *     - uv run pyright             # Python: pyright with pyrightconfig.json
 *
 * The ci.yml workflow adds this step between lint and test:
 *
 *   - name: Type check
 *     run: task typecheck
 */

/**
 * CI Pipeline Order:
 *
 * 1. task install     — uv sync && pnpm install
 * 2. task lint        — ruff check + pnpm -r lint (ESLint)
 * 3. task typecheck   — pnpm -r typecheck + uv run pyright  [NEW]
 * 4. task test        — pnpm -r test + uv run pytest
 */

/**
 * Per-package typecheck scripts required:
 *
 * Already exist:
 * - @debrief/components: "typecheck": "tsc --noEmit"
 * - @debrief/session-state: "typecheck": "tsc --noEmit"
 * - @debrief/utils: "typecheck": "tsc --noEmit"
 * - @debrief/config: "typecheck": "tsc --noEmit"
 * - @debrief/schemas: "typecheck": "tsc --noEmit"
 * - debrief-loader: "typecheck": "tsc --noEmit"
 *
 * Need to add:
 * - @debrief/web-shell: "typecheck": "tsc --noEmit"
 *
 * Already handled separately:
 * - apps/vscode: typecheck runs via vscode-extension.yml
 */
