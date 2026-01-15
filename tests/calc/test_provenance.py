"""Unit tests for debrief-calc provenance module."""

import pytest
from datetime import datetime

from debrief_calc.provenance import (
    create_provenance,
    attach_provenance,
    set_output_kind,
)
from debrief_calc.models import Provenance, SourceRef


class TestCreateProvenance:
    """Tests for create_provenance function."""

    def test_create_basic_provenance(self):
        features = [
            {"id": "track-001", "properties": {"kind": "track"}, "geometry": None}
        ]
        prov = create_provenance(
            tool_name="track-stats",
            tool_version="1.0.0",
            source_features=features
        )

        assert prov.tool == "track-stats"
        assert prov.version == "1.0.0"
        assert len(prov.sources) == 1
        assert prov.sources[0].id == "track-001"
        assert prov.sources[0].kind == "track"
        assert prov.parameters == {}
        assert isinstance(prov.timestamp, datetime)

    def test_create_provenance_with_parameters(self):
        features = [{"id": "f1", "properties": {"kind": "track"}, "geometry": None}]
        prov = create_provenance(
            tool_name="tool",
            tool_version="2.0.0",
            source_features=features,
            parameters={"unit": "nm", "format": "json"}
        )

        assert prov.parameters == {"unit": "nm", "format": "json"}

    def test_create_provenance_with_custom_timestamp(self):
        features = [{"id": "f1", "properties": {"kind": "track"}, "geometry": None}]
        custom_time = datetime(2026, 1, 15, 12, 0, 0)

        prov = create_provenance(
            tool_name="tool",
            tool_version="1.0.0",
            source_features=features,
            timestamp=custom_time
        )

        assert prov.timestamp == custom_time

    def test_create_provenance_multiple_sources(self):
        features = [
            {"id": "track-001", "properties": {"kind": "track"}, "geometry": None},
            {"id": "track-002", "properties": {"kind": "track"}, "geometry": None},
            {"id": "zone-001", "properties": {"kind": "zone"}, "geometry": None}
        ]
        prov = create_provenance(
            tool_name="multi-tool",
            tool_version="1.0.0",
            source_features=features
        )

        assert len(prov.sources) == 3
        assert prov.sources[0].id == "track-001"
        assert prov.sources[1].id == "track-002"
        assert prov.sources[2].id == "zone-001"
        assert prov.sources[2].kind == "zone"

    def test_create_provenance_missing_id(self):
        features = [{"properties": {"kind": "track"}, "geometry": None}]
        prov = create_provenance(
            tool_name="tool",
            tool_version="1.0.0",
            source_features=features
        )

        assert prov.sources[0].id == "unknown"

    def test_create_provenance_missing_kind(self):
        features = [{"id": "f1", "properties": {}, "geometry": None}]
        prov = create_provenance(
            tool_name="tool",
            tool_version="1.0.0",
            source_features=features
        )

        assert prov.sources[0].kind == "unknown"


class TestAttachProvenance:
    """Tests for attach_provenance function."""

    def test_attach_provenance_to_feature(self):
        feature = {"type": "Feature", "properties": {"data": "test"}, "geometry": None}
        prov = Provenance(
            tool="test-tool",
            version="1.0.0",
            sources=[SourceRef(id="src-1", kind="track")]
        )

        result = attach_provenance(feature, prov)

        assert result is feature  # Returns same object
        assert "provenance" in feature["properties"]
        assert feature["properties"]["provenance"]["tool"] == "test-tool"
        assert feature["properties"]["provenance"]["version"] == "1.0.0"

    def test_attach_provenance_creates_properties(self):
        feature = {"type": "Feature", "geometry": None}
        prov = Provenance(tool="t", version="1.0.0")

        attach_provenance(feature, prov)

        assert "properties" in feature
        assert "provenance" in feature["properties"]

    def test_attach_provenance_includes_sources(self):
        feature = {"type": "Feature", "properties": {}, "geometry": None}
        prov = Provenance(
            tool="tool",
            version="1.0.0",
            sources=[
                SourceRef(id="a", kind="track"),
                SourceRef(id="b", kind="zone")
            ]
        )

        attach_provenance(feature, prov)

        sources = feature["properties"]["provenance"]["sources"]
        assert len(sources) == 2
        assert sources[0] == {"id": "a", "kind": "track"}
        assert sources[1] == {"id": "b", "kind": "zone"}

    def test_attach_provenance_includes_parameters(self):
        feature = {"type": "Feature", "properties": {}, "geometry": None}
        prov = Provenance(
            tool="tool",
            version="1.0.0",
            parameters={"unit": "nm"}
        )

        attach_provenance(feature, prov)

        assert feature["properties"]["provenance"]["parameters"] == {"unit": "nm"}

    def test_attach_provenance_timestamp_format(self):
        feature = {"type": "Feature", "properties": {}, "geometry": None}
        prov = Provenance(
            tool="tool",
            version="1.0.0",
            timestamp=datetime(2026, 1, 15, 10, 30, 0)
        )

        attach_provenance(feature, prov)

        ts = feature["properties"]["provenance"]["timestamp"]
        assert ts == "2026-01-15T10:30:00Z"


class TestSetOutputKind:
    """Tests for set_output_kind function."""

    def test_set_kind(self):
        feature = {"type": "Feature", "properties": {}, "geometry": None}

        result = set_output_kind(feature, "track-statistics")

        assert result is feature
        assert feature["properties"]["kind"] == "track-statistics"

    def test_set_kind_creates_properties(self):
        feature = {"type": "Feature", "geometry": None}

        set_output_kind(feature, "result")

        assert feature["properties"]["kind"] == "result"

    def test_set_kind_overwrites_existing(self):
        feature = {"type": "Feature", "properties": {"kind": "old"}, "geometry": None}

        set_output_kind(feature, "new")

        assert feature["properties"]["kind"] == "new"
