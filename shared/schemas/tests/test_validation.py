"""Tests for the schema validation module.

Tests FEATURE_MODEL_MAP, validate_feature(), validate_features(),
resolve_feature_model(), resolve_enum_values(), and SchemaValidationError.
"""

import json
import sys
from pathlib import Path

import pytest

from debrief_schemas.validation import (
    FEATURE_MODEL_MAP,
    FieldError,
    SchemaValidationError,
    resolve_enum_values,
    resolve_feature_model,
    validate_feature,
    validate_features,
)

# Import generated Storyboard/Scene models for negative-case validation (#215).
sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from pydantic import ValidationError  # noqa: E402

from debrief_schemas import SceneFeature  # noqa: E402  (path-dependent import)

INVALID_FIXTURES_DIR = Path(__file__).parent.parent / "src" / "fixtures" / "invalid"

# ============================================================================
# T009: Tests for FEATURE_MODEL_MAP covering all 12 feature kinds
# ============================================================================


class TestFeatureModelMap:
    """Tests for the FEATURE_MODEL_MAP dispatch dictionary."""

    ALL_KINDS = [
        "TRACK",
        "POINT",
        "NARRATIVE",
        "CIRCLE",
        "RECTANGLE",
        "LINE",
        "TEXT",
        "VECTOR",
        "POLY",
        "MULTI_POINT",
        "MULTI_POLYGON",
        "SYSTEM",
    ]

    def test_map_has_all_12_kinds(self) -> None:
        """FEATURE_MODEL_MAP contains an entry for every FeatureKindEnum value."""
        assert len(FEATURE_MODEL_MAP) == 12
        for kind in self.ALL_KINDS:
            assert kind in FEATURE_MODEL_MAP, f"Missing kind: {kind}"

    def test_map_values_are_pydantic_models(self) -> None:
        """Every value in FEATURE_MODEL_MAP is a Pydantic model class."""
        from pydantic import BaseModel

        for kind, model in FEATURE_MODEL_MAP.items():
            assert issubclass(model, BaseModel), f"{kind} -> {model} is not a Pydantic model"

    def test_track_maps_to_track_feature(self) -> None:
        from debrief_schemas import TrackFeature

        assert FEATURE_MODEL_MAP["TRACK"] is TrackFeature

    def test_point_maps_to_reference_location(self) -> None:
        from debrief_schemas import ReferenceLocation

        assert FEATURE_MODEL_MAP["POINT"] is ReferenceLocation

    def test_system_maps_to_system_state(self) -> None:
        from debrief_schemas import SystemState

        assert FEATURE_MODEL_MAP["SYSTEM"] is SystemState


# ============================================================================
# T010: Tests for validate_feature() success and failure paths
# ============================================================================


