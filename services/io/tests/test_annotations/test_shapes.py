"""Tests for shape annotation parsing (CIRCLE, RECT, LINE)."""

import pytest

from debrief_io.exceptions import AnnotationParseError
from debrief_io.handlers.annotations.builders import (
    build_circle,
    build_line,
    build_rectangle,
)


class TestBuildCircle:
    """Test CIRCLE annotation parsing."""

    def test_parse_basic_circle(self):
        """Parse a basic CIRCLE line."""
        line = ";CIRCLE: @D 21 48 0 N 21 0 0 W 2000 test circle"
        result = build_circle(line, 1, "test.rep")

        assert result["type"] == "Feature"
        assert result["geometry"]["type"] == "Polygon"
        assert result["properties"]["kind"] == "CIRCLE"
        assert result["properties"]["center"][0] == pytest.approx(-21.0, rel=1e-3)  # lon
        assert result["properties"]["center"][1] == pytest.approx(21.8, rel=1e-3)  # lat
        assert result["properties"]["radius"] == 2000
        assert result["properties"]["label"] == "test circle"
        assert result["properties"]["symbol"] == "D"
        assert result["properties"]["style"]["fill_color"] == "#FFFF00"  # Yellow

    def test_circle_geometry_is_polygon(self):
        """Circle geometry is approximated as a polygon."""
        line = ";CIRCLE: @A 21 0 0 N 45 0 0 W 1000 test"
        result = build_circle(line, 1, "test.rep")

        geometry = result["geometry"]
        assert geometry["type"] == "Polygon"
        assert len(geometry["coordinates"]) == 1  # One ring
        ring = geometry["coordinates"][0]
        assert len(ring) >= 16  # Reasonable approximation
        # Ring should be closed
        assert ring[0] == ring[-1]

    def test_circle_no_label(self):
        """Parse CIRCLE without label."""
        line = ";CIRCLE: @A 21 0 0 N 45 0 0 W 1000"
        result = build_circle(line, 1, "test.rep")

        assert result["properties"]["label"] is None

    def test_circle_symbol_colors(self):
        """Symbol codes map to correct CSS colors."""
        line_a = ";CIRCLE: @A 21 0 0 N 45 0 0 W 1000 test"
        result = build_circle(line_a, 1, "test.rep")
        assert result["properties"]["style"]["fill_color"] == "#0000FF"  # Blue

        line_c = ";CIRCLE: @C 21 0 0 N 45 0 0 W 1000 test"
        result = build_circle(line_c, 1, "test.rep")
        assert result["properties"]["style"]["fill_color"] == "#FF0000"  # Red

    def test_circle_invalid_symbol_raises(self):
        """Invalid symbol code raises error."""
        line = ";CIRCLE: @Z 21 0 0 N 45 0 0 W 1000 test"
        with pytest.raises(ValueError, match="Invalid color code"):
            build_circle(line, 1, "test.rep")

    def test_circle_missing_radius_raises(self):
        """Missing radius raises error."""
        line = ";CIRCLE: @A 21 0 0 N 45 0 0 W"
        with pytest.raises(AnnotationParseError, match="Missing radius"):
            build_circle(line, 1, "test.rep")

    def test_circle_negative_radius_raises(self):
        """Negative radius raises error."""
        line = ";CIRCLE: @A 21 0 0 N 45 0 0 W -100 test"
        with pytest.raises(AnnotationParseError, match="Negative radius"):
            build_circle(line, 1, "test.rep")

    def test_circle_invalid_radius_raises(self):
        """Non-numeric radius raises error."""
        line = ";CIRCLE: @A 21 0 0 N 45 0 0 W abc test"
        with pytest.raises(AnnotationParseError, match="Invalid radius"):
            build_circle(line, 1, "test.rep")


