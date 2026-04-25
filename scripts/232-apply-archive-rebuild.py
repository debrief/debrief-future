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


def main(argv: list[str] | None = None) -> int:
    parser = _build_argparser()
    args = parser.parse_args(argv)
    # Phase 7 wires build_migration_plan + execute_migration_plan in here.
    print(
        f"[232] archive-root={args.archive_root} site-clone={args.site_clone} "
        f"dry-run={args.dry_run} execute={args.execute}",
        file=sys.stderr,
    )
    print("[232] helper skeleton — Phase 2+ will implement plan + execute.", file=sys.stderr)
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
