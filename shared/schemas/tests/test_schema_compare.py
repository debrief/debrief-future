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
            # Storyboarding (#215) — added by the storyboard.yaml module
            "STORYBOARD",
            "STORYBOARD_SCENE",
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


class TestFeature205EnumParity:
    """LinkML ↔ Pydantic parity for Feature 205 enums (FR-008 / SC-005).

    PlaybackStateEnum / DisplayModeEnum are emitted by gen-pydantic and
    gen-typescript but NOT by gen-json-schema, because the JSON Schema
    generator runs against `debrief-jsonschema.yaml` which deliberately
    excludes the `session-state` module to sidestep a gen-json-schema
    bug with multivalued-class ranges (see the file's header comment).
    The parity contract therefore covers the two generators that
    actually emit these enums — Pydantic and TypeScript (via the
    generated `types.ts`).
    """

    def _load_linkml_enum(self, enum_name: str) -> set[str]:
        import yaml  # noqa: PLC0415

        # PlaybackStateEnum / DisplayModeEnum / TimeUnitEnum were consolidated
        # into common.yaml as their single source of truth (feature 261,
        # FR-002a) so SystemStateProperties (geojson.yaml) and SceneProperties
        # (storyboard.yaml) can reference them without re-importing
        # session-state.yaml.
        linkml_file = Path(__file__).parent.parent / "src" / "linkml" / "common.yaml"
        data = yaml.safe_load(linkml_file.read_text())
        perms = data.get("enums", {}).get(enum_name, {}).get("permissible_values", {}) or {}
        return set(perms.keys())

    def _load_pydantic_enum(self, enum_name: str) -> set[str]:
        import sys  # noqa: PLC0415

        sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
        import debrief_schemas  # noqa: PLC0415

        cls = getattr(debrief_schemas, enum_name)
        return set(cls._member_map_.keys())

    def _load_typescript_enum(self, enum_name: str) -> set[str]:
        import re  # noqa: PLC0415

        ts_file = Path(__file__).parent.parent / "src" / "generated" / "typescript" / "types.ts"
        content = ts_file.read_text(encoding="utf-8")
        # Match: `export enum <EnumName> { ... members ... }`
        # Members: `    name = "value",`
        pattern = re.compile(
            rf"export enum {re.escape(enum_name)} \{{([^}}]*)\}}",
            re.DOTALL,
        )
        match = pattern.search(content)
        if not match:
            return set()
        members = re.findall(r'(\w+)\s*=\s*"[^"]*"', match.group(1))
        return set(members)

    def test_playback_state_enum_canonical_values(self) -> None:
        """PlaybackStateEnum has canonical values stopped|playing|paused (FR-005 / SC-005)."""
        assert self._load_linkml_enum("PlaybackStateEnum") == {
            "stopped",
            "playing",
            "paused",
        }

    def test_display_mode_enum_canonical_values(self) -> None:
        """DisplayModeEnum has canonical values full|trail (FR-002 / SC-003)."""
        assert self._load_linkml_enum("DisplayModeEnum") == {"full", "trail"}

    def test_display_mode_enum_has_no_legacy_values(self) -> None:
        """Legacy 'normal'/'snailTrail' values MUST NOT appear in DisplayModeEnum (SC-003)."""
        linkml_vals = self._load_linkml_enum("DisplayModeEnum")
        pydantic_vals = self._load_pydantic_enum("DisplayModeEnum")
        typescript_vals = self._load_typescript_enum("DisplayModeEnum")

        legacy = {"normal", "snailTrail"}
        for name, vals in [
            ("LinkML", linkml_vals),
            ("Pydantic", pydantic_vals),
            ("TypeScript", typescript_vals),
        ]:
            leaked = vals & legacy
            assert not leaked, (
                f"DisplayModeEnum still carries legacy values in {name}: {leaked}. "
                "These must be removed per Feature 205 / FR-002."
            )

    def test_playback_state_enum_three_way_parity(self) -> None:
        linkml = self._load_linkml_enum("PlaybackStateEnum")
        pydantic_vals = self._load_pydantic_enum("PlaybackStateEnum")
        typescript_vals = self._load_typescript_enum("PlaybackStateEnum")

        assert linkml == pydantic_vals == typescript_vals, (
            f"PlaybackStateEnum drift: "
            f"LinkML={sorted(linkml)}, "
            f"Pydantic={sorted(pydantic_vals)}, "
            f"TypeScript={sorted(typescript_vals)}"
        )

    def test_display_mode_enum_three_way_parity(self) -> None:
        linkml = self._load_linkml_enum("DisplayModeEnum")
        pydantic_vals = self._load_pydantic_enum("DisplayModeEnum")
        typescript_vals = self._load_typescript_enum("DisplayModeEnum")

        assert linkml == pydantic_vals == typescript_vals, (
            f"DisplayModeEnum drift: "
            f"LinkML={sorted(linkml)}, "
            f"Pydantic={sorted(pydantic_vals)}, "
            f"TypeScript={sorted(typescript_vals)}"
        )


