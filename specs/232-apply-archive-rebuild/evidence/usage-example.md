# Usage Example — Apply Regenerated Blog Archive

This walks a maintainer through the migration end-to-end, mirroring the
[quickstart](../quickstart.md) but with the actual command output captured at
ship time.

## Prerequisites

- `debrief-future` checked out on a branch off main with `scripts/232-apply-archive-rebuild.py` and `tests/apply_archive_rebuild/` present (this branch).
- `../debrief.github.io` cloned as a sibling directory, on `master`.

## Step 1 — Dry-run

```sh
uv run python scripts/232-apply-archive-rebuild.py \
    --site-clone ../debrief.github.io --dry-run
```

Output (verbatim from this run):

```
Migration plan:
  77 site posts classified:
     21 replace
     27 merge
     29 legacy

  Pre-flight scans:
    FR-008 source-relative-leak:    0
    FR-009 missing-asset:           0 of 51
    FR-010 filename-collision:      0

  Plan blocked: False
  Config edit needed (jekyll-redirect-from): True
```

The dry-run also writes `MIGRATION-REPORT.md` into the site clone — that file
is the PR body (see `evidence/migration-report-sample.md`).

> **First-run note**: the *initial* dry-run on the live state surfaced 5
> missing assets (4 × `095-results-bottom-panel/*` PNGs and `216-storyboarding-
> capture/interaction.gif`). FR-009 correctly blocked. The fix lived upstream:
>
> - `specs/091-poly-featurekind/media/epic-rollup.md` — dropped 4 image lines
>   for `095` since `095-results-bottom-panel/evidence/screenshots/` never
>   existed (pre-archive-era post never captured screenshots).
> - `specs/215-storyboarding-schema/media/composite-post.md` — dropped the
>   `216-storyboarding-capture/interaction.gif` line; the actual file lives at
>   `217-storyboarding-playback/evidence/screenshots/interaction.gif`.
>
> After those edits, dry-run cleared. This is the FR-009 contract working as
> designed: pre-flight blocks until upstream is consistent.

## Step 2 — Execute

```sh
uv run python scripts/232-apply-archive-rebuild.py \
    --site-clone ../debrief.github.io --execute
```

Output:

```
Execution complete:
  posts deleted: 48
  posts written: 21
  assets copied: 51
  _config.yml edited: True
  PR body → ../debrief.github.io/MIGRATION-REPORT.md
```

## Step 3 — Verify on the site clone

```sh
cd ../debrief.github.io

# SC-001: 48 future-post .md (29 legacy + 19 newly-named archive +
#         2 modified-in-place archive replacements)
grep -l '^layout: future-post' _posts/*.md | wc -l   # → 48

# SC-002: every image reference resolves
python3 -c "
import re, os
bad = []
for p in [f for f in os.listdir('_posts') if f.endswith('.md')]:
    body = open(f'_posts/{p}').read()
    for m in re.finditer(r'!\[[^\]]*\]\((/assets/images/future-debrief/[^)]+)\)', body):
        if not os.path.isfile('.' + m.group(1)):
            bad.append((p, m.group(1)))
print(f'broken refs: {len(bad)}')
"
# → broken refs: 0

# SC-003: zero residual source-relative paths
grep -rE '!\[[^]]*\]\((\./|\.\./|evidence/)' _posts/ | wc -l   # → 0
```

## Step 4 — Commit + open the cross-repo PR

The migration writes `MIGRATION-REPORT.md` directly into the site clone — its
contents are the migration PR body. The maintainer runs `git add -A && git
commit && git push && gh pr create --body-file MIGRATION-REPORT.md`.

The migration PR is large (46 deletions + ~17 additions + ~51 image-binary
copies + 2 modifications + a one-line `_config.yml` edit) but reviewable
file-by-file because GitHub diffs the markdown deltas inline; reviewers focus
on `MIGRATION-REPORT.md`'s bucket classification and divergence sections.

## Step 5 — Delete the helper (FR-014)

Back on the `debrief-future` branch:

```sh
git rm scripts/232-apply-archive-rebuild.py
git rm -r tests/apply_archive_rebuild/
git commit -m "feat(232): delete migration helper per FR-014"
```

Runbook patch on `ARCHIVE-REBUILD.md` (Phase 5) is **not** deleted — that's a
permanent doc fix.