class TestValidateFeature:
    """Tests for validate_feature() function."""

    @pytest.fixture
    def valid_reference_location(self) -> dict:
        return {
            "type": "Feature",
            "id": "ref-001",
            "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
            "properties": {
                "kind": "POINT",
                "name": "Test Location",
                "location_type": "REFERENCE",
                "style": {
                    "shape": "square",
                    "color": "#666666",
                    "radius": 5,
                    "fill": True,
                    "fill_color": "#666666",
                    "fill_opacity": 0.8,
                    "stroke": True,
                    "weight": 1,
                    "opacity": 1.0,
                },
            },
        }

    def test_valid_feature_passes(self, valid_reference_location: dict) -> None:
        """A valid feature passes validation without error."""
        validate_feature(valid_reference_location, "tool_output")

    def test_missing_properties_raises(self) -> None:
        """Feature without properties raises SchemaValidationError."""
        feature = {"type": "Feature", "id": "x", "geometry": None}
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_feature(feature, "tool_output")
        assert "Missing properties" in str(exc_info.value)

    def test_missing_kind_raises(self) -> None:
        """Feature without kind in properties raises SchemaValidationError."""
        feature = {
            "type": "Feature",
            "id": "x",
            "geometry": None,
            "properties": {"name": "test"},
        }
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_feature(feature, "tool_output")
        assert "Missing kind" in str(exc_info.value)

    def test_unknown_kind_raises(self) -> None:
        """Feature with an unrecognised kind raises SchemaValidationError."""
        feature = {
            "type": "Feature",
            "id": "x",
            "geometry": None,
            "properties": {"kind": "UNKNOWN_KIND"},
        }
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_feature(feature, "tool_output")
        assert "Unknown feature kind" in str(exc_info.value)

    def test_invalid_field_raises(self, valid_reference_location: dict) -> None:
        """Feature with a field of the wrong type raises SchemaValidationError."""
        valid_reference_location["properties"]["location_type"] = 12345  # should be string
        with pytest.raises(SchemaValidationError):
            validate_feature(valid_reference_location, "tool_input")

    def test_boundary_recorded_in_error(self) -> None:
        """The boundary name is included in the error."""
        feature = {
            "type": "Feature",
            "id": "x",
            "geometry": None,
            "properties": {"kind": "UNKNOWN_KIND"},
        }
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_feature(feature, "catalog_write")
        assert exc_info.value.boundary == "catalog_write"


# ============================================================================
# T011: Tests for validate_features() batch validation
# ============================================================================


class TestValidateFeatures:
    """Tests for validate_features() batch wrapper."""

    @pytest.fixture
    def valid_reference(self) -> dict:
        return {
            "type": "Feature",
            "id": "ref-001",
            "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
            "properties": {
                "kind": "POINT",
                "name": "Test",
                "location_type": "REFERENCE",
                "style": {
                    "shape": "square",
                    "color": "#666666",
                    "radius": 5,
                    "fill": True,
                    "fill_color": "#666666",
                    "fill_opacity": 0.8,
                    "stroke": True,
                    "weight": 1,
                    "opacity": 1.0,
                },
            },
        }

    def test_all_valid_passes(self, valid_reference: dict) -> None:
        """A list of valid features passes validation."""
        validate_features([valid_reference, valid_reference], "tool_input")

    def test_empty_list_passes(self) -> None:
        """An empty feature list passes validation."""
        validate_features([], "tool_input")

    def test_first_invalid_fails_fast(self, valid_reference: dict) -> None:
        """Validation stops at the first invalid feature (fail-fast)."""
        invalid = {"type": "Feature", "id": "x", "geometry": None, "properties": {}}
        with pytest.raises(SchemaValidationError):
            validate_features([invalid, valid_reference], "tool_input")


# ============================================================================
# T012: Tests for resolve_feature_model()
# ============================================================================


class TestResolveFeatureModel:
    """Tests for resolve_feature_model() function."""

    def test_known_kind_returns_model(self) -> None:
        from debrief_schemas import TrackFeature

        assert resolve_feature_model("TRACK") is TrackFeature

    def test_unknown_kind_returns_none(self) -> None:
        assert resolve_feature_model("NONEXISTENT") is None


# ============================================================================
# T013: Tests for resolve_enum_values() for all 6 enum types
# ============================================================================


class TestResolveEnumValues:
    """Tests for resolve_enum_values() function."""

    def test_named_color(self) -> None:
        values = resolve_enum_values("NamedColor")
        assert values is not None
        assert "red" in values
        assert "green" in values
        assert len(values) == 11

    def test_marker_symbol(self) -> None:
        values = resolve_enum_values("MarkerSymbol")
        assert values is not None
        assert "circle" in values
        assert "square" in values
        assert len(values) == 5

    def test_duration_preset(self) -> None:
        values = resolve_enum_values("DurationPreset")
        assert values is not None
        assert "PT1M" in values
        assert "PT24H" in values
        assert len(values) == 9

    def test_reference_point_pattern(self) -> None:
        values = resolve_enum_values("ReferencePointPattern")
        assert values is not None
        assert values == {"grid", "scatter"}

    def test_cardinal_direction(self) -> None:
        values = resolve_enum_values("CardinalDirection")
        assert values is not None
        assert "N" in values
        assert len(values) == 8

    def test_numeric_preset(self) -> None:
        values = resolve_enum_values("NumericPreset")
        assert values is not None
        assert len(values) == 7

    def test_unknown_enum_returns_none(self) -> None:
        assert resolve_enum_values("UnknownEnum") is None


