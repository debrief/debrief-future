# Implementation Plan: Repeatable Whole-Repo Review Skill (`/repo-review`)

**Branch**: `282-repo-review-skill` (cloud session branch: `claude/code-review-plan-95vovz`) | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/282-repo-review-skill/spec.md`

## Summary

Deliver a repeatable `/repo-review` skill that audits the whole repo across four dimensions
(constitution conformance, correctness bugs, tech-debt refresh, test quality) using a
multi-agent workflow with adversarial verification, and writes a verified-only report plus a
machine-readable findings ledger to `docs/project_notes/reviews/`. A companion
`/repo-review.fix` skill fast-tracks ledger findings to fix→test→PR. The implementation is
**skill assets + two small typed Python helpers** — playbooks, templates, tier map, ledger
schema, and a Workflow orchestration script — not runtime product code. Value-capture
mechanics (prevention-per-theme, memory integration, playbook self-calibration,
resolution-rate metric) are built into the report structure and run phases.

## Technical Context

**Language/Version**: Markdown (skill commands, playbooks, templates); Python 3.11 (ledger validator + reconciliation helper, strict-typed); JavaScript (Workflow-tool orchestration script asset — plain JS, the Workflow runtime does not accept TypeScript)
**Primary Dependencies**: None new. PyYAML + `jsonschema` (already in `uv.lock`) for ledger validation; Claude Code runtime features (Workflow tool, subagents, disposable worktrees) at run time; existing evidence tools — `knip` (root devDep, `knip.json` present), `ruff`, ESLint, `pytest --cov`, vitest coverage
**Storage**: Repo files only — ledger at `docs/project_notes/reviews/ledger.yaml`, dated reports + per-run evidence under `docs/project_notes/reviews/`
**Testing**: pytest for the two Python helpers (schema-validation fixtures: valid/invalid ledgers; reconciliation matching cases); a pytest structural check that every playbook heuristic carries a unique ID and the tier map covers every top-level source directory
**Target Platform**: Claude Code sessions (cloud and local desktop) operating on this repo
**Project Type**: Single — developer tooling (skill assets under `.claude/`, helpers under `scripts/`)
**Performance Goals**: Inaugural run: multi-million tokens, hours of wall-clock — accepted and instrumented (FR-012, SC-007). Re-runs materially cheaper via tier map + delta focus. Ledger operations: instant (single YAML file, hundreds of entries at most)
**Constraints**: Write boundary — run may touch only `docs/project_notes/reviews/`, `bugs.md` appends, and new failure-pattern docs (FR-011); refuses dirty working tree (FR-013); fully offline (Article I) — all evidence tools run locally; no `gh` CLI assumptions (FR-015)
**Scale/Scope**: ~230 Python files, ~1,300 TS files, 4 dimensions × 3 tiers; ledger expected to hold 30–150 findings after the inaugural run

## Constitution Check

*GATE: evaluated against constitution v1.3.0 before Phase 0; re-checked after Phase 1.*

| Article | Assessment |
|---------|------------|
| I. Defence-Grade Reliability | **Pass.** Review runs fully offline; all evidence tools are local. No silent failures: tool failures degrade claims explicitly (FR-010); coverage shortfalls surface in the manifest (FR-012); corrupt ledger halts rather than regenerates (FR-008). |
| II. Schema Integrity | **Pass with note.** The ledger is development-process metadata, not platform data — it never crosses the LinkML-governed data model (no GeoJSON, STAC, or session state). It is still schema-validated: a hand-authored JSON Schema (`contracts/ledger.schema.json`) enforced by a typed Python validator with golden valid/invalid fixtures, mirroring the project's schema-test ethos. LinkML modelling is deliberately not used; justification in Complexity Tracking. |
| III. Data Sovereignty | **Pass.** No user data involved; the review reads code and writes repo-local docs. Evidence outputs record which tool produced them (provenance-in-spirit for claims, FR-010). |
| IV. Architectural Boundaries | **N/A.** No services, frontends, or persistence paths are created. The review *audits* Article IV compliance; it does not participate in it. |
| VI. Testing | **Pass.** Both Python helpers ship with pytest suites (validator fixtures; reconciliation matching cases); playbook/tier-map structural checks run under pytest. Skill markdown itself is exercised by the inaugural run (SC-001–SC-007 are its acceptance test). |
| VIII. Documentation | **Pass.** This spec precedes code; quickstart.md is the user-facing doc; the runbook is embedded in the spec and reproduced in the skill. An ADR will record the review-ledger design (new ADR in `docs/project_notes/decisions.md`). |
| IX. Dependencies | **Pass.** Zero new dependencies — PyYAML and `jsonschema` already present; evidence tools already installed. |
| X. Security | **Pass.** No secrets; report and ledger contain only repo-derived content. |
| XV. Strict Type Safety | **Pass.** Python helpers fully annotated, pyright-strict; YAML load narrows to typed models immediately at the boundary (XV.5). The Workflow JS asset is exempt from `tsc` (Workflow runtime accepts plain JS only) — it is orchestration configuration, not production code; noted in Complexity Tracking. |

**Gate result: PASS** (two justified notes tracked below). Re-checked post-Phase-1: unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/282-repo-review-skill/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── ledger.schema.json        # Findings-ledger JSON Schema (the load-time gate, FR-008)
│   ├── report-structure.md       # Required report sections + front-matter contract (FR-007)
│   └── fix-handoff.md            # /repo-review.fix input/output contract (FR-016)
├── evidence/
│   └── opening-context.md        # Cached blog opener (Phase 2)
└── tasks.md             # /speckit.tasks output — NOT created by this command
```

