"""T093–T104: index + runbook + summary serialisation.

Extended in #231 with orphan / broken / malformed section coverage + scan_orphans.
"""

from __future__ import annotations

import datetime as _dt
import logging
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType


def _build_cli(rba: ModuleType, tmp_path: Path) -> object:
    return rba.CliArgs(
        dry_run=True, verbose=False,
        out_index=tmp_path / "ARCHIVE-REBUILD.md",
        composite_window_days=5, near_miss_max_days=10,
        skip_gh=True, fail_fast=False, repo_root=tmp_path,
    )


def _write_shipped(
    rba: ModuleType,
    tmp_path: Path,
    *,
    number: int,
    slug: str,
    tags: list[str] | None = None,
    date: str = "2026-03-01",
) -> None:
    d = tmp_path / "specs" / f"{number:03d}-{slug}"
    d.mkdir(parents=True)
    (d / "spec.md").write_text(f"# {slug}\n")
    (d / "media").mkdir()
    (d / "media" / "shipped-post.md").write_text(
        "---\n"
        f"title: \"Shipped: {slug}\"\n"
        f"date: {date}\n"
        f"tags: {tags or ['example']}\n"
        "---\n\n## What Shipped\n\nbody\n"
    )


def test_c7_every_post_gets_a_row(rba: ModuleType, tmp_path: Path) -> None:
    _write_shipped(rba, tmp_path, number=100, slug="alpha")
    _write_shipped(rba, tmp_path, number=101, slug="beta")
    specs = rba.discover_specs(tmp_path)
    args = _build_cli(rba, tmp_path)
    classifications, posts, unresolved, near = rba.classify_and_generate(
        specs=specs, epics=[], args=args, logger=logging.getLogger("test"),
    )
    index = rba.ArchiveIndex(
        generated_posts=posts, classifications=classifications,
        unresolved=unresolved, near_misses=near,
        skipped_specs=[c.spec for c in classifications if c.category == "skipped"],
    )
    index.run_completed_at = _dt.datetime.now(tz=_dt.UTC)
    rendered = rba.serialise_archive_index(index, args=args)
    # One row per generated post (excluding the table header and separator).
    row_count = sum(
        1 for line in rendered.splitlines()
        if line.startswith("| 100-alpha") or line.startswith("| 101-beta")
    )
    assert row_count == 2


def test_runbook_has_four_canonical_steps(rba: ModuleType, tmp_path: Path) -> None:
    args = _build_cli(rba, tmp_path)
    rendered = rba.serialise_archive_index(rba.ArchiveIndex(), args=args)
    assert "Wipe existing future posts" in rendered
    assert "Copy generated files" in rendered
    assert "Adjust front matter" in rendered
    assert "Build and deploy" in rendered


# ---------------------------------------------------------------------------
# Orphan / broken / malformed sections (#231 — always present, sorted).
# ---------------------------------------------------------------------------


def _make_spec_stub(
    rba: ModuleType,
    *,
    number: int = 100,
    slug: str = "alpha",
    spec_path: Path | None = None,
) -> object:
    return rba.SpecRecord(
        number=number,
        slug=slug,
        path=spec_path if spec_path is not None else (Path("/tmp") / f"{number:03d}-{slug}"),
        shipped_post_path=None,
        has_opening_context=False,
        has_planning_post=False,
        front_matter=None,
        epic_prefix=None,
    )


def test_orphan_section_always_present_even_when_empty(
    rba: ModuleType, tmp_path: Path,
) -> None:
    args = _build_cli(rba, tmp_path)
    rendered = rba.serialise_archive_index(rba.ArchiveIndex(), args=args)
    assert "## Orphan Screenshots" in rendered
    assert "_No orphan screenshots detected._" in rendered


