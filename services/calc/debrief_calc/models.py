"""
Core data models for debrief-calc.

Defines the entities used throughout the tool registry and execution system:
- ContextType: Enum for selection context classification
- SelectionContext: User's current data selection
- Tool: Registered analysis operation
- ToolParameter: Configurable parameter for a tool
- ToolResult: Output of tool execution
- ToolError: Structured error information
- Provenance: Lineage tracking for outputs (deprecated, use LogEntry)
- LogEntry: PROV-aligned provenance record (replaces Provenance)
- ParameterValue: Typed parameter value with replay metadata
- PropertyDelta: Before/after value for a property change
- ModifiedFeature: Feature ID + changed properties
- CreatedAsset: Artifact file produced by a tool
"""

from __future__ import annotations

import re
from collections.abc import Callable
from datetime import datetime, timezone
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class ContextType(StrEnum):
    """
    Describes the selection context a tool requires.

    Values:
        SINGLE: Exactly one feature selected
        MULTI: One or more features selected
        REGION: Geographic bounds (bbox or polygon)
        NONE: No selection required
    """

    SINGLE = "single"
    MULTI = "multi"
    REGION = "region"
    NONE = "none"


class SourceRef(BaseModel):
    """Reference to a source feature used in provenance tracking."""

    id: str = Field(..., description="Source feature ID")
    kind: str = Field(..., description="Source feature kind")


class Provenance(BaseModel):
    """
    Lineage information attached to output features.

    Deprecated: Use LogEntry for new code. Retained for backward compatibility
    during migration. Will be removed in a future cleanup pass.
    """

    tool: str = Field(..., description="Tool that produced this feature")
    version: str = Field(..., description="Tool version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Execution timestamp")
    sources: list[SourceRef] = Field(default_factory=list, description="Input features used")
    parameters: dict[str, Any] = Field(
        default_factory=dict, description="Parameters passed to tool"
    )


class ParameterValue(BaseModel):
    """
    A typed parameter value with replay metadata.

    Records the value of a tool parameter along with whether it was
    the default value and whether it can be tuned during replay.
    """

    value: Any = Field(..., description="The parameter value")
    default: bool = Field(default=False, description="Whether this is the default value")
    tunable: bool = Field(default=True, description="Whether this parameter can be modified during replay")


class PropertyDelta(BaseModel):
    """Captures the previous and new value of a single property change."""

    previous_value: Any = Field(..., description="Value before the change")
    new_value: Any = Field(..., description="Value after the change")


class ModifiedFeature(BaseModel):
    """Associates a feature ID with the properties that were changed."""

    feature_id: str = Field(..., description="ID of the modified feature")
    changed_properties: dict[str, PropertyDelta] = Field(
        ..., description="Property name to before/after delta mapping"
    )


class CreatedAsset(BaseModel):
    """Identifies an artifact file produced by a tool."""

    result_id: str = Field(..., description="Stable logical identity (e.g., bt_plot_001)")
    path: str = Field(..., description="Full versioned path (e.g., ./results/bt_plot_001_v2.png)")
    mime_type: str | None = Field(default=None, description="MIME type of the artifact")


class TuneAnnotation(BaseModel):
    """Records a parameter modification (appended, not replacing original)."""

    timestamp: datetime = Field(..., description="When the tuning occurred")
    parameter: str = Field(..., description="Name of the parameter that was changed")
    previous_value: Any = Field(..., description="Value before tuning")
    new_value: Any = Field(..., description="Value after tuning")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "timestamp": "2026-01-15T12:00:00Z",
                    "parameter": "interval",
                    "previousValue": 60,
                    "newValue": 120,
                }
            ]
        }
    }


class WasGeneratedBy(BaseModel):
    """
    Identifies the tool and its parameters for a specific invocation.

    Named after the W3C PROV vocabulary term.
    """

    tool: str = Field(..., description="Tool identifier (kebab-case)")
    tool_version: str = Field(..., alias="toolVersion", description="Semantic version of the tool")
    parameters: dict[str, ParameterValue] = Field(
        default_factory=dict,
        description="Full resolved parameter set",
    )

    model_config = {"populate_by_name": True}


