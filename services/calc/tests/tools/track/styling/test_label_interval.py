"""Golden example tests for label-interval tool (T025)."""

import copy

import pytest
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.track.styling.label_interval import label_interval


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


class TestLabelInterval:
    """Golden example tests for the label-interval tool."""

    def test_basic_golden_example(self):
        """Apply interval='PT15M'. Verify show_label=True and label_interval set."""
        feature = copy.deepcopy(TRACK_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"interval": "PT15M"}

        result = label_interval(context, params)

        assert len(result) == 1
        dps = result[0]["properties"]["default_position_style"]
        assert dps["show_label"] is True
        assert dps["label_interval"] == "PT15M"
        # Other default_position_style properties remain unchanged
        assert dps["show_symbol"] is True
        assert dps["symbol"] == "circle"

    def test_no_existing_dps(self):
        """Track with no default_position_style gets one with show_label=True."""
        feature = copy.deepcopy(TRACK_FEATURE)
        del feature["properties"]["default_position_style"]
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"interval": "PT10M"}

        result = label_interval(context, params)

        assert len(result) == 1
        dps = result[0]["properties"]["default_position_style"]
        assert dps["show_label"] is True
        assert dps["label_interval"] == "PT10M"
        # Defaults created by setdefault
        assert dps["show_symbol"] is True
        assert dps["symbol"] == "circle"

    def test_overwrites_existing(self):
        """Existing label_interval is replaced with the new value."""
        feature = copy.deepcopy(TRACK_FEATURE)
        feature["properties"]["default_position_style"]["label_interval"] = "PT5M"
        feature["properties"]["default_position_style"]["show_label"] = True
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"interval": "PT30M"}

        result = label_interval(context, params)

        assert len(result) == 1
        dps = result[0]["properties"]["default_position_style"]
        assert dps["label_interval"] == "PT30M"
        assert dps["show_label"] is True

    def test_error_no_tracks(self):
        """Empty feature list raises ValueError."""
        context = SelectionContext(type=ContextType.NONE, features=[])
        params = {"interval": "PT15M"}

        with pytest.raises(ValueError, match="No track features found"):
            label_interval(context, params)

    def test_error_missing_interval(self):
        """Missing interval param raises ValueError."""
        feature = copy.deepcopy(TRACK_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {}

        with pytest.raises(ValueError, match="interval parameter is required"):
            label_interval(context, params)
