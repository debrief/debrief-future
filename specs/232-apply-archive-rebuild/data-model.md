# Data Model — Apply Regenerated Blog Archive

**Feature**: 232 (specs/232-apply-archive-rebuild/)
**Scope**: Dataclasses and state transitions for the migration helper.
All entities are ephemeral (deleted in the migration PR per FR-014).

---

## Dataclasses

### `ArchivePost`

```python
@dataclass(frozen=True)
class ArchivePost:
    spec_key: str                   # e.g. "176-log-panel-ux"
    kind: Literal["unified", "epic-rollup", "composite"]
    source_path: Path               # debrief-future:specs/<spec_key>/media/<kind>-post.md
    front_matter: FrontMatter       # parsed via yaml.safe_load + typed
    body: str                       # markdown body (front matter stripped)
    target_filename: str            # "YYYY-MM-DD-<slug>.md" for the site's _posts/
    referenced_images: tuple[ImageRef, ...]  # parsed from body via #231's _IMAGE_RE
```

Target filename derivation:
```
date_str = front_matter.date.isoformat()
slug = slugify(front_matter.title, remove_prefix="Building ")
target = f"{date_str}-{slug}.md"
```

### `SitePost`

```python
@dataclass(frozen=True)
class SitePost:
    filename: str                   # "YYYY-MM-DD-<slug>.md"
    path: Path                      # debrief.github.io:_posts/<filename>
    front_matter: FrontMatter       # parsed
    body: str                       # markdown body, front matter stripped
    inferred_spec_key: str | None   # e.g. "176-log-panel-ux" from filename + date lookup
                                    # None = legacy (FR-002 preserve bucket)
```

### `FrontMatter`

```python
@dataclass(frozen=True)
class FrontMatter:
    layout: str                     # expected "future-post"
    title: str
    date: _dt.date
    author: str
    track: str | list[str]          # string on archive side; list on some site posts
    tags: list[str]
    excerpt: str | None
    reading_time: int | None        # site-only; carried forward per R8
    permalink: str | None           # site-only; preserved per FR-006
    redirect_from: list[str]        # added during migration per FR-007
    extra: dict[str, Any]           # any field we don't know about — preserved
```

Narrowing happens at the parse boundary. `yaml.safe_load` returns
`dict[str, Any]`; the parser validates required fields (`layout`,
`title`, `date`), narrows optional fields, and packs unrecognised
fields into `extra` to avoid silent loss.

### `ImageRef`

```python
@dataclass(frozen=True)
class ImageRef:
    alt: str
    site_path: str                  # "/assets/images/future-debrief/<slug>/<basename>"
    slug: str                       # extracted from site_path
    basename: str                   # extracted from site_path
    line_number: int                # 1-based index in ArchivePost.body
```

### `Classification`

```python
@dataclass(frozen=True)
class Classification:
    site_post: SitePost
    bucket: Literal["replace", "merge", "legacy"]
    replacement: ArchivePost | None   # populated when bucket == "replace"
    merged_into: ArchivePost | None   # populated when bucket == "merge"
    reason: str                       # human-readable explanation for PR description
```

State transitions:

```
SitePost.inferred_spec_key is None      → bucket="legacy"
spec_key matches unified ArchivePost    → bucket="replace", replacement=that post
spec_key matches epic-rollup member     → bucket="merge", merged_into=the rollup
spec_key matches composite member       → bucket="merge", merged_into=the composite
```

### `Divergence`

```python
@dataclass(frozen=True)
class Divergence:
    site_post: SitePost
    archive_post: ArchivePost
    site_only_fields: dict[str, Any]    # e.g. {"reading_time": 3}
    archive_only_fields: dict[str, Any] # e.g. {"track": "credibility"}
    value_mismatches: dict[str, tuple[Any, Any]]  # {"title": (site_val, archive_val)}
    body_diff_lines: int                # 0 if clean, else count of non-whitespace diff lines
    body_diff_summary: str              # first 10 lines of unified_diff, for PR desc
```

`Divergence.is_clean` property returns `True` iff all four sets are empty
and `body_diff_lines == 0`. Clean divergences are bucketed silently in
the PR description; dirty ones surface with their delta.

### `AssetCopy`

