# Contracts — Migration Helpers

**Feature**: 232 (specs/232-apply-archive-rebuild/)
**Scope**: Function signatures, preconditions, and behavioural contracts
for the one-shot `scripts/232-apply-archive-rebuild.py` helper. Every
helper is covered by a test file under `tests/apply_archive_rebuild/`
(see mapping at the end of this document).

All helpers are deleted in the migration PR per FR-014 / #228 FR-009.

---

## `parse_archive_index`

```python
def parse_archive_index(runbook_path: Path) -> dict[str, ArchivePostRef]:
    """Parse ARCHIVE-REBUILD.md's ## Index table into a {spec_key: post_ref} map."""
```

- **Input**: path to `debrief-future:ARCHIVE-REBUILD.md` on main
- **Output**: keyed by `spec_key` (e.g. `176-log-panel-ux`); value carries
  category, title, date, generated path
- **Preconditions**: runbook exists; index table well-formed
- **Postconditions**: exactly one entry per row in the index (duplicates
  blocked by #228's coverage invariant)
- **Never raises**: malformed rows recorded as skipped with a stderr
  warning; caller decides whether to block or proceed

**Tests** (`test_classifier.py`):
- parses the real ARCHIVE-REBUILD.md on main and reports 131 rows
- handles missing `## Index` heading by returning `{}` with a warning
- tolerates extra pipe characters inside cells (matches #231's escaped-alt pattern)

---

## `classify_site_post`

```python
def classify_site_post(
    site_post: SitePost,
    archive_index: dict[str, ArchivePostRef],
    archive_posts: dict[str, ArchivePost],
) -> Classification:
    """Assign a site post to one of three buckets: replace, merge, legacy."""
```

- **Rule order** (first match wins):
  1. If `site_post.inferred_spec_key` not in archive_index → `legacy`
  2. If archive entry's category is `unified` → `replace` with the
     matching `ArchivePost`
  3. If category is `epic-member` or `composite-member` → `merge` with
     the rollup/composite that absorbed it (looked up by following the
     generated_path back to its anchor)
- **Spec-key inference**: `YYYY-MM-DD-<slug>.md` → strip date prefix →
  match slug against archive index slugs (after slug normalisation:
  lowercase, hyphenated, "shipped-" prefix stripped)
- **Missing slug match**: returns `bucket="legacy"` with `reason="no
  matching spec in archive"`; the PR description surfaces this for
  reviewer review

**Tests** (`test_classifier.py`):
- site post matching unified post → `bucket="replace"`
- site post matching rollup member → `bucket="merge"`, `merged_into`
  points at the rollup
- site post matching composite member → `bucket="merge"`, `merged_into`
  points at the composite
- site post with no archive match → `bucket="legacy"`
- ambiguous slug (two archive posts with same slug) → raises
  `AmbiguousClassificationError`; blocks migration
- `shipped-` prefix handling: site `2026-04-19-shipped-log-panel-ux.md`
  matches archive `log-panel-ux`

---

## `diff_post`

```python
def diff_post(site_post: SitePost, archive_post: ArchivePost) -> Divergence:
    """Compute front-matter and body divergence between a site post and its replacement."""
```

- Parses both via `yaml.safe_load` → typed `FrontMatter`
- Front matter: three sets (site_only, archive_only, value_mismatches)
- Body: strip front matter, rstrip trailing whitespace per line, diff
  with `difflib.unified_diff`
- **Whitespace-only**: `body_diff_lines=0` when the only differences
  are trailing whitespace
- **Summary**: first 10 lines of the unified diff for PR-description
  embedding

**Tests** (`test_divergence.py`):
- identical posts → `Divergence.is_clean == True`
- site post has `reading_time: 3` extra → `site_only_fields={"reading_time": 3}`
- archive post has `track: credibility` not on site → `archive_only_fields`
- body text added on site → `body_diff_lines > 0`, summary populated
- trailing-whitespace-only body change → `body_diff_lines == 0`
- list-vs-string `track:` (site list, archive string) → mismatch surfaced

---

## `merge_front_matter`

```python
def merge_front_matter(site_fm: FrontMatter, archive_fm: FrontMatter) -> FrontMatter:
    """Produce the post-migration front matter by merging archive (source of truth) with
    preservable site fields (reading_time, permalink, any site_only extras)."""
```

- **Archive wins** on: `title`, `date`, `excerpt`, `track`, `tags`,
  `layout`, `author` (the archive derives these from source of truth)
- **Site wins** on: `reading_time`, `permalink`
- **Union** on: `redirect_from:` list (migration may add to what's there)
- **Conflict**: if `archive_fm.title != site_fm.title`, archive wins but
  the divergence is surfaced in the PR description so the reviewer can
  decide whether to amend upstream

**Tests** (`test_front_matter_merge.py`):
- archive title overrides site title
- site `reading_time` carried forward
- site `permalink` carried forward; if absent, no `permalink` in output
- `redirect_from` lists merged (archive additions + existing site values)
- `extra` fields from the site side preserved in output

---

## `resolve_asset`

```python
def resolve_asset(image_ref: ImageRef, archive_root: Path) -> AssetCopy:
    """Find the source file for an archive image reference.

    Tries specs/<slug>/evidence/screenshots/<basename>, then
    specs/<slug>/evidence/<basename>. Records found=True|False.
    """
```

- Never raises. Missing assets → `found=False`, surface to pre-flight
  blocker (FR-009)
- Symlinks resolved via `Path.resolve()`; `AssetCopy.source_path` is
  the resolved path

**Tests** (`test_asset_resolver.py`):
- screenshot in primary location → found
- top-level evidence GIF (`191-spec-navigator/evidence/interaction.gif`
  pattern) → found via fallback
- neither location → found=False
- symlinked screenshot resolves to the real file

---

## `detect_filename_collisions`

```python
def detect_filename_collisions(
    archive_posts: list[ArchivePost],
) -> list[tuple[ArchivePost, ArchivePost]]:
    """Return any pair of archive posts that produce the same target filename."""
```

- Empty list → no collisions (FR-010 pass)
- Non-empty → block migration; maintainer regenerates archive with
  disambiguated titles or dates

**Tests** (`test_filename_collision.py`):
- 74 archive posts on main at spec authoring time → empty list
- synthetic two posts with same date + title → one collision pair
- three posts colliding → three pairs (n choose 2)

---

## `detect_source_relative_leaks`

```python
def detect_source_relative_leaks(
    archive_posts: list[ArchivePost],
) -> list[tuple[ArchivePost, ImageRef]]:
    """Regression guard for #231: surface any residual source-relative paths."""
```

- Scan every `ArchivePost.body` for `!\[[^]]*\]\((\./|\.\./|evidence/)`
- Non-empty list blocks migration (FR-008)
- Identical semantics to #231's SC-002 grep; we run it again at apply
  time because the archive may have been regenerated since #231 merged

**Tests** (`test_end_to_end.py`):
- archive with no leaks → empty list
- synthetic archive containing one `../evidence/foo.png` → one entry
- malformed markdown (no closing paren) → not flagged (harvester
  semantics from #231)

---

## `build_migration_plan`

```python
def build_migration_plan(
    debrief_future_root: Path,
    site_root: Path,
) -> MigrationPlan:
    """Top-level orchestrator: reads both clones, builds a full plan, returns it."""
```

- Reads `ARCHIVE-REBUILD.md`, scans `specs/*/media/*.md`, scans site
  `_posts/*.md`
- Runs all pre-flight scans (FR-008/009/010)
- Returns plan with `is_blocked` property populated
- **Does not write**. Read-only — caller decides whether to execute.

**Tests** (`test_end_to_end.py`):
- fixture with 3 site posts + 3 archive posts (1 unified, 1 rollup
  with 1 member, 1 composite with 2 members) → plan with 3
  classifications, 0 divergences (fixture identical), 5 asset copies
  (all found), 0 collisions, 0 leaks, `is_blocked==False`
- fixture with 1 broken asset → `is_blocked==True` with 1 blocker

---

## `execute_migration_plan`

```python
def execute_migration_plan(plan: MigrationPlan, site_root: Path) -> MigrationResult:
    """Apply the plan to the site clone: delete replaced/merged posts, write new
    posts, copy assets, update _config.yml to enable jekyll-redirect-from.

    Refuses to run if plan.is_blocked. Idempotent per NFR-003.
    """
```

- Pre-flight: re-check `plan.is_blocked`; refuse if blocked
- Write order:
  1. Delete `_posts/*.md` files for buckets `replace` + `merge`
  2. Write archive-shaped files for `replace` bucket (new `_posts/*.md`)
  3. Copy assets to `assets/images/future-debrief/<slug>/`
  4. Single-line edit to `_config.yml` (verify this is the only
     `_config.yml` change at PR time; otherwise surface as blocker)
- Idempotent: running twice on the same inputs writes identical bytes
  to the same paths

**Tests** (`test_end_to_end.py`):
- happy path over fixture → site clone matches expected layout
- second run on already-migrated site → no-op (byte-identical)
- blocked plan → refuses with clear error; no partial write

---

## `generate_pr_body`

```python
def generate_pr_body(plan: MigrationPlan, result: MigrationResult) -> str:
    """Render the migration PR's markdown body with bucket classifications,
    pre-flight scan results, and divergence summaries."""
```

- Sections (in order):
  1. **Summary** — 2-3 bullets
  2. **Bucket classification** — table with one row per site post,
     bucket, reason (FR-011)
  3. **Pre-flight scans** — three result blocks (FR-008/009/010)
     with explicit counts (NFR-004)
  4. **Editorial divergences** — for each divergence that isn't clean,
     a collapsible `<details>` block with the diff summary (FR-005)
  5. **Asset coverage** — "X images copied from M source paths, Y
     broken references"
  6. **Test Plan** — checkboxes for Jekyll build, curl-test every
     image URL post-deploy, curl-test index-section Generated Post links

**Tests**: structural only — assert all six sections present; spot-check
counts derived from the plan.

---

## Site CI workflow (companion PR)

```yaml
# .github/workflows/jekyll-build.yml on debrief.github.io (NEW)
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

- Delivered in a **pre-migration companion PR** (see R3/R6) that also
  adds `- jekyll-redirect-from` to `_config.yml`'s plugins list
- The migration PR itself then benefits from this gate automatically

---

## Non-contracts (explicit)

- **Three-way merge of spec+site**: out of scope. The archive post IS
  the spec's derived output; three-way implies the spec drifted.
- **Automating the cross-repo git push**: the helper writes to the site
  clone; the maintainer reviews + runs `git commit` + `git push` + `gh
  pr create` by hand. Keeps the process reviewable.
- **Re-regenerating the archive**: out of scope. If the pre-flight
  scans fire, the helper stops; the maintainer runs #231's generator in
  `debrief-future`, merges the fix, and re-runs #232's helper.

---

## Test file mapping

| Test file | Contract(s) covered |
|-----------|---------------------|
| `test_classifier.py` | `parse_archive_index`, `classify_site_post` |
| `test_divergence.py` | `diff_post` |
| `test_front_matter_merge.py` | `merge_front_matter` |
| `test_asset_resolver.py` | `resolve_asset` |
| `test_filename_collision.py` | `detect_filename_collisions` |
| `test_end_to_end.py` | `detect_source_relative_leaks`, `build_migration_plan`, `execute_migration_plan`, `generate_pr_body` |

---

## Deletion contract (FR-014 / #228 FR-009)

At migration PR merge time, the following MUST NOT exist in HEAD on
`debrief-future` main:

- `scripts/232-apply-archive-rebuild.py`
- `tests/apply_archive_rebuild/`

Companion edit to `ARCHIVE-REBUILD.md` (fix-bugs-in-runbook) is NOT
deleted; it's a persistent doc change.