class TestSensorSchemaStructure:
    """Test that SensorData and SensorContact definitions are correct in JSON Schema."""

    def test_sensor_data_properties_exist(self) -> None:
        """SensorData should have all expected properties."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())
        sensor_data = main_schema.get("$defs", {}).get("SensorData", {})
        properties = sensor_data.get("properties", {})

        expected_fields = [
            "name",
            "base_frequency",
            "offset",
            "array_centre_mode",
            "worm_in_hole",
            "color",
            "visible",
            "line_thickness",
            "contacts",
            "measured_positions",
        ]
        for field in expected_fields:
            assert field in properties, f"SensorData should have {field} property"

    def test_sensor_contact_properties_exist(self) -> None:
        """SensorContact should have all expected properties."""
        main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())
        sensor_contact = main_schema.get("$defs", {}).get("SensorContact", {})
        properties = sensor_contact.get("properties", {})

        expected_fields = [
            "time",
            "bearing",
            "has_bearing",
            "ambiguous_bearing",
            "has_ambiguous",
            "range",
            "frequency",
            "has_frequency",
            "label",
            "comment",
            "color",
            "visible",
            "show_label",
            "line_style",
            "label_location",
            "put_label_at",
            "origin",
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
        assert origin_prop.get("items", {}).get("type") == "number", (
            "origin items should be numbers"
        )

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
        assert location_prop.get("items", {}).get("type") == "number", (
            "location items should be numbers"
        )


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


class TestStoryboardSchemaGeneration:
    """Storyboarding (#215) — Pydantic-generated vs LinkML-generated schema equality.

    The Article II.3 obligation: Pydantic-generated and LinkML-generated JSON
    Schemas match field-for-field for Storyboard/Scene/Viewport. The existing
    pipeline only emits one JSON Schema per entity (via gen-json-schema), so
    this test walks the generated schema and asserts the Storyboard/Scene/
    Viewport definitions contain every property declared in the LinkML source.
    """

    def _load_main_schema(self) -> dict:
        return json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())

    def test_storyboard_properties_exist(self) -> None:
        """StoryboardProperties should have all expected fields."""
        main_schema = self._load_main_schema()
        props = main_schema.get("$defs", {}).get("StoryboardProperties", {}).get("properties", {})
        for field in ("kind", "id", "name", "description", "schema_version"):
            assert field in props, f"StoryboardProperties missing {field!r}"

    def test_scene_properties_exist(self) -> None:
        """SceneProperties should have all expected fields."""
        main_schema = self._load_main_schema()
        props = main_schema.get("$defs", {}).get("SceneProperties", {}).get("properties", {})
        expected = [
            "kind",
            "id",
            "storyboard_id",
            "title",
            "description",
            "viewport",
            "timestamp",
            "time_range",
            "visible_feature_ids",
            "feature_set_hash",
            "thumbnail_asset_ref",
            "transition_duration_ms",
        ]
        for field in expected:
            assert field in props, f"SceneProperties missing {field!r}"

    def test_viewport_properties_exist(self) -> None:
        """Viewport sub-record should have center/zoom/bearing."""
        main_schema = self._load_main_schema()
        props = main_schema.get("$defs", {}).get("Viewport", {}).get("properties", {})
        for field in ("center", "zoom", "bearing"):
            assert field in props, f"Viewport missing {field!r}"

    def test_scene_feature_set_hash_pattern(self) -> None:
        """feature_set_hash must be a 64-char lowercase hex string."""
        main_schema = self._load_main_schema()
        hash_prop = (
            main_schema.get("$defs", {})
            .get("SceneProperties", {})
            .get("properties", {})
            .get("feature_set_hash", {})
        )
        pattern = hash_prop.get("pattern", "")
        assert pattern == "^[0-9a-f]{64}$", f"feature_set_hash pattern mismatch: {pattern!r}"

    def test_viewport_bearing_reserved_to_zero(self) -> None:
        """Viewport.bearing MUST be 0 (v1 reserved slot)."""
        main_schema = self._load_main_schema()
        bearing_prop = (
            main_schema.get("$defs", {})
            .get("Viewport", {})
            .get("properties", {})
            .get("bearing", {})
        )
        # Encoded as minimum=0, maximum=0 for cross-generator portability
        assert bearing_prop.get("minimum") == 0, "bearing minimum should be 0"
        assert bearing_prop.get("maximum") == 0, "bearing maximum should be 0"

    def test_scene_ulid_pattern(self) -> None:
        """SceneProperties.id MUST match the Crockford-base-32 ULID pattern."""
        main_schema = self._load_main_schema()
        id_prop = (
            main_schema.get("$defs", {})
            .get("SceneProperties", {})
            .get("properties", {})
            .get("id", {})
        )
        assert id_prop.get("pattern") == "^[0-9A-HJKMNP-TV-Z]{26}$"

    def test_storyboard_pydantic_vs_linkml_schema(self) -> None:
        """SC-002: Pydantic-generated JSON Schema matches LinkML-generated JSON Schema
        field-for-field for Storyboard/Scene/Viewport.

        The repo has a single generator path (LinkML → gen-json-schema), so the
        Pydantic side is proved equivalent by round-tripping Pydantic model
        schemas through ``.model_json_schema()`` and checking the required
        properties line up.
        """
        import sys

        sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
        from debrief_schemas import SceneFeature, StoryboardFeature, Viewport

        main_schema = self._load_main_schema()
        defs = main_schema.get("$defs", {})

        # Storyboard — LinkML-generated vs Pydantic-derived property names
        pydantic_sb_props = set(StoryboardFeature.model_json_schema()["properties"].keys())
        linkml_sb_props = set(defs.get("StoryboardFeature", {}).get("properties", {}).keys())
        assert pydantic_sb_props == linkml_sb_props, (
            f"StoryboardFeature field drift: Pydantic {pydantic_sb_props} "
            f"vs LinkML {linkml_sb_props}"
        )

        # Scene
        pydantic_sc_props = set(SceneFeature.model_json_schema()["properties"].keys())
        linkml_sc_props = set(defs.get("SceneFeature", {}).get("properties", {}).keys())
        assert pydantic_sc_props == linkml_sc_props, (
            f"SceneFeature field drift: Pydantic {pydantic_sc_props} vs LinkML {linkml_sc_props}"
        )

        # Viewport
        pydantic_vp_props = set(Viewport.model_json_schema()["properties"].keys())
        linkml_vp_props = set(defs.get("Viewport", {}).get("properties", {}).keys())
        assert pydantic_vp_props == linkml_vp_props, (
            f"Viewport field drift: Pydantic {pydantic_vp_props} vs LinkML {linkml_vp_props}"
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
