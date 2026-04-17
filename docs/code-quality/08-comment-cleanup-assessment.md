# Comment cleanup assessment — `08`

Scope: `apps/`, `services/`, `shared/`, `scripts/` (specs/docs untouched).

## Categories found

| Category | Approx count | Action |
|----------|--------------|--------|
| Section banner comments (`// ===`, `// ---`, `# ====`) | ~520 across ~60 files | DELETE where they just label obvious groupings |
| Feature/ticket references in comments (`Feature 113`, `T022`, `(#178)`, `FR-013`) | ~300 across ~85 files | REMOVE feature-tag suffixes; KEEP when they survey adjacent code (rare) |
| In-motion / "previously" / "now" narration | ~12 | REWRITE or DELETE |
| JSDoc/docstring paraphrasing the function name | dozens | KEEP on exported public APIs; DELETE trivial ones |
| Commented-out code blocks | 1 large (updater.ts ~30 lines); scattered singletons | DELETE |
| Stub/LARP code | `updater.ts`, `exportPng.ts`, `setDisplayMode` placeholder | SIMPLIFY/KEEP with single-line note (registered commands/contracts) |
| Debug `console.log`/`print` not in tests or CLI | Most surveyed were legitimate (warnings, logger, CLI output); none obviously stray | LEAVE |

## Representative examples

### In-motion narration to remove / rewrite
- `apps/vscode/src/webview/web/resultsPanel.tsx:129` — multi-line comment describing what the previous check was. REWRITE to state the invariant.
- `apps/web-shell/src/App.tsx:179` — "Result layers now live in session-state store (#109)". DELETE.
- `apps/web-shell/src/App.tsx:526` — "T022: InputFeatureState now uses schema field names". DELETE.
- `apps/web-shell/src/services/toolService.ts:147` — "T024: LogEntry type is now imported from @debrief/schemas (above)." DELETE.
- `services/stac/tests/test_cli.py:25` — "Regression test: Previously, all files used the same asset_key..." REWRITE.
- `shared/components/src/LogPanel/types.ts:7-10` — "T022: Import ParameterValue... instead of defining locally." DELETE.
- `shared/components/src/LogPanel/types.ts:121` — "Feature 113: Tune removed (replaced by flip-card edit face)." DELETE.
- `shared/components/src/LogPanel/toolCategories.ts:5` — "Future: replaced by tool manifest lookup." DELETE.

### Banner comments (no info value)
- `apps/nl-demo/demo.jsx` — 28 banner lines (`// ----`). DELETE all.
- `apps/vscode/src/services/stacService.ts` — 10 `// ====` region banners. DELETE.
- `apps/vscode/src/services/resultsPanelService.ts` — 14 banners. DELETE.
- `apps/vscode/src/services/calcService.ts` — 2 banners. DELETE.
- `apps/vscode/src/services/sessionManager.ts` — 2 banners. DELETE.
- `apps/vscode/src/services/configService.ts` — 2 banners. DELETE.
- `apps/vscode/src/webview/messages.ts` — 22 banners. DELETE.
- `apps/web-shell/src/services/toolService.ts` — 6 banners. DELETE.
- `apps/web-shell/src/App.tsx` — 2 banners. DELETE.
- `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py` — 6 banners. DELETE.
- `services/io/src/debrief_io/handlers/annotations/builders.py` — 6 banners. DELETE.
- `services/session-state/src/types/temporal.ts` — 2 banners. DELETE.
- `services/session-state/tests/integration/snapshotIntegration.test.ts` — 4 banners. DELETE.
- `services/session-state/tests/unit/log/*.test.ts` — 16 banners. DELETE.
- `shared/components/src/ContextMenu/ContextMenu.tsx` — 14 banners. DELETE.
- `shared/components/src/filter-engine/cql2-json.ts` — 2 banners. DELETE.
- `shared/components/src/TimelineView/TimelineView.tsx` — 4 banners. DELETE.
- `shared/components/src/nl-cql2/types.ts` — 10 banners. DELETE.

### Commented-out code
- `apps/loader/src/main/updater.ts` — ~30 lines of commented-out electron-updater calls + narration "NOTE: Uncomment when ready". DELETE block; keep a single-line future-note.

### Stub / LARP
- `apps/loader/src/main/updater.ts` — entire module is a stub (nothing wired). Keep the skeleton because `initUpdater` is exported and callable, but collapse it.
- `apps/vscode/src/commands/exportPng.ts` — placeholder "For now, show a placeholder message". Command registered; KEEP as-is but rewrite comment.
- `apps/vscode/src/commands/index.ts:375` (`debrief.setDisplayMode`) — empty handler with placeholder comment. Command registered; KEEP but rewrite.

## Keep as-is
- Public-API docstrings on Pydantic models, MCP tools, exported React components where they drive generated docs/intellisense.
- `# type: ignore` / `// @ts-ignore` — owned by a separate agent.
- License / copyright headers.
- Files under `shared/schemas/src/generated/` — treated as generated; skipped.
- CLI tools' `print()` calls and structured `console.warn/error` logging.
- Playwright `// and Playwright debug hooks. Cast through `unknown`...` comments — they document a real load-bearing type-cast rationale.

## Approach
High-confidence deletions first. Section banners removed wholesale. Feature-tag suffixes trimmed where they add no invariant. Narration comments that merely say "now" / "previously" rewritten to describe the current invariant, or deleted when the code itself is self-explanatory. Stubs kept where they satisfy a contract but comments tightened.
