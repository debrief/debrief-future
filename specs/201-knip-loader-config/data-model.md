# Phase 1 Data Model: Knip Configuration & Verification Record

This feature introduces no runtime data structures. The "data model" here captures the two static configuration/documentation entities it produces.

## Entity 1: `knip.json` (repository-root configuration)

**Purpose**: Tell the unused-code scanner (`knip`) which source files are reachable entry points for each workspace that needs entry-point declarations. Currently only `apps/loader` needs one; other workspaces use knip's defaults.

**Location**: `/knip.json` (repository root).

**Shape** (normative schema in [contracts/knip-config.schema.json](./contracts/knip-config.schema.json)):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | `string` (URL) | Yes | Pointer to knip's published JSON Schema, pinned to major version 5. Used by editors for autocomplete; has no runtime effect on knip itself. |
| `workspaces` | `object` | Yes | Map keyed by workspace path (relative to repo root). Only workspaces needing entry-point overrides appear here. |
| `workspaces["apps/loader"]` | `object` | Yes (for this feature) | Loader-specific entry declarations. |
| `workspaces["apps/loader"].entry` | `string[]` | Yes | Source paths (relative to the workspace root) that knip treats as reachable roots. |

**Validation rules**:
- `$schema` MUST pin a major version (not `@latest`) — guards against breaking schema changes applied retroactively.
- `workspaces["apps/loader"].entry` MUST contain exactly three paths at this feature's completion:
  - `src/main/index.ts` — Electron main-process entry.
  - `src/preload/index.ts` — Electron preload entry.
  - `src/main.tsx` — Vite renderer entry.
- No `ignore`, `ignoreDependencies`, or workspace-wide `project` override is permitted at this feature's completion (enforces FR-004, FR-005, FR-008).
- No other workspace key may appear under `workspaces` at this feature's completion — scope guard per FR-005.

**State transitions**: None. The file either exists with the required shape or it does not; there is no lifecycle beyond git history.

**Relationship to other entities**:
- Consumed by `knip` (ad-hoc invocation via `pnpm dlx knip`).
- References source files in `apps/loader/src/` — those files are the domain, not a data model, so they are out of scope for this section.

## Entity 2: Verification Record (`evidence/verification-record.md`)

**Purpose**: Satisfy FR-007 — a short, auditable written artefact a future maintainer can read in under five minutes (SC-006) to confirm the whitelist's premise is still valid.

**Location**: `specs/201-knip-loader-config/evidence/verification-record.md`.

**Shape**: Markdown document with the following required sections (rendered below in order):

| Section | Content |
|---------|---------|
| Front matter (YAML) | `git_sha`, `captured_at` per the project's evidence-capture convention (`.specify/templates/evidence/test-summary-template.md`). |
| **1. Scope** | One sentence: "Verification record for feature #201 / backlog #202 — knip config for apps/loader." |
| **2. Declared Entry Point(s)** | Bullet list of the three entry paths (copied verbatim from `knip.json`) so future drift can be diffed against this record. |
| **3. Reachability Confirmation** | Table with one row per previously-flagged file, two columns: file path, reachability verdict (✅ reachable via [import chain] / ❌ orphan — flag retained). |
| **4. Genuine Orphan(s) Retained** | List the file(s) NOT silenced — expected content at feature completion: `apps/loader/src/main/updater.ts`. Explains the decision rationale (R-004 in research.md). |
| **5. Build Smoke** | Command run (`pnpm --filter debrief-loader build:main`) + exit status + one-line summary. |
| **6. Pre/Post Knip Output** | Two short code blocks: (a) file count under `apps/loader/src/main/**` flagged BEFORE the config change, (b) same count AFTER. Numerical assertion of SC-001 ("12 → 0" expected, minus the 1 genuine orphan = "12 → 1"). |
| **7. Non-loader Findings Unchanged** | One-line assertion with link to the diff output (attached or pasted) — confirms SC-002. |

**Validation rules**:
- All seven sections MUST be present.
- Section 6's "after" count MUST equal the number of genuine orphans retained (Section 4). If Section 4 lists one file (`updater.ts`), Section 6's "after" count is 1, not 0. This makes the retained orphan a positive, accounted-for outcome rather than a silent anomaly.
- Section 7 MUST include either the full diff output or a link to a stored diff artefact; a claim of "unchanged" without evidence fails SC-002's audit.

**State transitions**: Produced once during implementation; amended in future only if the whitelist changes (e.g., a new workspace is added to `knip.json`). Git history is the full audit trail.

**Relationship to other entities**:
- References `knip.json` (Entity 1) by quoting its `entry` array.
- References source files by path only (no content).

## Out of Scope (not modelled)

- Knip's own internal report format — consumed as opaque text; only "file counts under the loader tree" and "non-loader findings unchanged" are extracted for verification.
- `apps/loader/package.json` — unchanged by this feature; its `"main": "dist/main/index.cjs"` field is referenced in research.md for context but is not a writable entity here.
- The loader source tree itself (`apps/loader/src/**`) — unchanged by this feature.
