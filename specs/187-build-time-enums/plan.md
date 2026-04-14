# Implementation Plan: Build-Time Enum Extraction

**Branch**: `187-build-time-enums` | **Date**: 2026-04-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/187-build-time-enums/spec.md`

## Summary

A single-command Python script that walks the platform registry (`shared/data/platform-registry.json`) and the regenerated sample STAC catalog (`preview/workspace/samples/local-store/`) and emits a compact, deterministic JSON enum bundle covering vessel-class taxonomy, nationality codes, exercise names, plot tags and feature tags. The bundle is the input to the LLM system prompt being designed in #188; it must stay small enough to embed in a prompt, must be regenerable on demand, and must produce byte-identical output for unchanged inputs so the committed artefact is reviewable.

The implementation reuses the existing `debrief-data` registry loader to walk the vessel-class tree (no parallel parser), reads catalog item.json files via `pathlib` + `json` (no STAC SDK dependency), and writes the bundle to a stable repo-root path that the prompt builder will import directly. Tests cover deduplication, deterministic ordering, graceful handling of missing optional fields, and a faithful end-to-end run against the real seed registry plus a small fixture catalog.

## Technical Context

**Language/Version**: Python 3.11 (existing toolchain — same as `scripts/regenerate-sample-catalog.py` and the `debrief-data` package)
**Primary Dependencies**: `debrief-data` (registry loader, already a workspace member); standard library only for the rest (`json`, `pathlib`, `argparse`, `re`)
**Storage**: Read-only access to `shared/data/platform-registry.json` and `preview/workspace/samples/local-store/`; writes one JSON file at a stable repo-root output path (committed artefact)
**Testing**: pytest (existing workspace harness — same convention as `services/io/tests/`); fixtures stored under `tests/fixtures/` for catalog scenarios
**Target Platform**: Repository CLI (any platform that runs the existing `uv run` toolchain — Linux, macOS, Windows-WSL)
**Project Type**: Single-script tooling alongside the existing `scripts/` directory; library helpers extracted as a small module so the logic is unit-testable independently of the script entry point
**Performance Goals**: Complete in well under one minute for the current ~70-item catalog; remain interactive (sub-5-second) at the 700-item scale anticipated by Epic E10
**Constraints**: Output bundle ≤ a few tens of kilobytes; deterministic byte-identical output across reruns; no new third-party dependencies; offline-capable (Article I); strict typing throughout (Article XV — no `Any`)
**Scale/Scope**: One script (~150–200 LOC), one library module (~100 LOC of pure functions), one tests file (~150 LOC), one committed bundle artefact

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Compliance |
|---------|-------------|------------|
| I. Defence-Grade Reliability | Offline by default, no silent failures, reproducible | **PASS** — script is fully offline, exits non-zero on missing inputs (FR-010), deterministic output (FR-008) |
| II. Schema Integrity | Schemas are the contract; derived schemas pass adherence tests | **PASS** — script consumes schema-shaped data via the existing `debrief-data` loader; emits a derived artefact whose shape is documented in `contracts/enum-bundle.schema.json` |
| III. Data Sovereignty | Provenance, source preservation, audit trail, local-only | **PASS** — bundle is local-only build-time output; sources unchanged; bundle header records source paths for provenance |
| IV. Architectural Boundaries | Services never touch UI; thick services thin frontends | **PASS** — pure data-extraction utility, no UI, no service dependency |
| V. Extensibility | Fail-safe loading, schema compliance, no vendor lock-in | **PASS** — graceful handling of missing optional fields (FR-014); standard JSON output |
| VI. Testing | Schema tests gate merges, services unit-tested, CI green | **PASS** — pytest unit + integration tests cover all FRs; included in standard `task test` run |
| VII. Test-Driven AI Collaboration | Tests before implementation, definition-of-done first | **PASS** — acceptance scenarios in spec.md and quickstart.md serve as the executable definition of done; tests authored alongside implementation |
| VIII. Documentation | Specs before code, user-facing docs required, decisions recorded | **PASS** — spec.md, plan.md, research.md, data-model.md, quickstart.md all in place; ADR captured in research.md decision log |
| IX. Dependencies | Minimal, vetted, pinned, no vendor lock-in | **PASS** — zero new external dependencies; reuses existing workspace package |
| X. Security | No secrets, no assumed network/cloud | **PASS** — no secrets handled; no network access |
| XI. Internationalisation | Externalisable strings, locale-aware formatting | **N/A** — script is a developer build tool with no user-facing strings |
| XII. Community Engagement | Public by default, beta previews, feedback loops | **PASS** — committed bundle artefact is reviewable in PRs; planning post drafted (Phase 2) |
| XIII. Contribution Standards | Atomic commits, PR review, CI green | **PASS** — feature delivered as one PR; CI gates apply |
| XIV. Pre-Release Freedom | Breaking changes permitted | **N/A** — new artefact, no compatibility obligations |
| XV. Strict Type Safety | Explicit types, no `Any`/`any`, strict mode | **PASS** — all functions fully annotated; passes `pyright` strict; bundle structure modelled with `TypedDict`/`dataclass` rather than dict-of-`Any` |

**Result**: All gates pass. No violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/187-build-time-enums/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (/speckit.specify output)
├── research.md          # Phase 0 output — decisions and rationale
├── data-model.md        # Phase 1 output — bundle entity model
├── quickstart.md        # Phase 1 output — how a developer runs the script
├── contracts/
│   └── enum-bundle.schema.json   # JSON Schema for the emitted bundle
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
scripts/
└── extract-enum-bundle.py        # CLI entry point (script — same convention as regenerate-sample-catalog.py)

shared/data/
├── src/debrief_data/
│   ├── registry.py               # Existing — reused for tree traversal
│   └── enum_bundle.py            # NEW — pure functions: walk tree, scan catalog, build bundle
├── tests/
│   └── test_enum_bundle.py       # NEW — pytest unit + integration tests with fixture catalogs
└── platform-registry.json        # Existing input

preview/workspace/samples/local-store/
└── catalog.json + N items        # Existing input (regenerated in #184)

shared/data/                       # Output target (committed alongside the script)
└── enum-bundle.json              # NEW — committed artefact, regenerated by the script
```

**Structure Decision**:

- **Library logic lives in `shared/data/src/debrief_data/enum_bundle.py`**, not inside the script. This keeps the script thin (argument parsing, IO, error reporting) and lets the bundle-building functions be unit-tested in isolation. It also follows the precedent set by `registry.py`, which exposes a typed loader that the rest of the codebase imports.
- **Script lives in `scripts/extract-enum-bundle.py`**, matching the existing pattern of `regenerate-sample-catalog.py` and `enrich-legacy-catalog.py` — repository-level developer tooling, not a user-facing service.
- **Output artefact lives in `shared/data/enum-bundle.json`**, alongside the registry it derives from. It is committed to the repository so reviewers can see exactly what the LLM will be shown; the prompt builder in #188 will import it via a simple file read.
- **Tests live in `shared/data/tests/test_enum_bundle.py`**, because the package owns both the loader and the bundle builder. Fixtures for the catalog-side tests live next to the test under `shared/data/tests/fixtures/catalog/`.

## Media Components

None — this feature is a build-time data-extraction script with no visual components, no React/Storybook stories, and no UI surface.

## Storybook E2E Testing

None — no interactive UI components.

## VS Code Webview E2E Testing

None — no extension workflow changes.

## Complexity Tracking

No constitution violations — table not required.
