"""Unit tests for debrief-calc models."""

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError as PydanticValidationError

from debrief_calc.models import (
    VALID_PARAM_TYPES,
    BranchRecord,
    ContextType,
    CreatedAsset,
    FileProvEntry,
    LogEntry,
    ModifiedFeature,
    ParameterValue,
    PropertyDelta,
    Provenance,
    SelectionContext,
    SnapshotLinks,
    SnapshotRef,
    SourceRef,
    SystemRecordProperties,
    Tool,
    ToolError,
    ToolParameter,
    ToolResult,
    WasGeneratedBy,
)

FIXTURES_ROOT = Path(__file__).resolve().parents[2] / ".." / "shared" / "schemas" / "fixtures"


class TestContextType:
    """Tests for ContextType enum."""

    def test_enum_values(self) -> None:
        assert ContextType.SINGLE.value == "single"
        assert ContextType.MULTI.value == "multi"
        assert ContextType.REGION.value == "region"
        assert ContextType.NONE.value == "none"

    def test_enum_is_string(self) -> None:
        assert isinstance(ContextType.SINGLE, str)
        assert ContextType.SINGLE == "single"


class TestSourceRef:
    """Tests for SourceRef model."""

    def test_create_source_ref(self) -> None:
        ref = SourceRef(id="track-001", kind="TRACK")
        assert ref.id == "track-001"
        assert ref.kind == "TRACK"

    def test_source_ref_requires_id(self) -> None:
        with pytest.raises(PydanticValidationError):
            SourceRef(kind="TRACK")  # type: ignore[reportCallIssue]

    def test_source_ref_requires_kind(self) -> None:
        with pytest.raises(PydanticValidationError):
            SourceRef(id="track-001")  # type: ignore[reportCallIssue]


class TestProvenance:
    """Tests for Provenance model."""

    def test_create_provenance(self) -> None:
        prov = Provenance(
            tool="track-stats", version="1.0.0", sources=[SourceRef(id="track-001", kind="TRACK")]
        )
        assert prov.tool == "track-stats"
        assert prov.version == "1.0.0"
        assert len(prov.sources) == 1
        assert isinstance(prov.timestamp, datetime)

    def test_provenance_default_timestamp(self) -> None:
        prov = Provenance(tool="test", version="1.0.0")
        assert prov.timestamp is not None

    def test_provenance_default_empty_parameters(self) -> None:
        prov = Provenance(tool="test", version="1.0.0")
        assert prov.parameters == {}


class TestToolParameter:
    """Tests for ToolParameter model."""

    def test_create_string_parameter(self) -> None:
        param = ToolParameter(name="unit", type="string", description="Measurement unit")
        assert param.name == "unit"
        assert param.type == "string"
        assert param.required is False

    def test_create_enum_parameter_with_choices(self) -> None:
        param = ToolParameter(
            name="format", type="enum", description="Output format", choices=["json", "csv", "xml"]
        )
        assert param.choices == ["json", "csv", "xml"]

    def test_enum_parameter_requires_choices_or_param_type(self) -> None:
        with pytest.raises(PydanticValidationError, match="choices or param_type"):
            ToolParameter(name="format", type="enum", description="Output format")

    def test_enum_parameter_valid_with_param_type_only(self) -> None:
        """T018: enum type is valid when param_type is provided instead of choices."""
        param = ToolParameter(
            name="color",
            type="enum",
            description="Track color",
            param_type="NamedColor",
        )
        assert param.param_type == "NamedColor"
        assert param.choices is None

    def test_enum_parameter_valid_with_both_choices_and_param_type(self) -> None:
        """T018: enum type is valid when both choices and param_type are provided."""
        param = ToolParameter(
            name="color",
            type="enum",
            description="Track color",
            choices=["red", "blue", "green"],
            param_type="NamedColor",
        )
        assert param.choices == ["red", "blue", "green"]
        assert param.param_type == "NamedColor"

    def test_invalid_param_type_rejected(self) -> None:
        """T018: Invalid param_type values are rejected."""
        with pytest.raises(PydanticValidationError, match="param_type must be one of"):
            ToolParameter(
                name="color",
                type="enum",
                description="Track color",
                param_type="InvalidType",
            )

    def test_param_type_none_by_default(self) -> None:
        """T018: param_type defaults to None."""
        param = ToolParameter(name="unit", type="string", description="Unit")
        assert param.param_type is None

    def test_all_valid_param_types_accepted(self) -> None:
        """T018: All members of VALID_PARAM_TYPES are accepted."""
        for pt in VALID_PARAM_TYPES:
            param = ToolParameter(
                name="test",
                type="enum",
                description="Test param",
                param_type=pt,
            )
            assert param.param_type == pt

    def test_invalid_type_rejected(self) -> None:
        with pytest.raises(PydanticValidationError):
            ToolParameter(name="test", type="invalid", description="Test")

    def test_valid_types_accepted(self) -> None:
        for param_type in ["string", "number", "boolean", "enum"]:
            kwargs: dict[str, Any] = {"name": "test", "type": param_type, "description": "Test"}
            if param_type == "enum":
                kwargs["choices"] = ["a", "b"]
            param = ToolParameter(**kwargs)
            assert param.type == param_type


