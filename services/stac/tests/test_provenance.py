"""Tests for provenance — verifies the unified provenance module from debrief-calc.

The duplicate STAC provenance module (debrief_stac.provenance) was removed
as part of #070 (PROV Schema Foundation). All provenance is now handled by
debrief_calc.provenance using the PROV-aligned format.

These tests verify that the unified module works correctly for STAC use cases.
"""

from debrief_calc.provenance import attach_log_entry, create_log_entry


class TestUnifiedProvenance:
    """Tests for unified provenance via debrief-calc module."""

    def test_basic_provenance_on_feature(self) -> None:
        feature = {"type": "Feature", "geometry": None, "properties": {"name": "Track A"}}
        entry = create_log_entry(
            tool_name="track-smoother",
            tool_version="1.0.0",
            source_features=[{"id": "track_a", "properties": {"kind": "TRACK"}, "geometry": None}],
            duration_ms=100.0,
        )

        result = attach_log_entry(feature, entry)

        prov = result["properties"]["provenance"]
        assert isinstance(prov, list)
        assert len(prov) == 1
        assert prov[0]["was_generated_by"]["tool"] == "track-smoother"
        assert prov[0]["was_generated_by"]["tool_version"] == "1.0.0"
        assert "activity_id" in prov[0]
        assert "timestamp" in prov[0]
        assert prov[0]["used"] == ["track_a"]

    def test_provenance_with_parameters(self) -> None:
        feature = {"type": "Feature", "geometry": None, "properties": {}}
        entry = create_log_entry(
            tool_name="cpa-calculator",
            tool_version="2.0.0",
            source_features=[
                {"id": "track_a", "properties": {"kind": "TRACK"}, "geometry": None},
                {"id": "track_b", "properties": {"kind": "TRACK"}, "geometry": None},
            ],
            parameters={"threshold": 500},
            duration_ms=200.0,
        )

        result = attach_log_entry(feature, entry)

        prov = result["properties"]["provenance"][0]
        assert prov["was_generated_by"]["tool"] == "cpa-calculator"
        assert prov["used"] == ["track_a", "track_b"]
        # Parameters are serialized as a list of ParameterValue objects
        param_values = [p["value"] for p in prov["was_generated_by"]["parameters"]]
        assert "500" in param_values

    def test_provenance_modifies_in_place(self) -> None:
        feature = {"type": "Feature", "geometry": None, "properties": {}}
        entry = create_log_entry(
            tool_name="tool",
            tool_version="1.0",
            source_features=[{"id": "f1", "properties": {"kind": "TRACK"}, "geometry": None}],
            duration_ms=0.0,
        )
        result = attach_log_entry(feature, entry)
        assert result is feature
        assert "provenance" in feature["properties"]

    def test_provenance_creates_properties_if_missing(self) -> None:
        feature = {"type": "Feature", "geometry": None}
        entry = create_log_entry(
            tool_name="tool",
            tool_version="1.0",
            source_features=[{"id": "f1", "properties": {"kind": "TRACK"}, "geometry": None}],
            duration_ms=0.0,
        )
        result = attach_log_entry(feature, entry)
        assert "provenance" in result["properties"]

    def test_provenance_timestamp_is_iso(self) -> None:
        feature = {"type": "Feature", "geometry": None, "properties": {}}
        entry = create_log_entry(
            tool_name="tool",
            tool_version="1.0",
            source_features=[{"id": "f1", "properties": {"kind": "TRACK"}, "geometry": None}],
            duration_ms=0.0,
        )
        attach_log_entry(feature, entry)
        ts = feature["properties"]["provenance"][0]["timestamp"]
        assert "T" in ts

    def test_provenance_multiple_sources(self) -> None:
        feature = {"type": "Feature", "geometry": None, "properties": {}}
        entry = create_log_entry(
            tool_name="tool",
            tool_version="1.0",
            source_features=[
                {"id": "a", "properties": {"kind": "TRACK"}, "geometry": None},
                {"id": "b", "properties": {"kind": "TRACK"}, "geometry": None},
                {"id": "c", "properties": {"kind": "TRACK"}, "geometry": None},
            ],
            duration_ms=0.0,
        )
        attach_log_entry(feature, entry)
        used = feature["properties"]["provenance"][0]["used"]
        assert len(used) == 3
        assert used == ["a", "b", "c"]
