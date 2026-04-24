# Implementation Plan: Fix Screenshot Handling in Regenerated Blog Archive

**Branch**: `231-blog-archive-screenshot-fix-impl` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/231-blog-archive-screenshot-fix/spec.md`
**Backlog item**: #231 (follow-up to #228 / PR #518)

## Summary

Revive the one-shot blog-archive generator (`scripts/regenerate-blog-archive.py`)
and its tests (`tests/regenerate_blog_archive/`) from commit `19406178`,
apply surgical patches, re-run, re-delete in the same PR per #228 FR-009:

1. **Image harvester + path rewriter** — dual sibling regexes
   `_IMAGE_RE` (markdown) and `_HTML_IMG_RE` (HTML `<img>` tag, FR-010)
   with a count-vs-match malformed-reference surface (FR-013 / Issue 8A),
   plus a loop-strip rewriter that converts source-relative paths —
   including multi-level climbs (FR-011) — to
   `/assets/images/future-debrief/{slug}/{basename}`.
2. **Three stitchers patched** —
   - `stitch_epic_rollup` gains a new `## Member Features` section
     between the existing `## Members` index and `## What Shipped` summary
     (Issue 1A; the revival source had no per-member body quotes at all).
   - `stitch_composite_post` extends its existing member-iteration loop
     with inline `#### Screenshots` sub-blocks per member.
   - `_merge_opener_with_shipped_body` concatenates both bodies inside
     the twin-heading splice branch instead of choosing one, preserving
     the 176-log-panel-ux fourth image.
3. **Archive index extended** — `ARCHIVE-REBUILD.md` gains three new
   sections (`## Orphan Screenshots`, `## Broken Image References`,
   `## Malformed Image References`), each always present even when
   empty. Orphan scanner dedupes via `Path.resolve()` for symlinked
   evidence directories (FR-012) and emits every on-disk asset for
   specs without a shipped-post (Issue 5A). Broken-reference resolution
   is rooted at `shipped_post_path.parent` (Issue 2A). All three lists
   sort by `(spec_key, secondary)` at serialisation for byte-identical
   reproducibility (Issue 3A / NFR-005).

Net effect: closes 34 of 34 dropped image references + surfaces 19
orphans + annotates any broken or malformed references + brings HTML
`<img>`, multi-level path climbs, and symlinked evidence dirs into scope
per the "do it once, do it right" directive. Generator and tests
disappear again in the final commit of the PR (FR-009).

## Technical Context