class TestToolError:
    """Tests for ToolError model."""

    def test_create_tool_error(self) -> None:
        error = ToolError(code="TOOL_NOT_FOUND", message="Tool 'unknown' not found")
        assert error.code == "TOOL_NOT_FOUND"
        assert error.message == "Tool 'unknown' not found"
        assert error.details is None

    def test_create_tool_error_with_details(self) -> None:
        error = ToolError(
            code="KIND_MISMATCH",
            message="Kind mismatch",
            details={"expected": ["TRACK"], "actual": ["ZONE"]},
        )
        assert error.details == {"expected": ["TRACK"], "actual": ["ZONE"]}


class TestToolResult:
    """Tests for ToolResult model."""

    def test_successful_result(self) -> None:
        result = ToolResult(
            tool="track-stats",
            success=True,
            features=[{"type": "Feature", "properties": {}, "geometry": None}],
            duration_ms=42.5,
        )
        assert result.success is True
        assert result.features is not None
        assert len(result.features) == 1
        assert result.error is None

    def test_failed_result(self) -> None:
        result = ToolResult(
            tool="track-stats",
            success=False,
            error=ToolError(code="EXECUTION_ERROR", message="Failed"),
            duration_ms=10.0,
        )
        assert result.success is False
        assert result.error is not None
        assert result.features is None

    def test_success_requires_features(self) -> None:
        with pytest.raises(PydanticValidationError):
            ToolResult(tool="test", success=True, duration_ms=10.0)

    def test_failure_requires_error(self) -> None:
        with pytest.raises(PydanticValidationError):
            ToolResult(tool="test", success=False, duration_ms=10.0)

    def test_new_fields_default_to_none(self) -> None:
        """SC-006: All new ToolResult fields are optional with None defaults."""
        result = ToolResult(
            tool="track-stats",
            success=True,
            features=[{"type": "Feature", "properties": {}, "geometry": None}],
            duration_ms=42.5,
        )
        assert result.tool_version is None
        assert result.modified_features is None
        assert result.created_features is None
        assert result.created_assets is None
        assert result.parameters is None

    def test_expanded_result_with_all_fields(self) -> None:
        result = ToolResult(
            tool="set-track-color",
            success=True,
            features=[{"type": "Feature", "properties": {}, "geometry": None}],
            duration_ms=42.5,
            tool_version="1.2.0",
            modified_features=[
                ModifiedFeature(
                    feature_id="track-001",
                    changed_properties={
                        "color": PropertyDelta(previous_value="blue", new_value="red"),
                    },
                )
            ],
            created_features=["result-001"],
            created_assets=[
                CreatedAsset(result_id="bt_plot_001", path="./results/bt_plot_001_v1.png")
            ],
            parameters={
                "color": ParameterValue(value="#FF0000", default=False, tunable=False),
            },
        )
        assert result.tool_version == "1.2.0"
        assert result.modified_features is not None
        assert result.created_features is not None
        assert result.created_assets is not None
        assert result.parameters is not None
        assert len(result.modified_features) == 1
        assert result.modified_features[0].feature_id == "track-001"
        assert len(result.created_features) == 1
        assert len(result.created_assets) == 1
        assert result.parameters["color"].value == "#FF0000"

    def test_expanded_result_serialization_roundtrip(self) -> None:
        result = ToolResult(
            tool="test",
            success=True,
            features=[{"type": "Feature", "properties": {}, "geometry": None}],
            duration_ms=10.0,
            tool_version="2.0.0",
            parameters={
                "interval": ParameterValue(value=60, default=True, tunable=True),
            },
        )
        data = result.model_dump()
        restored = ToolResult.model_validate(data)
        assert restored.tool_version == "2.0.0"
        assert restored.parameters is not None
        assert restored.parameters["interval"].value == 60
        assert restored.parameters["interval"].default is True


