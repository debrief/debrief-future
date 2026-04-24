# Implementation Plan: Apply the Regenerated Blog Archive to debrief.github.io

**Branch**: `232-apply-archive-rebuild` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/232-apply-archive-rebuild/spec.md`
**Depends on**: #228 (runbook), #231 (archive content fix)

## Summary

Execute step 4 of `ARCHIVE-REBUILD.md` on `debrief.github.io`: replace 73
individually-published `_posts/*.md` files with the 74 archive posts
(56 unified + 3 epic-rollup + 15 composite) from `debrief-future` main's
`specs/*/media/{unified-post,epic-rollup,composite-post}.md`. Copy every
image referenced by those posts from `specs/<slug>/evidence/screenshots/`
into `debrief.github.io:assets/images/future-debrief/<slug>/`. Preserve
editorial hand-edits through a pre-migration diff audit that surfaces
divergences for reviewer decision rather than silent overwrite.

Implementation is a one-shot Python migration helper run on a maintainer
machine against two local clones (debrief-future main + a fresh
debrief.github.io checkout). Three pre-flight scans (source-relative-leak,
missing-asset, filename-collision) block migration PR open if any fire.
The helper is ephemeral per #228 FR-009 — deleted in the same PR as the
migration (or promoted to a persistent tool with its own spec if the
re-run scenario gains weight).

Companion commit on `debrief-future` main updates `ARCHIVE-REBUILD.md` to
fix its two documented bugs (FR-013): `rm _posts/future/*.md` →
`rm _posts/*.md` in step 1, and a new step describing the image-asset
copy requirement. The runbook is canonical in `debrief-future`; the stale
copy on `debrief.github.io` is overwritten or deleted as part of the
migration.

## Technical Context

**Language/Version**: Python 3.11 (matches #228/#231 baseline, stdlib-first).
**Primary Dependencies**:
- Python stdlib (`re`, `pathlib`, `hashlib`, `shutil`, `argparse`, `difflib`, `subprocess`, `json`)
- `PyYAML` (already present via `linkml` transitive — front-matter parse and re-serialise)
- `gh` CLI (PR creation on `debrief.github.io`; graceful failure if missing)
- `git` CLI (driving the `debrief.github.io` clone + branch + push)
- Jekyll / `bundle exec` (build gate — runs inside a separate CI workflow added to the site as part of migration prep)

**Storage**: local filesystem — two clones side-by-side (`debrief-future`
main + a fresh `debrief.github.io:master`). The script walks both,
reads/writes in the site clone, never mutates `debrief-future`.

**Testing**: pytest for the Python helper (scanner, classifier, asset
resolver, front-matter merger, diff engine). `bundle exec jekyll build
--safe` as the site-side gate (added to `debrief.github.io` as a GitHub
Actions workflow in a companion PR before the migration lands).

**Target Platform**: maintainer's dev machine (macOS/Linux) plus GitHub
Actions (for the Jekyll build gate). Offline-capable in the helper
itself; the only network step is the final `gh pr create` call.

**Project Type**: Single — one-shot migration script + its unit tests +
the companion runbook patch. No service code, no UI.

**Performance Goals**: seconds, not a hot path. ~73 markdown diffs,
~400 asset copies, expected < 10s end-to-end on a warm disk.

**Constraints**:
- Ephemeral tooling (FR-014 / #228 FR-009): script + tests deleted in the
  migration PR unless explicitly promoted.
- Site-side edits scoped to `_posts/*.md`, `assets/images/future-debrief/`,
  and a single-line addition to `_config.yml` enabling
  `jekyll-redirect-from` (already in the `github-pages` gem bundle — no
  new dependency, just an activation). No layout, no plugin, no theme
  changes.
- Migration PR reviewable file-by-file (NFR-001).
- Idempotent asset copy (NFR-003).

**Scale/Scope**:
- ~73 site posts to classify, diff, and replace/preserve.
- 74 archive posts from `debrief-future` main.
- ~400 image assets to copy (estimate — pending pre-flight scan).
- 1 runbook patch on `debrief-future` main.
- 1 `_config.yml` one-line edit on `debrief.github.io`.
- Optional: 1 new GitHub Actions workflow for the site's Jekyll build
  gate (companion PR before migration lands).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` (v1.2.0).

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I.1 Offline by default | No network in core path | ✅ PASS | Helper is stdlib + local filesystem; only network call is `gh pr create` at the end, which is a maintainer step outside the scan pipeline. |
| I.3 No silent failures | Pre-flight scans block migration | ✅ PASS | Three scans (FR-008/009/010); divergence audit (FR-005); broken-asset surface (FR-009). |
| I.4 Reproducibility | Idempotent output | ✅ PASS | NFR-003: asset copy idempotent; front-matter merge deterministic; Jekyll build same inputs → same outputs. |
| II Schema Integrity | No LinkML here | ✅ N/A | No data-model schema work. |
| III Data Sovereignty | Source preserved | ✅ PASS | `debrief-future` is read-only for the helper; archive posts on main are the source of truth; editorial edits on the site are surfaced, not discarded. |
| IV Architectural Boundaries | Services never touch UI | ✅ N/A | Not a service feature. |
| VI Testing | Scanner has unit tests; Jekyll build gate | ✅ PASS | Python helper covered by pytest (see Phase 1 contracts); Jekyll build step added as site CI gate. |
| VII Test-Driven AI Collaboration | Acceptance criteria before code | ✅ PASS | Spec SC-001–SC-008, FR-008/009/010 pre-flight scans define done. |
| VIII Documentation | Spec + runbook | ✅ PASS | Spec exists; runbook updated via FR-013; CHANGELOG entry in the migration PR. |
| IX Dependencies | Minimal, vetted | ✅ PASS | Python stdlib + PyYAML (already present); `gh` + `git` CLIs are standard tooling, not runtime deps; `jekyll-redirect-from` already in `github-pages` bundle. |
| X Security | No secrets, no cloud | ✅ PASS | Local file I/O + a single authenticated `gh pr create`. No secrets committed. |
| XIII.2 Atomic commits | One logical change per commit | ✅ PASS | Migration PR is a single content swap + runbook patch; helper deletion folded in per FR-014. |
| XV.1 Explicit types everywhere | All new fns annotated | ✅ PASS | Scanner + classifier + merger fully annotated (see contracts). |
| XV.2 `Any`/`any` prohibited | No new `Any` | ✅ PASS | PyYAML outputs narrowed to typed dataclasses at the boundary. |
| XV.3 Strict mode | pyright --strict passes on helper | ✅ PASS | NFR from #228 carried forward. |

**Gate result**: ALL PASS — no violations. Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/232-apply-archive-rebuild/
├── spec.md               # Feature specification
├── plan.md               # This file
├── research.md           # Phase 0 — decisions R1–R8
├── data-model.md         # Phase 1 — entities + state transitions
├── quickstart.md         # Phase 1 — maintainer walkthrough
├── contracts/
│   └── helpers.md        # Phase 1 — scanner + classifier + merger contracts
├── evidence/
│   └── opening-context.md  # Phase 2 — cached opener
└── tasks.md              # Created by /speckit.tasks (not this command)
```

### Source Code (repository root — debrief-future side)

```text
# Files touched by this feature (all ephemeral per FR-014 / #228 FR-009)

scripts/
└── 232-apply-archive-rebuild.py  # NEW; +400 LoC; DELETE in migration PR

tests/
└── apply_archive_rebuild/        # NEW; DELETE in migration PR
    ├── conftest.py
    ├── fixtures/                 # Minimal site-shape + archive-shape fixtures
    │   ├── site/_posts/*.md
    │   └── archive/specs/*/media/*.md
    ├── test_classifier.py        # site-post → bucket (replace/merge/keep)
    ├── test_divergence.py        # site vs archive front-matter + body diff
    ├── test_front_matter_merge.py  # preserve permalink/reading_time forward
    ├── test_asset_resolver.py    # archive-post → source screenshot path
    ├── test_filename_collision.py  # two archive posts → same YYYY-MM-DD-slug
    └── test_end_to_end.py        # full 3-post fixture → full migration output

ARCHIVE-REBUILD.md                # PATCH in-place — fix step 1 + add asset step
```

### Cross-Repo Writes (debrief.github.io side)

```text
# Files added/changed on debrief.github.io (migration PR payload)

_config.yml                       # +1 line: enable jekyll-redirect-from

_posts/*.md                       # Delete 73 replaced, add 74 archive-shaped
                                  #  => net +1 file, ~73 replacements

assets/images/future-debrief/<slug>/<basename>  # NEW — ~400 image copies from
                                                #  debrief-future evidence

.github/workflows/jekyll-build.yml  # NEW — site-side CI gate (Jekyll build
                                    #  on PR, blocks merge on failure)
                                    # Companion PR landed BEFORE migration
                                    # per NFR-002 (no config + content in
                                    # one PR)
```

**Structure Decision**: Single-script pattern inherited from #228 /
#231 — `scripts/NNN-<slug>.py` with a mirror test package. The script is
committed alongside its output and deleted in the same PR. This feature
reuses the atomic-writer pattern (cross-repo variant), the ephemeral
lifecycle, and the pyright-strict contract from #228. No new test
directories at the project level; `tests/apply_archive_rebuild/` mirrors
the script.

## Media Components

**None — cross-repo content migration feature.**

This is a build-time content swap on `debrief.github.io`. It produces no
new visual components, no Storybook stories, no UI surface. The output
*is* the blog archive on the live site, but those are prose + embedded
images sourced entirely from `debrief-future` archive posts — no
interactive elements are introduced by this migration.

**Inclusion Criteria Applied**: all three criteria explicitly not met.

## Storybook E2E Testing

**None — no interactive UI components.**

## Web-Shell E2E Testing

**None — no extension workflow changes.**

Verification happens at:
- Python unit-test level (pytest suite for the helper).
- Shell-grep level for the SC-002 source-relative-leak gate (pre-flight
  FR-008) and SC-003 residual-path check.
- Jekyll build level on the site (the new CI gate on `debrief.github.io`).
- Live-site level after deploy (SC-002 curl of every image URL; SC-005
  curl of each "Generated Post" link from the updated index sections).

## Complexity Tracking

> Constitution Check is all-PASS. No violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | — | — |

---

## Phase Outputs

- **Phase 0 (research)** → `research.md` — 8 decisions (R1–R8), no open
  questions carried forward from spec (both spec Open Questions resolved
  during research).
- **Phase 1 (design)** → `data-model.md`, `contracts/helpers.md`,
  `quickstart.md`.
- **Phase 1.5 (media assessment)** → None — backend / infrastructure
  feature.
- **Phase 2 (opening context)** → `evidence/opening-context.md`.
- **Next command**: `/speckit.tasks` (or `/speckit.review` first — the
  scope is medium complexity with cross-repo risk surface, so a review
  pass before task generation is warranted).
