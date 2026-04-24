"""T044–T048: unified-post stitcher — tense-inverted twin heading, etc.

Extended in #231 with coverage for `stitch_epic_rollup` and
`stitch_composite_post` (first ever — Issue 7A matrix) and the twin-heading
splice image-preservation fix.
"""

from __future__ import annotations

import datetime as _dt
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType

_FIX = Path(__file__).parent / "fixtures" / "specs"


# ---------------------------------------------------------------------------
# Helpers for rollup / composite fixtures (write into tmp_path on demand).
# ---------------------------------------------------------------------------


def _write_member_shipped_post(
    root: Path,
    number: int,
    slug: str,
    *,
    date: str = "2026-04-01",
    body: str = "First paragraph intro text.\n",
    tags: tuple[str, ...] = ("tracer-bullet",),
) -> Path:
    spec_dir = root / f"{number:03d}-{slug}"
    (spec_dir / "media").mkdir(parents=True, exist_ok=True)
    shipped_path = spec_dir / "media" / "shipped-post.md"
    tag_list = "[" + ", ".join(tags) + "]"
    shipped_path.write_text(
        "---\n"
        f"layout: future-post\n"
        f'title: "Building {slug.replace("-", " ").title()}"\n'
        f"date: {date}\n"
        f"track: momentum\n"
        f"author: Ian\n"
        f"tags: {tag_list}\n"
        f'excerpt: "excerpt for {slug}"\n'
        "---\n\n"
        f"{body}",
        encoding="utf-8",
    )
    return shipped_path


def _build_member(
    rba: ModuleType,
    root: Path,
    number: int,
    slug: str,
    *,
    date: str = "2026-04-01",
    body: str = "First paragraph intro text.\n",
    tags: tuple[str, ...] = ("tracer-bullet",),
) -> object:
    shipped = _write_member_shipped_post(
        root, number, slug, date=date, body=body, tags=tags,
    )
    fm = rba.parse_front_matter(shipped)
    return rba.SpecRecord(
        number=number,
        slug=slug,
        path=shipped.parent.parent,
        shipped_post_path=shipped,
        has_opening_context=False,
        has_planning_post=False,
        front_matter=fm,
        epic_prefix=None,
    )


def _make_epic(rba: ModuleType, *, member_numbers: tuple[int, ...]) -> object:
    return rba.Epic(
        id="E99",
        title="[E99] Test Epic Title",
        description="Test epic description for rollup fixtures.",
        idea_doc_path=None,
        status="complete",
        member_spec_numbers=member_numbers,
    )


def _build_spec(rba: ModuleType, slug: str) -> object:
    path = _FIX / slug
    fm = rba.parse_front_matter(path / "media" / "shipped-post.md")
    return rba.SpecRecord(
        number=500 if slug == "with-opener" else 501,
        slug=slug,
        path=path,
        shipped_post_path=path / "media" / "shipped-post.md",
        has_opening_context=(path / "evidence" / "opening-context.md").is_file(),
        has_planning_post=False,
        front_matter=fm,
        epic_prefix=None,
    )


def test_twin_heading_splices_into_key_decisions(rba: ModuleType) -> None:
    spec = _build_spec(rba, "with-opener")
    opener, source = rba.load_or_synthesise_opener(spec)
    post = rba.stitch_unified_post(
        spec=spec, opener=opener, opener_source=source,
        ship_date=_dt.date(2026, 3, 10),
    )
    # Twin heading ## What We Built should NOT appear in the body.
    assert "## What We Built" not in post.body
    # Its opening paragraph should now sit inside Key Decisions.
    assert "tense-inverted twin heading" in post.body


def test_title_is_building_prefixed(rba: ModuleType) -> None:
    spec = _build_spec(rba, "with-opener")
    opener, source = rba.load_or_synthesise_opener(spec)
    post = rba.stitch_unified_post(
        spec=spec, opener=opener, opener_source=source,
        ship_date=_dt.date(2026, 3, 10),
    )
    assert post.title == "Building Example With Opener"


