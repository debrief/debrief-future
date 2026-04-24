"""T044–T048: unified-post stitcher — tense-inverted twin heading, etc."""

from __future__ import annotations

import datetime as _dt
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType

_FIX = Path(__file__).parent / "fixtures" / "specs"


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
# Spec 231 Phase 3: Epic rollup — member feature section + screenshots
# ---------------------------------------------------------------------------


def _write_member_spec(
    rba: ModuleType,
    root: Path,
    number: int,
    slug: str,
    date: str,
    body: str,
    *,
    tags: tuple[str, ...] = ("example-feature",),
) -> object:
    spec_dir = root / f"{number:03d}-{slug}"
    (spec_dir / "media").mkdir(parents=True)
    tags_yaml = "[" + ", ".join(tags) + "]"
    shipped = spec_dir / "media" / "shipped-post.md"
    shipped.write_text(
        f"---\nlayout: future-post\ntitle: \"Shipped: {slug}\"\n"
        f"date: {date}\ntrack: momentum\nauthor: Ian\n"
        f"tags: {tags_yaml}\n---\n\n{body}\n",
        encoding="utf-8",
    )
    fm = rba.parse_front_matter(shipped)
    return rba.SpecRecord(
        number=number, slug=slug, path=spec_dir,
        shipped_post_path=shipped,
        has_opening_context=False, has_planning_post=False,
        front_matter=fm, epic_prefix=None,
    )


def _epic(rba: ModuleType, member_numbers: tuple[int, ...]) -> object:
    return rba.Epic(
        id="E99", title="Example Epic",
        description="Test epic", idea_doc_path=None,
        status="complete",
        member_spec_numbers=member_numbers,
    )


def _rollup_fixture(rba: ModuleType, tmp_path: Path) -> tuple[object, tuple[object, ...]]:
    member_a = _write_member_spec(
        rba, tmp_path, 174, "thumbnail-capture", "2026-04-02",
        """## Context

Thumbnails lead paragraph.

## Screenshots

![alt1](./evidence/screenshots/a.png)
![alt2](./evidence/screenshots/b.png)
![alt3](../evidence/screenshots/c.png)
""",
    )
    member_b = _write_member_spec(
        rba, tmp_path, 175, "no-images", "2026-04-03",
        """## Context

No images here.
""",
    )
    return _epic(rba, (174, 175)), (member_a, member_b)


def test_rollup_title_is_epic_title(rba: ModuleType, tmp_path: Path) -> None:
    epic, members = _rollup_fixture(rba, tmp_path)
    post = rba.stitch_epic_rollup(epic=epic, members=members)
    assert post is not None
    assert post.title == "Example Epic"


def test_rollup_front_matter_has_layout_future_post(
    rba: ModuleType, tmp_path: Path,
) -> None:
    epic, members = _rollup_fixture(rba, tmp_path)
    post = rba.stitch_epic_rollup(epic=epic, members=members)
    assert post is not None
    assert "layout: future-post" in post.body


def test_rollup_destination_is_anchor_epic_rollup_md(
    rba: ModuleType, tmp_path: Path,
) -> None:
    epic, members = _rollup_fixture(rba, tmp_path)
    post = rba.stitch_epic_rollup(epic=epic, members=members)
    assert post is not None
    assert post.destination.name == "epic-rollup.md"
    # Anchor is the lowest-numbered member
    assert post.destination.parent.parent.name == "174-thumbnail-capture"


def test_rollup_no_overwrite_proof(rba: ModuleType, tmp_path: Path) -> None:
    """Stitching rollup does not mutate source shipped-post files."""
    import hashlib
    epic, members = _rollup_fixture(rba, tmp_path)
    pre_hashes = {
        m.shipped_post_path: hashlib.sha256(
            m.shipped_post_path.read_bytes()
        ).hexdigest()
        for m in members
    }
    _ = rba.stitch_epic_rollup(epic=epic, members=members)
    for path, pre in pre_hashes.items():
        post = hashlib.sha256(path.read_bytes()).hexdigest()
        assert pre == post


def test_rollup_has_members_and_member_features_sections(
    rba: ModuleType, tmp_path: Path,
) -> None:
    epic, members = _rollup_fixture(rba, tmp_path)
    post = rba.stitch_epic_rollup(epic=epic, members=members)
    assert post is not None
    assert "## Members" in post.body
    assert "## Member Features" in post.body


