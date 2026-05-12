"""Adherence tests for Spec #258 SceneProperties additions.

Covers FR-001 (display_mode capture), FR-003 (legacy compatibility — readers
tolerate missing display_mode), and FR-006 (polygon-source provenance round-
trips through the schema).

Both fixtures live next to the schema as `scene-258-with-display-mode.json`
(post-#258 norm: display_mode + _polygon_source present) and
`scene-258-legacy.json` (pre-#258: neither slot present).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from debrief_schemas import (
    DisplayModeEnum,
    PolygonSourceEnum,
    SceneFeature,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES_DIR = REPO_ROOT / "shared" / "schemas" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))


def test_with_display_mode_fixture_parses() -> None:
    """A scene with display_mode + _polygon_source loads cleanly."""
    raw = _load("scene-258-with-display-mode.json")
    feature = SceneFeature.model_validate(raw)
    assert feature.properties.display_mode == DisplayModeEnum.trail
    # Pydantic exposes the underscore-prefixed slot via the `polygon_source`
    # alias (Pydantic strips leading underscores from attribute names).
    assert feature.properties.polygon_source == PolygonSourceEnum.bounds


def test_legacy_fixture_parses_without_optional_slots() -> None:
    """A pre-#258 scene (no display_mode, no _polygon_source) loads cleanly.

    FR-003: readers MUST tolerate the slot being absent and MUST NOT raise.
    """
    raw = _load("scene-258-legacy.json")
    feature = SceneFeature.model_validate(raw)
    assert feature.properties.display_mode is None
    assert feature.properties.polygon_source is None


def test_with_display_mode_round_trips() -> None:
    """Pydantic write → JSON → Pydantic read preserves both slots."""
    raw = _load("scene-258-with-display-mode.json")
    feature = SceneFeature.model_validate(raw)
    # by_alias=True preserves the JSON wire-name `_polygon_source` (Pydantic
    # otherwise serialises the Python attribute name `polygon_source`).
    serialised = feature.model_dump_json(by_alias=True)
    reparsed = SceneFeature.model_validate_json(serialised)
    assert reparsed.properties.display_mode == DisplayModeEnum.trail
    assert reparsed.properties.polygon_source == PolygonSourceEnum.bounds
    # Geometry survives both directions.
    assert reparsed.geometry.coordinates == feature.geometry.coordinates


def test_legacy_round_trips_without_introducing_slots() -> None:
    """Round-tripping a legacy scene does NOT inject default display_mode."""
    raw = _load("scene-258-legacy.json")
    feature = SceneFeature.model_validate(raw)
    # exclude_none=True so the JSON omits the absent optional slots — mirrors
    # what the writer is expected to emit (no implicit defaults).
    serialised = feature.model_dump_json(by_alias=True, exclude_none=True)
    parsed_back = json.loads(serialised)
    assert "display_mode" not in parsed_back["properties"]
    assert "_polygon_source" not in parsed_back["properties"]


def test_display_mode_enum_membership() -> None:
    """display_mode rejects values outside DisplayModeEnum."""
    raw = _load("scene-258-with-display-mode.json")
    raw["properties"]["display_mode"] = "blink"
    with pytest.raises(Exception):
        SceneFeature.model_validate(raw)


def test_polygon_source_enum_membership() -> None:
    """_polygon_source rejects values outside PolygonSourceEnum."""
    raw = _load("scene-258-with-display-mode.json")
    raw["properties"]["_polygon_source"] = "telemetry"
    with pytest.raises(Exception):
        SceneFeature.model_validate(raw)
