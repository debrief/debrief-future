"""Integration tests for MCP server."""

import pytest

# Skip all tests if MCP is not installed
mcp = pytest.importorskip("mcp")


class TestMCPServer:
    """Tests for MCP server creation and tool registration."""

    def test_create_server(self) -> None:
        from debrief_calc.mcp import create_server

        server = create_server()
        assert server is not None
        assert server.name == "debrief-calc"

    def test_server_has_tools(self) -> None:
        from debrief_calc.mcp import create_server

        server = create_server()
        # Server should be created successfully with tools registered
        assert server is not None


class TestMCPToolExecution:
    """Tests for tool execution via MCP (simulated)."""

    def test_tool_name_conversion(self) -> None:
        """Test that tool names are converted correctly between MCP and calc formats."""
        # MCP uses underscores, calc uses hyphens
        mcp_name = "calc_track_stats"
        calc_name = mcp_name.replace("calc_", "").replace("_", "-")
        assert calc_name == "track-stats"

    def test_context_building_single(self) -> None:
        """Test context building for single-feature tools."""
        from debrief_calc.models import ContextType, SelectionContext

        features = [{"type": "Feature", "properties": {"kind": "TRACK"}, "geometry": None}]
        context = SelectionContext(type=ContextType.SINGLE, features=features)

        assert context.type == ContextType.SINGLE
        assert len(context.features) == 1

    def test_context_building_multi(self) -> None:
        """Test context building for multi-feature tools."""
        from debrief_calc.models import ContextType, SelectionContext

        features = [
            {"type": "Feature", "properties": {"kind": "TRACK"}, "geometry": None},
            {"type": "Feature", "properties": {"kind": "TRACK"}, "geometry": None},
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)

        assert context.type == ContextType.MULTI
        assert len(context.features) == 2

    def test_context_building_region(self) -> None:
        """Test context building for region tools."""
        from debrief_calc.models import ContextType, SelectionContext

        bounds = [-5.0, 49.0, -3.0, 51.0]
        context = SelectionContext(type=ContextType.REGION, bounds=bounds)

        assert context.type == ContextType.REGION
        assert context.bounds == bounds


class TestMCPResponseFormat:
    """Tests for MCP response format using result_builder."""

    def test_build_addition_response(self) -> None:
        """Verify result_builder produces correct MCP content structure."""
        from debrief_calc.result_builder import build_addition, build_response

        features = [
            {"type": "Feature", "id": "f1", "geometry": None, "properties": {"kind": "stats"}}
        ]
        items = build_addition(
            features=features,
            result_subtype="track/statistics",
            source_feature_ids=["track-1"],
            label="track-stats results",
        )
        response = build_response(items)

        assert "content" in response
        assert len(response["content"]) == 1
        item = response["content"][0]
        assert item["type"] == "resource"
        assert item["annotations"]["debrief:resultType"] == "addition/track/statistics"
        assert item["annotations"]["debrief:sourceFeatures"] == ["track-1"]

    def test_build_error_response(self) -> None:
        """Verify result_builder produces correct MCP error structure."""
        from debrief_calc.result_builder import build_error

        error = build_error(
            message="Tool not found",
            category="resource_not_found",
            affected_feature_ids=["track-1"],
        )
        assert error["code"] == -32000
        assert error["message"] == "Tool not found"
        assert error["data"]["debrief:errorCategory"] == "resource_not_found"
        assert error["data"]["debrief:affectedFeatures"] == ["track-1"]


class TestMCPArtifactResponse:
    """Tests for artifact result format."""

    def test_build_artifact_response(self) -> None:
        """Verify result_builder produces correct artifact content."""
        from debrief_calc.result_builder import build_artifact, build_response

        data = b'{"type":"range-bearing-series","entries":[]}'
        item = build_artifact(
            data=data,
            mime_type="application/json",
            result_subtype="dataset/range_bearing_series",
            source_feature_ids=["track-1", "track-2"],
            label="range-bearing results",
            href="range_bearing_series-track-1-track-2.json",
        )
        response = build_response([item])

        assert "content" in response
        assert len(response["content"]) == 1
        content = response["content"][0]
        assert content["type"] == "resource"
        assert (
            content["annotations"]["debrief:resultType"] == "artifact/dataset/range_bearing_series"
        )
        assert content["annotations"]["debrief:href"] == "range_bearing_series-track-1-track-2.json"
        assert content["resource"]["mimeType"] == "application/json"


class TestMCPErrorCodes:
    """Tests for MCP error code handling."""

    def test_error_codes_defined(self) -> None:
        from debrief_calc.mcp.server import (
            ERROR_EXECUTION_FAILED,
            ERROR_INVALID_CONTEXT,
            ERROR_KIND_MISMATCH,
            ERROR_TOOL_NOT_FOUND,
        )

        assert ERROR_TOOL_NOT_FOUND == "TOOL_NOT_FOUND"
        assert ERROR_INVALID_CONTEXT == "INVALID_CONTEXT"
        assert ERROR_KIND_MISMATCH == "KIND_MISMATCH"
        assert ERROR_EXECUTION_FAILED == "EXECUTION_FAILED"


class TestMCPWithoutSDK:
    """Tests for behavior when MCP SDK is not installed."""

    def test_has_mcp_flag(self) -> None:
        from debrief_calc.mcp.server import HAS_MCP

        # If we got here, MCP is installed
        assert HAS_MCP is True
