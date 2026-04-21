# Implementation Plan: Audit non-LinkML Type Declarations

**Branch**: `219-audit-non-linkml-types` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/219-audit-non-linkml-types/spec.md`

## Summary

Produce a single, reviewable audit of every hand-typed TypeScript `interface` / `type` / `enum` under `apps/`, `shared/` (excluding `shared/schemas/src/generated/`), and `services/`, classified into five categories, and emit `docs/type-audit-2026.md`. The audit is driven by a small Node/TypeScript enumeration script that uses the bundled TypeScript compiler API (no new dependencies) to produce a raw JSON inventory; a human reviewer then curates each entry with a final classification, justification, and (for must-promote / drift entries) a follow-up backlog link. The report anchors Epic E11's phase list.

## Technical Context

**Language/Version**: TypeScript 5.x (audit script + analysis of TS source). No Python changes.
**Primary Dependencies**: Bundled `typescript` compiler API (already in the monorepo) for AST traversal. No new runtime or dev dependencies.
**Storage**: Markdown report at `docs/type-audit-2026.md` (committed artefact). Raw enumeration output at `specs/219-audit-non-linkml-types/evidence/inventory-raw.json`; curated inventory at `specs/219-audit-non-linkml-types/evidence/inventory-classified.json`.
**Testing**: Vitest for the enumeration script's unit tests (fixture-based assertions that the walker finds every declaration in a small sample tree). `task verify` gates the merge.
**Target Platform**: Developer workstation / CI; the audit script runs at audit time and on re-runs. No user-facing surface.
**Project Type**: Single (audit tooling folder under `scripts/type-audit/` + report under `docs/` + evidence under `specs/`).
**Performance Goals**: Full enumeration of the audit scope completes in under 2 minutes on a standard workstation (non-goal for correctness, but meaningful for re-audit ergonomics).
**Constraints**: Read-only against production source. No modifications to runtime code. Offline-capable. Deterministic: given the same git SHA, the raw inventory MUST be byte-identical on re-run.
**Scale/Scope**: Estimated 800–1,500 named TS declarations across the audit scope based on rough grep counts. Five classification categories. Single markdown report.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Applies? | Status | Notes |
|---------|----------|--------|-------|
| I. Defence-Grade Reliability | N/A | ✅ | Read-only analysis; no runtime impact; no network required. |
| II. Schema Integrity | Indirect | ✅ | Audit **supports** this article by surfacing violations; no new schemas introduced. |
| III. Data Sovereignty | N/A | ✅ | No user data involved. |
| IV. Architectural Boundaries | N/A | ✅ | No services or frontends modified. |
| V. Extensibility | N/A | ✅ | No new runtime surface. |
| VI. Testing | Yes | ✅ | Enumeration script has fixture-based unit tests (Phase 1 artefact). |
| VII. Test-Driven AI Collaboration | Yes | ✅ | Spec's requirements-checklist (passed) + Phase 0 methodology define "done" for the audit; a reviewer can verify the report against the spec's SCs. |
| VIII. Documentation | Yes | ✅ | This feature **is** a documentation artefact; spec, plan, and report all written. |
| IX. Dependencies | Yes | ✅ | **Zero new dependencies.** Uses bundled `typescript` compiler API. |
| X. Security | N/A | ✅ | No secrets; no network calls. |
| XI. Internationalisation | N/A | ✅ | Internal tooling; no user-facing strings. |
| XII. Community Engagement | Yes | ✅ | Planning / shipped posts authored per workflow (Phase 2). |
| XIII. Contribution Standards | Yes | ✅ | Atomic commits per phase; PR review required. |
| XIV. Pre-Release Freedom | Yes | ✅ | Pre-v4.0.0; breaking-change rules do not apply. |
| XV. Strict Type Safety | Yes | ✅ | Enumeration script written in TS strict mode; no `any`. Script operates on TS AST (typed). |

**No gates violated.** No entries in Complexity Tracking required.

## Project Structure

### Documentation (this feature)

```text
specs/219-audit-non-linkml-types/
├── plan.md              # This file
├── spec.md              # Feature specification (already committed)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output — how to run the audit
├── contracts/           # Phase 1 output
│   ├── audit-entry.schema.json   # JSON schema for inventory entries
│   └── report-template.md        # Structure / headings for docs/type-audit-2026.md
├── checklists/
│   └── requirements.md  # Spec-quality checklist (already committed)
├── evidence/            # Populated during implementation
│   ├── inventory-raw.json        # Raw enumerator output (machine-generated)
│   └── inventory-classified.json # Curated inventory (human classification added)
├── media/               # Phase 2 output
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
scripts/type-audit/                   # NEW — audit tooling
├── enumerate.ts                       # AST walker; emits raw JSON inventory
├── signals.ts                         # Classification-hint logic
│                                      #   (LinkML import detection,
│                                      #    eslint-disable proximity,
│                                      #    same-name-duplicate grouping)
├── types.ts                           # InventoryEntry / Signal / ClassifiedEntry types
├── __tests__/
│   ├── enumerate.test.ts              # Fixture-based enumeration tests
│   ├── signals.test.ts                # Signal-detection tests
│   └── fixtures/                      # Small TS tree with known declarations
└── README.md                          # How to run; re-audit reproducibility

docs/
├── type-audit-2026.md                 # NEW — curated audit report (human-authored from inventory)
└── ideas/
    └── E11-schema-first-boundary-typing.md   # UPDATED — link to type-audit-2026.md + phase additions
```

**Structure Decision**: Single-project layout. All new code lives in `scripts/type-audit/` (a self-contained tool directory alongside existing audit/guard scripts under `scripts/`). The report lives in `docs/` as a first-class documentation artefact; raw + classified JSON inventories live in the feature's `evidence/` folder so the snapshot is reproducible and the curation step is auditable. No changes to production source — this feature produces documentation and tooling, nothing else.

## Media Components

None — this is a backend/infrastructure / documentation feature with no visual surface. No Storybook stories are created or modified.

## Storybook E2E Testing

None — no interactive UI components.

## VS Code Webview E2E Testing

None — no extension workflow changes.

## Complexity Tracking

No violations. Section intentionally left empty.
