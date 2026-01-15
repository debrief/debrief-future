"""Unit tests for debrief-calc models."""

from datetime import datetime

import pytest
from debrief_calc.models import (
    ContextType,
    Provenance,
    SelectionContext,
    SourceRef,
    Tool,
    ToolError,
    ToolParameter,
    ToolResult,
)
from pydantic import ValidationError as PydanticValidationError


class TestContextType:
    """Tests for ContextType enum."""

    def test_enum_values(self):
        assert ContextType.SINGLE.value == "single"
        assert ContextType.MULTI.value == "multi"
        assert ContextType.REGION.value == "region"
        assert ContextType.NONE.value == "none"

    def test_enum_is_string(self):
        assert isinstance(ContextType.SINGLE, str)
        assert ContextType.SINGLE == "single"


class TestSourceRef:
    """Tests for SourceRef model."""

    def test_create_source_ref(self):
        ref = SourceRef(id="track-001", kind="track")
        assert ref.id == "track-001"
        assert ref.kind == "track"

    def test_source_ref_requires_id(self):
        with pytest.raises(PydanticValidationError):
            SourceRef(kind="track")

    def test_source_ref_requires_kind(self):
        with pytest.raises(PydanticValidationError):
            SourceRef(id="track-001")


class TestProvenance:
    """Tests for Provenance model."""

    def test_create_provenance(self):
        prov = Provenance(
            tool="track-stats", version="1.0.0", sources=[SourceRef(id="track-001", kind="track")]
        )
        assert prov.tool == "track-stats"
        assert prov.version == "1.0.0"
        assert len(prov.sources) == 1
        assert isinstance(prov.timestamp, datetime)

    def test_provenance_default_timestamp(self):
        prov = Provenance(tool="test", version="1.0.0")
        assert prov.timestamp is not None

    def test_provenance_default_empty_parameters(self):
        prov = Provenance(tool="test", version="1.0.0")
        assert prov.parameters == {}


class TestToolParameter:
    """Tests for ToolParameter model."""

    def test_create_string_parameter(self):
        param = ToolParameter(name="unit", type="string", description="Measurement unit")
        assert param.name == "unit"
        assert param.type == "string"
        assert param.required is False

    def test_create_enum_parameter_with_choices(self):
        param = ToolParameter(
            name="format", type="enum", description="Output format", choices=["json", "csv", "xml"]
        )
        assert param.choices == ["json", "csv", "xml"]

    def test_enum_parameter_requires_choices(self):
        with pytest.raises(PydanticValidationError):
            ToolParameter(name="format", type="enum", description="Output format")

    def test_invalid_type_rejected(self):
        with pytest.raises(PydanticValidationError):
            ToolParameter(name="test", type="invalid", description="Test")

    def test_valid_types_accepted(self):
        for param_type in ["string", "number", "boolean", "enum"]:
            kwargs = {"name": "test", "type": param_type, "description": "Test"}
            if param_type == "enum":
                kwargs["choices"] = ["a", "b"]
            param = ToolParameter(**kwargs)
            assert param.type == param_type


class TestToolError:
    """Tests for ToolError model."""

    def test_create_tool_error(self):
        error = ToolError(code="TOOL_NOT_FOUND", message="Tool 'unknown' not found")
        assert error.code == "TOOL_NOT_FOUND"
        assert error.message == "Tool 'unknown' not found"
        assert error.details is None

    def test_create_tool_error_with_details(self):
        error = ToolError(
            code="KIND_MISMATCH",
            message="Kind mismatch",
            details={"expected": ["track"], "actual": ["zone"]},
        )
        assert error.details == {"expected": ["track"], "actual": ["zone"]}


class TestToolResult:
    """Tests for ToolResult model."""

    def test_successful_result(self):
        result = ToolResult(
            tool="track-stats",
            success=True,
            features=[{"type": "Feature", "properties": {}, "geometry": None}],
            duration_ms=42.5,
        )
        assert result.success is True
        assert len(result.features) == 1
        assert result.error is None

    def test_failed_result(self):
        result = ToolResult(
            tool="track-stats",
            success=False,
            error=ToolError(code="EXECUTION_ERROR", message="Failed"),
            duration_ms=10.0,
        )
        assert result.success is False
        assert result.error is not None
        assert result.features is None

    def test_success_requires_features(self):
        with pytest.raises(PydanticValidationError):
            ToolResult(tool="test", success=True, duration_ms=10.0)

    def test_failure_requires_error(self):
        with pytest.raises(PydanticValidationError):
            ToolResult(tool="test", success=False, duration_ms=10.0)


