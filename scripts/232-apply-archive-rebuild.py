#!/usr/bin/env python3
"""One-shot migration helper (spec 232) — apply regenerated blog archive.

Migrates 74 archive posts from `debrief-future:specs/*/media/{unified-post,
epic-rollup,composite-post}.md` into `debrief.github.io:_posts/`, with image
assets copied from `specs/<slug>/evidence/...` into the site's
`assets/images/future-debrief/<slug>/`.

The helper is ephemeral per FR-014 / #228 FR-009: committed alongside its
tests and deleted in the same PR as the migration.

See `specs/232-apply-archive-rebuild/contracts/helpers.md`.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import difflib
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import yaml

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

IMAGE_RE = re.compile(
    r"!\[(?P<alt>[^\]]*)\]\((?P<path>/assets/images/future-debrief/"
    r"(?P<slug>[^/]+)/(?P<basename>[^)]+))\)"
)

SOURCE_RELATIVE_RE = re.compile(r"!\[[^\]]*\]\((?:\./|\.\./|evidence/)")

LEGACY_SHIPPED_PREFIX = "shipped-"

ARCHIVE_KINDS: tuple[str, ...] = ("unified-post", "epic-rollup", "composite-post")


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class FrontMatterError(ValueError):
    """Raised when front matter cannot be parsed or lacks required fields."""


class AmbiguousClassificationError(RuntimeError):
    """Raised when a site post matches more than one archive post."""


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FrontMatter:
    layout: str
    title: str
    date: _dt.date
    author: str
    track: str | list[str]
    tags: list[str]
    excerpt: str | None = None
    reading_time: int | None = None
    permalink: str | None = None
    redirect_from: list[str] = field(default_factory=list)
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ImageRef:
    alt: str
    site_path: str
    slug: str
    basename: str
    line_number: int


@dataclass(frozen=True)
class ArchivePost:
    spec_key: str
    kind: Literal["unified", "epic-rollup", "composite"]
    source_path: Path
    front_matter: FrontMatter
    body: str
    target_filename: str
    referenced_images: tuple[ImageRef, ...]


@dataclass(frozen=True)
class SitePost:
    filename: str
    path: Path
    front_matter: FrontMatter
    body: str
    inferred_spec_key: str | None


@dataclass(frozen=True)
class ArchivePostRef:
    """Row in the ARCHIVE-REBUILD.md index table."""

    spec_key: str
    category: str
    title: str
    date: str
    generated_path: str


@dataclass(frozen=True)
class Classification:
    site_post: SitePost
    bucket: Literal["replace", "merge", "legacy"]
    replacement: ArchivePost | None
    merged_into: ArchivePost | None
    reason: str


@dataclass(frozen=True)
class Divergence:
    site_post: SitePost
    archive_post: ArchivePost
    site_only_fields: dict[str, Any]
    archive_only_fields: dict[str, Any]
    value_mismatches: dict[str, tuple[Any, Any]]
    body_diff_lines: int
    body_diff_summary: str

    @property
    def is_clean(self) -> bool:
        return (
            not self.site_only_fields
            and not self.archive_only_fields
            and not self.value_mismatches
            and self.body_diff_lines == 0
        )


@dataclass(frozen=True)
class AssetCopy:
    image_ref: ImageRef
    source_path: Path
    destination_path: Path
    found: bool


@dataclass
class MigrationPlan:
    classifications: list[Classification]
    divergences: list[Divergence]
    asset_copies: list[AssetCopy]
    filename_collisions: list[tuple[ArchivePost, ArchivePost]]
    source_relative_leaks: list[tuple[ArchivePost, ImageRef]]
    config_edit_needed: bool

    @property
    def is_blocked(self) -> bool:
        return (
            any(not ac.found for ac in self.asset_copies)
            or bool(self.filename_collisions)
            or bool(self.source_relative_leaks)
        )


@dataclass(frozen=True)
class MigrationResult:
    site_posts_deleted: list[Path]
    site_posts_written: list[Path]
    assets_copied: list[Path]
    config_edited: bool


# ---------------------------------------------------------------------------
# Front matter
# ---------------------------------------------------------------------------


_FRONT_MATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n(.*)\Z", re.DOTALL)
_KNOWN_FIELDS: frozenset[str] = frozenset(
    {
        "layout",
        "title",
        "date",
        "author",
        "track",
        "tags",
        "excerpt",
        "reading_time",
        "permalink",
        "redirect_from",
    }
)
_REQUIRED_FIELDS: tuple[str, ...] = ("layout", "title", "date")


def _coerce_date(value: object) -> _dt.date:
    if isinstance(value, _dt.datetime):
        return value.date()
    if isinstance(value, _dt.date):
        return value
    if isinstance(value, str):
        try:
            return _dt.date.fromisoformat(value[:10])
        except ValueError as exc:
            msg = f"invalid ISO date: {value!r}"
            raise FrontMatterError(msg) from exc
    msg = f"unsupported date type: {type(value).__name__}"
    raise FrontMatterError(msg)


def _coerce_str_list(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(item) for item in value]  # pyright: ignore[reportUnknownVariableType]
    msg = f"expected list or string, got {type(value).__name__}"
    raise FrontMatterError(msg)


def parse_front_matter(text: str) -> tuple[FrontMatter, str]:
    """Parse a markdown file's front matter and return (FrontMatter, body)."""
    match = _FRONT_MATTER_RE.match(text)
    if match is None:
        msg = "missing or malformed front-matter block"
        raise FrontMatterError(msg)
    raw_yaml, body = match.group(1), match.group(2)
    try:
        loaded = yaml.safe_load(raw_yaml)
    except yaml.YAMLError as exc:
        msg = f"YAML parse failure: {exc}"
        raise FrontMatterError(msg) from exc
    if not isinstance(loaded, dict):
        msg = f"front matter must be a mapping, got {type(loaded).__name__}"
        raise FrontMatterError(msg)
    fields: dict[str, Any] = dict(loaded)  # pyright: ignore[reportUnknownArgumentType]

    for required in _REQUIRED_FIELDS:
        if required not in fields:
            msg = f"missing required field: {required}"
            raise FrontMatterError(msg)

    track_raw = fields.get("track")
    if track_raw is not None and not isinstance(track_raw, (str, list)):
        msg = f"track must be string or list, got {type(track_raw).__name__}"
        raise FrontMatterError(msg)
    track: str | list[str]
    if isinstance(track_raw, list):
        track = [str(item) for item in track_raw]  # pyright: ignore[reportUnknownVariableType]
    else:
        track = track_raw if track_raw is not None else ""

    extras = {k: v for k, v in fields.items() if k not in _KNOWN_FIELDS}
    fm = FrontMatter(
        layout=str(fields["layout"]),
        title=str(fields["title"]),
        date=_coerce_date(fields["date"]),
        author=str(fields.get("author", "")),
        track=track,
        tags=_coerce_str_list(fields.get("tags")),
        excerpt=fields.get("excerpt"),
        reading_time=fields.get("reading_time"),
        permalink=fields.get("permalink"),
        redirect_from=_coerce_str_list(fields.get("redirect_from")),
        extra=extras,
    )
    return fm, body


