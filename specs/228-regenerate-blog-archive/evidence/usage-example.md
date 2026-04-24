# Usage Example: Regenerate Blog Archive

**Feature**: 228-regenerate-blog-archive
**Captured**: 2026-04-24
**Walkthrough**: annotated with the real run's stdout summary block.

---

## 1. Sanity-check with `--help`

```text
usage: regenerate-blog-archive [-h] [--dry-run] [--verbose]
                               [--out-index OUT_INDEX]
                               [--composite-window-days COMPOSITE_WINDOW_DAYS]
                               [--near-miss-max-days NEAR_MISS_MAX_DAYS]
                               [--skip-gh] [--fail-fast]
                               [--repo-root REPO_ROOT]

One-shot blog-archive regenerator (spec 228).
```

## 2. Dry-run pass

```sh
python scripts/regenerate-blog-archive.py --dry-run --verbose --skip-gh
```

Two large-cluster warnings appeared:

```text
WARNING: composite cluster comp-052-053-069-077-087-097-098 has 7 members
         — consider tightening tags
WARNING: composite cluster comp-185-186-187-188-189-190 has 6 members
         — consider tightening tags
```

Inspected the dry-run output, confirmed:

- 56 would-be unified posts (below the spec's expected ~90–100 because
  many specs cluster into composites or live in complete epics).
- 3 would-be epic rollups (E02, E05, E08 — the complete epics in BACKLOG).
- 14 would-be composite posts.
- 43 Unresolved Groupings — mostly near-misses, plus two legacy-charter
  entries (E07, E10) and a few charter-prefix mismatches.

Decision: accept the current NOISE_TAGS widening; 7 and 6-member clusters
warn loudly in the index and the author can manually split them after
publication.

## 3. Real run (the one that produced the committed artefacts)

```sh
python scripts/regenerate-blog-archive.py --skip-gh
```

Stdout summary block:

```text
Archive Rebuild Summary — 2026-04-24T10:28:16Z
  Scanned:              155 spec directories
  Shipped (eligible):   129
  Unified posts:        56
  Epic rollups:         3  (E02, E05, E08)
  Composite posts:      14  (44 member specs)
  Epic members:         29
  Skipped (in-flight):  26
  Unresolved groupings: 43
  Run duration:         0.3s
  GitHub API:           gh version 2.60.0 (2024-10-24)
Index written: /Users/ian/git/worktrees/228-regenerate-blog-archive/ARCHIVE-REBUILD.md
```

Coverage invariant (SC-001) passes: 56 + 29 + 44 + 26 = 155 ✓.

## 4. Inspect the handoff artefact

```sh
wc -l ARCHIVE-REBUILD.md
# 511 lines
```

Structure verified:

- `# Archive Rebuild` H1 + one-paragraph summary.
- `## Run Metadata` (timestamps, Python + gh versions, flags).
- `## Index` table — 73 rows (one per generated post).
- `## Skipped Specs` — 26 rows.
- `## Unresolved Groupings` — sub-sections per `kind`.
- `## Runbook` — four steps (wipe / copy / front-matter / deploy).
- `<details>` block with the raw classifier run log.

## 5. Spot-check (SC-003)

Per SC-003: sections 1–3 of every unified post MUST match
`evidence/opening-context.md` byte-for-byte where the cache exists.

```sh
diff <(sed -n '/^## What We/,/^## Screenshots/{/^## Screenshots/!p;}' \
        specs/016-dynamic-blog-components/media/unified-post.md \
      | head -40) \
     <(cat specs/016-dynamic-blog-components/evidence/opening-context.md)
# Empty diff except for formatting-neutral whitespace.
```

Rollup + composite spot-checked at:

- `specs/070-prov-schema-foundation/media/epic-rollup.md` — title is
  "PROV Logging Implementation", lists all seven E02 members, date =
  latest member ship date.
- `specs/204-rawgeojsonfeature-linkml/media/composite-post.md` — title
  "Building Type Safety", three members (204, 205, 206) linked, shared
  tag `type-safety` cited.

## 6. Hand-off

Give `ARCHIVE-REBUILD.md` to the `debrief.github.io` maintainer. They
execute the four-step runbook without needing to follow up. The script
+ its tests are deleted in the final commit of this PR (FR-009); the
index references them via the PR description for reviewer inspection.
