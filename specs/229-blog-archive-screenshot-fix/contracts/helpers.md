# Contracts — New Helpers & Patched Stitchers

**Feature**: 230 (specs/229-blog-archive-screenshot-fix/)
**Scope**: Function signatures + behavioural contracts for the revived
generator's patched surface. All helpers live in
`scripts/regenerate-blog-archive.py` and are deleted per FR-009.

This is the definition-of-done document for Phase 1. Contracts here are
directly exercised by unit tests in Phase 2 (see `research.md` R7).

---

## `harvest_image_refs`

```python
def harvest_image_refs(
    body: str,
    source_spec: SpecRecord,
) -> tuple[list[ImageReference], list[MalformedImageReference]]:
    """Scan body for markdown and HTML image references, plus unmatched ![
    occurrences. Returns (well-formed refs in document order, malformed rows)."""
```

**Preconditions**: `body` is the extracted shipped-post body (front matter
stripped); `source_spec.key` is populated.

**Postconditions**:

- Applies `_IMAGE_RE` and `_HTML_IMG_RE` to each line of `body`.
- Returns one `ImageReference` per regex match. `kind="markdown"` for
  `_IMAGE_RE` hits, `kind="html"` for `_HTML_IMG_RE` hits.
- Order preserved (document order across both regexes — markdown and HTML
  matches are interleaved by line number); duplicates preserved.
- `rewritten_path = rewrite_image_path(match.group("path"), source_spec.key)`.
- `line_number` is 1-based index within `body.splitlines(keepends=False)`.
- **Malformed pass (FR-013 / Issue 8A)**: after both regexes run, compute
  `raw_count = body.count("![")` and compare to the number of markdown
  matches. For every unmatched `![` occurrence (walked line-by-line with
  `line.count("![")` minus per-line match count), emit a
  `MalformedImageReference(spec_key, line_number, snippet=line[:80])`.

**Does not**: read files from disk; mutate `body`; raise on empty results.

**Tests** (`test_image_harvest.py`):

- Empty body → `([], [])`.
- Single `![x](./evidence/a.png)` → one markdown ref, zero malformed.
- `<img src="./evidence/b.png" alt="b">` → one HTML ref with
  `kind="html"`, `alt="b"`, zero malformed.
- `<img src='c.png'>` (no alt, single quotes) → one HTML ref with
  empty alt.
- `<IMG SRC="d.png">` (upper case tag) → one HTML ref (case-insensitive).
- Same path twice → two refs.
- `![](foo.png)` empty-alt form → alt=`""`.
- `![x](foo.png "title")` title arm → title ignored, path `foo.png`.
- `![unclosed(foo.png` on line 7 → zero refs, one malformed with
  `line_number=7`, snippet starts with `![unclosed`.
- Line wrap (`![alt\n](foo.png)`) → zero refs, one malformed on the
  `![alt` line.
- 176-log-panel-ux fixture (four markdown refs across two `## Screenshots`
  sections) → four markdown refs, zero malformed.
- Mixed body (one markdown + one HTML on the same line) → two refs,
  ordered by column within the line.

---

## `rewrite_image_path`

```python
def rewrite_image_path(path: str, source_spec_slug: str) -> str:
    """Convert source-relative to Jekyll absolute; pass scheme & absolute unchanged."""
```

**Rule order (first rule to apply wins)**:

1. `path` starts with `http://`, `https://`, `data:` → return `path` unchanged.
2. `path` starts with `/` (already absolute) → return `path` unchanged.
3. Split off `?query` or `#fragment` suffix (first occurrence of either),
   preserve for reattachment in step 6.
4. **Loop-strip** every leading `./`, `../`, or `evidence/` segment (FR-011).
   Multi-level climbs (`../../evidence/foo.png`) fully resolve.
5. Basename = `Path(stripped).name`.
6. Return `f"/assets/images/future-debrief/{source_spec_slug}/{basename}{suffix}"`.

**Invariants**:

