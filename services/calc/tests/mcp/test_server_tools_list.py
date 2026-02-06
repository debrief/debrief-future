"""Integration test: tools/list returns all registered tools with debrief annotations."""

from debrief_calc import registry


class TestServerToolsList:
    """Verify that all registered tools can generate MCP definitions."""

    def test_all_registered_tools_have_mcp_definitions(self):
        """Every registered tool should produce a valid MCP tool definition."""
        # Import tools to ensure they're registered
        import debrief_calc.tools  # noqa: F401

        all_tools = registry.list_all()
        assert len(all_tools) >= 3  # At least the existing 3 tools

        for tool in all_tools:
            mcp = tool.to_mcp_tool()
            assert mcp["name"] == tool.name
            assert mcp["description"] == tool.description
            assert "annotations" in mcp

    def test_styling_tools_have_track_requirements(self):
        """All 4 styling tools should require TRACK features."""
        # Import styling tools
        import debrief_calc.tools.track.styling  # noqa: F401

        styling_names = {
            "set-track-color",
            "apply-symbol-style",
            "label-interval",
            "symbol-interval",
        }
        all_tools = registry.list_all()
        styling_tools = [t for t in all_tools if t.name in styling_names]

        for tool in styling_tools:
            mcp = tool.to_mcp_tool()
            reqs = mcp["annotations"]["debrief:selectionRequirements"]
            assert len(reqs) >= 1
            track_reqs = [r for r in reqs if r["kind"] == "TRACK"]
            assert len(track_reqs) >= 1, f"Tool {tool.name} should require TRACK features"