class LogEntry(BaseModel):
    """
    A PROV-aligned provenance record stored on GeoJSON features.

    Replaces the deprecated Provenance class. Each LogEntry captures a single
    tool invocation with W3C PROV vocabulary. Entries are stored as an
    append-only array in feature.properties.provenance.
    """

    activity_id: str = Field(
        ..., alias="activityId", description="Unique operation identifier (UUID v4)"
    )
    timestamp: datetime = Field(..., description="When the operation occurred")
    was_generated_by: WasGeneratedBy = Field(
        ..., alias="wasGeneratedBy", description="Tool identity and parameters"
    )
    used: list[str] = Field(
        default_factory=list, description="Feature IDs of inputs"
    )
    generated: list[str] = Field(
        default_factory=list, description="Feature IDs or asset paths of outputs"
    )
    execution_duration: str = Field(
        ..., alias="executionDuration", description="Wall-clock time in ISO 8601 duration (e.g., PT0.3S)"
    )
    generated_result_id: str | None = Field(
        default=None, alias="generatedResultId",
        description="Stable logical identity for artifact-producing tools",
    )
    tune: TuneAnnotation | None = Field(
        default=None, description="Parameter tuning record (null until tuned)"
    )

    model_config = {"populate_by_name": True}

    @field_validator("execution_duration")
    @classmethod
    def validate_duration_format(cls, v: str) -> str:
        import re as _re

        if not _re.match(r"^PT[0-9]+(\.[0-9]+)?S$", v):
            raise ValueError(f"execution_duration must be ISO 8601 duration (e.g., PT0.3S), got: {v}")
        return v


class ToolParameter(BaseModel):
    """
    A configurable parameter for a tool.

    Supports string, number, boolean, and enum types with optional
    default values and choices for enum parameters.
    """

    name: str = Field(..., description="Parameter identifier")
    type: str = Field(..., description="Data type: string, number, boolean, enum")
    description: str = Field(..., description="Human-readable description")
    required: bool = Field(default=False, description="Whether parameter is required")
    default: Any | None = Field(default=None, description="Default value if not provided")
    choices: list[Any] | None = Field(default=None, description="Valid values for enum type")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        valid_types = {"string", "number", "boolean", "enum"}
        if v not in valid_types:
            raise ValueError(f"type must be one of {valid_types}")
        return v

    @model_validator(mode="after")
    def validate_enum_choices(self) -> ToolParameter:
        if self.type == "enum" and not self.choices:
            raise ValueError("choices must be provided when type is 'enum'")
        return self


class ToolError(BaseModel):
    """
    Structured error information.

    Error Codes:
        TOOL_NOT_FOUND: Requested tool does not exist
        INVALID_CONTEXT: Selection context doesn't match tool requirement
        KIND_MISMATCH: Feature kind not accepted by tool
        VALIDATION_FAILED: Input or output failed schema validation
        EXECUTION_ERROR: Tool handler raised an exception
    """

    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    details: dict[str, Any] | None = Field(
        default=None, description="Additional context-specific details"
    )


class ToolResult(BaseModel):
    """
    The output of a tool execution.

    Contains either successful output features with provenance,
    or error information explaining the failure. New optional fields
    (tool_version, modified_features, created_features, created_assets,
    parameters) support structured change tracking for the PROV Log Service.
    """

    tool: str = Field(..., description="Name of tool that produced this result")
    success: bool = Field(..., description="Whether execution succeeded")
    features: list[dict[str, Any]] | None = Field(
        default=None, description="Output GeoJSON features"
    )
    error: ToolError | None = Field(default=None, description="Error details if not success")
    duration_ms: float = Field(..., description="Execution time in milliseconds")

    # --- New optional fields for expanded ToolResult contract (FR-002) ---
    tool_version: str | None = Field(default=None, description="Semantic version of the tool")
    modified_features: list[ModifiedFeature] | None = Field(
        default=None, description="Feature IDs + changed properties"
    )
    created_features: list[str] | None = Field(
        default=None, description="IDs of new features created"
    )
    created_assets: list[CreatedAsset] | None = Field(
        default=None, description="Artifact files produced"
    )
    parameters: dict[str, ParameterValue] | None = Field(
        default=None, description="Full resolved parameter set with typed values"
    )

    @model_validator(mode="after")
    def validate_result_consistency(self) -> ToolResult:
        if self.success and self.features is None:
            raise ValueError("features must be provided when success is True")
        if not self.success and self.error is None:
            raise ValueError("error must be provided when success is False")
        return self


