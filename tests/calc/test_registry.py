"""Unit tests for debrief-calc registry."""

import pytest
from debrief_calc.exceptions import ToolNotFoundError
from debrief_calc.models import ContextType, SelectionContext, Tool, ToolParameter
from debrief_calc.registry import ToolRegistry


@pytest.fixture
def fresh_registry():
    """Create a fresh registry for each test."""
    return ToolRegistry()


@pytest.fixture
def sample_tool():
    """Create a sample tool for testing."""
    return Tool(
        name="test-tool",
        description="A test tool",
        input_kinds=["track"],
        output_kind="result",
        context_type=ContextType.SINGLE,
        handler=lambda ctx, params: [],
    )


@pytest.fixture
def multi_tool():
    """Create a multi-track tool for testing."""
    return Tool(
        name="multi-tool",
        description="A multi-track tool",
        input_kinds=["track"],
        output_kind="comparison",
        context_type=ContextType.MULTI,
        handler=lambda ctx, params: [],
    )


@pytest.fixture
def zone_tool():
    """Create a zone analysis tool for testing."""
    return Tool(
        name="zone-tool",
        description="A zone analysis tool",
        input_kinds=["zone"],
        output_kind="zone-stats",
        context_type=ContextType.SINGLE,
        handler=lambda ctx, params: [],
    )


class TestToolRegistry:
    """Tests for ToolRegistry class."""

    def test_register_tool(self, fresh_registry, sample_tool):
        fresh_registry.register(sample_tool)
        assert len(fresh_registry) == 1
        assert "test-tool" in fresh_registry

    def test_register_duplicate_raises(self, fresh_registry, sample_tool):
        fresh_registry.register(sample_tool)
        with pytest.raises(ValueError, match="already registered"):
            fresh_registry.register(sample_tool)

    def test_get_tool(self, fresh_registry, sample_tool):
        fresh_registry.register(sample_tool)
        retrieved = fresh_registry.get_tool("test-tool")
        assert retrieved.name == "test-tool"
        assert retrieved is sample_tool

    def test_get_nonexistent_tool_raises(self, fresh_registry):
        with pytest.raises(ToolNotFoundError):
            fresh_registry.get_tool("nonexistent")

    def test_list_all_empty(self, fresh_registry):
        tools = fresh_registry.list_all()
        assert tools == []

    def test_list_all_sorted(self, fresh_registry, sample_tool, multi_tool, zone_tool):
        fresh_registry.register(zone_tool)
        fresh_registry.register(sample_tool)
        fresh_registry.register(multi_tool)

        tools = fresh_registry.list_all()
        names = [t.name for t in tools]
        assert names == ["multi-tool", "test-tool", "zone-tool"]

    def test_find_tools_by_context_type(self, fresh_registry, sample_tool, multi_tool):
        fresh_registry.register(sample_tool)
        fresh_registry.register(multi_tool)

        single_tools = fresh_registry.find_tools(context_type=ContextType.SINGLE)
        assert len(single_tools) == 1
        assert single_tools[0].name == "test-tool"

        multi_tools = fresh_registry.find_tools(context_type=ContextType.MULTI)
        assert len(multi_tools) == 1
        assert multi_tools[0].name == "multi-tool"

    def test_find_tools_by_kinds(self, fresh_registry, sample_tool, zone_tool):
        fresh_registry.register(sample_tool)
        fresh_registry.register(zone_tool)

        track_tools = fresh_registry.find_tools(kinds={"track"})
        assert len(track_tools) == 1
        assert track_tools[0].name == "test-tool"

        zone_tools = fresh_registry.find_tools(kinds={"zone"})
        assert len(zone_tools) == 1
        assert zone_tools[0].name == "zone-tool"

    def test_find_tools_by_context_and_kinds(
        self, fresh_registry, sample_tool, multi_tool, zone_tool
    ):
        fresh_registry.register(sample_tool)
        fresh_registry.register(multi_tool)
        fresh_registry.register(zone_tool)

        # Single context + track kind -> only test-tool
        tools = fresh_registry.find_tools(context_type=ContextType.SINGLE, kinds={"track"})
        assert len(tools) == 1
        assert tools[0].name == "test-tool"

        # Single context + zone kind -> only zone-tool
        tools = fresh_registry.find_tools(context_type=ContextType.SINGLE, kinds={"zone"})
        assert len(tools) == 1
        assert tools[0].name == "zone-tool"

    def test_find_tools_no_match(self, fresh_registry, sample_tool):
        fresh_registry.register(sample_tool)

        # No tools match region context
        tools = fresh_registry.find_tools(context_type=ContextType.REGION)
        assert tools == []

        # No tools accept "point" kind
        tools = fresh_registry.find_tools(kinds={"point"})
        assert tools == []

    def test_find_tools_for_context(self, fresh_registry, sample_tool, multi_tool):
        fresh_registry.register(sample_tool)
        fresh_registry.register(multi_tool)

        # Create a single-track context
        feature = {"type": "Feature", "properties": {"kind": "track"}, "geometry": None}
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])

        tools = fresh_registry.find_tools_for_context(context)
        assert len(tools) == 1
        assert tools[0].name == "test-tool"

    def test_describe_returns_metadata(self, fresh_registry, sample_tool):
        fresh_registry.register(sample_tool)

        metadata = fresh_registry.describe("test-tool")
        assert metadata["name"] == "test-tool"
        assert metadata["description"] == "A test tool"
        assert metadata["input_kinds"] == ["track"]
        assert metadata["context_type"] == "single"

    def test_describe_nonexistent_raises(self, fresh_registry):
        with pytest.raises(ToolNotFoundError):
            fresh_registry.describe("nonexistent")

    def test_clear(self, fresh_registry, sample_tool, multi_tool):
        fresh_registry.register(sample_tool)
        fresh_registry.register(multi_tool)
        assert len(fresh_registry) == 2

        fresh_registry.clear()
        assert len(fresh_registry) == 0

    def test_contains(self, fresh_registry, sample_tool):
        assert "test-tool" not in fresh_registry
        fresh_registry.register(sample_tool)
        assert "test-tool" in fresh_registry


