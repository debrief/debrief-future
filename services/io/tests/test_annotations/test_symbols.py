"""Tests for symbol code parsing."""

import pytest

from debrief_io.handlers.annotations.symbols import (
    extract_symbol_from_line,
    get_dash_array,
    parse_symbol,
)


class TestParseSymbol:
    """Test symbol parsing."""

    def test_simple_symbol(self) -> None:
        """Parse @X format."""
        result = parse_symbol("@A")
        assert result.color_code == "A"
        assert result.css_color == "#0000FF"
        assert result.line_style is None
        assert result.thickness is None
        assert result.fill_style is None
        assert result.layer is None
        assert result.symbol_name is None
        assert result.is_svg is False

    def test_extended_symbol(self) -> None:
        """Parse @X@YY format with line style, thickness, fill."""
        result = parse_symbol("@A@01")
        assert result.color_code == "A"
        assert result.line_style == "solid"  # @ = solid
        assert result.thickness == 0
        assert result.fill_style == "solid"  # 1 = solid

    def test_dotted_line_style(self) -> None:
        """Parse dotted line style (A)."""
        result = parse_symbol("@BA10")
        assert result.color_code == "B"
        assert result.line_style == "dotted"  # A = dotted
        assert result.thickness == 1
        assert result.fill_style is None  # 0 = none

    def test_symbol_with_layer(self) -> None:
        """Parse @X[LAYER=y] format."""
        result = parse_symbol("@A[LAYER=TUAs]")
        assert result.color_code == "A"
        assert result.layer == "TUAs"

    def test_symbol_with_icon(self) -> None:
        """Parse @X[SYMBOL=y] format."""
        result = parse_symbol("@C[SYMBOL=torpedo]")
        assert result.color_code == "C"
        assert result.symbol_name == "torpedo"

    def test_symbol_with_combined_attributes(self) -> None:
        """Parse @X[LAYER=x,SYMBOL=y] format."""
        result = parse_symbol("@C[LAYER=SVG_Annotations,SYMBOL=missile]")
        assert result.color_code == "C"
        assert result.layer == "SVG_Annotations"
        assert result.symbol_name == "missile"

    def test_svg_style_symbol(self) -> None:
        """Parse aB format (lowercase = SVG symbol)."""
        result = parse_symbol("aB")
        assert result.color_code == "B"
        assert result.is_svg is True

    def test_invalid_color_code_raises(self) -> None:
        """Invalid color code raises ValueError."""
        with pytest.raises(ValueError, match="Invalid color code"):
            parse_symbol("@Z")

    def test_missing_symbol_raises(self) -> None:
        """Missing symbol raises ValueError."""
        with pytest.raises(ValueError, match="Missing symbol code"):
            parse_symbol("")

    def test_error_includes_line_number(self) -> None:
        """Error includes line number when provided."""
        with pytest.raises(ValueError, match="at line 42"):
            parse_symbol("@Z", line_number=42)


class TestExtractSymbolFromLine:
    """Test symbol extraction from annotation lines."""

    def test_circle_line(self) -> None:
        """Extract symbol from CIRCLE line."""
        line = ";CIRCLE: @D 21.8 0 0 N 21.0 0 0 W 2000 test circle"
        symbol = extract_symbol_from_line(line)
        assert symbol == "@D"

    def test_extended_symbol(self) -> None:
        """Extract extended symbol."""
        line = ";POLY: @GA30 21.9 0 0 N..."
        symbol = extract_symbol_from_line(line)
        assert symbol == "@GA30"

    def test_symbol_with_attributes(self) -> None:
        """Extract symbol with attributes."""
        line = ";ELLIPSE: @F[LAYER=TUAs] 951212..."
        symbol = extract_symbol_from_line(line)
        assert symbol == "@F[LAYER=TUAs]"

    def test_no_symbol_returns_none(self) -> None:
        """Lines without symbol return None."""
        line = ";NARRATIVE: 951212 050200 TRACK comment"
        # NARRATIVE doesn't have @ symbol
        symbol = extract_symbol_from_line(line)
        # Note: NARRATIVE format starts with timestamp, not symbol
        assert symbol is None


class TestGetDashArray:
    """Test line style to dash array conversion."""

    def test_solid(self) -> None:
        """Solid has no dash array."""
        assert get_dash_array("solid") is None

    def test_dotted(self) -> None:
        """Dotted pattern."""
        assert get_dash_array("dotted") == "1, 3"

    def test_dot_dash(self) -> None:
        """Dot-dash pattern."""
        assert get_dash_array("dot-dash") == "5, 3, 1, 3"

    def test_short_dash(self) -> None:
        """Short dash pattern."""
        assert get_dash_array("short-dash") == "5, 5"

    def test_long_dash(self) -> None:
        """Long dash pattern."""
        assert get_dash_array("long-dash") == "10, 5"

    def test_unknown_returns_none(self) -> None:
        """Unknown style returns None."""
        assert get_dash_array("unknown") is None
        assert get_dash_array(None) is None
