"""Unit tests for debrief-calc provenance module."""

import json as _json_module
from datetime import UTC, datetime

from debrief_calc.models import InputFeatureState, LogEntry, ParameterValue, Provenance, SourceRef
from debrief_calc.provenance import (
    _duration_ms_to_iso8601,
    attach_log_entry,
    attach_provenance,
    create_log_entry,
    create_provenance,
    set_output_kind,
)


class TestDurationConversion:
    """Tests for ISO 8601 duration conversion."""

    def test_whole_seconds(self) -> None:
        assert _duration_ms_to_iso8601(1000.0) == "PT1S"
        assert _duration_ms_to_iso8601(0.0) == "PT0S"

    def test_fractional_seconds(self) -> None:
        assert _duration_ms_to_iso8601(300.0) == "PT0.3S"
        assert _duration_ms_to_iso8601(1200.0) == "PT1.2S"

    def test_small_fractions(self) -> None:
        result = _duration_ms_to_iso8601(10.0)
        assert result == "PT0.01S"


class TestCreateLogEntry:
    """Tests for create_log_entry function."""

    def test_create_basic_log_entry(self) -> None:
        features = [{"id": "track-001", "properties": {"kind": "TRACK"}, "geometry": None}]
        entry = create_log_entry(
            tool_name="track-stats",
            tool_version="1.0.0",
            source_features=features,
            duration_ms=300.0,
        )

        assert entry.was_generated_by.tool == "track-stats"
        assert entry.was_generated_by.tool_version == "1.0.0"
        assert entry.used == ["track-001"]
        assert entry.generated == []
        assert entry.execution_duration == "PT0.3S"
        assert entry.generated_result_id is None
        assert entry.tune is None
        assert isinstance(entry.activity_id, str)
        assert len(entry.activity_id) == 36  # UUID format
        assert isinstance(entry.timestamp, datetime)

    def test_create_log_entry_with_parameters(self) -> None:
        """Generated WasGeneratedBy.parameters is a list; values are looked up by index."""
        features = [{"id": "f1", "properties": {"kind": "TRACK"}, "geometry": None}]
        entry = create_log_entry(
            tool_name="tool",
            tool_version="2.0.0",
            source_features=features,
            parameters={"unit": "nm", "format": "json"},
            duration_ms=100.0,
        )

        assert len(entry.was_generated_by.parameters) == 2
        # Generated model uses list[ParameterValue]; access by index
        values = [pv.value for pv in entry.was_generated_by.parameters]
        assert "nm" in values

    def test_create_log_entry_with_typed_parameters(self) -> None:
        features = [{"id": "f1", "properties": {"kind": "TRACK"}, "geometry": None}]
        entry = create_log_entry(
            tool_name="tool",
            tool_version="1.0.0",
            source_features=features,
            parameters={"interval": ParameterValue(value="60", default=True, tunable=True)},
            duration_ms=0.0,
        )

        assert len(entry.was_generated_by.parameters) == 1
        pv = entry.was_generated_by.parameters[0]
        assert pv.value == "60"
        assert pv.default is True
        assert pv.tunable is True

    def test_create_log_entry_with_custom_timestamp(self) -> None:
        features = [{"id": "f1", "properties": {"kind": "TRACK"}, "geometry": None}]
        custom_time = datetime(2026, 1, 15, 12, 0, 0, tzinfo=UTC)

        entry = create_log_entry(
            tool_name="tool",
            tool_version="1.0.0",
            source_features=features,
            timestamp=custom_time,
            duration_ms=0.0,
        )

        assert entry.timestamp == custom_time

    def test_create_log_entry_multiple_sources(self) -> None:
        features = [
            {"id": "track-001", "properties": {"kind": "TRACK"}, "geometry": None},
            {"id": "track-002", "properties": {"kind": "TRACK"}, "geometry": None},
            {"id": "zone-001", "properties": {"kind": "ZONE"}, "geometry": None},
        ]
        entry = create_log_entry(
            tool_name="multi-tool",
            tool_version="1.0.0",
            source_features=features,
            duration_ms=0.0,
        )

        assert entry.used == ["track-001", "track-002", "zone-001"]

    def test_create_log_entry_missing_id(self) -> None:
        features = [{"properties": {"kind": "TRACK"}, "geometry": None}]
        entry = create_log_entry(
            tool_name="tool", tool_version="1.0.0", source_features=features, duration_ms=0.0
        )

        assert entry.used == ["unknown"]

    def test_create_log_entry_with_custom_activity_id(self) -> None:
        features = [{"id": "f1", "properties": {"kind": "TRACK"}, "geometry": None}]
        entry = create_log_entry(
            tool_name="tool",
            tool_version="1.0.0",
            source_features=features,
            duration_ms=0.0,
            activity_id="custom-id-123",
        )

        assert entry.activity_id == "custom-id-123"

    def test_create_log_entry_with_generated(self) -> None:
        features = [{"id": "f1", "properties": {"kind": "TRACK"}, "geometry": None}]
        entry = create_log_entry(
            tool_name="tool",
            tool_version="1.0.0",
            source_features=features,
            duration_ms=0.0,
            generated=["result-001", "./assets/output.png"],
            generated_result_id="bt_plot_001",
        )

        assert entry.generated == ["result-001", "./assets/output.png"]
        assert entry.generated_result_id == "bt_plot_001"


