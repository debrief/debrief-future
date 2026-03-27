"""Golden example tests for apply-symbol-style tool (T024)."""

import copy

import pytest

from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.track.styling.apply_symbol_style import apply_symbol_style

TRACK_FEATURE = {
    "type": "Feature",
    "id": "track-001",
    "geometry": {
        "type": "LineString",
        "coordinates": [[-1.0, 50.0], [-1.1, 50.1]],
    },
    "properties": {
        "kind": "TRACK",
        "platform_id": "VESSEL-A",
        "platform_name": "Vessel Alpha",
        "track_type": "SURFACE",
        "start_time": "2024-01-01T00:00:00Z",
        "end_time": "2024-01-01T01:00:00Z",
        "positions": [
            {"time": "2024-01-01T00:00:00Z", "coordinates": [-1.0, 50.0]},
            {"time": "2024-01-01T01:00:00Z", "coordinates": [-1.1, 50.1]},
        ],
        "style": {
            "line": {
                "stroke": True,
                "color": "#3388ff",
                "weight": 3,
                "opacity": 1.0,
            },
            "point": {
                "shape": "circle",
                "radius": 4,
                "fill": True,
                "fill_color": "#3388ff",
                "fill_opacity": 0.8,
                "stroke": True,
                "color": "#ffffff",
                "weight": 1,
                "opacity": 1.0,
            },
        },
        "default_position_style": {
            "show_symbol": True,
            "symbol": "circle",
            "show_label": False,
        },
    },
}


class TestApplySymbolStyle:
    """Golden example tests for the apply-symbol-style tool."""

    def test_basic_golden_example(self) -> None:
        """Apply symbol='diamond', radius=6, fill_color='#00FF00'. Verify point style updated."""
        feature = copy.deepcopy(TRACK_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"symbol": "diamond", "radius": 6, "fill_color": "#00FF00"}

        result = apply_symbol_style(context, params)

        assert len(result) == 1
        point = result[0]["properties"]["style"]["point"]
        assert point["shape"] == "diamond"
        assert point["radius"] == 6
        assert point["fill_color"] == "#00FF00"
        # Other point properties remain unchanged
        assert point["fill"] is True
        assert point["fill_opacity"] == 0.8
        assert point["stroke"] is True
        assert point["color"] == "#ffffff"
        assert point["weight"] == 1
        assert point["opacity"] == 1.0
        # default_position_style must also be updated for the renderer
        dps = result[0]["properties"]["default_position_style"]
        assert dps["symbol"] == "diamond"
        assert dps["show_symbol"] is True

    def test_default_radius(self) -> None:
        """Only symbol param provided, radius defaults to 4."""
        feature = copy.deepcopy(TRACK_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"symbol": "square"}

        result = apply_symbol_style(context, params)

        assert len(result) == 1
        point = result[0]["properties"]["style"]["point"]
        assert point["shape"] == "square"
        assert point["radius"] == 4

    def test_fill_color_from_line(self) -> None:
        """No fill_color param, no existing point.fill_color -> uses line color."""
        feature = copy.deepcopy(TRACK_FEATURE)
        # Replace point style with one that has no fill_color
        feature["properties"]["style"]["point"] = {
            "shape": "circle",
            "radius": 4,
            "fill": True,
            "stroke": True,
        }
        feature["properties"]["style"]["line"]["color"] = "#FF0000"
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"symbol": "triangle"}

        result = apply_symbol_style(context, params)

        assert len(result) == 1
        point = result[0]["properties"]["style"]["point"]
        assert point["shape"] == "triangle"
        # fill_color should be inherited from line color
        assert point["fill_color"] == "#FF0000"

    def test_no_existing_style(self) -> None:
        """Track with no style gets defaults then symbol applied."""
        feature = copy.deepcopy(TRACK_FEATURE)
        del feature["properties"]["style"]
        del feature["properties"]["default_position_style"]
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"symbol": "cross", "radius": 8}

        result = apply_symbol_style(context, params)

        assert len(result) == 1
        point = result[0]["properties"]["style"]["point"]
        assert point["shape"] == "cross"
        assert point["radius"] == 8
        # Default point properties are created by setdefault
        assert point["fill"] is True
        assert point["fill_color"] == "#3388ff"
        assert point["fill_opacity"] == 0.8
        assert point["stroke"] is True
        assert point["color"] == "#ffffff"
        assert point["weight"] == 1
        assert point["opacity"] == 1.0
        # default_position_style created from scratch — show_symbol not forced
        dps = result[0]["properties"]["default_position_style"]
        assert dps["symbol"] == "cross"
        assert "show_symbol" not in dps

    def test_does_not_change_show_symbol_visibility(self) -> None:
        """Changing symbol shape must not alter show_symbol visibility."""
        feature = copy.deepcopy(TRACK_FEATURE)
        feature["properties"]["default_position_style"]["show_symbol"] = False
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"symbol": "square"}

        result = apply_symbol_style(context, params)

        dps = result[0]["properties"]["default_position_style"]
        assert dps["symbol"] == "square"
        # show_symbol must remain False — changing shape should not affect visibility
        assert dps["show_symbol"] is False

    def test_error_invalid_symbol(self) -> None:
        """Invalid symbol raises ValueError."""
        feature = copy.deepcopy(TRACK_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"symbol": "hexagon"}

        with pytest.raises(ValueError, match="symbol must be one of"):
            apply_symbol_style(context, params)

    def test_default_symbol(self) -> None:
        """No symbol param defaults to square."""
        feature = copy.deepcopy(TRACK_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {}

        result = apply_symbol_style(context, params)

        assert len(result) == 1
        point = result[0]["properties"]["style"]["point"]
        assert point["shape"] == "square"
        assert point["radius"] == 4