class SelectionContext(BaseModel):
    """
    The user's current data selection.

    Determines which tools are applicable based on:
    - The type of selection (single, multi, region, none)
    - The features selected (for single/multi)
    - The geographic bounds (for region)
    """

    type: ContextType = Field(..., description="The context classification")
    features: list[dict[str, Any]] = Field(
        default_factory=list, description="Selected GeoJSON features"
    )
    bounds: list[float] | None = Field(
        default=None, description="Geographic bounds [minx, miny, maxx, maxy]"
    )

    @field_validator("bounds")
    @classmethod
    def validate_bounds_format(cls, v: list | None) -> list | None:
        if v is not None and len(v) != 4:
            raise ValueError("bounds must be [minx, miny, maxx, maxy]")
        return v

    @model_validator(mode="after")
    def validate_context_requirements(self) -> SelectionContext:
        if self.type == ContextType.SINGLE and len(self.features) != 1:
            raise ValueError("features must have exactly 1 item when type is 'single'")
        if self.type == ContextType.MULTI and len(self.features) < 1:
            raise ValueError("features must have 1+ items when type is 'multi'")
        if self.type == ContextType.REGION and self.bounds is None:
            raise ValueError("bounds must be provided when type is 'region'")
        return self

    def get_kinds(self) -> set[str]:
        """Extract unique kinds from selected features."""
        kinds = set()
        for feature in self.features:
            props = feature.get("properties", {})
            kind = props.get("kind")
            if kind:
                kinds.add(kind)
        return kinds


class Tool(BaseModel):
    """
    An analysis operation registered in the tool registry.

    Tools declare their requirements (context type, input kinds) and
    their output (output kind). The handler function implements the
    actual analysis logic.
    """

    name: str = Field(..., description="Unique identifier (kebab-case)")
    description: str = Field(..., description="Human-readable description")
    version: str = Field(default="1.0.0", description="Semantic version")
    input_kinds: list[str] = Field(..., description="Feature kinds this tool accepts")
    output_kind: str = Field(..., description="Kind of features produced")
    context_type: ContextType = Field(..., description="Selection context requirement")
    parameters: list[ToolParameter] = Field(
        default_factory=list, description="Configurable parameters"
    )
    handler: Callable | None = Field(
        default=None, exclude=True, description="Python function implementing the tool"
    )

    model_config = {"arbitrary_types_allowed": True}

    @field_validator("name")
    @classmethod
    def validate_name_format(cls, v: str) -> str:
        if not re.match(r"^[a-z][a-z0-9-]*$", v):
            raise ValueError("name must be kebab-case starting with a letter")
        return v

    @field_validator("input_kinds")
    @classmethod
    def validate_input_kinds_not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("input_kinds must contain at least one value")
        return v

    def accepts_kind(self, kind: str) -> bool:
        """Check if this tool accepts features of the given kind."""
        return kind in self.input_kinds

    def accepts_context(self, context_type: ContextType) -> bool:
        """Check if this tool works with the given context type."""
        return self.context_type == context_type

    def to_metadata(self) -> dict[str, Any]:
        """Return tool metadata for discovery and documentation."""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "input_kinds": self.input_kinds,
            "output_kind": self.output_kind,
            "context_type": self.context_type.value,
            "parameters": [p.model_dump() for p in self.parameters],
        }

    def to_mcp_tool(self) -> dict[str, Any]:
        """
        Convert tool to MCP tool format with Debrief-specific annotations.

        Returns:
            MCP tool definition with Debrief annotations for selection requirements,
            category, version, and output kind.
        """
        # Generate selection requirements from context_type and input_kinds
        selection_requirements = self._build_selection_requirements()

        # Derive category from output_kind
        category = self._derive_category()

        # Build parameter schema from tool parameters
        param_properties = {}
        for param in self.parameters:
            param_schema = self._param_to_json_schema(param)
            param_properties[param.name] = param_schema

        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": {
                "type": "object",
                "properties": {
                    "features": {
                        "type": "array",
                        "items": {"type": "object"},
                        "description": "GeoJSON features to process",
                    },
                    "params": {
                        "type": "object",
                        "properties": param_properties,
                        "description": "Tool-specific parameters",
                    },
                },
            },
            "annotations": {
                "debrief:selectionRequirements": selection_requirements,
                "debrief:category": category,
                "debrief:version": self.version,
                "debrief:outputKind": self.output_kind,
            },
        }

    def _build_selection_requirements(self) -> list[dict[str, Any]]:
        """Build selection requirements from context_type and input_kinds."""
        if self.context_type == ContextType.SINGLE:
            return [{"kind": self.input_kinds[0], "min": 1, "max": 1}]
        elif self.context_type == ContextType.MULTI:
            return [{"kind": k, "min": 1} for k in self.input_kinds]
        elif self.context_type == ContextType.REGION:
            return [{"kind": "REGION", "min": 1, "max": 1}]
        else:  # ContextType.NONE
            return []

    def _derive_category(self) -> str:
        """Derive category from output_kind."""
        parts = self.output_kind.split("/")
        if parts[0] == "mutation" and len(parts) >= 3:
            # "mutation/track/styled" → "track/styling"
            return "/".join(parts[1:-1])
        elif parts[0] == "dataset":
            return "analysis"
        elif len(parts) >= 2:
            # "track/statistics" → "track"
            return parts[0]
        return "general"

    def _param_to_json_schema(self, param: ToolParameter) -> dict[str, Any]:
        """Convert a ToolParameter to JSON Schema property."""
        schema: dict[str, Any] = {"description": param.description}

        if param.type == "string":
            schema["type"] = "string"
        elif param.type == "number":
            schema["type"] = "number"
        elif param.type == "boolean":
            schema["type"] = "boolean"
        elif param.type == "enum":
            schema["type"] = "string"
            if param.choices:
                schema["enum"] = param.choices

        if param.default is not None:
            schema["default"] = param.default

        return schema


