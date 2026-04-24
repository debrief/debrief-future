# Phase 1 Data Model — Screenshot Fix Helpers

**Feature**: 231 (specs/231-blog-archive-screenshot-fix/)
**Date**: 2026-04-24
**Scope**: Three dataclasses internal to `scripts/regenerate-blog-archive.py`.

No new persistent entities; no schema changes (no LinkML bindings touched).
These dataclasses live in the ephemeral generator module and disappear with
it per FR-009.

---

## ImageReference

Represents a single image reference discovered in a source
`shipped-post.md`, in either markdown or HTML form.

**Fields**:

| Field | Type | Meaning | Validation |
|-------|------|---------|------------|
| `alt` | `str` | Alt text from `![alt](…)` or `<img alt="…">` (empty for `![](…)` and for HTML without `alt`) | No constraint |
| `source_path` | `str` | Path as written in source post (may be `./x`, `../x`, `evidence/x`, scheme URI, or already-absolute) | Non-empty |
| `rewritten_path` | `str` | Path after `rewrite_image_path` applied | Non-empty; always starts with `/`, `http://`, `https://`, or `data:` |
| `source_spec_key` | `str` | Slug of the spec that contains the reference (`125-stac-extension-mock-data`) | Matches `SpecRecord.key` |
| `line_number` | `int` | 1-based line number within the source body where the reference appears | ≥ 1 |
| `kind` | `Literal["markdown", "html"]` | Which regex matched — markdown `_IMAGE_RE` or HTML `_HTML_IMG_RE` (FR-010) | One of the two literals |

**Justification for `line_number`**: supports the FR-013 malformed-reference
pass (which records line numbers for unmatched `![` occurrences) and any
future HTML-form diagnostic (e.g. a warning for `<img>` without `alt=`
for accessibility). Zero cost to retain — we already enumerate lines to
build the reference list.

**Producers**: `harvest_image_refs(body, source_spec) -> list[ImageReference]`.
Internally runs both `_IMAGE_RE` and `_HTML_IMG_RE` against each line.

**Consumers**:

- Member-subsection builder in `stitch_epic_rollup` and `stitch_composite_post`.
- Twin-heading splice branch in `_merge_opener_with_shipped_body`.
- `ArchiveIndex` broken-reference checker (resolves `source_path` against
  `source_spec.shipped_post_path.parent`, per Issue 2A).
- Orphan scanner (reference-set builder; uses `basename(source_path)`).

**Ordering invariant**: harvest preserves document order; if a ref appears
twice in the source body, it appears twice in the list (FR edge case
"Same image referenced twice").

---

## OrphanImage

Represents an image file on disk that is not referenced by any markdown
or HTML image tag in the spec's `shipped-post.md` (or represents every
on-disk image for a spec that has no shipped-post at all — the
referenced-basename set is empty in that case, per Issue 5A).

**Fields**:

| Field | Type | Meaning | Validation |
|-------|------|---------|------------|
| `spec_key` | `str` | Spec slug containing the orphan | Matches `SpecRecord.key` |
| `filename` | `str` | Basename of the image file (e.g. `bar-chart-light.png`) | Non-empty; case-preserving |
| `relative_path` | `Path` | Repo-relative path as written (e.g. `specs/085-chart-renderer/evidence/screenshots/bar-chart-light.png`) | Must resolve to an existing file at scan time |
| `resolved_path` | `Path` | `relative_path.resolve()` — used as the dedup key so symlinked directories do not produce duplicate entries (FR-012) | Must exist |

**Producers**: orphan scanner inside `ArchiveIndex` construction (FR-006).
Dedup rule: for each candidate file found by the scanner, compute
`resolved_path = candidate.resolve()`. Skip if `resolved_path` already
seen in this run. First-seen `spec_key` wins (source of the symlink).

**Shipped-post-less branch** (Issue 5A): if `SpecRecord.shipped_post_path`
is `None`, the referenced-basename set is empty and every on-disk asset
surfaces as an orphan. Keeps every asset visible to the maintainer.

**Consumers**: `ArchiveIndex.__str__` serialiser → `## Orphan Screenshots`
section in `ARCHIVE-REBUILD.md`.

**Serialisation rule**: sorted by `(spec_key, filename)` tuple for
deterministic output across runs (Issue 3A / NFR-005). Paired with the
generated post path (unified / composite / rollup) the spec maps into —
that target is already determined by the classifier before orphan
detection runs.

---

## BrokenImageReference

