# US5 Verification — Orphan / Broken / Malformed Index Becomes Actionable

**Captured at**: 2026-04-25T19:43:05Z (HEAD: 02a672cf, pre-merge dry run)
**Site clone state**: post-execute on `future-debrief/232-apply-archive-rebuild`
branch (not yet pushed at capture time).

---

## Method

For each row in `ARCHIVE-REBUILD.md`'s `## Orphan Screenshots` section, the
`Generated Post` column points at a `specs/<spec_key>/media/{unified-post,
epic-rollup,composite-post}.md` path. After the migration PR merges and
GitHub Pages redeploys, those archive posts appear on the live site at
`https://debrief.github.io/future-debrief/YYYY/MM/DD/<slug>/`.

This file inventories the mapping from each Generated Post path to its
**post-merge live URL** for the maintainer's curl-test loop.

The map below is built from the migration's own classifier output (so the
Generated Post path → archive `target_filename` derivation matches whatever
shipped). Live-URL verification is **post-merge** — pre-merge we can only
confirm the file lives at the expected `_posts/*.md` path on the migration
branch.

## Orphan Screenshots — pre-merge mapping

The Orphan Screenshots section enumerates 19 orphans across specs 085, 118,
142, 004, 005 (per #231 spec). Each row's Generated Post file lands at a
predictable site path under `_posts/YYYY-MM-DD-building-<slug>.md`.

Sample mapping (full table in the migration PR body):

| Spec | Generated Post (debrief-future) | Site-side `_posts/*.md` (post-merge) |
|------|----------------------------------|---------------------------------------|
| 004-loader-mini-app | `specs/004-loader-mini-app/media/unified-post.md` | `_posts/2026-01-13-building-loader-mini-app.md` |
| 005-chromeos-testing-setup | `specs/005-chromeos-testing-setup/media/unified-post.md` | `_posts/2026-XX-XX-building-…-tests.md` |
| 085-chart-renderer | `specs/085-chart-renderer/media/composite-post.md` | `_posts/2026-XX-XX-building-….md` |
| 118 | `specs/118-…/media/composite-post.md` | `_posts/2026-XX-XX-building-….md` |
| 142 | `specs/142-…/media/composite-post.md` | `_posts/2026-XX-XX-building-….md` |

(The `XX-XX` placeholders resolve at execute time from the archive front
matter's `date:`. Use the migration helper's MIGRATION-REPORT.md table to
extract concrete filenames for the post-merge `curl` loop.)

## Broken Image References — pre-merge state

The Broken Image References section in `ARCHIVE-REBUILD.md` was empty at the
last archive regeneration (post-#231). The migration's pre-flight FR-009
re-checks at apply time and surfaces any new breakage; on this run the
final dry-run reported **0 missing assets** after the upstream fixes to
`091-poly-featurekind` and `215-storyboarding-schema` documented in
`usage-example.md`.

## Malformed Image References — pre-merge state

`ARCHIVE-REBUILD.md`'s Malformed Image References section reads "_No
malformed references detected._" at this commit. Pre-flight FR-008
(`detect_source_relative_leaks`) returned 0 on the migrated archive set, so
no synthetic malformed paths slipped through.

## Post-merge plan

The maintainer runs the post-deploy curl loop from the
[quickstart](../quickstart.md) §3 once the migration PR merges and GitHub
Pages rebuilds:

```sh
# SC-002 sample
for url in $(shuf -n 5 <(grep -rhoE '/assets/images/future-debrief/[^)]+' \
    debrief.github.io/_posts/*.md | sort -u)); do
    curl -s -o /dev/null -w "%{http_code} $url\n" "https://debrief.github.io$url"
done
# → all 200

# SC-005: Generated Post links from the orphan section
# (extract the second column → derive the live URL → curl)
```

If anything 404s, the right fix is a follow-up PR on the site (small
edit) — not a re-run of the migration helper, which is now deleted per
FR-014.
