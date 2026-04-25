# Quickstart — Apply Regenerated Blog Archive to debrief.github.io

**Feature**: 232 (specs/232-apply-archive-rebuild/)
**Audience**: Maintainer executing the migration.
**Prerequisite**: on `debrief-future` main (no uncommitted changes), plus
a fresh clone of `debrief.github.io:master` in a sibling directory.

Two-PR sequence. Expect 30–60 min end-to-end if no blockers fire.

---

## 0. Sanity-check the starting state

```sh
# debrief-future must be on main with the 74-post archive
cd debrief-future
git fetch origin main
git checkout main
git pull
ls specs/*/media/unified-post.md specs/*/media/epic-rollup.md specs/*/media/composite-post.md | wc -l
# → 74 (56 + 3 + 15)

# Sibling clone of debrief.github.io
cd ..
gh repo clone debrief/debrief.github.io
cd debrief.github.io
git checkout master
grep -l '^layout: future-post' _posts/*.md | wc -l
# → 73 (at time of spec authoring; may drift)

# Confirm jekyll-redirect-from is NOT yet enabled
grep -c 'jekyll-redirect-from' _config.yml
# → 0
```

If either count drifts significantly from these baselines, pause and
reconcile — spec's pre-flight scans assume this starting point.

---

## 1. Companion PR — enable redirect plugin + add CI gate (commit 1)

Two small site-side edits, no content.

```sh
cd debrief.github.io
git checkout -b future-debrief/enable-redirect-and-ci
```

### 1a. Enable `jekyll-redirect-from`

Edit `_config.yml`, add one line to the `plugins:` list:

```yaml
plugins:
  - jekyll-feed
  - jekyll-paginate
  - jekyll-sitemap
  - jekyll-redirect-from   # ADDED — already in github-pages bundle per research R3
```

### 1b. Add Jekyll build workflow

Create `.github/workflows/jekyll-build.yml`:

```yaml
name: Jekyll Build
on:
  pull_request:
    branches: [master]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
      - run: bundle exec jekyll build --safe --trace
```

### 1c. Verify + open PR

```sh
bundle exec jekyll build --safe --trace
# → expect success

git add _config.yml .github/workflows/jekyll-build.yml
git commit -m "ci: enable jekyll-redirect-from + add Jekyll build gate"
git push -u origin future-debrief/enable-redirect-and-ci
gh pr create --base master --title "ci: enable jekyll-redirect-from + add Jekyll build gate" \
  --body "Prep for #232 archive-rebuild migration. No content changes."
```

Wait for merge before Step 2. The next Jekyll build on master picks up
the redirect plugin; the CI gate now runs on every PR.

---

## 2. Migration PR — the big content swap

```sh
cd debrief-future
git checkout -b 232-apply-archive-rebuild-impl
```

### 2a. Write the migration helper

Create `scripts/232-apply-archive-rebuild.py` per the contracts in
`specs/232-apply-archive-rebuild/contracts/helpers.md`. Create
`tests/apply_archive_rebuild/` with the fixture tree and six test
files (see contracts §"Test file mapping").

Sanity-check after revival:

```sh
uv run pytest tests/apply_archive_rebuild/ -q         # expect all green
uv run pyright scripts/232-apply-archive-rebuild.py   # expect 0 errors
uv run ruff check scripts/232-apply-archive-rebuild.py tests/apply_archive_rebuild/
```

Commit as `feat(232): add migration helper + tests`.

### 2b. Fix the runbook (FR-013)

Patch `ARCHIVE-REBUILD.md` on `debrief-future` main:

- Step 1 command changes from `rm debrief.github.io/_posts/future/*.md`
  to `rm debrief.github.io/_posts/*.md` (flat layout — see R4).
- New step inserted after step 2 (Copy generated files): "Copy image
  assets. For every `![alt](/assets/images/future-debrief/<slug>/<basename>)`
  reference in a copied post, copy `specs/<slug>/evidence/screenshots/<basename>`
  (or `specs/<slug>/evidence/<basename>` for top-level GIFs) into
  `debrief.github.io:assets/images/future-debrief/<slug>/<basename>`. The
  migration helper at `scripts/232-apply-archive-rebuild.py` automates
  this."

Commit as `docs(232): fix ARCHIVE-REBUILD.md runbook bugs`.

### 2c. Dry-run the migration

```sh
uv run python scripts/232-apply-archive-rebuild.py \
  --site-clone ../debrief.github.io \
  --dry-run
```

Expected output on a clean baseline:

```
Migration plan:
  73 site posts classified:
    XX replace   (archive has a direct replacement)
    YY merge     (rolled up into an epic/composite; deleted, not replaced)
    ZZ legacy    (no archive match; preserved untouched)

  Pre-flight scans:
    FR-008 source-relative-leak:   0 residual paths ✓
    FR-009 missing-asset:          0 broken references ✓  (N source images resolve)
    FR-010 filename-collision:     0 collisions ✓

  Divergences (editorial review needed):
    N site posts have body-diverged from archive
    M site posts have reading_time that archive lacks (will be carried forward)
    K site posts have permalink that archive lacks (will be carried forward)

  Asset copy:
    ~400 files to copy from debrief-future:specs/*/evidence/...
```