# ============================================================================
# T014: Tests for SchemaValidationError string formatting
# ============================================================================


class TestSchemaValidationError:
    """Tests for SchemaValidationError string formatting."""

    def test_str_includes_boundary(self) -> None:
        err = SchemaValidationError(
            boundary="tool_output",
            feature_id="track-001",
            feature_kind="TRACK",
            errors=[
                FieldError(
                    field_path="properties.name",
                    expected="string",
                    actual="int",
                    message="wrong type",
                )
            ],
        )
        s = str(err)
        assert "tool_output" in s
        assert "track-001" in s
        assert "TRACK" in s

    def test_str_includes_field_errors(self) -> None:
        err = SchemaValidationError(
            boundary="parser_output",
            feature_id="ref-001",
            feature_kind="POINT",
            errors=[
                FieldError(
                    field_path="properties.name",
                    expected="string",
                    actual="int",
                    message="wrong type",
                ),
                FieldError(
                    field_path="properties.style",
                    expected="object",
                    actual="null",
                    message="required",
                ),
            ],
        )
        s = str(err)
        assert "properties.name" in s
        assert "properties.style" in s

    def test_empty_errors_no_crash(self) -> None:
        err = SchemaValidationError(
            boundary="tool_input",
            feature_id=None,
            feature_kind=None,
            errors=[],
        )
        str(err)  # Should not raise


# ============================================================================
# T076: Integration test — rename a schema field → Python validation catches it
# ============================================================================


class TestSchemaFieldRename:
    """Verify that renaming a field in a feature is caught by schema validation.

    Simulates the scenario where a schema field is renamed (e.g., ``name`` →
    ``display_name``) and ensures that all boundaries reject the stale field.
    """

    @pytest.fixture
    def valid_reference(self) -> dict:
        """A known-good ReferenceLocation (POINT) feature."""
        return {
            "type": "Feature",
            "id": "ref-rename-test",
            "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
            "properties": {
                "kind": "POINT",
                "name": "Alpha Point",
                "location_type": "REFERENCE",
                "style": {
                    "shape": "square",
                    "color": "#666666",
                    "radius": 5,
                    "fill": True,
                    "fill_color": "#666666",
                    "fill_opacity": 0.8,
                    "stroke": True,
                    "weight": 1,
                    "opacity": 1.0,
                },
            },
        }

    def test_renamed_field_rejected_at_tool_output(self, valid_reference: dict) -> None:
        """A feature with a renamed field (name → display_name) fails tool_output validation."""
        # Simulate a schema change: 'name' is renamed to 'display_name'
        valid_reference["properties"]["display_name"] = valid_reference["properties"].pop("name")
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_feature(valid_reference, "tool_output")
        assert exc_info.value.boundary == "tool_output"
        assert exc_info.value.feature_kind == "POINT"
        # The error should mention the missing required 'name' field
        error_str = str(exc_info.value)
        assert "name" in error_str.lower() or len(exc_info.value.errors) > 0

    def test_renamed_field_rejected_at_parser_output(self, valid_reference: dict) -> None:
        """A feature with a renamed field fails parser_output validation."""
        valid_reference["properties"]["display_name"] = valid_reference["properties"].pop("name")
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_feature(valid_reference, "parser_output")
        assert exc_info.value.boundary == "parser_output"

    def test_renamed_field_rejected_at_catalog_write(self, valid_reference: dict) -> None:
        """A feature with a renamed field fails catalog_write validation."""
        valid_reference["properties"]["display_name"] = valid_reference["properties"].pop("name")
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_feature(valid_reference, "catalog_write")
        assert exc_info.value.boundary == "catalog_write"

    def test_renamed_field_rejected_at_tool_input(self, valid_reference: dict) -> None:
        """A feature with a renamed field fails tool_input validation."""
        valid_reference["properties"]["display_name"] = valid_reference["properties"].pop("name")
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_feature(valid_reference, "tool_input")
        assert exc_info.value.boundary == "tool_input"

    def test_original_valid_after_no_rename(self, valid_reference: dict) -> None:
        """Baseline: the un-modified feature passes all boundaries."""
        for boundary in ("tool_input", "tool_output", "parser_output", "catalog_write"):
            validate_feature(valid_reference, boundary)  # no error


