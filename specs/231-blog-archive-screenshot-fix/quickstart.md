# Quickstart — Screenshot Fix for Regenerated Blog Archive

**Feature**: 231 (specs/231-blog-archive-screenshot-fix/)
**Audience**: implementer executing the patch.
**Prerequisite**: on branch `231-blog-archive-screenshot-fix-impl` off `main`.

Six linear commits, one PR. Expect 45–90 min end-to-end.

---

## 0. Sanity: confirm the defect still exists

```sh
# Source image references (shipped-post.md lives under each spec's media/)
grep -oE '!\[[^]]*\]\([^)]+\)' specs/*/media/shipped-post.md | wc -l
# → expected baseline 64 at 2026-04-24 (was 57 in the original spec audit)

# Generated image references — three explicit globs, brace expansion misses epic-rollup.md
grep -oE '!\[[^]]*\]\([^)]+\)' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md | wc -l
# → expected ~25 (the defect: most of 64 source refs dropped)

# Source-relative paths still leaking
grep -rE '!\[[^]]*\]\((\./|\.\./|evidence/)' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md | wc -l
# → expect non-zero (the defect)
```

If counts diverge meaningfully from the 64/25 baseline, pause — the
archive has been touched since 2026-04-24 and the spec measurements need
re-grounding before proceeding.

---

## 1. Revive the generator and tests (commit 1)

```sh
git show 19406178:scripts/regenerate-blog-archive.py > scripts/regenerate-blog-archive.py
git checkout 19406178 -- tests/regenerate_blog_archive/

# Immediate sanity
uv run pytest tests/regenerate_blog_archive/ -q        # expect 54 passed
uv run pyright scripts/regenerate-blog-archive.py      # expect 0 errors
uv run ruff check scripts/regenerate-blog-archive.py tests/regenerate_blog_archive/
```

Commit as `feat(231): revive #228 generator for screenshot-fix work`.

---

## 2. Add image harvester + path rewriter (commit 2)

Insert below `_first_paragraph` (line ~971 of revival source):

```python
# --- Phase 231 additions: image harvest + Jekyll path rewrite ---

@dataclass(frozen=True)
class ImageReference:
    alt: str
    source_path: str
    rewritten_path: str
    source_spec_key: str
    line_number: int
    kind: Literal["markdown", "html"]


@dataclass(frozen=True)
class OrphanImage:
    spec_key: str
    filename: str
    relative_path: Path
    resolved_path: Path  # dedup key for symlinked evidence dirs (FR-012)


@dataclass(frozen=True)
class BrokenImageReference:
    spec_key: str
    source_path: str
    alt: str


@dataclass(frozen=True)
class MalformedImageReference:
    spec_key: str
    line_number: int
    snippet: str


_IMAGE_RE = re.compile(
    r'!\[(?P<alt>[^\]]*)\]'
    r'\((?P<path>[^)\s]+)'
    r'(?:\s+"[^"]*")?\)'
)

_HTML_IMG_RE = re.compile(
    r'<img\b[^>]*?\bsrc=(?P<q>["\'])(?P<path>[^"\']+)(?P=q)'
    r'(?:[^>]*?\balt=["\'](?P<alt>[^"\']*)["\'])?',
    re.IGNORECASE,
)


def rewrite_image_path(path: str, source_spec_slug: str) -> str:
    if path.startswith(("http://", "https://", "data:")):
        return path
    if path.startswith("/"):
        return path
    # Split suffix (? or # — whichever comes first)
    suffix = ""
    for sep in ("?", "#"):
        if sep in path:
            path, suffix_rest = path.split(sep, 1)
            suffix = sep + suffix_rest
            break
    # Loop-strip every leading ./ ../ evidence/ segment (FR-011)
    changed = True
    while changed:
        changed = False
        for prefix in ("./", "../", "evidence/"):
            if path.startswith(prefix):
                path = path[len(prefix):]
                changed = True
                break
    basename = Path(path).name
    return f"/assets/images/future-debrief/{source_spec_slug}/{basename}{suffix}"


def harvest_image_refs(
    body: str,
    source_spec: SpecRecord,
) -> tuple[list[ImageReference], list[MalformedImageReference]]:
    refs: list[ImageReference] = []
    malformed: list[MalformedImageReference] = []
    for lineno, line in enumerate(body.splitlines(keepends=False), start=1):
        matches_on_line = 0
        for match in _IMAGE_RE.finditer(line):
            refs.append(ImageReference(
                alt=match.group("alt"),
                source_path=match.group("path"),
                rewritten_path=rewrite_image_path(match.group("path"), source_spec.key),
                source_spec_key=source_spec.key,
                line_number=lineno,
                kind="markdown",
            ))
            matches_on_line += 1
        for match in _HTML_IMG_RE.finditer(line):
            refs.append(ImageReference(
                alt=match.group("alt") or "",
                source_path=match.group("path"),
                rewritten_path=rewrite_image_path(match.group("path"), source_spec.key),
                source_spec_key=source_spec.key,
                line_number=lineno,
                kind="html",
            ))
        # Malformed pass (FR-013 / Issue 8A)
        raw_count = line.count("![")
        if raw_count > matches_on_line:
            snippet = line[:80] + ("…" if len(line) > 80 else "")
            for _ in range(raw_count - matches_on_line):
                malformed.append(MalformedImageReference(
                    spec_key=source_spec.key,
                    line_number=lineno,
                    snippet=snippet,
                ))
    return refs, malformed
```

