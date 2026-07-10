# Data Model: Repeatable Whole-Repo Review Skill (282)

The persistent model is the **findings ledger** (`docs/project_notes/reviews/ledger.yaml`),
validated against `contracts/ledger.schema.json` on every load and write. All other entities
are per-run (report sections, workflow-internal structures) and are documented here because
the report contract and workflow schemas derive from them.

## Ledger (persistent)

### Ledger (root)

| Field | Type | Rules |
|-------|------|-------|
| `version` | int | Schema version, starts at 1; validator refuses unknown versions |
| `next_id` | int | Next unassigned finding number; monotonically increasing, never reset (FR-006 "never reused") |
| `findings` | LedgerEntry[] | Sorted by ID; IDs unique |

### LedgerEntry

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | `RR-NNN` (zero-padded, ≥ 3 digits); immutable once assigned |
| `status` | enum | `open` \| `fixed` \| `accepted-risk` |
| `status_reason` | string? | **Required** when `status: accepted-risk`; free text, hand-written |
| `dimension` | enum | `constitution` \| `correctness` \| `tech-debt` \| `test-quality` |
| `severity` | enum | `critical` \| `high` \| `medium` \| `low` (rubric: `.claude/review/severity-rubric.md`) |
| `effort` | enum | `S` \| `M` \| `L` |
| `title` | string | One-sentence defect statement (≤ 140 chars) |
| `failure_scenario` | string | Concrete inputs/state → wrong outcome, **or** violated constitution article (e.g. `Article IV.2`) |
| `locations` | Location[] | ≥ 1; multi-location defects are ONE entry (spec edge case) |
| `module_path` | string | Normalised containing package/module — reconciliation key component (R-003) |
| `defect_slug` | string | Kebab-case defect identifier assigned at synthesis — reconciliation key component (R-003) |
| `heuristic` | string | Generating heuristic ID (`CC-*`/`CB-*`/`TD-*`/`TQ-*`) or `(unprompted)` (R-004) |
| `verification` | string | How the adversarial verifier confirmed it (one sentence) |
| `theme` | string? | Theme slug when clustered (FR-017) |
| `first_seen` | RunRef | Run that created the entry |
| `last_seen` | RunRef | Most recent run that re-confirmed or resolved it |
| `fix_pr` | string? | PR URL recorded by `/repo-review.fix` (R-008); presence does NOT imply `fixed` |

### Location

| Field | Type | Rules |
|-------|------|-------|
| `file` | string | Repo-relative path; for generated files, the *source* (schema/generator) with the generated path listed as an additional evidence location (FR-014) |
| `line` | int | Refreshed each run (R-003); valid at `last_seen.git_sha` (SC-004) |

### RunRef

| Field | Type | Rules |
|-------|------|-------|
| `date` | string | `YYYY-MM-DD` |
| `git_sha` | string | 40-hex commit reviewed |

### LedgerEntry state transitions

```text
            reconciliation: defect gone from code
  open ────────────────────────────────────────────▶ fixed        (terminal*)
    │
    │ maintainer triage (hand edit, status_reason required)
    └──────────────────────────────────────────────▶ accepted-risk
                                                        │
         maintainer re-opens (hand edit)                │ re-detected: stays accepted-risk,
  open ◀────────────────────────────────────────────────┘ listed in appendix only (US2-S3)
```

*`fixed` is terminal for the entry; a regression of the same defect is a NEW finding (new
ID) whose report row cross-references the old one — this keeps `fixed` honest as a metric.

**Writers**: only `scripts/review-ledger.py` (reconcile, record-fix-pr) and the maintainer's
hand edits. Every helper write re-validates the full file first (R-008). Corrupt file ⇒ halt
with instructions (FR-008).

## Per-run entities (report/workflow scope)

### Run

Identity `date + git_sha` (R-009). Owns: report file, evidence directory
(`reviews/evidence/YYYY-MM-DD/`), metrics (per-phase token spend, agent counts,
candidate/confirmed/refuted totals, wall-clock), coverage manifest.

### Candidate

Reviewer-agent output, pre-verification: `dimension`, `title`, `failure_scenario`,
`locations`, `heuristic`, proposed `severity`. Becomes a Finding only after an adversarial
verifier confirms (FR-005); refuted/undecidable candidates persist only in working notes and
the methodology counts. Schema-enforced via the workflow's StructuredOutput.

### Theme

`slug`, `name`, one-paragraph pattern description, member finding IDs (≥ 2), exactly one
GuardProposal. Themes with ≥ 3 members also trigger a failure-pattern doc draft (FR-018).

### GuardProposal

`type` ∈ {lint-rule, ci-gate, claude-md, constitution-amendment, playbook-update};
`proposal` (concrete: rule identifiers/config or draft text — implementable without
re-analysis, US5-S2); `adopted_in` (PR URL, filled retrospectively by later runs to power
US5-S4 effectiveness reporting).

### CoverageManifestEntry

`area` (path), `tier` (1/2/3), `dimensions_applied`, `depth`
(`per-file` | `subsystem` | `sweep` | `not-covered-this-run`), `reason` (required when
skipped or shortfallen — FR-003/FR-012).

### HeuristicAttribution (methodology appendix)

Per heuristic ID: `candidates`, `confirmed`, `refuted` counts; aggregated into tuning
recommendations (`prune` | `strengthen` | `add`) — FR-019. `(unprompted)` rows feed `add`
recommendations (R-004).

## Validation rules summary (enforced by `contracts/ledger.schema.json` + helper)

1. IDs match `^RR-\d{3,}$`, unique, `< next_id`.
2. `accepted-risk` ⇒ `status_reason` present and non-empty.
3. Every entry: ≥ 1 location; `first_seen.date` ≤ `last_seen.date`.
4. Enum fields closed (unknown dimension/severity/effort/status rejected).
5. `fix_pr`, when present, is an `https://github.com/...` URL.
6. File-level: `version` known; `findings` sorted by ID (helper normalises on write).