# ============================================================================
# T077: Integration test — add required field → constructors without it fail
# ============================================================================


class TestSchemaNewRequiredField:
    """Verify that missing a required schema field is caught.

    Tests that if a new required field were added to the schema, all features
    lacking it would be rejected. We simulate this by omitting existing
    required fields.
    """

    def test_missing_required_location_type_rejected(self) -> None:
        """POINT feature missing required 'location_type' is rejected."""
        feature = {
            "type": "Feature",
            "id": "ref-missing-field",
            "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
            "properties": {
                "kind": "POINT",
                "name": "Test Location",
                # 'location_type' is intentionally missing
                "style": {
                    "shape": "square",
                    "color": "#666666",
                    "radius": 5,
                    "fill": True,
                    "fill_color": "#666666",
                    "fill_opacity": 0.8,
                    "stroke": True,
                    "weight": 1,
                    "opacity": 1.0,
                },
            },
        }
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_feature(feature, "tool_output")
        assert exc_info.value.feature_kind == "POINT"
        assert len(exc_info.value.errors) > 0

    def test_missing_required_kind_rejected(self) -> None:
        """Feature missing 'kind' discriminator is rejected at every boundary."""
        feature = {
            "type": "Feature",
            "id": "no-kind",
            "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
            "properties": {"name": "Test"},
        }
        for boundary in ("tool_input", "tool_output", "parser_output", "catalog_write"):
            with pytest.raises(SchemaValidationError) as exc_info:
                validate_feature(feature, boundary)
            assert "Missing kind" in str(exc_info.value)

    def test_missing_required_style_rejected(self) -> None:
        """POINT feature missing required 'style' is rejected."""
        feature = {
            "type": "Feature",
            "id": "ref-no-style",
            "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
            "properties": {
                "kind": "POINT",
                "name": "No Style Point",
                "location_type": "REFERENCE",
                # 'style' is intentionally missing
            },
        }
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_feature(feature, "tool_output")
        assert exc_info.value.feature_kind == "POINT"

    def test_batch_validation_catches_missing_field_first(self) -> None:
        """validate_features() stops at the first feature missing a required field."""
        good = {
            "type": "Feature",
            "id": "good-ref",
            "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
            "properties": {
                "kind": "POINT",
                "name": "Good",
                "location_type": "REFERENCE",
                "style": {
                    "shape": "square",
                    "color": "#666666",
                    "radius": 5,
                    "fill": True,
                    "fill_color": "#666666",
                    "fill_opacity": 0.8,
                    "stroke": True,
                    "weight": 1,
                    "opacity": 1.0,
                },
            },
        }
        bad = {
            "type": "Feature",
            "id": "bad-ref",
            "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
            "properties": {
                "kind": "POINT",
                "name": "Bad",
                # missing location_type and style
            },
        }
        with pytest.raises(SchemaValidationError):
            validate_features([good, bad], "tool_output")


# ============================================================================
# Storyboarding (#215) — schema-level negative invariant coverage (SC-003).
# Each case corresponds to one invalid fixture under src/fixtures/invalid/.
# ============================================================================


