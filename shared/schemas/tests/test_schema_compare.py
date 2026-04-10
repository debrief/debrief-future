"""
Schema comparison tests.

Verifies that generated schemas maintain structural consistency:
- Required fields match between LinkML and Pydantic
- Enum values are consistent across generators
- Type definitions align between generated artifacts

Tracer bullet implementation: TrackFeature and ReferenceLocation only.
"""

import json
from pathlib import Path

import pytest

GENERATED_DIR = Path(__file__).parent.parent / "src" / "generated"
JSONSCHEMA_DIR = GENERATED_DIR / "json-schema"

# Entity schemas to compare (tracer bullet: 2 entities)
ENTITY_SCHEMAS = [
    "TrackFeature",
    "ReferenceLocation",
]


class TestSchemaStructure:
    """Test that generated JSON Schema has proper structure."""

    def test_main_schema_exists(self) -> None:
        """Main debrief.schema.json should exist."""
        main_schema = JSONSCHEMA_DIR / "debrief.schema.json"
        assert main_schema.exists(), "Main schema file should exist"

    @pytest.mark.parametrize("entity_name", ENTITY_SCHEMAS)
    def test_entity_schema_exists(self, entity_name: str) -> None:
        """Per-entity schema files should exist."""
        schema_file = JSONSCHEMA_DIR / f"{entity_name}.schema.json"
        assert schema_file.exists(), f"Schema file for {entity_name} should exist"

    @pytest.mark.parametrize("entity_name", ENTITY_SCHEMAS)
    def test_entity_schema_is_valid_json(self, entity_name: str) -> None:
        """Per-entity schema files should be valid JSON."""
        schema_file = JSONSCHEMA_DIR / f"{entity_name}.schema.json"
        try:
            json.loads(schema_file.read_text())
        except json.JSONDecodeError as e:
            pytest.fail(f"Invalid JSON in {entity_name}.schema.json: {e}")

    @pytest.mark.parametrize("entity_name", ENTITY_SCHEMAS)
    def test_entity_schema_has_required_fields(self, entity_name: str) -> None:
        """Per-entity schemas should have $schema and type fields."""
        schema_file = JSONSCHEMA_DIR / f"{entity_name}.schema.json"
        schema = json.loads(schema_file.read_text())

        assert "$schema" in schema, "Schema should have $schema field"
        assert "type" in schema or "properties" in schema, (
            "Schema should have type or properties field"
        )


