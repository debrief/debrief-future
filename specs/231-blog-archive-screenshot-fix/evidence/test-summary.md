---
feature: "231-blog-archive-screenshot-fix"
captured_at: "2026-04-24T15:45:00Z"
git_sha: "71360579"
tests_passed: 111
tests_failed: 0
tests_skipped: 0
coverage_pct: 79
---

# Test Summary: Fix Screenshot Handling in Regenerated Blog Archive

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 111 |
| Passed | 111 |
| Failed | 0 |
| Skipped | 0 |
| Coverage (scripts/regenerate-blog-archive.py) | 79% |

Baseline at #228 ship: 54 tests, 77% coverage. Net for #231: +57 tests,
+2 pp coverage. Clears NFR-004 floor.

## Test Breakdown

### Baseline revived from 19406178 (unchanged)

| Suite | Tests | Status |
|-------|------:|--------|
| `test_atomic_writer.py` | 3 | Pass |
| `test_classify.py` | 9 | Pass |
| `test_cli_args.py` | 7 | Pass |
| `test_composite_pairs.py` | 5 | Pass |
| `test_discover_specs.py` | 5 | Pass |
| `test_epic_charter.py` | 5 | Pass |
| `test_opener.py` | 2 | Pass |
| `test_parse_front_matter.py` | 7 | Pass |
| `test_pr_body.py` | 2 | Pass |
| `test_ship_date.py` | 2 | Pass |
| `test_index.py` (baseline) | 3 | Pass |
| `test_stitch.py` (baseline) | 5 | Pass |

### New in #231

| Suite | Tests | Status |
|-------|------:|--------|
| `test_path_rewrite.py` — FR-004/FR-011 rewriter | 13 | Pass |
| `test_image_harvest.py` — FR-010/FR-013 harvester | 11 | Pass |
| `test_stitch.py` — rollup (Issue 7A) | 8 | Pass |
| `test_stitch.py` — composite (Issue 7A) | 8 | Pass |
| `test_stitch.py` — twin-heading splice (US3) | 2 | Pass |
| `test_index.py` — orphan / broken / malformed + scanner (Issue 3A, FR-012) | 13 | Pass |
| `test_end_to_end.py` — 3-spec integration (Issue 9A) | 2 | Pass |

Totals: 54 baseline + 57 new = 111 tests, 100% pass.

## Key Scenarios Verified

- **SC-001 (set-equal ref parity)** — E2E fixture asserts `|generated_refs| ≥ |source_refs|` over a 3-spec tree carrying 4 + 7 + 5 + 4 markdown references. All preserved.
- **SC-002 (zero source-relative leaks)** — E2E fixture greps for `(./|../|evidence/)` prefixes in every generated post body and asserts empty. Rollup and composite stitcher tests also enforce this per-member.
- **SC-003 (185 composite ≥ 16 refs)** — `test_composite_185_shaped_cluster_has_16_image_refs` builds a 7+5+4 cluster and confirms exactly 16 `![...]` lines in the composite body.
- **SC-004 (125 rollup ≥ 3 refs)** — `test_rollup_member_with_3_images_produces_3_screenshot_refs` sized at the real #174 member.
- **SC-005 (three index sections always present)** — `test_orphan_section_always_present_even_when_empty`, `test_broken_section_always_present_even_when_empty`, `test_malformed_section_always_present_even_when_empty` guarantee the sections render even with zero entries, so a reader never needs to wonder "did the scanner run?"
- **FR-011 multi-level climb** — `test_rewrite_multi_level_climb_fr011`: `../../evidence/screenshots/foo.png` → `/assets/images/future-debrief/x/foo.png`.
- **FR-012 symlink dedup** — `test_orphan_scanner_dedupes_by_resolved_path`: symlinked screenshot emits one orphan row, not two.
- **FR-013 malformed surface** — `test_harvest_unclosed_paren_malformed_on_line_7`: `![unclosed(foo.png` on line 7 yields one malformed row with `line_number=7` and a snippet preview. The five Liquid-template refs in `216-storyboarding-capture/shipped-post.md` (`{{ site.baseurl }}/...`) surface as malformed in the real-archive run.
- **Issue 3A byte-identical reproducibility** — `test_byte_identical_across_two_successive_str_calls` renders the same `ArchiveIndex` twice with all three lists populated out-of-order; asserts `str(index) == str(index)`. Real-archive two-run diff on `specs/*/media/` is empty (ARCHIVE-REBUILD.md differs only in run timestamps).
- **Twin-heading splice image preservation (US3)** — `test_twin_heading_splice_preserves_all_four_images` covers the 176-log-panel-ux regression (source 4 refs, pre-fix generated 3). Fix preserves the full `first_body` remainder after splicing the first paragraph into Key Decisions.
- **Regression guard** — `test_non_twin_heading_merge_unchanged` verifies the non-twin path is untouched for posts that open with `## Screenshots` or any non-tense-inverted heading.

## Known Issues

None in the generator suite. All 111 tests green. (Repo-wide CI notes in the "Environment" section below.)

## Environment

- Runner: `pytest` (coverage via `pytest-cov`)
- Python: 3.11.14
- Branch: `230-rename-spec-dir` (pending rename to `231-blog-archive-screenshot-fix-impl`)
- Commit: `71360579`
- Command: `uv run pytest tests/regenerate_blog_archive/ --cov=scripts --cov-report=term`

### Ancillary CI gates on repo at 71360579

| Gate | Status | Note |
|------|--------|------|
| `task lint` (ruff + ESLint) | ✅ green | |
| `task typecheck` (pyright + tsc) | ✅ green | pyright 0 errors on `scripts/regenerate-blog-archive.py` |
| `uv run pytest` (all services) | ✅ 1936 passed | Fixed pre-existing macOS isolation bug in `services/config/tests/conftest.py` (platformdirs ignored XDG on macOS; now monkeypatches `user_config_path`). |
| `vitest` (all TS packages) | ✅ green | |
| Playwright E2E | in progress locally | `@sparticuz/chromium` bundle is Linux-only and crashes on macOS arm64 (error -8 = ENOEXEC). Running via `pnpm exec playwright install chromium` → `pnpm --filter @debrief/web-shell test` on local macOS; CI runs Ubuntu where the bundle works natively. |