class TestStoryboardingNegativeFixtures:
    """Schema rejects storyboard/scene fixtures that violate reserved-slot
    and cross-reference invariants declared in #215.
    """

    def _load(self, name: str) -> dict:
        return json.loads((INVALID_FIXTURES_DIR / name).read_text())

    def test_rejects_non_null_time_range(self) -> None:
        """Pre-#263 invariant: legacy fixture with stringified time_range.

        Under #215/#259 `time_range` was a `string` reserved slot that MUST
        be null. Under #263 it is a `TimeRange` sub-record. The legacy
        fixture's stringified JSON-as-`time_range` is now invalid for a
        structural reason (string ≠ TimeRange object), so Pydantic rejects
        it at the type layer. The spirit of the invariant survives: an
        ill-formed `time_range` is still rejected.
        """
        fixture = self._load("storyboard-scene-non-null-time-range.json")
        with pytest.raises(ValidationError) as exc_info:
            SceneFeature(**fixture)
        # Error must name the time_range field
        error_text = str(exc_info.value).lower()
        assert "time_range" in error_text

    def test_rejects_bearing_nonzero(self) -> None:
        """FR-SCHEMA-005: viewport.bearing MUST be 0 in schema v1."""
        fixture = self._load("storyboard-scene-bearing-nonzero.json")
        with pytest.raises(ValidationError) as exc_info:
            SceneFeature(**fixture)
        # Error must name the bearing field in some form
        error_text = str(exc_info.value)
        assert "bearing" in error_text.lower()

    def test_rejects_duplicate_creation_order_detected_by_module_layer(self) -> None:
        """FC-I4 (#259): duplicate `creation_order` within a Storyboard is
        rejected at the module validator. Replaces the pre-#259
        duplicate-timestamp test — equality on `timestamp` is now allowed
        and is broken by `creation_order` as a secondary sort key.

        The fixture is a valid collection of individually-valid
        SceneFeatures sharing a `creation_order`; the module-layer
        validator detects the cross-Feature collision.
        """
        fixture = self._load("storyboard-scene-duplicate-creation-order.json")
        features = fixture["features"]
        scene_features = [f for f in features if f["properties"]["kind"] == "STORYBOARD_SCENE"]
        assert len(scene_features) == 2
        for scene in scene_features:
            SceneFeature(**scene)  # Each parses individually
        # Both share the same creation_order — module validator rejects.
        assert (
            scene_features[0]["properties"]["creation_order"]
            == scene_features[1]["properties"]["creation_order"]
        )

    def test_rejects_missing_creation_order_at_pydantic_layer(self) -> None:
        """FC-I5 (#259): pre-#259 Scenes (no `creation_order`) are rejected
        at the Pydantic layer because `creation_order` is now a required
        slot on `SceneProperties`."""
        fixture = self._load("storyboard-scene-missing-creation-order.json")
        features = fixture["features"]
        scene = next(f for f in features if f["properties"]["kind"] == "STORYBOARD_SCENE")
        with pytest.raises(ValidationError) as exc_info:
            SceneFeature(**scene)
        assert "creation_order" in str(exc_info.value).lower()

    def test_rejects_orphan_scene_detected_by_module_layer(self) -> None:
        """FR-SCHEMA-007: Scene.storyboard_id must reference an existing
        Storyboard — cross-Feature invariant, enforced at the module layer.
        This test confirms the orphan Scene still parses individually.
        """
        fixture = self._load("storyboard-scene-orphan.json")
        features = fixture["features"]
        scene = features[0]
        parsed = SceneFeature(**scene)
        # storyboard_id references an id not present elsewhere in the collection
        other_ids = {
            f["properties"]["id"] for f in features if f["properties"]["kind"] == "STORYBOARD"
        }
        assert parsed.properties.storyboard_id not in other_ids
