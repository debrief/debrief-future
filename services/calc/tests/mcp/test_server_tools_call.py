"""Integration test: MCP tools/call executes tool and returns ToolResponse with provenance."""

import json

import pytest
from debrief_calc.mcp.server import create_server
from debrief_calc.models import ContextType

# We can't easily run the async MCP server in tests, so we test the
# underlying tool execution and result builder pipeline directly.
from debrief_calc.result_builder import build_mutation, build_response


class TestServerToolsCall:
    """Verify tool execution returns properly structured ToolResponse."""

    def test_mutation_tool_returns_response_with_provenance(self):
        """A mutation tool should return content items with debrief annotations."""
        from debrief_calc.models import SelectionContext
        from debrief_calc.tools.track.styling.set_track_color import set_track_color

        features = [
            {
                "type": "Feature",
                "id": "track-001",
                "geometry": {"type": "LineString", "coordinates": [[-1.0, 50.0]]},
                "properties": {"kind": "TRACK"},
            },
            {
                "type": "Feature",
                "id": "track-002",
                "geometry": {"type": "LineString", "coordinates": [[-2.0, 51.0]]},
                "properties": {"kind": "TRACK"},
            },
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)
        result_features = set_track_color(context, {"color": "#FF0000"})

        # Build MCP response like the server would
        source_ids = ["track-001", "track-002"]
        content_items = build_mutation(
            features=result_features,
            result_subtype="track/styled",
            source_feature_ids=source_ids,
            label="set-track-color results",
        )
        response = build_response(content_items)

        # Verify response structure
        assert "content" in response
        assert len(response["content"]) == 2

        for item in response["content"]:
            assert item["type"] == "resource"
            assert "resource" in item
            assert item["resource"]["mimeType"] == "application/geo+json"
            # Verify provenance annotations
            annotations = item["annotations"]
            assert annotations["debrief:resultType"] == "mutation/track/styled"
            assert "track-001" in annotations["debrief:sourceFeatures"] or \
                   "track-002" in annotations["debrief:sourceFeatures"]
            assert annotations["debrief:label"] == "set-track-color results"

    def test_mutation_content_contains_modified_feature(self):
        """The content text should contain the modified feature as JSON."""
        from debrief_calc.models import SelectionContext
        from debrief_calc.tools.track.styling.set_track_color import set_track_color

        features = [
            {
                "type": "Feature",
                "id": "track-001",
                "geometry": {"type": "LineString", "coordinates": [[-1.0, 50.0]]},
                "properties": {"kind": "TRACK"},
            },
            {
                "type": "Feature",
                "id": "track-002",
                "geometry": {"type": "LineString", "coordinates": [[-2.0, 51.0]]},
                "properties": {"kind": "TRACK"},
            },
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)
        result_features = set_track_color(context, {"color": "#FF0000"})

        content_items = build_mutation(
            features=result_features,
            result_subtype="track/styled",
            source_feature_ids=["track-001", "track-002"],
            label="set-track-color results",
        )

        # Parse the text back to verify it's valid JSON with expected color
        for item in content_items:
            feature_json = json.loads(item["resource"]["text"])
            assert feature_json["properties"]["style"]["line"]["color"] == "#FF0000"

    def test_each_mutation_content_has_feature_uri(self):
        """Each content item URI should reference the feature ID."""
        from debrief_calc.models import SelectionContext
        from debrief_calc.tools.track.styling.set_track_color import set_track_color

        features = [
            {
                "type": "Feature",
                "id": "track-001",
                "geometry": {"type": "LineString", "coordinates": [[-1.0, 50.0]]},
                "properties": {"kind": "TRACK"},
            },
            {
                "type": "Feature",
                "id": "track-002",
                "geometry": {"type": "LineString", "coordinates": [[-2.0, 51.0]]},
                "properties": {"kind": "TRACK"},
            },
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)
        result_features = set_track_color(context, {"color": "#FF0000"})

        content_items = build_mutation(
            features=result_features,
            result_subtype="track/styled",
            source_feature_ids=["track-001", "track-002"],
            label="set-track-color results",
        )

        uris = [item["resource"]["uri"] for item in content_items]
        assert "feature://track-001" in uris
        assert "feature://track-002" in uris

    def test_all_styling_tools_produce_mutation_results(self):
        """All 4 styling tools must produce mutation/track/styled result type."""
        from debrief_calc import registry

        import debrief_calc.tools  # noqa: F401

        styling_names = {"set-track-color", "apply-symbol-style", "label-interval", "symbol-interval"}
        for tool in registry.list_all():
            if tool.name in styling_names:
                assert tool.output_kind.startswith("mutation/"), (
                    f"Tool {tool.name} should produce mutation results, got {tool.output_kind}"
                )
