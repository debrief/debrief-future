"""T093–T104: index + runbook + summary serialisation."""

from __future__ import annotations

import datetime as _dt
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path
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


# ---------------------------------------------------------------------------
# Spec 231 Phase 6: Orphan / Broken / Malformed sections
# ---------------------------------------------------------------------------


def _empty_index(rba: ModuleType) -> object:
    return rba.ArchiveIndex()


def _spec_with_screenshots(
    rba: ModuleType,
    tmp_path: Path,
    *,
    number: int,
    slug: str,
    filenames: tuple[str, ...],
) -> object:
    d = tmp_path / "specs" / f"{number:03d}-{slug}"
    (d / "evidence" / "screenshots").mkdir(parents=True)
    for name in filenames:
        (d / "evidence" / "screenshots" / name).write_bytes(b"\x89PNG\r\n")
    return rba.SpecRecord(
        number=number, slug=slug, path=d,
        shipped_post_path=None,
        has_opening_context=False, has_planning_post=False,
        front_matter=None, epic_prefix=None,
    )


def test_orphan_section_always_present_even_when_empty(
    rba: ModuleType, tmp_path: Path,
) -> None:
    args = _build_cli(rba, tmp_path)
    rendered = rba.serialise_archive_index(_empty_index(rba), args=args)
    assert "## Orphan Screenshots" in rendered
    assert "_No orphan screenshots detected._" in rendered


def test_broken_section_always_present_even_when_empty(
    rba: ModuleType, tmp_path: Path,
) -> None:
    args = _build_cli(rba, tmp_path)
    rendered = rba.serialise_archive_index(_empty_index(rba), args=args)
    assert "## Broken Image References" in rendered
    assert "_No broken references detected._" in rendered


def test_malformed_section_always_present_even_when_empty(
    rba: ModuleType, tmp_path: Path,
) -> None:
    args = _build_cli(rba, tmp_path)
    rendered = rba.serialise_archive_index(_empty_index(rba), args=args)
    assert "## Malformed Image References" in rendered
    assert "_No malformed references detected._" in rendered


