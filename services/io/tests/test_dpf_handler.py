"""Tests for DPF format handler.

Tests cover:
- DPF XML parsing (with and without namespace)
- Track extraction (fixes, coordinates, timestamps)
- Sensor contact extraction
- TMA solution extraction
- Narrative extraction
- longLocation DMS coordinate parsing
- Error handling for malformed XML
"""

import xml.etree.ElementTree as ET
from pathlib import Path

from debrief_io.handlers.dpf import DPFHandler, _parse_dtg, _parse_location

FIXTURES = Path(__file__).parent / "fixtures" / "valid"


class TestParseDtg:
    """Tests for DTG timestamp parsing."""

    def test_6_digit_date(self) -> None:
        dt = _parse_dtg("951212 050000")
        assert dt is not None
        assert dt.year == 1995
        assert dt.month == 12
        assert dt.day == 12
        assert dt.hour == 5
        assert dt.minute == 0
        assert dt.second == 0

    def test_8_digit_date(self) -> None:
        dt = _parse_dtg("20240301 080000")
        assert dt is not None
        assert dt.year == 2024
        assert dt.month == 3
        assert dt.day == 1

    def test_milliseconds(self) -> None:
        dt = _parse_dtg("951212 054902.486")
        assert dt is not None
        assert dt.second == 2
        assert dt.microsecond == 486000

    def test_null_sentinel(self) -> None:
        assert _parse_dtg("691231 235959.999") is None

    def test_invalid_format(self) -> None:
        assert _parse_dtg("bad data") is None

    def test_2_digit_year_below_50(self) -> None:
        dt = _parse_dtg("240301 120000")
        assert dt is not None
        assert dt.year == 2024


class TestParseLocation:
    """Tests for location parsing from XML elements."""

    def test_short_location(self) -> None:
        xml = '<centre><shortLocation Depth="10.0" Lat="22.186" Long="-21.698"/></centre>'
        elem = ET.fromstring(xml)
        result = _parse_location(elem, None)
        assert result is not None
        lat, lon, depth = result
        assert abs(lat - 22.186) < 0.001
        assert abs(lon - (-21.698)) < 0.001
        assert abs(depth - 10.0) < 0.001

    def test_long_location(self) -> None:
        xml = (
            "<centre>"
            '<longLocation LatDeg="12" LatMin="11" LatSec="10.630" LatHem="N"'
            ' LongDeg="11" LongMin="41" LongSec="52.370" LongHem="W" Depth="0.0"/>'
            "</centre>"
        )
        elem = ET.fromstring(xml)
        result = _parse_location(elem, None)
        assert result is not None
        lat, lon, depth = result
        # 12 + 11/60 + 10.63/3600 = 12.18628611...
        assert abs(lat - 12.18628611) < 0.0001
        # -(11 + 41/60 + 52.37/3600) = -11.69788056...
        assert abs(lon - (-11.69788056)) < 0.0001

    def test_missing_location(self) -> None:
        xml = "<centre/>"
        elem = ET.fromstring(xml)
        assert _parse_location(elem, None) is None


class TestDPFHandlerBasic:
    """Tests for DPFHandler basic properties and parsing."""

    def test_handler_properties(self) -> None:
        handler = DPFHandler()
        assert handler.name == "Debrief DPF Format"
        assert ".dpf" in handler.extensions
        assert handler.version == "1.0.0"

    def test_parse_sample_dpf(self) -> None:
        handler = DPFHandler()
        content = (FIXTURES / "sample.dpf").read_text()
        result = handler.parse(content, str(FIXTURES / "sample.dpf"))

        assert len(result.warnings) == 0
        assert result.handler == "Debrief DPF Format"

        # Should have 2 tracks + 2 sensor contacts + 2 narratives = 6 features
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        sensors = [f for f in result.features if f["properties"]["kind"] == "SENSOR_CONTACT"]
        narratives = [f for f in result.features if f["properties"]["kind"] == "NARRATIVE"]

        assert len(tracks) == 2
        assert len(sensors) == 2
        assert len(narratives) == 2

    def test_track_geometry(self) -> None:
        handler = DPFHandler()
        content = (FIXTURES / "sample.dpf").read_text()
        result = handler.parse(content, str(FIXTURES / "sample.dpf"))

        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        nelson = next(t for t in tracks if t["properties"]["platform_id"] == "NELSON")

        assert nelson["geometry"]["type"] == "LineString"
        coords = nelson["geometry"]["coordinates"]
        assert len(coords) == 3  # 3 fixes
        # First coordinate should be [lon, lat]
        assert abs(coords[0][0] - (-21.6978806)) < 0.0001
        assert abs(coords[0][1] - 22.1862861) < 0.0001

    def test_track_properties(self) -> None:
        handler = DPFHandler()
        content = (FIXTURES / "sample.dpf").read_text()
        result = handler.parse(content, str(FIXTURES / "sample.dpf"))

        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        nelson = next(t for t in tracks if t["properties"]["platform_id"] == "NELSON")
        props = nelson["properties"]

        assert props["platform_name"] == "NELSON"
        assert props["track_type"] == "CONTACT"
        assert len(props["positions"]) == 3
        assert "style" in props
        assert props["positions"][0]["course"] == 269.7
        assert props["positions"][0]["speed"] == 2.0

    def test_sensor_contact_properties(self) -> None:
        handler = DPFHandler()
        content = (FIXTURES / "sample.dpf").read_text()
        result = handler.parse(content, str(FIXTURES / "sample.dpf"))

        sensors = [f for f in result.features if f["properties"]["kind"] == "SENSOR_CONTACT"]
        assert len(sensors) == 2

        # First contact has frequency
        c1 = sensors[0]
        assert c1["geometry"] is None
        assert c1["properties"]["bearing"] == 45.5
        assert c1["properties"]["frequency"] == 150.0
        assert c1["properties"]["parent_track"] == "NELSON"
        assert c1["properties"]["sensor_name"] == "Sensor_A"

        # Second contact has ambiguous bearing
        c2 = sensors[1]
        assert c2["properties"]["ambiguous_bearing"] == 226.2

    def test_narrative_properties(self) -> None:
        handler = DPFHandler()
        content = (FIXTURES / "sample.dpf").read_text()
        result = handler.parse(content, str(FIXTURES / "sample.dpf"))

        narratives = [f for f in result.features if f["properties"]["kind"] == "NARRATIVE"]
        assert len(narratives) == 2
        assert narratives[0]["geometry"] is None
        assert narratives[0]["properties"]["entry"] == "Exercise commenced"
        assert narratives[0]["properties"]["track"] == "NELSON"