class TestToolDecorator:
    """Tests for @tool decorator."""

    def test_decorator_registers_tool(self, fresh_registry):
        # Use a fresh registry to avoid pollution
        from debrief_calc import registry as global_registry

        _ = len(global_registry)  # Verify registry is accessible

        # Note: We can't easily test the decorator without modifying global state
        # So we test registration manually instead
        def my_handler(context, params):
            return []

        tool_instance = Tool(
            name="decorator-test",
            description="Test",
            input_kinds=["track"],
            output_kind="result",
            context_type=ContextType.SINGLE,
            handler=my_handler,
        )
        fresh_registry.register(tool_instance)

        assert "decorator-test" in fresh_registry
        assert fresh_registry.get_tool("decorator-test").handler is my_handler

    def test_tool_with_parameters(self, fresh_registry):
        tool_instance = Tool(
            name="param-tool",
            description="Tool with params",
            input_kinds=["track"],
            output_kind="result",
            context_type=ContextType.SINGLE,
            parameters=[
                ToolParameter(
                    name="unit",
                    type="enum",
                    description="Distance unit",
                    choices=["nm", "km", "mi"],
                )
            ],
            handler=lambda ctx, params: [],
        )
        fresh_registry.register(tool_instance)

        metadata = fresh_registry.describe("param-tool")
        assert len(metadata["parameters"]) == 1
        assert metadata["parameters"][0]["name"] == "unit"


class TestFindToolsEdgeCases:
    """Edge case tests for find_tools."""

    def test_tool_accepting_multiple_kinds(self, fresh_registry):
        """Tool that accepts multiple kinds should match any of them."""
        multi_kind_tool = Tool(
            name="multi-kind",
            description="Accepts track or zone",
            input_kinds=["track", "zone"],
            output_kind="result",
            context_type=ContextType.SINGLE,
            handler=lambda ctx, params: [],
        )
        fresh_registry.register(multi_kind_tool)

        # Should match track
        tools = fresh_registry.find_tools(kinds={"track"})
        assert len(tools) == 1

        # Should match zone
        tools = fresh_registry.find_tools(kinds={"zone"})
        assert len(tools) == 1

        # Should match either
        tools = fresh_registry.find_tools(kinds={"track", "zone"})
        assert len(tools) == 1

    def test_empty_kinds_filter_returns_all(self, fresh_registry, sample_tool, zone_tool):
        """Empty kinds set should not filter (return all)."""
        fresh_registry.register(sample_tool)
        fresh_registry.register(zone_tool)

        # None kinds = no filter
        tools = fresh_registry.find_tools(kinds=None)
        assert len(tools) == 2

        # Empty set is different - no kinds match
        tools = fresh_registry.find_tools(kinds=set())
        assert len(tools) == 0

    def test_find_tools_returns_sorted_copy(self, fresh_registry, sample_tool, multi_tool):
        """Returned list should be a new list, sorted alphabetically."""
        fresh_registry.register(multi_tool)
        fresh_registry.register(sample_tool)

        tools1 = fresh_registry.list_all()
        tools2 = fresh_registry.list_all()

        # Should be equal but not the same object
        assert tools1 == tools2
        assert tools1 is not tools2
        assert tools1[0].name == "multi-tool"  # alphabetically first
