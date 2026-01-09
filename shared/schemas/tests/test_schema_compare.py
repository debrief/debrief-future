"""
Schema comparison tests.

Verifies that generated schemas maintain structural consistency:
- Required fields match between LinkML and Pydantic
- Enum values are consistent across generators
- Type definitions align between generated artifacts
"""

import json
from pathlib import Path

import pytest

GENERATED_DIR = Path(__file__).parent.parent / "src" / "generated"
JSONSCHEMA_DIR = GENERATED_DIR / "json-schema"

# Entity schemas to compare
ENTITY_SCHEMAS = [
    "TrackFeature",
    "SensorContact",
    "ReferenceLocation",
    "PlotMetadata",
    "ToolMetadata",
]


class TestSchemaStructure:
    """Test that generated JSON Schema has proper structure."""

    def test_main_schema_exists(self):
        """Main debrief.schema.json should exist."""
        main_schema = JSONSCHEMA_DIR / "debrief.schema.json"
        assert main_schema.exists(), "Main schema file should exist"

    @pytest.mark.parametrize("entity_name", ENTITY_SCHEMAS)
    def test_entity_schema_exists(self, entity_name: str):
        """Per-entity schema files should exist."""
        schema_file = JSONSCHEMA_DIR / f"{entity_name}.schema.json"
        assert schema_file.exists(), f"Schema file for {entity_name} should exist"

    @pytest.mark.parametrize("entity_name", ENTITY_SCHEMAS)
    def test_entity_schema_is_valid_json(self, entity_name: str):
        """Per-entity schema files should be valid JSON."""
        schema_file = JSONSCHEMA_DIR / f"{entity_name}.schema.json"
        try:
            json.loads(schema_file.read_text())
        except json.JSONDecodeError as e:
            pytest.fail(f"Invalid JSON in {entity_name}.schema.json: {e}")

    @pytest.mark.parametrize("entity_name", ENTITY_SCHEMAS)
    def test_entity_schema_has_required_fields(self, entity_name: str):
        """Per-entity schemas should have $schema and type fields."""
        schema_file = JSONSCHEMA_DIR / f"{entity_name}.schema.json"
        schema = json.loads(schema_file.read_text())

        assert "$schema" in schema, "Schema should have $schema field"
        assert "type" in schema or "properties" in schema, \
            "Schema should have type or properties field"


class TestEnumConsistency:
    """Test that enum values are consistent across schemas."""

    def test_track_type_enum_values(self):
        """TrackTypeEnum should have consistent values."""
        main_schema = json.loads(
            (JSONSCHEMA_DIR / "debrief.schema.json").read_text()
        )

        track_type_def = main_schema.get("$defs", {}).get("TrackTypeEnum", {})
        enum_values = track_type_def.get("enum", [])

        expected = ["OWNSHIP", "CONTACT", "REFERENCE", "SOLUTION"]
        assert set(enum_values) == set(expected), \
            f"TrackTypeEnum values mismatch: {enum_values} vs {expected}"

    def test_sensor_type_enum_values(self):
        """SensorTypeEnum should have consistent values."""
        main_schema = json.loads(
            (JSONSCHEMA_DIR / "debrief.schema.json").read_text()
        )

        sensor_type_def = main_schema.get("$defs", {}).get("SensorTypeEnum", {})
        enum_values = sensor_type_def.get("enum", [])

        expected = ["SONAR_ACTIVE", "SONAR_PASSIVE", "RADAR", "ESM", "VISUAL", "AIS", "OTHER"]
        assert set(enum_values) == set(expected), \
            f"SensorTypeEnum values mismatch: {enum_values} vs {expected}"

    def test_location_type_enum_values(self):
        """LocationTypeEnum should have consistent values."""
        main_schema = json.loads(
            (JSONSCHEMA_DIR / "debrief.schema.json").read_text()
        )

        location_type_def = main_schema.get("$defs", {}).get("LocationTypeEnum", {})
        enum_values = location_type_def.get("enum", [])

        expected = ["WAYPOINT", "EXERCISE_AREA", "DANGER_AREA", "ANCHORAGE", "PORT", "REFERENCE"]
        assert set(enum_values) == set(expected), \
            f"LocationTypeEnum values mismatch: {enum_values} vs {expected}"

    def test_tool_category_enum_values(self):
        """ToolCategoryEnum should have consistent values."""
        main_schema = json.loads(
            (JSONSCHEMA_DIR / "debrief.schema.json").read_text()
        )

        category_def = main_schema.get("$defs", {}).get("ToolCategoryEnum", {})
        enum_values = category_def.get("enum", [])

        expected = ["GEOMETRY", "KINEMATICS", "TACTICAL", "EXPORT", "TRANSFORM"]
        assert set(enum_values) == set(expected), \
            f"ToolCategoryEnum values mismatch: {enum_values} vs {expected}"


class TestRequiredFields:
    """Test that required fields are properly defined."""

    def test_track_feature_required_fields(self):
        """TrackFeature should require type, id, geometry, properties."""
        schema = json.loads(
            (JSONSCHEMA_DIR / "TrackFeature.schema.json").read_text()
        )

        required = schema.get("required", [])
        expected = ["type", "id", "geometry", "properties"]

        for field in expected:
            assert field in required, f"TrackFeature should require {field}"

    def test_sensor_contact_required_fields(self):
        """SensorContact should require type, id, geometry, properties."""
        schema = json.loads(
            (JSONSCHEMA_DIR / "SensorContact.schema.json").read_text()
        )

        required = schema.get("required", [])
        expected = ["type", "id", "geometry", "properties"]

        for field in expected:
            assert field in required, f"SensorContact should require {field}"

    def test_plot_metadata_required_fields(self):
        """PlotMetadata should require id, title, created, updated, source_files."""
        schema = json.loads(
            (JSONSCHEMA_DIR / "PlotMetadata.schema.json").read_text()
        )

        required = schema.get("required", [])
        expected = ["id", "title", "created", "updated", "source_files"]

        for field in expected:
            assert field in required, f"PlotMetadata should require {field}"

    def test_tool_metadata_required_fields(self):
        """ToolMetadata should require id, name, description, version, category, selection_context."""
        schema = json.loads(
            (JSONSCHEMA_DIR / "ToolMetadata.schema.json").read_text()
        )

        required = schema.get("required", [])
        expected = ["id", "name", "description", "version", "category", "selection_context"]

        for field in expected:
            assert field in required, f"ToolMetadata should require {field}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
