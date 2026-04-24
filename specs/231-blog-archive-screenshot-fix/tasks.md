# Tasks: Fix Screenshot Handling in Regenerated Blog Archive

**Feature**: 231 (specs/231-blog-archive-screenshot-fix/)
**Branch**: `231-blog-archive-screenshot-fix-impl`
**Total tasks**: 38
**Estimate**: 45–90 min end-to-end (per spec §Dependencies & Constraints)

---

## Evidence Requirements

**Evidence Directory**: `specs/231-blog-archive-screenshot-fix/evidence/`
**Media Directory**: `specs/231-blog-archive-screenshot-fix/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | pytest results from the extended `tests/regenerate_blog_archive/` suite — expect 54 baseline + ~38 new (harvester, rewriter, rollup matrix, composite matrix, index sections, E2E). Uses `.specify/templates/evidence/test-summary-template.md` with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`). | After T029 (task verify passes) |
| `evidence/usage-example.md` | Walk-through of the full revive → patch → re-run → delete cycle with terminal commands and expected outputs. Shows a reviewer how to reproduce the fix locally. | Polish phase |
| `evidence/cli-demo.txt` | Terminal session capturing the live generator run: `uv run python scripts/regenerate-blog-archive.py --force` with stdout + run-log output. | Polish phase |
| `evidence/before-after-sample.md` | Diff excerpt showing `specs/185-cql2-array-filter/media/composite-post.md` before (0 images) vs after (≥16 images under three `#### Screenshots` blocks); plus a second excerpt showing path rewrite for `specs/176-log-panel-ux/media/unified-post.md`. | Polish phase |
| `evidence/opening-context.md` | Cached opener (What We're Building / How It Fits / Key Decisions). | **Already captured during /speckit.plan** |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence. Title: `Building Screenshot-Complete Blog Archive`. Copies the three cached opener sections verbatim; adds Screenshots, By the Numbers, Lessons Learned, What's Next from evidence. | Polish phase (T036) |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` with the six-commit trajectory (revive → harvester/rewriter → stitchers → index sections → re-run → delete) + full evidence. | Polish phase (T038) |
| Blog PR | PR in `debrief/debrief.github.io` publishing `media/shipped-post.md`. | Triggered by `/speckit.pr` |

**Feature type**: CLI / Library / Data Processing. No UI surface — no Storybook, no Playwright E2E required for this feature. The existing web-shell + spec-navigator Playwright suites still run under `task verify` as regression safety nets but gain no new tests.

---

## Phase 1: Setup

**Goal**: Revive the #228 generator source and tests from commit `19406178` into the working tree (per FR-001). Establish a green baseline before patching.

- [x] T001 Revive generator source via `git show 19406178:scripts/regenerate-blog-archive.py > scripts/regenerate-blog-archive.py` `scripts/regenerate-blog-archive.py`
- [x] T002 Revive test package via `git checkout 19406178 -- tests/regenerate_blog_archive/` `tests/regenerate_blog_archive/`
- [x] T003 Sanity-check revival: `uv run pytest tests/regenerate_blog_archive/ -q` (expect 54 passed), `uv run pyright scripts/regenerate-blog-archive.py` (expect 0 errors), `uv run ruff check scripts/regenerate-blog-archive.py tests/regenerate_blog_archive/` (expect clean). Commit as `feat(231): revive #228 generator for screenshot-fix work`. `scripts/regenerate-blog-archive.py`

**Phase 1 completion gate**: 54 existing tests pass on a clean revival.

## Phase 2: Foundation

**Goal**: Shared helpers consumed by every stitcher patch and the `ArchiveIndex` extensions. **Satisfies User Story 4 (P1, all image paths rewritten to Jekyll convention)** at the helper level — US4's end-to-end validation happens in Polish (SC-002 grep). Also seeds the malformed-reference surface (FR-013) and HTML `<img>` harvesting (FR-010).

**Independent test for US4 at helper level**: `test_path_rewrite.py` covers all 12 rewriter cases including multi-level climb (`../../evidence/foo.png` → Jekyll absolute per FR-011), suffix preservation, and scheme/absolute pass-through.

- [x] T004 [P] Add four new `@dataclass(frozen=True)` classes (`ImageReference` with `kind: Literal["markdown", "html"]`, `OrphanImage` with `resolved_path` dedup key, `BrokenImageReference`, `MalformedImageReference`) below `_first_paragraph` (revival line ~971). Reference `data-model.md` for exact field lists. `scripts/regenerate-blog-archive.py`
- [x] T005 [P] Add regex constants `_IMAGE_RE` (markdown `![alt](path "title")`) and `_HTML_IMG_RE` (case-insensitive HTML `<img src="..." alt="...">`) near the top-level regex block (alongside `TENSE_INVERTED_HEADING_RE`). `scripts/regenerate-blog-archive.py`
- [x] T006 [P] Implement `rewrite_image_path(path: str, source_spec_slug: str) -> str` with the six-rule ordered logic from `contracts/helpers.md`: scheme → absolute → suffix split → loop-strip `./`/`../`/`evidence/` (FR-011) → basename → compose Jekyll absolute. `scripts/regenerate-blog-archive.py`
- [x] T007 [P][test] Write 12 unit cases for `rewrite_image_path` (see table in `contracts/helpers.md`): basic, multi-level climb, repeated `./`, absolute pass-through, Jekyll pass-through, scheme URI (http/https/data), query-string suffix, fragment suffix, combined suffix + climb. `tests/regenerate_blog_archive/test_path_rewrite.py`
- [x] T008 Implement `harvest_image_refs(body, source_spec) -> tuple[list[ImageReference], list[MalformedImageReference]]`. Line-by-line scan applying `_IMAGE_RE` then `_HTML_IMG_RE`; populate `kind` field; run the malformed pass (`line.count("![")` vs markdown matches on that line) and emit `MalformedImageReference(spec_key, line_number, snippet=line[:80]+…)` for each unmatched `![`. Reference quickstart §2 for the canonical implementation. Depends on T004+T005+T006. `scripts/regenerate-blog-archive.py`
- [x] T009 [test] Write 11 harvester unit cases (see table in `contracts/helpers.md`): empty body, single markdown, HTML with alt, HTML without alt, uppercase `<IMG>`, markdown+HTML mixed line, repeated refs, empty-alt markdown, title-arm markdown, unclosed-paren malformed on line 7, 176-log-panel-ux four-image fixture. Depends on T008. `tests/regenerate_blog_archive/test_image_harvest.py`
- [x] T010 Run `uv run pytest tests/regenerate_blog_archive/test_path_rewrite.py tests/regenerate_blog_archive/test_image_harvest.py -v` — expect all new cases green; run full suite `uv run pytest tests/regenerate_blog_archive/ -q` — expect 54 baseline + 23 new tests pass. Commit as `feat(231): add image harvester + path rewriter with unit tests`. `tests/regenerate_blog_archive/`

**Phase 2 completion gate**: 77 tests pass (54 baseline + 23 new). US4 satisfied at helper level.

## Phase 3: User Story 1 — Epic Rollup Preserves Member Screenshots (P1)

**Story goal**: Epic rollup posts include every shipped member's screenshots under a per-member sub-section, with Jekyll-rewritten paths.

**Independent test criteria**: After T013 passes and the full archive is re-run in Polish (T027), open `specs/125-stac-extension-mock-data/media/epic-rollup.md`. The `174-thumbnail-capture` member section under `## Member Features` must contain all 3 source images with paths matching `/assets/images/future-debrief/174-thumbnail-capture/<file>.png`.

- [ ] T011 Patch `stitch_epic_rollup` (revival line 1106) to add a new `## Member Features` section between the existing `## Members` bullet index and `## What Shipped` summary. For each shipped member: emit `### {number:03d}-{slug} — {date}` header, then `_first_paragraph(extract_shipped_body(...))`, then optional `#### Screenshots` block iterating `harvest_image_refs(...)` refs. Reference quickstart §3a for the canonical implementation. Depends on T008. `scripts/regenerate-blog-archive.py`
- [ ] T012 [test] Extend `test_stitch.py` with the full Issue 7A test matrix for rollup — **first ever coverage of this stitcher**. Five baseline assertions (`test_rollup_title_is_epic_title`, `test_rollup_front_matter_has_layout_future_post`, `test_rollup_destination_is_anchor_epic_rollup_md`, `test_rollup_no_overwrite_proof`, `test_rollup_has_members_and_member_features_sections`) + three screenshot assertions (`test_rollup_member_with_3_images_produces_3_screenshot_refs`, `test_rollup_member_with_zero_images_omits_screenshots_heading`, `test_rollup_member_screenshot_paths_are_rewritten`). `tests/regenerate_blog_archive/test_stitch.py`
- [ ] T013 Run `uv run pytest tests/regenerate_blog_archive/test_stitch.py -v` — expect 5 baseline unified-post tests + 8 new rollup tests pass. `tests/regenerate_blog_archive/test_stitch.py`

**Phase 3 completion gate**: 8 rollup tests green; rollup stitcher is ready to emit Member Features sections for the real archive.

## Phase 4: User Story 2 — Composite Post Preserves Member Screenshots (P1)

**Story goal**: Composite posts include every member's screenshots under their existing `## What Shipped` sub-block, with Jekyll-rewritten paths. Anchor-spec images appear in their own member block without duplication.

**Independent test criteria**: After T016 passes and the full archive is re-run in Polish (T027), open `specs/185-cql2-array-filter/media/composite-post.md`. It must contain ≥16 image references (7 + 5 + 4 from members 186 / 189 / 190) partitioned under three `#### Screenshots` blocks.

- [ ] T014 Patch `stitch_composite_post` (revival line ~1330) to extend the existing `for m in cluster.members:` loop under `## What Shipped`. After the `_first_paragraph` emission, harvest `refs = harvest_image_refs(body, m)` and, if `refs`, append `#### Screenshots` heading followed by `![{alt}]({rewritten_path})` lines. No change to title / front matter / other sections. Reference quickstart §3b. Depends on T008. `scripts/regenerate-blog-archive.py`
- [ ] T015 [test] Extend `test_stitch.py` with the full Issue 7A test matrix for composite — **first ever coverage of this stitcher**. Five baseline assertions (`test_composite_title_is_building_prefixed`, `test_composite_front_matter_has_layout_future_post`, `test_composite_destination_is_anchor_composite_post_md`, `test_composite_no_overwrite_proof`, `test_composite_has_seven_canonical_sections`) + three screenshot assertions (`test_composite_185_shaped_cluster_has_16_image_refs`, `test_composite_anchor_spec_images_appear_in_its_own_block`, `test_composite_member_screenshot_paths_are_rewritten`). `tests/regenerate_blog_archive/test_stitch.py`
- [ ] T016 Run `uv run pytest tests/regenerate_blog_archive/test_stitch.py -v` — expect 5 baseline + 8 rollup + 8 composite tests pass. `tests/regenerate_blog_archive/test_stitch.py`

**Phase 4 completion gate**: 8 composite tests green; composite stitcher ready for real-archive run.

## Phase 5: User Story 3 — Unified Posts Preserve Images Across Splice (P2)

**Story goal**: Every `![alt](path)` reference in a source `shipped-post.md` appears in the generated `unified-post.md`, regardless of heading layout. Closes the `176-log-panel-ux` fourth-image drop at the tense-inverted twin-heading splice.

**Independent test criteria**: After T019 passes and the full archive is re-run in Polish (T027), diff source vs generated for all 6 image-bearing unified posts; the `![…](…)` reference count must match exactly (set-equal on `(alt, basename)`).

- [ ] T017 Patch `_merge_opener_with_shipped_body` (revival line 943) twin-heading branch (line 955 `if first_heading and TENSE_INVERTED_HEADING_RE.match(first_heading):`) per R3 decision: **concatenate both bodies** instead of choosing one. Keep `_append_to_key_decisions(opener, twin_paragraph)` for the opener splice, then extend the `parts` loop to include the full `first_body` (not just the first paragraph). Reference quickstart §3c. `scripts/regenerate-blog-archive.py`
- [ ] T018 [test] Extend `test_stitch.py` with 2 splice-preservation cases: (a) `test_twin_heading_splice_preserves_all_four_images` using a `176-log-panel-ux`-shaped fixture (4 image refs across two `## Screenshots` sections) — assert 4 refs in merged output; (b) `test_non_twin_heading_merge_unchanged` — regression guard that the existing 1-paragraph splice path still works for posts without twin headings. `tests/regenerate_blog_archive/test_stitch.py`
- [ ] T019 Run `uv run pytest tests/regenerate_blog_archive/test_stitch.py -v` — expect 5 baseline + 8 rollup + 8 composite + 2 splice = 23 stitcher tests pass. Also run `uv run pytest tests/regenerate_blog_archive/ -q` — expect 77 + 2 = 79 total green. `tests/regenerate_blog_archive/test_stitch.py`

**Phase 5 completion gate**: splice-path regression closed; concat branch covered by test. Commit as `feat(231): patch three stitchers to preserve + rewrite member images` (can also fold T011/T014 into this commit — one logical change is "the three stitcher patches").

## Phase 6: User Story 5 — Orphan / Broken / Malformed Sections in Archive Index (P2)

**Story goal**: `ARCHIVE-REBUILD.md` surfaces three new maintainer-facing sections — orphan screenshots (files on disk but unreferenced), broken image references (referenced but missing on disk), and malformed image references (`![` that didn't parse). All three always present even when empty, sorted deterministically for NFR-005 byte-identical reproducibility.

**Independent test criteria**: After T025 passes and the full archive is re-run in Polish (T027), open `ARCHIVE-REBUILD.md` — it must contain three new sections: `## Orphan Screenshots` listing 19 images across specs 085 (9), 118 (9), 142 (1); `## Broken Image References` (empty body acceptable); `## Malformed Image References` (empty body acceptable). Byte-identical across two successive generator runs.

- [ ] T020 Extend the `ArchiveIndex` dataclass (revival line 223) with three new fields: `orphans: list[OrphanImage] = field(default_factory=list)`, `broken_refs: list[BrokenImageReference] = field(default_factory=list)`, `malformed_refs: list[MalformedImageReference] = field(default_factory=list)`. Depends on T004. `scripts/regenerate-blog-archive.py`
- [ ] T021 Implement `scan_orphans(spec, referenced_basenames, seen_resolved) -> list[OrphanImage]` per `contracts/helpers.md` §Orphan scanner. Walks `evidence/screenshots/**` rglob (png/gif/jpg/jpeg) plus top-level `evidence/*.png|gif`; dedupes by `Path.resolve()` against `seen_resolved` (FR-012 symlink dedup); skips referenced basenames; for specs with `shipped_post_path is None` the caller passes empty `referenced_basenames` so every asset surfaces (Issue 5A). Depends on T004. `scripts/regenerate-blog-archive.py`
- [ ] T022 Wire orphan/broken/malformed population into `ArchiveIndex` construction. For each spec: run `harvest_image_refs` (extend `index.malformed_refs`), build `referenced_basenames` from `ref.source_path` basenames (strip `?query`/`#fragment`), resolve each ref against `spec.shipped_post_path.parent` (Issue 2A) and record `BrokenImageReference` when `resolved.is_file()` is false, then call `scan_orphans`. Skip broken-ref check for refs whose `source_path` starts with `http://` / `https://` / `data:` / `/`. Reference quickstart §4. Depends on T008+T020+T021. `scripts/regenerate-blog-archive.py`
- [ ] T023 Patch `ArchiveIndex.__str__` (or equivalent serialiser) to append three new sections after the existing runbook + index + run-log sections: `## Orphan Screenshots`, `## Broken Image References`, `## Malformed Image References`. Always present (empty-body placeholder paragraph when list empty). Sort at serialisation boundary (Issue 3A): orphans by `(spec_key, filename)`, broken_refs by `(spec_key, source_path)`, malformed_refs by `(spec_key, line_number)`. Each orphan row pairs spec to target generated post path from `Classification`. Depends on T020+T022. `scripts/regenerate-blog-archive.py`
- [ ] T024 [test] Extend `test_index.py` with 9 cases: `test_orphan_section_always_present_even_when_empty`, `test_orphans_render_in_deterministic_order` (insert reverse order → output sorted), `test_three_orphan_fixture_matches_baseline` (085×9, 118×9, 142×1), `test_broken_section_always_present_even_when_empty`, `test_broken_ref_with_query_string_preserves_suffix_in_row`, `test_broken_ref_with_escaped_alt_text_renders_safely`, `test_malformed_section_always_present_even_when_empty`, `test_malformed_ref_row_shows_line_number_and_snippet`, `test_byte_identical_across_two_successive_str_calls` (strong reproducibility gate — Issue 3A). `tests/regenerate_blog_archive/test_index.py`
- [ ] T025 [test] Add four `scan_orphans` cases to `test_index.py`: `test_orphan_scanner_emits_all_when_no_shipped_post`, `test_orphan_scanner_dedupes_by_resolved_path`, `test_orphan_scanner_skips_referenced_basenames`, `test_orphan_scanner_includes_top_level_evidence_gif`. `tests/regenerate_blog_archive/test_index.py`
- [ ] T026 [test] Write `test_end_to_end.py` per `contracts/helpers.md` §End-to-end test (Issue 9A). Minimal 3-spec fixture tree: one unified w/ twin-heading + 4 images, one rollup with one 3-image member, one composite with three members carrying 7+5+4 images. Run full `regenerate_blog_archive` flow; assert SC-001 (ref-count parity), SC-002 (zero source-relative paths across all three filename patterns), SC-005 (three new sections present), reproducibility (`str(index) == str(index)` + second run byte-identical), NFR-001 (`elapsed < 10.0s` at 3-spec scale per Issue 10A). `tests/regenerate_blog_archive/test_end_to_end.py`
- [ ] T027 Run `uv run pytest tests/regenerate_blog_archive/ -q` — expect 79 prior + 13 index extensions + 1 E2E = 93 total tests pass. Commit Phase 6 as two atomic commits: `feat(231): add orphan + broken + malformed sections to ARCHIVE-REBUILD.md` (T020–T025) and `test(231): add end-to-end integration test` (T026). `tests/regenerate_blog_archive/`

**Phase 6 completion gate**: all generator patches landed + full unit/integration coverage green. Ready to run against the real archive.

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Re-run the patched generator against the real archive, verify every success criterion, delete the ephemeral generator per FR-009, capture evidence, publish the blog post, ship the PR.

### Re-run & verify

- [ ] T028 Re-measure source baseline before re-run: `grep -cE '!\[.*\]\(' specs/*/media/shipped-post.md | awk -F: '{s+=$2} END {print "source:", s}'` — expect ≥ 64 (baseline at 2026-04-24). Record the number for SC-001 comparison. `specs/*/media/shipped-post.md`
- [ ] T029 Run `uv run python scripts/regenerate-blog-archive.py --force` and capture stdout + run-log output for `evidence/cli-demo.txt` (T035). Expect ≤ 60 s elapsed (NFR-001). `ARCHIVE-REBUILD.md`
- [ ] T030 Verify SC-001 / SC-002 / SC-003 / SC-004 / SC-005 via three-explicit-globs grep bundle from research R8: count generated refs ≥ baseline, zero source-relative paths, 185 composite ≥ 16 refs, 125 rollup has 3 thumbnail refs, three new index sections present. **Use three separate globs; brace expansion silently misses `epic-rollup.md`.** `specs/*/media/ ARCHIVE-REBUILD.md`
- [ ] T031 Verify NFR-005 reproducibility: re-run `uv run python scripts/regenerate-blog-archive.py --force` a second time; assert `git diff --name-only specs/*/media/ ARCHIVE-REBUILD.md | wc -l` is `0` (byte-identical). `specs/*/media/ ARCHIVE-REBUILD.md`
- [ ] T032 Run `task verify` (lint + typecheck + pytest + Playwright E2E). All gates green before delete. Commit as `feat(231): re-run generator with screenshot fix` (includes the regenerated `specs/*/media/*.md` + `ARCHIVE-REBUILD.md`). `specs/231-blog-archive-screenshot-fix/evidence/`

### Evidence collection

- [ ] T033 Capture test results using `.specify/templates/evidence/test-summary-template.md` in `specs/231-blog-archive-screenshot-fix/evidence/test-summary.md`. YAML front matter must include `feature: 231`, `captured_at` (ISO timestamp), `git_sha` (branch HEAD), `tests_passed` (expect ~93: 54 baseline + 39 new), `tests_failed: 0`, `tests_skipped: 0`, `coverage_pct` (≥ 77 % per NFR-004). Body: test counts per file, key scenarios verified (SC-001 through SC-009 mapping). `specs/231-blog-archive-screenshot-fix/evidence/test-summary.md`
- [ ] T034 [P] Create usage demonstration in `specs/231-blog-archive-screenshot-fix/evidence/usage-example.md` — walk reader through the full revive → patch → re-run → delete cycle with commands and expected outputs. Show how a reviewer reproduces the fix locally from a fresh checkout of `main`. `specs/231-blog-archive-screenshot-fix/evidence/usage-example.md`
- [ ] T035 [P] Capture generator terminal session in `specs/231-blog-archive-screenshot-fix/evidence/cli-demo.txt` (from T029 output). Show the summary block with post counts + run log + elapsed time. `specs/231-blog-archive-screenshot-fix/evidence/cli-demo.txt`
- [ ] T036 [P] Capture before/after sample in `specs/231-blog-archive-screenshot-fix/evidence/before-after-sample.md`. Two excerpts: (a) `specs/185-cql2-array-filter/media/composite-post.md` before (pre-patch commit) showing 0 images vs after showing ≥ 16 images under three `#### Screenshots` blocks; (b) `specs/176-log-panel-ux/media/unified-post.md` before (3 refs with `./evidence/` paths) vs after (4 refs with Jekyll `/assets/images/future-debrief/...` paths). Use `git show HEAD~N:specs/...` for the before side. `specs/231-blog-archive-screenshot-fix/evidence/before-after-sample.md`

### Delete the generator (FR-009)

- [ ] T037 Delete generator and tests: `git rm scripts/regenerate-blog-archive.py && git rm -r tests/regenerate_blog_archive/`. Verify SC-006: neither path exists in HEAD. Commit as `feat(231): delete revived generator per FR-009`. `scripts/regenerate-blog-archive.py tests/regenerate_blog_archive/`

### Media content

- [ ] T038 Spawn Content Specialist (`.claude/agents/media/content.md`) via Task tool to create the Feature Post at `specs/231-blog-archive-screenshot-fix/media/shipped-post.md`. First three sections (What We're Building, How It Fits, Key Decisions) **MUST be copied verbatim** from `specs/231-blog-archive-screenshot-fix/evidence/opening-context.md` (already cached during `/speckit.plan`). Remaining sections (Screenshots, By the Numbers, Lessons Learned, What's Next) written from evidence files captured in T033–T036. Front matter: `layout: future-post`, `title: "Building Screenshot-Complete Blog Archive"`, `track: [credibility]`, `author: Ian`, `reading_time` calculated, `tags: [tracer-bullet, archive, media]`, `excerpt` ≤ 150 chars. `specs/231-blog-archive-screenshot-fix/media/shipped-post.md`

### PR creation

- [ ] T039 Create PR and publish blog: run `/speckit.pr`. This opens the feature PR in `debrief/debrief-future` with the full six-commit trajectory + evidence, and publishes `media/shipped-post.md` to `debrief/debrief.github.io`. Returns both PR URLs.

**Task T039 must run last. It depends on every prior task being complete, including all evidence files (T033–T036), the generator deletion (T037), and the blog post (T038).**

## Dependencies

**Story completion order** (topological, respecting shared foundation):

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundation — satisfies US4 at helper level)
    ↓
    ├──→ Phase 3 (US1 Epic Rollup, P1) ─┐
    ├──→ Phase 4 (US2 Composite, P1)   ─┤
    └──→ Phase 5 (US3 Unified Splice, P2)┤
                                         ↓
                           Phase 6 (US5 Index Sections, P2 — depends on harvester for malformed + broken populations)
                                         ↓
                           Phase 7 (Polish — re-run, verify, delete, evidence, PR)
```

**Inter-task dependencies within phases**:

- **Phase 2**: T004–T007 can run in parallel (independent helpers + tests). T008 depends on T004+T005+T006. T009 depends on T008. T010 depends on T007+T009.
- **Phase 3**: T011 depends on T008 (Foundation). T012 depends on T011. T013 depends on T012.
- **Phase 4**: T014 depends on T008. T015 depends on T014. T016 depends on T015. Phases 3 and 4 are strictly independent at the implementation level — T011 and T014 could run in parallel, but T012/T015 share `test_stitch.py` (sequential edits to avoid conflicts).
- **Phase 5**: T017 depends on nothing past Phase 1 (twin-heading splice is independent of Phase 2/3/4 changes). T018/T019 follow.
- **Phase 6**: T020 depends on T004 (dataclasses). T021 depends on T004. T022 depends on T008+T020+T021. T023 depends on T020+T022. T024/T025/T026/T027 follow.
- **Phase 7**: T028→T029→T030→T031→T032 strictly sequential (each validates the previous). T033 depends on T032 (needs `task verify` green + git sha). T034/T035/T036 parallel after T032. T037 depends on T032 (delete only after gates green). T038 depends on T033–T036 (evidence references in the blog post). T039 depends on every prior task.

**Key independence claims**:

- US1, US2, US3 are strictly independent stitchers — any one can ship alone if the others slip, and each produces its own visible fix in the archive.
- US5 is independent of US1/2/3 but depends on the harvester (Phase 2) for malformed/broken population.
- US4 has no dedicated phase; it is validated in Polish via the three-globs SC-002 grep (T030).

## Implementation Strategy

### Incremental delivery MVP

**Minimum shippable slice (if time compresses)**: Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 7 (with reduced evidence). This ships both P1 stories (US1 + US2, which close 33 of 34 dropped images) with full rewriter coverage. Phase 5 (US3 splice, P2, one image) and Phase 6 (US5 index sections, P2) can defer if genuinely blocked, but the "do it once, do it right" directive makes landing all five stories in one PR the expected shape. **Default plan is all seven phases in one PR.**

### Commit trajectory

Mirrors the quickstart §6 Commits:

1. `feat(231): revive #228 generator for screenshot-fix work` (T001–T003)
2. `feat(231): add image harvester + path rewriter with unit tests` (T004–T010)
3. `feat(231): patch three stitchers to preserve + rewrite member images` (T011–T019 — Phases 3+4+5 folded; all three stitcher patches belong together as one logical change)
4. `feat(231): add orphan + broken + malformed sections to ARCHIVE-REBUILD.md` (T020–T025)
5. `test(231): add end-to-end integration test` (T026–T027) — separate commit so reviewer can read the integration assertions without the stitcher noise
6. `feat(231): re-run generator with screenshot fix` (T028–T032; includes the regenerated `specs/*/media/*.md` + `ARCHIVE-REBUILD.md` — this is the big prose diff the reviewer reads)
7. `feat(231): delete revived generator per FR-009` (T037) + evidence + blog post folded into this or a follow-up commit

Expect 6–7 commits. Reviewer reads 2, 3, 4 carefully; skims 1, 5, 6, 7.

### Parallel execution opportunities

Within Phase 2, the following can run in parallel (independent files or independent code regions):

```
T004 (dataclasses) ─┐
T005 (regexes)     ─┼─→ T008 (harvest_image_refs)
T006 (rewrite)     ─┘
T007 (test_path_rewrite.py) runs in parallel with T004/T005/T006
```

Within Phase 7, evidence capture tasks T034 / T035 / T036 run in parallel after T032 (`task verify`) passes. T037 (delete) cannot start until T032 is green.

### Risk mitigation

- **If `pyright --strict` rejects the revived script**: pyright errors in the un-patched revival block the feature. Mitigation — T003 runs pyright before any patches so the baseline is verified first.
- **If the twin-heading concat (T017) regresses the 6-of-6 image-preserving unified posts**: fall back to R3's post-merge reconciliation variant (`## Additional Screenshots` at post tail). Decision recorded in research R3.
- **If the elapsed-time assertion in T026 is flaky on CI** (< 10 s budget at 3-spec scale): bump the budget to `< 30s` — the E2E test exists to catch order-of-magnitude regressions, not to guard against CI jitter.
- **If the archive's source-image count has drifted since 2026-04-24**: T028 measures the current baseline first; SC-001 adapts. The invariant is "set-equal across source and generated", not a fixed integer threshold.