class TestSelectionContext:
    """Tests for SelectionContext model."""

    def test_single_context(self) -> None:
        feature = {"type": "Feature", "properties": {"kind": "TRACK"}, "geometry": None}
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        assert context.type == ContextType.SINGLE
        assert len(context.features) == 1

    def test_single_requires_exactly_one_feature(self) -> None:
        with pytest.raises(PydanticValidationError):
            SelectionContext(type=ContextType.SINGLE, features=[])

        with pytest.raises(PydanticValidationError):
            feature = {"type": "Feature", "properties": {}, "geometry": None}
            SelectionContext(type=ContextType.SINGLE, features=[feature, feature])

    def test_multi_context(self) -> None:
        feature1 = {"type": "Feature", "properties": {"kind": "TRACK"}, "geometry": None}
        feature2 = {"type": "Feature", "properties": {"kind": "TRACK"}, "geometry": None}
        context = SelectionContext(type=ContextType.MULTI, features=[feature1, feature2])
        assert context.type == ContextType.MULTI
        assert len(context.features) == 2

    def test_multi_accepts_single_feature(self) -> None:
        feature = {"type": "Feature", "properties": {}, "geometry": None}
        context = SelectionContext(type=ContextType.MULTI, features=[feature])
        assert len(context.features) == 1

    def test_multi_rejects_empty_features(self) -> None:
        with pytest.raises(PydanticValidationError):
            SelectionContext(type=ContextType.MULTI, features=[])

    def test_region_context(self) -> None:
        context = SelectionContext(type=ContextType.REGION, bounds=[-5.0, 49.0, -3.0, 51.0])
        assert context.type == ContextType.REGION
        assert context.bounds == [-5.0, 49.0, -3.0, 51.0]

    def test_region_requires_bounds(self) -> None:
        with pytest.raises(PydanticValidationError):
            SelectionContext(type=ContextType.REGION)

    def test_bounds_must_have_four_values(self) -> None:
        with pytest.raises(PydanticValidationError):
            SelectionContext(type=ContextType.REGION, bounds=[-5.0, 49.0])

    def test_none_context(self) -> None:
        context = SelectionContext(type=ContextType.NONE)
        assert context.type == ContextType.NONE
        assert context.features == []

    def test_get_kinds(self) -> None:
        feature1 = {"type": "Feature", "properties": {"kind": "TRACK"}, "geometry": None}
        feature2 = {"type": "Feature", "properties": {"kind": "ZONE"}, "geometry": None}
        context = SelectionContext(type=ContextType.MULTI, features=[feature1, feature2])
        kinds = context.get_kinds()
        assert kinds == {"TRACK", "ZONE"}