def test_orphans_render_in_deterministic_order(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """Insert in reverse spec/filename order → output sorted."""
    args = _build_cli(rba, tmp_path)
    orphans = [
        rba.OrphanImage(
            spec_key="118-beta", filename="z.png",
            relative_path=Path("specs/118-beta/evidence/z.png"),
            resolved_path=Path("/tmp/z.png"),
        ),
        rba.OrphanImage(
            spec_key="085-alpha", filename="b.png",
            relative_path=Path("specs/085-alpha/evidence/b.png"),
            resolved_path=Path("/tmp/b.png"),
        ),
        rba.OrphanImage(
            spec_key="085-alpha", filename="a.png",
            relative_path=Path("specs/085-alpha/evidence/a.png"),
            resolved_path=Path("/tmp/a.png"),
        ),
    ]
    idx = rba.ArchiveIndex(orphans=orphans)
    rendered = rba.serialise_archive_index(idx, args=args)
    orphan_section_start = rendered.index("## Orphan Screenshots")
    next_section_start = rendered.index("## Broken Image References")
    orphan_section = rendered[orphan_section_start:next_section_start]
    pos_a = orphan_section.index("`a.png`")
    pos_b = orphan_section.index("`b.png`")
    pos_z = orphan_section.index("`z.png`")
    assert pos_a < pos_b < pos_z


def test_three_orphan_fixture_matches_baseline(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """Fixture sized like the real archive (085×9, 118×9, 142×1) renders + sorts + pairs."""
    args = _build_cli(rba, tmp_path)
    orphans: list[object] = []
    for fn in ["b.png", "a.png", "i.png", "d.png", "c.png", "e.png", "f.png", "g.png", "h.png"]:
        orphans.append(rba.OrphanImage(
            spec_key="085-chart-renderer", filename=fn,
            relative_path=Path(f"specs/085-chart-renderer/evidence/screenshots/{fn}"),
            resolved_path=Path(f"/tmp/085/{fn}"),
        ))
    for fn in ["p.png", "r.png", "s.png", "t.png", "u.png", "v.png", "w.png", "x.png", "y.png"]:
        orphans.append(rba.OrphanImage(
            spec_key="118-sensor-rendering", filename=fn,
            relative_path=Path(f"specs/118-sensor-rendering/evidence/screenshots/{fn}"),
            resolved_path=Path(f"/tmp/118/{fn}"),
        ))
    orphans.append(rba.OrphanImage(
        spec_key="142-vscode-e2e-webview-reliability",
        filename="sidebar.png",
        relative_path=Path("specs/142-vscode-e2e-webview-reliability/evidence/screenshots/sidebar.png"),
        resolved_path=Path("/tmp/142/sidebar.png"),
    ))
    idx = rba.ArchiveIndex(orphans=orphans)
    rendered = rba.serialise_archive_index(idx, args=args)
    for spec_key in (
        "085-chart-renderer", "118-sensor-rendering",
        "142-vscode-e2e-webview-reliability",
    ):
        assert spec_key in rendered
    orphan_start = rendered.index("## Orphan Screenshots")
    broken_start = rendered.index("## Broken Image References")
    section = rendered[orphan_start:broken_start]
    row_count = sum(
        1 for line in section.splitlines()
        if line.startswith("| 085") or line.startswith("| 118") or line.startswith("| 142")
    )
    assert row_count == 19


def test_broken_section_always_present_even_when_empty(
    rba: ModuleType, tmp_path: Path,
) -> None:
    args = _build_cli(rba, tmp_path)
    rendered = rba.serialise_archive_index(rba.ArchiveIndex(), args=args)
    assert "## Broken Image References" in rendered
    assert "_No broken image references detected._" in rendered


def test_broken_ref_with_query_string_preserves_suffix_in_row(
    rba: ModuleType, tmp_path: Path,
) -> None:
    args = _build_cli(rba, tmp_path)
    idx = rba.ArchiveIndex(broken_refs=[
        rba.BrokenImageReference(
            spec_key="001-foo", source_path="./evidence/x.png?raw=true", alt="x alt",
        ),
    ])
    rendered = rba.serialise_archive_index(idx, args=args)
    assert "./evidence/x.png?raw=true" in rendered


def test_broken_ref_with_escaped_alt_text_renders_safely(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """Alt text containing pipes or backticks must not break the markdown table."""
    args = _build_cli(rba, tmp_path)
    idx = rba.ArchiveIndex(broken_refs=[
        rba.BrokenImageReference(
            spec_key="001-foo", source_path="./x.png",
            alt="has | pipe and `backtick`",
        ),
    ])
    rendered = rba.serialise_archive_index(idx, args=args)
    assert r"\|" in rendered
    assert "`backtick`" not in rendered  # replaced with single quotes


def test_malformed_section_always_present_even_when_empty(
    rba: ModuleType, tmp_path: Path,
) -> None:
    args = _build_cli(rba, tmp_path)
    rendered = rba.serialise_archive_index(rba.ArchiveIndex(), args=args)
    assert "## Malformed Image References" in rendered
    assert "_No malformed image references detected._" in rendered


def test_malformed_ref_row_shows_line_number_and_snippet(
    rba: ModuleType, tmp_path: Path,
) -> None:
    args = _build_cli(rba, tmp_path)
    idx = rba.ArchiveIndex(malformed_refs=[
        rba.MalformedImageReference(
            spec_key="001-foo", line_number=42, snippet="![unclosed(foo.png",
        ),
    ])
    rendered = rba.serialise_archive_index(idx, args=args)
    assert "42" in rendered
    assert "![unclosed(foo.png" in rendered


def test_byte_identical_across_two_successive_str_calls(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """Strong reproducibility gate — Issue 3A / NFR-005."""
    args = _build_cli(rba, tmp_path)
    idx = rba.ArchiveIndex(
        orphans=[
            rba.OrphanImage(
                spec_key="zzz-zeta", filename="b.png",
                relative_path=Path("specs/zzz-zeta/evidence/b.png"),
                resolved_path=Path("/tmp/b.png"),
            ),
            rba.OrphanImage(
                spec_key="aaa-alpha", filename="a.png",
                relative_path=Path("specs/aaa-alpha/evidence/a.png"),
                resolved_path=Path("/tmp/a.png"),
            ),
        ],
        broken_refs=[
            rba.BrokenImageReference(spec_key="zzz", source_path="./z.png", alt="z"),
            rba.BrokenImageReference(spec_key="aaa", source_path="./a.png", alt="a"),
        ],
        malformed_refs=[
            rba.MalformedImageReference(spec_key="zzz", line_number=99, snippet="z"),
            rba.MalformedImageReference(spec_key="aaa", line_number=1, snippet="a"),
        ],
    )
    idx.run_completed_at = _dt.datetime(2026, 4, 24, tzinfo=_dt.UTC)
    idx.run_started_at = _dt.datetime(2026, 4, 24, tzinfo=_dt.UTC)
    first = rba.serialise_archive_index(idx, args=args)
    second = rba.serialise_archive_index(idx, args=args)
    assert first == second


# ---------------------------------------------------------------------------
# scan_orphans tests
# ---------------------------------------------------------------------------


def test_orphan_scanner_emits_all_when_no_shipped_post(
    rba: ModuleType, tmp_path: Path,
) -> None:
    spec_dir = tmp_path / "specs" / "100-alpha"
    (spec_dir / "evidence" / "screenshots").mkdir(parents=True)
    for fn in ("a.png", "b.png", "c.png"):
        (spec_dir / "evidence" / "screenshots" / fn).write_bytes(b"")
    spec = rba.SpecRecord(
        number=100, slug="alpha", path=spec_dir,
        shipped_post_path=None, has_opening_context=False,
        has_planning_post=False, front_matter=None, epic_prefix=None,
    )
    orphans = rba.scan_orphans(
        spec, set(), set(), repo_root=tmp_path,
    )
    assert {o.filename for o in orphans} == {"a.png", "b.png", "c.png"}


def test_orphan_scanner_dedupes_by_resolved_path(
    rba: ModuleType, tmp_path: Path,
) -> None:
    import os
    spec_a_dir = tmp_path / "specs" / "100-alpha"
    spec_b_dir = tmp_path / "specs" / "101-beta"
    (spec_a_dir / "evidence" / "screenshots").mkdir(parents=True)
    (spec_b_dir / "evidence" / "screenshots").mkdir(parents=True)
    shared = spec_a_dir / "evidence" / "screenshots" / "shared.png"
    shared.write_bytes(b"content")
    link = spec_b_dir / "evidence" / "screenshots" / "shared.png"
    try:
        os.symlink(shared, link)
    except OSError:
        import pytest
        pytest.skip("symlink not supported on this filesystem")
    spec_a = _make_spec_stub(rba, number=100, slug="alpha", spec_path=spec_a_dir)
    spec_b = _make_spec_stub(rba, number=101, slug="beta", spec_path=spec_b_dir)
    seen: set[Path] = set()
    a_orphans = rba.scan_orphans(spec_a, set(), seen, repo_root=tmp_path)
    b_orphans = rba.scan_orphans(spec_b, set(), seen, repo_root=tmp_path)
    assert len(a_orphans) == 1
    assert b_orphans == []


def test_orphan_scanner_skips_referenced_basenames(
    rba: ModuleType, tmp_path: Path,
) -> None:
    spec_dir = tmp_path / "specs" / "100-alpha"
    (spec_dir / "evidence" / "screenshots").mkdir(parents=True)
    (spec_dir / "evidence" / "screenshots" / "referenced.png").write_bytes(b"")
    (spec_dir / "evidence" / "screenshots" / "orphan.png").write_bytes(b"")
    spec = _make_spec_stub(rba, number=100, slug="alpha", spec_path=spec_dir)
    orphans = rba.scan_orphans(
        spec, {"referenced.png"}, set(), repo_root=tmp_path,
    )
    assert {o.filename for o in orphans} == {"orphan.png"}


def test_orphan_scanner_includes_top_level_evidence_gif(
    rba: ModuleType, tmp_path: Path,
) -> None:
    spec_dir = tmp_path / "specs" / "191-spec-navigator"
    (spec_dir / "evidence").mkdir(parents=True)
    (spec_dir / "evidence" / "interaction.gif").write_bytes(b"")
    spec = _make_spec_stub(rba, number=191, slug="spec-navigator", spec_path=spec_dir)
    orphans = rba.scan_orphans(spec, set(), set(), repo_root=tmp_path)
    assert any(o.filename == "interaction.gif" for o in orphans)


def test_summary_block_counts_match_index(rba: ModuleType, tmp_path: Path) -> None:
    _write_shipped(rba, tmp_path, number=100, slug="alpha")
    specs = rba.discover_specs(tmp_path)
    args = _build_cli(rba, tmp_path)
    classifications, posts, unresolved, near = rba.classify_and_generate(
        specs=specs, epics=[], args=args, logger=logging.getLogger("test"),
    )
    index = rba.ArchiveIndex(
        generated_posts=posts,
        classifications=classifications,
        unresolved=unresolved, near_misses=near,
        run_tool_versions={"python": "3.11.0", "gh": "absent"},
    )
    index.run_completed_at = _dt.datetime.now(tz=_dt.UTC)
    summary = rba.render_summary(index, args=args, elapsed=0.5)
    assert "Unified posts:" in summary
    assert "1" in summary  # one unified post
    assert "[DRY-RUN]" in summary  # dry-run prefix present