class TestSelectionContext:
    """Tests for SelectionContext model."""

    def test_single_context(self):
        feature = {"type": "Feature", "properties": {"kind": "track"}, "geometry": None}
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        assert context.type == ContextType.SINGLE
        assert len(context.features) == 1

    def test_single_requires_exactly_one_feature(self):
        with pytest.raises(PydanticValidationError):
            SelectionContext(type=ContextType.SINGLE, features=[])

        with pytest.raises(PydanticValidationError):
            feature = {"type": "Feature", "properties": {}, "geometry": None}
            SelectionContext(type=ContextType.SINGLE, features=[feature, feature])

    def test_multi_context(self):
        feature1 = {"type": "Feature", "properties": {"kind": "track"}, "geometry": None}
        feature2 = {"type": "Feature", "properties": {"kind": "track"}, "geometry": None}
        context = SelectionContext(type=ContextType.MULTI, features=[feature1, feature2])
        assert context.type == ContextType.MULTI
        assert len(context.features) == 2

    def test_multi_requires_at_least_two_features(self):
        feature = {"type": "Feature", "properties": {}, "geometry": None}
        with pytest.raises(PydanticValidationError):
            SelectionContext(type=ContextType.MULTI, features=[feature])

    def test_region_context(self):
        context = SelectionContext(type=ContextType.REGION, bounds=[-5.0, 49.0, -3.0, 51.0])
        assert context.type == ContextType.REGION
        assert context.bounds == [-5.0, 49.0, -3.0, 51.0]

    def test_region_requires_bounds(self):
        with pytest.raises(PydanticValidationError):
            SelectionContext(type=ContextType.REGION)

    def test_bounds_must_have_four_values(self):
        with pytest.raises(PydanticValidationError):
            SelectionContext(type=ContextType.REGION, bounds=[-5.0, 49.0])

    def test_none_context(self):
        context = SelectionContext(type=ContextType.NONE)
        assert context.type == ContextType.NONE
        assert context.features == []

    def test_get_kinds(self):
        feature1 = {"type": "Feature", "properties": {"kind": "track"}, "geometry": None}
        feature2 = {"type": "Feature", "properties": {"kind": "zone"}, "geometry": None}
        context = SelectionContext(type=ContextType.MULTI, features=[feature1, feature2])
        kinds = context.get_kinds()
        assert kinds == {"track", "zone"}


class TestTool:
    """Tests for Tool model."""

    def test_create_tool(self):
        tool = Tool(
            name="track-stats",
            description="Calculate track statistics",
            input_kinds=["track"],
            output_kind="analysis-result",
            context_type=ContextType.SINGLE,
        )
        assert tool.name == "track-stats"
        assert tool.version == "1.0.0"  # default

    def test_name_must_be_kebab_case(self):
        with pytest.raises(PydanticValidationError):
            Tool(
                name="trackStats",  # camelCase not allowed
                description="Test",
                input_kinds=["track"],
                output_kind="result",
                context_type=ContextType.SINGLE,
            )

    def test_name_must_start_with_letter(self):
        with pytest.raises(PydanticValidationError):
            Tool(
                name="123-tool",
                description="Test",
                input_kinds=["track"],
                output_kind="result",
                context_type=ContextType.SINGLE,
            )

    def test_input_kinds_must_not_be_empty(self):
        with pytest.raises(PydanticValidationError):
            Tool(
                name="test-tool",
                description="Test",
                input_kinds=[],
                output_kind="result",
                context_type=ContextType.SINGLE,
            )

    def test_accepts_kind(self):
        tool = Tool(
            name="test",
            description="Test",
            input_kinds=["track", "zone"],
            output_kind="result",
            context_type=ContextType.SINGLE,
        )
        assert tool.accepts_kind("track") is True
        assert tool.accepts_kind("zone") is True
        assert tool.accepts_kind("point") is False

    def test_accepts_context(self):
        tool = Tool(
            name="test",
            description="Test",
            input_kinds=["track"],
            output_kind="result",
            context_type=ContextType.SINGLE,
        )
        assert tool.accepts_context(ContextType.SINGLE) is True
        assert tool.accepts_context(ContextType.MULTI) is False

    def test_to_metadata(self):
        tool = Tool(
            name="track-stats",
            description="Calculate statistics",
            version="2.0.0",
            input_kinds=["track"],
            output_kind="analysis-result",
            context_type=ContextType.SINGLE,
            parameters=[ToolParameter(name="unit", type="string", description="Unit")],
        )
        meta = tool.to_metadata()
        assert meta["name"] == "track-stats"
        assert meta["version"] == "2.0.0"
        assert meta["context_type"] == "single"
        assert len(meta["parameters"]) == 1
