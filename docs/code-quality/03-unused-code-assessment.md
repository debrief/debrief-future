# Unused Code Assessment

**Date**: 2026-04-17
**Branch**: `worktree-agent-a24f80df`
**Tools**: `knip` (TypeScript), `ts-prune` (TypeScript sanity), `vulture` (Python), `ruff F401/F841` (Python imports/locals).

## Scope

Monorepo-wide static analysis to identify unused code (files, exports, functions, dependencies). Removals are conservative, reflecting the repository's constraints:

- Many modules are public library surface (`@debrief/components`, `@debrief/session-state`, `@debrief/schemas`).
- Numerous exports are referenced only from `specs/*` contracts (must be preserved per instructions).
- VS Code extension relies on dynamic dispatch (command palette contributions, webview serializers, MCP tools).
- Generated outputs under `shared/schemas/src/generated/` are explicitly excluded.

## Tool Output Summary

### knip (TypeScript)

- **107 "unused files"** — dominated by specs/ contracts, Electron `main/*` entrypoints (loaded by Electron at runtime, declared via `package.json#main`), Storybook decorators, and fixtures referenced by stories.
- **12 "unused dependencies"** — 5 confirmed safe, 7 false positives.
- **10 "unused devDependencies"** — 3 confirmed safe, 7 are peer/type/test tooling used implicitly.
- **184 "unused exports"** — overwhelmingly barrel re-exports in `index.ts` or public library API.
- **215 "unused exported types"** — same pattern.
- **65 "unused enum members"** — all in `shared/schemas/src/generated/typescript/types.ts` (generated, excluded).
- **Unlisted imports** — false positives: relative cross-package imports used intentionally (e.g. `apps/nl-demo/scripts/lib-entry.mjs` imports from `../../../shared/components/src/...` for esbuild bundling).

### ts-prune

Cross-checked (3084 reported items). Heavy overlap with knip. Too noisy for action without manual review. Used only for sanity.

### vulture (Python, --min-confidence 80)

Three findings:

1. `services/calc/debrief_calc/validation.py:88` — unused parameter `expected_kind` in `validate_tool_output()`. **Kept** — it's part of a public API called from `executor.py` and mirrored by `apps/web-shell/src/services/toolService.ts` comments; vulture reports the arg is unused inside the function body (that is intentional: the comment above documents "kind may differ from expected_kind").
2. `services/io/src/debrief_io/import_catalog.py:127` — unused parameter `source_file_rel` in private `_attach_provenance()`. **Removed** (and updated 4 call sites).
3. `shared/schemas/scripts/generate-stac-fixtures.py:561` — unused parameter `num` in local `generate_item()`. **Removed** (and updated 1 call site).

### ruff F401/F841

No warnings. Clean.

## High-Confidence Removals (Implemented)

### Python

| Location | Change |
|---|---|
| `services/io/src/debrief_io/import_catalog.py` | Removed unused `source_file_rel` parameter from private `_attach_provenance()`; updated call site in same file and 3 test call sites in `services/io/tests/test_import_catalog.py`. |
| `shared/schemas/scripts/generate-stac-fixtures.py` | Removed unused `num` parameter from local `generate_item()`; updated the single call site. |

### TypeScript — unused dependencies

Grep-verified zero references outside `package.json`/lockfiles/binaries:

| Package | Removed from |
|---|---|
| `concurrently` | `apps/loader/package.json` (devDependencies) |
| `wait-on` | `apps/loader/package.json` (devDependencies) |
| `@storybook/blocks` | `shared/components/package.json` (devDependencies) — no `*.mdx` files exist |
| `memfs` | `apps/web-shell/package.json` (dependencies) — used in `shared/components/src/StacFileTree/fixtures.ts` but that workspace declares its own dep |
| `shared-zustand` | `apps/web-shell/package.json` (dependencies) |

## Suspected-Dead Items Kept (and Why)

### Dependencies kept