Add unit tests:

- `tests/regenerate_blog_archive/test_image_harvest.py` — 11 harvester
  cases (markdown + HTML + malformed; full list in
  `contracts/helpers.md`).
- `tests/regenerate_blog_archive/test_path_rewrite.py` — 12 rewriter
  cases (loop-strip, multi-level climb, suffix preservation, scheme
  pass-through — table in `contracts/helpers.md`).

```sh
uv run pytest tests/regenerate_blog_archive/test_image_harvest.py tests/regenerate_blog_archive/test_path_rewrite.py -v
# → expect new tests pass; 54 existing tests still pass
```

Commit as `feat(231): add image harvester + path rewriter with unit tests`.

---

## 3. Patch the three stitchers (commit 3)

### 3a. Epic rollup — add new `## Member Features` section (Issue 1A)

The revival source emits only `## Members` (bullet links) + `## What
Shipped` (static string) — no per-member body quotes. Add a new
`## Member Features` section between them:

```python
# Inside stitch_epic_rollup, after the ## Members bullet list loop:
body_lines.append("")
body_lines.append("## Member Features")
body_lines.append("")
for m in sorted(shipped_members, key=lambda s: s.number):
    assert m.shipped_post_path is not None
    assert m.front_matter is not None
    body = extract_shipped_body(m.shipped_post_path)
    refs, _malformed = harvest_image_refs(body, m)  # malformed bubbles up via ArchiveIndex
    header = f"### {m.number:03d}-{m.slug} — {m.front_matter.date.isoformat()}"
    body_lines.append(header)
    body_lines.append("")
    intro = _first_paragraph(body)
    if intro:
        body_lines.append(intro)
        body_lines.append("")
    if refs:
        body_lines.append("#### Screenshots")
        body_lines.append("")
        for ref in refs:
            body_lines.append(f"![{ref.alt}]({ref.rewritten_path})")
        body_lines.append("")
```

### 3b. Composite — extend existing member loop

Inside `stitch_composite_post`'s existing `for m in cluster.members:`
block under `## What Shipped` (revival source line ~1333), append
screenshots inline:

```python
for m in cluster.members:
    if m.shipped_post_path is None:
        continue
    body = extract_shipped_body(m.shipped_post_path)
    first = _first_paragraph(body)
    if first:
        body_lines.append(f"**{m.number:03d}-{m.slug}** — {first}\n")
    refs, _malformed = harvest_image_refs(body, m)
    if refs:
        body_lines.append("#### Screenshots\n")
        for ref in refs:
            body_lines.append(f"![{ref.alt}]({ref.rewritten_path})")
        body_lines.append("")
```

### 3c. Unified twin-heading splice — concatenate-both-bodies