- Always returns a non-empty string when given a non-empty `path`.
- Idempotent for step-1 and step-2 inputs.
- Never raises.
- For empty `path` input: returns
  `f"/assets/images/future-debrief/{slug}/"` (basename of empty = empty).
  Caller should not pass empty strings; harvester filters `!\[\]\(\)`
  upstream.

**Tests** (`test_path_rewrite.py`):

| Input path | Slug | Expected |
|------------|------|----------|
| `./evidence/foo.png` | `174-thumbnail-capture` | `/assets/images/future-debrief/174-thumbnail-capture/foo.png` |
| `../evidence/interaction.gif` | `191-spec-navigator` | `/assets/images/future-debrief/191-spec-navigator/interaction.gif` |
| `evidence/screenshots/a.png` | `085-chart-renderer` | `/assets/images/future-debrief/085-chart-renderer/a.png` |
| `../../evidence/screenshots/foo.png` | `x` | `/assets/images/future-debrief/x/foo.png` *(multi-level climb resolved, FR-011)* |
| `./././evidence/foo.png` | `x` | `/assets/images/future-debrief/x/foo.png` *(repeated `./`)* |
| `/media/x.png` | anything | `/media/x.png` (unchanged) |
| `/assets/images/future-debrief/x/y.png` | anything | unchanged (already absolute) |
| `https://example.com/a.png` | anything | `https://example.com/a.png` (unchanged) |
| `data:image/png;base64,...` | anything | unchanged |
| `foo.png?raw=true` | `x` | `/assets/images/future-debrief/x/foo.png?raw=true` |
| `foo.png#frag` | `x` | `/assets/images/future-debrief/x/foo.png#frag` |
| `../evidence/foo.png?raw=true` | `x` | `/assets/images/future-debrief/x/foo.png?raw=true` *(loop-strip + suffix preservation)* |

---

## Patched `_merge_opener_with_shipped_body`

```python
def _merge_opener_with_shipped_body(opener: str, shipped_body: str) -> str:
    """Existing signature unchanged. Twin-heading splice branch concatenates
    both bodies instead of choosing one (Article I.3: no silent drops)."""
```

**New contract (additive)**:

- For any N image references present in `shipped_body`, the returned merged
  body MUST contain ≥ N image references (set-equal on `(alt, basename)`).
- No change to the non-twin-heading code path.

**Verification hook**: `stitch_unified_post` MAY harvest refs from
`shipped_body` and merged output post-call and assert count parity in a
debug-mode check. Production build does not assert; unit test covers.

**Tests** (`test_stitch.py` — extend existing):

- Existing tests for non-twin-heading merges must still pass unchanged.
- New: 176-log-panel-ux-shaped fixture with tense-inverted twin heading
  produces a merged body whose image-reference count equals source.

---

## Patched `stitch_epic_rollup`

```python
def stitch_epic_rollup(*, epic: Epic, members: tuple[SpecRecord, ...]) -> GeneratedPost | None:
    """Existing signature unchanged. Adds a NEW '## Member Features' section
    between the existing '## Members' index and '## What Shipped' summary."""
```

**Structural change** (Issue 1A / Review Addition): revival source at
`19406178` emits only `## Members` (bullet links) + `## What Shipped`
(static string). No per-member body quotes. The patch **adds** a new
`## Member Features` section:

```markdown
## Member Features

### 174-thumbnail-capture — 2026-04-02

[_first_paragraph of 174's shipped-post body]

#### Screenshots

![alt1](/assets/images/future-debrief/174-thumbnail-capture/a.png)
![alt2](/assets/images/future-debrief/174-thumbnail-capture/b.png)

### 094-point-rectangle-drawing — 2026-03-15

[_first_paragraph]
```

**New contract**:

- `## Members` bullet index preserved (quick-nav).
- New `## Member Features` section inserted after `## Members`, before
  `## What Shipped`.
- For each shipped member `m` (sorted by `m.number`):
  - Header: `### {m.number:03d}-{m.slug} — {m.front_matter.date.isoformat()}`.
  - Body: `_first_paragraph(extract_shipped_body(m.shipped_post_path))`.
  - If `harvest_image_refs(...)` returns N > 0 markdown or HTML refs, a
    `#### Screenshots` sub-heading followed by `![{alt}]({rewritten_path})`
    lines (one per ref, preserving document order).
  - If N = 0, no `#### Screenshots` heading emitted.