class TestBuildRectangle:
    """Test RECT annotation parsing."""

    def test_parse_basic_rectangle(self):
        """Parse a basic RECT line."""
        line = ";RECT: @A 21 24 0 N 21 30 0 W 21 30 0 N 21 36 0 W test rectangle"
        result = build_rectangle(line, 1, "test.rep")

        assert result["type"] == "Feature"
        assert result["geometry"]["type"] == "Polygon"
        assert result["properties"]["kind"] == "RECTANGLE"
        assert result["properties"]["label"] == "test rectangle"
        assert result["properties"]["symbol"] == "A"

    def test_rectangle_geometry_is_closed(self):
        """Rectangle geometry is a closed polygon."""
        line = ";RECT: @A 21 0 0 N 45 0 0 W 22 0 0 N 46 0 0 W test"
        result = build_rectangle(line, 1, "test.rep")

        ring = result["geometry"]["coordinates"][0]
        assert len(ring) == 5  # 4 corners + closing point
        assert ring[0] == ring[-1]  # Closed

    def test_rectangle_corners(self):
        """Rectangle has correct corner coordinates."""
        line = ";RECT: @A 21 0 0 N 45 0 0 W 22 0 0 N 46 0 0 W test"
        result = build_rectangle(line, 1, "test.rep")

        ring = result["geometry"]["coordinates"][0]
        # Ring should contain corners of the rectangle
        # GeoJSON order is [lon, lat]
        lons = [p[0] for p in ring[:-1]]  # Skip closing point
        lats = [p[1] for p in ring[:-1]]

        assert min(lons) == pytest.approx(-46.0)
        assert max(lons) == pytest.approx(-45.0)
        assert min(lats) == pytest.approx(21.0)
        assert max(lats) == pytest.approx(22.0)

    def test_rectangle_no_label(self):
        """Parse RECT without label."""
        line = ";RECT: @A 21 0 0 N 45 0 0 W 22 0 0 N 46 0 0 W"
        result = build_rectangle(line, 1, "test.rep")

        assert result["properties"]["label"] is None

    def test_rectangle_incomplete_raises(self):
        """Incomplete RECT raises error."""
        line = ";RECT: @A 21 0 0 N 45 0 0 W"
        with pytest.raises(AnnotationParseError, match="Incomplete RECT"):
            build_rectangle(line, 1, "test.rep")


class TestBuildLine:
    """Test LINE annotation parsing."""

    def test_parse_basic_line(self):
        """Parse a basic LINE line."""
        line = ";LINE: @B 20 50 0 N 21 10 0 W 22 0 0 N 21 10 0 W test line"
        result = build_line(line, 1, "test.rep")

        assert result["type"] == "Feature"
        assert result["geometry"]["type"] == "LineString"
        assert result["properties"]["kind"] == "LINE"
        assert result["properties"]["label"] == "test line"
        assert result["properties"]["symbol"] == "B"
        assert result["properties"]["style"]["color"] == "#00FF00"  # Green

    def test_line_geometry(self):
        """Line has correct start and end points."""
        line = ";LINE: @B 21 0 0 N 45 0 0 W 22 0 0 N 46 0 0 W test"
        result = build_line(line, 1, "test.rep")

        coords = result["geometry"]["coordinates"]
        assert len(coords) == 2  # Start and end

        # Start point
        assert coords[0][0] == pytest.approx(-45.0)  # lon
        assert coords[0][1] == pytest.approx(21.0)  # lat

        # End point
        assert coords[1][0] == pytest.approx(-46.0)
        assert coords[1][1] == pytest.approx(22.0)

    def test_line_no_label(self):
        """Parse LINE without label."""
        line = ";LINE: @B 21 0 0 N 45 0 0 W 22 0 0 N 46 0 0 W"
        result = build_line(line, 1, "test.rep")

        assert result["properties"]["label"] is None

    def test_line_incomplete_raises(self):
        """Incomplete LINE raises error."""
        line = ";LINE: @B 21 0 0 N 45 0 0 W"
        with pytest.raises(AnnotationParseError, match="Incomplete LINE"):
            build_line(line, 1, "test.rep")

    def test_line_style_properties(self):
        """Line has correct style properties."""
        line = ";LINE: @C 21 0 0 N 45 0 0 W 22 0 0 N 46 0 0 W test"
        result = build_line(line, 1, "test.rep")

        style = result["properties"]["style"]
        assert style["stroke"] is True
        assert style["color"] == "#FF0000"  # Red
        assert "weight" in style


class TestShapeIntegration:
    """Integration tests for shape annotations."""

    def test_all_shapes_have_unique_ids(self):
        """Each shape gets a unique ID."""
        circle = build_circle(";CIRCLE: @A 21 0 0 N 45 0 0 W 1000 test", 1, "test.rep")
        rect = build_rectangle(";RECT: @A 21 0 0 N 45 0 0 W 22 0 0 N 46 0 0 W test", 2, "test.rep")
        line = build_line(";LINE: @A 21 0 0 N 45 0 0 W 22 0 0 N 46 0 0 W test", 3, "test.rep")

        ids = {circle["id"], rect["id"], line["id"]}
        assert len(ids) == 3

    def test_all_shapes_have_source_info(self):
        """All shapes include source file and line number."""
        circle = build_circle(";CIRCLE: @A 21 0 0 N 45 0 0 W 1000 test", 10, "shapes.rep")

        assert circle["properties"]["source_file"] == "shapes.rep"
        assert circle["properties"]["line_number"] == 10
