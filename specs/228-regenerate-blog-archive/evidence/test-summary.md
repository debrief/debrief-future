---
feature: "228-regenerate-blog-archive"
captured_at: "2026-04-24T10:30:00Z"
git_sha: "19406178"
tests_passed: 54
tests_failed: 0
tests_skipped: 0
coverage_pct: 77
---

# Test Summary: Regenerate Blog Archive

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 54 |
| Passed | 54 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | 77% |

## Test Breakdown

### Atomic writer (T031–T034)

| Test | Status |
|------|--------|
| C1 `--dry-run` no promotion | Pass |
| Successful promotion from temp dir | Pass |
| No-overwrite guard raises `NoOverwriteError` | Pass |
| Exception during block rolls back + removes temp dir | Pass |
| C5 zero existing files mutated (sha256 pre/post) | Pass |

### CLI arguments (T012–T013, C2, C3)

| Test | Status |
|------|--------|
| Defaults resolve correctly | Pass |
| C2 exit 2 on invalid `--composite-window-days` | Pass |
| Exit 2 when near-miss-max < composite-window | Pass |
| C3 exit 2 on `--out-index` at existing non-index file | Pass |
| Overwriting existing ARCHIVE-REBUILD.md allowed | Pass |

### Composite pair detection (T074–T087, C8, C9)

| Test | Status |
|------|--------|
| C9 boundary Δ=5 days qualifies | Pass |
| Noise-only shared tag produces no pair | Pass |
| C8 near-miss at Δ=7 days with shared tag | Pass |
| Δ > near-miss-max produces nothing | Pass |
| Transitive three-way cluster | Pass |
| Composite title is `Building …` prefixed | Pass |

### Classifier (T036, T050–T051, T070, T089, T101–T102, C11)

| Test | Status |
|------|--------|
| Standalone shipped → `unified` | Pass |
| In-flight (no shipped-post) → `skipped` | Pass |
| Epic precedence over composite (FR-001) | Pass |
| Coverage invariant detects duplicates | Pass |
| Coverage invariant detects missing | Pass |
| C11 malformed YAML → `skipped` + UnresolvedGrouping | Pass |

### Spec discovery (T020–T023, R7 legacy)

| Test | Status |
|------|--------|
| Canonical `media/shipped-post.md` | Pass |
| Legacy `YYYY-MM-DD-shipped-*.md` naming | Pass |
| Multiple legacy files → latest ISO wins | Pass |
| Directory without `spec.md` skipped | Pass |
| Non-conforming directory name skipped | Pass |
| `[Ex]` prefix detected in spec.md title | Pass |

### Epic charter (T055–T068, C10)

| Test | Status |
|------|--------|
| BACKLOG Epics table round-trip | Pass |
| `proposed` / `active` / `complete` statuses parsed | Pass |
| C10 rollup at lowest-NNN member anchor | Pass |
| Rollup title NOT `Building`-prefixed | Pass |
| Charter/prefix mismatch surfaced | Pass |

### Front-matter parser (T015–T016, C11)

| Test | Status |
|------|--------|
| Valid front matter | Pass |
| Missing title raises `FrontMatterError` | Pass |
| Missing date raises `FrontMatterError` | Pass |
| `track` as list joined | Pass |
| C11 malformed YAML → `FrontMatterError` | Pass |
| Tags string form | Pass |
| Noise tags filtered at boundary | Pass |

### Index + summary (T093–T104, C7)

| Test | Status |
|------|--------|
| C7 every generated post has one row | Pass |
| Runbook contains four canonical steps | Pass |
| Summary block counts match index | Pass |

### Opener loader + synthesis (T039–T040)

| Test | Status |
|------|--------|
| Cached opener copied byte-for-byte | Pass |
| Synthesis fallback prepends visible marker | Pass |

### PR-body retriever (T028–T029, C6)

| Test | Status |
|------|--------|
| C6 `--skip-gh` forces shipped-post fallback | Pass |
| Missing shipped-post returns `missing` | Pass |

### Ship-date resolver (T025–T026)

| Test | Status |
|------|--------|
| Tier 1 front-matter wins | Pass |
| Tier 3 git-log fallback when no FM + no gh | Pass |

### Stitcher (T044–T048)

| Test | Status |
|------|--------|
| Tense-inverted twin heading splice into Key Decisions | Pass |
| Title `Building …` derived from shipped-post | Pass |
| Front matter has `layout: future-post` | Pass |
| Destination ends `/media/unified-post.md` | Pass |
| Stitching does NOT mutate shipped-post source (sha256) | Pass |

## Key Scenarios Verified

- Every spec ends up in exactly one classification bucket (SC-001 invariant).
- No existing file under `specs/*/` is modified — all generated content is
  new files (FR-007). Verified at the unit level by `test_no_overwrite_proof_over_a_stitch`
  and at the run level by `evidence/no-overwrite-proof.md`.
- The tense-inverted twin heading rule (data-model review patch) prevents
  the reader seeing `## What We're Building` adjacent to `## What We Built`.
- Malformed YAML front matter becomes an `UnresolvedGrouping`; the run does
  not crash (C11 contract).
- `[Ex]`-prefix mismatches with BACKLOG are surfaced, not silently reconciled
  (FR-002 / Constitution I.3).

## Known Issues

- Two composite clusters exceed the preferred 5-member cap (comp-052…098 with
  7 members, comp-185…190 with 6 members). Warnings are logged loudly during
  the run; the spec's Open Question explicitly treats this as a dry-run tuning
  signal. NOISE_TAGS was widened once post-tuning; further widening is a
  judgement call the post-author can make before publishing.
- 2 "legacy-charter" entries under Unresolved Groupings (E07, E10): these
  epics lack `docs/ideas/Ex-*.md` companions. The rollup still generates from
  the BACKLOG description; the author may want to retroactively author the
  idea docs.

## Environment

- Runner: pytest 9.0.2 (uv-managed Python 3.11.14)
- Branch: `228-regenerate-blog-archive-impl`
- Date: 2026-04-24
- Commands:
  - `uv run pytest tests/regenerate_blog_archive/`
  - `uv run ruff check scripts/regenerate-blog-archive.py tests/regenerate_blog_archive/`
  - `uv run pyright scripts/regenerate-blog-archive.py`