def test_front_matter_has_layout_future_post(rba: ModuleType) -> None:
    spec = _build_spec(rba, "with-opener")
    opener, source = rba.load_or_synthesise_opener(spec)
    post = rba.stitch_unified_post(
        spec=spec, opener=opener, opener_source=source,
        ship_date=_dt.date(2026, 3, 10),
    )
    assert "layout: future-post" in post.body
    assert "date: 2026-03-10" in post.body


def test_destination_is_media_unified_post(rba: ModuleType) -> None:
    spec = _build_spec(rba, "with-opener")
    opener, source = rba.load_or_synthesise_opener(spec)
    post = rba.stitch_unified_post(
        spec=spec, opener=opener, opener_source=source,
        ship_date=_dt.date(2026, 3, 10),
    )
    assert post.destination.name == "unified-post.md"
    assert post.destination.parent.name == "media"


def test_no_overwrite_proof_over_a_stitch(rba: ModuleType, tmp_path: Path) -> None:
    """C5: stitching does NOT mutate the shipped-post source file."""
    import hashlib
    # Build a fresh spec in tmp so we can measure byte identity.
    src_spec = _FIX / "with-opener"
    target = tmp_path / "spec"
    import shutil as _shutil
    _shutil.copytree(src_spec, target)
    fm = rba.parse_front_matter(target / "media" / "shipped-post.md")
    spec = rba.SpecRecord(
        number=500, slug="with-opener", path=target,
        shipped_post_path=target / "media" / "shipped-post.md",
        has_opening_context=True, has_planning_post=False,
        front_matter=fm, epic_prefix=None,
    )
    pre = hashlib.sha256(
        (target / "media" / "shipped-post.md").read_bytes()
    ).hexdigest()
    opener, source = rba.load_or_synthesise_opener(spec)
    _ = rba.stitch_unified_post(
        spec=spec, opener=opener, opener_source=source,
        ship_date=_dt.date(2026, 3, 10),
    )
    post_hash = hashlib.sha256(
        (target / "media" / "shipped-post.md").read_bytes()
    ).hexdigest()
    assert pre == post_hash


# ---------------------------------------------------------------------------
# Epic rollup stitcher tests (Issue 7A — first ever coverage)
# ---------------------------------------------------------------------------


def test_rollup_title_is_epic_title(rba: ModuleType, tmp_path: Path) -> None:
    m1 = _build_member(rba, tmp_path, 301, "alpha-feature")
    m2 = _build_member(rba, tmp_path, 302, "beta-feature")
    epic = _make_epic(rba, member_numbers=(301, 302))
    post = rba.stitch_epic_rollup(epic=epic, members=(m1, m2))
    assert post is not None
    assert post.title == "[E99] Test Epic Title"


def test_rollup_front_matter_has_layout_future_post(
    rba: ModuleType, tmp_path: Path,
) -> None:
    m1 = _build_member(rba, tmp_path, 301, "alpha-feature", date="2026-04-10")
    epic = _make_epic(rba, member_numbers=(301,))
    post = rba.stitch_epic_rollup(epic=epic, members=(m1,))
    assert post is not None
    assert "layout: future-post" in post.body
    assert "date: 2026-04-10" in post.body


def test_rollup_destination_is_anchor_epic_rollup_md(
    rba: ModuleType, tmp_path: Path,
) -> None:
    m1 = _build_member(rba, tmp_path, 301, "alpha-feature")
    m2 = _build_member(rba, tmp_path, 302, "beta-feature")
    epic = _make_epic(rba, member_numbers=(301, 302))
    post = rba.stitch_epic_rollup(epic=epic, members=(m1, m2))
    assert post is not None
    assert post.destination.name == "epic-rollup.md"
    assert post.destination.parent.name == "media"
    assert post.destination.parent.parent.name == "301-alpha-feature"


