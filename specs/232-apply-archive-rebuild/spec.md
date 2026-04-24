# Feature Specification: Apply the Regenerated Blog Archive to debrief.github.io

**Feature Branch**: `232-apply-archive-rebuild`
**Created**: 2026-04-24
**Status**: Draft
**Depends on**: #228 (runbook spec), #231 (archive content fix)
**Input**: Apply the regenerated blog archive to debrief.github.io — execute the 4-step runbook in `ARCHIVE-REBUILD.md` on `debrief.github.io`, replacing 72 individually-published `_posts/*.md` files with the 74 unified/rollup/composite posts from `debrief-future` main (`specs/*/media/*.md`), auditing image-asset coverage under `/assets/images/future-debrief/<slug>/`, and fixing the runbook's `_posts/future/` vs `_posts/` path bug. Cross-repo content migration — no new feature code, one big PR on `debrief.github.io` reviewable file-by-file. Preserve editorial hand-edits and existing permalinks.

---

## Background

PR #518 (#228) generated the blog archive under `debrief-future:specs/*/media/*.md` as 56 unified-post + 3 epic-rollup + 15 composite-post files, plus `ARCHIVE-REBUILD.md` at the repo root carrying a 4-step runbook and indices. PR #528 (#231) fixed a 34-of-57 silent-image-drop defect and regenerated the archive cleanly. Both PRs are merged. `ARCHIVE-REBUILD.md` was copied to `debrief.github.io` at some point.

Step 4 of the runbook — "Apply these posts to the website" — has never been executed. `debrief.github.io` still carries 72 individually-published `_posts/*.md` files from the pre-archive era's one-at-a-time `/publish` workflow. Readers see a chronological timeline of individual posts; the archive's unified/rollup/composite structure has not reached the site.

Two artefacts make this urgent:

1. **Content drift**. Source posts at `specs/*/media/shipped-post.md` in `debrief-future` are the regen inputs. Every day that passes with the site out of step, the chance of editorial hand-edits on the site diverging from the source grows. A hand-edit on the site that isn't reflected upstream disappears when the archive is finally applied, unless the migration catches it.
2. **Two bugs in the runbook**. The runbook's step 1 says `rm debrief.github.io/_posts/future/*.md`, but the site has no `future/` subdirectory — posts live at `_posts/*.md`. And the runbook does not mention image-asset coverage: every regenerated post carries Jekyll-absolute paths under `/assets/images/future-debrief/<slug>/`, but no step copies those image files from `specs/<slug>/evidence/screenshots/*` to the site's `/assets/images/future-debrief/<slug>/`. If applied as written, every image in the migrated archive would 404.

This feature executes the corrected runbook on `debrief.github.io`.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Site carries the unified/rollup/composite archive (Priority: P1)

The `debrief.github.io` site's `_posts/` directory is the unified/rollup/composite archive from `debrief-future` main. Readers arriving at the Future Debrief blog section see the feature-level narrative of the build, not a chronological feed of individual shipped-post fragments.

**Why this priority**: This is the whole point of the feature. Without it, #228 + #231's archive work is locked inside `debrief-future` and the public site never reflects it.

**Independent Test**: After merge, `debrief.github.io:_posts/` contains every `specs/*/media/{unified-post,epic-rollup,composite-post}.md` from `debrief-future` main as a `YYYY-MM-DD-<slug>.md` file with `layout: future-post` front matter. The 72 pre-archive `_posts/*.md` files that the archive supersedes are gone.

**Acceptance Scenarios**:

1. **Given** `debrief-future` main has 74 archive posts under `specs/*/media/*.md`, **When** the migration PR on `debrief.github.io` is merged, **Then** the site carries one `_posts/YYYY-MM-DD-<slug>.md` file per archive post, with front matter transformed to match the site's `future-post` layout convention.
2. **Given** the 72 individually-published `_posts/*.md` files existed before the migration, **When** the migration PR is merged, **Then** those files are removed if (and only if) their narrative is now covered by an archive post — non-archive posts (e.g. historical Debrief v3 posts from the existing `_posts/`) are untouched.
3. **Given** the build step runs after merge, **When** Jekyll compiles the site, **Then** every `future-post` page renders and every image in every post resolves.

