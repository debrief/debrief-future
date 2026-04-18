# Implementation Plan: Verify Electron Loader Entry + Knip Config + CI Gate

**Branch**: `201-knip-loader-config` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/201-knip-loader-config/spec.md`

## Summary

**Goal**: make `knip` produce an actionable unused-code report for the Electron loader — both today (12 → 0 findings) and forever after (CI catches regressions).

**Scope after review** (`/speckit.review` on 2026-04-18 decided four expansions beyond the original plan):
1. Add a root-level `knip.json` declaring the Electron loader's three entry points (main, preload, renderer) — declarative, scoped to `apps/loader`.
2. **Delete** `apps/loader/src/main/updater.ts` — the one file in the loader's main-process tree that is NOT reachable from the declared entry (genuine orphan; commented-out `electron-updater` import, no call sites). Deletion brings SC-001's expected value from "12 → 1" to "12 → 0" and removes the only "known false positive" from the next maintainer's radar.
3. **Pin `knip` as a dev dependency** (root `package.json`), invoked via `pnpm exec knip` locally and in CI. Replaces the ad-hoc `pnpm dlx knip` pattern. Required for reproducibility (Article I.4) now that knip is a CI gate.
4. **Add a CI step** running `task knip` alongside `task lint` / `task typecheck` / `task test`. Any PR that introduces a non-declared unused file in the scanned tree fails CI.

**Spec alignment notes**: SC-001 already anticipated "12 → 0" (consistent with deletion). Two Assumptions in the current spec are now stale and need a small edit before tasks generation:
- Spec Assumption 3 ("No unused-code-scanner run currently blocks CI… this feature does not require adding it to the CI gate") is **superseded** — update to reflect the new CI gate.
- Spec Dependencies ("None") is **superseded** — update to note the addition of `knip` as a pinned dev dependency.

A small spec edit, called out at the end of this plan, fixes both. The rest of the spec (user stories, FRs, SC-002..SC-006, edge cases) remains correct as written.

## Technical Context

**Language/Version**: TypeScript 5.x (for the loader source the config references); configuration itself is JSON (no runtime language); YAML (Taskfile + CI workflow).
**Primary Dependencies**: `knip` — **newly added**, pinned to a specific 5.x version in root `devDependencies`. Justification recorded below in Constitution Check Article IX. No other new dependencies.
**Storage**: N/A — repository configuration only.
**Testing**: Manual verification against the `knip` report (pre- vs. post-change diff); smoke run of `pnpm --filter debrief-loader build:main`; automated regression guard via a new `task knip` CI step that fails on any non-declared unused file.
**Target Platform**: Repository configuration + CI runner (GitHub Actions ubuntu-latest). No runtime impact on end-user binaries.
**Project Type**: Single (monorepo tooling change).
**Performance Goals**: CI `task knip` step completes in under ~30 s on a warm pnpm cache (well below the existing test/typecheck durations; not a CI-time concern).
**Constraints**: Minimum-scope config (FR-008); must not affect other packages' knip findings (FR-005); must preserve knip's ability to flag genuinely orphaned files under the loader's main tree (FR-004); CI gate must be deterministic (no network calls beyond the install step that fetches the pinned knip binary via pnpm).
**Scale/Scope**: One new repository file (`knip.json`), one file deletion (`apps/loader/src/main/updater.ts`), three file edits (`package.json`, `Taskfile.yml`, `.github/workflows/ci.yml`), one evidence record. Total: 1 add, 1 delete, 3 edits, 1 doc artefact.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I — Defence-Grade Reliability | Offline-capable; reproducibility (I.4) | ✅ Pass | Pinning knip satisfies I.4; CI step uses the pinned version via `pnpm exec`, not an on-the-fly `dlx` fetch. No cloud dependency in core. |
| II — Schema Integrity | No schema impact | ✅ Pass | N/A — no data structures touched. |
| III — Data Sovereignty | No telemetry / data-handling changes | ✅ Pass | N/A. |
| IV — Architectural Boundaries | Services/frontends separation preserved | ✅ Pass | `updater.ts` deletion removes code from the loader's main process but adds no cross-boundary coupling. |
| V — Extensibility | No change to extension loading | ✅ Pass | N/A. |
| VI — Testing | Change verifiable; CI enforces compliance | ✅ Pass | Verification = pre/post `knip` report diff + loader `build:main` smoke; recorded in evidence/. CI gate provides automated regression coverage. |
| VII — Test-Driven AI Collaboration | "Done" defined before work | ✅ Pass | Spec's SC-001..SC-006 are the executable definition of done; quickstart.md + CI step make them reproducible and automatically enforced. |
| VIII — Documentation | Spec exists; decisions recorded | ✅ Pass | spec.md present; research.md records alternatives (R-001..R-007); evidence record produced by the feature (FR-007). |
| IX — Dependencies | Minimum-vetted; pinned | ✅ Pass **with justification** | Knip is newly added as a dev dep. **Justification**: (a) required as a CI gate — reproducibility demands pinning (Article I.4, Article IX.2); (b) `pnpm dlx` would fetch an unpinned version on every CI run, contradicting IX.2 and slowing CI by ~10s/run; (c) the project depends de facto on knip's behaviour for scope-enforcement of `knip.json`, so the dep is real regardless of whether declared. Declared + pinned is the honest posture. Full rationale in research.md R-005. |
| X — Security | No secrets / network assumptions | ✅ Pass | Knip reads source files only; no network at scan time. |
| XI — I18N | No user-facing strings | ✅ Pass | N/A. |
| XII — Community Engagement | Change visible in-open | ✅ Pass | Standard PR flow. |
| XIII — Contribution Standards | Atomic commit; CI green | ✅ Pass | Single PR covering knip.json + updater.ts deletion + CI wiring + evidence. |
| XIV — Pre-Release Freedom | Breaking changes OK | ✅ Pass | N/A. |
| XV — Strict Type Safety | No `any`/`Any` introduced | ✅ Pass | JSON config only; deleted `updater.ts` had no type declarations to retire. |

**No unjustified violations.** Article IX's addition of a new dev dep is justified in the Complexity Tracking section below (the only non-empty entry).

Re-check after Phase 1 design: see "Post-Design Constitution Re-Check" at end of this document.

## Project Structure

### Documentation (this feature)

```text
specs/201-knip-loader-config/
├── plan.md              # This file
├── spec.md              # Feature specification (minor Assumptions/Dependencies edit required)
├── research.md          # Phase 0 — knip config placement, reachability, CI gate strategy
├── data-model.md        # Phase 1 — config entity + evidence record
├── quickstart.md        # Phase 1 — reproducible verification + CI behaviour
├── contracts/
│   └── knip-config.schema.json  # Phase 1 — shape of the knip.json file we author
├── evidence/
│   └── verification-record.md   # Produced during implementation (FR-007)
├── checklists/
│   └── requirements.md  # From /speckit.specify
└── tasks.md             # From /speckit.tasks (not yet created)
```

### Source Code (repository root)

```text
debrief-future/
├── knip.json                           # NEW — declares per-workspace entry points
├── package.json                        # EDIT — add `knip` to devDependencies (pinned)
├── pnpm-lock.yaml                      # EDIT — regenerated by pnpm install
├── Taskfile.yml                        # EDIT — add `task knip` target; add it to `task verify`
├── .github/workflows/ci.yml            # EDIT — add "Run knip" step after "Run linting"
├── apps/loader/                        # MOSTLY UNCHANGED
│   ├── package.json                    #   unchanged
│   └── src/
│       ├── main/
│       │   ├── index.ts                #   declared knip entry (source path)
│       │   ├── cleanup.ts
│       │   ├── file-association.ts
│       │   ├── service-paths.ts
│       │   ├── types/ipc.ts
│       │   ├── updater.ts              #   DELETED (genuine orphan)
│       │   └── ipc/{config,io,jsonrpc,stac}.ts
│       ├── preload/
│       │   └── index.ts                #   declared knip entry
│       └── main.tsx                    #   declared knip entry (renderer)
└── specs/201-knip-loader-config/
    └── evidence/verification-record.md # NEW — captures FR-007
