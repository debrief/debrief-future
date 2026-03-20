"""Golden example tests for set-track-color tool (T023)."""

import copy

import pytest

from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.track.styling.set_track_color import set_track_color

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


class TestSetTrackColor:
    """Golden example tests for the set-track-color tool."""

    def test_basic_golden_example(self) -> None:
        """Apply color='#FF0000' to one track. Verify line color updated, other props unchanged."""
        feature = copy.deepcopy(TRACK_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"color": "#FF0000"}

        result = set_track_color(context, params)

        assert len(result) == 1
        line = result[0]["properties"]["style"]["line"]
        assert line["color"] == "#FF0000"
        # All other line properties must remain unchanged
        assert line["stroke"] is True
        assert line["weight"] == 3
        assert line["opacity"] == 1.0

    def test_multiple_tracks(self) -> None:
        """Apply color to 2 tracks, both get updated."""
        feature_a = copy.deepcopy(TRACK_FEATURE)
        feature_b = copy.deepcopy(TRACK_FEATURE)
        feature_b["id"] = "track-002"
        feature_b["properties"]["platform_name"] = "Vessel Beta"
        context = SelectionContext(type=ContextType.MULTI, features=[feature_a, feature_b])
        params = {"color": "#00FF00"}

        result = set_track_color(context, params)

        assert len(result) == 2
        assert result[0]["properties"]["style"]["line"]["color"] == "#00FF00"
        assert result[1]["properties"]["style"]["line"]["color"] == "#00FF00"

    def test_no_existing_style(self) -> None:
        """Track with no style property gets default style with applied color."""
        feature = copy.deepcopy(TRACK_FEATURE)
        del feature["properties"]["style"]
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"color": "#ABCDEF"}

        result = set_track_color(context, params)

        assert len(result) == 1
        style = result[0]["properties"]["style"]
        line = style["line"]
        # Color is the one we applied
        assert line["color"] == "#ABCDEF"
        # Default line properties are created
        assert line["stroke"] is True
        assert line["weight"] == 3
        assert line["opacity"] == 1.0

    def test_skips_non_track_features(self) -> None:
        """Non-TRACK features are ignored without error."""
        track = copy.deepcopy(TRACK_FEATURE)
        non_track = {
            "type": "Feature",
            "id": "zone-001",
            "geometry": {"type": "Polygon", "coordinates": [[]]},
            "properties": {"kind": "ZONE"},
        }
        context = SelectionContext(type=ContextType.MULTI, features=[track, non_track])
        params = {"color": "#FF0000"}

        result = set_track_color(context, params)

        # Only the track feature is returned
        assert len(result) == 1
        assert result[0]["id"] == "track-001"
        assert result[0]["properties"]["style"]["line"]["color"] == "#FF0000"

    def test_error_no_tracks(self) -> None:
        """Empty feature list raises ValueError."""
        context = SelectionContext(type=ContextType.NONE, features=[])
        params = {"color": "#FF0000"}

        with pytest.raises(ValueError, match="No track features found"):
            set_track_color(context, params)

    def test_error_missing_color(self) -> None:
        """Missing color param raises ValueError."""
        feature = copy.deepcopy(TRACK_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {}

        with pytest.raises(ValueError, match="color parameter is required"):
            set_track_color(context, params)
