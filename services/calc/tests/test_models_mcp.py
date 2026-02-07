"""Tests for Tool.to_mcp_tool() method."""

from debrief_calc.models import ContextType, Tool, ToolParameter


class TestToMcpTool:
    """Tests for the to_mcp_tool() method."""

    def test_single_context_type(self):
        tool = Tool(
            name="track-stats",
            description="Calculate track statistics",
            input_kinds=["TRACK"],
            output_kind="track/statistics",
            context_type=ContextType.SINGLE,
        )
        mcp = tool.to_mcp_tool()
        reqs = mcp["annotations"]["debrief:selectionRequirements"]
        assert len(reqs) == 1
        assert reqs[0] == {"kind": "TRACK", "min": 1, "max": 1}

    def test_multi_context_type(self):
        tool = Tool(
            name="range-bearing",
            description="Calculate range and bearing",
            input_kinds=["TRACK"],
            output_kind="dataset/range_bearing_series",
            context_type=ContextType.MULTI,
        )
        mcp = tool.to_mcp_tool()
        reqs = mcp["annotations"]["debrief:selectionRequirements"]
        assert len(reqs) == 1
        assert reqs[0] == {"kind": "TRACK", "min": 1}

    def test_multi_context_multiple_kinds(self):
        tool = Tool(
            name="mixed-analysis",
            description="Analyze mixed features",
            input_kinds=["TRACK", "POINT"],
            output_kind="analysis/mixed",
            context_type=ContextType.MULTI,
        )
        mcp = tool.to_mcp_tool()
        reqs = mcp["annotations"]["debrief:selectionRequirements"]
        assert len(reqs) == 2
        assert {"kind": "TRACK", "min": 1} in reqs
        assert {"kind": "POINT", "min": 1} in reqs

    def test_region_context_type(self):
        tool = Tool(
            name="area-summary",
            description="Summarize area",
            input_kinds=["TRACK"],
            output_kind="analysis/area",
            context_type=ContextType.REGION,
        )
        mcp = tool.to_mcp_tool()
        reqs = mcp["annotations"]["debrief:selectionRequirements"]
        assert len(reqs) == 1
        assert reqs[0] == {"kind": "REGION", "min": 1, "max": 1}

    def test_none_context_type(self):
        tool = Tool(
            name="global-stats",
            description="Show global statistics",
            input_kinds=["TRACK"],
            output_kind="analysis/global",
            context_type=ContextType.NONE,
        )
        mcp = tool.to_mcp_tool()
        reqs = mcp["annotations"]["debrief:selectionRequirements"]
        assert reqs == []

    def test_top_level_structure(self):
        tool = Tool(
            name="set-track-color",
            description="Set display color for tracks",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
            version="1.0.0",
        )
        mcp = tool.to_mcp_tool()
        assert mcp["name"] == "set-track-color"
        assert mcp["description"] == "Set display color for tracks"
        assert "inputSchema" in mcp
        assert mcp["inputSchema"]["type"] == "object"
        assert "annotations" in mcp

    def test_annotations_structure(self):
        tool = Tool(
            name="set-track-color",
            description="Set display color for tracks",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
            version="1.0.0",
        )
        mcp = tool.to_mcp_tool()
        annotations = mcp["annotations"]
        assert "debrief:selectionRequirements" in annotations
        assert "debrief:version" in annotations
        assert annotations["debrief:version"] == "1.0.0"
        assert "debrief:outputKind" in annotations
        assert annotations["debrief:outputKind"] == "mutation/track/styled"
        assert "debrief:category" in annotations

    def test_category_from_mutation_output_kind(self):
        tool = Tool(
            name="set-track-color",
            description="Set color",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
        )
        mcp = tool.to_mcp_tool()
        assert mcp["annotations"]["debrief:category"] == "track"

    def test_category_from_dataset_output_kind(self):
        tool = Tool(
            name="range-bearing",
            description="Range and bearing",
            input_kinds=["TRACK"],
            output_kind="dataset/range_bearing_series",
            context_type=ContextType.MULTI,
        )
        mcp = tool.to_mcp_tool()
        assert mcp["annotations"]["debrief:category"] == "analysis"

    def test_parameters_in_input_schema(self):
        tool = Tool(
            name="set-track-color",
            description="Set color",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
            parameters=[
                ToolParameter(
                    name="color",
                    type="string",
                    description="CSS color value",
                    required=True,
                ),
                ToolParameter(
                    name="symbol",
                    type="enum",
                    description="Marker shape",
                    choices=["circle", "square", "diamond"],
                    default="circle",
                ),
            ],
        )
        mcp = tool.to_mcp_tool()
        params_schema = mcp["inputSchema"]["properties"]["params"]["properties"]
        assert "color" in params_schema
        assert params_schema["color"]["type"] == "string"
        assert "symbol" in params_schema
        assert params_schema["symbol"]["enum"] == ["circle", "square", "diamond"]
