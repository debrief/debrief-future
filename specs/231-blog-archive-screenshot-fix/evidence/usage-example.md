# Usage Example: Screenshot-Complete Blog Archive

This document walks through the full revive → patch → re-run → delete cycle
for spec 231. A reviewer can reproduce the fix end-to-end from a fresh
checkout of `main` at the pre-patch commit by following these steps.

---

## 1. Sanity audit (defect still present)

```sh
# Source markdown image references
grep -cE '!\[.*\]\(' specs/*/media/shipped-post.md | \
  awk -F: '{s+=$2} END {print "source:", s}'
# → 64

# Generated image references across all three filename patterns
grep -cE '!\[.*\]\(' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md | \
  awk -F: '{s+=$2} END {print "generated:", s}'
# → 25 (defect: 39 references silently dropped)

# Source-relative paths leaking into the generated corpus
grep -rE '!\[[^]]*\]\((\./|\.\./|evidence/)' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md | wc -l
# → 22 (defect: would all 404 under Jekyll)
```

## 2. Revive the generator + tests

```sh
git show 19406178:scripts/regenerate-blog-archive.py > scripts/regenerate-blog-archive.py
git checkout 19406178 -- tests/regenerate_blog_archive/

uv run pytest tests/regenerate_blog_archive/ -q        # 54 passed
uv run pyright scripts/regenerate-blog-archive.py      # 0 errors
uv run ruff check scripts/regenerate-blog-archive.py tests/regenerate_blog_archive/
git add scripts/regenerate-blog-archive.py tests/regenerate_blog_archive/
git commit -m "feat(231): revive #228 generator for screenshot-fix work"
```

## 3. Apply the Phase 2 additions

The patched module gains four frozen dataclasses + two regex constants +
two helper functions. See `scripts/regenerate-blog-archive.py` under the
`# Spec 231: image harvest + Jekyll path rewrite` banner (below
`_first_paragraph`):

- `ImageReference`, `OrphanImage`, `BrokenImageReference`,
  `MalformedImageReference` (`@dataclass(frozen=True)`).
- `_IMAGE_RE` — markdown `![alt](path "title")` with path permitting
  Liquid-style `{{ ... }}` expansions.
- `_HTML_IMG_RE` — case-insensitive HTML `<img src="..." alt="...">`.
- `rewrite_image_path(path, slug)` — six ordered rules (scheme →
  absolute → split suffix → loop-strip `./` `../` `evidence/` →
  basename → compose Jekyll path).
- `harvest_image_refs(body, spec)` — line-by-line markdown + HTML
  extraction with malformed-reference surface per FR-013.
- `scan_orphans(spec, ref_basenames, seen_resolved, repo_root)` — walks
  `evidence/screenshots/**` + `evidence/*.png|gif`; dedup via
  `Path.resolve()`.

Plus `SpecRecord.key` property and three new `ArchiveIndex` lists
(`orphans`, `broken_refs`, `malformed_refs`).

Commit as `feat(231): add image harvester + path rewriter with unit tests`.

## 4. Apply the three stitcher patches

- `stitch_epic_rollup` — new `## Member Features` section between the
  existing `## Members` bullet index and `## What Shipped` summary.
  Each shipped member emits `### NNN-slug — YYYY-MM-DD`, a first-
  paragraph intro, and a `#### Screenshots` sub-block when refs > 0.
- `stitch_composite_post` — extends the existing `## What Shipped`
  per-member loop with a `#### Screenshots` sub-block after the
  first-paragraph emission.
- `_merge_opener_with_shipped_body` — twin-heading branch preserves
  the remainder of the twin-heading section (images + follow-up
  paragraphs) as an un-headed body block. Closes the 176-log-panel-ux
  fourth-image drop (FR-005).

Commit as `feat(231): patch three stitchers to preserve + rewrite member images`.

## 5. Apply the Phase 6 audit

- `audit_image_references(index, specs, repo_root)` orchestrator
  populates `index.orphans` / `broken_refs` / `malformed_refs` by
  walking every spec, harvesting refs, running a broken-ref check
  against `shipped_post_path.parent`, and invoking `scan_orphans`.
- `serialise_archive_index` emits three new sections (always present,
  placeholder text when empty, sorted at serialisation boundary).
- `stitch_unified_post` now calls `rewrite_image_paths_in_body` on
  the merged body so unified posts also get Jekyll paths.

Commits: `feat(231): add orphan + broken + malformed sections to ARCHIVE-REBUILD.md`
and `test(231): add end-to-end integration test`.

## 6. Re-run the generator

```sh
# Wipe the pre-patch outputs so stale unified-post.md files
# (specs reclassified as composite-members) don't linger.
find specs -path 'specs/*/media/unified-post.md' -delete
find specs -path 'specs/*/media/epic-rollup.md' -delete
find specs -path 'specs/*/media/composite-post.md' -delete

uv run python scripts/regenerate-blog-archive.py --skip-gh

# Verify SC-001 / SC-002 / SC-005 via three explicit globs (no brace
# expansion — it silently misses epic-rollup.md).
grep -cE '!\[.*\]\(' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md | \
  awk -F: '{s+=$2} END {print "total:", s}'
# → 64 (matches source)

grep -rE '!\[[^]]*\]\((\./|\.\./|evidence/)' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md | wc -l
# → 0 (SC-002)

grep -c 'Orphan Screenshots' ARCHIVE-REBUILD.md          # → 1
grep -c 'Broken Image References' ARCHIVE-REBUILD.md     # → 1
grep -c 'Malformed Image References' ARCHIVE-REBUILD.md  # → 1

grep -c '!\[' specs/185-cql2-array-filter/media/composite-post.md
# → 16 (SC-003: 7 + 5 + 4 from 186, 189, 190)

grep -c '!\[' specs/125-stac-extension-mock-data/media/epic-rollup.md
# → 3 (SC-004: from 174-thumbnail-capture)
```

## 7. Verify CI green

```sh
uv run ruff check .                                          # clean
uv run pyright                                               # 0 errors
uv run pytest                                                # 1935+ pass
pnpm -r typecheck                                            # N/A for this feature
```

## 8. Delete the generator (FR-009)

```sh
git rm scripts/regenerate-blog-archive.py
git rm -r tests/regenerate_blog_archive/
git commit -m "feat(231): delete revived generator per FR-009"
```

## 9. Inspect a before/after for reviewer confidence

See `before-after-sample.md` in this directory for the 185 composite
(0 → 16 images) and 176-log-panel-ux case (3 → 4 images with Jekyll
paths, concatenated twin-heading remainder).

---

## Post-PR maintainer runbook

The unchanged `ARCHIVE-REBUILD.md` runbook still applies:

1. Wipe `debrief.github.io/_posts/future/*.md`.
2. Copy generated files per the index table.
3. Adjust front matter per site conventions.
4. Build and deploy.

New for #231: the maintainer must also copy each referenced image from
`specs/<slug>/evidence/screenshots/*.png|gif|jpg` into
`debrief.github.io/assets/images/future-debrief/<slug>/` during step 2.
The **Orphan Screenshots** section of `ARCHIVE-REBUILD.md` lists 19
additional assets the maintainer may optionally embed.