class TestDPFSensorsAndTMA:
    """Tests for sensor and TMA solution parsing."""

    def test_tma_solution(self) -> None:
        handler = DPFHandler()
        content = (FIXTURES / "sample_sensors.dpf").read_text()
        result = handler.parse(content, str(FIXTURES / "sample_sensors.dpf"))

        tma = [f for f in result.features if f["properties"]["kind"] == "TMA_SOLUTION"]
        assert len(tma) == 1
        assert tma[0]["properties"]["course"] == 180.0
        assert tma[0]["properties"]["speed"] == 5.0
        # TMA with location should have Point geometry
        assert tma[0]["geometry"]["type"] == "Point"

    def test_sensor_contacts_in_sensor_file(self) -> None:
        handler = DPFHandler()
        content = (FIXTURES / "sample_sensors.dpf").read_text()
        result = handler.parse(content, str(FIXTURES / "sample_sensors.dpf"))

        sensors = [f for f in result.features if f["properties"]["kind"] == "SENSOR_CONTACT"]
        assert len(sensors) == 2
        assert sensors[0]["properties"]["bearing"] == 32.757


class TestDPFNoNamespace:
    """Tests for DPF files without namespace."""

    def test_parse_no_namespace(self) -> None:
        handler = DPFHandler()
        content = (FIXTURES / "sample_no_ns.dpf").read_text()
        result = handler.parse(content, str(FIXTURES / "sample_no_ns.dpf"))

        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        assert len(tracks) == 1
        assert tracks[0]["properties"]["platform_id"] == "VESSEL_A"

    def test_long_location_coordinates(self) -> None:
        handler = DPFHandler()
        content = (FIXTURES / "sample_no_ns.dpf").read_text()
        result = handler.parse(content, str(FIXTURES / "sample_no_ns.dpf"))

        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        coords = tracks[0]["geometry"]["coordinates"]
        # First fix uses longLocation: 12°11'10.63"N, 11°41'52.37"W
        assert abs(coords[0][1] - 12.18628611) < 0.0001  # lat
        assert abs(coords[0][0] - (-11.69788056)) < 0.0001  # lon


class TestDPFEdgeCases:
    """Tests for edge cases and error handling."""

    def test_malformed_xml(self) -> None:
        handler = DPFHandler()
        result = handler.parse("<not valid xml", "bad.dpf")
        assert len(result.features) == 0
        assert any(w.code == "XML_PARSE_ERROR" for w in result.warnings)

    def test_empty_plot(self) -> None:
        handler = DPFHandler()
        content = '<?xml version="1.0"?><plot Created="2024" Name="Empty"><session><layers/></session></plot>'
        result = handler.parse(content, "empty.dpf")
        assert len(result.features) == 0
        assert len(result.warnings) == 0

    def test_missing_session(self) -> None:
        handler = DPFHandler()
        content = '<?xml version="1.0"?><plot Created="2024" Name="Test"/>'
        result = handler.parse(content, "no_session.dpf")
        assert len(result.features) == 0
        assert any(w.code == "MISSING_ELEMENT" for w in result.warnings)

    def test_fix_with_null_timestamp(self) -> None:
        handler = DPFHandler()
        content = """<?xml version="1.0"?>
        <plot Created="2024" Name="Test">
          <session><layers>
            <track Name="T1" ColorMode="PerFix">
              <TrackSegment Name="Positions">
                <fix Course="0" Dtg="691231 235959.999" Speed="0" Label="">
                  <centre><shortLocation Depth="0" Lat="10" Long="20"/></centre>
                </fix>
                <fix Course="0" Dtg="951212 050000" Speed="5" Label="">
                  <centre><shortLocation Depth="0" Lat="10" Long="20"/></centre>
                </fix>
                <fix Course="0" Dtg="951212 060000" Speed="5" Label="">
                  <centre><shortLocation Depth="0" Lat="11" Long="21"/></centre>
                </fix>
              </TrackSegment>
            </track>
          </layers></session>
        </plot>"""
        result = handler.parse(content, "null_ts.dpf")
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        assert len(tracks) == 1
        # Should have 2 fixes (null timestamp skipped)
        assert len(tracks[0]["geometry"]["coordinates"]) == 2