def test_rollup_member_with_3_images_produces_3_screenshot_refs(
    rba: ModuleType, tmp_path: Path,
) -> None:
    epic, members = _rollup_fixture(rba, tmp_path)
    post = rba.stitch_epic_rollup(epic=epic, members=members)
    assert post is not None
    # 174 has 3 images. Count ![...] between `### 174-...` and the next `###`
    # or end. We count basename occurrences as a robust proxy.
    assert "![alt1]" in post.body
    assert "![alt2]" in post.body
    assert "![alt3]" in post.body
    # Total ![ occurrences in body = 3 (from member 174; member 175 has 0).
    assert post.body.count("![") == 3


def test_rollup_member_with_zero_images_omits_screenshots_heading(
    rba: ModuleType, tmp_path: Path,
) -> None:
    epic, members = _rollup_fixture(rba, tmp_path)
    post = rba.stitch_epic_rollup(epic=epic, members=members)
    assert post is not None
    # Extract the 175-no-images member block
    start = post.body.index("### 175-no-images")
    # `#### Screenshots` heading must not appear between 175's block and end-of-post
    block = post.body[start:]
    assert "#### Screenshots" not in block


def test_rollup_member_screenshot_paths_are_rewritten(
    rba: ModuleType, tmp_path: Path,
) -> None:
    import re as _re
    epic, members = _rollup_fixture(rba, tmp_path)
    post = rba.stitch_epic_rollup(epic=epic, members=members)
    assert post is not None
    # Zero source-relative forms
    assert _re.search(r"!\[[^]]*\]\((\./|\.\./|evidence/)", post.body) is None
    # Every image ref lands under /assets/images/future-debrief/174-thumbnail-capture/
    for m in _re.finditer(r"!\[[^]]*\]\(([^)]+)\)", post.body):
        path = m.group(1)
        assert path.startswith(
            "/assets/images/future-debrief/174-thumbnail-capture/"
        )


# ---------------------------------------------------------------------------
# Spec 231 Phase 4: Composite post — member feature screenshots
# ---------------------------------------------------------------------------


def _composite_fixture(rba: ModuleType, tmp_path: Path) -> object:
    """Build a 3-member composite cluster (185-shaped: 7+5+4 images)."""
    member_186 = _write_member_spec(
        rba, tmp_path, 186, "filter-chips", "2026-04-08",
        "## Screenshots\n\n" + "\n".join(
            f"![a{i}](./evidence/screenshots/a{i}.png)" for i in range(7)
        ),
    )
    member_189 = _write_member_spec(
        rba, tmp_path, 189, "stakeholder-demo-ui", "2026-04-09",
        "## Screenshots\n\n" + "\n".join(
            f"![b{i}](./evidence/screenshots/b{i}.png)" for i in range(5)
        ),
    )
    member_190 = _write_member_spec(
        rba, tmp_path, 190, "live-llm-transport", "2026-04-10",
        "## Screenshots\n\n" + "\n".join(
            f"![c{i}](./evidence/screenshots/c{i}.png)" for i in range(4)
        ),
    )
    anchor = member_186
    members = (member_186, member_189, member_190)
    return rba.CompositeCluster(
        id="C-test",
        anchor=anchor,
        members=members,
        shared_tags=frozenset({"example-feature"}),
        date_span_days=2,
    )


def test_composite_title_is_building_prefixed(
    rba: ModuleType, tmp_path: Path,
) -> None:
    cluster = _composite_fixture(rba, tmp_path)
    post = rba.stitch_composite_post(cluster)
    assert post.title.startswith("Building ")


def test_composite_front_matter_has_layout_future_post(
    rba: ModuleType, tmp_path: Path,
) -> None:
    cluster = _composite_fixture(rba, tmp_path)
    post = rba.stitch_composite_post(cluster)
    assert "layout: future-post" in post.body


def test_composite_destination_is_anchor_composite_post_md(
    rba: ModuleType, tmp_path: Path,
) -> None:
    cluster = _composite_fixture(rba, tmp_path)
    post = rba.stitch_composite_post(cluster)
    assert post.destination.name == "composite-post.md"
    assert post.destination.parent.parent.name == "186-filter-chips"


