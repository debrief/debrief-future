# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Future Debrief** — ground-up rebuild of Debrief maritime tactical analysis platform (v4.x). Currently in pre-implementation planning phase; no code exists yet.

Key architectural decisions:
- **Thick services, thin frontends** — domain logic in Python, frontends (VS Code, Electron, Jupyter) handle orchestration only
- **Schema-first** — LinkML master schemas generate Pydantic, JSON Schema, TypeScript
- **STAC for storage** — plots stored as STAC Items with GeoJSON payloads
- **MCP for integration** — services exposed via Model Context Protocol

## Planned Repository Structure

```
debrief/
├── shared/
│   ├── schemas/       # LinkML + generated Pydantic/JSON Schema/TypeScript
│   └── components/    # Shared React components (map, timeline)
├── services/
│   ├── mcp-common/    # Shared MCP utilities (singleton)
│   ├── stac/          # STAC catalog ops (singleton)
│   ├── config/        # User state, XDG config (singleton)
│   ├── io/            # File format handlers (extensible)
│   └── calc/          # Analysis tools (extensible)
├── contrib/           # Organisation-specific extensions
├── apps/
│   ├── loader/        # Electron mini-app
│   └── vscode/        # VS Code extension
└── docs/
```

## Demo Environment

Per-PR preview apps are provisioned by **Heroku Review Apps** (configured via
`heroku.yml` + `app.json`, built from `Dockerfile.preview`). When a PR opens,
a GitHub Actions bot posts a "🚀 Preview Deployments" comment linking to:

- **Code Server** — browser-based VS Code with the extension + sample data
- **Web Shell** — standalone preview app (used for Playwright)
- **Storybook** — component library browser

Review apps at `https://<app>-pr-<n>.herokuapp.com`. Playwright against a
review app is driven by `.github/workflows/heroku-e2e.yml` (manual dispatch).

See ADR-018 in `docs/project_notes/decisions.md` for the history of this
decision (the project previously ran a single persistent Fly.io demo at
`https://debrief-demo.fly.dev` — retired 2026-04-17).

## Build Sequence (Tracer Bullet)

0. **Schemas** — LinkML models, generators, adherence tests
1. **debrief-stac** — local STAC catalog operations
2. **debrief-io** — REP file parsing to GeoJSON
3. **debrief-config** — shared user state (Python + TypeScript)
4. **Loader** — Electron app for file loading
5. **debrief-calc** — context-sensitive analysis tools
6. **VS Code Extension** — display, selection, tool invocation

## Governing Principles (from CONSTITUTION.md)

- **Offline by default** — all core functionality works without network
- **Schema tests mandatory** — derived schemas must pass adherence tests before merge
- **Provenance always** — every transformation records lineage
- **Services never touch UI** — return data only
- **Tests required** — no service code merged without tests
- **Specs before code** — no implementation without written specification

## Tooling (Planned)

| Concern | Choice |
|---------|--------|
| Master schema | LinkML |
| Python packaging | uv workspaces |
| TypeScript packaging | pnpm workspaces |
| User config | XDG Base Directory |

## Parallel Sessions (Worktrees)

`/speckit.start` auto-creates worktrees in `../worktrees/` (local) or branches (cloud). Set `SPECKIT_WORKTREES=true|false` to override. Cleanup: `source .specify/scripts/bash/common.sh && cleanup_stale_worktrees`.

### Resolving the active feature

Speckit scripts (`/speckit.plan`, `/speckit.tasks`, `/speckit.clarify`, etc.) need to know which spec directory to operate on. They look it up in this order:

1. **`SPECIFY_FEATURE` environment variable** — process-scoped override. Example: `export SPECIFY_FEATURE=220-fix-theme-responsiveness`.
2. **`.specify/.active-feature` file at the repo root** — single line containing the spec dir name. Persists across commands in the same worktree. Useful in Claude Code cloud sessions where the branch is forced to `claude/<topic>-<random>` and cannot follow the `NNN-name` convention. The file is gitignored.
3. **The current git branch** — must contain an `NNN-` token (e.g. `220-fix-foo`, `claude/220-fix-foo-xyz`, or `feature/220-foo`). The first matching `NNN-` is used.

