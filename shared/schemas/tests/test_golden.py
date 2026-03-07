"""
Golden fixture validation tests using Pydantic models.

Tests that:
- All valid fixtures pass Pydantic validation
- All invalid fixtures fail with expected ValidationErrors
"""

import json

# Import generated models
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

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
    SystemState,
    TextAnnotation,
    TrackFeature,
    TrackStyle,
    VectorAnnotation,
)

FIXTURES_DIR = Path(__file__).parent.parent / "src" / "fixtures"
VALID_DIR = FIXTURES_DIR / "valid"
INVALID_DIR = FIXTURES_DIR / "invalid"

# Entity type mapping from fixture prefix to model class
ENTITY_MAP = {
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
    for prefix in ENTITY_MAP:
        if filename.startswith(prefix):
            return prefix
    return None


def get_valid_fixtures() -> list[tuple[str, Path]]:
    """Get all valid fixture files."""
    fixtures = []
    if VALID_DIR.exists():
        for f in sorted(VALID_DIR.glob("*.json")):
            entity_type = get_entity_type(f.name)
            if entity_type:
                fixtures.append((entity_type, f))
    return fixtures


def get_invalid_fixtures() -> list[tuple[str, Path]]:
    """Get all invalid fixture files."""
    fixtures = []
    if INVALID_DIR.exists():
        for f in sorted(INVALID_DIR.glob("*.json")):
            entity_type = get_entity_type(f.name)
            if entity_type:
                fixtures.append((entity_type, f))
    return fixtures


class TestValidFixtures:
    """Test that all valid fixtures pass Pydantic validation."""

    @pytest.mark.parametrize("entity_type,fixture_path", get_valid_fixtures())
    def test_valid_fixture_passes(self, entity_type: str, fixture_path: Path) -> None:
        """Valid fixtures should pass Pydantic validation."""
        model_class = ENTITY_MAP[entity_type]
        data = json.loads(fixture_path.read_text())

        # Should not raise ValidationError
        instance = model_class(**data)

        # Verify basic properties
        assert instance is not None
        if hasattr(instance, "id"):
            assert instance.id is not None


class TestInvalidFixtures:
    """Test that all invalid fixtures fail Pydantic validation."""

    @pytest.mark.parametrize("entity_type,fixture_path", get_invalid_fixtures())
    def test_invalid_fixture_fails(self, entity_type: str, fixture_path: Path) -> None:
        """Invalid fixtures should raise Pydantic ValidationError."""
        model_class = ENTITY_MAP[entity_type]
        data = json.loads(fixture_path.read_text())

        # Should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            model_class(**data)

        # Verify error contains useful information
        errors = exc_info.value.errors()
        assert len(errors) > 0, "ValidationError should contain at least one error"


class TestFixtureConsistency:
    """Test fixture organization and naming conventions."""

    def test_all_entities_have_valid_fixtures(self) -> None:
        """Each entity type should have at least one valid fixture."""
        for entity_type in ENTITY_MAP:
            fixtures = [f for et, f in get_valid_fixtures() if et == entity_type]
            assert len(fixtures) >= 1, f"No valid fixtures for {entity_type}"

    def test_all_entities_have_invalid_fixtures(self) -> None:
        """Each entity type should have at least one invalid fixture."""
        for entity_type in ENTITY_MAP:
            fixtures = [f for et, f in get_invalid_fixtures() if et == entity_type]
            assert len(fixtures) >= 1, f"No invalid fixtures for {entity_type}"

    def test_fixture_files_are_valid_json(self) -> None:
        """All fixture files should be valid JSON."""
        for fixture_dir in [VALID_DIR, INVALID_DIR]:
            if fixture_dir.exists():
                for f in fixture_dir.glob("*.json"):
                    try:
                        json.loads(f.read_text())
                    except json.JSONDecodeError as e:
                        pytest.fail(f"Invalid JSON in {f}: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
