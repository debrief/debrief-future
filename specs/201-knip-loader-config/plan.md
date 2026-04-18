# Implementation Plan: Verify Electron Loader Entry + Whitelist in Knip Config

**Branch**: `201-knip-loader-config` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/201-knip-loader-config/spec.md`

## Summary

Current state: `pnpm dlx knip` flags twelve files under `apps/loader/src/main/**` as unused — almost all false positives caused by knip not knowing the Electron main-process entry point. The project has no repository-level knip config; each run defaults its entry discovery to heuristics that miss the Electron packaging convention.

Technical approach: add a single new repository-level file, `knip.json`, that declares per-workspace entry points for `apps/loader` (main + preload + renderer). Verify before silencing: trace imports from each declared entry, confirm every previously-flagged file is reachable, and explicitly NOT silence any genuinely orphaned file uncovered during verification (see Reachability findings in [research.md](./research.md) — `apps/loader/src/main/updater.ts` is a genuine orphan and stays flagged). Run the loader's build smoke step to confirm no regression.

Scope is deliberately tight: one new config file, one evidence record, no new dependencies, no CI wiring. All other knip findings (other packages) must remain untouched by this change.

## Technical Context

**Language/Version**: TypeScript 5.x (for the loader source the config references); configuration itself is JSON (no runtime language).
**Primary Dependencies**: `knip` (invoked ad-hoc via `pnpm dlx knip` — **not added as a project dependency**; keeping the zero-install status quo preserves Article IX).
**Storage**: N/A — repository configuration only.
**Testing**: Manual verification against the `knip` report (pre- vs. post-change diff); smoke run of `pnpm --filter debrief-loader build:main` (TypeScript-only step — avoids the heavyweight `electron-builder` packaging step for a config-only change).
**Target Platform**: Repository configuration (developer workstation + maintainers running `knip` ad-hoc). No runtime impact.
**Project Type**: Single (monorepo tooling change).
**Performance Goals**: N/A — config change has no runtime cost.
**Constraints**: Minimum-scope config (FR-008); must not affect other packages' knip findings (FR-005); must preserve knip's ability to still flag genuinely orphaned files under the loader's main tree (FR-004).
**Scale/Scope**: One new file (`knip.json`), ≤40 lines; one verification record under `specs/201-knip-loader-config/evidence/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I — Defence-Grade Reliability | Offline-capable; no network / cloud deps added | ✅ Pass | Config-only change; no runtime behaviour. |
| II — Schema Integrity | No schema impact | ✅ Pass | N/A — no data structures touched. |
| III — Data Sovereignty | No telemetry / data-handling changes | ✅ Pass | N/A. |
| IV — Architectural Boundaries | Services/frontends separation preserved | ✅ Pass | N/A — dev tooling config. |
| V — Extensibility | No change to extension loading | ✅ Pass | N/A. |
| VI — Testing | Change verifiable | ✅ Pass | Verification = pre/post `knip` report diff + loader build smoke; recorded in evidence/. No new code under test, so no new unit tests required. |
| VII — Test-Driven AI Collaboration | "Done" defined before work | ✅ Pass | Spec's SC-001..SC-006 are the executable definition of done; the quickstart in Phase 1 makes them reproducible. |
| VIII — Documentation | Spec exists; decisions recorded | ✅ Pass | spec.md present; research.md records alternatives; evidence record produced by the feature (FR-007). |
| IX — Dependencies | Minimum-vetted; pinned | ✅ Pass | **No new dependency added** — `knip` stays `pnpm dlx`-invoked (on-demand, not pinned, not shipped). If we were adding knip as a project dep, this gate would need justification; we are not. |
| X — Security | No secrets / network assumptions | ✅ Pass | N/A. |
| XI — I18N | No user-facing strings | ✅ Pass | N/A. |
| XII — Community Engagement | Change visible in-open | ✅ Pass | Standard PR flow. |
| XIII — Contribution Standards | Atomic commit; CI green | ✅ Pass | Single-file config + evidence record; no CI expansion needed. |
| XIV — Pre-Release Freedom | Breaking changes OK | ✅ Pass | N/A. |
| XV — Strict Type Safety | No `any`/`Any` introduced | ✅ Pass | JSON config only; no code changes. |

**No violations.** No entry in Complexity Tracking.

Re-check after Phase 1 design: see "Post-Design Constitution Re-Check" at end of this document.

## Project Structure

### Documentation (this feature)

```text
specs/201-knip-loader-config/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — knip config placement + reachability findings
├── data-model.md        # Phase 1 — (minimal) config entity model
├── quickstart.md        # Phase 1 — reproducible verification steps
├── contracts/
│   └── knip-config.schema.json  # Phase 1 — shape of the knip.json file we author
├── evidence/
│   └── verification-record.md   # Produced during implementation (FR-007)
├── checklists/
│   └── requirements.md  # From /speckit.specify
└── tasks.md             # From /speckit.tasks (not yet created)
```

### Source Code (repository root)

Only one new file is introduced at the repository root. No workspace-local source files are modified.

```text
debrief-future/
├── knip.json                     # NEW — declares per-workspace entry points
├── apps/loader/                  # UNCHANGED — verification target
│   ├── package.json              #   existing "main": "dist/main/index.cjs"
│   └── src/
│       ├── main/                 #   existing Electron main-process tree
│       │   ├── index.ts          #     declared knip entry (source path)
│       │   ├── cleanup.ts
│       │   ├── file-association.ts
│       │   ├── service-paths.ts
│       │   ├── types/ipc.ts
│       │   ├── updater.ts        #     ⚠ GENUINE ORPHAN — stays flagged (see research.md)
│       │   └── ipc/{config,io,jsonrpc,stac}.ts
│       ├── preload/
│       │   └── index.ts          #     declared knip entry
│       └── main.tsx              #     declared knip entry (renderer)
└── specs/201-knip-loader-config/
    └── evidence/verification-record.md  # NEW — captures FR-007
```

**Structure Decision**: Single top-level `knip.json` with a `workspaces` map, scoped narrowly to `apps/loader`. Chosen over (a) a `knip` stanza inside the root `package.json` and (b) a per-workspace `apps/loader/knip.json`. Rationale recorded in [research.md](./research.md). No existing directories are restructured; the loader's source tree is unchanged.

## Media Components

None — backend/infrastructure (tooling config) feature. No visual component, no Storybook story, no user-facing surface.

## Storybook E2E Testing

None — no interactive UI components.

## VS Code Webview E2E Testing

None — no extension workflow changes.

## Complexity Tracking

No violations to justify. Section intentionally empty.

## Post-Design Constitution Re-Check

Re-evaluating after Phase 1 design artefacts (see research.md, data-model.md, contracts/, quickstart.md):

- **Minimal scope preserved** — design introduces exactly one new file outside `specs/` (`knip.json`). No CI change, no dependency change, no source-tree change.
- **Verification-first preserved** — quickstart.md begins with baseline measurement BEFORE applying the config, enforcing FR-002 at the design level.
- **Orphan-finding preserved** — design explicitly calls out `updater.ts` as a genuine orphan to NOT silence, honouring FR-004 and edge case 2.
- **Testability preserved** — verification is a diff of two plain-text reports; SC-002's "byte-identical" criterion is straightforward to check.

No new violations introduced. Constitution Check still passing across all 15 articles.