class TestAttachLogEntry:
    """Tests for attach_log_entry function."""

    def _make_entry(self, tool: str = "test-tool", activity_id: str = "act-001") -> LogEntry:
        return create_log_entry(
            tool_name=tool,
            tool_version="1.0.0",
            source_features=[{"id": "src-1", "properties": {"kind": "TRACK"}, "geometry": None}],
            duration_ms=100.0,
            activity_id=activity_id,
        )

    def test_attach_log_entry_creates_array(self) -> None:
        """Generated models serialize with snake_case field names."""
        feature = {"type": "Feature", "properties": {"data": "test"}, "geometry": None}
        entry = self._make_entry()

        result = attach_log_entry(feature, entry)

        assert result is feature
        prov = feature["properties"]["provenance"]
        assert isinstance(prov, list)
        assert len(prov) == 1
        assert prov[0]["activity_id"] == "act-001"
        assert prov[0]["was_generated_by"]["tool"] == "test-tool"
        assert prov[0]["was_generated_by"]["tool_version"] == "1.0.0"

    def test_attach_log_entry_appends_to_array(self) -> None:
        feature = {"type": "Feature", "properties": {"provenance": []}, "geometry": None}
        entry1 = self._make_entry(activity_id="act-001")
        entry2 = self._make_entry(tool="second-tool", activity_id="act-002")

        attach_log_entry(feature, entry1)
        attach_log_entry(feature, entry2)

        prov = feature["properties"]["provenance"]
        assert len(prov) == 2
        assert prov[0]["activity_id"] == "act-001"
        assert prov[1]["activity_id"] == "act-002"

    def test_attach_log_entry_creates_properties(self) -> None:
        feature = {"type": "Feature", "geometry": None}
        entry = self._make_entry()

        attach_log_entry(feature, entry)

        assert "properties" in feature
        assert "provenance" in feature["properties"]

    def test_attach_log_entry_wraps_legacy_dict(self) -> None:
        legacy_prov = {"tool": "old-tool", "version": "1.0.0", "timestamp": "2026-01-01T00:00:00Z"}
        feature = {"type": "Feature", "properties": {"provenance": legacy_prov}, "geometry": None}
        entry = self._make_entry()

        attach_log_entry(feature, entry)

        prov = feature["properties"]["provenance"]
        assert isinstance(prov, list)
        assert len(prov) == 2
        assert prov[0] == legacy_prov  # Legacy entry preserved
        assert prov[1]["activity_id"] == "act-001"  # New entry appended (snake_case)

    def test_attach_log_entry_shared_activity_id(self) -> None:
        feature1 = {"type": "Feature", "properties": {}, "geometry": None}
        feature2 = {"type": "Feature", "properties": {}, "geometry": None}
        entry = self._make_entry(activity_id="shared-uuid")

        attach_log_entry(feature1, entry)
        attach_log_entry(feature2, entry)

        assert feature1["properties"]["provenance"][0]["activity_id"] == "shared-uuid"
        assert feature2["properties"]["provenance"][0]["activity_id"] == "shared-uuid"

    def test_attach_log_entry_iso_duration(self) -> None:
        feature = {"type": "Feature", "properties": {}, "geometry": None}
        entry = self._make_entry()

        attach_log_entry(feature, entry)

        prov = feature["properties"]["provenance"][0]
        assert prov["execution_duration"] == "PT0.1S"

    def test_attach_log_entry_snake_case_keys(self) -> None:
        """Generated models serialize with snake_case field names (no camelCase aliases)."""
        feature = {"type": "Feature", "properties": {}, "geometry": None}
        entry = self._make_entry()

        attach_log_entry(feature, entry)

        prov = feature["properties"]["provenance"][0]
        # Verify snake_case keys (generated models have no camelCase aliases)
        assert "activity_id" in prov
        assert "was_generated_by" in prov
        assert "execution_duration" in prov
        assert "generated_result_id" in prov
        # Verify no camelCase keys
        assert "activityId" not in prov
        assert "wasGeneratedBy" not in prov
        assert "executionDuration" not in prov


