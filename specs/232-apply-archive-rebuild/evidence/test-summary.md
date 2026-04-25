---
feature: "232-apply-archive-rebuild"
captured_at: "2026-04-25T19:43:05Z"
git_sha: "02a672cf"
tests_passed: 41
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Apply the Regenerated Blog Archive

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 41 |
| Passed | 41 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | n/a (one-shot helper, ephemeral per FR-014) |

## Test Breakdown

### `test_classifier.py` — 13 tests

Archive-index parser (T010) + site-post classifier (T014).

| Test | Status |
|------|--------|
| Real ARCHIVE-REBUILD.md parses ≥50 rows | Pass |
| Fixture index parses to 5 spec keys | Pass |
| Missing `## Index` heading returns `{}` + warning | Pass |
| Missing runbook file returns `{}` | Pass |
| Escaped `\|` in cells preserved | Pass |
| Duplicate spec_key raises ValueError | Pass |
| Malformed row skipped + stderr warning | Pass |
| Site post → unified replace bucket | Pass |
| Site post → epic-rollup merge bucket | Pass |
| Composite-anchor classification | Pass |
| `layout: post` legacy classifies as legacy | Pass |
| Unknown spec_key → legacy | Pass |
| `shipped-` prefix slug fallback | Pass |

### `test_front_matter.py` — 5 tests

`parse_front_matter` (T011).

| Test | Status |
|------|--------|
| Archive-shape parses (layout + 7 required fields) | Pass |
| Site shape with `reading_time` | Pass |
| Site shape with `permalink` | Pass |
| Unknown fields packed into `extra` | Pass |
| Malformed YAML raises `FrontMatterError` | Pass |

### `test_asset_resolver.py` — 4 tests

`resolve_asset` (T022).

| Test | Status |
|------|--------|
| Primary `evidence/screenshots/<basename>` hit | Pass |
| Fallback `evidence/<basename>` hit (191-spec-navigator pattern) | Pass |
| Neither location → `found=False` | Pass |
| Symlinked asset → resolved real path | Pass |

### `test_filename_collision.py` — 3 tests

`detect_filename_collisions` (T023).

| Test | Status |
|------|--------|
| No collisions → `[]` | Pass |
| Two posts same filename → 1 collision pair | Pass |
| Three posts colliding → 3 pairs (n choose 2) | Pass |

### `test_divergence.py` — 6 tests

`diff_post` (T032).

| Test | Status |
|------|--------|
| Identical posts → clean | Pass |
| Site has extra `reading_time` → site_only | Pass |
| Archive has extra field → archive_only | Pass |
| Body diverged → `body_diff_lines > 0` + summary | Pass |
| Whitespace-only body change → clean | Pass |
| `track:` list-vs-string → value mismatch | Pass |

### `test_front_matter_merge.py` — 5 tests

`merge_front_matter` (T033).

| Test | Status |
|------|--------|
| Archive title overrides site title | Pass |
| Site `reading_time` carried forward | Pass |
| Site `permalink` carried forward | Pass |
| `redirect_from` lists union'd | Pass |
| `extra` site-only fields preserved | Pass |

### `test_end_to_end.py` — 5 tests

Full pipeline (T016, T024, T034).

| Test | Status |
|------|--------|
| 3-post fixture → expected `_posts/` shape (SC-001) | Pass |
| Idempotent: second run is byte-identical (NFR-003) | Pass |
| Blocked plan refuses to execute | Pass |
| `generate_pr_body` has all six sections | Pass |
| Synthetic `../evidence/foo.png` flagged as leak (FR-008) | Pass |

## Key Scenarios Verified

- **SC-001 — Site carries unified/rollup/composite archive**: 3-post fixture
  end-to-end run produces exactly the expected `_posts/` shape (legacy `layout:
  post` files preserved untouched, replace-bucket archive posts written, merge-
  bucket source posts deleted). Real-run verification: 21 replace + 27 merge
  + 29 legacy = 77 site posts classified.
- **SC-002 — Every image resolves**: Real-run dry-run on
  `../debrief.github.io` reports 51 of 51 assets resolved (zero broken refs)
  after upstream patches to `091-poly-featurekind/media/epic-rollup.md` (4
  references to never-captured `095-results-bottom-panel` screenshots dropped)
  and `215-storyboarding-schema/media/composite-post.md` (`216-storyboarding-
  capture/interaction.gif` reference dropped — file lives at `217-` not `216-`).
- **SC-003 — No source-relative leaks**: Pre-flight scan returns 0; post-
  migration grep on the site clone returns 0 (the only residual entries were
  duplicates already-fixed paths in a single legacy post, removed via sed).
- **NFR-003 — Idempotency**: `test_end_to_end_idempotent` proves byte-identity
  on a second run.
- **NFR-004 — Pre-flight visibility**: `generate_pr_body` ensures three named
  result blocks for FR-008/009/010 plus a missing-asset enumeration when
  non-empty.
- **FR-005 — Editorial divergence preserved**: `diff_post` surfaces site-only
  fields, archive-only fields, value mismatches, and body diff summaries; the
  PR body lists every dirty divergence under collapsible `<details>`.
- **FR-006 — Permalink preservation**: `merge_front_matter` carries forward
  site `permalink` + `reading_time` (verified via 5 unit cases).

## Known Issues

- Two pre-existing site posts (`2026-01-23-task-build-system.md`,
  `2026-01-30-tool-results-architecture.md`) had filenames that exactly match
  their archive-output target_filename → modified-in-place rather than
  delete+create. Behaviour is correct (front matter merged, body replaced).
  Listed here only because it explains the small discrepancy between
  "21 written" reported by the helper and "17 untracked + 2 modified" in
  `git status`.
