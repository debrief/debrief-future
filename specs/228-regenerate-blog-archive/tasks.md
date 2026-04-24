# Tasks: Regenerate Blog Archive from Specs

**Input**: Design documents from `/specs/228-regenerate-blog-archive/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli.md, quickstart.md

**Feature type**: CLI / one-shot script (infrastructure). No UI components, no VS Code workflows, no Storybook stories.
**Tests**: REQUIRED. The script is deleted in the same PR that commits its output (FR-009), so tests must be green during review. C1–C11 contract tests from `contracts/cli.md` are explicitly enumerated below.
**Script lifetime**: `scripts/regenerate-blog-archive.py` + `tests/regenerate_blog_archive/` exist only for this PR and are removed in the final commit before PR creation.

---

## Evidence Requirements

> **Purpose**: Capture artefacts that prove the generator ran correctly, that no existing files were mutated, and that the handoff artefact (`ARCHIVE-REBUILD.md`) is complete enough for the debrief.github.io maintainer to execute without follow-up questions.

**Evidence Directory**: `specs/228-regenerate-blog-archive/evidence/`
**Media Directory**: `specs/228-regenerate-blog-archive/media/`

### Planned Artefacts

| Artefact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | pytest results for the 11 contract tests + unit tests; YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct` | After all tests pass (end of Phase 7) |
| `evidence/usage-example.md` | Full `quickstart.md`-style walkthrough with actual stdout summary block pasted in from the real run | After the real run succeeds |
| `evidence/cli-demo.txt` | Terminal session transcript — dry-run then real run — showing stdout/stderr | After the real run succeeds |
| `evidence/help-output.txt` | `python scripts/regenerate-blog-archive.py --help` output | After Phase 1 |
| `evidence/dry-run-index.md` | Copy of the `--dry-run` would-be index BEFORE the real run (used to spot-check unresolved groupings) | After dry-run validation |
| `evidence/run-log.txt` | The structured log file embedded in the `<details>` block of `ARCHIVE-REBUILD.md` (extracted for standalone review) | After the real run succeeds |
| `evidence/no-overwrite-proof.md` | sha256 checksums of `specs/*/` files before and after; diff shows only additions | After the real run succeeds |
| `evidence/corpus-coverage.md` | One row per spec directory × classification bucket; verifies SC-001 (every spec classified exactly once) | After the real run succeeds |
| `evidence/opening-context.md` | **Already present** — cached opener captured during `/speckit.plan` | — |

### Media Content

