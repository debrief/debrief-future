"""Contract test: MCP tools/list response matches expected schema."""

from debrief_calc.models import ContextType, Tool


class TestToolListContract:
    """Verify tool-list contract structure."""

    def test_to_mcp_tool_has_required_fields(self) -> None:
        """Every MCP tool definition must have name, description, inputSchema, annotations."""
        tool = Tool(
            name="set-track-color",
            description="Set display color",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
        )
        mcp = tool.to_mcp_tool()
        assert "name" in mcp
        assert "description" in mcp
        assert "inputSchema" in mcp
        assert "annotations" in mcp

    def test_annotations_have_required_debrief_keys(self) -> None:
        """Annotations must include all debrief: keys."""
        tool = Tool(
            name="set-track-color",
            description="Set display color",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
        )
        mcp = tool.to_mcp_tool()
        annotations = mcp["annotations"]
        required_keys = [
            "debrief:selectionRequirements",
            "debrief:category",
            "debrief:version",
            "debrief:outputKind",
        ]
        for key in required_keys:
            assert key in annotations, f"Missing annotation key: {key}"

    def test_selection_requirements_are_list_of_dicts(self) -> None:
        """Selection requirements must be a list of requirement dicts."""
        tool = Tool(
            name="set-track-color",
            description="Set display color",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
        )
        mcp = tool.to_mcp_tool()
        reqs = mcp["annotations"]["debrief:selectionRequirements"]
        assert isinstance(reqs, list)
        for req in reqs:
            assert isinstance(req, dict)
            assert "kind" in req
            assert "min" in req

    def test_input_schema_has_features_and_params(self) -> None:
        """Input schema must have features and params properties."""
        tool = Tool(
            name="set-track-color",
            description="Set display color",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
        )
        mcp = tool.to_mcp_tool()
        props = mcp["inputSchema"]["properties"]
        assert "features" in props
        assert "params" in props