- **`leaflet`** (apps/vscode) — referenced as `node_modules/leaflet/dist/leaflet.css` via `asWebviewUri()` in `catalogOverviewPanel.ts`. Required at runtime but invisible to knip.
- **`leaflet-image`** (apps/vscode) — referenced in specs (`174-thumbnail-capture`, `006-speckit-vscode-extension`) and in the `exportPng.ts` command comment describing webview integration.
- **`@debrief/components`** (apps/nl-demo) — imported via relative path (`../../../shared/components/src/...`) in `scripts/lib-entry.mjs` and bundled by esbuild; workspace dep is still valid as documentation/intent.
- **`@babel/standalone`** (apps/nl-demo) — used by `scripts/sync-data.mjs` to copy `node_modules/@babel/standalone/babel.min.js`.
- **`@types/vscode`, `@types/leaflet`** (apps/vscode) — needed for TypeScript compilation; knip cannot detect implicit type-only usage.
- **`@vscode/test-electron`** (apps/vscode) — supplies the `vscode-test` binary used by `"test:integration"` script.
- **`prettier`** (apps/vscode) — referenced by `.eslintrc.cjs` (eslint-config-prettier needs peer).
- **`@sparticuz/chromium`** (root, shared/components) — consumed by `run-playwright.mjs` in cloud CI; plural spec references.
- **`@dnd-kit/sortable`, `@dnd-kit/utilities`, `cql2-filters-parser`** (shared/components) — referenced extensively across `specs/126,127,185,188`.
- **`better-sse`, `zod`, `zundo`, `@debrief/utils`** (services/session-state) — no direct imports found but each is referenced in specs (`024-document-session-state`, `003-debrief-config`, etc.); retaining per constraint.

### Files kept despite knip flagging

- **All `apps/loader/src/main/*.ts`** — the Electron main-process entry tree. `package.json#main` resolves `dist/main/index.cjs` built from `src/main/index.ts`. Knip misses this because Electron load happens outside Node/JS import graph.
- **`apps/loader/scripts/capture-screenshots.ts`** — story screenshot tooling kept by convention.
- **All `apps/nl-demo/scripts/{lib-entry,runtime-entry}.mjs`** — esbuild bundle entry points loaded by `sync-data.mjs`.
- **`apps/vscode/src/views/{layersView,toolsView,welcomeView}.ts`** — candidates for removal but every `views/*` file is referenced in `specs/` as part of the extension architecture contract.
- **All `apps/vscode/src/tools/*/index.ts`** — tool registries referenced by dynamic dispatch (string-keyed lookup) from the tool router.
- **`apps/vscode/src/tools/shape/manipulation/{enlargeShape,moveShape}.ts`** — referenced in specs `093-drawing-toolbar-shape-palette` and `079-move-track` as canonical tool specs.
- **`apps/vscode/src/webview/mapPanel.ts#MapPanelSerializer`** — VS Code session-restore serializer class. Exported but not currently registered; retained because session-restore is a declared architectural intent and removal risks breaking the webview lifecycle if re-enabled.
- **`shared/components/diff/*`** — `@debrief/diff` is its own package with `"main": "dist/index.js"`; published surface even if no internal consumer today.
- **`shared/components/src/LogPanel/SnapshotBoundary.tsx`** — documented in specs `074-snapshots`.
- **`shared/components/src/MapView/hooks/useMapInteraction.ts`** — in specs `001-shared-react-components`.
- **`shared/components/src/ThemeProvider/{electronAdapter,vsCodeAdapter}.ts`** — referenced in specs `032-storybook-vscode-theming`.
- **`shared/components/src/ToolMatch/ToolMatchHarness/index.ts`** — harness used by Playwright `e2e/ToolMatchHarness.spec.ts` and `*.stories.tsx`.
- **All `specs/*/contracts/*.{ts,d.ts}`** — excluded by constraint.
- **`tests/e2e/global-{setup,teardown}.ts`, `tests/e2e/helpers/webview-injector.ts#waitForActiveFrame`** — Playwright global hooks discovered via config, not import graph.
- **`tools/debug-dashboard/*`** — referenced in specs `024-document-session-state`.
- **`shared/schemas/tests/typescript-usage.ts`** — schema adherence test entry exercised by round-trip validation.
- **`.specify/templates/e2e-test-template.ts`** — template, not code.
- **All `shared/schemas/src/generated/typescript/types.ts` enum members** — generated outputs (explicitly excluded).

### Unused Python parameter kept

- `expected_kind` in `validate_tool_output()` — public signature documented in `docs/architectural-consistency-review.md` and referenced by the parallel TypeScript implementation.

## Verification

```sh
task verify
```

Ran the three-step equivalent: lint, typecheck, unit tests. See commit body for outcome.