**Language/Version**: Python 3.11 (matches project baseline, stdlib-first)
**Primary Dependencies**: Python stdlib (`re`, `pathlib`, `dataclasses`,
`datetime`, `argparse`, `json`, `urllib.request`, `subprocess`), `PyYAML`
(already present via `linkml` transitive); optional `gh` CLI (shelled out
for PR body retrieval; graceful degradation if absent).
**Storage**: local filesystem — reads `specs/*/media/shipped-post.md` and
`specs/*/evidence/**`, writes three generated post files per classified
spec (`unified-post.md`, `epic-rollup.md`, or `composite-post.md` under
`specs/*/media/`) plus `ARCHIVE-REBUILD.md` at repo root. Note the
rollup filename is `epic-rollup.md`, not `epic-rollup-post.md` — verify
with three explicit globs, never a brace-expansion group.
**Testing**: pytest + pytest-cov (existing). Three new test files under
`tests/regenerate_blog_archive/` (`test_image_harvest.py`,
`test_path_rewrite.py`, `test_end_to_end.py` — Issue 9A) plus extensions
to `test_stitch.py` (full matrix for rollup + composite; 5 baseline +
3 screenshot assertions per stitcher — Issue 7A) and `test_index.py`
(orphan/broken/malformed sections + deterministic-sort regression test).
`pyright --strict` required on the revived script (NFR-003).
**Target Platform**: Linux/macOS dev machines + CI (`task verify`).
Offline-capable (Article I.1); no network dependencies in the patch surface.
**Project Type**: single — one-shot script + its unit-test package.
**Performance Goals**: ≤ 60 s for the full archive generation at current
archive size (95 specs); ≤ 5 min at hypothetical 10× scale (NFR-001,
bumped from #228's single-scale clause per Issue 10A). E2E test asserts
elapsed < 10 s at 3-spec fixture scale as an in-CI proxy.
**Constraints**: ≤ 400 changed Python LoC + ≤ 2800 changed prose LoC
(SC-008 — bumped from 300/2500 to absorb FR-010..FR-013 and the full
rollup + composite test matrix). No new runtime dependencies (NFR-002).
Byte-identical output across two successive runs (NFR-005 / Article I.4),
enforced by the E2E test's reproducibility sub-assertion.
**Scale/Scope**: ~95 shipped specs discovered; 73 generated posts (56
unified + 3 epic rollups + 14 composites); 57 source image references;
19 orphan screenshots.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` (v1.2.0).

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I.1 Offline by default | Patch must not introduce network deps | ✅ PASS | stdlib-only; `gh` CLI optional w/ graceful degradation (inherited from #228) |
| I.3 No silent failures | Broken image refs, malformed markdown, and HTML `<img>` must surface | ✅ PASS | FR-007 Broken + FR-013 Malformed sections + FR-010 HTML harvesting + harvester preserves every match |
| I.4 Reproducibility | Byte-identical output across runs | ✅ PASS | NFR-005; explicit deterministic sort on orphans + broken + malformed refs at serialiser boundary; E2E test asserts diff=0 across two runs |
| II Schema Integrity | No hand-written types shadowing LinkML schemas | ✅ PASS | Three new dataclasses are ephemeral (FR-009 deletion); no cross-boundary persistence |
| III Data Sovereignty | No telemetry, source preserved | ✅ PASS | Source shipped posts never modified; only `specs/*/media/` + `ARCHIVE-REBUILD.md` written |
| IV Architectural Boundaries | Services never touch UI | ✅ N/A | Script is a build-time tool, not a service |
| VI Testing | New code carries unit tests; CI green | ✅ PASS | NFR-004 (+5–10 tests); `task verify` gate per Before Pushing |
| VII Test-Driven AI Collaboration | Acceptance criteria exist before code | ✅ PASS | Spec SC-001–SC-008 + contracts/helpers.md test tables |
| VIII Documentation | Spec before code, changelog maintained | ✅ PASS | Spec exists; CHANGELOG entry added in re-run commit |
| IX Dependencies | No new deps without justification | ✅ PASS | NFR-002 — zero new deps |
| X Security | No secrets, no cloud assumptions | ✅ PASS | Local-only file I/O |
| XIII.2 Atomic commits | One logical change per commit | ✅ PASS | Quickstart prescribes 6 atomic commits |
| XV.1 Explicit types everywhere | All new fns have annotations | ✅ PASS | All three helpers + dataclasses fully typed |
| XV.2 `Any`/`any` prohibited | No new `Any` introduced | ✅ PASS | Regex matches narrow to `str`; dataclass fields typed |
| XV.3 Strict mode mandatory | pyright --strict passes on script | ✅ PASS | NFR-003 |

**Gate result**: ALL PASS — no violations. No entries required in
Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/231-blog-archive-screenshot-fix/
├── spec.md              # Feature specification (authored 2026-04-24)
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R8
├── data-model.md        # Phase 1 — ImageReference / OrphanImage / BrokenImageReference
├── quickstart.md        # Phase 1 — 6-commit implementer walkthrough
├── contracts/
│   └── helpers.md       # Phase 1 — helper + stitcher contracts
├── evidence/
│   └── opening-context.md  # Phase 2 — cached opener (written by /speckit.plan)
└── tasks.md             # Phase 2+ — created by /speckit.tasks (not by this command)
```

### Source Code (repository root)

```text
# Files touched by this feature (all ephemeral — deleted in commit 6)

scripts/
└── regenerate-blog-archive.py       # REVIVE from 19406178; +200 LoC; DELETE before merge

tests/
└── regenerate_blog_archive/         # REVIVE from 19406178; extend +3 files; DELETE before merge
    ├── conftest.py                  # unchanged on revival
    ├── test_classify.py             # unchanged
    ├── test_cli_args.py             # unchanged
    ├── test_epic_charter.py         # unchanged
    ├── test_index.py                # EXTEND — +9 orphan/broken/malformed/deterministic-sort cases
    ├── test_opener.py               # unchanged
    ├── test_pr_body.py              # unchanged
    ├── test_ship_date.py            # unchanged
    ├── test_stitch.py               # EXTEND — +16 rollup/composite full-matrix + twin-heading cases (Issue 7A)
    ├── test_image_harvest.py        # NEW — 11 harvester cases (markdown + HTML + malformed)
    ├── test_path_rewrite.py         # NEW — 12 rewriter cases (loop-strip, suffix, scheme)
    └── test_end_to_end.py           # NEW — 1 integration test: 3-spec fixture, full run, SC-001/002/005 + reproducibility (Issue 9A)

# Files regenerated by the script (output — reviewer reads as prose diff)

specs/*/media/
├── unified-post.md                  # 6 files regain image refs w/ rewritten paths
├── epic-rollup.md                   # 3 files gain member-spec Screenshots blocks
└── composite-post.md                # 14 files gain member-spec Screenshots blocks

ARCHIVE-REBUILD.md                   # gains Orphan Screenshots + Broken Image References sections
```

**Structure Decision**: Single-file module pattern inherited from #228.
No new packages, no new test directories, no code-organisation change.
The patch surface is confined to `scripts/regenerate-blog-archive.py`
(module) and `tests/regenerate_blog_archive/` (mirror test package).

## Media Components

**None — backend / infrastructure feature.**

This patch regenerates markdown files and the repo-root index; it produces
no visual components, no Storybook stories, no UI surface. The output *is*
the archive of feature blog posts, but those posts are prose + embedded
images, not interactive demos.

**Inclusion Criteria Applied**: all three criteria explicitly not met.

## Storybook E2E Testing

**None — no interactive UI components.**

## Web-Shell E2E Testing

**None — no extension workflow changes.**

Verification happens at Python unit-test level (54 existing tests + ~12
new) and at shell-grep level (SC-001/002/003/004/005). The full E2E
Playwright suites still run under `task verify` as a regression
safety net — they must continue to pass but no new tests are added.

## Complexity Tracking

> Constitution Check is all-PASS. No violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | — | — |

---

## Phase Outputs

- **Phase 0 (research)** → `research.md` — 8 decisions (R1–R8), no open
  questions.
- **Phase 1 (design)** → `data-model.md`, `contracts/helpers.md`,
  `quickstart.md`.
- **Phase 1.5 (media assessment)** → None — backend feature.
- **Phase 2 (opening context)** → `evidence/opening-context.md`.
- **Next command**: `/speckit.tasks` (or `/bugfix` — this item is classed
  as Tech Debt in BACKLOG, and the spec's 6-commit quickstart is already
  a concrete tasks skeleton).