Inside `_merge_opener_with_shipped_body`'s twin-heading branch
(revival source line 955), replace the "splice first paragraph, drop
duplicate heading" logic with concatenation (R3 preferred variant). If
the existing 6-of-6 image-preserving unified posts regress, fall back
to post-merge `## Additional Screenshots` reconciliation (R3 fallback).

```sh
uv run pytest tests/regenerate_blog_archive/test_stitch.py -v
# → expect existing 5 cases + new 16 rollup/composite assertions pass
```

Note: per Issue 7A, the new rollup/composite tests form the **first ever
coverage** of those stitchers — mirror the 5 baseline tests the unified
stitcher already has (title, front matter, destination, no-overwrite,
section headings), then add 3 screenshot-specific assertions per
stitcher. Full matrix in `contracts/helpers.md`.

Commit as `feat(231): patch three stitchers to preserve + rewrite member images`.

---

## 4. Orphan + broken + malformed sections (commit 4)

Extend `ArchiveIndex` to hold three new lists. Populate in the serialiser
construction path:

```python
# In ArchiveIndex construction
index.orphans = []
index.broken_refs = []
index.malformed_refs = []
seen_resolved: set[Path] = set()

for spec in specs:
    # Harvester pass — also collects malformed entries (FR-013)
    if spec.shipped_post_path is not None:
        body = extract_shipped_body(spec.shipped_post_path)
        refs, malformed = harvest_image_refs(body, spec)
        index.malformed_refs.extend(malformed)
        referenced_basenames: set[str] = {
            Path(r.source_path.split("?")[0].split("#")[0]).name for r in refs
        }
        # Broken-reference check — resolve against shipped-post's own dir (Issue 2A)
        shipped_dir = spec.shipped_post_path.parent
        for r in refs:
            if r.source_path.startswith(("http://", "https://", "data:", "/")):
                continue  # external / absolute — not our concern
            clean = r.source_path.split("?")[0].split("#")[0]
            resolved = (shipped_dir / clean).resolve()
            if not resolved.is_file():
                index.broken_refs.append(BrokenImageReference(
                    spec_key=spec.key, source_path=r.source_path, alt=r.alt,
                ))
    else:
        # Shipped-post-less branch (Issue 5A) — every asset is an orphan
        referenced_basenames = set()

    # Orphan scanner with symlink dedup (FR-012)
    index.orphans.extend(scan_orphans(spec, referenced_basenames, seen_resolved))


def scan_orphans(
    spec: SpecRecord,
    referenced_basenames: set[str],
    seen_resolved: set[Path],
) -> list[OrphanImage]:
    candidates: list[Path] = []
    screenshots_dir = spec.path / "evidence" / "screenshots"
    evidence_top = spec.path / "evidence"
    if screenshots_dir.is_dir():
        for pat in ("*.png", "*.gif", "*.jpg", "*.jpeg"):
            candidates.extend(screenshots_dir.rglob(pat))
    if evidence_top.is_dir():
        for pat in ("*.png", "*.gif"):
            candidates.extend(evidence_top.glob(pat))
    out: list[OrphanImage] = []
    for p in candidates:
        resolved = p.resolve()
        if resolved in seen_resolved:
            continue
        seen_resolved.add(resolved)
        if p.name in referenced_basenames:
            continue
        out.append(OrphanImage(
            spec_key=spec.key,
            filename=p.name,
            relative_path=p.relative_to(repo_root),
            resolved_path=resolved,
        ))
    return out
```

Extend `ArchiveIndex.__str__` with three new sections per
`contracts/helpers.md`. Sort all three lists at serialisation boundary
(Issue 3A):

```python
def __str__(self) -> str:
    # ... existing sections ...
    lines.append("## Orphan Screenshots\n")
    if not self.orphans:
        lines.append("_No orphan screenshots detected._\n")
    for orphan in sorted(self.orphans, key=lambda o: (o.spec_key, o.filename)):
        ...
    lines.append("## Broken Image References\n")
    if not self.broken_refs:
        lines.append("_No broken references detected._\n")
    for ref in sorted(self.broken_refs, key=lambda r: (r.spec_key, r.source_path)):
        ...
    lines.append("## Malformed Image References\n")
    if not self.malformed_refs:
        lines.append("_No malformed references detected._\n")
    for m in sorted(self.malformed_refs, key=lambda m: (m.spec_key, m.line_number)):
        ...
```