class TestTool:
    """Tests for Tool model."""

    def test_create_tool(self) -> None:
        tool = Tool(
            name="track-stats",
            description="Calculate track statistics",
            input_kinds=["TRACK"],
            output_kind="analysis-result",
            context_type=ContextType.SINGLE,
        )
        assert tool.name == "track-stats"
        assert tool.version == "1.0.0"  # default

    def test_name_must_be_kebab_case(self) -> None:
        with pytest.raises(PydanticValidationError):
            Tool(
                name="trackStats",  # camelCase not allowed
                description="Test",
                input_kinds=["TRACK"],
                output_kind="result",
                context_type=ContextType.SINGLE,
            )

    def test_name_must_start_with_letter(self) -> None:
        with pytest.raises(PydanticValidationError):
            Tool(
                name="123-tool",
                description="Test",
                input_kinds=["TRACK"],
                output_kind="result",
                context_type=ContextType.SINGLE,
            )

    def test_input_kinds_must_not_be_empty(self) -> None:
        with pytest.raises(PydanticValidationError):
            Tool(
                name="test-tool",
                description="Test",
                input_kinds=[],
                output_kind="result",
                context_type=ContextType.SINGLE,
            )

    def test_accepts_kind(self) -> None:
        tool = Tool(
            name="test",
            description="Test",
            input_kinds=["TRACK", "ZONE"],
            output_kind="result",
            context_type=ContextType.SINGLE,
        )
        assert tool.accepts_kind("TRACK") is True
        assert tool.accepts_kind("ZONE") is True
        assert tool.accepts_kind("POINT") is False

    def test_accepts_context(self) -> None:
        tool = Tool(
            name="test",
            description="Test",
            input_kinds=["TRACK"],
            output_kind="result",
            context_type=ContextType.SINGLE,
        )
        assert tool.accepts_context(ContextType.SINGLE) is True
        assert tool.accepts_context(ContextType.MULTI) is False

    def test_multi_tool_accepts_single_context(self) -> None:
        tool = Tool(
            name="test-multi",
            description="Test multi",
            input_kinds=["TRACK"],
            output_kind="mutation/track/styled",
            context_type=ContextType.MULTI,
        )
        assert tool.accepts_context(ContextType.MULTI) is True
        assert tool.accepts_context(ContextType.SINGLE) is True
        assert tool.accepts_context(ContextType.REGION) is False

    def test_to_metadata(self) -> None:
        tool = Tool(
            name="track-stats",
            description="Calculate statistics",
            version="2.0.0",
            input_kinds=["TRACK"],
            output_kind="analysis-result",
            context_type=ContextType.SINGLE,
            parameters=[ToolParameter(name="unit", type="string", description="Unit")],
        )
        meta = tool.to_metadata()
        assert meta["name"] == "track-stats"
        assert meta["version"] == "2.0.0"
        assert meta["context_type"] == "single"
        assert len(meta["parameters"]) == 1


class TestParameterValue:
    """Tests for ParameterValue model."""

    def test_create_basic_parameter_value(self) -> None:
        pv = ParameterValue(value=60)
        assert pv.value == 60
        assert pv.default is False
        assert pv.tunable is True

    def test_parameter_value_with_defaults(self) -> None:
        pv = ParameterValue(value="nm", default=True, tunable=True)
        assert pv.value == "nm"
        assert pv.default is True
        assert pv.tunable is True

    def test_parameter_value_non_tunable(self) -> None:
        pv = ParameterValue(value="track-alpha", default=False, tunable=False)
        assert pv.tunable is False

    def test_parameter_value_requires_value(self) -> None:
        with pytest.raises(PydanticValidationError):
            ParameterValue()  # type: ignore[reportCallIssue]

    def test_parameter_value_accepts_any_type(self) -> None:
        assert ParameterValue(value=42).value == 42
        assert ParameterValue(value="text").value == "text"
        assert ParameterValue(value=True).value is True
        assert ParameterValue(value=[1, 2, 3]).value == [1, 2, 3]
        assert ParameterValue(value=None).value is None


class TestPropertyDelta:
    """Tests for PropertyDelta model."""

    def test_create_property_delta(self) -> None:
        delta = PropertyDelta(previous_value="blue", new_value="red")
        assert delta.previous_value == "blue"
        assert delta.new_value == "red"

    def test_property_delta_accepts_any_types(self) -> None:
        delta = PropertyDelta(previous_value=10, new_value=20)
        assert delta.previous_value == 10
        assert delta.new_value == 20

    def test_property_delta_requires_both_values(self) -> None:
        with pytest.raises(PydanticValidationError):
            PropertyDelta(previous_value="old")  # type: ignore[reportCallIssue]
        with pytest.raises(PydanticValidationError):
            PropertyDelta(new_value="new")  # type: ignore[reportCallIssue]