If none of those resolve, the scripts list available specs and show the recovery hint. To work on spec `NNN-xxx` from a `claude/...` branch, run:

```sh
echo NNN-xxx > .specify/.active-feature
```

once at the start of the session.

## Key Documents

- `CONSTITUTION.md` — immutable development principles (supersedes all other docs)
- `ARCHITECTURE.md` — technical design decisions
- `VISION.md` — strategic context
- `docs/tracer-delivery-plan.md` — implementation roadmap
- `docs/storybook-vscode-theming.md` — Storybook VS Code theming guide

## Schema Test Strategy

Three approaches required:
1. **Golden fixtures** — canonical valid/invalid JSON in `/shared/schemas/fixtures/`
2. **Round-trip tests** — Python → JSON → TypeScript → JSON → Python
3. **Schema comparison** — Pydantic-generated JSON Schema must match LinkML-generated

## Tech Stack Summary

Python 3.11+ (services, schemas), TypeScript 5.x (frontends, VS Code), React 18+, LinkML, Pydantic v2, Storybook. Per-feature details in individual spec files under `.specify/`.

## Project Memory System

Institutional knowledge lives in `docs/project_notes/` for consistency across sessions.

### Memory Files

- **bugs.md** - Bug log with dates, solutions, prevention notes
- **decisions.md** - Architectural Decision Records (ADRs) with context and trade-offs
- **key_facts.md** - Project configuration, URLs, important constants
- **issues.md** - Work log with ticket IDs and URLs

### Memory-Aware Protocols

**Before proposing architectural changes:**
- Check `docs/project_notes/decisions.md` for existing decisions
- If conflicts exist, acknowledge and explain why change is warranted

**When encountering errors:**
- Search `docs/project_notes/bugs.md` for similar issues
- Document new bugs and solutions when resolved

**When looking up project config:**
- Check `docs/project_notes/key_facts.md` first

**When completing work:**
- Log in `docs/project_notes/issues.md` with ticket ID and URL
- Link evidence: reference `specs/[feature]/evidence/` in issues.md and decisions.md entries

**When capturing evidence:**
- Use the test-summary template at `.specify/templates/evidence/test-summary-template.md`
- Include YAML front matter with `git_sha` and `captured_at` for freshness tracking
- Follow the Quality Rubric per feature type (see `.specify/templates/tasks-template.md`)
- For UI components: capture interaction GIF alongside theme screenshots