- Non-shipped members (`has_shipped_post is False`) appear only in the
  bullet index (existing behaviour).
- No change to title / front matter / atomic-writer path.

**Tests** (`test_stitch.py` — **first ever coverage of rollup**; full
matrix per Issue 7A):

*Baseline assertions (mirror the five existing unified-post tests):*

1. `test_rollup_title_is_epic_title` — destination `GeneratedPost.title`
   equals `epic.title`.
2. `test_rollup_front_matter_has_layout_future_post` — `future-post`.
3. `test_rollup_destination_is_anchor_epic_rollup_md` — path is
   `{anchor.path}/media/epic-rollup.md`.
4. `test_rollup_no_overwrite_proof` — second stitch on same path raises
   `NoOverwriteError`.
5. `test_rollup_has_members_and_member_features_sections` — both section
   headings present in body.

*Screenshot-specific assertions:*

6. `test_rollup_member_with_3_images_produces_3_screenshot_refs` —
   fixture epic with one 3-image member yields exactly 3 `![...]` lines
   under that member's `#### Screenshots`.
7. `test_rollup_member_with_zero_images_omits_screenshots_heading` —
   no `#### Screenshots` header when member carries no refs.
8. `test_rollup_member_screenshot_paths_are_rewritten` — every image
   ref in the rollup body matches
   `/assets/images/future-debrief/{slug}/[^"/\s]+` and has zero
   source-relative forms.

---

## Patched `stitch_composite_post`

```python
def stitch_composite_post(cluster: CompositeCluster) -> GeneratedPost:
    """Existing signature unchanged. Extends the existing '## What Shipped'
    loop to emit per-member screenshots under each member's paragraph."""
```

**Structural change**: revival source (`19406178` line 1333) already
iterates `cluster.members` and emits `**{m.number:03d}-{m.slug}** —
{_first_paragraph(...)}` under `## What Shipped`. The patch extends
each member's block with an inline `#### Screenshots` sub-heading + ref
lines when `harvest_image_refs(...)` returns N > 0. No new top-level
section needed.

**New contract**:

- For each member `m` in `cluster.members` with `shipped_post_path`:
  - Existing `**{m.number:03d}-{m.slug}** — {first_paragraph}` preserved.
  - If `harvest_image_refs(...)` returns N > 0 markdown or HTML refs, a
    `#### Screenshots` sub-heading + `![{alt}]({rewritten_path})` lines
    follow the first-paragraph block.
  - If N = 0, no `#### Screenshots` heading emitted.
- **Anchor-spec special case**: when the composite's anchor spec (earliest
  spec in the cluster) carries images, those images appear in that
  member's sub-block — not duplicated at post level.
- No change to title / front matter / `## What We're Building` / `## How
  It Fits` / `## Key Decisions` / `## Lessons Learned` / `## What's Next`.

**Tests** (`test_stitch.py` — **first ever coverage of composite**; full
matrix per Issue 7A):

*Baseline assertions (mirror the five existing unified-post tests):*

1. `test_composite_title_is_building_prefixed` — title starts with
   `Building `.
2. `test_composite_front_matter_has_layout_future_post`.
3. `test_composite_destination_is_anchor_composite_post_md` — path is
   `{anchor.path}/media/composite-post.md`.
4. `test_composite_no_overwrite_proof` — second stitch on same path
   raises `NoOverwriteError`.
5. `test_composite_has_seven_canonical_sections` — all seven expected
   headings present (`## What We're Building`, `## How It Fits`,
   `## Key Decisions`, `## Members`, `## What Shipped`, `## Lessons
   Learned`, `## What's Next`).

*Screenshot-specific assertions:*

6. `test_composite_185_shaped_cluster_has_16_image_refs` — fixture
   mirroring `185-cql2-array-filter` composite (members carrying 7+5+4
   markdown refs) produces exactly 16 `![...]` lines in total.
