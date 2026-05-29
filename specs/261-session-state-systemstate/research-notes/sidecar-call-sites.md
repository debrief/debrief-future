# T004 — sidecar surface inventory

Captured 2026-05-28. Surface to delete/repurpose in Phase 6.

## Package-level sidecar I/O (`services/session-state/src/persistence/`)

| Symbol | File | Disposition |
|---|---|---|
| `loadSession(session, path)` | `persistence/load.ts:57` | DELETE (file-I/O sidecar reader) |
| `parseSessionJson(json)` | `persistence/load.ts:343` | DELETE |
| `interface SessionFile` | `persistence/load.ts:46` | DELETE (local interface) |
| `saveSession(store, path)` | `persistence/save.ts:98` | DELETE |
| `extractPersistentState(store)` | `persistence/save.ts:68` | DELETE / repurpose to FC-extract |
| `serializeState(store)` | `persistence/save.ts:157` | DELETE |
| version-migration machinery | `persistence/load.ts` (hydrate fns) | DELETE / repurpose |
| `persistence/schema.ts` | — | DELETE if `SessionFile` machinery gone |
| `persistence/index.ts` re-exports | `persistence/index.ts:7–15` | PRUNE |

## `@debrief/session-state` barrel re-exports (T091)
- `src/index.ts:91–95` — re-exports `saveSession`, `serializeState`, `extractPersistentState`, `loadSession`, `parseSessionJson`. **Remove.**

## Host call sites (removed in Phase 4, before package deletion in Phase 6)
- `apps/vscode/src/commands/openPlot.ts:7` — imports `loadSession`.
- `apps/vscode/src/commands/openPlot.ts:72` — `deriveSessionPath(storePath, itemPath)`.
- `apps/vscode/src/commands/openPlot.ts:196–198` — `deriveSessionPath` + `loadSession(session, sessionPath)`.
- `apps/vscode/src/commands/saveSession.ts:15` — imports `saveSession`.
- `apps/vscode/src/commands/saveSession.ts:33` — `deriveSessionPath(plotUri, storePath)`.
- `apps/vscode/src/commands/saveSession.ts:139` — `savePath = deriveSessionPath(...)`.
- `apps/vscode/src/commands/saveSession.ts:163` — `await saveSession(session, savePath)`.

## NOT sidecar (string command id `debrief.saveSession` — leave untouched)
- `apps/vscode/src/extension.ts:860`, `apps/vscode/src/services/sessionManager.ts:351`,
  `apps/vscode/src/commands/index.ts:425`, `apps/vscode/src/services/stacService.ts` (comments) —
  these reference the VS Code **command** `debrief.saveSession`, not the package function.

## Tests touching the deleted surface (T093)
- `services/session-state/src/persistence/__tests__/**` — load/save/round-trip suites. Remove/rewrite.
- `apps/web-shell/playwright/fixtures/read-only.ts` — references `save.ts` EACCES synthesis in comments; verify the read-only escalation path still works after repurpose.
