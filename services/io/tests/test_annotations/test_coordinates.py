"""Tests for DMS coordinate parsing."""

import pytest

from debrief_io.handlers.annotations.coordinates import (
    dms_to_decimal,
    parse_dms,
    parse_lat_lon,
    parse_multiple_lat_lon,
    validate_latitude,
    validate_longitude,
)


class TestDMSToDecimal:
    """Test DMS to decimal degree conversion."""

    def test_north_positive(self):
        """North latitudes are positive."""
        result = dms_to_decimal(21, 30, 0, "N")
        assert result == pytest.approx(21.5)

    def test_south_negative(self):
        """South latitudes are negative."""
        result = dms_to_decimal(21, 30, 0, "S")
        assert result == pytest.approx(-21.5)

    def test_east_positive(self):
        """East longitudes are positive."""
        result = dms_to_decimal(45, 15, 0, "E")
        assert result == pytest.approx(45.25)

    def test_west_negative(self):
        """West longitudes are negative."""
        result = dms_to_decimal(45, 15, 0, "W")
        assert result == pytest.approx(-45.25)

    def test_with_seconds(self):
        """Seconds are converted correctly."""
        # 21° 30' 36" = 21 + 30/60 + 36/3600 = 21.51
        result = dms_to_decimal(21, 30, 36, "N")
        assert result == pytest.approx(21.51)

    def test_fractional_seconds(self):
        """Fractional seconds are handled."""
        result = dms_to_decimal(21, 30, 45.5, "N")
        expected = 21 + 30 / 60 + 45.5 / 3600
        assert result == pytest.approx(expected)


class TestParseDMS:
    """Test parsing DMS strings."""

    def test_parse_latitude(self):
        """Parse latitude string."""
        result = parse_dms("21 30 0 N")
        assert result is not None
        assert result.degrees == 21
        assert result.minutes == 30
        assert result.seconds == 0
        assert result.hemisphere == "N"
        assert result.decimal == pytest.approx(21.5)

    def test_parse_longitude(self):
        """Parse longitude string."""
        result = parse_dms("45 15 30 W")
        assert result is not None
        assert result.degrees == 45
        assert result.minutes == 15
        assert result.seconds == 30
        assert result.hemisphere == "W"

    def test_parse_from_longer_string(self):
        """Parse DMS from text containing other content."""
        result = parse_dms("prefix 21 30 0 N suffix")
        assert result is not None
        assert result.decimal == pytest.approx(21.5)

    def test_invalid_returns_none(self):
        """Invalid format returns None."""
        assert parse_dms("invalid") is None
        assert parse_dms("") is None


class TestParseLatLon:
    """Test parsing lat/lon pairs."""

    def test_parse_pair(self):
        """Parse latitude/longitude pair."""
        result = parse_lat_lon("21 30 0 N 45 15 0 W")
        assert result is not None
        lon, lat = result
        assert lat == pytest.approx(21.5)
        assert lon == pytest.approx(-45.25)

    def test_geojson_order(self):
        """Result is in GeoJSON order [lon, lat]."""
        result = parse_lat_lon("21 0 0 N 45 0 0 W")
        lon, lat = result
        assert lon == -45.0  # Longitude first
        assert lat == 21.0  # Latitude second

    def test_single_coordinate_returns_none(self):
        """Single coordinate returns None."""
        assert parse_lat_lon("21 30 0 N") is None

    def test_from_shapes_rep_format(self):
        """Parse format used in shapes.rep."""
        result = parse_lat_lon("21.8 0 0 N 21.0 0 0 W")
        assert result is not None
        lon, lat = result
        # 21.8° 0' 0" N, 21.0° 0' 0" W
        assert lat == pytest.approx(21.8)
        assert lon == pytest.approx(-21.0)


class TestParseMultipleLatLon:
    """Test parsing multiple coordinate pairs."""

    def test_parse_two_pairs(self):
        """Parse two coordinate pairs."""
        result = parse_multiple_lat_lon("21 0 0 N 45 0 0 W 22 0 0 N 46 0 0 W")
        assert len(result) == 2
        assert result[0] == pytest.approx((-45.0, 21.0), rel=1e-6)
        assert result[1] == pytest.approx((-46.0, 22.0), rel=1e-6)

    def test_parse_three_pairs(self):
        """Parse three coordinate pairs for polygon."""
        result = parse_multiple_lat_lon("21 0 0 N 45 0 0 W 22 0 0 N 46 0 0 W 23 0 0 N 47 0 0 W")
        assert len(result) == 3

    def test_odd_coordinates_dropped(self):
        """Odd trailing coordinate is ignored."""
        result = parse_multiple_lat_lon(
            "21 0 0 N 45 0 0 W 22 0 0 N"  # Incomplete second pair
        )
        assert len(result) == 1


class TestValidation:
    """Test coordinate validation."""

    def test_valid_latitude(self):
        """Valid latitudes pass."""
        validate_latitude(0)
        validate_latitude(90)
        validate_latitude(-90)
        validate_latitude(45.5)

    def test_invalid_latitude_raises(self):
        """Invalid latitudes raise ValueError."""
        with pytest.raises(ValueError, match="Invalid latitude 95"):
            validate_latitude(95)
        with pytest.raises(ValueError, match="Invalid latitude -100"):
            validate_latitude(-100)

    def test_valid_longitude(self):
        """Valid longitudes pass."""
        validate_longitude(0)
        validate_longitude(180)
        validate_longitude(-180)
        validate_longitude(45.5)

    def test_invalid_longitude_raises(self):
        """Invalid longitudes raise ValueError."""
        with pytest.raises(ValueError, match="Invalid longitude 200"):
            validate_longitude(200)
        with pytest.raises(ValueError, match="Invalid longitude -190"):
            validate_longitude(-190)

    def test_error_includes_line_number(self):
        """Error message includes line number when provided."""
        with pytest.raises(ValueError, match="at line 42"):
            validate_latitude(100, line_number=42)