# ---------------------------------------------------------------------------
# Archive index parser
# ---------------------------------------------------------------------------


_INDEX_HEADING_RE = re.compile(r"^##\s+Index\s*$", re.MULTILINE)
_TABLE_ROW_RE = re.compile(r"^\|(.+)\|\s*$")


def parse_archive_index(runbook_path: Path) -> dict[str, ArchivePostRef]:
    """Parse ARCHIVE-REBUILD.md's `## Index` table into a {spec_key: ref} map.

    Tolerates extra pipe characters inside cells (escaped `\\|`).
    Logs malformed rows to stderr; raises only on duplicate spec keys.
    """
    if not runbook_path.exists():
        return {}
    text = runbook_path.read_text(encoding="utf-8")
    heading = _INDEX_HEADING_RE.search(text)
    if heading is None:
        print(f"[232] warning: no '## Index' heading in {runbook_path}", file=sys.stderr)
        return {}

    table_text = text[heading.end():]
    rows: list[list[str]] = []
    for line in table_text.splitlines():
        if line.startswith("## "):
            break
        match = _TABLE_ROW_RE.match(line)
        if match is None:
            continue
        cells = _split_cells(match.group(1))
        rows.append(cells)

    if len(rows) < 2:
        return {}
    # rows[0] = headers, rows[1] = separator, rows[2:] = data
    data_rows = [r for r in rows[2:] if not all(set(c) <= {"-", " "} for c in r)]

    out: dict[str, ArchivePostRef] = {}
    for row in data_rows:
        if len(row) < 5:
            print(
                f"[232] warning: skipping malformed index row (need 5 cells): {row!r}",
                file=sys.stderr,
            )
            continue
        spec_key = row[0].strip()
        if not spec_key:
            continue
        if spec_key in out:
            msg = f"duplicate spec_key in archive index: {spec_key}"
            raise ValueError(msg)
        out[spec_key] = ArchivePostRef(
            spec_key=spec_key,
            category=row[1].strip(),
            title=row[2].strip(),
            date=row[3].strip(),
            generated_path=row[4].strip().strip("`"),
        )
    return out


def _split_cells(row_inner: str) -> list[str]:
    """Split a markdown table row body on `|` while respecting `\\|` escapes."""
    cells: list[str] = []
    current: list[str] = []
    i = 0
    while i < len(row_inner):
        ch = row_inner[i]
        if ch == "\\" and i + 1 < len(row_inner) and row_inner[i + 1] == "|":
            current.append("|")
            i += 2
            continue
        if ch == "|":
            cells.append("".join(current).strip())
            current = []
            i += 1
            continue
        current.append(ch)
        i += 1
    cells.append("".join(current).strip())
    return cells


