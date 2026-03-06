"""Tests for tool metadata completeness."""

import pytest
from debrief_calc import registry
from debrief_calc.models import ContextType


class TestToolMetadataCompleteness:
    """Tests that all tools have complete metadata."""

    def test_all_tools_have_name(self) -> None:
        for tool in registry.list_all():
            assert tool.name is not None
            assert len(tool.name) > 0
            assert tool.name.replace("-", "").isalnum()

    def test_all_tools_have_description(self) -> None:
        for tool in registry.list_all():
            assert tool.description is not None
            assert len(tool.description) > 10  # Meaningful description

    def test_all_tools_have_version(self) -> None:
        for tool in registry.list_all():
            assert tool.version is not None
            # Version should be semantic (x.y.z)
            parts = tool.version.split(".")
            assert len(parts) >= 2

    def test_all_tools_have_input_kinds(self) -> None:
        for tool in registry.list_all():
            assert tool.input_kinds is not None
            # ContextType.NONE tools may have empty input_kinds
            if tool.context_type != ContextType.NONE:
                assert len(tool.input_kinds) >= 1

    def test_all_tools_have_output_kind(self) -> None:
        for tool in registry.list_all():
            assert tool.output_kind is not None
            assert len(tool.output_kind) > 0

    def test_all_tools_have_context_type(self) -> None:
        for tool in registry.list_all():
            assert tool.context_type is not None
            assert tool.context_type.value in ("single", "multi", "region", "none")


class TestToolMetadataFormat:
    """Tests for metadata serialization format."""

    def test_to_metadata_returns_dict(self) -> None:
        tool = registry.get_tool("track-stats")
        meta = tool.to_metadata()

        assert isinstance(meta, dict)

    def test_to_metadata_has_all_fields(self) -> None:
        tool = registry.get_tool("track-stats")
        meta = tool.to_metadata()

        required_fields = [
            "name",
            "description",
            "version",
            "input_kinds",
            "output_kind",
            "context_type",
            "parameters",
        ]
        for field in required_fields:
            assert field in meta, f"Missing field: {field}"

    def test_context_type_is_string_in_metadata(self) -> None:
        tool = registry.get_tool("track-stats")
        meta = tool.to_metadata()

        # Should be string value, not enum
        assert meta["context_type"] == "single"
        assert isinstance(meta["context_type"], str)

    def test_parameters_are_serialized(self) -> None:
        tool = registry.get_tool("track-stats")
        meta = tool.to_metadata()

        assert isinstance(meta["parameters"], list)
        if meta["parameters"]:
            param = meta["parameters"][0]
            assert "name" in param
            assert "type" in param
            assert "description" in param


class TestRegistryDescribe:
    """Tests for registry.describe() method."""

    def test_describe_returns_metadata(self) -> None:
        meta = registry.describe("track-stats")

        assert meta["name"] == "track-stats"
        assert "description" in meta
        assert "version" in meta

    def test_describe_nonexistent_raises(self) -> None:
        from debrief_calc.exceptions import ToolNotFoundError

        with pytest.raises(ToolNotFoundError):
            registry.describe("nonexistent-tool")


class TestParameterDocumentation:
    """Tests that tool parameters are documented."""

    def test_track_stats_has_distance_unit_param(self) -> None:
        tool = registry.get_tool("track-stats")

        param_names = [p.name for p in tool.parameters]
        assert "distance_unit" in param_names

    def test_range_bearing_has_no_params(self) -> None:
        tool = registry.get_tool("range-bearing")

        assert len(tool.parameters) == 0

    def test_area_summary_has_include_centroid_param(self) -> None:
        tool = registry.get_tool("area-summary")

        param_names = [p.name for p in tool.parameters]
        assert "include_centroid" in param_names

    def test_all_parameters_have_description(self) -> None:
        for tool in registry.list_all():
            for param in tool.parameters:
                assert param.description is not None
                assert len(param.description) > 0

    def test_enum_parameters_have_choices_or_param_type(self) -> None:
        for tool in registry.list_all():
            for param in tool.parameters:
                if param.type == "enum":
                    assert param.choices is not None or param.param_type is not None, (
                        f"enum param '{param.name}' on tool '{tool.name}' needs choices or param_type"
                    )


class TestLLMSupervisorMetadata:
    """Tests that metadata is suitable for LLM Supervisor integration."""

    def test_input_kinds_are_strings(self) -> None:
        """LLM needs to match kinds as strings."""
        for tool in registry.list_all():
            for kind in tool.input_kinds:
                assert isinstance(kind, str)

    def test_output_kind_is_string(self) -> None:
        """LLM needs to know output kind for downstream processing."""
        for tool in registry.list_all():
            assert isinstance(tool.output_kind, str)

    def test_accepts_kind_method_works(self) -> None:
        """LLM can use accepts_kind to filter tools."""
        track_tool = registry.get_tool("track-stats")

        assert track_tool.accepts_kind("TRACK") is True
        assert track_tool.accepts_kind("ZONE") is False