# ============================================================================
# System Record Models (FR-008)
# ============================================================================


class SnapshotRef(BaseModel):
    """Reference to a snapshot file."""

    asset: str = Field(..., description="Relative path to snapshot GeoJSON file")
    prov_entry_count: int = Field(
        ..., alias="provEntryCount", ge=0,
        description="Number of provenance entries in the snapshot",
    )

    model_config = {"populate_by_name": True}


class SnapshotLinks(BaseModel):
    """Doubly-linked references to adjacent snapshots."""

    prev: SnapshotRef | None = Field(
        default=None, description="Link to previous snapshot"
    )
    next: SnapshotRef | None = Field(
        default=None, description="Link to next snapshot"
    )


class BranchRecord(BaseModel):
    """Reference to a branched plot."""

    branch_id: str = Field(..., alias="branchId", description="Unique branch identifier")
    branched_from: str = Field(
        ..., alias="branchedFrom", description="Activity ID of the branch point"
    )
    branched_at: datetime = Field(
        ..., alias="branchedAt", description="When the branch was created"
    )
    target_asset: str = Field(
        ..., alias="targetAsset", description="Relative path to the branched plot file"
    )

    model_config = {"populate_by_name": True}


class FileProvEntry(BaseModel):
    """File-level provenance event (snapshot or branch creation)."""

    activity_id: str = Field(..., alias="activityId", description="Unique event identifier")
    type: str = Field(..., description="Event type: snapshot or branch")
    timestamp: datetime = Field(..., description="When the event occurred")
    asset: str | None = Field(default=None, description="Path to snapshot file")
    branch_id: str | None = Field(
        default=None, alias="branchId", description="Branch identifier"
    )
    direction: str | None = Field(
        default=None, description="'source' or 'target' (for branch events)"
    )

    model_config = {"populate_by_name": True}

    @field_validator("type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        if v not in ("snapshot", "branch"):
            raise ValueError(f"type must be 'snapshot' or 'branch', got: {v}")
        return v

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: str | None) -> str | None:
        if v is not None and v not in ("source", "target"):
            raise ValueError(f"direction must be 'source' or 'target', got: {v}")
        return v


class SystemRecordProperties(BaseModel):
    """
    Properties for the non-spatial system record feature.

    A system record is a GeoJSON Feature with featureType "system"
    and Point geometry with empty coordinates.
    """

    feature_type: str = Field(
        default="system", alias="featureType", description="Discriminator, always 'system'"
    )
    snapshot_links: SnapshotLinks | None = Field(
        default=None, alias="snapshotLinks",
        description="Doubly-linked snapshot chain",
    )
    branches: list[BranchRecord] = Field(
        default_factory=list, description="Branch records"
    )
    provenance: list[FileProvEntry] = Field(
        default_factory=list, description="File-level provenance events"
    )

    model_config = {"populate_by_name": True}

    @field_validator("feature_type")
    @classmethod
    def validate_feature_type(cls, v: str) -> str:
        if v != "system":
            raise ValueError(f"feature_type must be 'system', got: {v}")
        return v