class TestModifiedFeature:
    """Tests for ModifiedFeature model."""

    def test_create_modified_feature(self) -> None:
        mf = ModifiedFeature(
            feature_id="track-001",
            changed_properties={
                "color": PropertyDelta(previous_value="blue", new_value="red"),
            },
        )
        assert mf.feature_id == "track-001"
        assert len(mf.changed_properties) == 1
        assert mf.changed_properties["color"].new_value == "red"

    def test_modified_feature_multiple_properties(self) -> None:
        mf = ModifiedFeature(
            feature_id="track-002",
            changed_properties={
                "color": PropertyDelta(previous_value="#000", new_value="#FFF"),
                "weight": PropertyDelta(previous_value=1, new_value=3),
            },
        )
        assert len(mf.changed_properties) == 2

    def test_modified_feature_requires_feature_id(self) -> None:
        with pytest.raises(PydanticValidationError):
            ModifiedFeature(changed_properties={})  # type: ignore[reportCallIssue]

    def test_modified_feature_requires_changed_properties(self) -> None:
        with pytest.raises(PydanticValidationError):
            ModifiedFeature(feature_id="track-001")  # type: ignore[reportCallIssue]


class TestCreatedAsset:
    """Tests for CreatedAsset model."""

    def test_create_asset_basic(self) -> None:
        asset = CreatedAsset(result_id="bt_plot_001", path="./results/bt_plot_001_v1.png")
        assert asset.result_id == "bt_plot_001"
        assert asset.path == "./results/bt_plot_001_v1.png"
        assert asset.mime_type is None

    def test_create_asset_with_mime_type(self) -> None:
        asset = CreatedAsset(
            result_id="bt_plot_001",
            path="./results/bt_plot_001_v1.png",
            mime_type="image/png",
        )
        assert asset.mime_type == "image/png"

    def test_create_asset_requires_result_id(self) -> None:
        with pytest.raises(PydanticValidationError):
            CreatedAsset(path="./results/output.png")  # type: ignore[reportCallIssue]

    def test_create_asset_requires_path(self) -> None:
        with pytest.raises(PydanticValidationError):
            CreatedAsset(result_id="bt_plot_001")  # type: ignore[reportCallIssue]


class TestLogEntry:
    """Tests for LogEntry model."""

    def test_create_log_entry(self) -> None:
        entry = LogEntry(
            activityId="550e8400-e29b-41d4-a716-446655440000",
            timestamp=datetime(2026, 1, 15, 10, 30, 0, tzinfo=UTC),
            wasGeneratedBy=WasGeneratedBy(
                tool="calculate-range",
                toolVersion="1.0.0",
                parameters={"interval": ParameterValue(value=60, default=True, tunable=True)},
            ),
            used=["track-alpha"],
            generated=["range-001"],
            executionDuration="PT0.3S",
        )
        assert entry.activity_id == "550e8400-e29b-41d4-a716-446655440000"
        assert entry.was_generated_by.tool == "calculate-range"
        assert entry.execution_duration == "PT0.3S"
        assert entry.tune is None
        assert entry.generated_result_id is None

    def test_log_entry_invalid_duration(self) -> None:
        with pytest.raises(PydanticValidationError):
            LogEntry(
                activityId="test",
                timestamp=datetime.now(UTC),
                wasGeneratedBy=WasGeneratedBy(tool="t", toolVersion="1.0", parameters={}),
                used=[],
                generated=[],
                executionDuration="300ms",  # Invalid format
            )

    def test_log_entry_serialization_camelcase(self) -> None:
        entry = LogEntry(
            activityId="test-id",
            timestamp=datetime(2026, 1, 15, 10, 0, 0, tzinfo=UTC),
            wasGeneratedBy=WasGeneratedBy(tool="t", toolVersion="1.0", parameters={}),
            used=[],
            generated=[],
            executionDuration="PT1S",
        )
        data = entry.model_dump(mode="json", by_alias=True)
        assert "activityId" in data
        assert "wasGeneratedBy" in data
        assert "executionDuration" in data
        assert "toolVersion" in data["wasGeneratedBy"]

    def test_log_entry_from_fixture(self) -> None:
        fixture = FIXTURES_ROOT / "log-entry" / "valid" / "tool-invocation.json"
        data = json.loads(fixture.read_text())
        entry = LogEntry.model_validate(data)
        assert entry.activity_id == "550e8400-e29b-41d4-a716-446655440000"
        assert entry.was_generated_by.tool == "calculate-range"
        assert len(entry.was_generated_by.parameters) == 2
        assert entry.execution_duration == "PT0.3S"

    def test_log_entry_roundtrip(self) -> None:
        """SC-007: Round-trip test for LogEntry serialisation."""
        fixture = FIXTURES_ROOT / "log-entry" / "valid" / "artifact-producing.json"
        data = json.loads(fixture.read_text())
        entry = LogEntry.model_validate(data)
        serialized = entry.model_dump(mode="json", by_alias=True)
        restored = LogEntry.model_validate(serialized)
        assert restored.activity_id == entry.activity_id
        assert restored.generated_result_id == entry.generated_result_id
        assert restored.was_generated_by.tool == entry.was_generated_by.tool

    def test_invalid_fixture_missing_activity_id(self) -> None:
        fixture = FIXTURES_ROOT / "log-entry" / "invalid" / "missing-activity-id.json"
        data = json.loads(fixture.read_text())
        with pytest.raises(PydanticValidationError):
            LogEntry.model_validate(data)

    def test_invalid_fixture_bad_duration(self) -> None:
        fixture = FIXTURES_ROOT / "log-entry" / "invalid" / "bad-duration-format.json"
        data = json.loads(fixture.read_text())
        with pytest.raises(PydanticValidationError):
            LogEntry.model_validate(data)


