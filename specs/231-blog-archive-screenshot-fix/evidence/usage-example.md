# Usage Example — Reproducing the Screenshot Fix

Audience: a reviewer coming to this PR from a clean `main` checkout. This
walkthrough reproduces the full revive → patch → re-run → delete cycle
prescribed by FR-009.

## Prerequisites

- Clone of `debrief/debrief-future` checked out on `main`
- `uv`, `pnpm`, `task` installed (see `docs/project_notes/key_facts.md`)
- Optional: `gh` CLI (graceful degradation if absent)

## Step 1 — Revive the generator

The generator was deleted in PR #518 per #228 FR-009. Revive from the
pre-delete commit:

```sh
git checkout -b 231-reproduce-locally main
git show 19406178:scripts/regenerate-blog-archive.py > scripts/regenerate-blog-archive.py
git checkout 19406178 -- tests/regenerate_blog_archive/
```

Sanity-check:

```sh
uv run pytest tests/regenerate_blog_archive/ -q         # expect 54 passed
uv run pyright scripts/regenerate-blog-archive.py       # expect 0 errors
uv run ruff check scripts/regenerate-blog-archive.py tests/regenerate_blog_archive/
```

## Step 2 — Apply the patch set

Cherry-pick the six feature commits from this branch:

```sh
git log --format='%h %s' 525ca36^..HEAD | grep "feat(231)"
# f967f61d feat(231): revive #228 generator for screenshot-fix work
# 82d1d23c feat(231): add image harvester + path rewriter with unit tests
# 9b94b917 feat(231): patch three stitchers to preserve + rewrite member images
# fc2fb73b feat(231): add orphan + broken + malformed sections to ARCHIVE-REBUILD.md
# b7573dc7 feat(231): apply path rewriter to unified stitcher + drop fwd-ref quotes
# 0a6d7496 test(231): add end-to-end integration test
# 71360579 feat(231): re-run generator with screenshot fix
```

Or — more direct — cherry-pick `82d1d23c^..71360579` onto the reproducer
branch.

## Step 3 — Verify the patched generator

```sh
uv run pytest tests/regenerate_blog_archive/ -q         # expect 111 passed
uv run pyright scripts/regenerate-blog-archive.py       # expect 0 errors
uv run ruff check scripts/regenerate-blog-archive.py tests/regenerate_blog_archive/
```

## Step 4 — Measure the baseline

Count source image references, then count the existing (pre-patch) generated
references:

```sh
grep -cE '!\[.*\]\(' specs/*/media/shipped-post.md \
  | awk -F: '{s+=$2} END {print "source:", s}'
# source: 64

grep -cE '!\[.*\]\(' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md \
  | awk -F: '{s+=$2} END {print "generated:", s}'
# generated (pre-patch): 25
```

## Step 5 — Re-run the generator

Delete existing generated posts, then re-run with `--force`:

```sh
find specs -maxdepth 3 -type f \
  \( -name 'unified-post.md' -o -name 'epic-rollup.md' -o -name 'composite-post.md' \) \
  -delete

time uv run python scripts/regenerate-blog-archive.py --force --skip-gh
# Expect ≤ 60s real time (NFR-001). Typical: ~0.4s on a 157-spec tree.
```

## Step 6 — Verify success criteria

```sh
# SC-001: generated ref count ≥ well-formed source count (excluding the 5
#         Liquid-template refs in 216-storyboarding-capture, which surface as
#         Malformed — FR-013 by design)
grep -cE '!\[.*\]\(' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md \
  | awk -F: '{s+=$2} END {print "generated:", s}'
# generated: 59  (was 25; 34 dropped refs are back)

# SC-002: zero source-relative path leaks (three explicit globs — brace
#         expansion misses epic-rollup.md)
grep -rE '!\[[^]]*\]\((\./|\.\./|evidence/)' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md | wc -l
# 0

# SC-003: 185 composite has ≥ 16 image refs (from members 186/189/190)
grep -c '!\[' specs/185-cql2-array-filter/media/composite-post.md
# 16

# SC-004: 125 rollup has 3 thumbnail refs from member 174
grep -c '!\[' specs/125-stac-extension-mock-data/media/epic-rollup.md
# 3

# SC-005: three new sections always present in ARCHIVE-REBUILD.md
grep -c 'Orphan Screenshots' ARCHIVE-REBUILD.md         # 1
grep -c 'Broken Image References' ARCHIVE-REBUILD.md    # 1
grep -c 'Malformed Image References' ARCHIVE-REBUILD.md # 1
```

## Step 7 — Reproducibility (NFR-005)

Re-run with the same inputs and diff. Generated posts must be byte-identical.
`ARCHIVE-REBUILD.md` legitimately differs only in run timestamps:

```sh
uv run python scripts/regenerate-blog-archive.py --force --skip-gh
git diff --name-only specs/*/media/ | wc -l   # 0
```

## Step 8 — Delete the generator (FR-009)

```sh
git rm scripts/regenerate-blog-archive.py
git rm -r tests/regenerate_blog_archive/
git commit -m "feat(231): delete revived generator per FR-009"
```

Verify:

```sh
ls scripts/regenerate-blog-archive.py 2>/dev/null  # no such file
ls tests/regenerate_blog_archive/ 2>/dev/null      # no such directory
```

## Step 9 — Full CI gate

```sh
task verify
# Or manual fallback: task lint && task typecheck && task test
```

## What changed in the archive

- **Rollups gained `## Member Features`** (Issue 1A): revival source had no
  per-member body quotes; the patch inserts a new section between `## Members`
  and `## What Shipped` listing each shipped member's first paragraph + a
  `#### Screenshots` block.
- **Composites gained inline `#### Screenshots`** blocks inside each member's
  `## What Shipped` paragraph (e.g. `185/media/composite-post.md` gained 16
  image references from members 186 + 189 + 190).
- **Twin-heading splice preserves the full first body** (US3 / FR-005): the
  twin-heading branch of `_merge_opener_with_shipped_body` now keeps the
  remainder of the first section after splicing its first paragraph into
  `## Key Decisions`, closing the 176-log-panel-ux fourth-image drop.
- **All image paths converted to Jekyll absolute** (FR-004, FR-011): every
  `./evidence/...` / `../evidence/...` / `../../evidence/...` path becomes
  `/assets/images/future-debrief/{slug}/{basename}`.
- **`ARCHIVE-REBUILD.md` gained three sections** (FR-006, FR-007, FR-013):
  Orphan Screenshots (on-disk assets not referenced; 19 at current baseline —
  though orphan counts shift as the patched stitchers now reference more),
  Broken Image References (missing on disk — maintainer must locate), and
  Malformed Image References (syntax-unmatched `![` occurrences — e.g. the
  five Liquid-template refs in 216-storyboarding-capture).