## Active Technologies
Only updated when a feature introduces a technology not already listed here.
- TypeScript 5.x (VS Code extension + shared components) + `@debrief/schemas` (generated types), `@debrief/components` (MapView), VS Code Extension API ^1.85.0 (100-unify-feature-pipeline)
- CSS3 (within TypeScript 5.x React component library) + React 18.x, @tanstack/react-virtual (FeatureList virtualisation) (101-layers-panel-vertical-space)
- Python 3.11, TypeScript 5.x + pyright (new), ruff (existing — add ANN/TC rules), ESLint + @typescript-eslint (existing — tighten config) (098-strict-type-checking)
- N/A — configuration and code quality feature (098-strict-type-checking)
- Python 3.11 (services, schemas), TypeScript 5.x (VS Code, shared components, web-shell) + Pydantic v2 (validation), LinkML >= 1.7.0 (schema source), `debrief-schemas` (generated models) (115-schema-validated-tool-io)
- Python 3.11 (service), TypeScript 5.x (VS Code + web-shell frontends) + debrief-calc (Python tool framework), VS Code Extension API (TypeScript) (079-move-track)
- TypeScript 5.x + `cql2-filters-parser` (CQL2 parsing/serialisation, zero-dep ES module) (126-cql2-filter-engine)
- Python 3.11 (fixture generator, schema, tests), LinkML >= 1.7.0 (schema source) + LinkML (schema), Pydantic v2 (validation), jsonschema (fixture validation) (125-stac-extension-mock-data)
- Python 3.11 (service), TypeScript 5.x (VS Code extension consumer) + Pydantic v2 (models), existing `debrief-stac` service module, `mcp.server.fastmcp` (MCP exposure) (136-stac-collection-summaries)
- TypeScript 5.x (React 18.x component) + React 18.x, react-leaflet 4.2 (peer — not directly used), vitest (testing), Storybook (visual dev) (131-timeline-gantt-view)
- TypeScript 5.x + `@dnd-kit/core` + `@dnd-kit/sortable` (drag-to-group), `@debrief/components` filter-engine (#126), `vscrui` (VS Code icons), `nanoid` (unique IDs) (127-filter-bar-lozenge-ui)
- TypeScript 5.x (React 18.x components, Zustand store) + Zustand ^5.0.0, React 18.x, react-leaflet 4.2, `@debrief/components` (FilterBar, CQL2 filter engine), `@debrief/session-state` (132-three-view-sync)
- TypeScript 5.x (test infrastructure), Bash (patching scripts) + @playwright/test ^1.57.0, openvscode-server (currently v1.109.5), @sparticuz/chromium (142-vscode-e2e-webview-reliability)
- Python 3.11 (services, schemas, calc tools)
- TypeScript 5.x (VS Code extension, webview, shared components, session-state)
- React 18.x + react-leaflet 4.2
- Leaflet 1.9.x
- Zustand ^5.0.0 (session-state store)
- LinkML >= 1.7.0 (schema source) + gen-pydantic, gen-json-schema, gen-typescript
- Pydantic v2 (Python model validation)
- VS Code Extension API ^1.85.0
- MCP SDK (Python service exposure)
- esbuild (webview bundling)
- Vega-Lite 5.x / Vega 5.x / vega-embed 6.x (chart rendering) (085-chart-renderer)
- @geoman-io/leaflet-geoman-free ^2.19.2 (drawing tools) (093-drawing-toolbar-shape-palette)
- @tanstack/react-virtual (virtualised lists) (094-show-points-in-layers)
- vscrui ^0.1.0 (VS Code icons) (077-stac-file-tree)
- Playwright ^1.57.0 (E2E tests) (005-e2e-workflow-tests)
- pytest / pytest-cov (Python tests)
- Local filesystem STAC catalogs (JSON + GeoJSON storage)
- Python 3.11 + xml.etree.ElementTree (stdlib), debrief-io, debrief-stac, Pydantic v2 (144-import-legacy-sample-data)
- Python 3.11, TypeScript 5.x (existing monorepo — no new languages) + pnpm (npm workspace), uv (Python workspace), ESLint 8.x, ruff, pyright, pytest (172-review-technical-debt)
- Python 3.11, TypeScript 5.x (existing monorepo — no new languages) + debrief_schemas (Pydantic models), @debrief/schemas (TS types + unions.ts type guards), LinkML >= 1.7.0 (gen-typescript, gen-pydantic) (173-cradle-to-grave-typing)
- Python 3.11 (STAC service), TypeScript 5.x (components, VS Code extension, web-shell) + `modern-screenshot` (DOM-to-PNG capture), `sharp` (Node.js image resize for backfill), Playwright (backfill browser automation), GoldenLayout (preview panel layout) (174-thumbnail-capture)
- Python 3.11 (service, schema), TypeScript 5.x (frontend components, VS Code extension) + Pydantic v2 (models), LinkML >= 1.7.0 (schema), `ulid` (ID generation), React 18.x (UI), `@tanstack/react-virtual` (list virtualisation) (175-review-feedback)
- TypeScript 5.x (VS Code extension + shared components, host + webview), Python 3.11 (no changes required — debrief-calc already returns the right shapes) + VS Code Extension API ^1.85.0, React 18.x, `@debrief/components` (`ChartPanelWrapper`, `TableRenderer`, `ChartRenderer`, `PanelContext`), `@debrief/utils` (`buildCsvContent`, `generateCsvFilename`, `sanitizeFilename`, NEW `parseCsvToTableDataset` and NEW `synthesizeTableDataset`), `@debrief/session-state` (`LogService` — extended with `recordFileSaved`), existing `apps/vscode/src/services/stacService.ts` (178-vscode-tabular-results)
- Python 3.11, TypeScript 5.x + no new dependencies (both languages read JSON natively) (180-platform-registry)
- Static JSON file at `shared/data/platform-registry.json` (180-platform-registry)
- Python 3.11 (schema generation, tests), TypeScript 5.x (generated types, type checking) + LinkML >= 1.7.0 (schema source), Pydantic v2 (generated Python models), gen-pydantic/gen-typescript/gen-json-schema (code generators) (181-linkml-platform-overrides)
- Python 3.11 + `debrief-data` (platform registry loader), `pydantic>=2.12.5` (existing), `debrief-schemas` (existing) (182-import-platform-warnings)
- Python 3.11 + debrief-io (import pipeline), debrief-stac (catalog operations), debrief-data (platform registry loader), scripts/enrich-legacy-catalog.py (metadata enrichment) (184-regenerate-sample-catalog)
- TypeScript 5.x (React 18.x component library under `shared/components/`) + `@debrief/schemas` (PlatformRecord type), `@debrief/components` filter engine (#126/#185 — CompoundPredicate, ArrayFilterPredicate, `array_filter` evaluator and CQL2 serde), `@dnd-kit/core` (drag lifecycle reused from #127), `vscrui` (icon set used by existing chips), `crypto.randomUUID()` (lozenge IDs, already in use) (186-filter-chips)
- Read-only access to `shared/data/platform-registry.json` and `preview/workspace/samples/local-store/`; writes one JSON file at a stable repo-root output path (committed artefact) (187-build-time-enums)
- TypeScript 5.x (existing toolchain — shared components + nl-demo app; no new languages) + Node stdlib (`node:http`, `node:https`) for the live-proxy sidecar, browser-native `fetch` + `AbortController` (no SDK), Anthropic Claude API (Haiku 4.5 default, operator-overridable); credentials isolated to proxy env (`.env` gitignored), no new runtime dependencies (190-live-llm-transport)
- TypeScript 5.x (strict), React 18.x (static SPA at `apps/spec-navigator/`) + Vite 5.x, `react-markdown` + `remark-gfm` + `rehype-slug` + `rehype-autolink-headings` + `rehype-highlight` + `highlight.js` (artefact rendering), `zod ^3.22.0` (GitHub REST boundary + payload validation), `@playwright/test` + `@axe-core/playwright` (E2E + a11y); no backend, no new Python modules (191-spec-navigator)
- TypeScript 5.x (for the loader source the config references); configuration itself is JSON (no runtime language); YAML (Taskfile + CI workflow). + `knip` — **newly added**, pinned to a specific 5.x version in root `devDependencies`. Justification recorded below in Constitution Check Article IX. No other new dependencies. (201-knip-loader-config)
- Storyboards and Scenes are **GeoJSON Features inside the (215-storyboarding-schema)
- Python 3.11 (matches project baseline; stdlib-first). + Python stdlib (`pathlib`, `re`, `datetime`, `argparse`, `json`, `urllib.request`, `subprocess`), `PyYAML` (already in `uv.lock` via `linkml` transitively; used for shipped-post front matter parsing). Optional: `gh` CLI (shelled out for PR description retrieval; graceful degradation if absent — see FR-010 edge case). (228-regenerate-blog-archive)
- Python 3.11 (matches project baseline, stdlib-first) + Python stdlib (`re`, `pathlib`, `dataclasses`, (231-blog-archive-screenshot-fix-impl)
- TypeScript 5.x (strict mode), Node 20.x runtime via VS Code extension host + VS Code Extension API (^1.85.0), existing modules — `sceneThumbnailService`, `storyboardEditService`, `sessionManager`, `MapPanel`, `saveSession` command. **No new runtime dependencies.** (219-buffer-asset-entries)
- TypeScript 5.x (strict mode mandatory per Article XV; no new languages) + `node:fs/promises` (atomic write primitive — already used by `sceneThumbnailService`), `node:crypto` (mtime fingerprints already used by `stacService`), Vite 5.x dev/preview server middleware (already in `apps/web-shell/vite.config.ts`), `@debrief/components` (existing `FilesystemAdapter` typed surface — read-only, untouched), `@debrief/session-state` (existing `saveSession` — untouched) (236-web-shell-stac-writes)
- TypeScript 5.x (strict mode mandatory per Article XV; no new languages) + `idb` (small, well-typed Promise-based wrapper around IndexedDB — proposed new runtime dependency, single source, used by hundreds of projects, last-written 2025); `BroadcastChannel` (browser stdlib, no dep); existing `node:fs/promises` and `node:crypto` for VS Code adaptor; existing `@debrief/components` (`FilesystemAdapter` typed surface — read-only, untouched); existing `@debrief/session-state` (`saveSession` — untouched). **No server-side dependencies added; no new Vite plugins.** (236-web-shell-stac-writes)
- Two backends behind one interface. VS Code: filesystem at `STAC_STORE_PATH` (existing — `preview/workspace/samples/local-store/` in dev, `apps/vscode/test-data/local-store/` in CI). Web-shell: per-origin IndexedDB database `debrief-stac-writer-v1` with object stores `items`, `assets`, `payloads`, `meta`. Bundled static catalog continues to be served read-only by the existing `/stac-store/` GET handler. (236-web-shell-stac-writes)
- Python 3.11 (services, schemas, regeneration script), TypeScript 5.x (VS Code reader, web-shell reader, Playwright test) + `multiformats` (multihash SHA-256 encoding for `file:checksum`), `stac_validator` (already present — bumps to STAC 1.1 schemas), `@radiantearth/stac-browser` v3.3.4 (Playwright dev-dep), `http-server` (Playwright dev-dep, serves the catalog). **No changes to existing runtime stack.** (241-stac-best-practices-upgrade)
- TypeScript 5.x (strict mode, per Article XV); Python 3.11 (one-shot backfill script only — no runtime Python). + React 18.x, Vite 5.x, Zod ^3.22.0 (GitHub REST boundary validation, mirrors spec-navigator), `react-markdown` + `remark-gfm` (Description cell rendering), `diff` (jsdiff, ^5 — unified-diff synthesis for the raw-diff toggle), `@playwright/test` + `@axe-core/playwright` (E2E + a11y), Vitest (unit). **No new runtime dependencies for table behaviour** — sort/filter/group is implemented in-app over plain `<table>` + `useMemo` (TanStack react-table considered and rejected, see research.md). (242-backlog-navigator)

## Before Pushing

**Always run the full CI check before pushing any commits.** Do not push if any step fails.

> **Heads-up for Claude Code on the web sessions:** if `pnpm install` or
> `uv sync` 403s on the package registry, the cloud environment's
> **Network access** mode is set to `None` (or "custom" with a too-narrow
> allowlist). Fix at `claude.ai/code` → environment settings → Network
> access → set to **Trusted** (allows package registries) or **Full**.
> The change applies to **freshly-provisioned VMs only** — start a new
> session after toggling. Local desktop CLI is unaffected. See
> `docs/project_notes/key_facts.md` → "Claude Code on the Web: Network
> Access" for the full table, the verification command, and the
> upstream UX-bug tracker.

### Using `task` (preferred)

```sh
task verify
```

This runs lint, typecheck, and test — the same three steps CI runs.

### Fallback (when `task` is not installed)

Run these four commands in order. All must pass before pushing:

```sh
# Step 1: Lint (Python + TypeScript)
uv run ruff check . && pnpm lint

# Step 2: Type check (Python + TypeScript)
uv run pyright && pnpm -r typecheck

# Step 3: Unit tests (Python + TypeScript — excludes Playwright E2E)
uv run pytest && pnpm --filter '!@debrief/web-shell' test

# Step 4: Playwright E2E tests (web-shell + spec-navigator)
cd apps/web-shell && node run-playwright.mjs && cd ../..
pnpm --filter @debrief/spec-navigator build && cd apps/spec-navigator && node run-playwright.mjs && cd ../..
```

**Playwright note:** Step 4 uses `run-playwright.mjs` which extracts Chromium via `@sparticuz/chromium` — this works in both cloud (Claude Code) and CI environments. For local macOS/Windows, use `pnpm exec playwright install chromium` then `pnpm --filter @debrief/web-shell test` instead. See `docs/project_notes/playwright-installation-research.md` for details.

### What CI actually runs (`.github/workflows/ci.yml`)

| CI Step | Command | What it catches |
|---------|---------|-----------------|
| Lint | `task lint` | ruff (Python) + ESLint (TypeScript) |
| Typecheck | `task typecheck` | pyright (Python) + tsc --noEmit (TypeScript) |
| Test | `task test` | pytest (Python) + vitest + Playwright E2E |

Note: `vitest` does not catch TypeScript type errors — only `tsc` (run during typecheck) does. The `pnpm build` step also runs `tsc`, but typecheck is the explicit CI gate.

## Recent Changes
- 242-backlog-navigator: Added TypeScript 5.x (strict mode, per Article XV); Python 3.11 (one-shot backfill script only — no runtime Python). + React 18.x, Vite 5.x, Zod ^3.22.0 (GitHub REST boundary validation, mirrors spec-navigator), `react-markdown` + `remark-gfm` (Description cell rendering), `diff` (jsdiff, ^5 — unified-diff synthesis for the raw-diff toggle), `@playwright/test` + `@axe-core/playwright` (E2E + a11y), Vitest (unit). **No new runtime dependencies for table behaviour** — sort/filter/group is implemented in-app over plain `<table>` + `useMemo` (TanStack react-table considered and rejected, see research.md).
- 241-stac-best-practices-upgrade: Added Python 3.11 (services, schemas, regeneration script), TypeScript 5.x (VS Code reader, web-shell reader, Playwright test) + `multiformats` (multihash SHA-256 encoding for `file:checksum`), `stac_validator` (already present — bumps to STAC 1.1 schemas), `@radiantearth/stac-browser` v3.3.4 (Playwright dev-dep), `http-server` (Playwright dev-dep, serves the catalog). **No changes to existing runtime stack.**
- 236-web-shell-stac-writes: Added TypeScript 5.x (strict mode mandatory per Article XV; no new languages) + `idb` (small, well-typed Promise-based wrapper around IndexedDB — proposed new runtime dependency, single source, used by hundreds of projects, last-written 2025); `BroadcastChannel` (browser stdlib, no dep); existing `node:fs/promises` and `node:crypto` for VS Code adaptor; existing `@debrief/components` (`FilesystemAdapter` typed surface — read-only, untouched); existing `@debrief/session-state` (`saveSession` — untouched). **No server-side dependencies added; no new Vite plugins.**
- 236-web-shell-stac-writes: Added TypeScript 5.x (strict mode mandatory per Article XV; no new languages) + `node:fs/promises` (atomic write primitive — already used by `sceneThumbnailService`), `node:crypto` (mtime fingerprints already used by `stacService`), Vite 5.x dev/preview server middleware (already in `apps/web-shell/vite.config.ts`), `@debrief/components` (existing `FilesystemAdapter` typed surface — read-only, untouched), `@debrief/session-state` (existing `saveSession` — untouched)