# ---------------------------------------------------------------------------
# Archive post loader
# ---------------------------------------------------------------------------


def _kind_from_path(path: str) -> Literal["unified", "epic-rollup", "composite"]:
    if "unified-post.md" in path:
        return "unified"
    if "epic-rollup.md" in path:
        return "epic-rollup"
    if "composite-post.md" in path:
        return "composite"
    msg = f"unrecognised generated_path kind: {path}"
    raise ValueError(msg)


def slugify_title(title: str) -> str:
    """Title → kebab-case slug, stripping the `Building ` prefix."""
    cleaned = title.strip()
    if cleaned.lower().startswith("building "):
        cleaned = cleaned[len("building ") :]
    cleaned = re.sub(r"[^A-Za-z0-9 \-]", "", cleaned)
    cleaned = re.sub(r"\s+", "-", cleaned.strip()).lower()
    return cleaned.strip("-")


def _extract_image_refs(body: str) -> tuple[ImageRef, ...]:
    refs: list[ImageRef] = []
    for line_idx, line in enumerate(body.splitlines(), start=1):
        for match in IMAGE_RE.finditer(line):
            refs.append(  # noqa: PERF401
                ImageRef(
                    alt=match.group("alt"),
                    site_path=match.group("path"),
                    slug=match.group("slug"),
                    basename=match.group("basename"),
                    line_number=line_idx,
                )
            )
    return tuple(refs)


def load_archive_post(
    spec_key: str,
    generated_path: Path,
    archive_root: Path,
) -> ArchivePost:
    """Read a generated archive post file and build an ArchivePost.

    `spec_key` is the index row's spec_key — for unified posts, the same as the
    folder; for *-member rows it identifies the source spec, while
    `generated_path` may point at a rollup/composite shared with siblings.
    """
    text = generated_path.read_text(encoding="utf-8")
    fm, body = parse_front_matter(text)
    kind = _kind_from_path(str(generated_path))
    target = f"{fm.date.isoformat()}-{slugify_title(fm.title)}.md"
    return ArchivePost(
        spec_key=spec_key,
        kind=kind,
        source_path=generated_path.relative_to(archive_root)
        if generated_path.is_absolute()
        else generated_path,
        front_matter=fm,
        body=body,
        target_filename=target,
        referenced_images=_extract_image_refs(body),
    )


def load_archive_posts(
    archive_index: dict[str, ArchivePostRef],
    archive_root: Path,
) -> dict[str, ArchivePost]:
    """Load every archive post referenced by the index.

    Returns {spec_key: ArchivePost}. For *-member rows pointing at a shared
    rollup/composite, every member spec_key gets its own dict entry referencing
    the same underlying file (so callers can look up by either the unified
    spec_key or any member spec_key).
    """
    cache: dict[Path, ArchivePost] = {}
    out: dict[str, ArchivePost] = {}
    for spec_key, ref in archive_index.items():
        gen_path = archive_root / ref.generated_path
        if not gen_path.exists():
            print(
                f"[232] warning: generated_path missing for {spec_key}: {gen_path}",
                file=sys.stderr,
            )
            continue
        cached = cache.get(gen_path)
        if cached is None:
            cached = load_archive_post(spec_key, gen_path, archive_root)
            cache[gen_path] = cached
        out[spec_key] = cached
    return out


# ---------------------------------------------------------------------------
# Title → spec_key mapping
# ---------------------------------------------------------------------------


def _find_source_shipped_post(media_dir: Path) -> Path | None:
    """Find the source shipped-post for a spec — either canonical name or legacy."""
    canonical = media_dir / "shipped-post.md"
    if canonical.exists():
        return canonical
    for legacy in sorted(media_dir.glob("*-shipped-*.md")):
        return legacy
    return None


def build_title_to_spec_key(
    archive_root: Path,
    archive_index: dict[str, ArchivePostRef] | list[str],
) -> dict[str, str]:
    """Build {title: spec_key} for site-post matching.

    Primary keys come from source `shipped-post.md` titles (the originals that
    `/publish` shipped). Falls back to archive-index titles where no source
    shipped-post exists, so synthetic fixtures still match.
    """
    if isinstance(archive_index, list):
        spec_keys = archive_index
        index_titles: dict[str, str] = {}
    else:
        spec_keys = list(archive_index.keys())
        index_titles = {
            ref.spec_key: ref.title for ref in archive_index.values() if ref.title
        }

    out: dict[str, str] = {}
    for spec_key in spec_keys:
        media_dir = archive_root / "specs" / spec_key / "media"
        title: str | None = None
        if media_dir.is_dir():
            source = _find_source_shipped_post(media_dir)
            if source is not None:
                try:
                    fm, _body = parse_front_matter(source.read_text(encoding="utf-8"))
                except FrontMatterError:
                    fm = None
                if fm is not None:
                    title = fm.title
        if title is None:
            title = index_titles.get(spec_key)
        if title is None:
            continue
        if title in out and out[title] != spec_key:
            print(
                f"[232] warning: duplicate title {title!r} maps to "
                f"{out[title]} and {spec_key}; keeping first",
                file=sys.stderr,
            )
            continue
        out[title] = spec_key
    return out


