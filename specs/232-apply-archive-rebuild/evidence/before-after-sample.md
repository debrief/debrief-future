# Before/After Sample — Migration Behaviour

Two real cases drawn from the live migration on `debrief.github.io:master`.

---

## Case A — Clean swap with `reading_time` carried forward

**Site post**: `_posts/2026-01-23-task-build-system.md`
**Bucket**: `replace`
**Archive source**: `specs/047-task-build-system/media/unified-post.md` (or
similar — generated_path resolves via the archive index)
**Why this case**: site filename = archive `target_filename` (slugify of
"Building Task Build System" = `task-build-system`, prefix-strip strips
`Building`). Migration modifies in place rather than delete+create.

### Front-matter delta

```diff
--- master:_posts/2026-01-23-task-build-system.md
+++ branch:_posts/2026-01-23-task-build-system.md
-title: "Shipped: Task Build System"
-date: 2026-01-23
-track: [credibility]
+title: Building Task Build System
+date: '2026-01-23'
+track: credibility
+tags:
+- build-system
+excerpt: Single commands for test/build/dev, checksum-based caching, zero overhead
+  dependency checks
 author: Ian
 reading_time: 2
-tags: [tracer-bullet, developer-experience, build-system]
-excerpt: "Single commands for test/build/dev, checksum-based caching, zero overhead dependency checks"
```

Notice:

- `reading_time: 2` **preserved** (`merge_front_matter`'s site-wins rule).
- `track:` normalised from `[credibility]` (list) to `credibility` (string)
  per archive's source-of-truth shape.
- Archive's `excerpt` and `tags` overwrite the site's prior versions.
- `title:` becomes `Building Task Build System` — archive's title wins.

### Body delta

The body is fully replaced from the archive's unified-post body (the new
content opens with `## What We're Building` instead of the old `## What We
Built`). This is the FR-005 "body diverged" case, surfaced in the PR body's
Editorial-divergences section as a `<details>` block.

---

## Case B — Body-diverged surfaced in PR body

**Site post**: any pre-archive-era `2026-XX-XX-shipped-*.md` whose stripped
slug matches an archive title slug. Concrete example: `2026-01-09-shipped-
schema-foundation.md` → archive `target_filename: 2026-01-09-building-schema-
foundation.md`. The two filenames differ, so the site post is **deleted** and
a new file is **written** — git records this as `D` + `??`.

### What the maintainer sees in the PR body

The MIGRATION-REPORT.md (T045) lists every replace-bucket diff that isn't
clean. Excerpt:

```markdown
## Editorial divergences

5 divergence(s) need reviewer attention:

<details><summary><code>2026-01-09-shipped-schema-foundation.md</code></summary>

- Site-only fields: `{'reading_time': 4}`
- Value mismatches: `{'title': ('Shipped: Schema Foundation', 'Building Schema Foundation')}`
- Body diverged (87 lines):

```diff
--- site
+++ archive
@@ -1,4 +1,8 @@
-## What We Shipped
+## What We're Building
+
+...
```

</details>
```

The reviewer reads this and decides:

- **Title change**: archive wins (intentional — the archive's "Building X" naming convention is the source of truth).
- **`reading_time: 4`**: carried forward via `merge_front_matter` (site wins on this field).
- **Body diff**: archive wins (the unified post is the deliberate post-ship version).

If a reviewer wanted to preserve a hand-edit from the site, the right move is
to amend the source `specs/<spec_key>/media/{unified,epic-rollup,composite}-
post.md` and re-run the migration helper. The migration intentionally does
**not** support post-hoc patches to the migration output.

---

## Case C — Legacy preserve (untouched)

**Site post**: `_posts/2026-04-24-building-screenshot-complete-blog-archive.md`

This is the #231 shipped-post that landed on master independently. Its slug
doesn't match any archive title slug (it post-dates the archive's snapshot of
main), so the classifier puts it in the `legacy` bucket. The migration
**does not touch it** — file content unchanged in this PR.

(Note: a separate pre-existing duplication issue in this file — three
`![](../evidence/screenshots/...)` lines that duplicated working
`![](/assets/images/...)` lines — was cleaned up as part of this PR via a
3-line `sed -i` edit to clear SC-003. Fixing legacy-bucket posts is not in
scope for the migration script itself; this hand-edit is a separate
hygienic improvement.)
