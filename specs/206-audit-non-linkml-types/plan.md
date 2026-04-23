# Implementation Plan: [E11] Audit non-LinkML type declarations

**Branch**: `206-audit-non-linkml-types` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/206-audit-non-linkml-types/spec.md`

## Summary

Deliver a single committed Markdown report — `docs/type-audit-2026.md` —
that enumerates every named TypeScript `interface` / `type` / `enum` under
`apps/`, `shared/`, and `services/` (excluding generated and test-local
code), classifies each declaration into one of five buckets (Schema-rooted
/ Boundary / Single-domain convenience / Cross-domain hand-typed / Drift
candidate), and links every actionable finding to a backlog item (existing
or newly opened in the same PR). The report feeds Epic E11's phase list
and establishes a reproducible methodology so the audit can be re-run
later.

Technical approach (from research.md): a committed TypeScript-compiler-API
scanner at `scripts/audits/type-audit/scan.ts` emits an intermediate JSON
file validated against the committed JSON-Schema contracts; a human
reviewer uses that JSON to author the Markdown report. The feature ships
zero production-code changes — only docs, scanner, scanner tests, backlog
edits, and spec artefacts.

## Technical Context

**Language/Version**: TypeScript 5.x (scanner + scanned source); Python 3.11 referenced only in the Python cross-domain appendix
**Primary Dependencies**: `typescript` compiler API (already a workspace devDep in `apps/vscode`, `apps/loader`, `apps/web-shell`, `apps/spec-navigator`, `shared/components`), `tsx` (root devDep), `ajv` (schema validation in scanner unit tests — already transitively available via pnpm store; pinned at workspace level if introduced)
**Storage**: N/A — scanner emits an uncommitted intermediate JSON; deliverables are `docs/type-audit-2026.md`, edits to `docs/ideas/E11-schema-first-boundary-typing.md`, new entries in `BACKLOG.md`, and the scanner itself at `scripts/audits/type-audit/`
**Testing**: `vitest` (or existing root test runner) for scanner unit tests with a small fixture folder — assert record counts, shape-hash determinism, and auto-tag rules. No schema round-trip tests required (no LinkML changes). No Playwright / VS Code E2E required.
**Target Platform**: Node.js 20.x (scanner); Markdown output consumed in GitHub + MkDocs
**Project Type**: tooling / analysis — single deliverable
**Performance Goals**: Scanner completes the full repo traversal in under 30 seconds on a local checkout; re-runs are deterministic (stable sort order for diff-friendly output)
**Constraints**: Read-only analysis (FR-011); audit must not modify production source code; scanner output must be reproducible from a clean checkout
**Scale/Scope**: Estimated ~200–500 named declarations across in-scope paths (confirmed on first scan); scanner tests use a ~10-declaration fixture

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Applied against `.specify/memory/constitution.md` v1.2.0.

| Article | Applies? | Assessment |
|---------|----------|------------|
| I. Defence-Grade Reliability | No | Audit is read-only docs work; no runtime component. |
| II. Schema Integrity | Yes | Audit **reinforces** this article — its output surfaces every place where derived types are not LinkML-rooted. No hand-written schema introduced. |
| III. Data Sovereignty | No | No user data involved; audit operates on repository source code. |
| IV. Architectural Boundaries | No | No service or UI code changes. |
| V. Extensibility | No | No extension surface touched. |
| VI. Testing | Yes | Scanner carries unit tests (fixture-based); schema adherence tests N/A; CI remains green. |
| VII. Test-Driven AI Collaboration | Yes | Checklists for acceptance already defined in spec + requirements.md; quickstart contains an explicit self-check list. |
| VIII. Documentation | Yes | Feature is **entirely** documentation + methodology; specs-before-code respected. |
| IX. Dependencies | Yes | No new runtime dependencies; `typescript` and `tsx` already present. Scanner test validator (`ajv`) kept minimal / workspace-scoped if added. |
| X. Security | No | No secrets; no classification boundary touched. |
| XI. Internationalisation | No | Report is an English-language engineering artefact; no user-facing strings. |
| XII. Community Engagement | Yes | Report, epic back-link, and planning post together advertise progress openly. |
| XIII. Contribution Standards | Yes | Single PR, atomic commits, CI must pass. |
| XIV. Pre-Release Freedom | Yes | Audit leverages pre-v4.0 freedom to restructure types — explicitly in-scope. |
| XV. Strict Type Safety | Yes | Scanner is strict TS with explicit types; audit's entire purpose is to strengthen adherence to this article across the monorepo. |

**Gate status**: PASS. No violations. Complexity Tracking table is empty.

## Project Structure

### Documentation (this feature)

```text
specs/206-audit-non-linkml-types/
├── plan.md                 # This file (/speckit.plan command output)
├── research.md             # Phase 0 output — methodology decisions
├── data-model.md           # Phase 1 output — scanner record + finding shapes
├── quickstart.md           # Phase 1 output — how to run / re-run the audit
├── contracts/
│   ├── README.md
│   ├── scan-output.schema.json          # Top-level JSON contract for scanner output
│   └── type-declaration-record.schema.json
├── checklists/
│   └── requirements.md     # Spec quality checklist (from /speckit.specify)
├── media/                  # Populated by /speckit.plan (planning post + LinkedIn)
│   ├── planning-post.md
│   └── linkedin-planning.md
├── spec.md
└── tasks.md                # Phase 2 output — generated by /speckit.tasks
```

### Source Code (repository root)

This feature introduces a single script package plus targeted edits to
existing documentation files. No new application or service code.

```text
docs/
├── ideas/
│   └── E11-schema-first-boundary-typing.md   # edited — add link to report
└── type-audit-2026.md                        # NEW — the audit report (main deliverable)

scripts/
└── audits/
    └── type-audit/
        ├── README.md                         # NEW — what the scanner does
        ├── scan.ts                           # NEW — TS-compiler-API scanner
        ├── __tests__/
        │   ├── scan.test.ts                  # NEW — fixture-driven unit tests
        │   └── fixtures/                     # NEW — ~10 hand-crafted .ts files
        └── tsconfig.json                     # NEW — minimal TS config

BACKLOG.md                                    # edited — new items for actionable findings (if any)
```

**Structure Decision**: No new workspace is created. The scanner lives under
`scripts/` alongside existing Node + shell utilities
(`scripts/check-no-hand-typed-temporal-enums.sh`,
`scripts/extract-enum-bundle.py`). The decision keeps the audit tool
discoverable in the conventional location without introducing workspace
churn for a one-shot deliverable. If a follow-up E11 phase needs to wire
the scanner into CI as a regression guard, the existing `scripts/check-*.sh`
pattern can host a thin wrapper.

## Media Components

No Storybook components are added, modified, or demonstrated by this
feature. The deliverable is a Markdown report plus a CLI scanner.

**None — backend/infrastructure feature.**

## Storybook E2E Testing

**None — no interactive UI components.**

## VS Code Webview E2E Testing

**None — no extension workflow changes.**

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Constitution Check passed with no violations. Complexity Tracking table
intentionally omitted.
