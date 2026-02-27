"""Tests for symbology module - color code mapping."""

import pytest

from debrief_io.symbology import (
    COLOR_MAP,
    get_color,
    get_color_name,
    is_valid_color_code,
    parse_color_code,
)


class TestColorMapping:
    """Test color code to CSS mapping."""

    def test_all_codes_have_mapping(self) -> None:
        """All valid codes A-Q have CSS color mappings."""
        for code in "ABCDEFGHIJKLMNOPQ":
            assert code in COLOR_MAP
            assert COLOR_MAP[code].startswith("#")

    def test_get_color_valid_codes(self) -> None:
        """get_color returns CSS colors for valid codes."""
        assert get_color("A") == "#0000FF"  # Blue
        assert get_color("B") == "#00FF00"  # Green
        assert get_color("C") == "#FF0000"  # Red
        assert get_color("Q") == "#000000"  # Black

    def test_get_color_invalid_code_raises(self) -> None:
        """get_color raises ValueError for invalid codes."""
        with pytest.raises(ValueError, match="Invalid color code 'Z'"):
            get_color("Z")

        with pytest.raises(ValueError, match="Invalid color code 'a'"):
            get_color("a")  # Lowercase not valid

    def test_get_color_name(self) -> None:
        """get_color_name returns human-readable names."""
        assert get_color_name("A") == "Blue"
        assert get_color_name("C") == "Red"
        assert get_color_name("D") == "Yellow"

    def test_is_valid_color_code(self) -> None:
        """is_valid_color_code checks code validity."""
        assert is_valid_color_code("A") is True
        assert is_valid_color_code("Q") is True
        assert is_valid_color_code("Z") is False
        assert is_valid_color_code("a") is False
        assert is_valid_color_code("") is False


class TestParseColorCode:
    """Test color code extraction from symbol strings."""

    def test_simple_symbol(self) -> None:
        """Parse @X format."""
        assert parse_color_code("@A") == "A"
        assert parse_color_code("@Q") == "Q"

    def test_extended_symbol(self) -> None:
        """Parse @X@00 format."""
        assert parse_color_code("@A@00") == "A"
        assert parse_color_code("@B@11") == "B"

    def test_symbol_with_attributes(self) -> None:
        """Parse @X[LAYER=y] format."""
        # Note: parse_color_code extracts the color but doesn't parse attributes
        assert parse_color_code("@A[LAYER=test]") == "A"

    def test_svg_style_symbol(self) -> None:
        """Parse aB format (SVG symbol + color)."""
        assert parse_color_code("aB") == "B"
        assert parse_color_code("xC") == "C"

    def test_single_letter(self) -> None:
        """Parse single color code."""
        assert parse_color_code("A") == "A"
        assert parse_color_code("Q") == "Q"

    def test_invalid_returns_none(self) -> None:
        """Invalid formats return None."""
        assert parse_color_code("") is None
        assert parse_color_code("@") is None
        assert parse_color_code("@Z") is None  # Z not in A-Q


class TestColorValues:
    """Test specific color values match Debrief reference."""

    @pytest.mark.parametrize(
        "code,expected_css",
        [
            ("A", "#0000FF"),  # Blue
            ("B", "#00FF00"),  # Green
            ("C", "#FF0000"),  # Red
            ("D", "#FFFF00"),  # Yellow
            ("E", "#FF00FF"),  # Magenta
            ("F", "#FFA500"),  # Orange
            ("G", "#800080"),  # Purple
            ("H", "#00FFFF"),  # Cyan
            ("I", "#A52A2A"),  # Brown
            ("J", "#90EE90"),  # Light Green
            ("K", "#FFC0CB"),  # Pink
            ("L", "#FFD700"),  # Gold
            ("M", "#D3D3D3"),  # Light Grey
            ("N", "#808080"),  # Grey
            ("O", "#A9A9A9"),  # Dark Grey
            ("P", "#FFFFFF"),  # White
            ("Q", "#000000"),  # Black
        ],
    )
    def test_color_mapping_matches_reference(self, code: str, expected_css: str) -> None:
        """Color mappings match Debrief symbology reference."""
        assert get_color(code) == expected_css
