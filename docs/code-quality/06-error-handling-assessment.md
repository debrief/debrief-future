# Error-Handling Assessment — try/catch & try/except Audit

**Date:** 2026-04-17
**Branch:** `worktree-agent-ada1f347`

## Scope

Monorepo-wide audit of `try { ... } catch` (TypeScript/TSX) and `try: ... except`
(Python) blocks, flagging defensive patterns that wrap internal code or hide
real errors. Per CLAUDE.md conventions: trust internal code, only validate at
system boundaries.

## Totals

| Language | try blocks | except clauses | Files |
|----------|-----------:|---------------:|------:|
| TypeScript/TSX | ~197 | ~240 | 80 |
| Python         | ~102 | ~150 | 43 |

## Categories

### Kept — Legitimate Boundaries

The vast majority of try/catch in this codebase sit at legitimate boundaries
and should stay. Examples:

| Location | Kind |
|----------|------|
| `services/*/cli.py`, `services/*/mcp/server.py` | CLI/MCP JSON-RPC envelopes — transform any exception into a structured error response. Boundary contract. |
| `services/io/src/debrief_io/handlers/annotations/builders.py` | Parser boundary — rewraps `ValueError` from `float()`/`int()` into `AnnotationParseError` with `line_number`, `filename`, `code`. Error enrichment with user-visible context. |
| `services/calc/debrief_calc/executor.py` | Adds tool-scope context (`ExecutionError(tool.name, e)`), re-raises. Provenance boundary. |
| `services/session-state/src/server/tools/*.ts` | MCP tool entry points — external caller. Structured `{success, error}` response is the contract, not internal code flow. |
| `apps/vscode/src/webview/mapPanel.ts`, `apps/vscode/src/views/*View.ts` | Webview message handler boundaries — untrusted JSON from webview, errors surfaced to user via `postMessage`. |
| `apps/loader/src/main/ipc/*.ts` | Electron IPC handlers — same boundary pattern as webview. |
| `shared/components/src/PanelWorkspace/layoutPersistence.ts`, `shared/components/src/FilterBar/savedFiltersStorage.ts`, `shared/components/src/StacBrowser/StacBrowser.tsx` (localStorage helpers) | localStorage can legitimately throw (quota, private mode). Fallback is documented. |
| `shared/components/src/nl-cql2/parseResponse.ts` | LLM response parser — untrusted JSON. Structured `GenerationError` is the contract. |
| `apps/vscode/src/services/ioService.ts`, `apps/vscode/src/services/calcService.ts` | External process boundary (Python subprocess). Errors transformed into user-facing `RepParseError` / tool execution failure. |
| `services/session-state/src/log/branchService.ts` (write-failed wraps) | Persistence boundary — adds `code: 'WRITE_FAILED'`. |
| `shared/config-ts/src/storage.ts`, `shared/config-ts/src/validation.ts`, `services/config/src/debrief_config/storage.py` | Config file IO — lock timeouts, JSON decode errors. |
| `services/session-state/src/server/sse.ts` (client.write) | Network IO — SSE client may disconnect mid-write. |
| `apps/*/scripts/*.ts`, `apps/web-shell/scripts/generate-thumbnails.ts`, `apps/loader/scripts/capture-screenshots.ts` | Developer scripts interacting with Playwright/Chromium — best-effort cleanup. |
| `apps/vscode/src/views/activityPanelView.ts` (`revealInExplorer` / `revealFileInOS`) | VS Code command name varies by environment (desktop vs. code-server). Falls through. |
| `tests/e2e/*.ts`, `services/**/tests/*.py`, tests generally | Test fixtures, process cleanup, expected-throw assertions. |

### Kept — Borderline (not touching)

| Location | Reason |
|----------|--------|
| `shared/components/src/LogPanel/utils.ts` (`formatTimestamp`), `apps/loader/src/renderer/components/PlotConfig/PlotCard.tsx` (`formatDate`), `shared/components/diff/src/diffFeatureCollections.ts`, `shared/utils/src/interval.ts`, `shared/components/src/FeatureList/flattenFeatures.ts` (`formatTime`), `shared/components/src/colour-engine/engine.ts` (`formatDateLabel`) | `new Date(bad).toLocaleXString()` returns `"Invalid Date"` rather than throwing — the try/catch is defensive against an impossible throw path. HOWEVER the current code returns the original string on "failure"; removing the catch would silently render `"Invalid Date"` to the user. Behaviour change, not pure simplification. Left untouched. |
| `shared/components/src/TimelineView/TimelineView.tsx`, `shared/components/src/colour-engine/engine.ts` (`dimension.resolve(item)` × 2), `shared/components/src/FilterBar/FilterBar.tsx` (`engine.filter`) | Wraps a user-provided callback / external filter-engine call. The callback could throw from untrusted downstream code. Fallback-to-null is documented UX. Boundary-ish. |
| `services/session-state/src/utils/selectionPath.ts` (`parsePath` try at line 258) | Redundant with earlier `validatePathStructure`, but defensive and cheap. |
| `services/stac/src/debrief_stac/features.py` (optional `debrief_schemas` import) | Intentional optional dependency for schema validation. Constitution XIV.4 explicitly blocks missing schema but this try is a runtime graceful-degradation hook. |
| All `except Exception as e` in Click CLI handlers (`services/cli/debrief_cli/*.py`) | CLI top-level — stringifies to `formatter.error(str(e), CODE)` + `sys.exit(N)`. Typical CLI idiom for structured error reporting. |

### Removed — Defensive / Silent / Over-broad

1. **`services/cli/debrief_cli/catalog.py:34` — `except Exception: pass`** (silent-swallow)
   — Narrowed to `(json.JSONDecodeError, OSError)`. Other exceptions will now
   propagate out of `_load_stores()` and surface through the outer
   `except Exception as e` handlers already present in each command, which
   report them via `formatter.error(str(e), "STORE_ERROR")` instead of
   silently returning empty dict. Real errors (permissions, corruption) reach
   the user instead of being swallowed.

2. **`tests/e2e/test-tabular-results.spec.ts` / `tests/e2e/test-preview-smoke.spec.ts`**
   Left — these try/catch dumps diagnostic screenshots on failure, which is
   material test UX.

No other removals were confidently safe. The broad survey confirmed the
codebase is well-disciplined: most try/catch sits at a documented boundary
(MCP tool, CLI envelope, webview handler, external process call, localStorage,
parser, file IO). Pure internal defensive patterns are rare.

## Verification

`task verify` run after the single narrowing change — lint, typecheck, unit
tests, Playwright E2E. All passed.
