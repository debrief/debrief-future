# Implementation Plan: Document Debrief Algorithms and Tools for Migration

**Branch**: `001-document-debrief-algorithms` | **Date**: 2026-02-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-document-debrief-algorithms/spec.md`

## Summary

Systematically document every migrateable algorithm and tool in the legacy Debrief Java codebase, producing three deliverables: a discovery report cataloguing all tools with complexity and UX trigger mapping; golden I/O JSON fixture pairs for each tool; and language-neutral 9-section specifications with pseudocode algorithms. This is a documentation/process feature — it produces Markdown and JSON artifacts, not executable code. All work is performed in the legacy `debrief/debrief` repository and staged in `_tool-migration/` for transfer to `debrief-future/shared/tools/`.

## Technical Context

**Language/Version**: Markdown (specifications, discovery report), JSON (golden I/O fixtures), Java (legacy source analysis, optional capture harness using Gson 2.10.1)
**Primary Dependencies**: None for the feature itself. The optional Java capture harness requires Gson 2.10.1. Four existing Claude Code commands (`/tool.discover`, `/tool.spec`, `/tool.implement`, `/tool.verify`) and four agents (`legacy-tool-analyst`, `tool-spec-author`, `tool-implementer`, `golden-example-validator`) from feature 050 are available in `debrief-future` but NOT in the legacy repo.
**Storage**: Filesystem only (Markdown files, JSON fixtures staged in `_tool-migration/` at legacy repo root)
**Testing**: Phase 4 validation checklist (11 items per spec); `/tool.verify` for golden I/O cross-checking; epsilon 1e-9 for floating-point comparison
**Target Platform**: Developer tooling — platform-independent documentation artifacts
**Project Type**: Documentation/process (no runtime code)
**Performance Goals**: N/A (developer tooling, not runtime)
**Constraints**: Must work offline; must be completable incrementally (tool-by-tool); must follow priority order (Low-complexity first, batched by category)
**Scale/Scope**: Estimated 30-50+ tools across 4 Java package roots; 4 phases of work; 4 already-migrated reference tools in `debrief-future/shared/tools/track/styling/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All artifacts are local Markdown/JSON files; no network required |
| I.4 Reproducibility | Same inputs → same results | PASS | Deterministic JSON serialisation rules; golden I/O captures exact behaviour |
| II. Schema Integrity | Single source of truth | PASS | Tool specs follow `shared/tools/TEMPLATE.md`; 9-section structure enforced by validation checklist |
| III. Data Sovereignty | Provenance always | PASS | Every spec records `migrated_from` with fully-qualified Java class; `debrief:sourceFeatures` in ToolResponse |
| III.5 Export-friendly | Standard formats | PASS | All outputs are Markdown and JSON — universally readable |
| IV. Architectural Boundaries | Services never touch UI | N/A | Documentation feature — no runtime services |
| VI. Testing | Tests required | PASS | Phase 4 validation checklist (11 items); golden I/O pairs serve as test oracles; `/tool.verify` cross-checks implementations |
| VII. Test-Driven AI | Tests before implementation | PASS | Golden examples define expected behaviour BEFORE any re-implementation begins |
| VII.2 Checklists as tests | Verification checklists for AI | PASS | Phase 4 checklist enables self-assessment of spec quality |
| VIII. Documentation | Specs before code | PASS | This IS the specs-before-code feature — all documentation produced before any implementation |
| IX. Dependencies | Minimal, vetted dependencies | PASS | No external dependencies for the feature itself; optional Java harness uses only Gson |
| XII. Community Engagement | Public by default | PASS | Discovery report and tool inventory provide visibility into migration progress |

**No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/001-document-debrief-algorithms/
├── plan.md              # This file
├── research.md          # Phase 0 output — technical decisions
├── data-model.md        # Phase 1 output — entity descriptions
├── quickstart.md        # Phase 1 output — getting started guide
├── contracts/           # Phase 1 output — interface contracts
│   └── workflow-interfaces.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Output Artifacts (in legacy repo `debrief/debrief`)

```text
_tool-migration/
├── discovery-report.md                          # Phase 1 discovery output
└── tools/
    ├── track/
    │   ├── styling/
    │   │   ├── {tool-name}.1.0.md               # Tool spec
    │   │   ├── {tool-name}.basic.input.json      # Golden input
    │   │   └── {tool-name}.basic.output.json     # Golden output
    │   ├── analysis/
    │   │   └── ...
    │   ├── manipulation/
    │   │   └── ...
    │   └── measurement/
    │       └── ...
    ├── sensor/
    │   ├── calibration/
    │   │   └── ...
    │   └── analysis/
    │       └── ...
    ├── dataset/
    │   └── export/
    │       └── ...
    ├── spatial/
    │   └── geometry/
    │       └── ...
    └── narrative/
        └── formatting/
            └── ...
```

### Final Destination (in `debrief-future`)

```text
docs/tool-migration/
└── discovery-report.md

shared/tools/
├── track/styling/           # 4 existing + new tools
├── track/analysis/
├── track/manipulation/
├── track/measurement/
├── sensor/calibration/
├── sensor/analysis/
├── dataset/export/
├── spatial/geometry/
└── narrative/formatting/
```

**Structure Decision**: Documentation-only feature. No runtime source code is produced. Output artifacts follow the directory layout defined in `LEGACY-REPO-TASK.md` and `TOOL-LIBRARY-SRD.md`. Categories are a starting hypothesis refined during Phase 1 discovery.

## Media Components

None - backend/infrastructure feature (documentation artifacts, no visual components)

## Storybook E2E Testing

None - no interactive UI components

## Complexity Tracking

No violations requiring justification.