Represents an `ImageReference` whose `source_path` does not resolve to an
existing file on disk after path normalisation.

**Fields**:

| Field | Type | Meaning | Validation |
|-------|------|---------|------------|
| `spec_key` | `str` | Spec slug containing the broken reference | Matches `SpecRecord.key` |
| `source_path` | `str` | Original path as written in the source post | Non-empty |
| `alt` | `str` | Alt text (may be empty) | No constraint |

**Path-resolution base** (Issue 2A): `source_path` is resolved relative
to `source_spec.shipped_post_path.parent` (i.e. the shipped-post's own
directory), not the current working directory. For a shipped post at
`specs/176-log-panel-ux/media/shipped-post.md`, the reference
`../evidence/screenshots/x.png` resolves to
`specs/176-log-panel-ux/evidence/screenshots/x.png`. Any `?query` /
`#fragment` suffix is stripped before the filesystem check.

**Producers**: broken-reference checker iterates every `ImageReference`
emitted by `harvest_image_refs` and stats the resolved disk path; records
a `BrokenImageReference` if the path does not exist.
**Consumers**: `ArchiveIndex.__str__` serialiser → `## Broken Image
References` section. Sorted by `(spec_key, source_path)` for determinism
(Issue 3A / NFR-005).

**Non-failure invariant (FR-007)**: a broken reference is recorded; the
generator MUST continue and MUST still emit the rewritten path into the
generated post (so the maintainer can restore the asset later).

---

## MalformedImageReference

Represents an `![` occurrence in a source body that did not produce a
markdown regex match — i.e. the markdown form is structurally broken
(unclosed parenthesis, line-wrapped alt, missing `](` etc.). Populated
per FR-013 to honour Article I.3 (no silent drops).

**Fields**:

| Field | Type | Meaning | Validation |
|-------|------|---------|------------|
| `spec_key` | `str` | Spec slug containing the malformed occurrence | Matches `SpecRecord.key` |
| `line_number` | `int` | 1-based line number of the unmatched `![` | ≥ 1 |
| `snippet` | `str` | First 80 characters of the offending line (with trailing ellipsis if truncated) | Non-empty |

**Producers**: harvester's malformed-reference pass. After `_IMAGE_RE`
and `_HTML_IMG_RE` have been applied to every line, count
`body.count("![")` and compare to the markdown match count. For every
unmatched `![` occurrence, record a `MalformedImageReference`.

**HTML is not counted**: `<img>` tags are structurally validated by the
browser if malformed; we do not attempt to second-guess malformed HTML
in this generator.

**Consumers**: `ArchiveIndex.__str__` serialiser → `## Malformed Image
References` section.

**Serialisation rule**: sorted by `(spec_key, line_number)` for
determinism.

---

## Relationship to existing entities

No existing entity is modified. Where the new types plug in:

```text
SpecRecord (existing, #228)
    │
    ├── shipped_post_path: Path | None  ── read by harvest_image_refs ──┐
    └── key: str                        ── used as spec_key everywhere  │
                                                                        ▼
                               ImageReference ──┬── BrokenImageReference
                                                ├── MalformedImageReference (from unmatched ![)
                                                └── OrphanImage (disjoint — on-disk scan w/ resolved-path dedup)

Classification (existing, #228)
    │
    └── generated_post_path: Path       ── pairs orphans to target post in serialiser
```

No state transitions. All four dataclasses are constructed once at scan
time, held in `ArchiveIndex` until serialisation, then discarded with the
module on deletion (FR-009).

---

## Open questions resolved

- **Deduplication of repeated references?** No — preserve ordering (spec
  edge case: "ordering signals").
- **Unicode in filenames?** Treated as opaque; Python `Path` handles it.
- **Absolute `/media/` paths?** Rule 2 in `rewrite_image_path` passes them
  through unchanged (spec User Story 4 acceptance scenario 3).
- **HTML `<img>` without `alt`?** Empty string; same as markdown `![](…)`.
- **Multi-level `../../` climbing?** Resolves identically to single-level
  via the loop-strip rule (FR-011 / research R2).
- **Symlinked evidence dirs?** Deduped on `resolved_path`, first-seen wins
  (FR-012 / research R5).
- **Shipped-post-less spec with screenshots on disk?** All on-disk assets
  surface as orphans (Issue 5A).
- **Malformed markdown (`![alt](unclosed`)?** Surfaced in `## Malformed
  Image References` section with line number + snippet (FR-013 / Issue 8A).