---

### User Story 2 — Every image in the migrated archive resolves (Priority: P1)

Every `![alt](/assets/images/future-debrief/<slug>/<basename>)` reference in the migrated archive resolves to a real file under `debrief.github.io:assets/images/future-debrief/<slug>/`. Zero 404s.

**Why this priority**: 34 images were silently dropped by #228; #231 recovered them in-repo. If the apply step ships to the website without copying the asset files, the readers see exactly the same "no images" experience the in-repo archive was built to fix. SC-001 of #231 ("recover 34 dropped images") collapses at the site boundary.

**Independent Test**: Extract every `![...](...)` path from every `_posts/*.md` with `layout: future-post`; for each path, assert the file exists at the corresponding path under `assets/`. Zero failures.

**Acceptance Scenarios**:

1. **Given** a migrated post references `/assets/images/future-debrief/186-filter-chips/lozenge-drag.gif`, **When** the site is served, **Then** a GET for that URL returns 200 and the image renders.
2. **Given** a source screenshot exists at `debrief-future:specs/186-filter-chips/evidence/screenshots/lozenge-drag.gif`, **When** the migration PR is merged, **Then** the file is present at `debrief.github.io:assets/images/future-debrief/186-filter-chips/lozenge-drag.gif`.
3. **Given** a post in the migrated archive references an image that does not exist on disk in `debrief-future` evidence, **When** the migration is audited, **Then** that post is flagged as a broken-reference migration failure and appears in the PR description for reviewer attention — the migration does not ship silently broken paths.

---

### User Story 3 — The runbook bugs are fixed (Priority: P2)