def test_rollup_no_overwrite_proof(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """Source shipped-post files are not mutated when stitching rollup."""
    import hashlib
    m1 = _build_member(rba, tmp_path, 301, "alpha-feature")
    m2 = _build_member(rba, tmp_path, 302, "beta-feature")
    pre1 = hashlib.sha256(m1.shipped_post_path.read_bytes()).hexdigest()  # type: ignore[attr-defined]
    pre2 = hashlib.sha256(m2.shipped_post_path.read_bytes()).hexdigest()  # type: ignore[attr-defined]
    epic = _make_epic(rba, member_numbers=(301, 302))
    rba.stitch_epic_rollup(epic=epic, members=(m1, m2))
    post1 = hashlib.sha256(m1.shipped_post_path.read_bytes()).hexdigest()  # type: ignore[attr-defined]
    post2 = hashlib.sha256(m2.shipped_post_path.read_bytes()).hexdigest()  # type: ignore[attr-defined]
    assert pre1 == post1
    assert pre2 == post2


def test_rollup_has_members_and_member_features_sections(
    rba: ModuleType, tmp_path: Path,
) -> None:
    m1 = _build_member(rba, tmp_path, 301, "alpha-feature")
    epic = _make_epic(rba, member_numbers=(301,))
    post = rba.stitch_epic_rollup(epic=epic, members=(m1,))
    assert post is not None
    assert "## Members" in post.body
    assert "## Member Features" in post.body
    assert "## What Shipped" in post.body


def test_rollup_member_with_3_images_produces_3_screenshot_refs(
    rba: ModuleType, tmp_path: Path,
) -> None:
    body = (
        "Short intro paragraph.\n\n"
        "## Screenshots\n\n"
        "![a](./evidence/a.png)\n"
        "![b](./evidence/b.png)\n"
        "![c](./evidence/c.png)\n"
    )
    m1 = _build_member(rba, tmp_path, 301, "alpha-feature", body=body)
    epic = _make_epic(rba, member_numbers=(301,))
    post = rba.stitch_epic_rollup(epic=epic, members=(m1,))
    assert post is not None
    # Count image refs only inside Member Features section.
    mf_idx = post.body.index("## Member Features")
    mf_section = post.body[mf_idx:]
    import re as _re
    count = len(_re.findall(r"!\[[^\]]*\]\(", mf_section))
    assert count == 3
    assert "#### Screenshots" in mf_section


def test_rollup_member_with_zero_images_omits_screenshots_heading(
    rba: ModuleType, tmp_path: Path,
) -> None:
    m1 = _build_member(rba, tmp_path, 301, "alpha-feature", body="No images here.\n")
    epic = _make_epic(rba, member_numbers=(301,))
    post = rba.stitch_epic_rollup(epic=epic, members=(m1,))
    assert post is not None
    assert "#### Screenshots" not in post.body


def test_rollup_member_screenshot_paths_are_rewritten(
    rba: ModuleType, tmp_path: Path,
) -> None:
    body = (
        "Intro.\n\n"
        "![x](./evidence/screenshots/foo.png)\n"
        "![y](../evidence/bar.gif)\n"
    )
    m1 = _build_member(rba, tmp_path, 301, "alpha-feature", body=body)
    epic = _make_epic(rba, member_numbers=(301,))
    post = rba.stitch_epic_rollup(epic=epic, members=(m1,))
    assert post is not None
    assert "/assets/images/future-debrief/301-alpha-feature/foo.png" in post.body
    assert "/assets/images/future-debrief/301-alpha-feature/bar.gif" in post.body
    # No source-relative paths survive.
    import re as _re
    mf_idx = post.body.index("## Member Features")
    mf_section = post.body[mf_idx:]
    leaks = _re.findall(r"!\[[^\]]*\]\((\./|\.\./|evidence/)", mf_section)
    assert leaks == []


# ---------------------------------------------------------------------------
# Composite post stitcher tests (Issue 7A — first ever coverage)
# ---------------------------------------------------------------------------


def _make_composite_cluster(
    rba: ModuleType,
    members: tuple[object, ...],
    *,
    shared_tags: tuple[str, ...] = ("example-tag",),
    date_span_days: int = 3,
) -> object:
    anchor = min(members, key=lambda s: s.number)  # type: ignore[attr-defined]
    return rba.CompositeCluster(
        id=f"composite-{anchor.number}",  # type: ignore[attr-defined]
        anchor=anchor,
        members=members,
        shared_tags=frozenset(shared_tags),
        date_span_days=date_span_days,
    )


def test_composite_title_is_building_prefixed(
    rba: ModuleType, tmp_path: Path,
) -> None:
    m1 = _build_member(rba, tmp_path, 401, "alpha", tags=("example-tag",))
    m2 = _build_member(rba, tmp_path, 402, "beta", tags=("example-tag",))
    cluster = _make_composite_cluster(rba, (m1, m2))
    post = rba.stitch_composite_post(cluster)
    assert post.title.startswith("Building ")


def test_composite_front_matter_has_layout_future_post(
    rba: ModuleType, tmp_path: Path,
) -> None:
    m1 = _build_member(rba, tmp_path, 401, "alpha", date="2026-04-05", tags=("example-tag",))
    m2 = _build_member(rba, tmp_path, 402, "beta", date="2026-04-07", tags=("example-tag",))
    cluster = _make_composite_cluster(rba, (m1, m2))
    post = rba.stitch_composite_post(cluster)
    assert "layout: future-post" in post.body
    assert "date: 2026-04-05" in post.body


def test_composite_destination_is_anchor_composite_post_md(
    rba: ModuleType, tmp_path: Path,
) -> None:
    m1 = _build_member(rba, tmp_path, 401, "alpha", tags=("example-tag",))
    m2 = _build_member(rba, tmp_path, 402, "beta", tags=("example-tag",))
    cluster = _make_composite_cluster(rba, (m1, m2))
    post = rba.stitch_composite_post(cluster)
    assert post.destination.name == "composite-post.md"
    assert post.destination.parent.name == "media"
    assert post.destination.parent.parent.name == "401-alpha"


def test_composite_no_overwrite_proof(
    rba: ModuleType, tmp_path: Path,
) -> None:
    import hashlib
    m1 = _build_member(rba, tmp_path, 401, "alpha", tags=("example-tag",))
    m2 = _build_member(rba, tmp_path, 402, "beta", tags=("example-tag",))
    pre1 = hashlib.sha256(m1.shipped_post_path.read_bytes()).hexdigest()  # type: ignore[attr-defined]
    pre2 = hashlib.sha256(m2.shipped_post_path.read_bytes()).hexdigest()  # type: ignore[attr-defined]
    cluster = _make_composite_cluster(rba, (m1, m2))
    rba.stitch_composite_post(cluster)
    post1 = hashlib.sha256(m1.shipped_post_path.read_bytes()).hexdigest()  # type: ignore[attr-defined]
    post2 = hashlib.sha256(m2.shipped_post_path.read_bytes()).hexdigest()  # type: ignore[attr-defined]
    assert pre1 == post1
    assert pre2 == post2


def test_composite_has_seven_canonical_sections(
    rba: ModuleType, tmp_path: Path,
) -> None:
    m1 = _build_member(rba, tmp_path, 401, "alpha", tags=("example-tag",))
    m2 = _build_member(rba, tmp_path, 402, "beta", tags=("example-tag",))
    cluster = _make_composite_cluster(rba, (m1, m2))
    post = rba.stitch_composite_post(cluster)
    for heading in (
        "## What We're Building",
        "## How It Fits",
        "## Key Decisions",
        "## Members",
        "## What Shipped",
        "## Lessons Learned",
        "## What's Next",
    ):
        assert heading in post.body, f"missing {heading}"


def test_composite_185_shaped_cluster_has_16_image_refs(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """185-cql2-array-filter-shaped cluster: 7 + 5 + 4 = 16 refs total."""

    def body_with_n(n: int) -> str:
        lines = ["First paragraph for the member.\n\n"]
        for i in range(n):
            lines.append(f"![img{i}](./evidence/screenshots/img{i}.png)\n")
        return "".join(lines)

    m1 = _build_member(rba, tmp_path, 186, "filter-chips", body=body_with_n(7), tags=("example-tag",))
    m2 = _build_member(rba, tmp_path, 189, "demo", body=body_with_n(5), tags=("example-tag",))
    m3 = _build_member(rba, tmp_path, 190, "llm-transport", body=body_with_n(4), tags=("example-tag",))
    cluster = _make_composite_cluster(rba, (m1, m2, m3))
    post = rba.stitch_composite_post(cluster)
    import re as _re
    count = len(_re.findall(r"!\[[^\]]*\]\(", post.body))
    assert count == 16


def test_composite_anchor_spec_images_appear_in_its_own_block(
    rba: ModuleType, tmp_path: Path,
) -> None:
    anchor_body = (
        "Anchor intro.\n\n"
        "![anchor-img1](./evidence/a.png)\n"
        "![anchor-img2](./evidence/b.png)\n"
    )
    member_body = "Member intro.\n\n![member-img](./evidence/c.png)\n"
    m1 = _build_member(rba, tmp_path, 401, "anchor", body=anchor_body, tags=("example-tag",))
    m2 = _build_member(rba, tmp_path, 402, "friend", body=member_body, tags=("example-tag",))
    cluster = _make_composite_cluster(rba, (m1, m2))
    post = rba.stitch_composite_post(cluster)
    # Anchor's images appear exactly once (inside its own block under What Shipped).
    assert post.body.count("/assets/images/future-debrief/401-anchor/a.png") == 1
    assert post.body.count("/assets/images/future-debrief/401-anchor/b.png") == 1
    # Member's image appears too.
    assert "/assets/images/future-debrief/402-friend/c.png" in post.body


# ---------------------------------------------------------------------------
# Twin-heading splice image-preservation (US3 / #231)
# ---------------------------------------------------------------------------


def test_twin_heading_splice_preserves_all_four_images(rba: ModuleType) -> None:
    """176-log-panel-ux-shaped: twin-heading `## What We Built` with four
    image refs spread across multiple sections. All four must survive."""
    opener = (
        "## What We're Building\n\nIntro.\n\n"
        "## How It Fits\n\nContext.\n\n"
        "## Key Decisions\n\n- A decision.\n"
    )
    shipped_body = (
        "## What We Built\n\n"
        "The first prose paragraph.\n\n"
        "![image1](../evidence/screenshots/a.png)\n\n"
        "Follow-up paragraph explaining card 1.\n\n"
        "## Category Icons at a Glance\n\n"
        "![image2](../evidence/screenshots/b.png)\n\n"
        "Prose.\n\n"
        "## Placeholders\n\n"
        "![image3](../evidence/screenshots/c.png)\n\n"
        "## Disabled State\n\n"
        "![image4](../evidence/screenshots/d.png)\n"
    )
    merged = rba._merge_opener_with_shipped_body(opener, shipped_body)
    import re as _re
    count = len(_re.findall(r"!\[[^\]]*\]\(", merged))
    assert count == 4, f"expected 4 image refs, got {count}\n---\n{merged}"
    # Twin heading itself should NOT appear (existing behaviour preserved).
    assert "## What We Built" not in merged


def test_non_twin_heading_merge_unchanged(rba: ModuleType) -> None:
    """Regression guard: the non-twin path still works for shipped-bodies
    that begin with `## Screenshots` or any non-tense-inverted heading."""
    opener = (
        "## What We're Building\n\nIntro.\n\n"
        "## Key Decisions\n\n- A decision.\n"
    )
    shipped_body = (
        "## Screenshots\n\n"
        "![only-one](./evidence/only.png)\n\n"
        "## Notes\n\nNothing else.\n"
    )
    merged = rba._merge_opener_with_shipped_body(opener, shipped_body)
    import re as _re
    count = len(_re.findall(r"!\[[^\]]*\]\(", merged))
    assert count == 1
    assert "## Screenshots" in merged


def test_composite_member_screenshot_paths_are_rewritten(
    rba: ModuleType, tmp_path: Path,
) -> None:
    body = (
        "Intro.\n\n"
        "![x](./evidence/screenshots/foo.png)\n"
        "![y](../evidence/bar.gif)\n"
    )
    m1 = _build_member(rba, tmp_path, 401, "alpha", body=body, tags=("example-tag",))
    m2 = _build_member(rba, tmp_path, 402, "beta", body="No images.\n", tags=("example-tag",))
    cluster = _make_composite_cluster(rba, (m1, m2))
    post = rba.stitch_composite_post(cluster)
    assert "/assets/images/future-debrief/401-alpha/foo.png" in post.body
    assert "/assets/images/future-debrief/401-alpha/bar.gif" in post.body
    import re as _re
    leaks = _re.findall(r"!\[[^\]]*\]\((\./|\.\./|evidence/)", post.body)
    assert leaks == []