def test_orphans_render_in_deterministic_order(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """Insert in reverse order; serialised output sorts by (spec_key, filename)."""
    args = _build_cli(rba, tmp_path)
    from pathlib import Path as _P
    index = rba.ArchiveIndex()
    # Reverse insert order
    for spec_key, fname in [
        ("185-beta", "z.png"),
        ("085-alpha", "m.png"),
        ("085-alpha", "a.png"),
    ]:
        index.orphans.append(rba.OrphanImage(
            spec_key=spec_key, filename=fname,
            relative_path=_P(f"specs/{spec_key}/evidence/screenshots/{fname}"),
            resolved_path=_P(f"/tmp/{fname}"),
        ))
    rendered = rba.serialise_archive_index(index, args=args)
    # 085-alpha rows must appear before 185-beta; a.png before m.png
    a_idx = rendered.index("085-alpha | `specs/085-alpha/evidence/screenshots/a.png")
    m_idx = rendered.index("085-alpha | `specs/085-alpha/evidence/screenshots/m.png")
    z_idx = rendered.index("185-beta | `specs/185-beta/evidence/screenshots/z.png")
    assert a_idx < m_idx < z_idx


def test_orphans_byte_identical_across_two_str_calls(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """NFR-005: two successive serialisations produce identical bytes."""
    args = _build_cli(rba, tmp_path)
    from pathlib import Path as _P
    index = rba.ArchiveIndex()
    for spec_key, fname in [
        ("185-beta", "z.png"),
        ("085-alpha", "m.png"),
        ("085-alpha", "a.png"),
    ]:
        index.orphans.append(rba.OrphanImage(
            spec_key=spec_key, filename=fname,
            relative_path=_P(f"specs/{spec_key}/evidence/screenshots/{fname}"),
            resolved_path=_P(f"/tmp/{fname}"),
        ))
    index.malformed_refs.append(rba.MalformedImageReference(
        spec_key="117-foo", line_number=42, snippet="![broken",
    ))
    index.broken_refs.append(rba.BrokenImageReference(
        spec_key="042-bar", source_path="./evidence/missing.png", alt="m",
    ))
    first = rba.serialise_archive_index(index, args=args)
    second = rba.serialise_archive_index(index, args=args)
    assert first == second


def test_broken_ref_with_query_string_preserves_suffix_in_row(
    rba: ModuleType, tmp_path: Path,
) -> None:
    args = _build_cli(rba, tmp_path)
    index = rba.ArchiveIndex()
    index.broken_refs.append(rba.BrokenImageReference(
        spec_key="099-x", source_path="./missing.png?raw=true", alt="x",
    ))
    rendered = rba.serialise_archive_index(index, args=args)
    assert "./missing.png?raw=true" in rendered


def test_broken_ref_with_pipe_alt_renders_safely(
    rba: ModuleType, tmp_path: Path,
) -> None:
    args = _build_cli(rba, tmp_path)
    index = rba.ArchiveIndex()
    index.broken_refs.append(rba.BrokenImageReference(
        spec_key="099-x", source_path="./x.png", alt="a|b",
    ))
    rendered = rba.serialise_archive_index(index, args=args)
    # Pipe is escaped so the table row stays valid
    assert "a\\|b" in rendered


def test_malformed_row_shows_line_number_and_snippet(
    rba: ModuleType, tmp_path: Path,
) -> None:
    args = _build_cli(rba, tmp_path)
    index = rba.ArchiveIndex()
    index.malformed_refs.append(rba.MalformedImageReference(
        spec_key="176-log", line_number=42, snippet="![unclosed(foo.png",
    ))
    rendered = rba.serialise_archive_index(index, args=args)
    assert "176-log" in rendered
    assert "42" in rendered
    assert "![unclosed(foo.png" in rendered


def test_three_orphan_fixture_matches_baseline(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """085-alpha×9, 118-beta×9, 142-gamma×1 fixture renders with 19 orphans."""
    args = _build_cli(rba, tmp_path)
    from pathlib import Path as _P
    index = rba.ArchiveIndex()
    for i in range(9):
        index.orphans.append(rba.OrphanImage(
            spec_key="085-alpha", filename=f"img-{i}.png",
            relative_path=_P(f"specs/085-alpha/evidence/screenshots/img-{i}.png"),
            resolved_path=_P(f"/tmp/a-{i}"),
        ))
    for i in range(9):
        index.orphans.append(rba.OrphanImage(
            spec_key="118-beta", filename=f"img-{i}.png",
            relative_path=_P(f"specs/118-beta/evidence/screenshots/img-{i}.png"),
            resolved_path=_P(f"/tmp/b-{i}"),
        ))
    index.orphans.append(rba.OrphanImage(
        spec_key="142-gamma", filename="sidebar.png",
        relative_path=_P("specs/142-gamma/evidence/screenshots/sidebar.png"),
        resolved_path=_P("/tmp/c-0"),
    ))
    rendered = rba.serialise_archive_index(index, args=args)
    # 19 orphan rows — each row has exactly one `|` per spec+file+target.
    # Count table rows under Orphan Screenshots by locating the unique
    # separator line.
    orphan_header = rendered.index("## Orphan Screenshots")
    broken_header = rendered.index("## Broken Image References")
    orphan_block = rendered[orphan_header:broken_header]
    data_rows = [
        line for line in orphan_block.splitlines()
        if line.startswith("| 085-alpha")
        or line.startswith("| 118-beta")
        or line.startswith("| 142-gamma")
    ]
    assert len(data_rows) == 19


# ---------------------------------------------------------------------------
# Spec 231: scan_orphans helper
# ---------------------------------------------------------------------------


def test_scan_orphans_emits_all_when_no_shipped_post(
    rba: ModuleType, tmp_path: Path,
) -> None:
    spec = _spec_with_screenshots(
        rba, tmp_path, number=142, slug="vscode",
        filenames=("a.png", "b.png", "c.png"),
    )
    seen: set = set()
    orphans = rba.scan_orphans(spec, set(), seen, repo_root=tmp_path)
    assert len(orphans) == 3
    assert {o.filename for o in orphans} == {"a.png", "b.png", "c.png"}


def test_scan_orphans_skips_referenced_basenames(
    rba: ModuleType, tmp_path: Path,
) -> None:
    spec = _spec_with_screenshots(
        rba, tmp_path, number=142, slug="vscode",
        filenames=("a.png", "b.png", "c.png"),
    )
    seen: set = set()
    orphans = rba.scan_orphans(spec, {"b.png"}, seen, repo_root=tmp_path)
    assert {o.filename for o in orphans} == {"a.png", "c.png"}


def test_scan_orphans_dedupes_by_resolved_path(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """Symlinked screenshot → first-seen wins; subsequent scan skips it."""
    spec_a = _spec_with_screenshots(
        rba, tmp_path, number=142, slug="vscode",
        filenames=("shared.png",),
    )
    # Spec b symlinks the same file.
    d_b = tmp_path / "specs" / "143-b"
    (d_b / "evidence" / "screenshots").mkdir(parents=True)
    link = d_b / "evidence" / "screenshots" / "shared.png"
    link.symlink_to((tmp_path / "specs" / "142-vscode" /
                     "evidence" / "screenshots" / "shared.png").resolve())
    spec_b = rba.SpecRecord(
        number=143, slug="b", path=d_b,
        shipped_post_path=None,
        has_opening_context=False, has_planning_post=False,
        front_matter=None, epic_prefix=None,
    )
    seen: set = set()
    orphans_a = rba.scan_orphans(spec_a, set(), seen, repo_root=tmp_path)
    orphans_b = rba.scan_orphans(spec_b, set(), seen, repo_root=tmp_path)
    assert len(orphans_a) == 1
    assert orphans_b == []  # symlink dedup


def test_scan_orphans_includes_top_level_evidence_gif(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """Catches 191-spec-navigator's evidence/interaction.gif case."""
    d = tmp_path / "specs" / "191-spec-nav"
    (d / "evidence").mkdir(parents=True)
    (d / "evidence" / "interaction.gif").write_bytes(b"GIF")
    spec = rba.SpecRecord(
        number=191, slug="spec-nav", path=d,
        shipped_post_path=None,
        has_opening_context=False, has_planning_post=False,
        front_matter=None, epic_prefix=None,
    )
    seen: set = set()
    orphans = rba.scan_orphans(spec, set(), seen, repo_root=tmp_path)
    assert any(o.filename == "interaction.gif" for o in orphans)
