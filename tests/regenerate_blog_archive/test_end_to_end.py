"""Spec 231 Phase 6: end-to-end integration test (Issue 9A).

Builds a minimal 3-spec fixture tree and runs the full regenerate flow
(classify → stitch → orphan scan → serialise). Asserts the concrete
success criteria (SC-001 / SC-002 / SC-005) + reproducibility
(NFR-005) + elapsed-time budget (NFR-001 at 3-spec scale).
"""

from __future__ import annotations

import logging
import re
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


_UNIFIED_BODY = """---
layout: future-post
title: "Shipped: Unified With Twin"
date: 2026-04-10
author: Ian
tags: [unique-tag-unified]
---

## What We're Building

The opener paragraph for the unified spec.

## How It Fits

Short how-it-fits.

## Key Decisions

- Decision one.

## What We Built

A tense-inverted twin heading opening paragraph.

![twin-a](../evidence/screenshots/twin-a.png)

Some follow-up prose inside the twin heading section.

## Screenshots

![twin-b](../evidence/screenshots/twin-b.png)
![twin-c](../evidence/screenshots/twin-c.png)

## Lessons Learned

learned.

## What's Next

next.
"""


def _build_rollup_member(name: str, number: int, date: str) -> str:
    screenshots = "\n".join(
        f"![{name}-{i}](./evidence/screenshots/{name}-{i}.png)"
        for i in range(3)
    )
    return f"""---
layout: future-post
title: "Shipped: {name}"
date: {date}
author: Ian
tags: [rollup-tag-{name}]
---

## Context

Member {name} lead paragraph.

## Screenshots

{screenshots}
"""


def _build_composite_member(name: str, number: int, date: str, count: int) -> str:
    screenshots = "\n".join(
        f"![{name}-{i}](./evidence/screenshots/{name}-{i}.png)"
        for i in range(count)
    )
    return f"""---
layout: future-post
title: "Shipped: {name}"
date: {date}
author: Ian
tags: [shared-composite-tag]
---

## Context

Composite member {name} lead paragraph.

## Screenshots

{screenshots}
"""


def _make_fixture(tmp_path: Path) -> None:
    # 1) Unified spec with twin-heading splice + 3 images
    unified = tmp_path / "specs" / "100-unified-twin"
    (unified / "evidence" / "screenshots").mkdir(parents=True)
    (unified / "media").mkdir()
    (unified / "spec.md").write_text("# spec\n")
    (unified / "media" / "shipped-post.md").write_text(_UNIFIED_BODY)
    for i in ("a", "b", "c"):
        (unified / "evidence" / "screenshots" / f"twin-{i}.png").write_bytes(
            b"\x89PNG\r\n"
        )

    # 2) Two rollup members — one with 3 images, one with 0
    for n, name, body in [
        (200, "carrying", _build_rollup_member("carrying", 200, "2026-03-01")),
        (201, "empty",
         """---
layout: future-post
title: "Shipped: empty"
date: 2026-03-02
author: Ian
tags: [rollup-tag-empty]
---

## Context

Nothing to see here.
"""),
    ]:
        spec_dir = tmp_path / "specs" / f"{n:03d}-{name}"
        (spec_dir / "evidence" / "screenshots").mkdir(parents=True)
        (spec_dir / "media").mkdir()
        (spec_dir / "spec.md").write_text("# spec\n")
        (spec_dir / "media" / "shipped-post.md").write_text(body)
        if name == "carrying":
            for i in range(3):
                (spec_dir / "evidence" / "screenshots" /
                 f"{name}-{i}.png").write_bytes(b"\x89PNG\r\n")

    # 3) Three composite members (share tag, ship within 5 days) — 7+5+4 images
    for n, name, date, count in [
        (300, "comp-a", "2026-04-01", 7),
        (301, "comp-b", "2026-04-02", 5),
        (302, "comp-c", "2026-04-03", 4),
    ]:
        spec_dir = tmp_path / "specs" / f"{n:03d}-{name}"
        (spec_dir / "evidence" / "screenshots").mkdir(parents=True)
        (spec_dir / "media").mkdir()
        (spec_dir / "spec.md").write_text("# spec\n")
        (spec_dir / "media" / "shipped-post.md").write_text(
            _build_composite_member(name, n, date, count)
        )
        for i in range(count):
            (spec_dir / "evidence" / "screenshots" /
             f"{name}-{i}.png").write_bytes(b"\x89PNG\r\n")

    # Write a minimal BACKLOG.md with one complete epic referring to the rollup members.
    (tmp_path / "BACKLOG.md").write_text(
        "## Epics\n\n"
        "| Epic ID | Title | Description | Items | Status |\n"
        "|---------|-------|-------------|-------|--------|\n"
        "| E99 | Rollup Test Epic | desc | 200, 201 | complete |\n"
    )


