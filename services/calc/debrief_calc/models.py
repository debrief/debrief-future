"""
Core data models for debrief-calc.

Defines the entities used throughout the tool registry and execution system:
- ContextType: Enum for selection context classification
- SelectionContext: User's current data selection
- Tool: Registered analysis operation
- ToolParameter: Configurable parameter for a tool
- ToolResult: Output of tool execution
- ToolError: Structured error information
- Provenance: Lineage tracking for outputs
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Callable, Optional

from pydantic import BaseModel, Field, field_validator
import re


class ContextType(str, Enum):
    """
    Describes the selection context a tool requires.

    Values:
        SINGLE: Exactly one feature selected
        MULTI: Two or more features selected
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

    Records the tool, version, timestamp, and source features that
    produced a given output, enabling full traceability per Constitution III.1.
    """
    tool: str = Field(..., description="Tool that produced this feature")
    version: str = Field(..., description="Tool version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Execution timestamp")
    sources: list[SourceRef] = Field(default_factory=list, description="Input features used")
    parameters: dict[str, Any] = Field(default_factory=dict, description="Parameters passed to tool")


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
    default: Optional[Any] = Field(default=None, description="Default value if not provided")
    choices: Optional[list[Any]] = Field(default=None, description="Valid values for enum type")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        valid_types = {"string", "number", "boolean", "enum"}
        if v not in valid_types:
            raise ValueError(f"type must be one of {valid_types}")
        return v

    @field_validator("choices")
    @classmethod
    def validate_choices(cls, v: Optional[list], info) -> Optional[list]:
        if info.data.get("type") == "enum" and not v:
            raise ValueError("choices must be provided when type is 'enum'")
        return v


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
    details: Optional[dict[str, Any]] = Field(default=None, description="Additional context-specific details")


class ToolResult(BaseModel):
    """
    The output of a tool execution.

    Contains either successful output features with provenance,
    or error information explaining the failure.
    """
    tool: str = Field(..., description="Name of tool that produced this result")
    success: bool = Field(..., description="Whether execution succeeded")
    features: Optional[list[dict[str, Any]]] = Field(default=None, description="Output GeoJSON features")
    error: Optional[ToolError] = Field(default=None, description="Error details if not success")
    duration_ms: float = Field(..., description="Execution time in milliseconds")

    @field_validator("features")
    @classmethod
    def validate_features_on_success(cls, v: Optional[list], info) -> Optional[list]:
        if info.data.get("success") and v is None:
            raise ValueError("features must be provided when success is True")
        return v

    @field_validator("error")
    @classmethod
    def validate_error_on_failure(cls, v: Optional[ToolError], info) -> Optional[ToolError]:
        if not info.data.get("success") and v is None:
            raise ValueError("error must be provided when success is False")
        return v


class SelectionContext(BaseModel):
    """
    The user's current data selection.

    Determines which tools are applicable based on:
    - The type of selection (single, multi, region, none)
    - The features selected (for single/multi)
    - The geographic bounds (for region)
    """
    type: ContextType = Field(..., description="The context classification")
    features: list[dict[str, Any]] = Field(default_factory=list, description="Selected GeoJSON features")
    bounds: Optional[list[float]] = Field(default=None, description="Geographic bounds [minx, miny, maxx, maxy]")

    @field_validator("features")
    @classmethod
    def validate_features_count(cls, v: list, info) -> list:
        ctx_type = info.data.get("type")
        if ctx_type == ContextType.SINGLE and len(v) != 1:
            raise ValueError("features must have exactly 1 item when type is 'single'")
        if ctx_type == ContextType.MULTI and len(v) < 2:
            raise ValueError("features must have 2+ items when type is 'multi'")
        return v

    @field_validator("bounds")
    @classmethod
    def validate_bounds_for_region(cls, v: Optional[list], info) -> Optional[list]:
        if info.data.get("type") == ContextType.REGION and v is None:
            raise ValueError("bounds must be provided when type is 'region'")
        if v is not None and len(v) != 4:
            raise ValueError("bounds must be [minx, miny, maxx, maxy]")
        return v

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
    parameters: list[ToolParameter] = Field(default_factory=list, description="Configurable parameters")
    handler: Optional[Callable] = Field(default=None, exclude=True, description="Python function implementing the tool")

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