class TestEnumConsistency:
    """Test that enum values are consistent across schemas."""

    def test_track_type_enum_values(self) -> None:
        """TrackTypeEnum should have consistent values."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())

        track_type_def = main_schema.get("$defs", {}).get("TrackTypeEnum", {})
        enum_values = track_type_def.get("enum", [])

        expected = ["OWNSHIP", "CONTACT", "REFERENCE", "SOLUTION"]
        assert set(enum_values) == set(expected), (
            f"TrackTypeEnum values mismatch: {enum_values} vs {expected}"
        )

    def test_location_type_enum_values(self) -> None:
        """LocationTypeEnum should have consistent values."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())

        location_type_def = main_schema.get("$defs", {}).get("LocationTypeEnum", {})
        enum_values = location_type_def.get("enum", [])

        expected = ["WAYPOINT", "EXERCISE_AREA", "DANGER_AREA", "ANCHORAGE", "PORT", "REFERENCE"]
        assert set(enum_values) == set(expected), (
            f"LocationTypeEnum values mismatch: {enum_values} vs {expected}"
        )

    def test_segment_type_enum_values(self) -> None:
        """SegmentTypeEnum should have consistent values."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())

        segment_type_def = main_schema.get("$defs", {}).get("SegmentTypeEnum", {})
        enum_values = segment_type_def.get("enum", [])

        expected = ["TRACK", "ABSOLUTE_TMA", "RELATIVE_TMA", "DYNAMIC_INFILL"]
        assert set(enum_values) == set(expected), (
            f"SegmentTypeEnum values mismatch: {enum_values} vs {expected}"
        )

    def test_feature_kind_enum_values(self) -> None:
        """FeatureKindEnum should include all feature type discriminators."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())

        feature_kind_def = main_schema.get("$defs", {}).get("FeatureKindEnum", {})
        enum_values = feature_kind_def.get("enum", [])

        expected = [
            "TRACK",
            "POINT",
            "NARRATIVE",
            "CIRCLE",
            "RECTANGLE",
            "LINE",
            "TEXT",
            "VECTOR",
            "SYSTEM",
            "POLY",
            "MULTI_POINT",
            "MULTI_POLYGON",
            "SYSTEM_RECORD",
        ]
        assert set(enum_values) == set(expected), (
            f"FeatureKindEnum values mismatch: {enum_values} vs {expected}"
        )


    def test_array_centre_mode_enum_values(self) -> None:
        """ArrayCentreModeEnum should have consistent values."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())

        enum_def = main_schema.get("$defs", {}).get("ArrayCentreModeEnum", {})
        enum_values = enum_def.get("enum", [])

        expected = ["PLAIN", "WORM", "MEASURED"]
        assert set(enum_values) == set(expected), (
            f"ArrayCentreModeEnum values mismatch: {enum_values} vs {expected}"
        )

    def test_line_style_enum_values(self) -> None:
        """LineStyleEnum should have consistent values."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())

        enum_def = main_schema.get("$defs", {}).get("LineStyleEnum", {})
        enum_values = enum_def.get("enum", [])

        expected = ["SOLID", "DASHED", "DOT", "DASH_DOT"]
        assert set(enum_values) == set(expected), (
            f"LineStyleEnum values mismatch: {enum_values} vs {expected}"
        )

    def test_label_location_enum_values(self) -> None:
        """LabelLocationEnum should have consistent values."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())

        enum_def = main_schema.get("$defs", {}).get("LabelLocationEnum", {})
        enum_values = enum_def.get("enum", [])

        expected = ["LEFT", "CENTER", "RIGHT"]
        assert set(enum_values) == set(expected), (
            f"LabelLocationEnum values mismatch: {enum_values} vs {expected}"
        )

    def test_line_label_position_enum_values(self) -> None:
        """LineLabelPositionEnum should have consistent values."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())

        enum_def = main_schema.get("$defs", {}).get("LineLabelPositionEnum", {})
        enum_values = enum_def.get("enum", [])

        expected = ["START", "MIDDLE", "END"]
        assert set(enum_values) == set(expected), (
            f"LineLabelPositionEnum values mismatch: {enum_values} vs {expected}"
        )