def infer_spec_key(
    site_post: SitePost,
    title_to_spec_key: dict[str, str],
) -> str | None:
    """Match a site post to a spec via front-matter title; fall back to slug."""
    direct = title_to_spec_key.get(site_post.front_matter.title)
    if direct is not None:
        return direct
    # Fallback: filename slug stripped of date + shipped-/planning- prefix
    stem = site_post.filename.removesuffix(".md")
    parts = stem.split("-", 3)  # YYYY-MM-DD-rest
    if len(parts) < 4:
        return None
    rest = parts[3]
    for prefix in ("shipped-", "planning-"):
        if rest.startswith(prefix):
            rest = rest[len(prefix) :]
            break
    # Slug match against archive title slugs
    for title, sk in title_to_spec_key.items():
        if slugify_title(title) == rest:
            return sk
    return None


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------


def classify_site_post(
    site_post: SitePost,
    archive_index: dict[str, ArchivePostRef],
    archive_posts: dict[str, ArchivePost],
) -> Classification:
    """Bucket a site post into replace / merge / legacy."""
    spec_key = site_post.inferred_spec_key
    if spec_key is None or spec_key not in archive_index:
        return Classification(
            site_post=site_post,
            bucket="legacy",
            replacement=None,
            merged_into=None,
            reason="no matching spec in archive (legacy/preserve)",
        )
    ref = archive_index[spec_key]
    archive_post = archive_posts.get(spec_key)
    if archive_post is None:
        return Classification(
            site_post=site_post,
            bucket="legacy",
            replacement=None,
            merged_into=None,
            reason=f"spec_key {spec_key} indexed but archive post not loaded",
        )
    category = ref.category.lower()
    if category == "unified":
        return Classification(
            site_post=site_post,
            bucket="replace",
            replacement=archive_post,
            merged_into=None,
            reason=f"unified replacement at {ref.generated_path}",
        )
    if category in {"epic-member", "composite-member"}:
        return Classification(
            site_post=site_post,
            bucket="merge",
            replacement=None,
            merged_into=archive_post,
            reason=f"merged into {category.split('-')[0]} at {ref.generated_path}",
        )
    return Classification(
        site_post=site_post,
        bucket="legacy",
        replacement=None,
        merged_into=None,
        reason=f"unrecognised category: {ref.category}",
    )


# ---------------------------------------------------------------------------
# Site-post loader
# ---------------------------------------------------------------------------


def load_site_post(path: Path, title_to_spec_key: dict[str, str]) -> SitePost:
    """Load a single site _posts/*.md, partial inference of spec_key."""
    text = path.read_text(encoding="utf-8")
    fm, body = parse_front_matter(text)
    site_post = SitePost(
        filename=path.name,
        path=path,
        front_matter=fm,
        body=body,
        inferred_spec_key=None,
    )
    inferred = infer_spec_key(site_post, title_to_spec_key)
    if inferred is None:
        return site_post
    return SitePost(
        filename=path.name,
        path=path,
        front_matter=fm,
        body=body,
        inferred_spec_key=inferred,
    )


def load_site_posts(
    site_root: Path,
    title_to_spec_key: dict[str, str],
) -> list[SitePost]:
    """Load every `_posts/*.md` (only `layout: future-post` retained)."""
    out: list[SitePost] = []
    posts_dir = site_root / "_posts"
    for path in sorted(posts_dir.glob("*.md")):
        try:
            post = load_site_post(path, title_to_spec_key)
        except FrontMatterError as exc:
            print(f"[232] warning: skipping {path.name}: {exc}", file=sys.stderr)
            continue
        if post.front_matter.layout != "future-post":
            continue
        out.append(post)
    return out


# ---------------------------------------------------------------------------
# Pre-flight scans (FR-008/009/010)
# ---------------------------------------------------------------------------


def detect_source_relative_leaks(
    archive_posts: list[ArchivePost],
) -> list[tuple[ArchivePost, ImageRef]]:
    """Surface any residual `./`/`../`/`evidence/` image paths in archive bodies."""
    leaks: list[tuple[ArchivePost, ImageRef]] = []
    for ap in archive_posts:
        for line_idx, line in enumerate(ap.body.splitlines(), start=1):
            if SOURCE_RELATIVE_RE.search(line):
                leaks.append(  # noqa: PERF401
                    (
                        ap,
                        ImageRef(
                            alt="(leak)",
                            site_path=line.strip(),
                            slug="",
                            basename="",
                            line_number=line_idx,
                        ),
                    )
                )
    return leaks


