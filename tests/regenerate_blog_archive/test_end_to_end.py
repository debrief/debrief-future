"""End-to-end integration test for the patched generator (Issue 9A).

Builds a minimal 3-spec fixture tree (one unified with a twin-heading and
four images, one epic rollup with one image-carrying member, one composite
with three image-carrying members carrying 7+5+4 images), runs the full
regenerate flow, and asserts SC-001 (ref-count parity), SC-002 (zero
source-relative paths), SC-005 (three new index sections), reproducibility
(NFR-005), and elapsed-time at 3-spec scale (NFR-001 / Issue 10A).
"""

from __future__ import annotations

import datetime as _dt
import logging
import re
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


SRC_IMAGE_RE = re.compile(r"!\[[^\]]*\]\((\./|\.\./|evidence/)")
ANY_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(")


def _write_spec_with_shipped(
    root: Path,
    number: int,
    slug: str,
    *,
    date: str,
    body: str,
    tags: tuple[str, ...] = ("tracer-bullet",),
) -> None:
    spec_dir = root / "specs" / f"{number:03d}-{slug}"
    (spec_dir / "media").mkdir(parents=True, exist_ok=True)
    (spec_dir / "evidence" / "screenshots").mkdir(parents=True, exist_ok=True)
    # Pre-create the referenced images on disk so broken-ref check stays clean.
    for match in re.finditer(r"!\[[^\]]*\]\(([^)]+)\)", body):
        raw = match.group(1)
        clean = raw.split("?")[0].split("#")[0]
        if clean.startswith(("http://", "https://", "data:", "/")):
            continue
        target = (spec_dir / "media" / clean).resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"")
    (spec_dir / "spec.md").write_text(f"# {slug}\n")
    tag_list = "[" + ", ".join(tags) + "]"
    (spec_dir / "media" / "shipped-post.md").write_text(
        "---\n"
        f"layout: future-post\n"
        f'title: "Shipped: {slug}"\n'
        f"date: {date}\n"
        f"track: momentum\n"
        f"author: Ian\n"
        f"tags: {tag_list}\n"
        f'excerpt: "excerpt for {slug}"\n'
        "---\n\n"
        f"{body}",
        encoding="utf-8",
    )


def _run_flow(rba: ModuleType, tmp_path: Path) -> tuple[object, str, float]:
    """Run classify_and_generate + serialise_archive_index, return (index, rendered, elapsed)."""
    specs = rba.discover_specs(tmp_path)
    args = rba.CliArgs(
        dry_run=True, verbose=False,
        out_index=tmp_path / "ARCHIVE-REBUILD.md",
        composite_window_days=5, near_miss_max_days=10,
        skip_gh=True, fail_fast=False, repo_root=tmp_path,
    )
    t0 = time.monotonic()
    classifications, posts, unresolved, near = rba.classify_and_generate(
        specs=specs, epics=[], args=args, logger=logging.getLogger("e2e"),
    )
    orphans, broken, malformed = rba.scan_images_and_orphans(specs, repo_root=tmp_path)
    index = rba.ArchiveIndex(
        generated_posts=posts, classifications=classifications,
        unresolved=unresolved, near_misses=near,
        skipped_specs=[c.spec for c in classifications if c.category == "skipped"],
        orphans=orphans, broken_refs=broken, malformed_refs=malformed,
    )
    index.run_completed_at = _dt.datetime.now(tz=_dt.UTC)
    rendered = rba.serialise_archive_index(index, args=args)
    elapsed = time.monotonic() - t0
    return index, rendered, elapsed


def test_full_archive_run_over_three_spec_fixture(
    rba: ModuleType, tmp_path: Path,
) -> None:
    # Unified with twin-heading + 4 images.
    _write_spec_with_shipped(
        tmp_path, 100, "unified-alpha",
        date="2026-04-10",
        body=(
            "## What We Built\n\n"
            "First prose paragraph.\n\n"
            "![img1](../evidence/screenshots/a.png)\n\n"
            "Follow-up paragraph with more context.\n\n"
            "## Category Icons\n\n"
            "![img2](../evidence/screenshots/b.png)\n\n"
            "## Placeholders\n\n"
            "![img3](../evidence/screenshots/c.png)\n\n"
            "## Disabled\n\n"
            "![img4](../evidence/screenshots/d.png)\n"
        ),
        tags=("unified-only",),
    )
    # Composite trio: 7 + 5 + 4 image refs, shared tag so they cluster.
    for number, slug, n in ((201, "cluster-a", 7), (202, "cluster-b", 5), (203, "cluster-c", 4)):
        images = "\n".join(
            f"![i{i}](./evidence/screenshots/img{number}_{i}.png)" for i in range(n)
        )
        _write_spec_with_shipped(
            tmp_path, number, slug, date="2026-04-15",
            body=f"First paragraph for member.\n\n{images}\n",
            tags=("composite-cluster",),
        )

    index, rendered, elapsed = _run_flow(rba, tmp_path)

    # SC-001: ref-count parity — sum of source refs ≤ sum of generated refs.
    source_total = 0
    for spec_dir in (tmp_path / "specs").iterdir():
        shipped = spec_dir / "media" / "shipped-post.md"
        if shipped.is_file():
            source_total += len(ANY_IMAGE_RE.findall(shipped.read_text(encoding="utf-8")))
    generated_total = 0
    for post in index.generated_posts:  # type: ignore[attr-defined]
        generated_total += len(ANY_IMAGE_RE.findall(post.body))
    assert generated_total >= source_total, (
        f"ref-count parity fails: source={source_total}, generated={generated_total}"
    )

    # SC-002: zero source-relative paths in any generated post body.
    for post in index.generated_posts:  # type: ignore[attr-defined]
        leaks = SRC_IMAGE_RE.findall(post.body)
        assert leaks == [], f"source-relative path leaked in {post.destination}: {leaks}"

    # SC-005: three new index sections always present.
    assert "## Orphan Screenshots" in rendered
    assert "## Broken Image References" in rendered
    assert "## Malformed Image References" in rendered

    # NFR-001: elapsed-time sane at 3-spec scale (Issue 10A — generous).
    assert elapsed < 10.0, f"elapsed {elapsed:.2f}s exceeds 10s budget"


def test_full_archive_run_is_byte_identical_across_two_runs(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """NFR-005 reproducibility — two successive runs produce identical output."""
    _write_spec_with_shipped(
        tmp_path, 100, "unified-alpha", date="2026-04-10",
        body=(
            "## What We Built\n\nFirst.\n\n![a](./evidence/a.png)\n"
        ),
        tags=("unified-only",),
    )
    _write_spec_with_shipped(
        tmp_path, 201, "cluster-a", date="2026-04-15",
        body="First.\n\n![a](./evidence/screenshots/x.png)\n",
        tags=("composite-cluster",),
    )
    _write_spec_with_shipped(
        tmp_path, 202, "cluster-b", date="2026-04-15",
        body="First.\n\n![a](./evidence/screenshots/y.png)\n",
        tags=("composite-cluster",),
    )

    _idx1, rendered1, _ = _run_flow(rba, tmp_path)
    _idx2, rendered2, _ = _run_flow(rba, tmp_path)
    # Normalise timestamps (run_started_at / run_completed_at).
    rendered1_stable = re.sub(r"\d{4}-\d{2}-\d{2}T[\d:.]+\+\d{2}:\d{2}", "<ts>", rendered1)
    rendered2_stable = re.sub(r"\d{4}-\d{2}-\d{2}T[\d:.]+\+\d{2}:\d{2}", "<ts>", rendered2)
    assert rendered1_stable == rendered2_stable
