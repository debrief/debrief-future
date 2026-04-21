# Quickstart: Running the Type Audit

**Feature**: 219-audit-non-linkml-types
**Audience**: audit author (first run) + future reviewers (re-runs)

This document walks through running the enumeration, curating the output, and publishing the report. Roughly 2–4 hours of work the first time; ~30 minutes for a re-audit.

---

## Prerequisites

- Monorepo checked out at the SHA you want to audit (usually `main` HEAD).
- `pnpm install` has been run at the root.
- `task verify` passes (so you know the baseline is green).

## 1. Run the enumerator

```bash
pnpm exec tsx scripts/type-audit/enumerate.ts \
  --out specs/219-audit-non-linkml-types/evidence/inventory-raw.json
```

**Expected outputs**:
- `specs/219-audit-non-linkml-types/evidence/inventory-raw.json` — one entry per audited declaration (see `data-model.md` §1).
- Stdout: total declaration count, per-kind breakdown, exclusion summary.

**Runtime**: under 2 minutes on a laptop (target; not a correctness requirement).

**Sanity check**: Pick 3 files at random from the audit scope and confirm every top-level `interface`/`type`/`enum` in each file appears in `inventory-raw.json`. If one is missing, check whether it matches an exclusion pattern; if not, the enumerator has a bug — file an issue before proceeding.

## 2. Curate — add classifications

Create `evidence/inventory-classified.json` by copying `inventory-raw.json` and extending each entry with the human-curation fields from `data-model.md` §3:

- `classification` — one of the five categories.
- `justification` — a one-line reason (≤ 200 chars).
- `followUpLink` — required for `must-promote` and `drift-candidate`.
- `driftCohort` — required for `drift-candidate` (unique slug shared across cohort members).
- `reviewer` — your GitHub handle.
- `overrodeSignal` — `true` if you classified against the signals; `false` otherwise.

**Workflow tip**: Start with entries where signals fire strongly — they're faster. Leave `schema-rooted` and `single-domain-convenience` (the majority) to the end.

**Validate as you go**:

```bash
# Validate against the contract schema
pnpm exec ajv validate \
  -s specs/219-audit-non-linkml-types/contracts/audit-entry.schema.json \
  -d specs/219-audit-non-linkml-types/evidence/inventory-classified.json
```

## 3. Open follow-up backlog items

For every entry where `classification ∈ {must-promote, drift-candidate}` and `followUpLink` is not already pointing at #203, #204, #205, or a pre-existing E11-scoped item:

1. Open a new GitHub issue under this repo with title `[E11] Promote <TypeName> to LinkML` (or `[E11] Resolve <CohortName> drift cohort`).
2. Link the issue back to `docs/type-audit-2026.md` (use the row's `id` as a fragment anchor once the report is published).
3. Add an entry to `BACKLOG.md` under Epic E11 (status `proposed`).
4. Fill the `followUpLink` field in `inventory-classified.json` with the new issue number.

Re-run the schema validation (step 2) after each batch.

## 4. Generate the report

```bash
pnpm exec tsx scripts/type-audit/render-report.ts \
  --in specs/219-audit-non-linkml-types/evidence/inventory-classified.json \
  --template specs/219-audit-non-linkml-types/contracts/report-template.md \
  --out docs/type-audit-2026.md
```

**Or**: author `docs/type-audit-2026.md` by hand, using the template under `contracts/` as the structural guide. The render script is a convenience, not a requirement.

**Regardless of path**, the report MUST include:
- Git SHA of HEAD at audit time (40 chars).
- Publication date (`YYYY-MM-DD`).
- Enumerator version.
- Per-category counts that sum to the total.
- Methodology section with the exclusion lists.
- A row per entry (all categories present; low-priority categories collapsed under `<details>`).
- A dedicated drift-cohort subsection for each cohort.

## 5. Update Epic E11

Edit `docs/ideas/E11-schema-first-boundary-typing.md`:

1. Add a link to `docs/type-audit-2026.md` near the top of the document.
2. Update the "Phase inventory" table to reflect any phases the audit added or expanded.
3. Link to the newly-opened backlog items per phase.

## 6. Validate against the spec's success criteria

Before opening the PR, walk through `spec.md`'s Success Criteria and confirm each one passes:

- **SC-001**: `docs/type-audit-2026.md` exists; linked from E11.
- **SC-002**: 100% of audited declarations classified (`inventory-classified.json` has the same length as `inventory-raw.json`).
- **SC-003**: 100% of must-promote / drift entries have non-null `followUpLink`.
- **SC-004**: Methodology section gives reproducible commands.
- **SC-005**: E11 phase list reflects the audit's phase-impact summary.
- **SC-006**: Git SHA + publication date present.
- **SC-007**: Every newly-opened backlog item links back to the audit report.

If any SC fails, fix it before the PR.

## 7. Open the PR

- Target branch: `main` (not a long-lived E11 branch; this audit is a standalone deliverable).
- Title: `docs(audit): non-LinkML type audit for Epic E11 (closes #206)`
- Body: paraphrase the report's Summary section and link to the report.

## Re-auditing later

When E11 work lands, re-run the audit to measure progress:

1. Re-run step 1 at a newer SHA.
2. Diff the new `inventory-raw.json` against the previous one — unchanged entries keep their `id`, new entries need classification, removed entries may be marked as "resolved" in the change log.
3. Append a new row to §7 ("Change log") of `docs/type-audit-2026.md`.

## Rollback / abort

If the audit is abandoned mid-curation, revert the feature branch — the report is not published and no backlog items were opened (because step 3 is gated behind step 2). No external systems are affected.
