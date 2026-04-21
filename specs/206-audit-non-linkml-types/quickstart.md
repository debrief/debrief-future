# Quickstart — Running and re-running the type audit

**Feature**: 206-audit-non-linkml-types
**Audience**: the engineer delivering the first audit and any maintainer
re-running it later.

## Prerequisites

- Repo cloned and `pnpm install` run at the root.
- `tsx` available (already a root devDependency).
- A workspace that has `typescript` installed (all of `apps/vscode`,
  `apps/loader`, `apps/web-shell`, `apps/spec-navigator`,
  `shared/components` qualify), **or** `typescript` hoisted into root
  `devDependencies`.

## 1. Run the scanner

From the repo root:

```bash
mkdir -p tmp
pnpm tsx scripts/audits/type-audit/scan.ts \
  --roots apps shared services \
  --exclude "shared/schemas/src/generated/**" \
  --exclude "**/__tests__/**" \
  --exclude "**/__fixtures__/**" \
  --exclude "**/*.test.ts" \
  --exclude "**/*.spec.ts" \
  --exclude "**/node_modules/**" \
  --out tmp/type-audit.json
```

Expected runtime: under 30 seconds on a full checkout. The command prints
a one-line summary of per-bucket auto-tagged counts on stderr.

Validate the output against the committed schema:

```bash
pnpm dlx ajv-cli validate \
  -s specs/206-audit-non-linkml-types/contracts/scan-output.schema.json \
  -d tmp/type-audit.json
```

## 2. Draft the report

1. Copy the scaffolded report from
   `specs/206-audit-non-linkml-types/templates/report-scaffold.md` to
   `docs/type-audit-2026.md` (scaffold is created during implementation —
   see tasks.md).
2. Fill the YAML front matter (`git_sha` = current `HEAD`,
   `captured_at` = today's date, `scanner_version` = `v1`).
3. For each record in `tmp/type-audit.json`:
   - Accept or override the `autoTag` and assign one of the five
     classifications: `schema-rooted`, `boundary-loose`, `single-domain`,
     `cross-domain-hand-typed`, `drift-candidate`.
   - Author a one-line `summary` and a `recommendedAction`.
   - For `cross-domain-hand-typed` and `drift-candidate`, link a
     `backlogItemRef`: first look for an existing item (#203, #204, #205,
     or another open E11 child); only open a new `BACKLOG.md` entry if no
     existing item covers the finding.
   - For `single-domain`, record the justification ("TS-only, UI state",
     etc.).
4. Resolve every `driftClusters` entry — each cluster becomes at least one
   `drift-candidate` finding.

## 3. Open any new backlog items

In the **same PR** as the report:

1. Append new items to `BACKLOG.md` using the existing format; pick the
   next unused numeric ID.
2. Update the Summary section's "Newly opened backlog items" table with
   the IDs and titles.

## 4. Link back-and-forth with the epic

Edit `docs/ideas/E11-schema-first-boundary-typing.md`:

1. In the `## Items` section, add a bullet linking to
   `docs/type-audit-2026.md`.
2. In `## Phase inventory`, append any phases the audit has uncovered.

The report must already contain a first-paragraph link to
`docs/ideas/E11-schema-first-boundary-typing.md` — this closes the
bidirectional reference SC-003 requires.

## 5. Acceptance self-check

Before opening the PR, confirm:

- [ ] Every record in `tmp/type-audit.json` appears once in the report.
- [ ] No classification is empty or duplicated.
- [ ] Every `cross-domain-hand-typed` and `drift-candidate` finding links
      to a backlog item (existing or new).
- [ ] `docs/ideas/E11-schema-first-boundary-typing.md` links to the
      report and vice versa.
- [ ] `task verify` passes (lint / typecheck / tests — scanner has unit
      tests).
- [ ] The PR diff contains **no production source changes**, only
      `docs/`, `BACKLOG.md`, `scripts/audits/type-audit/`, tests for the
      scanner, and the spec artefacts.

## Re-running the audit later

Repeat steps 1–5. The scanner is deterministic; diffs between runs are
attributable to code change. To make re-runs less manual, the reviewer can
leave `tmp/type-audit.json` side-by-side and `diff` the previous and
current runs to focus attention on what changed.