def test_composite_no_overwrite_proof(rba: ModuleType, tmp_path: Path) -> None:
    """Stitching composite does not mutate source shipped-post files."""
    import hashlib
    cluster = _composite_fixture(rba, tmp_path)
    pre = {
        m.shipped_post_path: hashlib.sha256(
            m.shipped_post_path.read_bytes()
        ).hexdigest()
        for m in cluster.members
    }
    _ = rba.stitch_composite_post(cluster)
    for path, pre_hash in pre.items():
        assert hashlib.sha256(path.read_bytes()).hexdigest() == pre_hash


def test_composite_has_seven_canonical_sections(
    rba: ModuleType, tmp_path: Path,
) -> None:
    cluster = _composite_fixture(rba, tmp_path)
    post = rba.stitch_composite_post(cluster)
    for h in (
        "## What We're Building",
        "## How It Fits",
        "## Key Decisions",
        "## Members",
        "## What Shipped",
        "## Lessons Learned",
        "## What's Next",
    ):
        assert h in post.body, f"missing {h}"


def test_composite_185_shaped_cluster_has_16_image_refs(
    rba: ModuleType, tmp_path: Path,
) -> None:
    cluster = _composite_fixture(rba, tmp_path)
    post = rba.stitch_composite_post(cluster)
    # 7 + 5 + 4 = 16 image refs under three `#### Screenshots` sub-blocks
    assert post.body.count("![") == 16
    assert post.body.count("#### Screenshots") == 3


def test_composite_anchor_spec_images_appear_in_its_own_block(
    rba: ModuleType, tmp_path: Path,
) -> None:
    """Anchor (186) images appear in its block, not duplicated elsewhere."""
    cluster = _composite_fixture(rba, tmp_path)
    post = rba.stitch_composite_post(cluster)
    # Each a0..a6 appears exactly once
    for i in range(7):
        assert post.body.count(f"a{i}.png") == 1


def test_composite_member_screenshot_paths_are_rewritten(
    rba: ModuleType, tmp_path: Path,
) -> None:
    import re as _re
    cluster = _composite_fixture(rba, tmp_path)
    post = rba.stitch_composite_post(cluster)
    assert _re.search(r"!\[[^]]*\]\((\./|\.\./|evidence/)", post.body) is None
    # Every image ref uses Jekyll absolute form
    for m in _re.finditer(r"!\[[^]]*\]\(([^)]+)\)", post.body):
        path = m.group(1)
        assert path.startswith("/assets/images/future-debrief/")


# ---------------------------------------------------------------------------
# Spec 231 Phase 5: Twin-heading splice preserves all images
# ---------------------------------------------------------------------------


def test_twin_heading_splice_preserves_all_four_images(rba: ModuleType) -> None:
    """176-log-panel-ux shape: tense-inverted twin heading. Fourth image
    lives INSIDE the twin-heading section itself (the bug case — that image
    used to be dropped along with the heading)."""
    opener = """## What We're Building

Opener what-we-are-building.

## How It Fits

Opener how-it-fits.

## Key Decisions

- Decision one.
"""
    shipped_body = """## What We Built

Tense-inverted twin heading paragraph.

![a](../evidence/screenshots/a.png)

Second paragraph in the twin-heading section.

## Other Section

Another paragraph.

![b](../evidence/screenshots/b.png)

![c](../evidence/screenshots/c.png)

## Yet Another

![d](../evidence/screenshots/d.png)
"""
    merged = rba._merge_opener_with_shipped_body(opener, shipped_body)
    # All four image refs preserved after the splice — including the one
    # inside the twin-heading section (a.png).
    for name in ("a.png", "b.png", "c.png", "d.png"):
        assert name in merged, f"{name} lost during splice"
    # First paragraph of twin-heading still spliced into Key Decisions
    assert "Tense-inverted twin heading paragraph." in merged


def test_non_twin_heading_merge_unchanged(rba: ModuleType) -> None:
    """Regression guard: non-twin-heading merge path still works."""
    opener = """## What We're Building

Opener paragraph.

## Key Decisions

- Decision.
"""
    shipped_body = """## Something Else

No twin-heading here.

![x](./x.png)
"""
    merged = rba._merge_opener_with_shipped_body(opener, shipped_body)
    assert "## Something Else" in merged
    assert "![x](./x.png)" in merged