def detect_filename_collisions(
    archive_posts: list[ArchivePost],
) -> list[tuple[ArchivePost, ArchivePost]]:
    """Return any pair of archive posts producing the same target filename."""
    by_filename: dict[str, list[ArchivePost]] = {}
    for ap in archive_posts:
        by_filename.setdefault(ap.target_filename, []).append(ap)
    collisions: list[tuple[ArchivePost, ArchivePost]] = []
    for posts in by_filename.values():
        if len(posts) < 2:
            continue
        for i in range(len(posts)):
            for j in range(i + 1, len(posts)):
                collisions.append((posts[i], posts[j]))  # noqa: PERF401
    return collisions


def resolve_asset(image_ref: ImageRef, archive_root: Path) -> AssetCopy:
    """Locate the source file for an archive image reference."""
    primary = (
        archive_root
        / "specs"
        / image_ref.slug
        / "evidence"
        / "screenshots"
        / image_ref.basename
    )
    fallback = (
        archive_root / "specs" / image_ref.slug / "evidence" / image_ref.basename
    )
    found_path: Path | None = None
    if primary.is_file():
        found_path = primary.resolve()
    elif fallback.is_file():
        found_path = fallback.resolve()
    dest_rel = Path("assets/images/future-debrief") / image_ref.slug / image_ref.basename
    return AssetCopy(
        image_ref=image_ref,
        source_path=found_path if found_path is not None else primary,
        destination_path=dest_rel,
        found=found_path is not None,
    )


# ---------------------------------------------------------------------------
# Divergence + front-matter merge (Phase 6 / US4)
# ---------------------------------------------------------------------------


_FM_FIELDS_FOR_DIFF: tuple[str, ...] = (
    "title",
    "date",
    "author",
    "track",
    "tags",
    "excerpt",
    "reading_time",
    "permalink",
    "redirect_from",
)


def _fm_to_dict(fm: FrontMatter) -> dict[str, Any]:
    out: dict[str, Any] = {
        "layout": fm.layout,
        "title": fm.title,
        "date": fm.date,
        "author": fm.author,
        "track": fm.track,
        "tags": fm.tags,
    }
    if fm.excerpt is not None:
        out["excerpt"] = fm.excerpt
    if fm.reading_time is not None:
        out["reading_time"] = fm.reading_time
    if fm.permalink is not None:
        out["permalink"] = fm.permalink
    if fm.redirect_from:
        out["redirect_from"] = fm.redirect_from
    out.update(fm.extra)
    return out


def _normalise_body(body: str) -> list[str]:
    return [line.rstrip() for line in body.splitlines()]


def diff_post(site_post: SitePost, archive_post: ArchivePost) -> Divergence:
    """Compute front-matter and body divergence between site and archive."""
    site_fm = _fm_to_dict(site_post.front_matter)
    archive_fm = _fm_to_dict(archive_post.front_matter)

    site_keys = set(site_fm.keys())
    archive_keys = set(archive_fm.keys())
    site_only_fields = {k: site_fm[k] for k in site_keys - archive_keys}
    archive_only_fields = {k: archive_fm[k] for k in archive_keys - site_keys}
    value_mismatches: dict[str, tuple[Any, Any]] = {}
    for k in site_keys & archive_keys:
        if site_fm[k] != archive_fm[k]:
            value_mismatches[k] = (site_fm[k], archive_fm[k])

    site_body = _normalise_body(site_post.body)
    archive_body = _normalise_body(archive_post.body)
    diff_iter = difflib.unified_diff(
        site_body, archive_body, fromfile="site", tofile="archive", lineterm=""
    )
    diff_lines = [line for line in diff_iter if line.startswith(("+", "-"))]
    body_diff_lines = sum(1 for line in diff_lines if not line.startswith(("+++", "---")))
    summary_iter = difflib.unified_diff(
        site_body, archive_body, fromfile="site", tofile="archive", lineterm=""
    )
    body_diff_summary = "\n".join(list(summary_iter)[:10])

    return Divergence(
        site_post=site_post,
        archive_post=archive_post,
        site_only_fields=site_only_fields,
        archive_only_fields=archive_only_fields,
        value_mismatches=value_mismatches,
        body_diff_lines=body_diff_lines,
        body_diff_summary=body_diff_summary,
    )


def merge_front_matter(site_fm: FrontMatter, archive_fm: FrontMatter) -> FrontMatter:
    """Archive wins on source-derived fields; site preserves reading_time +
    permalink + redirect_from union."""
    merged_redirects = list(
        dict.fromkeys([*archive_fm.redirect_from, *site_fm.redirect_from])
    )
    merged_extra: dict[str, Any] = {**archive_fm.extra, **site_fm.extra}
    return FrontMatter(
        layout=archive_fm.layout,
        title=archive_fm.title,
        date=archive_fm.date,
        author=archive_fm.author or site_fm.author,
        track=archive_fm.track,
        tags=archive_fm.tags or site_fm.tags,
        excerpt=archive_fm.excerpt if archive_fm.excerpt is not None else site_fm.excerpt,
        reading_time=site_fm.reading_time
        if site_fm.reading_time is not None
        else archive_fm.reading_time,
        permalink=site_fm.permalink
        if site_fm.permalink is not None
        else archive_fm.permalink,
        redirect_from=merged_redirects,
        extra=merged_extra,
    )


