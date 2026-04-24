# No-Overwrite Proof (FR-007 / SC-004)

**Feature**: 228-regenerate-blog-archive
**Captured**: 2026-04-24
**Method**: `git ls-tree` + `git cat-file` on every `specs/*/` file tracked
on `origin/main`, comparing blob contents against current HEAD.

## Summary

- **Files tracked on `origin/main` under `specs/`**: 2443
- **Files modified by this branch vs `origin/main`**: 5
- **Files modified by the generator script itself**: 0

## The five files modified on this branch

All five are inside `specs/228-regenerate-blog-archive/` — the feature's own
workspace. They were edited by **hand** during review-patch tasks T001–T005
(Phase 1), **not** by the regenerator script.

| Path | Why |
|------|-----|
| `specs/228-regenerate-blog-archive/research.md` | T001 + T004 review patches (legacy shipped-post locator, factual numbers) |
| `specs/228-regenerate-blog-archive/data-model.md` | T002 review patch (tense-inverted twin heading stitch rule) |
| `specs/228-regenerate-blog-archive/contracts/cli.md` | T003 review patch (C11 malformed-YAML contract test row) |
| `specs/228-regenerate-blog-archive/plan.md` | T005 review patch (R7 widening companion note) |
| `specs/228-regenerate-blog-archive/tasks.md` | Progress markers flipped from `[ ]` to `[x]` as tasks completed |

## FR-007 compliance

The regenerator script (`scripts/regenerate-blog-archive.py`) **created** 74
new files (56 unified posts + 3 epic rollups + 14 composite posts + 1
`ARCHIVE-REBUILD.md` at repo root). Every file it created lives at a path
that did not exist before the run. The no-overwrite guard inside
`AtomicWriter.stage()` makes this structural: an attempt to stage a path
that already exists raises `NoOverwriteError` and the atomic context
manager rolls back the temp dir without touching the repo.

This is covered at the unit level by `test_no_overwrite_guard_raises`,
`test_c5_no_overwrites_of_existing_specs`, and
`test_no_overwrite_proof_over_a_stitch` in
`tests/regenerate_blog_archive/test_atomic_writer.py` and
`tests/regenerate_blog_archive/test_stitch.py`.

## Reproduction

```sh
# Compare current HEAD's specs/ tree against origin/main's specs/ tree.
git fetch origin main
diff <(git ls-tree -r --name-only origin/main specs/ | sort) \
     <(git ls-tree -r --name-only HEAD           specs/ | sort)
# Files in HEAD but not on main = generator output (all new files).
# Files in main but not on HEAD = <empty; nothing deleted>.
# Files in both = check hashes with `git diff origin/main -- specs/`.
```
