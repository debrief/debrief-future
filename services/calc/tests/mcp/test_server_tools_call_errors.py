"""Test error handling: invalid input returns ToolErrorResponse with category and message."""

import pytest
from debrief_calc.result_builder import build_error


class TestServerToolsCallErrors:
    """Verify error handling for tool execution via MCP."""

    def test_error_has_code_and_message(self) -> None:
        """Error response must include code and message."""
        error = build_error(
            message="No track features found in input",
            category="invalid_input",
            affected_feature_ids=[],
        )
        assert error["code"] == -32000
        assert error["message"] == "No track features found in input"

    def test_error_has_debrief_category(self) -> None:
        """Error response must include debrief:errorCategory."""
        error = build_error(
            message="Test error",
            category="invalid_input",
            affected_feature_ids=["track-001"],
        )
        assert error["data"]["debrief:errorCategory"] == "invalid_input"

    def test_error_has_affected_features(self) -> None:
        """Error response must include debrief:affectedFeatures."""
        error = build_error(
            message="Test error",
            category="algorithm_failure",
            affected_feature_ids=["track-001", "track-002"],
        )
        affected = error["data"]["debrief:affectedFeatures"]
        assert "track-001" in affected
        assert "track-002" in affected

    def test_invalid_error_category_rejected(self) -> None:
        """Only valid error categories should be accepted."""
        with pytest.raises(ValueError, match="category must be one of"):
            build_error(
                message="Test",
                category="bad_category",
                affected_feature_ids=[],
            )

    def test_tool_missing_required_param_raises_error(self) -> None:
        """Tool execution with missing required parameter should raise."""
        from debrief_calc.models import ContextType, SelectionContext
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
        with pytest.raises(ValueError, match="color parameter is required"):
            set_track_color(context, {})

    def test_tool_no_matching_features_raises_error(self) -> None:
        """Tool execution with no matching features should raise."""
        from debrief_calc.models import ContextType, SelectionContext
        from debrief_calc.tools.track.styling.set_track_color import set_track_color

        features = [
            {
                "type": "Feature",
                "id": "point-001",
                "geometry": {"type": "Point", "coordinates": [-1.0, 50.0]},
                "properties": {"kind": "POINT"},
            },
            {
                "type": "Feature",
                "id": "point-002",
                "geometry": {"type": "Point", "coordinates": [-2.0, 51.0]},
                "properties": {"kind": "POINT"},
            },
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)
        with pytest.raises(ValueError, match="No track features found"):
            set_track_color(context, {"color": "#FF0000"})

    def test_resource_not_found_error(self) -> None:
        """Error response for unknown tool should use resource_not_found category."""
        error = build_error(
            message="Tool 'nonexistent-tool' not found",
            category="resource_not_found",
            affected_feature_ids=[],
        )
        assert error["data"]["debrief:errorCategory"] == "resource_not_found"