# ---------------------------------------------------------------------------
# Plan + execute
# ---------------------------------------------------------------------------


def build_migration_plan(
    archive_root: Path,
    site_root: Path,
) -> MigrationPlan:
    """Top-level orchestrator: read both clones, build a plan, return it."""
    archive_index = parse_archive_index(archive_root / "ARCHIVE-REBUILD.md")
    archive_posts = load_archive_posts(archive_index, archive_root)
    title_to_spec_key = build_title_to_spec_key(archive_root, archive_index)
    site_posts = load_site_posts(site_root, title_to_spec_key)

    classifications: list[Classification] = []
    for sp in site_posts:
        classifications.append(  # noqa: PERF401
            classify_site_post(sp, archive_index, archive_posts)
        )

    unique_archive_posts: list[ArchivePost] = []
    seen: set[Path] = set()
    for ap in archive_posts.values():
        if ap.source_path in seen:
            continue
        seen.add(ap.source_path)
        unique_archive_posts.append(ap)

    asset_copies: list[AssetCopy] = []
    seen_dest: set[Path] = set()
    for ap in unique_archive_posts:
        for ref in ap.referenced_images:
            ac = resolve_asset(ref, archive_root)
            if ac.destination_path in seen_dest:
                continue
            seen_dest.add(ac.destination_path)
            asset_copies.append(ac)

    leaks = detect_source_relative_leaks(unique_archive_posts)
    collisions = detect_filename_collisions(unique_archive_posts)

    divergences: list[Divergence] = []
    for cls in classifications:
        if cls.bucket == "replace" and cls.replacement is not None:
            divergences.append(diff_post(cls.site_post, cls.replacement))

    config_text = (site_root / "_config.yml").read_text(encoding="utf-8")
    config_edit_needed = "jekyll-redirect-from" not in config_text

    return MigrationPlan(
        classifications=classifications,
        divergences=divergences,
        asset_copies=asset_copies,
        filename_collisions=collisions,
        source_relative_leaks=leaks,
        config_edit_needed=config_edit_needed,
    )


def _serialise_front_matter(fm: FrontMatter) -> str:
    """Emit YAML front matter for an archive-shaped output post."""
    data: dict[str, Any] = {
        "layout": fm.layout,
        "title": fm.title,
        "date": fm.date.isoformat(),
        "author": fm.author,
        "track": fm.track,
        "tags": fm.tags,
    }
    if fm.excerpt is not None:
        data["excerpt"] = fm.excerpt
    if fm.reading_time is not None:
        data["reading_time"] = fm.reading_time
    if fm.permalink is not None:
        data["permalink"] = fm.permalink
    if fm.redirect_from:
        data["redirect_from"] = fm.redirect_from
    for k, v in fm.extra.items():
        if k not in data:
            data[k] = v
    body = yaml.safe_dump(data, sort_keys=False, allow_unicode=True, default_flow_style=False)
    return f"---\n{body}---\n"


def execute_migration_plan(
    plan: MigrationPlan,
    site_root: Path,
    archive_root: Path,
) -> MigrationResult:
    """Apply the plan to the site clone. Refuses if `plan.is_blocked`."""
    if plan.is_blocked:
        msg = (
            "migration plan is blocked — pre-flight scans surfaced issues. "
            "Inspect plan.filename_collisions / source_relative_leaks / "
            "missing assets before re-running."
        )
        raise RuntimeError(msg)

    posts_dir = site_root / "_posts"
    deleted: list[Path] = []
    written: list[Path] = []
    copied: list[Path] = []

    for cls in plan.classifications:
        if cls.bucket in {"replace", "merge"}:
            target = cls.site_post.path
            if target.exists():
                target.unlink()
                deleted.append(target)

    for cls in plan.classifications:
        if cls.bucket == "replace" and cls.replacement is not None:
            ap = cls.replacement
            merged_fm = merge_front_matter(cls.site_post.front_matter, ap.front_matter)
            out_path = posts_dir / ap.target_filename
            content = _serialise_front_matter(merged_fm) + ap.body
            out_path.write_text(content, encoding="utf-8")
            written.append(out_path)

    for ac in plan.asset_copies:
        if not ac.found:
            continue
        dest = site_root / ac.destination_path
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists() or dest.read_bytes() != ac.source_path.read_bytes():
            shutil_copy_bytes(ac.source_path, dest)
        copied.append(dest)

    config_edited = False
    if plan.config_edit_needed:
        config_path = site_root / "_config.yml"
        text = config_path.read_text(encoding="utf-8")
        if "jekyll-redirect-from" not in text:
            text = _enable_redirect_plugin(text)
            config_path.write_text(text, encoding="utf-8")
            config_edited = True

    _ = archive_root  # reserved for future asset-source verification

    return MigrationResult(
        site_posts_deleted=deleted,
        site_posts_written=written,
        assets_copied=copied,
        config_edited=config_edited,
    )


