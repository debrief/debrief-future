"""T074–T087: composite pair detector, union-find, near-miss, stitcher."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


def _make_spec(
    rba: ModuleType,
    tmp_path: Path,
    *,
    number: int,
    slug: str,
    date: str,
    tags: list[str],
) -> object:
    path = tmp_path / "specs" / f"{number:03d}-{slug}"
    path.mkdir(parents=True)
    (path / "spec.md").write_text(f"# {slug}\n")
    (path / "media").mkdir()
    shipped = path / "media" / "shipped-post.md"
    shipped.write_text(
        "---\n"
        f'title: "Shipped: {slug}"\n'
        f"date: {date}\n"
        f"tags: {tags}\n"
        "---\n\n## What Shipped\n\nbody\n"
    )
    fm = rba.parse_front_matter(shipped)
    return rba.SpecRecord(
        number=number, slug=slug, path=path,
        shipped_post_path=shipped,
        has_opening_context=False, has_planning_post=False,
        front_matter=fm, epic_prefix=None,
    )


def test_c9_boundary_five_days_qualifies(rba: ModuleType, tmp_path: Path) -> None:
    """C9: pair with Δ=5 (inclusive boundary) → one composite."""
    specs = [
        _make_spec(rba, tmp_path, number=100, slug="a",
                   date="2026-03-01", tags=["mytag"]),
        _make_spec(rba, tmp_path, number=101, slug="b",
                   date="2026-03-06", tags=["mytag"]),
    ]
    pairs = rba.find_composite_pairs(specs, window_days=5)
    assert len(pairs) == 1
    clusters = rba.cluster_composites(pairs)
    assert len(clusters) == 1
    assert clusters[0].date_span_days == 5


def test_no_shared_non_noise_tag_no_pair(rba: ModuleType, tmp_path: Path) -> None:
    specs = [
        _make_spec(rba, tmp_path, number=100, slug="a",
                   date="2026-03-01", tags=["tracer-bullet"]),  # noise-only
        _make_spec(rba, tmp_path, number=101, slug="b",
                   date="2026-03-02", tags=["tracer-bullet"]),
    ]
    pairs = rba.find_composite_pairs(specs, window_days=5)
    assert pairs == []


def test_c8_near_miss_seven_days(rba: ModuleType, tmp_path: Path) -> None:
    """C8: pair at Δ=7 with shared tag → one NearMiss, not a composite."""
    specs = [
        _make_spec(rba, tmp_path, number=100, slug="a",
                   date="2026-03-01", tags=["mytag"]),
        _make_spec(rba, tmp_path, number=101, slug="b",
                   date="2026-03-08", tags=["mytag"]),
    ]
    near = rba.find_near_misses(
        specs, composite_window_days=5, near_miss_max_days=10,
        already_clustered=set(),
    )
    assert len(near) == 1
    assert near[0].delta_days == 7


def test_beyond_near_miss_max_produces_nothing(
    rba: ModuleType,
    tmp_path: Path,
) -> None:
    specs = [
        _make_spec(rba, tmp_path, number=100, slug="a",
                   date="2026-03-01", tags=["mytag"]),
        _make_spec(rba, tmp_path, number=101, slug="b",
                   date="2026-03-12", tags=["mytag"]),
    ]
    pairs = rba.find_composite_pairs(specs, window_days=5)
    near = rba.find_near_misses(
        specs, composite_window_days=5, near_miss_max_days=10,
        already_clustered=set(),
    )
    assert pairs == []
    assert near == []


def test_three_way_cluster_via_transitive(rba: ModuleType, tmp_path: Path) -> None:
    specs = [
        _make_spec(rba, tmp_path, number=100, slug="a",
                   date="2026-03-01", tags=["t1"]),
        _make_spec(rba, tmp_path, number=101, slug="b",
                   date="2026-03-03", tags=["t1", "t2"]),
        _make_spec(rba, tmp_path, number=102, slug="c",
                   date="2026-03-05", tags=["t2"]),
    ]
    pairs = rba.find_composite_pairs(specs, window_days=5)
    clusters = rba.cluster_composites(pairs)
    assert len(clusters) == 1
    assert [m.number for m in clusters[0].members] == [100, 101, 102]
    assert clusters[0].anchor.number == 100


def test_composite_title_is_building_prefixed(rba: ModuleType, tmp_path: Path) -> None:
    specs = [
        _make_spec(rba, tmp_path, number=100, slug="a",
                   date="2026-03-01", tags=["my-theme"]),
        _make_spec(rba, tmp_path, number=101, slug="b",
                   date="2026-03-02", tags=["my-theme"]),
    ]
    pairs = rba.find_composite_pairs(specs, window_days=5)
    clusters = rba.cluster_composites(pairs)
    post = rba.stitch_composite_post(clusters[0])
    assert post.title.startswith("Building ")
    assert post.destination.name == "composite-post.md"
    assert "100-a" in str(post.destination)
