# Feature Specification: Regenerate Blog Archive from Specs

**Feature Branch**: `228-regenerate-blog-archive`
**Created**: 2026-04-23
**Status**: Draft
**Input**: User description: "Regenerate Future Debrief blog archive from specs — one-shot script producing unified `Building [Feature]` posts per shipped standalone spec, epic rollups replacing per-spec posts for multi-spec arcs (charter-first detection via `NNN-epic-*` naming with `[Ex]` title-prefix fallback; mismatches flagged in index), and composite posts clustering temporally+thematically-related standalones (5-day ship-date proximity AND ≥1 shared tag; 5–10 day \"near miss\" band surfaced in index for author review). Produces `ARCHIVE-REBUILD.md` at repo root with index table + website-maintainer runbook so the `debrief.github.io` dev can wipe and republish `future` posts from scratch."

> **Binding interview decisions** from the pre-specify scoping round (2026-04-23) are preserved in `spec-draft.md` at Q1–Q17. Those answers are locked in and reflected throughout this spec; do not relitigate them in `/speckit.clarify` unless an acceptance scenario is untestable as written.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Generate unified per-spec posts (Priority: P1)

The generator reads each shipped standalone spec (`spec.md`, `plan.md`, `research.md`, `evidence/`, existing `planning-post.md`, existing `shipped-post.md`, merge-PR description) and produces a single `Building [Feature Name]` post that stitches the cached opener (first three sections of `evidence/opening-context.md`) onto the ship-time narrative (Screenshots, By the Numbers, Lessons Learned, What's Next).

**Why this priority**: The bulk of the archive is standalone specs. This is the default path; everything else is refinement.

**Independent Test**: Run the generator against a single shipped spec (e.g., #206) and verify `specs/206-audit-non-linkml-types/media/unified-post.md` contains all seven sections, has `title: "Building …"`, dates to the original ship date, and is not produced for any in-flight spec.

**Acceptance Scenarios**:

1. **Given** a shipped spec with cached opener + evidence, **When** the generator runs, **Then** `specs/NNN-<slug>/media/unified-post.md` is written with the seven-section minimal stitch and the verbatim first three sections from `evidence/opening-context.md`.
2. **Given** a spec lacking `evidence/opening-context.md`, **When** the generator runs, **Then** the opener is synthesised from `spec.md`/`plan.md`/`research.md` and the output row in `ARCHIVE-REBUILD.md` notes the fallback.
3. **Given** a spec without `shipped-post.md` (in-flight), **When** the generator runs, **Then** it is skipped and no post file is written; the skip reason is recorded in the index.

---

### User Story 2 — Epic rollup replaces per-spec posts (Priority: P2)

For each epic identified by its charter spec (`NNN-epic-*` directory naming) or, as fallback, by `[Ex]` title-prefix scan of shipped specs, produce one rollup post at `specs/[charter]/media/epic-rollup.md` that absorbs the charter's framing and narrates the whole arc. Constituent (member) specs are omitted from per-spec generation (no `unified-post.md` for them).

**Why this priority**: Epics tell a bigger story than their parts. Per-spec posts for epic members would fragment the narrative and duplicate context.

**Independent Test**: Run the generator on an epic (e.g., E02 log-recording: charter + `070`, `071`, `072`, `073`, `074`, `076`) and verify only one rollup file is produced, no `unified-post.md` exists for any member, and the rollup references every member.

**Acceptance Scenarios**:

1. **Given** a charter spec whose member table lists N specs, **When** the generator runs, **Then** exactly one `epic-rollup.md` is produced at the charter path and no member spec receives a `unified-post.md`.
2. **Given** a spec carrying an `[Ex]` prefix but absent from its charter's member table (or, conversely, listed in the charter but missing the prefix), **When** the generator runs, **Then** the mismatch appears in `ARCHIVE-REBUILD.md` under "Unresolved Groupings" with both sides of the mismatch cited for author adjudication.
3. **Given** an epic whose charter has its own `planning-post.md`/`shipped-post.md` on disk, **When** the rollup is generated, **Then** those files are left untouched and the charter's framing seeds the rollup's opener (the charter itself gets no standalone `unified-post.md`).

---

### User Story 3 — Composite posts cluster related standalone specs (Priority: P3)

For standalone (non-epic) shipped specs that ship within a 5-day window AND share ≥1 tag/topic, produce one composite post at `specs/[earliest-spec]/media/composite-post.md`. Members of a composite are excluded from per-spec generation.

**Why this priority**: Raises quality for loose thematic clusters without retroactively forcing them into the epic framework.

**Independent Test**: Given a known pair of temporally close, tag-overlapping shipped specs, verify the composite is produced at the earlier spec's media folder with both listed as members, and neither member gets a `unified-post.md`.

**Acceptance Scenarios**:

1. **Given** two specs shipped 3 days apart sharing the tag `filter-engine`, **When** the generator runs, **Then** a composite post is produced at the earlier spec's media folder listing both as members and no `unified-post.md` is produced for either.
2. **Given** two specs shipped 8 days apart with tag overlap, **When** the generator runs, **Then** they each get their own `unified-post.md` and the pair is listed under "Unresolved Groupings → Near Misses" in `ARCHIVE-REBUILD.md` for manual promotion.
3. **Given** two specs shipped 2 days apart with zero tag overlap, **When** the generator runs, **Then** no composite is produced and both get standalone `unified-post.md`.

---

### User Story 4 — Archive index for the website dev (Priority: P1)

Generate a single `ARCHIVE-REBUILD.md` at the repo root containing: a table of every regenerated post (slug, title, type, source path, original ship date, notes), an "Unresolved Groupings" section flagging charter/prefix mismatches and composite near-misses, and a runbook for the `debrief.github.io` maintainer (wipe `future` posts, copy these files, adjust front matter, deploy).

**Why this priority**: The handoff to the other team depends on this. Without the index, the website dev has to rediscover the archive shape.

**Independent Test**: Open `ARCHIVE-REBUILD.md` after a full run; every generated post file must appear as a row in the table; every flagged mismatch must have enough citation to be resolved without re-reading the generator source.

**Acceptance Scenarios**:

1. **Given** N generated posts across all three types, **When** the index is written, **Then** it contains exactly N rows (one per generated file) plus composite/rollup member summaries, and the runbook lists every step the website dev needs from wipe to deploy.
2. **Given** a charter–prefix mismatch, **When** the generator encounters it, **Then** the row appears under "Unresolved Groupings → Charter/Prefix Mismatches" citing both the charter path and the offending spec.
3. **Given** a near-miss composite candidate (5 < Δdays ≤ 10 with tag overlap), **When** the generator finishes, **Then** the pair appears under "Unresolved Groupings → Near Misses" with Δdays and shared tags listed.

---

### Edge Cases

- **No `shipped-post.md`, no merge PR**: In-flight spec → skipped (FR-005); skip recorded in the index so the website dev doesn't wonder if a known feature was missed.
- **No `evidence/opening-context.md`**: Synthesise opener from `spec.md`/`plan.md`/`research.md` (FR-006); flag the synthesis path in the index row so the author can verify the cold-open reads cleanly.
- **No `gh` / no GitHub API access**: Merge-PR description unavailable → degrade to using `shipped-post.md` as the PR-description proxy (Open Question resolved this way). Generator must NOT fail; log a warning per-spec and continue.
- **Epic charter with `planning-post.md`/`shipped-post.md` on disk**: Charter's own posts are left untouched (FR-007); only the charter's framing seeds the rollup's opener.
- **Charter directory not matching `NNN-epic-*`**: Legacy charters will be missed by auto-detection and members will fall back to `unified-post.md` generation; the index MUST call this out so the author can intervene.
- **Spec in both an epic member table AND a composite candidate window**: Epic membership wins (classification precedence: epic-member → composite-member → unified → skipped, per FR-001 ordering).
- **Tie on ship date for "earliest spec" in composite**: Break ties by ascending spec ID (the lower `NNN`).
- **Three-way composite candidate**: If A-B-C all pairwise qualify (within 5 days + ≥1 shared tag), produce one composite at the earliest of the three; all three are members.
- **Atomic run failure mid-generation**: Entire output directory/file set is discarded or reverted so the PR reviewer never sees partial state (NFR-001).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The generator MUST classify each shipped spec as exactly one of: `unified` (standalone), `epic-member` (absorbed into rollup), `composite-member` (absorbed into composite), or `skipped` (in-flight, no `shipped-post.md`). Classification precedence in ambiguous cases: `epic-member` → `composite-member` → `unified` → `skipped`.
- **FR-002**: Epic membership MUST be determined charter-first (member table in `NNN-epic-*/spec.md`), falling back to `[Ex]` title-prefix scan of shipped specs; mismatches (prefix-without-charter-entry, or charter-entry-without-prefix) MUST be flagged in `ARCHIVE-REBUILD.md`, not silently resolved.
- **FR-003**: Composite membership MUST require BOTH a 5-day ship-date proximity AND ≥1 tag/topic overlap. Thresholds are configurable in the script but the 5-day / ≥1-tag defaults are binding for the shipping run. Pairs that fall in the 5 < Δdays ≤ 10 band with tag overlap MUST be listed as "near misses" under Unresolved Groupings so the author can promote them manually.
- **FR-004**: Each generated post MUST use the `Building [Feature Name]` title pattern (standalone/composite) or a descriptive charter-derived title without prefix (epic rollup).
- **FR-005**: Each generated post MUST be dated to the feature's original ship date (from `shipped-post.md` front matter, falling back to PR merge date from the GitHub API). In-flight specs MUST NOT be dated to today — they are skipped entirely per FR-001.
- **FR-006**: The first three sections of every generated post MUST be copied verbatim from `evidence/opening-context.md` where present; when absent, synthesised from `spec.md`/`plan.md`/`research.md` and the fallback flagged in the index row.
- **FR-007**: The generator MUST NOT delete, modify, or overwrite any existing file in `specs/*/` — all generated content lives at new paths (`unified-post.md`, `epic-rollup.md`, `composite-post.md`). The only file created outside `specs/` is `ARCHIVE-REBUILD.md` at repo root.
- **FR-008**: The generator MUST produce `ARCHIVE-REBUILD.md` at repo root with (a) an index table of every generated post, (b) an "Unresolved Groupings" section covering charter/prefix mismatches and composite near-misses, and (c) a runbook instructing the `debrief.github.io` maintainer through wipe → copy → front-matter-adjust → deploy.
- **FR-009**: The generator MUST be implemented as a one-shot script (not a reusable command) and MUST be deleted in the same PR that commits its output.
- **FR-010**: The generator MUST read `spec.md`, `plan.md`, `research.md`, `evidence/`, existing `planning-post.md`, existing `shipped-post.md`, and the merge-PR description (via GitHub API, with graceful degradation when unavailable) for each spec it processes.
- **FR-011**: The run MUST be atomic — either all output files are produced and committed, or none are. The generator MUST detect mid-run failures and leave the working tree clean so the PR reviewer never sees partial state.

### Non-Functional Requirements

- **NFR-001**: The run must produce output suitable for a single PR review (no partial state; atomic run).
- **NFR-002**: No LinkedIn summaries are generated anywhere in this workstream (aspiration silently dropped).
- **NFR-003**: The regeneration PR MUST land *after* PR #511 (combine-articles-cache-specs) has merged to `main` so the `Building`-title template and `evidence/opening-context.md` contract are established before regeneration runs.
- **NFR-004**: Generator source code MUST live at a discoverable path (e.g., `scripts/regenerate-blog-archive.py` or similar) and MUST be referenced from the PR description so reviewers can inspect it before it is deleted.

### Key Entities

- **Shipped Spec**: A directory under `specs/NNN-<slug>/` containing at minimum `spec.md` and `shipped-post.md`. Source of truth for classification and content generation.
- **Charter Spec**: A `specs/NNN-epic-*/` directory whose `spec.md` contains an explicit member table enumerating constituent specs. Drives epic classification.
- **Generated Post**: A markdown file at `specs/NNN-<slug>/media/{unified,epic-rollup,composite}-post.md` with `Building …` (or charter-derived) title and original ship date.
- **Archive Index**: `ARCHIVE-REBUILD.md` at repo root containing the post table, unresolved-groupings, and runbook.
- **Unresolved Grouping**: A classification ambiguity (charter/prefix mismatch or composite near-miss) surfaced for author adjudication rather than silently resolved.

---

## Scope

**In scope**
- Unified posts for standalone shipped specs.
- Epic rollups for charter-driven groupings.
- Composite posts for temporally+thematically clustered standalone specs.
- `ARCHIVE-REBUILD.md` index with runbook for the website maintainer.
- One-shot generator script (deleted post-run).
- Atomic-run guarantee (no partial state).

**Out of scope**
- Modifying any existing `specs/*/media/*.md` or `specs/*/evidence/*` file.
- Wiping or publishing to `debrief.github.io` (handled by the website team per the runbook).
- LinkedIn content generation.
- Generating posts for in-flight (not-yet-shipped) specs.
- Preserving URL slugs from the existing published archive.
- Reusable / productised generator (explicit FR-009 — one-shot only).

---

## Dependencies

- **PR #511 (combine-articles-cache-specs)**: Establishes the `Building [Feature]` title pattern, the `evidence/opening-context.md` cached-opener contract, and the single-feature-post model. Must merge to `main` before regeneration runs.
- **GitHub API access** (`gh` CLI or equivalent): For merge-PR description retrieval. Generator degrades gracefully when unavailable (Open Question resolved — see Edge Cases).
- **Website team**: Receives `ARCHIVE-REBUILD.md`, wipes existing `future` blog posts on `debrief.github.io`, copies the generated files, adjusts front matter per the runbook, deploys.

---

## Assumptions

- The shipped portion of the archive is stable at run time — no new specs merge to `main` between the dry run and the final run. (If violated, a follow-up regeneration is cheap: the script is preserved in PR history.)
- `evidence/opening-context.md` exists for the majority of recent shipped specs (thanks to PR #511); older specs may need the synthesis fallback.
- Tags/topics for composite detection come from a consistent source across specs — front matter in `shipped-post.md` is the primary feed, with fallback to `spec.md` tag inference if absent.
- Charter specs follow `NNN-epic-*` directory naming; any legacy charter that doesn't is surfaced as an Unresolved Grouping for manual handling.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a single run, every shipped spec appears in `ARCHIVE-REBUILD.md` in exactly one of four states: unified, epic-member (under a rollup), composite-member (under a composite), or skipped (with reason). No spec appears twice; no spec is missing.
- **SC-002**: The website dev can execute the runbook in `ARCHIVE-REBUILD.md` end-to-end (wipe → copy → front-matter-adjust → deploy) without needing to ask the Future Debrief team a follow-up question. Verified by a pre-handoff walk-through.
- **SC-003**: Every generated post's first three sections match the corresponding `evidence/opening-context.md` byte-for-byte (where present), verified by a spot-check against three representative specs chosen at review time.
- **SC-004**: Zero existing files under `specs/*/` are modified by the run (diff-verified in the PR review — only additions of new files and deletion of the one-shot script).
- **SC-005**: Unresolved Groupings contains zero silent misclassifications — every charter/prefix mismatch and every 5 < Δdays ≤ 10 near-miss with tag overlap is surfaced, verified by cross-referencing the `[Ex]` grep output and the composite-pair candidate list against the index.
- **SC-006**: The PR is single-review-sized — reviewers can scan the index, spot-check 3–5 generated posts, and confirm the no-overwrite invariant without reading the generator source (though the source is available per NFR-004).

---

## Open Questions

These survive from the pre-specify interview. They do not block `/speckit.plan` but should be resolved during planning or the first dry-run.

- **Composite threshold tuning**: 5-day window and ≥1 shared tag are the binding defaults for the shipping run. The 5–10 day "near miss" band surfaces borderline pairs in the index rather than auto-grouping or silently dropping them. If the first dry run produces zero composites (everything ships >5 days apart) or too many (false positives from over-general tags), retune before the final run.
- **Tag-overlap source of truth**: Primary feed is `shipped-post.md` front matter; fallback is `spec.md` tag inference. If the fallback is noisy, constrain composite detection to specs that have explicit front-matter tags (skip the inference path).
- **Legacy charter detection**: The script identifies charter specs by directory name pattern (`NNN-epic-*`). If any charter exists without that naming (legacy), it will be missed and its members generated as standalones. The index flag on the offending members is the intervention hook — the author manually reclassifies pre-handoff.