def shutil_copy_bytes(src: Path, dest: Path) -> None:
    """Idempotent byte-for-byte copy resolving symlinks at the source."""
    real_src = src.resolve()
    dest.write_bytes(real_src.read_bytes())


def _enable_redirect_plugin(config_text: str) -> str:
    """Insert `- jekyll-redirect-from` under the existing `plugins:` list."""
    lines = config_text.splitlines(keepends=True)
    out: list[str] = []
    inserted = False
    inside_plugins = False
    for line in lines:
        out.append(line)
        if line.rstrip() == "plugins:":
            inside_plugins = True
            continue
        if inside_plugins and not inserted:
            stripped = line.lstrip()
            if stripped.startswith("-"):
                continue
            # First non-`-` line after `plugins:` → insert before
            out.insert(-1, "  - jekyll-redirect-from\n")
            inserted = True
            inside_plugins = False
    if not inserted and inside_plugins:
        out.append("  - jekyll-redirect-from\n")
    return "".join(out)


# ---------------------------------------------------------------------------
# PR body generator (FR-005, FR-011, NFR-004)
# ---------------------------------------------------------------------------


def generate_pr_body(plan: MigrationPlan, result: MigrationResult | None = None) -> str:
    """Render the migration PR's markdown body from plan + (optional) result."""
    parts: list[str] = []

    # 1. Summary
    by_bucket: dict[str, int] = {"replace": 0, "merge": 0, "legacy": 0}
    for cls in plan.classifications:
        by_bucket[cls.bucket] = by_bucket.get(cls.bucket, 0) + 1
    parts.append("## Summary\n")
    parts.append(
        f"- {len(plan.classifications)} site posts classified — "
        f"{by_bucket['replace']} replace, {by_bucket['merge']} merge, "
        f"{by_bucket['legacy']} preserve (legacy).\n"
    )
    parts.append(f"- {len(plan.asset_copies)} image assets copied from `debrief-future` evidence.\n")
    parts.append(
        f"- Pre-flight scans: "
        f"{len(plan.source_relative_leaks)} leaks, "
        f"{sum(1 for ac in plan.asset_copies if not ac.found)} missing assets, "
        f"{len(plan.filename_collisions)} filename collisions.\n\n"
    )

    # 2. Bucket classification (FR-011)
    parts.append("## Bucket classification\n\n")
    parts.append("| Site post | Bucket | Reason |\n|---|---|---|\n")
    for cls in sorted(plan.classifications, key=lambda c: c.site_post.filename):
        parts.append(
            f"| `{cls.site_post.filename}` | {cls.bucket} | {cls.reason} |\n"
        )
    parts.append("\n")

    # 3. Pre-flight scans (NFR-004)
    parts.append("## Pre-flight scans\n\n")
    parts.append(
        f"- **FR-008 source-relative leaks**: "
        f"{len(plan.source_relative_leaks)}"
        f"{' (BLOCKER)' if plan.source_relative_leaks else ' ✓'}\n"
    )
    missing_assets = [ac for ac in plan.asset_copies if not ac.found]
    parts.append(
        f"- **FR-009 missing assets**: {len(missing_assets)} of "
        f"{len(plan.asset_copies)}"
        f"{' (BLOCKER)' if missing_assets else ' ✓'}\n"
    )
    if missing_assets:
        parts.append("\n  Missing:\n")
        for ac in missing_assets:
            parts.append(
                f"  - `{ac.image_ref.slug}/{ac.image_ref.basename}` "
                f"(referenced from archive)\n"
            )
    parts.append(
        f"- **FR-010 filename collisions**: "
        f"{len(plan.filename_collisions)}"
        f"{' (BLOCKER)' if plan.filename_collisions else ' ✓'}\n\n"
    )

    # 4. Editorial divergences (FR-005)
    parts.append("## Editorial divergences\n\n")
    dirty = [d for d in plan.divergences if not d.is_clean]
    if not dirty:
        parts.append("All replace-bucket diffs are clean.\n\n")
    else:
        parts.append(f"{len(dirty)} divergence(s) need reviewer attention:\n\n")
        for div in dirty:
            parts.append(
                f"<details><summary><code>{div.site_post.filename}</code></summary>\n\n"
            )
            if div.site_only_fields:
                parts.append(f"- Site-only fields: `{div.site_only_fields}`\n")
            if div.archive_only_fields:
                parts.append(f"- Archive-only fields: `{div.archive_only_fields}`\n")
            if div.value_mismatches:
                parts.append(f"- Value mismatches: `{div.value_mismatches}`\n")
            if div.body_diff_lines > 0:
                parts.append(f"- Body diverged ({div.body_diff_lines} lines):\n")
                parts.append(f"\n```diff\n{div.body_diff_summary}\n```\n")
            parts.append("\n</details>\n\n")

    # 5. Asset coverage
    parts.append("## Asset coverage\n\n")
    parts.append(
        f"- Total references: {len(plan.asset_copies)}\n"
        f"- Resolved: {sum(1 for ac in plan.asset_copies if ac.found)}\n"
        f"- Missing: {len(missing_assets)}\n\n"
    )

    # 6. Test plan
    parts.append("## Test plan\n\n")
    parts.append(
        "- [ ] Jekyll build succeeds (`bundle exec jekyll build --safe --trace`)\n"
        "- [ ] Sample 5 random `/assets/images/future-debrief/.../...` URLs return 200\n"
        "- [ ] Each `## Orphan Screenshots` row's Generated Post link resolves\n"
        "- [ ] No external URL regressions (`redirect_from:` entries verified)\n"
    )

    if result is not None:
        parts.append(
            f"\n## Execution\n\n"
            f"- Posts deleted: {len(result.site_posts_deleted)}\n"
            f"- Posts written: {len(result.site_posts_written)}\n"
            f"- Assets copied: {len(result.assets_copied)}\n"
            f"- `_config.yml` edited: {result.config_edited}\n"
        )
    return "".join(parts)