class TestCreateProvenance:
    """Tests for deprecated create_provenance function (backward compat)."""

    def test_create_basic_provenance(self) -> None:
        features = [{"id": "track-001", "properties": {"kind": "TRACK"}, "geometry": None}]
        prov = create_provenance(
            tool_name="track-stats", tool_version="1.0.0", source_features=features
        )

        assert prov.tool == "track-stats"
        assert prov.version == "1.0.0"
        assert len(prov.sources) == 1
        assert prov.sources[0].id == "track-001"
        assert prov.sources[0].kind == "TRACK"
        assert prov.parameters == {}
        assert isinstance(prov.timestamp, datetime)


class TestAttachProvenance:
    """Tests for deprecated attach_provenance function (backward compat)."""

    def test_attach_provenance_to_feature(self) -> None:
        feature = {"type": "Feature", "properties": {"data": "test"}, "geometry": None}
        prov = Provenance(
            tool="test-tool", version="1.0.0", sources=[SourceRef(id="src-1", kind="TRACK")]
        )

        result = attach_provenance(feature, prov)

        assert result is feature
        assert "provenance" in feature["properties"]
        assert feature["properties"]["provenance"]["tool"] == "test-tool"


class TestSetOutputKind:
    """Tests for set_output_kind function."""

    def test_set_kind(self) -> None:
        feature = {"type": "Feature", "properties": {}, "geometry": None}

        result = set_output_kind(feature, "track/statistics")

        assert result is feature
        assert feature["properties"]["kind"] == "track/statistics"

    def test_set_kind_creates_properties(self) -> None:
        feature = {"type": "Feature", "geometry": None}

        set_output_kind(feature, "result")

        assert feature["properties"]["kind"] == "result"

    def test_set_kind_preserves_existing(self) -> None:
        """Tool-assigned kind should be preserved, not overwritten by output_kind."""
        feature = {"type": "Feature", "properties": {"kind": "ZONE"}, "geometry": None}

        set_output_kind(feature, "addition/feature")

        assert feature["properties"]["kind"] == "ZONE"


class TestInputFeatureState:
    """Tests for InputFeatureState model creation and serialization (T007).

    NOTE: Generated InputFeatureState uses snake_case field names (feature_id)
    and geometry/properties typed as str (serialized JSON strings per LinkML).
    """

    def test_create_input_feature_state(self) -> None:
        geom_json = _json_module.dumps(
            {"type": "Polygon", "coordinates": [[[0.0, 50.0], [0.01, 50.01], [0.0, 50.0]]]}
        )
        props_json = _json_module.dumps({"kind": "CIRCLE", "center": [0.0, 50.0]})
        state = InputFeatureState(
            feature_id="circle-001",
            geometry=geom_json,
            properties=props_json,
        )
        assert state.feature_id == "circle-001"
        assert _json_module.loads(state.geometry)["type"] == "Polygon"
        assert state.properties is not None
        assert _json_module.loads(state.properties)["center"] == [0.0, 50.0]

    def test_create_input_feature_state_no_properties(self) -> None:
        geom_json = _json_module.dumps({"type": "Point", "coordinates": [0.0, 50.0]})
        state = InputFeatureState(
            feature_id="text-001",
            geometry=geom_json,
        )
        assert state.feature_id == "text-001"
        assert state.properties is None

    def test_input_feature_state_serializes_snake_case(self) -> None:
        """Generated models serialize with snake_case keys (no camelCase aliases)."""
        geom_json = _json_module.dumps({"type": "Polygon", "coordinates": [[[0.0, 50.0]]]})
        state = InputFeatureState(
            feature_id="circle-001",
            geometry=geom_json,
        )
        data = state.model_dump(mode="json")
        assert "feature_id" in data
        assert data["feature_id"] == "circle-001"

    def test_input_feature_state_snake_case_constructor(self) -> None:
        """Generated model uses snake_case; feature_id is the field name."""
        geom_json = _json_module.dumps({"type": "Point", "coordinates": [1.0, 2.0]})
        state = InputFeatureState(feature_id="f1", geometry=geom_json)
        assert state.feature_id == "f1"