7. `test_composite_anchor_spec_images_appear_in_its_own_block` — anchor
   spec with 2 images has those 2 in its `#### Screenshots` block, and
   they do NOT appear elsewhere in the post.
8. `test_composite_member_screenshot_paths_are_rewritten` — every image
   ref matches `/assets/images/future-debrief/{slug}/[^"/\s]+` and has
   zero source-relative forms.

---

## Extended `ArchiveIndex` serialiser

```python
class ArchiveIndex:
    orphans: list[OrphanImage]               # NEW
    broken_refs: list[BrokenImageReference]  # NEW
    malformed_refs: list[MalformedImageReference]  # NEW (FR-013 / Issue 8A)

    def __str__(self) -> str:
        """Append three new sections after existing index + runbook:
        '## Orphan Screenshots', '## Broken Image References',
        '## Malformed Image References'."""
```

**New contract**:

- `## Orphan Screenshots` section:
  - Always present (empty body allowed — placeholder paragraph).
  - Entries grouped by `spec_key`, filename-sorted within each group.
  - Each entry pairs orphan spec to generated post path from
    `Classification`.
- `## Broken Image References` section:
  - Always present (empty body allowed).
  - One row per `BrokenImageReference`: `spec_key`, `source_path`, `alt`.
- `## Malformed Image References` section (FR-013 / Issue 8A):
  - Always present (empty body allowed).
  - One row per `MalformedImageReference`: `spec_key`, `line_number`,
    `snippet`.

**Deterministic sort contract (Issue 3A / NFR-005)**: at the boundary of
`__str__` construction, the serialiser MUST sort:

- `self.orphans` by `(spec_key, filename)`.
- `self.broken_refs` by `(spec_key, source_path)`.
- `self.malformed_refs` by `(spec_key, line_number)`.

Sort happens at serialisation, not at list mutation time — callers can
append in any order (FS-order from `rglob`, iteration order from
classifier). Invariant: two successive `str(index)` calls on the same
`ArchiveIndex` instance produce byte-identical output, regardless of
the order in which scanners populated the lists.

**Tests** (`test_index.py`):

- `test_orphan_section_always_present_even_when_empty` — renders with
  placeholder paragraph when `orphans == []`.
- `test_orphans_render_in_deterministic_order` — insert in reverse FS
  order, assert output is sorted by `(spec_key, filename)`.