```python
@dataclass(frozen=True)
class AssetCopy:
    image_ref: ImageRef
    source_path: Path               # debrief-future:specs/<slug>/evidence/...
    destination_path: Path          # site:assets/images/future-debrief/<slug>/<basename>
    found: bool                     # False = broken asset (blocks FR-009)
```

### `MigrationPlan`

```python
@dataclass
class MigrationPlan:
    classifications: list[Classification]
    divergences: list[Divergence]
    asset_copies: list[AssetCopy]
    filename_collisions: list[tuple[ArchivePost, ArchivePost]]
    source_relative_leaks: list[tuple[ArchivePost, ImageRef]]  # residual defect
    config_edit_needed: bool         # True if jekyll-redirect-from not yet enabled
```

`MigrationPlan.is_blocked` property:
```python
@property
def is_blocked(self) -> bool:
    return (
        any(not ac.found for ac in self.asset_copies)      # FR-009
        or bool(self.filename_collisions)                  # FR-010
        or bool(self.source_relative_leaks)                # FR-008
    )
```

A blocked plan surfaces its blockers to stdout and refuses to execute
step 6 (write outputs). The maintainer fixes upstream (usually by
re-regenerating the archive) and re-runs.

---

## State Transitions

### Site post lifecycle

```
                ┌──────────┐
                │  SitePost │
                └────┬─────┘
                     │  infer spec_key from filename + archive index
                     ▼
           ┌────────────────────┐
           │  Classification     │
           │    bucket ∈ {      │
           │    replace, merge, │
           │    legacy }        │
           └────────────────────┘
                     │
            ┌────────┼────────┐
            ▼        ▼        ▼
       [replace]  [merge]  [legacy]
            │        │        │
            │        │        └─→ preserve in _posts/ unchanged
            │        └──────→ delete from _posts/ (no replacement)
            │                 target content lives in rollup/composite
            ▼
     Divergence check
            │
      ┌─────┴─────┐
      ▼           ▼
   clean       dirty
      │           │
      │           └─→ surface in PR desc,
      │               reviewer decides
      ▼
   write archive-shaped file to _posts/
   merge site-only fields (reading_time, permalink)
   emit redirect_from if permalink or URL shape changed
```

### Asset copy lifecycle

```
ImageRef (parsed from archive body)
    │
    ▼
AssetResolver tries:
  1. debrief-future:specs/<slug>/evidence/screenshots/<basename>
  2. debrief-future:specs/<slug>/evidence/<basename>
    │
    ▼
  ┌───────────────────────┐
  │  found? ───────────── │─yes→  shutil.copy2 to site:assets/...
  │                       │
  └─── no ────────────────┘─→  record in asset_copies as broken
                               (FR-009 blocker)
```

---

## Invariants

1. **Every `_posts/*.md` on the site maps to exactly one bucket.**
   No site post can be simultaneously `replace` and `merge`. Enforced
   by the classifier's lookup order (unified → rollup → composite → legacy).

2. **Every `ArchivePost` has a unique `target_filename`.**
   FR-010 pre-flight scan. Collisions block migration.

3. **Every referenced `ImageRef` in an `ArchivePost.body` has an
   `AssetCopy` record**, `found: True | False`. None silently omitted.
   FR-009 pre-flight scan drives this.

4. **Every pre-migration site post appears in the migration PR
   description** under one of three dispositions: replaced, merged
   (deleted), or preserved. FR-011 / SC-006.

5. **Front matter fields are never silently lost.** `FrontMatter.extra`
   captures unrecognised fields; all known fields are enumerated in
   `Divergence` sets. The reviewer sees every delta.

6. **Redirects preserve externally-bookmarked URLs.** For any post whose
   effective permalink changes, the post's new front matter carries a
   `redirect_from:` entry listing the old permalink. Zero silent URL
   breakage (SC-008).

---

## Derived types (no separate dataclass)

- `dict[str, ArchivePost]` keyed by `spec_key` — built once at helper
  startup from the 74 archive posts on `debrief-future` main.
- `dict[str, SitePost]` keyed by `inferred_spec_key` (or filename for
  legacy) — built once from the 73 site posts.
- `set[Path]` of `seen_resolved` paths for asset copy symlink dedup
  (mirrors #231's orphan scanner pattern).
