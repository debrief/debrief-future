# Feature Specification: Regenerate Blog Archive from Specs

**Feature Branch**: `228-regenerate-blog-archive`
**Created**: 2026-04-23
**Status**: Draft (pre-`/speckit.specify` — captures interview answers for the combine-articles workstream follow-up)
**Input**: User description: "Regenerate the Future Debrief blog archive: one unified 'Building [Feature]' post per shipped spec, epic rollups replacing per-spec posts for multi-spec arcs, composites grouping temporally- and thematically-related standalone specs. Produces an index for the `debrief.github.io` dev, who wipes and republishes `future` posts from scratch."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Generate unified per-spec posts (Priority: P1)

The generator reads each shipped standalone spec (`spec.md`, `plan.md`, `research.md`, `evidence/`, existing `planning-post.md`, existing `shipped-post.md`, merge-PR description) and produces a single `Building [Feature Name]` post that stitches the cached opener (first three sections) onto the ship-time narrative (Screenshots, By the Numbers, Lessons Learned, What's Next).

**Why this priority**: The bulk of the archive is standalone specs. This is the default path; everything else is refinement.

**Independent Test**: Run the generator against a single shipped spec (e.g., `spec-206`) and verify the output file at `specs/206-.../media/unified-post.md` contains all seven sections, has `title: "Building ..."`, and dates to the original ship date.

**Acceptance Scenarios**:

1. **Given** a shipped spec with cached opener + evidence, **When** the generator runs, **Then** `specs/NNN/media/unified-post.md` is written with the seven-section minimal stitch.
2. **Given** a spec lacking `evidence/opening-context.md`, **When** the generator runs, **Then** the opener is synthesised from `spec.md`/`plan.md`/`research.md` and the output notes the fallback.
3. **Given** a spec without `shipped-post.md` (in-flight), **When** the generator runs, **Then** it is skipped and no post file is written.

---

### User Story 2 — Epic rollup replaces per-spec posts (Priority: P2)

For each epic identified by its charter spec (`NNN-epic-*`) or `[Ex]` prefix scan, produce one rollup post at `specs/[charter]/media/epic-rollup.md` that absorbs the charter's framing and narrates the whole arc. Constituent specs are omitted from per-spec generation (no `unified-post.md` for them).

**Why this priority**: Epics tell a bigger story than their parts. Per-spec posts for epic members would fragment the narrative and duplicate context.

**Independent Test**: Run the generator on an epic (e.g., E02 log-recording: charter + `070`, `071`, `072`, `073`, `074`, `076`) and verify only one rollup file is produced, no `unified-post.md` exists for any member, and the rollup references all members.

**Acceptance Scenarios**:

1. **Given** a charter spec whose member table lists N specs, **When** the generator runs, **Then** one `epic-rollup.md` is produced and no member spec gets a `unified-post.md`.
2. **Given** a spec with `[Ex]` prefix but absent from its charter's member table (or vice versa), **When** the generator runs, **Then** the mismatch is flagged in the index under "Unresolved Groupings" for author adjudication.
3. **Given** an epic whose charter has its own `planning-post.md`/`shipped-post.md`, **When** the rollup is generated, **Then** those files are left untouched on disk but the charter's framing seeds the rollup's opener.

---

### User Story 3 — Composite posts cluster related standalone specs (Priority: P3)

For standalone (non-epic) shipped specs that ship within a 5-day window AND share ≥1 tag/topic, produce one composite post at `specs/[earliest-spec]/media/composite-post.md`. Members of a composite are excluded from per-spec generation.

**Why this priority**: Raises quality for loose thematic clusters without imposing the epic framework retroactively.

**Independent Test**: Given a known pair of temporally close, tag-overlapping shipped specs, verify the composite is produced with both as members and neither gets a `unified-post.md`.

**Acceptance Scenarios**:

1. **Given** two specs shipped 3 days apart sharing the tag `filter-engine`, **When** the generator runs, **Then** a composite is produced at the earliest spec's media folder.
2. **Given** two specs shipped 10 days apart (outside the window), **When** the generator runs, **Then** they each get their own `unified-post.md`; no composite (flag as "near miss" in Unresolved Groupings for author review).
3. **Given** two specs shipped close in time but with zero tag overlap, **When** the generator runs, **Then** no composite is produced.

---

### User Story 4 — Archive index for the website dev (Priority: P1)

Generate a single `ARCHIVE-REBUILD.md` at the repo root containing: a table of every regenerated post (slug, title, type, source path, original ship date, notes), an "Unresolved Groupings" section flagging charter/prefix mismatches, and a runbook for the `debrief.github.io` maintainer (wipe `future` posts, copy these files, adjust front matter, deploy).

**Why this priority**: The handoff to the other team depends on this. Without the index, the dev has to rediscover the archive shape.

**Independent Test**: Open `ARCHIVE-REBUILD.md` after a full run; every generated post file must appear as a row in the table; every flagged mismatch must have a proposed resolution.

**Acceptance Scenarios**:

1. **Given** N generated posts, **When** the index is written, **Then** it contains exactly N rows plus any composite/rollup entries.
2. **Given** a charter–prefix mismatch, **When** the generator encounters it, **Then** the row appears under "Unresolved Groupings" with enough context to resolve it.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The generator MUST classify each shipped spec as one of: `unified` (standalone), `epic-member` (absorbed into rollup), `composite-member` (absorbed into composite), or `skipped` (in-flight, no `shipped-post.md`).
- **FR-002**: Epic membership MUST be determined charter-first (member table in `NNN-epic-*/spec.md`), falling back to `[Ex]` prefix scan of spec titles/inputs; mismatches MUST be flagged, not silently resolved.
- **FR-003**: Composite membership MUST require BOTH a 5-day ship-date proximity AND ≥1 tag/topic overlap; thresholds configurable in the script but defaults are binding. Pairs that fall just outside the window (5 < Δdays ≤ 10) with tag overlap MUST be listed as "near misses" under Unresolved Groupings so the author can promote them manually.
- **FR-004**: Each generated post MUST use the `Building [Feature Name]` title pattern (standalone/composite) or a descriptive charter-derived title (epic rollup).
- **FR-005**: Each generated post MUST be dated to the feature's original ship date (from `shipped-post.md` front matter or PR merge date); no in-flight specs are dated to today (they are skipped).
- **FR-006**: The first three sections of every generated post MUST be copied verbatim from `evidence/opening-context.md` where present; when absent, synthesised from `spec.md`/`plan.md`/`research.md` and the fallback noted in the index.
- **FR-007**: The generator MUST NOT delete, modify, or overwrite any existing file in `specs/*/` — all generated content lives at new paths (`unified-post.md`, `epic-rollup.md`, `composite-post.md`).
- **FR-008**: The generator MUST produce `ARCHIVE-REBUILD.md` at repo root with an index table, unresolved-groupings section, and website-maintainer runbook.
- **FR-009**: The generator MUST be implemented as a one-shot script (not a reusable command); the script is deleted in the same PR it runs in.
- **FR-010**: The generator MUST read `spec.md`, `plan.md`, `research.md`, `evidence/`, existing `planning-post.md`, existing `shipped-post.md`, and the merge-PR description (via GitHub API) for each spec it processes.

### Non-Functional Requirements

- **NFR-001**: The run must produce output suitable for a single PR review (no partial state; atomic run).
- **NFR-002**: No LinkedIn summaries are generated (LinkedIn posting aspiration silently dropped per PR #TBD).
- **NFR-003**: The regeneration PR MUST land *after* the workflow PR (combine-articles-cache-specs) so the `Building`-title template and `evidence/opening-context.md` contract are established.

---

## Scope

**In scope**
- Unified posts for standalone shipped specs.
- Epic rollups for charter-driven groupings.
- Composite posts for temporally+thematically clustered standalone specs.
- `ARCHIVE-REBUILD.md` index with runbook for the website maintainer.
- One-shot generator script (deleted post-run).

**Out of scope**
- Modifying any existing `specs/*/media/*.md` or `specs/*/evidence/*` file.
- Wiping or publishing to `debrief.github.io` (handled by the website team per the runbook).
- LinkedIn content generation.
- Generating posts for in-flight (not-yet-shipped) specs.
- Preserving URL slugs from the existing published archive.

---

## Dependencies

- **Workflow PR** (`claude/combine-articles-cache-specs-EaJ9U` — this branch): Establishes the `Building [Feature]` title pattern, the `evidence/opening-context.md` cached-opener contract, and the single-feature-post model that this regeneration assumes.
- **Website team**: Receives `ARCHIVE-REBUILD.md`, wipes the existing `future` blog posts on `debrief.github.io`, copies the generated files, adjusts front matter per the runbook, deploys.

---

## Open Questions

These are captured from the interview but may need revisiting at `/speckit.specify` time:

- **Composite threshold tuning**: 5-day window and ≥1 shared tag are defaults (tightened from an initial 14-day proposal — related non-epic specs historically land within a couple of days, rarely beyond a week). A 5–10 day "near miss" band surfaces borderline pairs in the index rather than auto-grouping or silently dropping them. If the first dry run produces too many/few composites, these thresholds may need adjustment before final generation.
- **Merge-PR description retrieval**: For the "everything" source feed, accessing merged PR descriptions requires GitHub API access during the run. If the script runs in an environment without `gh`, the generator must degrade gracefully (use `shipped-post.md` as the PR-description proxy).
- **Charter auto-detection**: The script identifies charter specs by directory name pattern (`NNN-epic-*`). If any charter exists without that naming (legacy), it will be missed and its members generated as standalones. An index-time flag lets the author intervene.

---

## Interview Record

Decisions captured during the scoping interview (2026-04-23):

| # | Decision |
|---|----------|
| Q1 | Hybrid unit: per-spec standalone + epic rollup (replaces constituents) |
| Q2 | Website team wipes existing `future` posts; no slug preservation |
| Q3 | Original ship dates preserved; in-flight specs get no post |
| Q4 | In-flight specs skipped entirely |
| Q5 | Charter-first epic detection, `[Ex]` fallback, mismatches flagged |
| Q6 | Epic charter absorbed into rollup (no standalone charter post) |
| Q7 | Full context feed: spec/plan/research/evidence/old posts/PR description |
| Q8 | Fully automated batch; review as PR |
| Q9 | Single big PR on `debrief-future` + handoff instructions for website dev |
| Q10 | Posts live alongside source specs with new filenames (no overwrites) |
| Q11 | Epic titles derived descriptively from charter (no prefix) |
| Q12 | One-shot script, deleted in same PR |
| Q13 | Nothing deleted on `debrief-future`; website team handles wipe |
| Q14 | Single `ARCHIVE-REBUILD.md` at repo root combining index + runbook |
| Q15 | Composite detection: time window AND tag overlap (AND-gated); 5-day window default, 5–10 day "near miss" surfaced in index |
| Q16 | Composite post location: `specs/[earliest-spec]/media/composite-post.md` |
| Q17 | No LinkedIn generation anywhere (silent drop) |
