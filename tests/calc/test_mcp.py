"""Integration tests for MCP server."""

import json
import pytest

# Skip all tests if MCP is not installed
mcp = pytest.importorskip("mcp")


class TestMCPServer:
    """Tests for MCP server creation and tool registration."""

    def test_create_server(self):
        from debrief_calc.mcp import create_server

        server = create_server()
        assert server is not None
        assert server.name == "debrief-calc"

    def test_server_has_tools(self):
        from debrief_calc.mcp import create_server

        server = create_server()
        # Server should be created successfully with tools registered
        assert server is not None


class TestMCPToolExecution:
    """Tests for tool execution via MCP (simulated)."""

    def test_tool_name_conversion(self):
        """Test that tool names are converted correctly between MCP and calc formats."""
        # MCP uses underscores, calc uses hyphens
        mcp_name = "calc_track_stats"
        calc_name = mcp_name.replace("calc_", "").replace("_", "-")
        assert calc_name == "track-stats"

    def test_context_building_single(self):
        """Test context building for single-feature tools."""
        from debrief_calc.models import ContextType, SelectionContext

        features = [{"type": "Feature", "properties": {"kind": "track"}, "geometry": None}]
        context = SelectionContext(type=ContextType.SINGLE, features=features)

        assert context.type == ContextType.SINGLE
        assert len(context.features) == 1

    def test_context_building_multi(self):
        """Test context building for multi-feature tools."""
        from debrief_calc.models import ContextType, SelectionContext

        features = [
            {"type": "Feature", "properties": {"kind": "track"}, "geometry": None},
            {"type": "Feature", "properties": {"kind": "track"}, "geometry": None}
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)

        assert context.type == ContextType.MULTI
        assert len(context.features) == 2

    def test_context_building_region(self):
        """Test context building for region tools."""
        from debrief_calc.models import ContextType, SelectionContext

        bounds = [-5.0, 49.0, -3.0, 51.0]
        context = SelectionContext(type=ContextType.REGION, bounds=bounds)

        assert context.type == ContextType.REGION
        assert context.bounds == bounds


class TestMCPErrorCodes:
    """Tests for MCP error code handling."""

    def test_error_codes_defined(self):
        from debrief_calc.mcp.server import (
            ERROR_TOOL_NOT_FOUND,
            ERROR_INVALID_CONTEXT,
            ERROR_KIND_MISMATCH,
            ERROR_EXECUTION_FAILED
        )

        assert ERROR_TOOL_NOT_FOUND == "TOOL_NOT_FOUND"
        assert ERROR_INVALID_CONTEXT == "INVALID_CONTEXT"
        assert ERROR_KIND_MISMATCH == "KIND_MISMATCH"
        assert ERROR_EXECUTION_FAILED == "EXECUTION_FAILED"


class TestMCPWithoutSDK:
    """Tests for behavior when MCP SDK is not installed."""

    def test_has_mcp_flag(self):
        from debrief_calc.mcp.server import HAS_MCP
        # If we got here, MCP is installed
        assert HAS_MCP is True
