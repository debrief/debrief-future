"""Cross-language parity verification.

Both Python and TypeScript implementations must produce identical output
for the same golden example inputs. This test verifies the Python side
against shared golden I/O expectations. The TypeScript tests verify the
TypeScript side against the same expectations.

If both test suites pass, cross-language parity is proven:
  Python output == expected == TypeScript output
"""

import copy

from debrief_calc.models import ContextType, SelectionContext

# Shared golden input fixture — identical to TypeScript test fixture
TRACK_FEATURE_A = {
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

TRACK_FEATURE_B = {
    "type": "Feature",
    "id": "track-002",
    "geometry": {
        "type": "LineString",
        "coordinates": [[-2.0, 51.0], [-2.1, 51.1]],
    },
    "properties": {
        "kind": "TRACK",
        "platform_id": "VESSEL-B",
        "platform_name": "Vessel Bravo",
        "track_type": "SURFACE",
        "start_time": "2024-01-01T00:00:00Z",
        "end_time": "2024-01-01T01:00:00Z",
        "positions": [
            {"time": "2024-01-01T00:00:00Z", "coordinates": [-2.0, 51.0]},
            {"time": "2024-01-01T01:00:00Z", "coordinates": [-2.1, 51.1]},
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


def _make_context(*features):
    """Create a selection context from features.

    MULTI accepts 1+ features. Uses SINGLE for exactly 1 feature,
    MULTI for 2+ features.
    """
    feature_list = list(features)
    ctx_type = ContextType.SINGLE if len(feature_list) == 1 else ContextType.MULTI
    return SelectionContext(
        type=ctx_type,
        features=feature_list,
    )


class TestCrossLanguageParity:
    """Verify Python outputs match the golden expectations shared with TypeScript."""

    def test_set_track_color_parity(self):
        """set-track-color: Python output matches cross-language golden example."""
        from debrief_calc.tools.track.styling.set_track_color import set_track_color

        features = [copy.deepcopy(TRACK_FEATURE_A), copy.deepcopy(TRACK_FEATURE_B)]
        context = _make_context(*features)
        result = set_track_color(context, {"color": "#FF0000"})

        assert len(result) == 2
        for feature in result:
            assert feature["properties"]["style"]["line"]["color"] == "#FF0000"
            # Other line properties must be preserved
            line = feature["properties"]["style"]["line"]
            assert line["stroke"] is True
            assert line["weight"] == 3
            assert abs(line["opacity"] - 1.0) < 1e-9

    def test_apply_symbol_style_parity(self):
        """apply-symbol-style: Python output matches cross-language golden example."""
        from debrief_calc.tools.track.styling.apply_symbol_style import (
            apply_symbol_style,
        )

        features = [copy.deepcopy(TRACK_FEATURE_A)]
        context = _make_context(*features)
        result = apply_symbol_style(
            context,
            {"symbol": "diamond", "radius": 6, "fill_color": "#00FF00"},
        )

        assert len(result) >= 1
        # Check the primary feature (track-001)
        primary = [f for f in result if f["id"] == "track-001"][0]
        point = primary["properties"]["style"]["point"]
        assert point["shape"] == "diamond"
        assert point["radius"] == 6
        assert point["fill_color"] == "#00FF00"
        # Other point properties preserved
        assert point["fill"] is True
        assert abs(point["fill_opacity"] - 0.8) < 1e-9

    def test_label_interval_parity(self):
        """label-interval: Python output matches cross-language golden example."""
        from debrief_calc.tools.track.styling.label_interval import label_interval

        features = [copy.deepcopy(TRACK_FEATURE_A)]
        context = _make_context(*features)
        result = label_interval(context, {"interval": "PT15M"})

        assert len(result) >= 1
        primary = [f for f in result if f["id"] == "track-001"][0]
        dps = primary["properties"]["default_position_style"]
        assert dps["show_label"] is True
        assert dps["label_interval"] == "PT15M"
        # Original properties preserved
        assert dps["show_symbol"] is True
        assert dps["symbol"] == "circle"

    def test_symbol_interval_parity(self):
        """symbol-interval: Python output matches cross-language golden example."""
        from debrief_calc.tools.track.styling.symbol_interval import symbol_interval

        features = [copy.deepcopy(TRACK_FEATURE_A)]
        context = _make_context(*features)
        result = symbol_interval(context, {"interval": "PT30M"})

        assert len(result) >= 1
        primary = [f for f in result if f["id"] == "track-001"][0]
        dps = primary["properties"]["default_position_style"]
        assert dps["show_symbol"] is True
        assert dps["symbol_interval"] == "PT30M"
        # Original properties preserved
        assert dps["symbol"] == "circle"

    def test_all_tools_preserve_feature_id(self):
        """All tools must preserve feature IDs across both languages."""
        from debrief_calc.tools.track.styling.apply_symbol_style import (
            apply_symbol_style,
        )
        from debrief_calc.tools.track.styling.label_interval import label_interval
        from debrief_calc.tools.track.styling.set_track_color import set_track_color
        from debrief_calc.tools.track.styling.symbol_interval import symbol_interval

        tools_and_params = [
            (set_track_color, {"color": "#FF0000"}),
            (apply_symbol_style, {"symbol": "diamond"}),
            (label_interval, {"interval": "PT5M"}),
            (symbol_interval, {"interval": "PT5M"}),
        ]

        for tool_fn, params in tools_and_params:
            features = [copy.deepcopy(TRACK_FEATURE_A)]
            context = _make_context(*features)
            result = tool_fn(context, params)
            assert result[0]["id"] == "track-001", f"{tool_fn.__name__} did not preserve feature ID"

    def test_all_tools_preserve_geometry(self):
        """All tools must preserve geometry across both languages."""
        from debrief_calc.tools.track.styling.apply_symbol_style import (
            apply_symbol_style,
        )
        from debrief_calc.tools.track.styling.label_interval import label_interval
        from debrief_calc.tools.track.styling.set_track_color import set_track_color
        from debrief_calc.tools.track.styling.symbol_interval import symbol_interval

        expected_coords = [[-1.0, 50.0], [-1.1, 50.1]]

        tools_and_params = [
            (set_track_color, {"color": "#FF0000"}),
            (apply_symbol_style, {"symbol": "diamond"}),
            (label_interval, {"interval": "PT5M"}),
            (symbol_interval, {"interval": "PT5M"}),
        ]

        for tool_fn, params in tools_and_params:
            features = [copy.deepcopy(TRACK_FEATURE_A)]
            context = _make_context(*features)
            result = tool_fn(context, params)
            assert result[0]["geometry"]["coordinates"] == expected_coords, (
                f"{tool_fn.__name__} modified geometry"
            )

    def test_all_tools_preserve_kind(self):
        """All tools must preserve properties.kind across both languages."""
        from debrief_calc.tools.track.styling.apply_symbol_style import (
            apply_symbol_style,
        )
        from debrief_calc.tools.track.styling.label_interval import label_interval
        from debrief_calc.tools.track.styling.set_track_color import set_track_color
        from debrief_calc.tools.track.styling.symbol_interval import symbol_interval

        tools_and_params = [
            (set_track_color, {"color": "#FF0000"}),
            (apply_symbol_style, {"symbol": "diamond"}),
            (label_interval, {"interval": "PT5M"}),
            (symbol_interval, {"interval": "PT5M"}),
        ]

        for tool_fn, params in tools_and_params:
            features = [copy.deepcopy(TRACK_FEATURE_A)]
            context = _make_context(*features)
            result = tool_fn(context, params)
            assert result[0]["properties"]["kind"] == "TRACK", f"{tool_fn.__name__} modified kind"