# ---------------------------------------------------------------------------
# CLI entry
# ---------------------------------------------------------------------------


def _build_argparser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="232-apply-archive-rebuild",
        description=(
            "Apply the regenerated blog archive from debrief-future main to a "
            "debrief.github.io clone. Reads the archive, classifies every site "
            "_posts/*.md into replace/merge/legacy, runs three pre-flight scans, "
            "and (on --execute) writes the migration into the site clone."
        ),
    )
    parser.add_argument(
        "--site-clone",
        type=Path,
        required=True,
        help="Path to a fresh clone of debrief.github.io:master (sibling dir).",
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute the plan, print a summary, emit MIGRATION-REPORT.md. No writes.",
    )
    mode.add_argument(
        "--execute",
        action="store_true",
        help="Execute the migration. Refuses if the plan is blocked.",
    )
    parser.add_argument(
        "--archive-root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="Path to the debrief-future root (default: this repo).",
    )
    return parser


def _summarise_plan(plan: MigrationPlan) -> str:
    by_bucket: dict[str, int] = {"replace": 0, "merge": 0, "legacy": 0}
    for cls in plan.classifications:
        by_bucket[cls.bucket] = by_bucket.get(cls.bucket, 0) + 1
    asset_total = len(plan.asset_copies)
    asset_missing = sum(1 for ac in plan.asset_copies if not ac.found)
    return (
        f"Migration plan:\n"
        f"  {len(plan.classifications)} site posts classified:\n"
        f"    {by_bucket['replace']:>3} replace\n"
        f"    {by_bucket['merge']:>3} merge\n"
        f"    {by_bucket['legacy']:>3} legacy\n"
        f"\n"
        f"  Pre-flight scans:\n"
        f"    FR-008 source-relative-leak:  {len(plan.source_relative_leaks):>3}\n"
        f"    FR-009 missing-asset:         {asset_missing:>3} of {asset_total}\n"
        f"    FR-010 filename-collision:    {len(plan.filename_collisions):>3}\n"
        f"\n"
        f"  Plan blocked: {plan.is_blocked}\n"
        f"  Config edit needed (jekyll-redirect-from): {plan.config_edit_needed}\n"
    )


def main(argv: list[str] | None = None) -> int:
    parser = _build_argparser()
    args = parser.parse_args(argv)
    plan = build_migration_plan(args.archive_root, args.site_clone)
    print(_summarise_plan(plan))

    report_path = args.site_clone / "MIGRATION-REPORT.md"
    if args.dry_run:
        report_path.write_text(generate_pr_body(plan), encoding="utf-8")
        print(f"[232] dry-run report → {report_path}", file=sys.stderr)
        return 0
    if plan.is_blocked:
        print("[232] refusing to execute — plan is blocked.", file=sys.stderr)
        report_path.write_text(generate_pr_body(plan), encoding="utf-8")
        return 2
    result = execute_migration_plan(plan, args.site_clone, args.archive_root)
    report_path.write_text(generate_pr_body(plan, result), encoding="utf-8")
    print(
        f"\nExecution complete:\n"
        f"  posts deleted: {len(result.site_posts_deleted)}\n"
        f"  posts written: {len(result.site_posts_written)}\n"
        f"  assets copied: {len(result.assets_copied)}\n"
        f"  _config.yml edited: {result.config_edited}\n"
        f"  PR body → {report_path}\n"
    )
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