class TestSystemRecordProperties:
    """Tests for system record models."""

    def test_create_empty_system_record(self) -> None:
        sr = SystemRecordProperties()
        assert sr.kind == "SYSTEM_RECORD"
        assert sr.snapshot_links is None
        assert sr.branches == []
        assert sr.provenance == []

    def test_system_record_with_snapshot_links(self) -> None:
        sr = SystemRecordProperties(
            snapshotLinks=SnapshotLinks(
                prev=SnapshotRef(asset="./snapshots/v1.geojson", provEntryCount=3),
                next=None,
            ),
        )
        assert sr.snapshot_links is not None
        assert sr.snapshot_links.prev is not None
        assert sr.snapshot_links.prev.asset == "./snapshots/v1.geojson"
        assert sr.snapshot_links.prev.prov_entry_count == 3
        assert sr.snapshot_links.next is None

    def test_system_record_with_branches(self) -> None:
        sr = SystemRecordProperties(
            branches=[
                BranchRecord(
                    branchId="branch-001",
                    branchedFrom="act-123",
                    branchedAt=datetime(2026, 1, 16, 9, 0, 0, tzinfo=UTC),
                    targetAsset="./branches/branch-001/plot.geojson",
                ),
            ],
        )
        assert len(sr.branches) == 1
        assert sr.branches[0].branch_id == "branch-001"

    def test_system_record_from_empty_fixture(self) -> None:
        fixture = FIXTURES_ROOT / "system-record" / "valid" / "empty-system-record.json"
        data = json.loads(fixture.read_text())
        sr = SystemRecordProperties.model_validate(data)
        assert sr.kind == "SYSTEM_RECORD"
        assert sr.snapshot_links is None
        assert sr.branches == []

    def test_system_record_from_populated_fixture(self) -> None:
        fixture = FIXTURES_ROOT / "system-record" / "valid" / "populated-system-record.json"
        data = json.loads(fixture.read_text())
        sr = SystemRecordProperties.model_validate(data)
        assert sr.kind == "SYSTEM_RECORD"
        assert sr.snapshot_links is not None
        assert sr.snapshot_links.prev is not None
        assert sr.snapshot_links.prev.prov_entry_count == 5
        assert len(sr.branches) == 1
        assert sr.branches[0].branch_id == "branch-001"
        assert len(sr.provenance) == 2
        assert sr.provenance[0].type == "snapshot"
        assert sr.provenance[1].type == "branch"
        assert sr.provenance[1].direction == "source"

    def test_system_record_invalid_kind(self) -> None:
        with pytest.raises(PydanticValidationError):
            SystemRecordProperties(kind="not-system-record")

    def test_file_prov_entry_invalid_type(self) -> None:
        with pytest.raises(PydanticValidationError):
            FileProvEntry(
                activityId="test",
                type="invalid",
                timestamp=datetime.now(UTC),
            )

    def test_file_prov_entry_invalid_direction(self) -> None:
        with pytest.raises(PydanticValidationError):
            FileProvEntry(
                activityId="test",
                type="branch",
                timestamp=datetime.now(UTC),
                direction="invalid",
            )