`ARCHIVE-REBUILD.md` on `debrief-future` main (the canonical copy) accurately describes how to apply the archive to `debrief.github.io`. Every step succeeds when executed literally against the current shape of `debrief.github.io`. Future re-runs of the runbook (e.g. if the archive is regenerated again at #300 or later) do not re-encounter the same two bugs.

**Why this priority**: The runbook is the institutional memory of how to do this migration. If the bugs aren't fixed in the source, the next maintainer who picks this up starts from the same broken starting point.

**Independent Test**: The runbook's `rm` command in step 1 names a directory that exists. The runbook has a step (new or amended) describing image-asset copy from `debrief-future:specs/<slug>/evidence/screenshots/*` to `debrief.github.io:assets/images/future-debrief/<slug>/` — or the implicit expectation is documented well enough that a future maintainer won't be surprised.

**Acceptance Scenarios**:

1. **Given** a fresh maintainer reading the runbook, **When** they follow step 1 literally, **Then** the `rm` command targets existing files at a real path — not `_posts/future/*.md` (which does not exist).
2. **Given** a fresh maintainer completing the runbook, **When** they verify the result, **Then** image-asset coverage is part of their verification checklist — not a silent post-step they have to discover from 404s on the live site.

---

### User Story 4 — Editorial hand-edits are preserved across replacement (Priority: P2)

An editor who hand-edited a published `_posts/*.md` after it was first auto-published (fixing a typo, adding a permalink, adding a `reading_time`) does not lose their work when the archive replaces that file.

**Why this priority**: The archive is driven from `specs/*/media/shipped-post.md` on `debrief-future`. The site may have diverged since first publish. A blind overwrite loses hand-edits silently. Preserving them requires a diff audit at migration time.

**Independent Test**: For every `_posts/*.md` file about to be replaced by the archive, the migration PR surfaces any front-matter fields that exist on the site but not in the archive version (e.g. `permalink`, `reading_time` additions) so a reviewer can merge them forward into the archive post before the replacement lands. Body drift beyond whitespace is flagged similarly. The PR does not silently discard content.

**Acceptance Scenarios**:

1. **Given** a published post on the site has a `permalink: /future/my-custom-slug/` field that the archive-generated version lacks, **When** the migration is prepared, **Then** the PR description lists this as a "front-matter field to preserve" and the replacement post carries the permalink forward.
2. **Given** a published post's body has been hand-edited since first publish (beyond whitespace), **When** the migration is prepared, **Then** the PR description highlights the post as "body diverged" with a link to the diff, so the reviewer decides whether to merge edits into the source or accept the overwrite.
3. **Given** a post has no meaningful drift (front matter matches, body matches), **When** the migration is prepared, **Then** the replacement is noted as a clean swap needing no attention.

---

### User Story 5 — Orphan / broken / malformed index becomes actionable (Priority: P3)

The `ARCHIVE-REBUILD.md` sections for Orphan Screenshots, Broken Image References, and Malformed Image References (added in #231) point at the real set of live posts on `debrief.github.io`, not a theoretical set that doesn't exist yet. The maintainer can act on each row by directly inspecting the live post and deciding whether to embed the orphan or fix the broken reference upstream.

**Why this priority**: Nice-to-have — the index is already useful as a source-side inventory, but its utility compounds once the maintainer can click a "Generated Post" link and land on a live page. Tracks alongside US1 but isn't load-bearing for the migration itself.

**Independent Test**: For each row in the Orphan Screenshots section, the "Generated Post" column link resolves to a live URL on `debrief.github.io`. The maintainer can open it and see the current state.

**Acceptance Scenarios**:

1. **Given** the Orphan Screenshots section lists `085-chart-renderer` → `specs/085-chart-renderer/media/composite-post.md`, **When** the migration is live, **Then** that generated post exists at a corresponding URL on `debrief.github.io` so the maintainer has context when deciding whether to embed the 9 orphan PNGs.
2. **Given** the Broken Image References section (if non-empty) lists a `spec_key` + `source_path`, **When** the migration is live, **Then** the reader experience on the live site matches what the index promised (the link is broken on the live post, not hidden by the asset-copy step).

---

### Edge Cases

- **A site `_posts/*.md` file has no corresponding archive post**: The pre-archive site has 72 posts; the archive has 74 posts but they're not one-to-one replacements (unified-posts map 1:1, but rollups absorb multiple specs and composites merge 2–6 members into one post, and there may be legacy non-Future-Debrief posts too). Each site post must be classified as (a) superseded by an archive post → delete, (b) merged into a rollup/composite → delete, (c) out-of-scope legacy → keep. The migration PR must enumerate all three buckets in its description.
- **An archive post has a `date` in its front matter, but the existing site post at the same slug has a different `date`**: Use the archive post's date (the archive is the source of truth for ship dates, computed from GitHub PR merge dates or front matter). If the divergence is large (> 7 days), flag for editorial review.
- **An image asset referenced in an archive post does not exist in `debrief-future` evidence**: This surfaces in `ARCHIVE-REBUILD.md`'s Broken Image References section already. The migration must not copy a zero-byte placeholder and must not silently skip the reference; it either carries a real file or flags it.
- **An archive post references an image via a non-Jekyll-absolute path** (defect missed by #231): The site-side build will 404. The migration should include a pre-flight scan that catches any residual source-relative path and blocks the migration rather than shipping broken links.
- **`_posts/future/` subdirectory exists on the site** (contrary to current state): The pre-existing 72 posts would still need classification; the subdirectory is not in itself a blocker but must be reconciled with Jekyll's post-discovery rules (some site configs have `collections.posts.path: _posts` and would miss `_posts/future/`).
- **Jekyll post naming collisions**: Two archive posts produce the same `YYYY-MM-DD-slug.md` filename because they share a ship date and a title (unlikely but possible). The migration must detect and flag as a blocker.
- **Site build fails after the migration**: The migration PR's CI must include a full Jekyll build step; a merged PR that doesn't build is the worst outcome. Green CI is a release gate.
- **Redirects for changed permalinks**: If an archive post's default permalink differs from an existing site post's explicit permalink, bookmarked links break silently. The migration must emit redirect entries (via Jekyll's `redirect_from` plugin or the site's equivalent) so old URLs resolve.
- **Site has an editorial style guide that archive posts don't follow**: For example, the site might require `track:` values from a closed set, or require `excerpt:` ≤ 140 chars. The migration should validate archive posts against any existing site schema and surface violations as blockers rather than shipping them.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The migration MUST replace the subset of `_posts/*.md` on `debrief.github.io` that are superseded by the archive with the 74 posts from `debrief-future:specs/*/media/{unified-post,epic-rollup,composite-post}.md` on main.
- **FR-002**: The migration MUST preserve every `_posts/*.md` on `debrief.github.io` that is NOT superseded by the archive (e.g. legacy Debrief v3 posts, auxiliary pages). Classification is manual and recorded in the PR description.
- **FR-003**: The migration MUST transform each archive post's front matter to match the site's `future-post` layout convention. At minimum: ensure `layout: future-post` (already present in the archive output), ensure `date` is a full ISO date, preserve `author`, `track`, `tags`, `excerpt`, and any archive-emitted fields. Site-specific additions (e.g. `reading_time`, `permalink`) are merged in from the existing site post where present (see FR-005).
- **FR-004**: The migration MUST copy every image asset referenced by `![alt](/assets/images/future-debrief/<slug>/<basename>)` in any archive post from `debrief-future:specs/<slug>/evidence/screenshots/<basename>` (or `evidence/<basename>` for top-level GIFs like `interaction.gif`) into `debrief.github.io:assets/images/future-debrief/<slug>/<basename>`. Symlinks are resolved at copy time; the site receives the real file.
- **FR-005**: The migration MUST preserve editorial hand-edits on the site by diffing each about-to-be-replaced `_posts/*.md` against the archive version before replacing it. Divergences — front-matter fields present on the site but not in the archive, or body text that differs beyond whitespace — are surfaced in the PR description for reviewer decision. The migration MUST NOT silently overwrite divergences.
- **FR-006**: The migration MUST preserve existing `permalink:` values on published posts. If a site post has `permalink: /future/custom-slug/` and the archive version lacks one, the migration carries the permalink forward into the replacement. If no existing permalink, the migration uses Jekyll's default (`/YYYY/MM/DD/<slug>/` or the site's configured scheme).
- **FR-007**: The migration MUST emit `redirect_from:` entries (or equivalent site-supported redirect mechanism) for any post whose effective permalink changes as a side-effect of the migration, so externally-bookmarked URLs continue to resolve.
- **FR-008**: Before the migration PR is opened, a pre-flight scan MUST verify that zero `_posts/*.md` (on either side of the swap) contain source-relative image paths matching `!\[[^]]*\]\((\./|\.\./|evidence/)`. A non-empty scan blocks the migration.
- **FR-009**: Before the migration PR is opened, a pre-flight scan MUST verify that every `![alt](/assets/images/future-debrief/<slug>/<basename>)` reference in every archive post resolves to a real file available to copy from `debrief-future` evidence. A non-empty missing-asset list blocks the migration (the reviewer decides whether to regenerate the archive with broken-ref annotations or patch the source).
- **FR-010**: Before the migration PR is opened, a pre-flight scan MUST verify that no two archive posts produce the same `YYYY-MM-DD-<slug>.md` filename on the site. Collisions block the migration.
- **FR-011**: The migration PR description MUST enumerate, for each `_posts/*.md` on the site before the migration, its disposition under one of three buckets: (a) superseded by archive post `<path>` → delete + replace, (b) merged into rollup/composite `<path>` → delete, (c) non-Future-Debrief legacy → keep. No `_posts/*.md` may be unclassified at PR open.
- **FR-012**: The migration PR CI MUST run a full Jekyll build and block merge on build failure.
- **FR-013**: `ARCHIVE-REBUILD.md` MUST be updated (in `debrief-future` main, via a follow-up commit or a companion PR) so step 1's `rm` target matches reality (`_posts/*.md` not `_posts/future/*.md`), and a new step (or amendment to an existing step) describes the image-asset copy requirement.
- **FR-014**: The migration's pre-flight scan tooling (migration script, audit helper) MUST be ephemeral per #228 FR-009 — either deleted in the same PR as the migration (if housed in a scratch script), or deliberately promoted to a persistent maintainer tool with its own spec (if the re-run scenario is credible).

### Non-Functional Requirements

- **NFR-001**: The migration PR MUST be reviewable file-by-file on GitHub. The PR total is ~72 deletes + ~74 adds + ~400 image copies + 1 runbook patch. Image binaries are listed but not diffed; the reviewer focuses on the 74 markdown posts and the 72 deletions.
- **NFR-002**: The migration MUST NOT require any code changes to `debrief.github.io`'s Jekyll configuration (`_config.yml`, plugins, layouts) — the archive posts are written to slot into the existing `future-post` layout unchanged. If the migration surfaces any config gap, it is flagged as a blocker and resolved before the migration PR opens (no config-and-content in a single PR).
- **NFR-003**: The migration MUST be idempotent at the asset-copy level — re-running the copy step with the same inputs produces the same outputs (no timestamp-derived filenames, no order-dependent behaviour).
- **NFR-004**: The pre-flight scan results MUST be captured in the migration PR description as reviewable prose, not discarded to stdout. Three pre-flight scans (FR-008/009/010) produce at minimum three visible result blocks.

### Key Entities

- **Archive Post**: A generated `specs/*/media/{unified-post,epic-rollup,composite-post}.md` from `debrief-future` main. Carries Jekyll-absolute image paths under `/assets/images/future-debrief/<slug>/`. Front matter is the archive's default shape (`layout: future-post`, `title`, `date`, `author`, `track`, `tags`, `excerpt`).
- **Site Post**: An existing `_posts/YYYY-MM-DD-<slug>.md` file on `debrief.github.io:master`. May carry additional fields (`permalink`, `reading_time`) or hand-edits accumulated since first publish. Classified during migration as superseded, merged, or legacy.
- **Image Asset**: A binary file under `debrief-future:specs/<slug>/evidence/screenshots/` (or `evidence/`) that is referenced by an archive post's Jekyll-absolute path. Must be copied to `debrief.github.io:assets/images/future-debrief/<slug>/<basename>`.
- **Migration PR**: The single pull request on `debrief.github.io:master` that lands the migration. Description enumerates the bucket classification (FR-011), pre-flight scan results (NFR-004), and notable editorial preservation decisions (FR-005).
- **Runbook**: `debrief-future:ARCHIVE-REBUILD.md` on main. Canonical copy. Updated as part of this feature to fix its two bugs (FR-013).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the migration PR merges, `debrief.github.io:_posts/` contains exactly one file per archive post in `debrief-future` main (56 unified + 3 rollup + 15 composite = 74), all with `layout: future-post`. Measured by `ls _posts/*.md | xargs grep -l '^layout: future-post$' | wc -l == 74` (plus any legacy non-archive posts still in `_posts/` that predate Future Debrief).
- **SC-002**: Zero 404s on image references. Measured by: for every `![alt](/assets/images/future-debrief/<slug>/<basename>)` extracted from every migrated post, `test -f assets/images/future-debrief/<slug>/<basename>` passes. Zero failures.
- **SC-003**: Zero residual source-relative image paths. Measured by `grep -rE '!\[[^]]*\]\((\./|\.\./|evidence/)' _posts/` returning empty across every migrated post.
- **SC-004**: Jekyll builds the site successfully after the migration. Measured by the migration PR's CI passing the `jekyll build` step.
- **SC-005**: The three `ARCHIVE-REBUILD.md` sections added by #231 (Orphan Screenshots, Broken Image References, Malformed Image References) list generated-post paths that resolve to live URLs after the migration. Measured by curling each "Generated Post" link and verifying a 200 response (for non-empty sections).
- **SC-006**: Every `_posts/*.md` on the site before the migration has an explicit disposition in the PR description. Measured by: pre-migration file count = (deleted files listed in PR) + (preserved files listed in PR). No unclassified files.
- **SC-007**: The runbook in `debrief-future:ARCHIVE-REBUILD.md` on main is updated so that a fresh maintainer executing it verbatim against the post-migration state succeeds without encountering the two bugs this feature fixed. Measured by: step 1's `rm` target matches reality; the asset-copy requirement is explicitly documented.
- **SC-008**: No external URLs to pre-migration posts break. Measured by: every pre-migration post whose default permalink differs from its post-migration permalink has a `redirect_from:` entry that resolves to the new URL on the live site after deploy.

---

## Out of Scope

- **Regenerating the archive.** This feature applies the archive as it stands in `debrief-future` main. Any further content changes (fixing orphans, embedding broken references, widening regex patterns) belong in a new spec that regenerates the archive, not this one.
- **Modifying Jekyll layouts or site config.** The archive posts are written to slot into the existing `future-post` layout unchanged. If they don't — if some post uses a field the layout doesn't render, or needs a permalink scheme the site doesn't support — that surfaces as a blocker and is resolved in a separate PR before this migration lands.
- **Migrating non-Future-Debrief posts.** The site may carry legacy Debrief v3 posts, pages, or collections that predate the archive. Those are bucketed as "preserve" (FR-002) and untouched.
- **Automating future archive-apply cycles.** This is a one-shot migration. If the archive is regenerated at #300 or later, a future spec decides whether to automate the apply step or re-run this one manually.
- **Changing image file formats or optimising assets.** Images are copied byte-for-byte from `debrief-future` evidence into `debrief.github.io` assets. Any resizing / webp conversion / CDN integration is a separate concern.

---

## Dependencies & Constraints

- **Depends on `debrief-future` main.** The archive posts and their image assets live there. Any uncommitted change in `debrief-future` at migration time is invisible to this feature.
- **Depends on site build configuration.** The site's `_config.yml` and Jekyll plugin set must be able to render a `future-post` layout with the archive's front matter shape. Verified by the Jekyll build gate (FR-012).
- **Writes to `debrief.github.io:master` via a PR.** Requires the maintainer (or CI actor) to have write access. Out-of-band from this feature — standard GitHub auth model.
- **No runtime performance constraint.** The migration is a build-time content swap. Readers see the new site on the next deploy cycle.

---

## Assumptions

- The 74 archive posts in `debrief-future` main as of the migration's start commit are the authoritative set. If the archive is regenerated during this feature's lifecycle, the migration PR is either rebased onto the new archive or closed and reopened from the new baseline.
- Any legacy `_posts/*.md` files on the site that pre-date Future Debrief are identifiable by the absence of `layout: future-post` (or by spec-number absent from the filename). The migration treats that absence as "preserve" by default; edge cases are flagged in the PR description.
- The `debrief.github.io` site has a `redirect_from` Jekyll plugin installed (or a site-supported equivalent). If not, FR-007 falls back to manual redirect files under `_redirects/` or similar — surfaced as a blocker before PR open.
- The maintainer running the migration is human. Despite the ephemeral-tooling pattern, the migration is not automated end-to-end — the bucket-classification step (FR-011) requires editorial judgement.

---

## Open Questions

1. **`redirect_from` availability**: Does `debrief.github.io` currently have the `jekyll-redirect-from` plugin installed? If not, FR-007 requires either installing the plugin (separate PR, NFR-002 boundary) or using an alternative redirect mechanism. Resolve before migration PR opens.
2. **`_posts/future/` subdirectory**: Should the migration move Future Debrief posts into a subdirectory (`_posts/future/*.md`) matching the runbook's original intent, or keep them in `_posts/*.md` and fix the runbook (FR-013)? Subdirectory would make classification easier at future migration boundaries but requires a Jekyll config check that the sub-collection is indexed. Recommend keeping flat in `_posts/` and updating the runbook unless there's a discovered Jekyll benefit to the subdirectory.