def _cli(rba: ModuleType, tmp_path: Path) -> object:
    return rba.CliArgs(
        dry_run=True, verbose=False,
        out_index=tmp_path / "ARCHIVE-REBUILD.md",
        composite_window_days=5, near_miss_max_days=10,
        skip_gh=True, fail_fast=False, repo_root=tmp_path,
    )


def test_full_archive_run_over_three_spec_fixture(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """Full-run integration gate — SC-001 / SC-002 / SC-005 / NFR-005 / NFR-001."""
    _make_fixture(tmp_path)
    args = _cli(rba, tmp_path)
    logger = logging.getLogger("test-e2e")
    specs = rba.discover_specs(tmp_path)
    epics = rba.parse_backlog_epics(tmp_path / "BACKLOG.md")

    start = time.monotonic()
    classifications, posts, unresolved, near = rba.classify_and_generate(
        specs=specs, epics=epics, args=args, logger=logger,
    )
    index = rba.ArchiveIndex(
        generated_posts=posts,
        classifications=classifications,
        unresolved=unresolved, near_misses=near,
        skipped_specs=[c.spec for c in classifications if c.category == "skipped"],
    )
    rba.audit_image_references(index=index, specs=specs, repo_root=tmp_path)
    index.run_completed_at = __import__("datetime").datetime.now(
        tz=__import__("datetime").timezone.utc,
    )
    rendered_index = rba.serialise_archive_index(index, args=args)
    elapsed = time.monotonic() - start

    # NFR-001 at 3-spec scale: generous 10s headroom over actual ~100ms.
    assert elapsed < 10.0, f"full run took {elapsed:.2f}s (> 10s budget)"

    # Collect generated-post bodies (would-be written to disk)
    post_bodies: dict[str, str] = {}
    for p in posts:
        post_bodies[str(p.destination)] = p.body

    # Count image refs in source shipped-posts
    source_refs = 0
    for spec in specs:
        if spec.shipped_post_path is None:
            continue
        body = spec.shipped_post_path.read_text(encoding="utf-8")
        source_refs += len(re.findall(r"!\[[^]]*\]\([^)]+\)", body))

    # Count image refs in generated posts
    gen_refs = sum(
        len(re.findall(r"!\[[^]]*\]\([^)]+\)", body))
        for body in post_bodies.values()
    )

    # SC-001 — every source ref is represented in the generated corpus.
    # Since each source spec's shipped-post contributes to exactly one
    # generated post (unified OR rollup member OR composite member),
    # gen_refs should equal source_refs at this fixture scale.
    assert gen_refs == source_refs, (
        f"gen={gen_refs} source={source_refs} — silent image drop"
    )
    # Fixture total: unified=3 + rollup=3 + composite=7+5+4=16 → 22
    assert source_refs == 22

    # SC-002: zero source-relative paths in generated posts.
    for body in post_bodies.values():
        assert re.search(r"!\[[^]]*\]\((\./|\.\./|evidence/)", body) is None

    # SC-005: three new sections always present in the index.
    assert "## Orphan Screenshots" in rendered_index
    assert "## Broken Image References" in rendered_index
    assert "## Malformed Image References" in rendered_index

    # NFR-005: re-serialising yields byte-identical output.
    rendered_again = rba.serialise_archive_index(index, args=args)
    assert rendered_index == rendered_again
