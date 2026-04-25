# Tasks: Apply the Regenerated Blog Archive to debrief.github.io

**Feature**: 232 (specs/232-apply-archive-rebuild/)
**Branch**: `232-apply-archive-rebuild-impl`
**Total tasks**: 52
**Estimate**: 30–60 min end-to-end (per spec's Dependencies & Constraints)

---

## Evidence Requirements

**Evidence Directory**: `specs/232-apply-archive-rebuild/evidence/`
**Media Directory**: `specs/232-apply-archive-rebuild/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | pytest results from the `tests/apply_archive_rebuild/` suite (~35–45 expected: classifier × 6, divergence × 6, front-matter merge × 5, asset resolver × 4, filename collision × 3, end-to-end × 3, plus foundation unit tests). Uses `.specify/templates/evidence/test-summary-template.md` with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`). | After T032 (`task verify` passes) |
| `evidence/usage-example.md` | Walk-through of the two-PR sequence — companion prep PR + migration PR — with pre-flight output and verification commands. Shows a reviewer how to reproduce the migration locally. | Polish phase |
| `evidence/cli-demo.txt` | Terminal session capturing the live migration helper run: `uv run python scripts/232-apply-archive-rebuild.py --site-clone ../debrief.github.io --dry-run` then `--execute`. | Polish phase |
| `evidence/before-after-sample.md` | Two specific site-post-to-archive-post diffs showing the migration's behaviour end-to-end: (a) a clean-swap case (body identical, `reading_time` carried forward), (b) a divergence case surfaced in the PR body. | Polish phase |
| `evidence/migration-report-sample.md` | The generated `MIGRATION-REPORT.md` produced by the dry run on the real 73-site-post × 74-archive-post baseline. This is the PR body the maintainer pastes into the cross-repo migration PR. | Polish phase |
| `evidence/opening-context.md` | Cached opener (What We're Building / How It Fits / Key Decisions). | **Already captured during /speckit.plan** |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence. Title: `Building Applied Blog Archive` (or similar — Content Specialist decides). Copies the three cached opener sections verbatim; adds Screenshots (n/a — text excerpts instead), By the Numbers, Lessons Learned, What's Next from evidence. | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Companion PR | PR on `debrief.github.io:master` that activates `jekyll-redirect-from` + adds the Jekyll build CI gate. Lands BEFORE the migration PR per NFR-002. | Phase 1 (T004) |
| Feature PR (debrief-future) | PR in `debrief/debrief-future` with the migration helper + tests (ephemeral) + runbook patch + evidence + blog post. Helper deleted in the final commit. | Polish phase |
| Migration PR (debrief.github.io) | Cross-repo PR on `debrief/debrief.github.io:master`: 73 `_posts/*.md` deletes + 74 adds + ~400 image copies. Body generated from `MIGRATION-REPORT.md`. | Polish phase |
| Blog PR (debrief.github.io) | Separate PR publishing `media/shipped-post.md`. Triggered by `/speckit.pr`. | Triggered by `/speckit.pr` |

**Feature type**: CLI / Library / Data Processing / Cross-repo migration. No UI surface — no Storybook, no workflow Playwright E2E required. The site-side Jekyll build (added in the companion PR) acts as the post-merge CI gate; there is no PR-blocking Playwright suite to add.

---

## Phase 1: Setup

**Goal**: Create the migration helper scaffolding (script + test package + fixture tree) in `debrief-future`, and open the site-side companion PR that enables `jekyll-redirect-from` and adds the Jekyll build CI gate. The companion PR must merge before Phase 7 so the migration PR benefits from the CI gate.

**Phase 1 completion gate**: Script file exists with `__main__` block that prints help; empty test package with conftest importing the script works; companion PR opened on `debrief.github.io` (merge status tracked through Polish).

- [x] T001 Create script skeleton with `argparse` for `--site-clone`, `--dry-run`, `--execute` and a `__main__` block that prints help. Pyright-strict compliant. `scripts/232-apply-archive-rebuild.py`
- [x] T002 [P] Create test package with `conftest.py` that loads the script via `importlib.util` (mirror pattern from `tests/regenerate_blog_archive/conftest.py`). `tests/apply_archive_rebuild/conftest.py`
- [x] T003 [P] Create fixture tree for the 3-post synthetic baseline used by `test_end_to_end.py`: 1 unified-post source + 1 rollup with 1 member + 1 composite with 2 members, plus matching site-post fixtures. `tests/apply_archive_rebuild/fixtures/`
- [ ] T004 Open the companion PR on `debrief.github.io:master` — one-line addition to `_config.yml` (`  - jekyll-redirect-from` under `plugins:`) + new `.github/workflows/jekyll-build.yml` per `contracts/helpers.md` §"Site CI workflow". Merge before T036 (PR creation). **Cross-repo task — run from a sibling clone of `debrief.github.io`.** Deferred to Phase 7. `debrief.github.io:_config.yml`, `debrief.github.io:.github/workflows/jekyll-build.yml`
- [x] T005 Sanity-check revival: `uv run pytest tests/apply_archive_rebuild/ -q` (expect 0 collected, 0 failed — no tests yet), `uv run pyright scripts/232-apply-archive-rebuild.py` (expect 0 errors), `uv run ruff check scripts/ tests/apply_archive_rebuild/` (expect clean). Commit as `feat(232): scaffold migration helper + companion PR reference`. `scripts/232-apply-archive-rebuild.py tests/apply_archive_rebuild/`

## Phase 2: Foundation

**Goal**: Shared parsers + dataclasses + front-matter model consumed by every user story phase. This is where the typed boundary gets built — once these exist, the stories can parallelise on top of them.

**Independent test for Phase 2**: `test_parse_archive_index.py` covers the ARCHIVE-REBUILD.md index parse; `test_front_matter.py` covers YAML narrowing into `FrontMatter`. Both run against real fixtures (the real `ARCHIVE-REBUILD.md` from `debrief-future` main + at least one real site post).

- [x] T006 [P] Add 7 `@dataclass(frozen=True)` classes per `data-model.md`: `ArchivePost`, `SitePost`, `FrontMatter`, `ImageRef`, `Classification`, `Divergence`, `AssetCopy`. `scripts/232-apply-archive-rebuild.py`
- [x] T007 [P] Add `MigrationPlan` dataclass (non-frozen, with `is_blocked` property) + `AssetResolver` helper signature stubs. `scripts/232-apply-archive-rebuild.py`
- [x] T008 Implement `parse_front_matter(text: str) -> FrontMatter` — reuses the spec's front-matter shape (narrow YAML → typed fields, pack unknowns into `extra`). Depends on T006. `scripts/232-apply-archive-rebuild.py`
- [x] T009 Implement `parse_archive_index(runbook_path: Path) -> dict[str, ArchivePostRef]` per `contracts/helpers.md`. Parses ARCHIVE-REBUILD.md's `## Index` table. Depends on T006. `scripts/232-apply-archive-rebuild.py`
- [x] T010 [test] Write 6 unit cases for `parse_archive_index`: real ARCHIVE-REBUILD.md (expect 131 rows), missing heading (returns `{}` with warning), extra pipes (escaped cells), malformed row (skipped + stderr warning), empty file, duplicate spec_key (raises). Depends on T009. `tests/apply_archive_rebuild/test_classifier.py`
- [x] T011 [test] Write 5 unit cases for `parse_front_matter`: archive shape (layout + 7 required fields), site shape with `reading_time`, site shape with `permalink`, unknown field packed into `extra`, malformed YAML raises `FrontMatterError`. Depends on T008. `tests/apply_archive_rebuild/test_front_matter.py`
- [x] T012 Run `uv run pytest tests/apply_archive_rebuild/ -q` — expect 11 tests pass. Commit as `feat(232): add front-matter parser + archive-index reader with unit tests`. `tests/apply_archive_rebuild/`

**Phase 2 completion gate**: 11 tests green. Dataclasses + two parsers ready for stories to consume.

## Phase 3: User Story 1 — Site Carries the Unified/Rollup/Composite Archive (P1)

**Story goal**: After the migration runs, every site `_posts/*.md` is either replaced by an archive post, merged into a rollup/composite (deleted), or preserved (legacy bucket). The site carries the unified/rollup/composite archive; readers see feature-level narrative.

**Independent test criteria**: Run the end-to-end test (`test_end_to_end.py`) against the 3-post fixture tree. Site clone's `_posts/` ends up with the 3 archive posts; no residual fixtures.

- [ ] T013 Implement `classify_site_post(site_post, archive_index, archive_posts) -> Classification` per `contracts/helpers.md`. Rule order: spec-key absent → `legacy`; unified match → `replace`; rollup/composite member match → `merge`. Depends on T008+T009. `scripts/232-apply-archive-rebuild.py`
- [ ] T014 [test] Extend `test_classifier.py` with 6 cases: site post → unified replace, site post → rollup merge, site post → composite merge, site post → legacy (no match), ambiguous slug (two archives same slug) raises `AmbiguousClassificationError`, `shipped-` prefix handling. Depends on T013. `tests/apply_archive_rebuild/test_classifier.py`
- [ ] T015 Implement `execute_migration_plan(plan, site_root) -> MigrationResult` write path for replace/merge/legacy buckets: delete targeted `_posts/*.md` files, write archive-shaped files for `replace` bucket. Idempotent (NFR-003). Refuses if `plan.is_blocked`. Depends on T013. `scripts/232-apply-archive-rebuild.py`
- [ ] T016 [test] Add 2 cases to `test_end_to_end.py`: (a) 3-post fixture full run produces the expected `_posts/` shape; (b) second run on the already-migrated tree is a no-op (idempotent, byte-identical). Depends on T015. `tests/apply_archive_rebuild/test_end_to_end.py`
- [ ] T017 Run `uv run pytest tests/apply_archive_rebuild/ -q` — expect 11 prior + 8 new = 19 tests pass. `tests/apply_archive_rebuild/`

**Phase 3 completion gate**: Classifier correctly buckets site posts; execute path writes idempotently; 19 tests green. US1 satisfied at helper level.

## Phase 4: User Story 2 — Every Image Resolves (P1)

**Story goal**: Every `![alt](/assets/images/future-debrief/<slug>/<basename>)` reference in every migrated post resolves to a real file under the site's `assets/images/future-debrief/<slug>/`. Zero 404s after deploy.

**Independent test criteria**: Fixture with a 4-image unified post runs through the pipeline; all 4 images appear at `<site_root>/assets/images/future-debrief/<slug>/` byte-identical to source. FR-009 pre-flight fires on a fixture with one broken reference.

- [ ] T018 Implement `resolve_asset(image_ref, archive_root) -> AssetCopy` per `contracts/helpers.md` §`resolve_asset`. Primary path `specs/<slug>/evidence/screenshots/<basename>`; fallback `specs/<slug>/evidence/<basename>`. Symlinks resolved via `Path.resolve()`. `found=False` for missing. Depends on T006. `scripts/232-apply-archive-rebuild.py`
- [ ] T019 Implement `detect_source_relative_leaks(archive_posts)` — FR-008 pre-flight regression guard for #231. Scan each `ArchivePost.body` for `!\[[^]]*\]\((\./|\.\./|evidence/)`. Returns list of `(ArchivePost, ImageRef)` pairs. Depends on T006. `scripts/232-apply-archive-rebuild.py`
- [ ] T020 Implement `detect_filename_collisions(archive_posts)` — FR-010 pre-flight. Returns list of `(ArchivePost, ArchivePost)` pairs sharing a target filename. Depends on T006. `scripts/232-apply-archive-rebuild.py`
- [ ] T021 Extend `execute_migration_plan` to run the asset-copy step after writing `_posts/*.md`: call `resolve_asset` for each `ImageRef`, `shutil.copy2(..., follow_symlinks=True)` into the site's `assets/images/future-debrief/<slug>/`. Idempotent (NFR-003). Depends on T015+T018. `scripts/232-apply-archive-rebuild.py`
- [ ] T022 [test] Write 4 unit cases for `resolve_asset` in `test_asset_resolver.py`: primary-location hit, top-level evidence GIF fallback hit (mirror 191-spec-navigator pattern), neither location → `found=False`, symlinked asset resolves to real file. Depends on T018. `tests/apply_archive_rebuild/test_asset_resolver.py`
- [ ] T023 [test] Write 3 unit cases for `detect_filename_collisions` in `test_filename_collision.py`: no collisions, two posts same filename, three posts colliding. Depends on T020. `tests/apply_archive_rebuild/test_filename_collision.py`
- [ ] T024 [test] Extend `test_end_to_end.py` with 1 new case: fixture with 4-image unified post produces byte-identical copies at the site-side asset path. Also assert `detect_source_relative_leaks` returns `[]` for the 3-post happy-path fixture. Depends on T021. `tests/apply_archive_rebuild/test_end_to_end.py`
- [ ] T025 Run `uv run pytest tests/apply_archive_rebuild/ -q` — expect 19 prior + 8 new = 27 tests pass. Commit Phases 3+4 as one logical change: `feat(232): classifier + asset-copy pipeline with pre-flight`. `tests/apply_archive_rebuild/`

**Phase 4 completion gate**: Asset pipeline resolves images, copies symlinks → real files, pre-flight guards active. 27 tests green. US2 satisfied.

## Phase 5: User Story 3 — Runbook Bugs Fixed (P2)

**Story goal**: `ARCHIVE-REBUILD.md` on `debrief-future` main accurately describes how to apply the archive to `debrief.github.io`. Every step succeeds when executed literally against the current site shape. Future re-runs don't rediscover the two bugs.

**Independent test criteria**: A fresh reader of the runbook sees (a) step 1's `rm` target matches reality (`_posts/*.md`, no `future/` subdir), (b) a step explicitly covering image-asset copy. Verified by reading the patched `ARCHIVE-REBUILD.md`.

- [ ] T026 Patch `ARCHIVE-REBUILD.md` on `debrief-future` main: step 1's `rm debrief.github.io/_posts/future/*.md` → `rm debrief.github.io/_posts/*.md`. `ARCHIVE-REBUILD.md`
- [ ] T027 Insert new step (after step 2 "Copy generated files") in `ARCHIVE-REBUILD.md`: "Copy image assets. For every `![alt](/assets/images/future-debrief/<slug>/<basename>)` reference in a copied post, copy `specs/<slug>/evidence/screenshots/<basename>` (or `specs/<slug>/evidence/<basename>` for top-level GIFs) into `debrief.github.io:assets/images/future-debrief/<slug>/<basename>`. The migration helper at `scripts/232-apply-archive-rebuild.py` automates this." Renumber subsequent steps accordingly. Commit as `docs(232): fix ARCHIVE-REBUILD.md runbook bugs`. `ARCHIVE-REBUILD.md`

**Phase 5 completion gate**: Runbook reads cleanly; fresh maintainer can follow it without tripping over the two documented defects. US3 satisfied.

## Phase 6: User Story 4 — Editorial Hand-Edits Preserved (P2)

**Story goal**: Divergences between each replaced site post and its archive replacement are surfaced in the migration PR description as reviewable prose. No hand-edit (front-matter addition, body change beyond whitespace) disappears silently. `reading_time` and `permalink` carry forward automatically; `redirect_from:` entries emitted for any URL shape changes.

**Independent test criteria**: Fixture with a site post carrying `reading_time: 3` not on archive → field merged forward into output. Fixture with site body diff of 5 non-whitespace lines → divergence surfaced in PR body with first 10 lines of unified diff. Fixture with whitespace-only body change → clean swap (divergence absent).

- [ ] T028 Implement `diff_post(site_post, archive_post) -> Divergence` per `contracts/helpers.md` §`diff_post`: four-set front-matter diff (site-only, archive-only, value_mismatches, body_diff) using `yaml.safe_load` + `difflib.unified_diff`. Whitespace-only body changes → `body_diff_lines == 0`. Depends on T008. `scripts/232-apply-archive-rebuild.py`
- [ ] T029 Implement `merge_front_matter(site_fm, archive_fm) -> FrontMatter` per `contracts/helpers.md`: archive wins on source-derivable fields (`title`, `date`, `excerpt`, `track`, `tags`, `layout`, `author`); site wins on `reading_time`, `permalink`; union on `redirect_from`; `extra` preserved from site side. Depends on T008. `scripts/232-apply-archive-rebuild.py`
- [ ] T030 Extend `execute_migration_plan` to call `merge_front_matter` for each `replace`-bucket post before writing; emit `redirect_from:` entries when a post's effective permalink changes. Depends on T015+T029. `scripts/232-apply-archive-rebuild.py`
- [ ] T031 Implement `generate_pr_body(plan, result) -> str` per `contracts/helpers.md` §`generate_pr_body`: six sections (Summary, Bucket classification table, Pre-flight scans NFR-004, Editorial divergences, Asset coverage, Test Plan). Depends on T028. `scripts/232-apply-archive-rebuild.py`
- [ ] T032 [test] Write 6 unit cases for `diff_post` in `test_divergence.py`: identical posts (clean), site has `reading_time` extra (site_only), archive has `track` extra (archive_only), body 5 lines diverged (surfaces), whitespace-only body change (clean), list-vs-string `track:` (value_mismatch). Depends on T028. `tests/apply_archive_rebuild/test_divergence.py`
- [ ] T033 [test] Write 5 unit cases for `merge_front_matter` in `test_front_matter_merge.py`: archive title overrides site, site `reading_time` preserved, site `permalink` preserved, `redirect_from` list-merged, `extra` preserved. Depends on T029. `tests/apply_archive_rebuild/test_front_matter_merge.py`
- [ ] T034 [test] Add 1 end-to-end case in `test_end_to_end.py`: fixture with 1 body-diverged + 1 reading-time-site-only + 1 clean-swap → plan carries all 3 divergences; `generate_pr_body` output contains all 3 under the right headings. Assert structural contents (all 6 sections present), counts matching plan. Depends on T031. `tests/apply_archive_rebuild/test_end_to_end.py`
- [ ] T035 Run `uv run pytest tests/apply_archive_rebuild/ -q` — expect 27 prior + 12 new = 39 tests pass. Commit as `feat(232): add divergence diff + front-matter merge + PR-body generator`. `tests/apply_archive_rebuild/`

**Phase 6 completion gate**: Every editorial hand-edit that would otherwise be silently overwritten surfaces in the PR body. 39 tests green. US4 satisfied.

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Run the helper against the real 73-site-post × 74-archive-post baseline to produce the migration PR, capture evidence, delete the ephemeral helper per FR-014, write the feature post, ship the two PRs (feature PR on `debrief-future` + migration PR on `debrief.github.io` + blog PR on `debrief.github.io`). Also covers US5 (P3) — verify the index sections become live-URL-actionable after deploy.

### Dry-run + verify

- [ ] T036 Verify the companion PR from T004 has merged on `debrief.github.io:master` (redirect plugin active, Jekyll CI workflow live). If not, chase up before proceeding. `debrief.github.io:master`
- [ ] T037 Clone `debrief.github.io:master` into a sibling directory (`../debrief.github.io/`). Confirm current baseline: 73 `_posts/*.md` all with `layout: future-post`. `../debrief.github.io/`
- [ ] T038 Run `uv run python scripts/232-apply-archive-rebuild.py --site-clone ../debrief.github.io --dry-run`. Capture stdout + the generated `MIGRATION-REPORT.md` for `evidence/migration-report-sample.md` (T045). Expect: N replace + M merge + K legacy classifications, 0 pre-flight blockers, divergence summaries listed. `../debrief.github.io/`
- [ ] T039 Verify pre-flight scans on the real run: FR-008 (0 source-relative leaks), FR-009 (0 missing assets — or investigate if any fire, fix upstream via #231 re-run), FR-010 (0 filename collisions). Block migration if any fire. `../debrief.github.io/`
- [ ] T040 Execute the migration: `uv run python scripts/232-apply-archive-rebuild.py --site-clone ../debrief.github.io --execute`. Capture the terminal session for `evidence/cli-demo.txt` (T044). `../debrief.github.io/`
- [ ] T041 Site-side verification: `cd ../debrief.github.io && bundle exec jekyll build --safe --trace` (expect success — site CI will also run this on PR open). Then sample-test image resolution via a Python one-liner over every generated post. `../debrief.github.io/`
- [ ] T042 Run `task verify` in `debrief-future` (lint + typecheck + pytest + Playwright E2E) to confirm the helper and tests don't regress the repo. `tests/apply_archive_rebuild/`

### Evidence collection

- [ ] T043 Capture test results using `.specify/templates/evidence/test-summary-template.md` in `specs/232-apply-archive-rebuild/evidence/test-summary.md`. YAML front matter: `feature: 232`, `captured_at` (ISO timestamp), `git_sha` (branch HEAD), `tests_passed` (~39), `tests_failed: 0`, `tests_skipped: 0`, `coverage_pct` (≥ 77 %). Body: test counts per file, key scenarios verified (SC-001 through SC-008 mapping). `specs/232-apply-archive-rebuild/evidence/test-summary.md`
- [ ] T044 [P] Capture migration helper terminal session in `specs/232-apply-archive-rebuild/evidence/cli-demo.txt` (from T040 output). Show the dry-run summary block + execute elapsed time + file-count changes. `specs/232-apply-archive-rebuild/evidence/cli-demo.txt`
- [ ] T045 [P] Capture generated MIGRATION-REPORT.md sample in `specs/232-apply-archive-rebuild/evidence/migration-report-sample.md` (from T038 output). This is the PR body the maintainer pastes into the cross-repo migration PR. `specs/232-apply-archive-rebuild/evidence/migration-report-sample.md`
- [ ] T046 [P] Create usage demonstration in `specs/232-apply-archive-rebuild/evidence/usage-example.md` — walk reader through the companion PR + migration PR + verification cycle with commands and expected outputs. Mirror the quickstart walkthrough. `specs/232-apply-archive-rebuild/evidence/usage-example.md`
- [ ] T047 [P] Capture before/after sample in `specs/232-apply-archive-rebuild/evidence/before-after-sample.md`. Two excerpts: (a) a clean-swap case (site post body identical, front matter gained `layout: future-post` already → no change, `reading_time` carried forward); (b) a divergence case (site body diverged 5 lines → surfaced in MIGRATION-REPORT.md). Source hashes via `git show HEAD~N:...` where needed. `specs/232-apply-archive-rebuild/evidence/before-after-sample.md`

### US5 verification (Orphan / Broken / Malformed index becomes actionable)

- [ ] T048 After migration PR merge (or against the dry-run output for local verification): for each row in `ARCHIVE-REBUILD.md`'s `## Orphan Screenshots` section, verify the "Generated Post" path corresponds to a live URL on the migrated site. `curl -s -o /dev/null -w "%{http_code}\n"` each, assert 200. Record results in `evidence/us5-verification.md`. `specs/232-apply-archive-rebuild/evidence/us5-verification.md`
- [ ] T049 Repeat T048 for `## Broken Image References` (if non-empty) — confirm the index's row is reflected by the reader experience on the live post (i.e. the broken link is visible, not silently dropped by the asset-copy step). `specs/232-apply-archive-rebuild/evidence/us5-verification.md`

### Delete the helper (FR-014)

- [ ] T050 Delete migration helper and tests: `git rm scripts/232-apply-archive-rebuild.py && git rm -r tests/apply_archive_rebuild/`. Verify SC-006 equivalent (FR-014): neither path exists in HEAD. Commit as `feat(232): delete migration helper per FR-014`. `scripts/232-apply-archive-rebuild.py tests/apply_archive_rebuild/`

### Media content

- [ ] T051 Spawn Content Specialist (`.claude/agents/media/content.md`) via Task tool to create the Feature Post at `specs/232-apply-archive-rebuild/media/shipped-post.md`. First three sections (What We're Building, How It Fits, Key Decisions) **MUST be copied verbatim** from `specs/232-apply-archive-rebuild/evidence/opening-context.md` (already cached during `/speckit.plan`). Remaining sections (By the Numbers, Lessons Learned, What's Next) written from evidence files captured in T043–T047. No Screenshots section (this is a CLI/infrastructure feature with no visual surface — in lieu, include code/grep excerpts from `before-after-sample.md` as a "Before/After" block). Front matter: `layout: future-post`, `title: "Building [Content-Specialist-chosen noun]"`, `track: [credibility]`, `author: Ian`, `reading_time` calculated, `tags: [tracer-bullet, archive, migration, media]`, `excerpt` ≤ 150 chars. `specs/232-apply-archive-rebuild/media/shipped-post.md`

### PR creation

- [ ] T052 Create PR and publish blog: run `/speckit.pr`. This opens the feature PR in `debrief/debrief-future` with the full commit trajectory + evidence + runbook patch, opens the cross-repo migration PR on `debrief/debrief.github.io:master` (body from `evidence/migration-report-sample.md`), and publishes `media/shipped-post.md` to `debrief/debrief.github.io`. Returns three PR URLs.

**Task T052 must run last. It depends on every prior task being complete, including the companion PR merge (T004→T036), all evidence files (T043–T047), US5 verification (T048–T049), helper deletion (T050), and the blog post (T051).**

## Dependencies

**Story completion order** (topological, respecting shared foundation):

```
Phase 1 (Setup — scripting scaffolds + companion PR opened)
    ↓
Phase 2 (Foundation — parsers + dataclasses)
    ↓
    ├──→ Phase 3 (US1 Classifier + execute path, P1)  ─┐
    ├──→ Phase 4 (US2 Asset copy + pre-flight, P1)    ─┤
    └──→ Phase 5 (US3 Runbook patch, P2 — independent)─┤
                                                        ↓
                              Phase 6 (US4 Divergence + PR body, P2 —
                                      depends on classifier + merge path)
                                                        ↓
                              Phase 7 (Polish — real-archive run + US5 +
                                      evidence + delete + feature post + PR)
```

**Inter-task dependencies within phases**:

- **Phase 1**: T001–T003 independent. T004 (companion PR) can run any time before T036 but earlier is better — it needs human merge approval on the site. T005 depends on T001–T003.
- **Phase 2**: T006+T007 (dataclasses) parallel. T008 depends on T006. T009 depends on T006. T010 depends on T009. T011 depends on T008. T012 depends on T010+T011.
- **Phase 3**: T013 depends on T008+T009 (Foundation). T014 depends on T013. T015 depends on T013. T016 depends on T015. T017 depends on T014+T016.
- **Phase 4**: T018/T019/T020 parallel (all depend on T006 only). T021 depends on T015+T018. T022 depends on T018. T023 depends on T020. T024 depends on T021. T025 depends on T022–T024.
- **Phase 5**: T026 and T027 sequential (same file, adjacent edits) — treat as one logical runbook patch commit.
- **Phase 6**: T028+T029 parallel (independent). T030 depends on T015+T029. T031 depends on T028. T032 depends on T028. T033 depends on T029. T034 depends on T031. T035 depends on T032+T033+T034.
- **Phase 7**: T036→T037→T038→T039→T040→T041→T042 strictly sequential (each validates the previous). T043 depends on T042 (needs `task verify` green + git sha). T044/T045 depend on T038+T040 (need captured output). T046/T047 parallel after T042. T048/T049 depend on T040 (need migration output to verify against). T050 depends on T042 (delete only after gates green). T051 depends on T043–T047 (evidence for the blog). T052 depends on every prior task.

**Key independence claims**:

- US1 and US2 are strictly independent at helper-module level — T015 and T021 could parallelise once Foundation lands.
- US3 is pure documentation — has no code dependency; safe to land early as a standalone commit.
- US4 depends on US1's execute-path + Foundation, but its tests are independent of US2's asset pipeline.
- US5 is post-deploy verification — has no code dependency; lives entirely in the Polish phase.

**Cross-repo dependencies**:

- **Companion PR (T004) must merge BEFORE the migration PR opens (T052)**. The `jekyll-redirect-from` plugin activation and the Jekyll CI gate are load-bearing — FR-007 redirects fail silently without the plugin; FR-012 build gate requires the workflow.
- **`debrief-future` main must be stable** during the migration run. If new archive content lands between T038 (dry-run) and T040 (execute), re-run T038→T040 on the updated baseline.

## Implementation Strategy

### Incremental delivery MVP

**Minimum shippable slice (if time compresses)**: Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 7 (reduced evidence). This executes the migration with pre-flight asset safety + idempotent copies, but without the editorial-hand-edit preservation (US4). In practice the site has zero hand-edits relative to the archive source (all 73 posts are `layout: future-post` with no `permalink`, no unknown fields — per research R5), so the MVP path is close to acceptable today. Still, **default plan is all seven phases**, because FR-005 is a hard requirement and the risk of silent overwrite grows with every day of site drift.

Phase 5 (US3 runbook patch) can ship any time — it's a 2-line markdown edit with no code dependency. Fold it into the same PR as the main migration for review ergonomics.

### Commit trajectory

Mirrors the quickstart §"Commit trajectory":

#### Companion PR (on `debrief.github.io`) — merges first
1. `ci: enable jekyll-redirect-from + add Jekyll build gate` (T004)

#### Migration implementation on `debrief-future` (one PR, ~6 commits)
1. `feat(232): scaffold migration helper + companion PR reference` (T001–T005)
2. `feat(232): add front-matter parser + archive-index reader with unit tests` (T006–T012)
3. `feat(232): classifier + asset-copy pipeline with pre-flight` (T013–T025 — Phases 3+4 folded; both depend on Foundation and share the execute path)
4. `docs(232): fix ARCHIVE-REBUILD.md runbook bugs` (T026–T027)
5. `feat(232): add divergence diff + front-matter merge + PR-body generator` (T028–T035)
6. `feat(232): delete migration helper per FR-014` (T050) + evidence + blog post folded into this or a follow-up commit

Expect 6–7 commits. Reviewer reads 2, 3, 5 carefully; skims 1, 4, 6.

#### Migration PR (on `debrief.github.io`) — the big cross-repo one
1. `Apply regenerated blog archive from debrief-future main` (T040 output + MIGRATION-REPORT.md body from T045)

### Parallel execution opportunities

Within Phase 2:

```
T006 (dataclasses) ─┐
T007 (MigrationPlan)─┼─→ T008 (FrontMatter parser)   → T011 (test)
                   ─┘                                  ↓
                                                     T012 (run)
                     ─→ T009 (archive-index parser)  → T010 (test)
```

Within Phase 4:

```
T018 (resolve_asset) ─┐
T019 (leak scanner)  ─┼─→ T021 (copy step in execute)
T020 (collisions)    ─┘
                   T022 (test_asset_resolver) runs in parallel with T018
                   T023 (test_filename_collision) runs in parallel with T020
```

Within Phase 7, evidence capture tasks T044 / T045 / T046 / T047 run in parallel after T040+T042 land. US5 verification (T048/T049) runs in parallel with evidence capture since it consumes the migration output, not evidence.

### Risk mitigation

- **If the pre-flight missing-asset scan (T039) fires**: options are (a) regenerate the archive upstream via #231's helper on `debrief-future` (but #231's helper was deleted — revive it fresh if needed), (b) patch the source `shipped-post.md` to drop the broken reference manually, (c) accept the broken reference and let it land as a `redirect_from` or `404` on the live site (bad — violates SC-002). Recommended: (a) for any > 2 broken refs; (b) for isolated one-offs.
- **If the site has drifted between research and execution**: the classifier's `legacy` bucket (FR-002) catches unfamiliar posts. Review the migration PR's bucket classification carefully — any unexpected `legacy` entry deserves scrutiny.
- **If the companion PR (T004) is unmerged by the time T040 runs**: block at T036 — do not execute the migration without the redirect plugin, since FR-007 `redirect_from:` entries would be silent-no-ops.
- **If Jekyll build fails on the migration PR (FR-012)**: the CI gate catches it. Fix in-place on the migration branch (usually a front-matter typo or a missing asset that slipped the pre-flight). Do not merge past a red build.
- **If `debrief-future` main advances during the migration's lifecycle**: the helper is read-only on `debrief-future` — rebase-safe. If the archive content changes in a way that affects the classification (unlikely — rollup/composite boundaries rarely shift), re-run T038 to refresh the plan.
- **If a hand-edit surfaces that the reviewer wants to preserve**: the divergence summary lists exactly which lines diverge. The right fix is to amend the source `specs/<slug>/media/shipped-post.md` on `debrief-future` to match the desired state, re-regenerate the archive (new #231-style run), and re-run this migration. Do not silently patch the migration output post-hoc — it breaks the archive's "source of truth" invariant.
