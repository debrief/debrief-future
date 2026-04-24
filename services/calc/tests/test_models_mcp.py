"""Tests for Tool.to_mcp_tool() method."""

from debrief_calc.models import ContextType, Tool, ToolParameter


class TestToMcpTool:
    """Tests for the to_mcp_tool() method."""

    def test_single_context_type(self) -> None:
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

    def test_multi_context_type(self) -> None:
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

    def test_multi_context_multiple_kinds(self) -> None:
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

    def test_region_context_type(self) -> None:
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

    def test_none_context_type(self) -> None:
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

    def test_top_level_structure(self) -> None:
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

    def test_annotations_structure(self) -> None:
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

    def test_category_from_mutation_output_kind(self) -> None:
        tool = Tool(
            name="set-track-color",
            description="Set color",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
        )
        mcp = tool.to_mcp_tool()
        assert mcp["annotations"]["debrief:category"] == "track"

    def test_category_from_dataset_output_kind(self) -> None:
        tool = Tool(
            name="range-bearing",
            description="Range and bearing",
            input_kinds=["TRACK"],
            output_kind="dataset/range_bearing_series",
            context_type=ContextType.MULTI,
        )
        mcp = tool.to_mcp_tool()
        assert mcp["annotations"]["debrief:category"] == "analysis"

    def test_parameters_in_input_schema(self) -> None:
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

    def test_param_type_included_in_schema(self) -> None:
        """T019: x-debrief-param-type annotation is emitted when param_type is set."""
        tool = Tool(
            name="set-track-color",
            description="Set color",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
            parameters=[
                ToolParameter(
                    name="color",
                    type="enum",
                    description="Track color",
                    param_type="NamedColor",
                ),
            ],
        )
        mcp = tool.to_mcp_tool()
        params_schema = mcp["inputSchema"]["properties"]["params"]["properties"]
        assert "color" in params_schema
        assert params_schema["color"]["x-debrief-param-type"] == "NamedColor"
        # enum type with param_type but no choices should still have type: string
        assert params_schema["color"]["type"] == "string"
        # No enum key when choices are not provided
        assert "enum" not in params_schema["color"]

    def test_param_type_not_included_when_absent(self) -> None:
        """T019: x-debrief-param-type is NOT emitted when param_type is None (backward compat)."""
        tool = Tool(
            name="set-track-color",
            description="Set color",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
            parameters=[
                ToolParameter(
                    name="symbol",
                    type="enum",
                    description="Marker shape",
                    choices=["circle", "square", "diamond"],
                ),
            ],
        )
        mcp = tool.to_mcp_tool()
        params_schema = mcp["inputSchema"]["properties"]["params"]["properties"]
        assert "symbol" in params_schema
        assert "x-debrief-param-type" not in params_schema["symbol"]
        assert params_schema["symbol"]["enum"] == ["circle", "square", "diamond"]

    def test_param_type_with_choices_both_present(self) -> None:
        """T019: Both enum values and x-debrief-param-type are emitted when both are set."""
        tool = Tool(
            name="set-track-color",
            description="Set color",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
            parameters=[
                ToolParameter(
                    name="color",
                    type="enum",
                    description="Track color",
                    choices=["red", "blue", "green"],
                    param_type="NamedColor",
                ),
            ],
        )
        mcp = tool.to_mcp_tool()
        params_schema = mcp["inputSchema"]["properties"]["params"]["properties"]
        assert params_schema["color"]["enum"] == ["red", "blue", "green"]
        assert params_schema["color"]["x-debrief-param-type"] == "NamedColor"


class TestToolCategory:
    """Feature 207: visual category emission in to_mcp_tool()."""

    def test_tool_with_category_emits_ui_category_annotation(self) -> None:
        """Declared category is emitted as `debrief:uiCategory` annotation."""
        from debrief_calc.models import ToolCategoryEnum

        tool = Tool(
            name="range-bearing",
            description="Calculate range and bearing",
            input_kinds=["TRACK"],
            output_kind="dataset/range_bearing_series",
            context_type=ContextType.MULTI,
            category=ToolCategoryEnum.calc,
        )
        mcp = tool.to_mcp_tool()
        assert mcp["annotations"]["debrief:uiCategory"] == "calc"

    def test_tool_without_category_omits_ui_category_annotation(self) -> None:
        """Absent category means the annotation key is absent (not null)."""
        tool = Tool(
            name="legacy-tool",
            description="No category declared",
            input_kinds=["TRACK"],
            output_kind="track/statistics",
            context_type=ContextType.SINGLE,
        )
        mcp = tool.to_mcp_tool()
        assert "debrief:uiCategory" not in mcp["annotations"]

    def test_all_five_categories_round_trip_through_mcp(self) -> None:
        """Every canonical category value survives construction → to_mcp_tool()."""
        from debrief_calc.models import ToolCategoryEnum

        for cat in ToolCategoryEnum:
            tool = Tool(
                name=f"sample-{cat.value}",
                description=f"Sample {cat.value} tool",
                input_kinds=["TRACK"],
                output_kind="track/statistics",
                context_type=ContextType.SINGLE,
                category=cat,
            )
            mcp = tool.to_mcp_tool()
            assert mcp["annotations"]["debrief:uiCategory"] == cat.value

    def test_category_keeps_hierarchical_debrief_category_untouched(self) -> None:
        """FR-011: the existing debrief:category annotation is unaffected."""
        from debrief_calc.models import ToolCategoryEnum

        tool = Tool(
            name="set-track-color",
            description="Set track colour",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
            category=ToolCategoryEnum.style,
        )
        mcp = tool.to_mcp_tool()
        # Hierarchical category derived from output_kind — unchanged by this
        # feature. `_derive_category()` produces "track" for output_kind
        # "mutation/track/styled" (parts[1:-1] joined = ["track"]).
        assert mcp["annotations"]["debrief:category"] == "track"
        # New visual category is additive.
        assert mcp["annotations"]["debrief:uiCategory"] == "style"