```sh
uv run pytest tests/regenerate_blog_archive/test_index.py -v
# → expect orphan + broken + malformed + deterministic-sort regression pass
```

Commit as `feat(231): add orphan + broken + malformed sections to ARCHIVE-REBUILD.md`.

---

## 5. Re-run the generator (commit 5)

```sh
uv run python scripts/regenerate-blog-archive.py --force

# Success-criteria greps (R8) — three explicit globs, no brace expansion
grep -cE '!\[.*\]\(' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md \
  | awk -F: '{s+=$2} END {print "total:", s}'
# → expect total ≥ baseline (re-measure source count first: was 64 at 2026-04-24)

grep -rE '!\[[^]]*\]\((\./|\.\./|evidence/)' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md | wc -l
# → expect 0 (SC-002)

grep -c 'Orphan Screenshots' ARCHIVE-REBUILD.md          # → expect 1 (SC-005)
grep -c 'Broken Image References' ARCHIVE-REBUILD.md     # → expect 1 (SC-005)
grep -c 'Malformed Image References' ARCHIVE-REBUILD.md  # → expect 1 (SC-005)

grep -c '!\[' specs/185-cql2-array-filter/media/composite-post.md
# → expect ≥ 16 (SC-003)

grep -c '!\[' specs/125-stac-extension-mock-data/media/epic-rollup.md
# → expect ≥ 3 (SC-004)
```

Timed run to verify NFR-001 scale budget (Issue 10A):

```sh
time uv run python scripts/regenerate-blog-archive.py --force
# → expect real time < 60s at current archive scale (95 specs)
```

Second run to verify reproducibility (NFR-005):

```sh
uv run python scripts/regenerate-blog-archive.py --force
git diff --name-only specs/*/media/ ARCHIVE-REBUILD.md | wc -l
# → expect 0 (byte-identical)
```

Commit as `feat(231): re-run generator with screenshot fix`.

---

## 6. Delete the generator (commit 6)

```sh
git rm scripts/regenerate-blog-archive.py
git rm -r tests/regenerate_blog_archive/
git commit -m "feat(231): delete revived generator per FR-009"
```

---

## 7. Full CI gate

```sh
task verify   # lint + typecheck + unit + Playwright E2E
# Or manual fallback (see CLAUDE.md "Before Pushing")
```

If `task verify` red, fix and push additional commits. **Do not push
without green.**

---

## PR

Title: `fix(231): preserve + rewrite screenshot references across blog archive`

Body (bullet summary):

- Revive #228 generator from `19406178`; re-patch; re-run; re-delete in
  the same PR (FR-009).
- Three stitcher fixes preserve 33 dropped images across rollups +
  composites; unified splice preserves the 176-log-panel-ux fourth
  image. Rollup gains a new `## Member Features` section (Issue 1A).
- Path rewriter converts every source-relative reference (including
  multi-level `../../` climbs — FR-011) to Jekyll absolute form.
- HTML `<img>` tags now harvested alongside markdown `![]()` (FR-010).
- `ARCHIVE-REBUILD.md` now lists 19 orphan screenshots + broken-
  reference annotations + malformed-markdown annotations (FR-013) so
  the website maintainer can act at publication time.
- Orphan scanner dedupes via `Path.resolve()` (FR-012) and surfaces
  every on-disk asset for specs without a shipped-post (Issue 5A).
- All sections sort deterministically at serialisation for NFR-005
  byte-identical reproducibility.
- Full test matrix for rollup + composite stitchers (first-ever
  coverage — 5 baseline + 3 screenshot assertions each; Issue 7A).
- New E2E test (`test_end_to_end.py`, Issue 9A): 3-spec fixture,
  full-run reproducibility + SC-001/002/005 + elapsed-time assertion.

Expect ~6 commits; reviewer reads 2–4 carefully, skims 1+5+6.
