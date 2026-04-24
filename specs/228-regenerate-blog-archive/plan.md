# Implementation Plan: Regenerate Blog Archive from Specs

**Branch**: `228-regenerate-blog-archive` | **Date**: 2026-04-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/228-regenerate-blog-archive/spec.md`

## Summary

Build a one-shot Python script that walks every shipped spec under `specs/`, classifies each as **unified** / **epic-member** / **composite-member** / **skipped**, and emits three post types (`unified-post.md`, `epic-rollup.md`, `composite-post.md`) plus a single repo-root `ARCHIVE-REBUILD.md` index + runbook for the `debrief.github.io` maintainer. The generator is read-only against `specs/*/` (new files only, zero overwrites), atomic (all-or-nothing), degrades gracefully when GitHub API is unavailable, and is deleted in the same PR that commits its output (FR-009). Classification is driven by charter-first epic detection (primary source: BACKLOG.md Epics table — see Research R1), `[Ex]` title-prefix fallback with mismatches surfaced in the index, and composite clustering by ship-date proximity (≤5 days) **AND** ≥1 shared tag, with 5 < Δdays ≤ 10 "near misses" listed for author review.

## Technical Context

**Language/Version**: Python 3.11 (matches project baseline; stdlib-first).
**Primary Dependencies**: Python stdlib (`pathlib`, `re`, `datetime`, `argparse`, `json`, `urllib.request`, `subprocess`), `PyYAML` (already in `uv.lock` via `linkml` transitively; used for shipped-post front matter parsing). Optional: `gh` CLI (shelled out for PR description retrieval; graceful degradation if absent — see FR-010 edge case).
**Storage**: Local filesystem only. Reads `specs/*/` + `BACKLOG.md` + `docs/ideas/E*.md`. Writes `specs/*/media/{unified,epic-rollup,composite}-post.md` and repo-root `ARCHIVE-REBUILD.md`. Zero modifications to existing files (FR-007).
**Testing**: `pytest` unit tests for the classification, parsing, and stitching functions. Golden-fixture tests against a small curated set of real spec directories (e.g. `000-schemas`, `206-audit-non-linkml-types`, E02 members `070`–`076`). Lightweight integration smoke test: run the script in `--dry-run` mode against the live `specs/` tree and assert (a) every shipped spec is classified into exactly one bucket, (b) no existing file is touched, (c) the index references every generated path.
**Target Platform**: Linux / macOS developer workstation + CI (Linux). No GUI, no network required for the core run (GitHub API is optional augmentation, not a hard dependency).
**Project Type**: Single project — one Python script + its tests + generated markdown. No new service, no frontend changes, no schema changes.
**Performance Goals**: Not a hot path. Run completes in under 60 s for the current ~155-spec archive (single-threaded filesystem walk + per-spec read is ample). Parallelism is an explicit non-goal — clarity and reproducibility over speed.
**Constraints**:
- **Atomic run (NFR-001 / FR-011)**: the script MUST stage all writes in a temp directory and only promote them to their final paths after every spec has been processed without error. Any failure rolls the temp directory back with zero side effects on `specs/`.
- **No existing-file overwrites (FR-007)**: enforced programmatically — the writer refuses to emit to any path that already exists, raising an error that the atomic guard converts into a clean rollback.
- **Offline-capable (Constitution Article I)**: script MUST run without network. `gh` calls are wrapped in a retrieval helper that falls back to `shipped-post.md` as PR-description proxy when `gh` is missing, the call times out, or auth fails — each fallback is recorded per-spec in the index.
- **Script is ephemeral (FR-009)**: committed alongside its output, deleted in the same PR. `scripts/regenerate-blog-archive.py` is the canonical path (NFR-004).
**Scale/Scope**: ~155 spec directories under `specs/` (at time of planning). Of these, roughly 120 have `shipped-post.md` and are eligible for generation; the remainder are skipped. Known epics: E01–E12 (with E02, E05, E08 complete and E11 in progress). Expected output volume: ~100 unified posts, ~5–8 epic rollups, small handful of composites.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Applies? | Status | Notes |
|---------|----------|--------|-------|
| I. Defence-Grade Reliability | Yes | ✅ Pass | No cloud dependency in core path (Article I.2); GitHub API is optional augmentation with graceful degradation. No silent failures (I.3) — every fallback or skip is recorded in the index row. Reproducibility (I.4) satisfied: same inputs + same tool versions produce byte-identical output. |
| II. Schema Integrity | Not applicable | ✅ N/A | Feature produces markdown prose only; no data schemas introduced or touched. |
| III. Data Sovereignty | Yes (weak) | ✅ Pass | Provenance is inherent — every generated post cites its source spec(s). No user data involved. No telemetry. Outputs are Markdown (export-friendly, III.5). |
| IV. Architectural Boundaries | Not applicable | ✅ N/A | Standalone developer tool — not a service, not a frontend. |
| V. Extensibility | Not applicable | ✅ N/A | One-shot script per FR-009; explicitly NOT a reusable platform. |
| VI. Testing | Yes | ✅ Pass | Classification, parsing, stitching, atomic-writer helper all carry unit tests with golden fixtures (see Phase 1 data-model). Integration dry-run smoke test covers end-to-end. |
| VII. Test-Driven AI Collaboration | Yes | ✅ Pass | Acceptance criteria in spec are already executable; Phase 1 translates each FR/Acceptance Scenario into a concrete test case. |
| VIII. Documentation | Yes | ✅ Pass | `ARCHIVE-REBUILD.md` itself is the user-facing doc for the website maintainer. Generator source is referenced from the PR description (NFR-004). `docs/project_notes/issues.md` gets a log entry on merge per the memory protocol. |
| IX. Dependencies | Yes | ✅ Pass | Zero new dependencies — stdlib + already-vendored PyYAML. `gh` is optional. Satisfies Article IX.1 (minimal / vetted). |
| X. Security | Yes | ✅ Pass | No secrets; script reads only the local repo. GitHub API calls are anonymous (read-only metadata) and use the existing user-authed `gh` CLI — no tokens committed. |
| XI. Internationalisation | Not applicable | ✅ N/A | Developer-team artefacts in English; no user-facing UI strings. |
| XII. Community Engagement | Yes (weak) | ✅ Pass | The deliverable IS the community-facing archive. No CTA in content (spec NFR-002 / content.md contract). |
| XIII. Contribution Standards | Yes | ✅ Pass | Atomic commits, PR review (single review-sized PR per SC-006), CI green. |
| XIV. Pre-Release Freedom | Yes | ✅ Pass | Still pre-v4.0.0; no backwards-compatibility obligations. |
| XV. Strict Type Safety | Yes | ✅ Pass | Script MUST use full type annotations (`Any` forbidden); runs under `pyright` strict per repo config. Front-matter parsing validates through a small typed dataclass at the boundary (XV.5). |

**Result**: All applicable gates pass. No violations; Complexity Tracking section below is empty.

**Post-design re-check (2026-04-23)**: After Phase 1 design artifacts were produced (`research.md`, `data-model.md`, `contracts/cli.md`, `quickstart.md`), every applicable article still passes. The research.md R1 decision (promote `BACKLOG.md` to primary charter source instead of `NNN-epic-*` directories) preserves the spec's **intent** that mismatches be surfaced, not silently reconciled. No new dependencies were introduced by the design phase. No new complexity surfaced.

**Review-phase patch (2026-04-24, companion to research.md R7 widening)**: The shipped-post locator recognises the legacy date-stamped naming (`media/YYYY-MM-DD-shipped-*.md`) in addition to the canonical `media/shipped-post.md`. Tie-break on multiple legacy files in one directory: latest ISO date in the filename wins. Rationale: covers early specs (`000-schemas`, `001-debrief-stac`, `002-debrief-io`) that predate the naming convention. Without this, those three specs would silently fall through to `skipped` despite having public shipped posts — violating Article I.3 (no silent failures).

## Project Structure

### Documentation (this feature)

```text
specs/228-regenerate-blog-archive/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── cli.md           # CLI contract for scripts/regenerate-blog-archive.py
├── evidence/
│   └── opening-context.md   # Cached opener (Phase 2 — Content Specialist)
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
scripts/
└── regenerate-blog-archive.py     # One-shot generator (FR-009; deleted same-PR)

tests/
└── regenerate_blog_archive/       # pytest package (temporary — deleted with the script)
    ├── __init__.py
    ├── test_classify.py           # unified / epic-member / composite-member / skipped precedence
    ├── test_parse_front_matter.py # YAML front-matter + date + tag extraction
    ├── test_epic_charter.py       # BACKLOG-table parse + [Ex] fallback + mismatch surfacing
    ├── test_composite_pairs.py    # 5-day proximity AND ≥1 shared tag; 5–10 day near-miss band
    ├── test_stitch.py             # verbatim opener copy + seven-section assembly
    ├── test_atomic_writer.py      # temp-dir stage + promote, rollback on error, no-overwrite guard
    └── fixtures/
        ├── specs/                 # copies of ~5 curated spec folders for golden tests
        └── backlog-excerpt.md     # BACKLOG.md Epics table extract

# Generated outputs (committed alongside the script, then the script is deleted):
ARCHIVE-REBUILD.md                 # Repo-root index + unresolved-groupings + runbook
specs/NNN-<slug>/media/unified-post.md        # For standalone shipped specs
specs/NNN-<slug>/media/epic-rollup.md         # At the charter's ID anchor (see research R1)
specs/NNN-<slug>/media/composite-post.md      # At the earliest spec in the cluster
```

**Structure Decision**: Single-project layout. The generator is a self-contained Python script at `scripts/regenerate-blog-archive.py` with a temporary `tests/regenerate_blog_archive/` package. Both are deleted in the same PR that commits the generated archive (FR-009). No new workspace package, no new service, no schema changes — this is infrastructure tooling that exists for exactly one run. All generated markdown lives inside the existing `specs/NNN-<slug>/media/` convention (no new top-level directory) except for the single repo-root `ARCHIVE-REBUILD.md` handoff artefact.

## Media Components

None — backend/infrastructure feature. The generator produces markdown; there is no new visual component, no Storybook story, and no UI surface. (The artefacts the generator emits are destined for the `debrief.github.io` Jekyll site, which is explicitly out of scope per the feature spec.)

## Storybook E2E Testing

None — no interactive UI components.

## Web-Shell E2E Testing

None — no extension workflow changes.

## Complexity Tracking

*Empty — all Constitution gates pass without justified violations.*
