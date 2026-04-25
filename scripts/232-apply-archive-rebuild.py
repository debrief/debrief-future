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
import datetime as _dt  # noqa: TC003  # used at runtime in Phase 2+ parsing
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

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
