"""Tests for provenance writing."""

from debrief_stac.provenance import write_provenance


class TestWriteProvenance:
    def test_basic_provenance(self):
        feature = {"type": "Feature", "geometry": None, "properties": {"name": "Track A"}}
        result = write_provenance(feature, "track-smoother", "1.0.0", ["track_a"])

        prov = result["properties"]["prov"]
        assert prov["tool"] == "track-smoother"
        assert prov["version"] == "1.0.0"
        assert "timestamp" in prov
        assert len(prov["sources"]) == 1
        assert prov["sources"][0]["id"] == "track_a"
        assert prov["sources"][0]["kind"] == "feature"
        assert prov["parameters"] == {}

    def test_provenance_with_parameters(self):
        feature = {"type": "Feature", "geometry": None, "properties": {}}
        result = write_provenance(
            feature, "cpa-calculator", "2.0.0",
            ["track_a", "track_b"],
            parameters={"threshold": 500}
        )

        prov = result["properties"]["prov"]
        assert prov["tool"] == "cpa-calculator"
        assert len(prov["sources"]) == 2
        assert prov["parameters"] == {"threshold": 500}

    def test_provenance_modifies_in_place(self):
        feature = {"type": "Feature", "geometry": None, "properties": {}}
        result = write_provenance(feature, "tool", "1.0", ["f1"])
        assert result is feature
        assert "prov" in feature["properties"]

    def test_provenance_creates_properties_if_missing(self):
        feature = {"type": "Feature", "geometry": None}
        result = write_provenance(feature, "tool", "1.0", ["f1"])
        assert "prov" in result["properties"]

    def test_provenance_timestamp_is_iso(self):
        feature = {"type": "Feature", "geometry": None, "properties": {}}
        write_provenance(feature, "tool", "1.0", ["f1"])
        ts = feature["properties"]["prov"]["timestamp"]
        # Should be parseable as ISO format
        assert "T" in ts

    def test_provenance_multiple_sources(self):
        feature = {"type": "Feature", "geometry": None, "properties": {}}
        write_provenance(feature, "tool", "1.0", ["a", "b", "c"])
        sources = feature["properties"]["prov"]["sources"]
        assert len(sources) == 3
        assert [s["id"] for s in sources] == ["a", "b", "c"]
