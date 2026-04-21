"""
Round-trip validation tests for schema integrity.

Tests that:
- Python → JSON → Python preserves all data
- Round-trip through serialization maintains field integrity
"""

import json

# Import generated models
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import (
    CircleAnnotation,
    LineAnnotation,
    LineProperties,
    MultiPointFeature,
    MultiPolygonFeature,
    NarrativeEntry,
    PointProperties,
    PolyAnnotation,
    PolygonProperties,
    RectangleAnnotation,
    ReferenceLocation,
    SceneFeature,
    StoryboardFeature,
    SystemState,
    TextAnnotation,
    TrackFeature,
    TrackStyle,
    VectorAnnotation,
)

FIXTURES_DIR = Path(__file__).parent.parent / "src" / "fixtures"
VALID_DIR = FIXTURES_DIR / "valid"

ROUNDTRIP_ENTITY_MAP = {
    # Core types
    "track-feature": TrackFeature,
    "reference-location": ReferenceLocation,
    # System state types
    "system-state": SystemState,
    # Annotation types
    "narrative-entry": NarrativeEntry,
    "circle-annotation": CircleAnnotation,
    "rectangle-annotation": RectangleAnnotation,
    "line-annotation": LineAnnotation,
    "text-annotation": TextAnnotation,
    "vector-annotation": VectorAnnotation,
    "poly-annotation": PolyAnnotation,
    # Storyboarding types (#215). Scene MUST be listed before Storyboard because
    # get_entity_type matches by filename prefix, and "storyboard-scene-" starts
    # with "storyboard-" — registering Storyboard first would mis-classify Scene
    # fixtures. The "-single-" suffix limits the round-trip to single-Feature
    # fixtures (FeatureCollection fixtures are exercised by the CRUD tests).
    "storyboard-scene-single": SceneFeature,
    "storyboard-single": StoryboardFeature,
    # Styling types
    "point-properties": PointProperties,
    "line-properties": LineProperties,
    "polygon-properties": PolygonProperties,
    "track-style": TrackStyle,
    # Multi-geometry tool result types
    "multi-point-feature": MultiPointFeature,
    "multi-polygon-feature": MultiPolygonFeature,
}


def get_entity_type(filename: str) -> str | None:
    """Get entity type from fixture filename prefix."""
    for prefix in ROUNDTRIP_ENTITY_MAP:
        if filename.startswith(prefix):
            return prefix
    return None


def get_roundtrip_fixtures() -> list[tuple[str, Path]]:
    """Get all valid fixtures for round-trip testing."""
    fixtures = []
    if VALID_DIR.exists():
        for f in sorted(VALID_DIR.glob("*.json")):
            entity_type = get_entity_type(f.name)
            if entity_type:
                fixtures.append((entity_type, f))
    return fixtures


class TestPythonRoundTrip:
    """Test Python → JSON → Python round-trip serialization."""

    @pytest.mark.parametrize("entity_type,fixture_path", get_roundtrip_fixtures())
    def test_roundtrip_preserves_data(self, entity_type: str, fixture_path: Path) -> None:
        """Data should be preserved through JSON round-trip."""
        model_class = ROUNDTRIP_ENTITY_MAP[entity_type]
        original_data = json.loads(fixture_path.read_text())

        # Step 1: JSON → Python
        instance = model_class(**original_data)

        # Step 2: Python → JSON (using model_dump for Pydantic v2)
        json_str = instance.model_dump_json()
        serialized_data = json.loads(json_str)

        # Step 3: JSON → Python (second round)
        instance2 = model_class(**serialized_data)

        # Verify instances are equivalent
        assert instance == instance2, "Round-trip should preserve data"

    @pytest.mark.parametrize("entity_type,fixture_path", get_roundtrip_fixtures())
    def test_roundtrip_preserves_required_fields(
        self, entity_type: str, fixture_path: Path
    ) -> None:
        """Required fields should be present after round-trip."""
        model_class = ROUNDTRIP_ENTITY_MAP[entity_type]
        original_data = json.loads(fixture_path.read_text())

        # Round-trip
        instance = model_class(**original_data)
        json_str = instance.model_dump_json()
        roundtripped = json.loads(json_str)

        # Check required fields based on entity type
        if entity_type == "reference-location":
            assert "type" in roundtripped
            assert "id" in roundtripped
            assert "geometry" in roundtripped
            assert "properties" in roundtripped
            assert "name" in roundtripped["properties"]


class TestModelDumpModes:
    """Test different serialization modes."""

    @pytest.mark.parametrize("entity_type,fixture_path", get_roundtrip_fixtures())
    def test_model_dump_dict(self, entity_type: str, fixture_path: Path) -> None:
        """model_dump() should return a valid dictionary."""
        model_class = ROUNDTRIP_ENTITY_MAP[entity_type]
        original_data = json.loads(fixture_path.read_text())

        instance = model_class(**original_data)
        dumped = instance.model_dump()

        assert isinstance(dumped, dict), "model_dump() should return dict"

    @pytest.mark.parametrize("entity_type,fixture_path", get_roundtrip_fixtures())
    def test_model_dump_json(self, entity_type: str, fixture_path: Path) -> None:
        """model_dump_json() should return valid JSON string."""
        model_class = ROUNDTRIP_ENTITY_MAP[entity_type]
        original_data = json.loads(fixture_path.read_text())

        instance = model_class(**original_data)
        json_str = instance.model_dump_json()

        # Should be parseable as JSON
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict), "Parsed JSON should be a dict"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