class TestSensorSchemaStructure:
    """Test that SensorData and SensorContact definitions are correct in JSON Schema."""

    def test_sensor_data_properties_exist(self) -> None:
        """SensorData should have all expected properties."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())
        sensor_data = main_schema.get("$defs", {}).get("SensorData", {})
        properties = sensor_data.get("properties", {})

        expected_fields = [
            "name", "base_frequency", "offset", "array_centre_mode",
            "worm_in_hole", "color", "visible", "line_thickness",
            "contacts", "measured_positions",
        ]
        for field in expected_fields:
            assert field in properties, f"SensorData should have {field} property"

    def test_sensor_contact_properties_exist(self) -> None:
        """SensorContact should have all expected properties."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())
        sensor_contact = main_schema.get("$defs", {}).get("SensorContact", {})
        properties = sensor_contact.get("properties", {})

        expected_fields = [
            "time", "bearing", "has_bearing", "ambiguous_bearing", "has_ambiguous",
            "range", "frequency", "has_frequency", "label", "comment",
            "color", "visible", "show_label", "line_style", "label_location",
            "put_label_at", "origin",
        ]
        for field in expected_fields:
            assert field in properties, f"SensorContact should have {field} property"

    def test_measured_array_position_properties_exist(self) -> None:
        """MeasuredArrayPosition should have time and location."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())
        measured = main_schema.get("$defs", {}).get("MeasuredArrayPosition", {})
        properties = measured.get("properties", {})

        assert "time" in properties, "MeasuredArrayPosition should have time"
        assert "location" in properties, "MeasuredArrayPosition should have location"

    def test_sensor_data_required_fields(self) -> None:
        """SensorData should require name and contacts."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())
        sensor_data = main_schema.get("$defs", {}).get("SensorData", {})
        required = sensor_data.get("required", [])

        assert "name" in required, "SensorData should require 'name'"
        assert "contacts" in required, "SensorData should require 'contacts'"

    def test_sensor_contact_required_fields(self) -> None:
        """SensorContact should require time and bearing."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())
        sensor_contact = main_schema.get("$defs", {}).get("SensorContact", {})
        required = sensor_contact.get("required", [])

        assert "time" in required, "SensorContact should require 'time'"
        assert "bearing" in required, "SensorContact should require 'bearing'"

    def test_origin_coordinate_pair_schema(self) -> None:
        """SensorContact.origin should be array of exactly 2 floats (nullable)."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())
        sensor_contact = main_schema.get("$defs", {}).get("SensorContact", {})
        origin_prop = sensor_contact.get("properties", {}).get("origin", {})

        # Nullable types use ["array", "null"] form
        origin_type = origin_prop.get("type")
        if isinstance(origin_type, list):
            assert "array" in origin_type, "origin type should include 'array'"
        else:
            assert origin_type == "array", "origin should be array"
        assert origin_prop.get("items", {}).get("type") == "number", "origin items should be numbers"

    def test_measured_position_location_schema(self) -> None:
        """MeasuredArrayPosition.location should be array of exactly 2 floats."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())
        measured = main_schema.get("$defs", {}).get("MeasuredArrayPosition", {})
        location_prop = measured.get("properties", {}).get("location", {})

        location_type = location_prop.get("type")
        if isinstance(location_type, list):
            assert "array" in location_type, "location type should include 'array'"
        else:
            assert location_type == "array", "location should be array"
        assert location_prop.get("items", {}).get("type") == "number", "location items should be numbers"


class TestRequiredFields:
    """Test that required fields are properly defined."""

    def test_track_feature_required_fields(self) -> None:
        """TrackFeature should require type, id, geometry, properties."""
        schema = json.loads((JSONSCHEMA_DIR / "TrackFeature.schema.json").read_text())

        required = schema.get("required", [])
        expected = ["type", "id", "geometry", "properties"]

        for field in expected:
            assert field in required, f"TrackFeature should require {field}"

    def test_track_feature_geometry_union(self) -> None:
        """TrackFeature geometry should accept LineString or MultiLineString."""
        schema = json.loads((JSONSCHEMA_DIR / "TrackFeature.schema.json").read_text())

        geometry_prop = schema.get("properties", {}).get("geometry", {})
        any_of = geometry_prop.get("anyOf", [])
        assert len(any_of) >= 2, "geometry should have anyOf with at least 2 options"

        refs = [opt.get("$ref", "") for opt in any_of]
        assert any("GeoJSONLineString" in r for r in refs), (
            "geometry anyOf should include GeoJSONLineString"
        )
        assert any("GeoJSONMultiLineString" in r for r in refs), (
            "geometry anyOf should include GeoJSONMultiLineString"
        )

    def test_track_properties_has_compound_fields(self) -> None:
        """TrackProperties should have segments, sensors, tuas fields."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())

        track_props = main_schema.get("$defs", {}).get("TrackProperties", {})
        properties = track_props.get("properties", {})

        for field in ["segments", "sensors", "tuas"]:
            assert field in properties, f"TrackProperties should have {field} field"

    def test_reference_location_required_fields(self) -> None:
        """ReferenceLocation should require type, id, geometry, properties."""
        schema = json.loads((JSONSCHEMA_DIR / "ReferenceLocation.schema.json").read_text())

        required = schema.get("required", [])
        expected = ["type", "id", "geometry", "properties"]

        for field in expected:
            assert field in required, f"ReferenceLocation should require {field}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