- `test_three_orphan_fixture_matches_baseline` — 085×9, 118×9, 142×1
  fixture renders with correct sort + correct generated-post pairing
  (085's composite, 118's composite, 142's unified).
- `test_broken_section_always_present_even_when_empty`.
- `test_broken_ref_with_query_string_preserves_suffix_in_row`.
- `test_broken_ref_with_escaped_alt_text_renders_safely` — alt
  containing `|` or backtick.
- `test_malformed_section_always_present_even_when_empty`.
- `test_malformed_ref_row_shows_line_number_and_snippet`.
- `test_byte_identical_across_two_successive_str_calls` —
  `str(index) == str(index)` with all three lists populated out of
  order. Strong reproducibility gate.

---

## Orphan scanner

```python
def scan_orphans(
    spec: SpecRecord,
    referenced_basenames: set[str],
    seen_resolved: set[Path],
) -> list[OrphanImage]:
    """Walk evidence/screenshots/** + top-level evidence/*.png|gif for spec.
    Return OrphanImage rows for files whose basename is not in referenced_basenames
    and whose resolved path is not yet in seen_resolved. Mutates seen_resolved."""
```

**Contract**:

- Candidate set: `spec.path / "evidence" / "screenshots"` recursive glob
  (`.png`, `.gif`, `.jpg`, `.jpeg`), plus top-level `spec.path /
  "evidence" / "*.png"` and `*.gif` (catches top-level assets like
  `191-spec-navigator/evidence/interaction.gif`).
- For each candidate `p`:
  - `resolved = p.resolve()`.
  - If `resolved in seen_resolved`, skip (FR-012 symlink dedup —
    first-seen wins across the whole run).
  - Otherwise add `resolved` to `seen_resolved`.
  - If `p.name in referenced_basenames`, skip (spec references it).
  - Otherwise emit `OrphanImage(spec_key, p.name, p, resolved)`.
- **Shipped-post-less branch** (Issue 5A): caller passes an empty
  `referenced_basenames` set for specs where `shipped_post_path is None`.
  Every on-disk asset surfaces as an orphan.

**Caller pattern** (inside `ArchiveIndex` construction):

```python
seen_resolved: set[Path] = set()
for spec in specs:
    if spec.shipped_post_path is not None:
        refs, malformed = harvest_image_refs(
            extract_shipped_body(spec.shipped_post_path), spec,
        )
        referenced = {
            Path(r.source_path.split("?")[0].split("#")[0]).name for r in refs
        }
        index.image_refs.extend(refs)
        index.malformed_refs.extend(malformed)
    else:
        referenced = set()
    index.orphans.extend(scan_orphans(spec, referenced, seen_resolved))
```

**Tests** (`test_index.py`):

- `test_orphan_scanner_emits_all_when_no_shipped_post` — spec with 3
  screenshots but `shipped_post_path=None` → 3 orphan rows.
- `test_orphan_scanner_dedupes_by_resolved_path` — spec with a symlinked
  screenshot pointing at another spec's file → one orphan row
  (first-seen wins), not two.
- `test_orphan_scanner_skips_referenced_basenames` — screenshot
  referenced via `../evidence/screenshots/x.png` in shipped-post →
  excluded from orphans.
- `test_orphan_scanner_includes_top_level_evidence_gif` —
  `evidence/interaction.gif` surfaces (matches 191 case).

---

## End-to-end test (Issue 9A)

```python
# tests/regenerate_blog_archive/test_end_to_end.py
def test_full_archive_run_over_three_spec_fixture(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """Build a minimal fixture tree: 1 unified w/ twin-heading + 4 images,
    1 rollup with 2 members (1 member carrying 3 images), 1 composite with
    3 members (carrying 7+5+4 images). Run the full regenerate flow.
    Assert SC-001 (ref count parity), SC-002 (zero source-relative),
    SC-005 (three new sections), NFR-001 (elapsed-time < 10s at this scale)."""
```

**Contract**:

- Fixture tree size: 3 specs + fixtures for classification + orphan
  fixtures (at least one) + broken-ref fixture (missing PNG).
- Elapsed-time assertion: `elapsed < 10.0` seconds (generous headroom
  over actual ~1s at 3-spec scale; Issue 10A).
- Grep equivalents executed in-process:
  - Count all `![...]` in generated posts = count in source posts + HTML
    refs in source. SC-001.
  - Count source-relative image paths in generated posts = 0. SC-002.
  - Assert three new section headings present in `ARCHIVE-REBUILD.md`.
    SC-005.
- Reproducibility sub-assertion: run the flow twice, diff
  `ARCHIVE-REBUILD.md` + every generated post — empty diff. NFR-005.

This is the **integration gate** — unit tests cover each helper in
isolation; this test asserts they compose correctly.

---

## Non-contracts (explicit)

- **Deduplication of repeated image references within a single body**:
  explicitly disabled (ordering signals).
- **Re-generating the missing source images**: out of scope.
- **Modifying source shipped-post.md files**: out of scope; only
  generated posts carry rewritten paths.
- **Republishing to debrief.github.io**: maintainer task, not generator's.

*(Previously-listed non-contracts for HTML `<img>`, multi-level path
climbing, and orphan-scanner symlink handling have been promoted into
the contracts above per the "do it once" scope directive.)*

---

## Deletion contract (FR-009)

At PR merge time, the following MUST NOT exist in HEAD:

- `scripts/regenerate-blog-archive.py`
- `tests/regenerate_blog_archive/`

SC-006 test: `ls scripts/regenerate-blog-archive.py 2>/dev/null` returns
non-zero exit AND `ls tests/regenerate_blog_archive/ 2>/dev/null` returns
non-zero exit in the merged PR.