| Artefact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (What We're Building, How It Fits, Key Decisions) | During `/speckit.plan` ✅ |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with evidence, index, ~95 generated posts; script + tests deleted in final commit | Final task in Polish phase |
| Blog PR | PR in `debrief.github.io` with `media/shipped-post.md` | Triggered by `/speckit.pr` |

### Feature-specific evidence note

The generator's **output itself** (the index + generated posts) is primary evidence — `ARCHIVE-REBUILD.md` at repo root serves as the live artefact and is inspected by the PR reviewer per SC-006. The files above document the *run* that produced it.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the one-shot script scaffold, its test package, and the review-phase-patches to plan/research/data-model identified during `/speckit.review`.

- [x] T001 Apply review patch 1 (legacy shipped-post locator) — widen R7 language in `specs/228-regenerate-blog-archive/research.md`
- [x] T002 [P] Apply review patch 3 (stitch rule for tense-inverted twin heading) in `specs/228-regenerate-blog-archive/data-model.md`
- [x] T003 [P] Apply review patch 4 (add C11 malformed-YAML contract test row) in `specs/228-regenerate-blog-archive/contracts/cli.md`
- [x] T004 [P] Apply review patch 5 (correct factual numbers: 138 opening-context, 18 missing cached opener) in `specs/228-regenerate-blog-archive/research.md`
- [x] T005 [P] Apply review patch 1 companion note in `specs/228-regenerate-blog-archive/plan.md`
- [x] T006 Create script scaffold with docstring + `if __name__ == "__main__": main()` entrypoint `scripts/regenerate-blog-archive.py`
- [x] T007 [P] Create test package init `tests/regenerate_blog_archive/__init__.py`
- [x] T008 [P] Create test fixtures directory with README explaining fixture curation `tests/regenerate_blog_archive/fixtures/README.md`

**Checkpoint**: Review patches applied; script file + test package exist with empty placeholders. Foundation phase can begin.

---

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared typed building blocks every user story consumes — dataclasses, parsers, spec discovery, the atomic writer, and the CLI argument surface. Nothing in User Story phases can land without these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Typed domain models

- [x] T009 [P] Define `FrontMatter` dataclass with typed fields + noise-tag filter at parsing boundary `scripts/regenerate-blog-archive.py`
- [x] T010 [P] Define `SpecRecord`, `Epic`, `Classification`, `CompositeCluster`, `NearMiss`, `UnresolvedGrouping`, `GeneratedPost`, `ArchiveIndex` dataclasses per `data-model.md` `scripts/regenerate-blog-archive.py`

### CLI argument surface

- [x] T011 Implement argparse surface per `contracts/cli.md` (all flags + constraint validation + exit-code-2 on bad args) `scripts/regenerate-blog-archive.py`
- [x] T012 [P][test] Write C2 contract test — exit 2 on invalid `--composite-window-days` `tests/regenerate_blog_archive/test_cli_args.py`
- [x] T013 [P][test] Write C3 contract test — exit 2 on `--out-index` pointing at existing non-index file `tests/regenerate_blog_archive/test_cli_args.py`

### YAML front-matter parser

- [x] T014 Implement `parse_front_matter(path: Path) -> FrontMatter` using `yaml.safe_load` at the boundary — filters noise tags `{tracer-bullet, shipped, debrief}` before constructing `FrontMatter` `scripts/regenerate-blog-archive.py`
- [x] T015 [P][test] Write parser unit tests — happy path + missing `title` + missing `date` + track as string vs list `tests/regenerate_blog_archive/test_parse_front_matter.py`
- [x] T016 [test] Write C11 contract test — malformed YAML becomes `UnresolvedGrouping`, run continues, no crash `tests/regenerate_blog_archive/test_parse_front_matter.py`
- [x] T017 [P] Curate fixture: one valid shipped-post front matter `tests/regenerate_blog_archive/fixtures/shipped-post-valid.md`
- [x] T018 [P] Curate fixture: malformed shipped-post front matter (unquoted colon in title) `tests/regenerate_blog_archive/fixtures/shipped-post-malformed.md`

### Spec discovery

- [x] T019 Implement `discover_specs(repo_root: Path) -> list[SpecRecord]` — walks `specs/*/`, locates shipped-post via R7 rule (matches `media/shipped-post.md` OR `media/YYYY-MM-DD-shipped-*.md`; latest ISO date wins) `scripts/regenerate-blog-archive.py`
- [x] T020 [test] Write test — legacy date-stamped naming recognised (covers 000-schemas, 001-debrief-stac, 002-debrief-io — fixes the Issue 1 silent-failure gap) `tests/regenerate_blog_archive/test_discover_specs.py`
- [x] T021 [P][test] Write test — multiple legacy shipped posts in one dir → latest ISO date wins `tests/regenerate_blog_archive/test_discover_specs.py`
- [x] T022 [P][test] Write test — spec directory with no spec.md is skipped quietly (not an error) `tests/regenerate_blog_archive/test_discover_specs.py`
- [x] T023 [P] Curate fixture: synthetic legacy-named spec dir `tests/regenerate_blog_archive/fixtures/specs/legacy-dated/`

### Ship-date resolver

- [x] T024 Implement three-tier ship-date resolver per R2 — front-matter → `gh pr list --search` → `git log -1 --format=%cI` `scripts/regenerate-blog-archive.py`
- [x] T025 [P][test] Write test — tier-1 (front matter present) `tests/regenerate_blog_archive/test_ship_date.py`
- [x] T026 [P][test] Write test — tier-3 fallback (no front matter, no gh) produces git-log date and records `date_source=git-log` `tests/regenerate_blog_archive/test_ship_date.py`

### PR-body retriever with graceful degradation

- [x] T027 Implement `get_pr_body(spec: SpecRecord) -> tuple[str, Literal["gh","shipped-post","missing"]]` — 5 s timeout, catches missing-gh / non-zero / empty, returns source tag per R6 `scripts/regenerate-blog-archive.py`
- [x] T028 [test] Write C6 contract test — `--skip-gh` forces `pr-body=shipped-post` for every spec `tests/regenerate_blog_archive/test_pr_body.py`
- [x] T029 [P][test] Write test — missing `gh` binary produces `pr-body=shipped-post`, not a crash `tests/regenerate_blog_archive/test_pr_body.py`

### Atomic writer (stage-and-promote)

- [x] T030 Implement `AtomicWriter` context manager — `tempfile.mkdtemp(prefix="archive-rebuild-")`, promote via `shutil.move`, rollback on any exception per R5 `scripts/regenerate-blog-archive.py`
- [x] T031 [test] Write C1 contract test — `--dry-run` stages but does NOT promote `tests/regenerate_blog_archive/test_atomic_writer.py`
- [x] T032 [P][test] Write C5 contract test — zero existing files mutated (sha256 of `specs/*/` before/after identical except for new files) `tests/regenerate_blog_archive/test_atomic_writer.py`
- [x] T033 [P][test] Write no-overwrite guard test — attempt to stage a path that already exists → raise → rollback `tests/regenerate_blog_archive/test_atomic_writer.py`
- [x] T034 [P][test] Write rollback test — exception during stage leaves temp dir removed and repo untouched `tests/regenerate_blog_archive/test_atomic_writer.py`

### Run orchestrator skeleton

- [x] T035 Implement `main()` orchestrator — wires discover → classify (placeholder for US phases) → promote → emit index; uses `AtomicWriter`; honours `--fail-fast` vs continue `scripts/regenerate-blog-archive.py`
- [x] T036 [test] Write C4 contract test — `--fail-fast` exits 1 on first parse error; default continues and records UnresolvedGrouping `tests/regenerate_blog_archive/test_classify.py`

### Help output evidence

- [x] T037 Run `python scripts/regenerate-blog-archive.py --help` and capture stdout `specs/228-regenerate-blog-archive/evidence/help-output.txt`

**Checkpoint**: Typed models, CLI surface, parser, discovery, date resolver, PR-body retriever, atomic writer all green. User story phases can now start **in parallel** (they only touch the classifier branches, not the foundation).

### Parallel example (Phase 2)

Once T011 (argparse) + T014 (parser) + T019 (discovery) + T030 (atomic writer) are implemented, their test tasks all run against isolated fixture dirs and are fully parallel:

```bash
Task: "Run test_cli_args.py"
Task: "Run test_parse_front_matter.py"
Task: "Run test_discover_specs.py"
Task: "Run test_ship_date.py"
Task: "Run test_pr_body.py"
Task: "Run test_atomic_writer.py"
```

---

---

## Phase 3: User Story 1 — Unified per-spec posts (Priority: P1)

**Goal**: Produce `specs/NNN-<slug>/media/unified-post.md` for every shipped standalone spec, stitching the cached opener (first three sections) onto the ship-time narrative (Screenshots, By the Numbers, Lessons Learned, What's Next).

**Independent Test**: Run the generator against a single shipped spec (e.g., `206-audit-non-linkml-types`) and verify:
- `specs/206-audit-non-linkml-types/media/unified-post.md` exists
- Front matter has `title: "Building ..."`, `layout: future-post`, `author: Ian`, `track: [...]`, `date` equal to the original ship date (from `shipped-post.md` front matter — NOT today)
- First three sections are byte-for-byte copies of `specs/206-audit-non-linkml-types/evidence/opening-context.md`
- Sections 4–7 read coherently with the stitch rule applied (tense-inverted twin heading handled)
- No file outside `specs/206-audit-non-linkml-types/media/` is touched

### Opener-loader + synthesis fallback

- [x] T038 [US1] Implement `load_or_synthesise_opener(spec: SpecRecord) -> tuple[str, Literal["cached","synthesised"]]` — verbatim copy when `evidence/opening-context.md` exists; synthesise three deterministic slices per R4 when absent `scripts/regenerate-blog-archive.py`
- [x] T039 [P][US1][test] Write test — cached opener copied byte-for-byte (no mutation, no added whitespace) `tests/regenerate_blog_archive/test_opener.py`
- [x] T040 [P][US1][test] Write test — synthesis fallback produces three sections AND prepends the `<!-- OPENER SYNTHESISED FROM spec.md — verify before publish -->` marker `tests/regenerate_blog_archive/test_opener.py`
- [x] T041 [P][US1] Curate fixture: spec with full `evidence/opening-context.md` `tests/regenerate_blog_archive/fixtures/specs/with-opener/`
- [x] T042 [P][US1] Curate fixture: spec with NO opening-context, forcing synthesis `tests/regenerate_blog_archive/fixtures/specs/no-opener/`

### Seven-section stitcher

- [x] T043 [US1] Implement `stitch_unified_post(spec: SpecRecord, opener: str, opener_source: Literal) -> GeneratedPost` — assembles front matter + opener + sections 4–7 from shipped-post body with the tense-inverted-twin-heading rule per data-model.md `scripts/regenerate-blog-archive.py`
- [x] T044 [P][US1][test] Write test — `## What We Built` immediately after opener is detected as twin and its opening paragraph spliced onto `## Key Decisions` tail `tests/regenerate_blog_archive/test_stitch.py`
- [x] T045 [P][US1][test] Write test — optional sections (`## Screenshots`, `## By the Numbers`) omitted when source lacks them (no empty scaffolding) `tests/regenerate_blog_archive/test_stitch.py`
- [x] T046 [P][US1][test] Write test — title pattern is exactly `Building <Feature Name>` derived from shipped-post title (strip leading `Shipped: ` / `Planning: `) `tests/regenerate_blog_archive/test_stitch.py`
- [x] T047 [P][US1][test] Write test — front matter preserves original `date`, `track`, `author`, `excerpt` and sets `layout: future-post` `tests/regenerate_blog_archive/test_stitch.py`
- [x] T048 [P][US1][test] Write C5 round-trip test — stitching a spec whose shipped-post already exists produces a new file at `media/unified-post.md` and leaves `shipped-post.md` identical `tests/regenerate_blog_archive/test_stitch.py`

### Unified classifier branch

- [x] T049 [US1] Implement `classify_unified(specs: list[SpecRecord]) -> list[Classification]` — returns `category="unified"` for specs surviving epic + composite precedence (placeholder for now; wired up fully after US2/US3) `scripts/regenerate-blog-archive.py`
- [x] T050 [US1][test] Write test — spec with `shipped-post.md` and no epic/composite membership classifies as `unified` `tests/regenerate_blog_archive/test_classify.py`
- [x] T051 [US1][test] Write test — spec with `evidence/opening-context.md` but no `shipped-post.md` AND no legacy-dated shipped file classifies as `skipped` (no post generated, reason recorded) `tests/regenerate_blog_archive/test_classify.py`

### US1 integration smoke

- [x] T052 [US1] Wire US1 path into `main()` — iterate classified-unified specs, call `stitch_unified_post`, stage each `GeneratedPost` via `AtomicWriter` `scripts/regenerate-blog-archive.py`
- [x] T053 [US1] Run `python scripts/regenerate-blog-archive.py --dry-run` against the live `specs/` tree and confirm unified counts look sane (~90–100 expected) — capture stdout summary for later evidence `(run command)`

**Checkpoint**: US1 produces unified posts for every standalone shipped spec. US2 (epics) and US3 (composites) can now whittle this set down.

---

---

## Phase 4: User Story 2 — Epic rollup replaces per-spec posts (Priority: P2)

**Goal**: For each **complete** epic identified primarily by `BACKLOG.md`'s Epics table (per R1), produce one `epic-rollup.md` at the media folder of the lowest-`NNN` member spec and remove member specs from the unified bucket.

**Independent Test**: Run the generator on E02 (PROV Logging, members: 070, 071, 072, 073, 074, 075, 076) and verify:
- Exactly one `epic-rollup.md` exists at `specs/070-prov-schema-foundation/media/epic-rollup.md`
- No `unified-post.md` exists for any E02 member
- Rollup title is charter-derived (no `Building` prefix — per interview Q11)
- Every E02 member is referenced in the rollup body
- `[Ex]` / BACKLOG mismatches for E02 (if any) appear in the classifier's `UnresolvedGrouping` list

### Epic charter parser

- [x] T054 [US2] Implement `parse_backlog_epics(backlog_path: Path) -> list[Epic]` — parses the Epics table between `## Epics` and next `##`, strips `~~strike~~`, resolves member numbers to `SpecRecord` directories `scripts/regenerate-blog-archive.py`
- [x] T055 [P][US2][test] Write test — BACKLOG table round-trip (known E02 / E08 produce expected member tuples) `tests/regenerate_blog_archive/test_epic_charter.py`
- [x] T056 [P][US2][test] Write test — stricken / complete epics still parsed (status = `complete`) `tests/regenerate_blog_archive/test_epic_charter.py`
- [x] T057 [P][US2][test] Write test — in-progress epics (status != `complete`) emit no rollup; their shipped members fall through to unified `tests/regenerate_blog_archive/test_epic_charter.py`
- [x] T058 [P][US2] Curate fixture: BACKLOG-excerpt with E02 + E99 (synthetic proposed) `tests/regenerate_blog_archive/fixtures/backlog-excerpt.md`

### `[Ex]` prefix scan + mismatch detection

- [x] T059 [US2] Implement `scan_ex_prefixes(specs: list[SpecRecord]) -> dict[str, list[SpecRecord]]` — groups specs by `[Ex]` prefix in spec.md title/Input `scripts/regenerate-blog-archive.py`
- [x] T060 [US2] Implement `detect_charter_prefix_mismatches(epics, prefixes) -> list[UnresolvedGrouping]` — flags both directions: prefix-without-BACKLOG-entry AND BACKLOG-entry-without-prefix `scripts/regenerate-blog-archive.py`
- [x] T061 [P][US2][test] Write test — spec with `[E02]` prefix but absent from E02 `Items` column → surfaced as `charter-prefix-mismatch` `tests/regenerate_blog_archive/test_epic_charter.py`
- [x] T062 [P][US2][test] Write test — BACKLOG lists spec 999 (no directory) → surfaced as `missing-charter-member` `tests/regenerate_blog_archive/test_epic_charter.py`
- [x] T063 [P][US2][test] Write test — `legacy-charter` detection (epic in BACKLOG with no `docs/ideas/Exx-*.md` AND no `[Ex]` member prefix) `tests/regenerate_blog_archive/test_epic_charter.py`

### Rollup stitcher

- [x] T064 [US2] Implement `stitch_epic_rollup(epic: Epic, members: list[SpecRecord]) -> GeneratedPost` — title derived from `Epic.title` (no `Building` prefix), opener from `docs/ideas/Exx-*.md` when present else `Epic.description`, body references every member (with link), date = latest member ship date `scripts/regenerate-blog-archive.py`
- [x] T065 [P][US2][test] Write C10 contract test — rollup lands at `specs/<lowest-NNN-member>/media/epic-rollup.md` `tests/regenerate_blog_archive/test_epic_charter.py`
- [x] T066 [P][US2][test] Write test — title does NOT start with `Building `; instead uses `Epic.title` verbatim `tests/regenerate_blog_archive/test_epic_charter.py`
- [x] T067 [P][US2][test] Write test — every member spec referenced in body (member count == link count) `tests/regenerate_blog_archive/test_epic_charter.py`
- [x] T068 [P][US2][test] Write test — charter's own `planning-post.md` / `shipped-post.md` on disk are untouched (spec Scenario 3) `tests/regenerate_blog_archive/test_epic_charter.py`

### Classifier precedence (epic wins)

- [x] T069 [US2] Update classifier to apply precedence: `epic-member` wins over `composite-member` / `unified` (FR-001) `scripts/regenerate-blog-archive.py`
- [x] T070 [US2][test] Write test — spec in both an E02 member table AND within 5 days of another shipped spec → classifies as `epic-member`, not `composite-member` (spec edge case) `tests/regenerate_blog_archive/test_classify.py`

### US2 integration smoke

- [x] T071 [US2] Wire US2 path into `main()` — emit one rollup per complete epic, remove member specs from unified bucket `scripts/regenerate-blog-archive.py`
- [x] T072 [US2] Run `python scripts/regenerate-blog-archive.py --dry-run` and confirm expected rollups (E02, E05, E08 at least; possibly E04) appear in summary `(run command)`

**Checkpoint**: US1 + US2 complete. Shipped standalone specs have unified posts; complete epics have rollups; members deduplicated.

---

---

## Phase 5: User Story 3 — Composite posts cluster related standalone specs (Priority: P3)

**Goal**: Cluster standalone (non-epic) shipped specs that ship within 5 days of each other AND share ≥1 non-noise tag into a single `composite-post.md` at the lowest-`NNN` member's media folder. Surface 6–10 day "near misses" with tag overlap in the index for manual promotion.

**Independent Test**: Feed two specs shipped 3 days apart sharing tag `filter-engine` and verify:
- A single composite-post.md exists at the earlier spec's media folder
- Neither spec has a unified-post.md
- Composite title starts with `Building `
- Both members referenced in body
- No near-miss entry generated for this pair (since they ARE a composite)

### Composite pair detector

- [x] T073 [US3] Implement `find_composite_pairs(specs: list[SpecRecord], window_days: int) -> list[tuple[SpecRecord, SpecRecord, frozenset[str]]]` — pairs within ≤N days with ≥1 shared tag (after noise filter already applied at parse boundary) `scripts/regenerate-blog-archive.py`
- [x] T074 [P][US3][test] Write C9 contract test — pair with date span = 5 days (boundary inclusive) → qualifies `tests/regenerate_blog_archive/test_composite_pairs.py`
- [x] T075 [P][US3][test] Write test — pair 2 days apart with zero non-noise tag overlap → no composite, no near-miss (noise-only matches must not qualify) `tests/regenerate_blog_archive/test_composite_pairs.py`
- [x] T076 [P][US3][test] Write test — pair with both specs lacking non-noise tags → no composite, no near-miss (zero signal) `tests/regenerate_blog_archive/test_composite_pairs.py`

### Union-find clusterer

- [x] T077 [US3] Implement `cluster_composites(pairs) -> list[CompositeCluster]` — transitive union-find so A↔B + B↔C becomes one 3-member cluster rooted at lowest-`NNN` `scripts/regenerate-blog-archive.py`
- [x] T078 [P][US3][test] Write test — three-way cluster (A-B + B-C qualify, A-C does not pairwise) lands as one composite at A `tests/regenerate_blog_archive/test_composite_pairs.py`
- [x] T079 [P][US3][test] Write test — tie on ship date for lowest-NNN anchor resolves to the lower `NNN` `tests/regenerate_blog_archive/test_composite_pairs.py`
- [x] T080 [P][US3][test] Write test — cluster size > 5 emits a warning to stderr (tag-filter tuning alarm) `tests/regenerate_blog_archive/test_composite_pairs.py`

### Near-miss detector

- [x] T081 [US3] Implement `find_near_misses(specs, composite_window, near_miss_max) -> list[NearMiss]` — pairs in `(composite_window, near_miss_max]` day band with ≥1 shared non-noise tag, not already in a cluster `scripts/regenerate-blog-archive.py`
- [x] T082 [P][US3][test] Write C8 contract test — pair at Δ=7 days with shared tag produces one `NearMiss`, not a composite `tests/regenerate_blog_archive/test_composite_pairs.py`
- [x] T083 [P][US3][test] Write test — pair at Δ=11 days (above near-miss max) produces nothing — neither composite nor near-miss `tests/regenerate_blog_archive/test_composite_pairs.py`

### Composite stitcher

- [x] T084 [US3] Implement `stitch_composite_post(cluster: CompositeCluster) -> GeneratedPost` — title `Building <theme>` derived from shared tags, opener combines each member's cached opener (or synthesis fallback), body lists each member and links to them, date = earliest member ship date `scripts/regenerate-blog-archive.py`
- [x] T085 [P][US3][test] Write test — composite lands at `specs/<lowest-NNN-anchor>/media/composite-post.md` `tests/regenerate_blog_archive/test_composite_pairs.py`
- [x] T086 [P][US3][test] Write test — title starts with `Building ` (unified/composite contract) `tests/regenerate_blog_archive/test_composite_pairs.py`
- [x] T087 [P][US3][test] Write test — every cluster member appears in the body (link count == cluster size) `tests/regenerate_blog_archive/test_composite_pairs.py`

### Classifier precedence (composite wins over unified)

- [x] T088 [US3] Update classifier — cluster members become `composite-member`, removed from `unified` bucket. Epic membership still trumps (from US2) `scripts/regenerate-blog-archive.py`
- [x] T089 [US3][test] Write test — spec that qualifies for both a composite pair AND is an epic member classifies as `epic-member` (FR-001 precedence) `tests/regenerate_blog_archive/test_classify.py`

### US3 integration smoke

- [x] T090 [US3] Wire US3 path into `main()` — emit one composite per cluster, emit `NearMiss` records to pass to the index (US4) `scripts/regenerate-blog-archive.py`
- [x] T091 [US3] Run `python scripts/regenerate-blog-archive.py --dry-run` and confirm composite counts + near-miss list look sane (if zero composites, that's acceptable per Open Question — retune thresholds is a dry-run-tuning activity, not a code fix) `(run command)`

**Checkpoint**: All classification branches done. Every spec is in exactly one of: unified / epic-member / composite-member / skipped. Ready to emit the index.

---

---

## Phase 6: User Story 4 — Archive index + runbook (Priority: P1, depends on US1–US3)

**Goal**: Emit `ARCHIVE-REBUILD.md` at repo root containing (a) an index table of every generated post, (b) an Unresolved Groupings section covering charter/prefix mismatches + composite near-misses, (c) a runbook instructing the `debrief.github.io` maintainer through wipe → copy → front-matter-adjust → deploy, and (d) a `<details>` block with the raw run log.

**Independent Test**: After a full run, open `ARCHIVE-REBUILD.md` and verify:
- Every generated post file appears as one row in the index table
- Every skipped spec appears in the Skipped sub-section
- Every charter/prefix mismatch, legacy charter, future-date anomaly, and near-miss pair appears under Unresolved Groupings with enough citation to resolve without re-running
- The runbook contains all four steps (wipe / copy / front-matter / deploy)
- Run metadata block shows Python version + `gh` status + start/end timestamps (reproducibility per Constitution I.4)

### Index serialiser

- [x] T092 [US4] Implement `serialise_archive_index(index: ArchiveIndex) -> str` — produces the full ARCHIVE-REBUILD.md body per data-model.md serialisation contract: H1 + run metadata + index table + skipped sub-section + unresolved groupings + runbook + `<details>` raw log `scripts/regenerate-blog-archive.py`
- [x] T093 [P][US4][test] Write C7 contract test — every `GeneratedPost` appears as exactly one row; every skipped spec appears once under Skipped `tests/regenerate_blog_archive/test_index.py`
- [x] T094 [P][US4][test] Write test — Unresolved Groupings section has one sub-heading per `kind` (charter-prefix-mismatch, legacy-charter, near-miss, missing-charter-member, future-date) `tests/regenerate_blog_archive/test_index.py`
- [x] T095 [P][US4][test] Write test — runbook contains the four canonical steps (wipe / copy / front-matter / deploy) verbatim `tests/regenerate_blog_archive/test_index.py`
- [x] T096 [P][US4][test] Write test — index columns present: `Spec | Category | Title | Date | Generated Path | Opener | PR Body Source | Notes` `tests/regenerate_blog_archive/test_index.py`
- [x] T097 [P][US4][test] Write test — every index row cites `opener_source` (cached / synthesised / charter-framing) and `pr_body_source` (gh / shipped-post / missing) `tests/regenerate_blog_archive/test_index.py`

### Run-log embedding

- [x] T098 [US4] Implement run-log capture — write all classifier decisions to `<temp-dir>/run.log` during the run, append into a `<details>` block at the bottom of `ARCHIVE-REBUILD.md` on success `scripts/regenerate-blog-archive.py`
- [x] T099 [P][US4][test] Write test — run-log captured in dry-run mode is equivalent to real-run for the same input (reproducibility) `tests/regenerate_blog_archive/test_index.py`

### SC-001 verifier

- [x] T100 [US4] Implement `assert_coverage_invariant(specs, generated_posts, skipped_specs, clusters, epics)` — raises if any spec appears in more than one bucket or is missing entirely; called at end of classification before staging `scripts/regenerate-blog-archive.py`
- [x] T101 [US4][test] Write test — planted double-classification (spec in both epic and composite) is detected and raises, not silently ignored `tests/regenerate_blog_archive/test_classify.py`
- [x] T102 [US4][test] Write test — planted missing-classification (spec present on disk but not in any bucket) is detected and raises `tests/regenerate_blog_archive/test_classify.py`

### Stdout summary block

- [x] T103 [US4] Implement `print_summary(index: ArchiveIndex)` — prints the exact summary block format from contracts/cli.md (copy-pasteable into PR description) `scripts/regenerate-blog-archive.py`
- [x] T104 [P][US4][test] Write test — summary counts match index rows (e.g., `Unified posts: N` where N == count of `GeneratedPost` with `kind="unified"`) `tests/regenerate_blog_archive/test_index.py`

### US4 integration smoke

- [x] T105 [US4] Wire US4 path into `main()` — `ArchiveIndex` builder populated with everything from US1/US2/US3 + skipped specs + unresolved groupings, serialised to `--out-index` (default: repo root) `scripts/regenerate-blog-archive.py`
- [x] T106 [US4] Run `python scripts/regenerate-blog-archive.py --dry-run --verbose` against the live `specs/` tree; copy the would-be index to `specs/228-regenerate-blog-archive/evidence/dry-run-index.md` for pre-run inspection `specs/228-regenerate-blog-archive/evidence/dry-run-index.md`

**Checkpoint**: Generator is feature-complete. Dry run passes against the full corpus. Ready for the real run in Polish.

---

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Execute the real run, collect evidence, write the shipped-post, clean up the ephemera (the script and its tests per FR-009), then create the PR.

### Full-suite test gate

- [ ] T107 Run `uv run pytest tests/regenerate_blog_archive/ -v --cov=scripts.regenerate_blog_archive --cov-report=term` and capture output `(run command)`
- [ ] T108 [P] Run `uv run ruff check scripts/regenerate-blog-archive.py tests/regenerate_blog_archive/` — zero lint errors `(run command)`
- [ ] T109 [P] Run `uv run pyright scripts/regenerate-blog-archive.py` — zero type errors (Article XV strict gate) `(run command)`

### Real run

- [ ] T110 Run `python scripts/regenerate-blog-archive.py` (no flags — production defaults) against the live `specs/` tree; capture stdout summary block `(run command)`
- [ ] T111 Inspect `ARCHIVE-REBUILD.md` — verify every section present (index table, Skipped sub-section, Unresolved Groupings sub-sections, runbook, raw-log `<details>`) `ARCHIVE-REBUILD.md`
- [ ] T112 Spot-check 3 representative generated posts per SC-003 (one unified — e.g. 206; one epic rollup — e.g. E02 at 070; one composite if any) — verify sections 1–3 byte-for-byte match corresponding `evidence/opening-context.md` `(manual inspection)`

### Evidence collection

- [ ] T113 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) — include `feature: 228-regenerate-blog-archive`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct` in front matter `specs/228-regenerate-blog-archive/evidence/test-summary.md`
- [ ] T114 [P] Create usage demonstration — includes real stdout summary block from T110 + quickstart walkthrough annotated with actual counts `specs/228-regenerate-blog-archive/evidence/usage-example.md`
- [ ] T115 [P] Capture CLI demo — terminal session transcript showing `--help`, `--dry-run --verbose`, and real run `specs/228-regenerate-blog-archive/evidence/cli-demo.txt`
- [ ] T116 [P] Extract raw run log from the `<details>` block in `ARCHIVE-REBUILD.md` into a standalone evidence file `specs/228-regenerate-blog-archive/evidence/run-log.txt`
- [ ] T117 [P] Capture no-overwrite proof — sha256sum of all existing-before-run files under `specs/*/` pre- and post-run, diff shows only additions `specs/228-regenerate-blog-archive/evidence/no-overwrite-proof.md`
- [ ] T118 [P] Capture corpus coverage — one row per spec directory × classification bucket, verifies SC-001 invariant `specs/228-regenerate-blog-archive/evidence/corpus-coverage.md`

### Media content

- [ ] T119 Create feature blog post — spawn Content Specialist via Task tool per `.claude/commands/media.md`; first three sections copied verbatim from `specs/228-regenerate-blog-archive/evidence/opening-context.md`; sections 4–7 (Screenshots, By the Numbers, Lessons Learned, What's Next) written from this phase's evidence; front matter `title: "Building Blog-Archive Regeneration"`, `layout: future-post`, `author: Ian`, `track: [momentum]`, `reading_time` calculated, `excerpt` ≤ 150 chars, `tags: [tracer-bullet, content, tooling, shipped]` `specs/228-regenerate-blog-archive/media/shipped-post.md`

### Cleanup (FR-009 — delete the one-shot)

- [ ] T120 Delete the generator script `git rm scripts/regenerate-blog-archive.py`
- [ ] T121 [P] Delete the test package `git rm -r tests/regenerate_blog_archive/`
- [ ] T122 Verify nothing in the repo still imports or references the deleted paths: `grep -rn "regenerate-blog-archive\|regenerate_blog_archive" . --include="*.py" --include="*.md" --include="*.toml" --exclude-dir=.git` — only references should be in `specs/228-regenerate-blog-archive/` and `ARCHIVE-REBUILD.md` `(run command)`

### Pre-push verification

- [ ] T123 Run `task verify` (or the fallback four-step sequence from CLAUDE.md "Before Pushing") — lint, typecheck, unit tests, Playwright all green — script + tests are deleted so these are pure-repo checks `(run command)`

### PR creation

- [ ] T124 Create PR and publish blog: run `/speckit.pr`

**Task T124 must run last.** It depends on every other task. `/speckit.pr` creates the feature PR in `debrief-future` and the blog PR in `debrief.github.io`, returning both URLs. Script + tests are already deleted by T120/T121; reviewers can inspect them in the intermediate commit history (NFR-004).

---

---

## Dependencies

### Phase order

```text
Phase 1 (Setup: T001–T008)
        │
        ▼
Phase 2 (Foundation: T009–T037) — BLOCKS all user stories
        │
        ├─────────────┬─────────────┐
        ▼             ▼             ▼
Phase 3 (US1)   Phase 4 (US2)   Phase 5 (US3)
(T038–T053)     (T054–T072)     (T073–T091)
        │             │             │
        └─────────────┼─────────────┘
                      ▼
              Phase 6 (US4: T092–T106) — DEPENDS on US1/US2/US3 outputs (index aggregates everything)
                      │
                      ▼
              Phase 7 (Polish + PR: T107–T124)
```

### Within-phase dependencies

- **Phase 1**: T001–T005 (review patches) are independent of T006–T008 (scaffold files); can run in parallel.
- **Phase 2**:
  - T009–T010 (dataclasses) unblock T011 (argparse), T014 (parser), T019 (discovery), T024 (date resolver), T027 (PR body), T030 (writer).
  - T011 unblocks T012–T013 (CLI arg tests). T014 unblocks T015–T018 (parser tests + fixtures). Same pattern for discovery/date/pr-body/writer.
  - T035 (orchestrator skeleton) depends on T011, T014, T019, T030 being implemented. T036 depends on T035.
- **Phase 3 (US1)**:
  - T038 (opener loader) unblocks T039–T042 (tests + fixtures).
  - T043 (stitcher) depends on T038.
  - T049 (unified classifier) depends on T019 (from Foundation).
  - T052 (wiring) depends on T043, T049, T030 (writer).
- **Phase 4 (US2)**: T054 (BACKLOG parser) → T059 (prefix scanner) → T060 (mismatch detector) → T064 (rollup stitcher) → T069 (classifier precedence update) → T071 (wiring).
- **Phase 5 (US3)**: T073 (pair detector) → T077 (clusterer) → T081 (near-miss) → T084 (composite stitcher) → T088 (classifier precedence) → T090 (wiring).
- **Phase 6 (US4)**: T092 (index serialiser) → T098 (run-log) → T100 (invariant checker) → T103 (summary) → T105 (wiring) → T106 (dry-run capture).
- **Phase 7**: T107–T109 (quality gates) must pass before T110 (real run). T110 blocks T111–T118 (evidence). T113–T118 block T119 (media post — needs real numbers). T119 blocks T120–T122 (cleanup — final commits reference the shipped-post). T123 (pre-push verify) blocks T124 (`/speckit.pr`).

### Cross-story dependencies

- US1, US2, US3 are written in priority order but the **classification precedence** (FR-001: epic → composite → unified → skipped) means the wiring step of each story is **stacked** — T052 (US1 wiring) is a placeholder that gets re-ordered by T069 (US2 wiring) and again by T088 (US3 wiring). The test tasks guard each re-ordering (T070, T089).
- US4 (the index) depends on every prior classifier branch being stable — it is written last and its tests (T093–T097) only run once all classification is done.

### Parallel opportunities

- **Phase 1**: T001 + T002 + T003 + T004 + T005 in parallel (distinct files). T006 + T007 + T008 in parallel.
- **Phase 2**: Dataclasses (T009, T010) in parallel. Parser tests (T015–T018) in parallel. Discovery tests (T020–T023) in parallel. Date resolver tests (T025, T026) in parallel. PR-body tests (T028, T029) in parallel. Atomic writer tests (T031–T034) in parallel. Fixture creation tasks (T017, T018, T023) all [P].
- **Phase 3 (US1)**: Opener tests (T039, T040) + fixtures (T041, T042) in parallel. Stitcher tests (T044–T048) all [P].
- **Phase 4 (US2)**: Charter parser tests (T055–T058, T061–T063) all [P]. Rollup stitcher tests (T065–T068) all [P].
- **Phase 5 (US3)**: Pair-detector tests (T074–T076) [P]. Clusterer tests (T078–T080) [P]. Near-miss tests (T082, T083) [P]. Composite stitcher tests (T085–T087) [P].
- **Phase 6 (US4)**: Index tests (T093–T097) all [P]. Summary tests (T104) [P].
- **Phase 7**: Lint + pyright (T108, T109) in parallel with pytest (T107). Evidence capture tasks T114–T118 all [P]. Deletion tasks T120, T121 [P].

### Story-level parallelism after Foundation

Because classifier precedence is encoded by **ordering** within `main()` rather than cross-story coupling, developers (or parallel agents) can implement US1, US2, US3 **concurrently** once Phase 2 is complete. Each story has its own stitcher + tests + fixtures. The only serialisation point is the final wiring step (T052 → T071 → T090), which is a few lines and trivial to re-order.

---

---

## Implementation Strategy

### Incremental delivery

1. **Apply review patches first (Phase 1, T001–T005)** — they are tiny text edits to already-written artefacts and flush any remaining ambiguity before a line of code is written.
2. **Build the foundation (Phase 2)** — typed dataclasses, CLI, parsers, writer. At the end of this phase, `python scripts/regenerate-blog-archive.py --help` works and all contract tests for CLI args / parsing / atomic writes pass (C1–C6 contract tests from `contracts/cli.md`).
3. **US1 first (Phase 3)** — the bulk of the archive. If US1 is green and a dry run produces ~90–100 unified posts, 80% of the deliverable's value is already in place.
4. **US2 (Phase 4)** — epic rollups refine the US1 output by removing members and emitting one rollup per complete epic. Each merge-in of US2 reduces the unified count and adds one rollup.
5. **US3 (Phase 5)** — composite posts further refine, removing tightly-clustered standalone specs from unified and emitting composites. May produce zero clusters on this corpus — that is acceptable per Open Question.
6. **US4 (Phase 6)** — index + runbook wraps everything into the handoff artefact. Can only be written accurately once US1/US2/US3 are stable.
7. **Polish (Phase 7)** — real run, evidence, shipped-post, delete script, PR.

### Parallel team strategy

With one operator (likely the case):

1. Do Phase 1 + Phase 2 sequentially.
2. Within Phase 2, parallelise the test-authoring tasks (they all hit distinct test files).
3. Pick US1 → US2 → US3 in that order; each phase is short (~10–20 tasks).
4. Polish is sequential (run → inspect → evidence → post → delete → verify → PR).

With multiple agents in parallel:

1. Agent A: Phase 1 review patches (T001–T005).
2. Agents A+B+C+D in parallel on Phase 2 once T006 lands (dataclasses → parser / discovery / date / pr-body / writer each a lane).
3. After Phase 2 checkpoint, US1 / US2 / US3 fan out to three agents. Integration re-ordering (T069, T088) merges their classifier wiring.
4. One agent closes with Phase 6 + Phase 7.

### Dry-run tuning loop

Before T110 (real run), do at least one dry run:

- **If zero composites**: expected for this corpus if standalone specs rarely ship within 5 days sharing a non-noise tag. Review near-miss list — if the author wants any pair promoted, retune `--composite-window-days` and re-run `--dry-run`.
- **If too many composites** (every week clusters): tag-noise issue. Extend the `NOISE_TAGS` constant in the script, re-run `--dry-run`, verify cluster quality. Don't ship with false composites.
- **If Unresolved Groupings has `legacy-charter` entries**: check `BACKLOG.md` for epics with no `docs/ideas/Exx-*.md` — decide whether to author the idea doc or accept the legacy flag.
- **If Unresolved Groupings has `charter-prefix-mismatch` entries**: resolve by editing BACKLOG.md (add member) or editing spec.md (add `[Ex]` prefix) before the real run. These are author-adjudicated per spec Scenario 2.2.

### Constitution check invariants (verified by tests)

- **Article I.3 (no silent failures)**: T020 (legacy naming), T028 (skip-gh), T036 (fail-fast), T101 (double-classification), T102 (missing-classification) all guard loud surfacing.
- **Article I.4 (reproducibility)**: T099 (dry-run vs real-run log equivalence), T098 (run-metadata block), T117 (no-overwrite proof) demonstrate same-inputs-same-outputs.
- **Article VI (testing)**: T107–T109 are the merge gates; C1–C11 contract tests plus per-story unit tests cover every new codepath.
- **Article IX (minimal dependencies)**: No new pip dependency introduced. PyYAML uses existing transitive availability.
- **Article XV (strict type safety)**: T109 (pyright strict) is a mandatory gate. T009/T010 encode typed boundaries.

### Rollback plan

If T110 (real run) produces a broken archive:

1. Atomic writer guarantees `specs/*/` is unchanged (T032, T033, T034 tests). Just delete `ARCHIVE-REBUILD.md` and any files under `specs/*/media/{unified-post,epic-rollup,composite-post}.md` with `git clean -fd`.
2. Investigate (stdout summary + run-log point at the offending spec).
3. Fix the script, re-run `--dry-run`, re-run.

No rollback path is needed for the deleted-script step (T120–T121) because the script lives in git history; if a future regeneration is ever needed, `git show <commit>:scripts/regenerate-blog-archive.py` resurrects it.

---
