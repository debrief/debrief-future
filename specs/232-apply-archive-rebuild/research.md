# Research — Apply Regenerated Blog Archive

**Feature**: 232 (specs/232-apply-archive-rebuild/)
**Scope**: 8 decisions resolved before Phase 1 design work. Each cites
evidence from a fresh probe of `debrief.github.io:master` at
`HEAD`.

---

## R1. Source of the site-post → archive-post mapping

**Decision**: Drive classification from `debrief-future:ARCHIVE-REBUILD.md`'s
`## Index` table. Every row names a spec, its category (unified /
epic-member / composite-member), and the generated path. Build an inverse
map `{spec_key: generated_path}` at helper startup; classify each site
post by deriving its `spec_key` from the filename (`YYYY-MM-DD-<slug>.md`
→ look up spec by slug + date).

**Rationale**: The index is already the source of truth for the archive's
classifier output. Re-implementing classification would risk drift.
Filename-based lookup covers the ~73 site posts; posts without a matching
archive spec fall through to the "legacy, preserve" bucket.

**Alternatives considered**:

- **Rebuild classifier from BACKLOG.md + front matter**: duplicates #228's
  classifier. Rejected — keep the archive's classifier authoritative.
- **Require a manifest in the migration PR description**: editorial
  overhead for each future re-run; error-prone. Rejected.

---

## R2. Legacy vs Future-Debrief post identification

**Decision**: Every `_posts/*.md` on the site at the time of this
research uses `layout: future-post`. Zero legacy Debrief v3 posts exist
in `_posts/`. The bucket classification reduces to two cases:
(a) superseded by an archive post → replace, (b) merged into a rollup
or composite → delete.

**Evidence**:
- `grep -l '^layout: future-post' _posts/*.md | wc -l` → 73
- `ls _posts/*.md | wc -l` → 73 (exact match)
- No `category:` or `categories:` field in any `_posts/*.md`.

**Rationale**: The legacy-preservation branch in the spec (FR-002) remains
defensively coded in the helper, but it has no active case at migration
time. If future additions to `_posts/` introduce non-`future-post`
content, the branch still fires. No runtime cost.

**Alternatives considered**:

- **Strip the legacy branch entirely**: risks silent misclassification of
  a future edge case (e.g. a v3 archive page added later). Rejected —
  defensive code is cheap.

---

## R3. `jekyll-redirect-from` plugin availability

**Decision**: `jekyll-redirect-from 0.14.0` is already shipped in the
`github-pages` gem bundle (confirmed from `Gemfile.lock`), but it is not
enabled in `_config.yml`. The migration enables it with a one-line
addition to the `plugins:` list:

```yaml
plugins:
  - jekyll-feed
  - jekyll-paginate
  - jekyll-sitemap
  - jekyll-redirect-from   # ADDED
```

**Rationale**: Plugin is already on disk — no new dependency, just an
activation. NFR-002 forbids config-and-content in one PR, so the
activation lands in a **pre-migration companion PR** that only edits
`_config.yml` and the new GitHub Actions workflow (R6). Migration PR
then freely uses `redirect_from:` entries.

**Alternatives considered**:

- **Manual `_redirects/` files**: unsupported by github-pages; would
  require site-side plumbing. Rejected.
- **Skip redirects entirely, accept URL breakage**: breaks external
  bookmarks silently. Rejected — SC-008 demands zero broken bookmarks.
- **Fold the plugin activation into the migration PR**: violates NFR-002.
  Rejected — separate prep PR is a 10-minute chore.

---

## R4. Flat `_posts/` vs `_posts/future/` subdirectory

**Decision**: Keep flat in `_posts/*.md`. Fix the runbook (FR-013) to
match, not the site. The archive maps 74 posts to 74 flat filenames; no
subdirectory is needed.

**Rationale**:
- Current site has no `_posts/future/` subdirectory — introducing one is
  a structural change that benefits nothing (Jekyll already discovers
  all `_posts/*.md`).
- Jekyll's `github-pages` collection config doesn't index nested post
  directories as posts by default (they'd need explicit
  `collections.posts.path` setting or a rename to `_future_posts`).
- Filename is already prefix-dated (`2026-04-24-<slug>.md`) — separating
  Future Debrief from pre-FD posts by subdirectory adds noise without
  clarity.
- Runbook step 1 was written speculatively in #228 and never executed
  until this feature — fix it now while we're touching it.

**Alternatives considered**:

- **Migrate to `_posts/future/`**: requires Jekyll config change, risks
  breaking `site.posts` references elsewhere in layouts. Rejected.
- **Migrate to a dedicated collection `_future_posts/`**: same problem,
  bigger blast radius. Rejected.

---

## R5. Editorial style checks

**Decision**: No site-side schema validation is enforced on post front
matter. The site accepts any front-matter shape that `layout:
future-post` can render. Archive posts already emit the site's expected
field set (`layout`, `title`, `date`, `author`, `track`, `tags`,
`excerpt`). One optional field (`reading_time`) is present on most
existing site posts but absent from archive output — the migration
carries existing `reading_time` values forward from the site post per
FR-005.

