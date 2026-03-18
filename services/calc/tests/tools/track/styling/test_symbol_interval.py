"""Golden example tests for symbol-interval tool (T026)."""

import copy

import pytest

from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.track.styling.symbol_interval import symbol_interval

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


class TestSymbolInterval:
    """Golden example tests for the symbol-interval tool."""

    def test_basic_golden_example(self) -> None:
        """Apply interval='PT30M'. Verify show_symbol=True and symbol_interval set."""
        feature = copy.deepcopy(TRACK_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"interval": "PT30M"}

        result = symbol_interval(context, params)

        assert len(result) == 1
        dps = result[0]["properties"]["default_position_style"]
        assert dps["show_symbol"] is True
        assert dps["symbol_interval"] == "PT30M"
        # Other default_position_style properties remain unchanged
        assert dps["symbol"] == "circle"
        assert dps["show_label"] is False

    def test_no_existing_dps(self) -> None:
        """Track with no default_position_style gets one with show_symbol=True."""
        feature = copy.deepcopy(TRACK_FEATURE)
        del feature["properties"]["default_position_style"]
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"interval": "PT20M"}

        result = symbol_interval(context, params)

        assert len(result) == 1
        dps = result[0]["properties"]["default_position_style"]
        assert dps["show_symbol"] is True
        assert dps["symbol_interval"] == "PT20M"
        # Defaults created by setdefault
        assert dps["symbol"] == "circle"
        assert dps["show_label"] is False

    def test_overwrites_existing(self) -> None:
        """Existing symbol_interval is replaced with the new value."""
        feature = copy.deepcopy(TRACK_FEATURE)
        feature["properties"]["default_position_style"]["symbol_interval"] = "PT5M"
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"interval": "PT1H"}

        result = symbol_interval(context, params)

        assert len(result) == 1
        dps = result[0]["properties"]["default_position_style"]
        assert dps["symbol_interval"] == "PT1H"
        assert dps["show_symbol"] is True

    def test_error_no_tracks(self) -> None:
        """Empty feature list raises ValueError."""
        context = SelectionContext(type=ContextType.NONE, features=[])
        params = {"interval": "PT30M"}

        with pytest.raises(ValueError, match="No track features found"):
            symbol_interval(context, params)

    def test_default_interval(self) -> None:
        """Missing interval param defaults to PT15M."""
        feature = copy.deepcopy(TRACK_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {}

        result = symbol_interval(context, params)

        assert len(result) == 1
        dps = result[0]["properties"]["default_position_style"]
        assert dps["show_symbol"] is True
        assert dps["symbol_interval"] == "PT15M"
