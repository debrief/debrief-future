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
- Python 3.11, TypeScript 5.x (existing monorepo — no new languages) + LinkML >= 1.7.0 (schema source), Pydantic v2 (generated Python models), gen-pydantic/gen-typescript/gen-json-schema (existing toolchain — no new generators added) (222-linkml-mcp-envelopes)

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
- 222-linkml-mcp-envelopes: Added LinkML cluster `mcp.yaml` (15 classes + 4 permissible-values enums); no new external dependencies.
- 249-extract-backlog-navigator: Added TypeScript 5.x backlog-navigator app extraction.
- 246-hooks-workspace-package: Added shared hooks workspace package.
