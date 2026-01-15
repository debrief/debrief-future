"""Tests for tool metadata completeness."""

import pytest

from debrief_calc import registry
from debrief_calc.tools import track_stats, range_bearing, area_summary


class TestToolMetadataCompleteness:
    """Tests that all tools have complete metadata."""

    def test_all_tools_have_name(self):
        for tool in registry.list_all():
            assert tool.name is not None
            assert len(tool.name) > 0
            assert tool.name.replace("-", "").isalnum()

    def test_all_tools_have_description(self):
        for tool in registry.list_all():
            assert tool.description is not None
            assert len(tool.description) > 10  # Meaningful description

    def test_all_tools_have_version(self):
        for tool in registry.list_all():
            assert tool.version is not None
            # Version should be semantic (x.y.z)
            parts = tool.version.split(".")
            assert len(parts) >= 2

    def test_all_tools_have_input_kinds(self):
        for tool in registry.list_all():
            assert tool.input_kinds is not None
            assert len(tool.input_kinds) >= 1

    def test_all_tools_have_output_kind(self):
        for tool in registry.list_all():
            assert tool.output_kind is not None
            assert len(tool.output_kind) > 0

    def test_all_tools_have_context_type(self):
        for tool in registry.list_all():
            assert tool.context_type is not None
            assert tool.context_type.value in ("single", "multi", "region", "none")


class TestToolMetadataFormat:
    """Tests for metadata serialization format."""

    def test_to_metadata_returns_dict(self):
        tool = registry.get_tool("track-stats")
        meta = tool.to_metadata()

        assert isinstance(meta, dict)

    def test_to_metadata_has_all_fields(self):
        tool = registry.get_tool("track-stats")
        meta = tool.to_metadata()

        required_fields = [
            "name", "description", "version",
            "input_kinds", "output_kind", "context_type", "parameters"
        ]
        for field in required_fields:
            assert field in meta, f"Missing field: {field}"

    def test_context_type_is_string_in_metadata(self):
        tool = registry.get_tool("track-stats")
        meta = tool.to_metadata()

        # Should be string value, not enum
        assert meta["context_type"] == "single"
        assert isinstance(meta["context_type"], str)

    def test_parameters_are_serialized(self):
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

    def test_describe_returns_metadata(self):
        meta = registry.describe("track-stats")

        assert meta["name"] == "track-stats"
        assert "description" in meta
        assert "version" in meta

    def test_describe_nonexistent_raises(self):
        from debrief_calc.exceptions import ToolNotFoundError

        with pytest.raises(ToolNotFoundError):
            registry.describe("nonexistent-tool")


class TestParameterDocumentation:
    """Tests that tool parameters are documented."""

    def test_track_stats_has_distance_unit_param(self):
        tool = registry.get_tool("track-stats")

        param_names = [p.name for p in tool.parameters]
        assert "distance_unit" in param_names

    def test_range_bearing_has_sample_points_param(self):
        tool = registry.get_tool("range-bearing")

        param_names = [p.name for p in tool.parameters]
        assert "sample_points" in param_names

    def test_area_summary_has_include_centroid_param(self):
        tool = registry.get_tool("area-summary")

        param_names = [p.name for p in tool.parameters]
        assert "include_centroid" in param_names

    def test_all_parameters_have_description(self):
        for tool in registry.list_all():
            for param in tool.parameters:
                assert param.description is not None
                assert len(param.description) > 0

    def test_enum_parameters_have_choices(self):
        for tool in registry.list_all():
            for param in tool.parameters:
                if param.type == "enum":
                    assert param.choices is not None
                    assert len(param.choices) >= 2


class TestLLMSupervisorMetadata:
    """Tests that metadata is suitable for LLM Supervisor integration."""

    def test_input_kinds_are_strings(self):
        """LLM needs to match kinds as strings."""
        for tool in registry.list_all():
            for kind in tool.input_kinds:
                assert isinstance(kind, str)

    def test_output_kind_is_string(self):
        """LLM needs to know output kind for downstream processing."""
        for tool in registry.list_all():
            assert isinstance(tool.output_kind, str)

    def test_accepts_kind_method_works(self):
        """LLM can use accepts_kind to filter tools."""
        track_tool = registry.get_tool("track-stats")

        assert track_tool.accepts_kind("track") is True
        assert track_tool.accepts_kind("zone") is False