```

**Structure Decision**: Single top-level `knip.json` with a `workspaces` map, scoped narrowly to `apps/loader`. `knip` invoked via `pnpm exec knip` (not `dlx`) from a new `task knip` target, wired into both `task verify` (developer workflow) and `.github/workflows/ci.yml` (CI gate). The loader's main-process tree loses exactly one file (`updater.ts`); all other loader source is unchanged.

## Media Components

None — backend/infrastructure (tooling config + CI) feature. No visual component, no Storybook story, no user-facing surface.

## Storybook E2E Testing

None — no interactive UI components.

## VS Code Webview E2E Testing

None — no extension workflow changes.

## Complexity Tracking

*Justification for the single Constitution Check asterisk — adding `knip` as a dev dependency (Article IX).*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New pinned dev dependency (`knip`) | Required as a CI gate (Article VI) for regression coverage of the knip.json whitelist; pinning required by Article I.4 (reproducibility) and Article IX.2 (pinned versions). | **`pnpm dlx knip` (unpinned)** — rejected because every CI run would fetch a fresh version, violating IX.2 and exposing CI to unannounced breakages. **No CI gate** — rejected by `/speckit.review` Issue 3B: manual-only verification allows silent regressions. **Custom script** — rejected as reinventing knip's reachability algorithm. |

## Required Spec Edits (apply before `/speckit.tasks`)

Two spec edits are needed to keep spec.md internally consistent with this plan. These are small and non-controversial:

1. **Spec Assumption 3** (currently: "No unused-code-scanner run currently blocks CI; the scanner is run ad-hoc by maintainers. This feature does not require adding it to the CI gate — only cleaning its output."):

   **Proposed new text**: "This feature adds the unused-code scanner as a new CI gate (running alongside the existing lint / typecheck / test steps). The gate fails the build if any non-declared unused file is reported under the scanned tree — providing automated regression coverage for the knip.json whitelist."

2. **Spec Dependencies** (currently: "None. Per the backlog item, this work is fully parallel with sibling tech-debt items."):

   **Proposed new text**: "Introduces one new pinned dev dependency (`knip`, in the root `devDependencies`). Per the backlog item, this work is fully parallel with sibling tech-debt items; coordinate with #199 (which also touches `knip.json` — see [research.md](./research.md) R-007 for the coordination note)."

Do these edits after the plan is accepted and before running `/speckit.tasks`, so the generated tasks.md reflects the actual scope.

## Post-Design Constitution Re-Check

Re-evaluating after Phase 1 design artefacts (see research.md, data-model.md, contracts/, quickstart.md):

- **Minimum scope preserved** — design introduces exactly one NEW file outside `specs/` (`knip.json`). Five other files are **edited** (`package.json`, `pnpm-lock.yaml`, `Taskfile.yml`, `.github/workflows/ci.yml`, delete `apps/loader/src/main/updater.ts`), all tightly bounded.
- **Verification-first preserved** — quickstart.md begins with a baseline measurement BEFORE applying the config; the CI gate only locks in the cleaned state after manual verification confirms it.
- **Orphan-finding preserved** — `updater.ts` is deleted (not silenced). FR-004 ("must continue to flag any file NOT reachable from the declared entry") is honoured by the contract schema's rejection of `ignore` globs, not by any special handling of `updater.ts`.
- **Testability preserved** — verification is a diff of two plain-text reports plus a CI exit code; SC-001 (now "12 → 0") and SC-002 ("byte-identical for non-loader packages") are straightforward assertions.
- **Dependency justification recorded** — Article IX violation (the new knip dep) is documented in Complexity Tracking with concrete rationale; the alternative "no pinning" was explicitly rejected.

No new violations introduced. Constitution Check still passing across all 15 articles, with the Article IX asterisk justified.