### Source Code (repository root)

```text
.claude/
├── commands/
│   ├── repo-review.md            # Main skill: phases, agent prompts, write boundary, runbook
│   └── repo-review.fix.md        # Companion fix fast-path (mirrors bugfix.md front-matter style)
└── review/                       # Skill assets (FR-001 location decision — see research.md R-001)
    ├── playbooks/
    │   ├── constitution.md       # Article-by-article falsifiable checks (heuristic IDs CC-*)
    │   ├── correctness.md        # Bug-hunt heuristics per subsystem type (CB-*)
    │   ├── tech-debt.md          # #172 regression categories + dead code (TD-*)
    │   └── test-quality.md       # Behaviour-vs-mock rubric, round-trip mandate, coverage (TQ-*)
    ├── severity-rubric.md        # Critical/High/Medium/Low + S/M/L definitions (FR-006)
    ├── tier-map.yaml             # Repo area → tier (1/2/3), machine-readable (FR-003)
    ├── report-template.md        # Report skeleton with required sections (FR-007)
    └── workflow.js               # Workflow-tool orchestration script (FR-004)

scripts/
├── review-ledger.py              # Typed CLI: validate | reconcile | record-fix-pr (FR-008/009/016)
└── __tests__/ (pytest lives in tests/ — see below)

tests/
└── repo_review/
    ├── test_ledger_validation.py     # Golden valid/invalid ledger fixtures
    ├── test_reconciliation.py        # Match / fixed / accepted-risk / new-ID cases
    ├── test_playbook_structure.py    # Unique heuristic IDs; every heuristic falsifiable-form
    ├── test_tier_map.py              # Every top-level source dir mapped; no unknown paths
    └── fixtures/                     # Ledger + playbook fixtures

docs/project_notes/reviews/           # Created by first run (directory committed with .gitkeep)
├── ledger.yaml                       # Findings ledger (run-time artefact, hand-editable)
├── YYYY-MM-DD-repo-review.md         # Dated reports (run-time artefacts)
└── evidence/YYYY-MM-DD/              # Raw tool outputs per run
```

**Structure Decision**: Skill assets live under `.claude/review/` (co-located with the
commands that consume them, versioned by PR like the existing `.claude/commands/` +
`.claude/agents/` conventions). Run-time artefacts (ledger, reports, evidence) live under
`docs/project_notes/reviews/`, matching where the project already keeps audits and memory
files. Python helper follows the existing `scripts/*.py` convention with tests under
`tests/`, discoverable by `uv run pytest`.

## Media Components

None - backend/infrastructure feature (developer tooling; no visual components, no Storybook stories).

## Storybook E2E Testing

None - no interactive UI components.

## Web-Shell E2E Testing

None - no extension workflow changes.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Ledger schema is hand-authored JSON Schema, not LinkML (Article II note) | The ledger is dev-process metadata consumed only by this skill and its Python helper; it never crosses the platform data model or any Python↔TypeScript boundary | LinkML + three-generator pipeline would add schema-build coupling and adherence-test scaffolding for a single-consumer internal file; precedent: `knip.json`, `BACKLOG.md`, `tier-map.yaml` are likewise process artefacts outside LinkML. If the ledger ever gains a second consumer surface (e.g. a navigator app), promote it to LinkML then |
| `workflow.js` is plain JavaScript (Article XV note) | The Claude Code Workflow runtime executes plain JS only — TypeScript annotations fail to parse | Authoring in TS and transpiling adds a build step for one orchestration file; the file contains no domain logic (agent fan-out only), and its behaviour is exercised end-to-end by the inaugural run |