class TestLogEntryWithInputState:
    """Tests for LogEntry with input_state field (T008).

    NOTE: Generated models use snake_case; input_state replaces inputState alias.
    InputFeatureState.geometry is str (JSON), not dict.
    """

    def test_log_entry_with_input_state_serializes_snake_case(self) -> None:
        """Generated models serialize with snake_case field names."""
        geom_json = _json_module.dumps({"type": "Polygon", "coordinates": [[[0.0, 50.0]]]})
        state = InputFeatureState(
            feature_id="circle-001",
            geometry=geom_json,
        )
        entry = create_log_entry(
            tool_name="move-shape",
            tool_version="1.0.0",
            source_features=[
                {"id": "circle-001", "properties": {"kind": "CIRCLE"}, "geometry": None}
            ],
            duration_ms=12.0,
            input_state=[state],
        )

        data = entry.model_dump(mode="json")
        assert "input_state" in data
        assert "inputState" not in data
        assert len(data["input_state"]) == 1
        assert data["input_state"][0]["feature_id"] == "circle-001"

    def test_log_entry_without_input_state(self) -> None:
        entry = create_log_entry(
            tool_name="track-stats",
            tool_version="1.0.0",
            source_features=[{"id": "t1", "properties": {"kind": "TRACK"}, "geometry": None}],
            duration_ms=0.0,
        )

        data = entry.model_dump(mode="json")
        assert data["input_state"] is None


class TestCreateLogEntryWithInputState:
    """Tests for create_log_entry() with input_state parameter (T009, T010)."""

    def test_create_log_entry_with_input_state(self) -> None:
        geom_json = _json_module.dumps({"type": "Polygon", "coordinates": [[[0.0, 50.0]]]})
        state = InputFeatureState(
            feature_id="circle-001",
            geometry=geom_json,
        )
        entry = create_log_entry(
            tool_name="move-shape",
            tool_version="1.0.0",
            source_features=[
                {"id": "circle-001", "properties": {"kind": "CIRCLE"}, "geometry": None}
            ],
            duration_ms=10.0,
            input_state=[state],
        )

        assert entry.input_state is not None
        assert len(entry.input_state) == 1
        assert entry.input_state[0].feature_id == "circle-001"

    def test_create_log_entry_without_input_state_returns_none(self) -> None:
        entry = create_log_entry(
            tool_name="track-stats",
            tool_version="1.0.0",
            source_features=[{"id": "t1", "properties": {"kind": "TRACK"}, "geometry": None}],
            duration_ms=0.0,
        )

        assert entry.input_state is None


class TestLogEntryRoundTrip:
    """Tests for LogEntry round-trip with input_state (T011).

    NOTE: Generated models serialize to snake_case (no camelCase aliases).
    InputFeatureState.geometry is a JSON string, not a dict.
    """

    def test_round_trip_preserves_input_state(self) -> None:
        geom_dict = {
            "type": "Polygon",
            "coordinates": [[[0.0, 50.0], [0.01, 50.01], [-0.01, 50.01], [0.0, 50.0]]],
        }
        props_dict = {"kind": "CIRCLE", "center": [0.0, 50.0], "radius": 1000.0}
        geom_json = _json_module.dumps(geom_dict)
        props_json = _json_module.dumps(props_dict)
        state = InputFeatureState(
            feature_id="circle-001",
            geometry=geom_json,
            properties=props_json,
        )
        original = create_log_entry(
            tool_name="move-shape",
            tool_version="1.0.0",
            source_features=[
                {"id": "circle-001", "properties": {"kind": "CIRCLE"}, "geometry": None}
            ],
            duration_ms=12.0,
            input_state=[state],
            activity_id="test-round-trip",
        )

        # Serialize to JSON dict (snake_case)
        json_data = original.model_dump(mode="json")

        # Deserialize back to LogEntry
        restored = LogEntry.model_validate(json_data)

        assert restored.input_state is not None
        assert len(restored.input_state) == 1
        assert restored.input_state[0].feature_id == "circle-001"
        assert _json_module.loads(restored.input_state[0].geometry)["type"] == "Polygon"
        assert restored.input_state[0].properties == props_json

    def test_round_trip_preserves_null_input_state(self) -> None:
        original = create_log_entry(
            tool_name="track-stats",
            tool_version="1.0.0",
            source_features=[{"id": "t1", "properties": {"kind": "TRACK"}, "geometry": None}],
            duration_ms=0.0,
            activity_id="test-null-round-trip",
        )

        json_data = original.model_dump(mode="json")
        restored = LogEntry.model_validate(json_data)

        assert restored.input_state is None