If any pre-flight scan fires → **stop**. Options:
- Missing asset: regenerate the archive (re-run #231's generator) after
  fixing the source, then re-pull `debrief-future` main here.
- Filename collision: rare; flag for review, disambiguate titles or
  dates upstream.
- Source-relative leak: #231 regression — fix upstream, re-pull.

### 2d. Execute the migration

```sh
uv run python scripts/232-apply-archive-rebuild.py \
  --site-clone ../debrief.github.io \
  --execute
```

The helper:
1. Deletes `_posts/*.md` for the `replace` + `merge` buckets
2. Writes archive-shaped files for the `replace` bucket
3. Copies ~400 image assets into `assets/images/future-debrief/`
4. Emits a `MIGRATION-REPORT.md` in the site clone with the full PR body

### 2e. Verify on the site clone

```sh
cd ../debrief.github.io

# SC-001: expected file count
ls _posts/*.md | xargs grep -l '^layout: future-post$' | wc -l
# → 74 (or 73 + N legacy)

# SC-002: every image exists
python3 <<'EOF'
import re, os
bad = []
for p in os.popen('ls _posts/*.md').read().split():
    body = open(p).read()
    for m in re.finditer(r'!\[[^\]]*\]\((/assets/images/future-debrief/[^)]+)\)', body):
        if not os.path.isfile('.' + m.group(1)):
            bad.append((p, m.group(1)))
print(f'Broken image refs: {len(bad)}')
for p, u in bad[:10]:
    print(f'  {p}: {u}')
EOF
# → 0 broken refs

# SC-003: zero residual source-relative paths
grep -rE '!\[[^]]*\]\((\./|\.\./|evidence/)' _posts/ | wc -l
# → 0

# SC-004: Jekyll build succeeds
bundle exec jekyll build --safe --trace
# → success
```

### 2f. Commit + PR

Review the `MIGRATION-REPORT.md` in the site clone. Copy its contents
into the migration PR body.

```sh
cd ../debrief.github.io
git checkout -b future-debrief/232-apply-archive-rebuild
git add -A
git commit -m "Apply regenerated blog archive from debrief-future main

Per debrief-future:specs/232-apply-archive-rebuild/spec.md — replaces 73
individually-published _posts/*.md with the 74 unified/rollup/composite
archive posts from debrief-future main. Adds ~400 image assets under
assets/images/future-debrief/<slug>/. Preserves editorial hand-edits
(reading_time, permalink) via front-matter merge."
git push -u origin future-debrief/232-apply-archive-rebuild
gh pr create --base master --title "Apply regenerated blog archive" \
  --body-file MIGRATION-REPORT.md
```

The migration PR is the big one — 73 deletes + 74 adds + ~400 image
copies. Reviewer reads the MIGRATION-REPORT.md first, then skims the
markdown deltas.

### 2g. Delete the helper (FR-014)

Back on the `debrief-future` side:

```sh
cd ../debrief-future
git rm scripts/232-apply-archive-rebuild.py
git rm -r tests/apply_archive_rebuild/
git commit -m "feat(232): delete migration helper per FR-014"
```

The runbook patch from 2b is NOT deleted — it's a permanent doc fix.

---

## 3. Post-merge verification

After the migration PR merges and GitHub Pages deploys:

```sh
# SC-002 against live URLs — sample 5 random images
for url in $(shuf -n 5 <(grep -rhoE '/assets/images/future-debrief/[^)]+' debrief.github.io/_posts/ | sort -u)); do
    curl -s -o /dev/null -w "%{http_code} $url\n" "https://debrief.github.io$url"
done
# → all 200

# SC-005 against ARCHIVE-REBUILD.md's Orphan Screenshots section
# Extract each "Generated Post" path and curl the equivalent live URL
# (see contracts §generate_pr_body for the verification table)

# SC-008 redirect verification
# For each post whose permalink changed, curl the old URL and confirm
# a 301 to the new URL. redirect_from: values from the migration drive this.
```

If any verification fails → open a follow-up PR on `debrief.github.io`
with the fix. Do not re-run the migration helper — idempotency holds at
the file level but a second run would re-clobber hand-fixes.

---

## Commit trajectory

Mirrors the quickstart §2:

### Companion PR (on `debrief.github.io`)
1. `ci: enable jekyll-redirect-from + add Jekyll build gate` (merges
   first; small, un-contentious)

### Migration PR sequence (on `debrief-future`)
1. `feat(232): add migration helper + tests` (2a)
2. `docs(232): fix ARCHIVE-REBUILD.md runbook bugs` (2b)
3. `feat(232): delete migration helper per FR-014` (2g)

### Migration PR (on `debrief.github.io`)
1. `Apply regenerated blog archive from debrief-future main` (2f)

Expect 4 PRs total (1 on site prep, 3 commits + 1 cross-repo site PR).
Reviewer reads the migration PR carefully; companion PRs are rubber-stamp.

---

## Risk mitigation

- **If the site has drifted since research**: the classifier's `legacy`
  bucket catches anything unfamiliar. Review the MIGRATION-REPORT.md
  legacy list before PR open.
- **If GitHub Pages build fails after migration merge**: the CI gate
  from the companion PR should have caught it pre-merge. If it gets to
  master, open a revert PR immediately; re-investigate in a follow-up.
- **If hand-edits are deeper than the diff surfaced**: the reviewer
  catches it in PR review (the divergence summary is prominent). No
  automated safety net for prose judgement.
- **If `debrief-future` main advances during the migration's
  lifecycle**: rebase or re-run the helper against the new main.
  Idempotency + pre-flight scans catch any content drift.