**Evidence**: Inspected 10 site posts; no `permalink`, no `category`, no
schema file at `_data/post-schema.yml` or similar. `layout: future-post`
is the only required field.

**Rationale**: Nothing to validate against. Focus FR-005 on the fields
that actually vary (body divergence, `reading_time`).

**Alternatives considered**:

- **Synthesise `reading_time` in the archive output**: out of scope for
  this feature — would require re-regenerating the archive. Rejected.
- **Drop `reading_time` entirely**: losing information on the site is
  surprising. Rejected.

---

## R6. Jekyll build CI gate

**Decision**: Add a GitHub Actions workflow on `debrief.github.io` that
runs `bundle exec jekyll build --safe` on every PR. Ship in the same
**pre-migration companion PR** as the `jekyll-redirect-from` activation
(R3). The migration PR then benefits from automatic build validation
before merge.

**Rationale**:
- Site currently has no `.github/workflows/` directory. GitHub Pages
  builds on push to master but emits failures via email after merge —
  useless as a PR gate.
- `bundle exec jekyll build --safe` is the exact command GitHub Pages
  runs internally (with the same gem set). False positives vanishingly
  rare.
- Blocking the migration PR on build failure catches broken front
  matter, orphaned layout references, or syntax errors before they reach
  master.

**Alternatives considered**:

- **Rely on manual `bundle exec jekyll build` by the maintainer**: easy
  to skip, especially on a 74-post migration. Rejected.
- **Skip CI, deploy and fix forward**: unacceptable for FR-012 ("CI MUST
  run Jekyll build; block merge on failure"). Rejected.
- **Pre-commit hook in the site repo**: not enforced in PRs made via
  GitHub web UI. Rejected.

**Workflow spec** (sketch — full file in `contracts/helpers.md`):

```yaml
name: Jekyll Build
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with: {bundler-cache: true}
      - run: bundle exec jekyll build --safe --trace
```

---

## R7. Asset copy semantics

**Decision**:
- **Source path resolution**: each archive image path
  `/assets/images/future-debrief/<slug>/<basename>` maps to one of two
  source locations in `debrief-future`:
  1. `specs/<slug>/evidence/screenshots/<basename>` — primary
  2. `specs/<slug>/evidence/<basename>` — fallback (top-level GIFs like
     `interaction.gif` per the #231 spec)
  Resolver tries (1) first, then (2); emits the first hit. Missing →
  record as broken asset (FR-009 pre-flight blocker).
- **Symlink handling**: resolve symlinks at copy time via
  `Path.resolve()` + `shutil.copy2(..., follow_symlinks=True)`. The site
  receives a real file, never a link.
- **Byte-identical copy**: `shutil.copy2` preserves mtime but not inode;
  sufficient for Jekyll (it cares about content hash, not metadata).

**Rationale**: Mirror #231's orphan scanner (which also walks
`screenshots/**` + top-level `evidence/*.png|gif`). Consistency between
archive generation and archive application reduces cognitive load.

**Alternatives considered**:

- **`rsync -a`**: over-specified; copies attributes we don't need;
  harder to unit-test. Rejected for stdlib-only path.
- **Hardlinks**: cross-filesystem between two clones often fails;
  harder to diff later. Rejected.

---

## R8. Diff semantics for editorial hand-edit detection (FR-005)

**Decision**:
- **Body diff**: strip YAML front matter from both sides, normalise
  trailing whitespace on each line, compare with `difflib.unified_diff`.
  If the diff is non-empty and not pure whitespace, the post is
  "body-diverged" and surfaces in the PR description with a link to the
  diff.
- **Front-matter diff**: parse both sides via `yaml.safe_load` into
  typed dataclasses. Emit three sets:
  1. `site_only_fields` (e.g. `reading_time: 3` on site, absent on
     archive) → carry forward into migrated post (FR-005 preservation).
  2. `archive_only_fields` (e.g. `track: credibility` on archive, absent
     on site) → archive wins (the spec is the source of truth).
  3. `value_mismatches` (same field, different values) → archive wins
     for source-derivable fields (`title`, `date`, `excerpt`); surface
     for reviewer decision on editorial fields (`author`).
- **Whitespace-only body differences**: treated as clean swap (not
  surfaced), to avoid drowning the reviewer in trivial trailing-newline
  churn.

**Rationale**: FR-005 demands visibility, not mechanical merge. The
reviewer ultimately decides; the helper makes the decision cheap by
surfacing the exact bytes that differ.

**Alternatives considered**:

- **Character-level diff**: overwhelmingly noisy for 73 posts. Rejected.
- **Three-way merge with spec as base**: the archive post IS the spec's
  derived output — three-way implies the spec drifted, which is out of
  scope here. Rejected.
- **Silent overwrite**: violates FR-005. Rejected.

---

## Resolution of Spec Open Questions

The spec listed two Open Questions pending this research:

1. **`redirect_from` availability** → Resolved in R3. Plugin is on
   disk; one-line activation in a companion PR.
2. **`_posts/future/` subdirectory** → Resolved in R4. Keep flat; fix
   the runbook.

Both resolutions are reflected in the plan's Technical Context and
Constitution Check.
