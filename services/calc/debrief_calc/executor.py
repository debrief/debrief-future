"""
Tool execution engine for debrief-calc.

Provides the main entry point for running analysis tools with:
- Input validation (context type, kind compatibility)
- Provenance tracking
- Output validation (structural + schema)
- Error handling
"""

from __future__ import annotations

import logging
import time
from typing import Any

from debrief_calc.exceptions import (
    ExecutionError,
    InvalidContextError,
    KindMismatchError,
    ToolNotFoundError,
    ValidationError,
)
from debrief_calc.models import (
    ContextType,
    GeoJSONFeatureDict,
    InputFeatureState,
    SelectionContext,
    Tool,
    ToolError,
    ToolResult,
)
from debrief_calc.provenance import attach_log_entry, create_log_entry, set_output_kind
from debrief_calc.registry import registry
from debrief_calc.validation import validate_tool_output

logger = logging.getLogger(__name__)


def run(
    tool_name: str,
    context: SelectionContext,
    params: dict[str, Any] | None = None,
    validate_output: bool = True,
) -> ToolResult:
    """
    Execute a tool on the given selection context.

    Args:
        tool_name: Name of the tool to execute
        context: SelectionContext with the user's selection
        params: Optional parameters for the tool
        validate_output: Whether to validate output (default: True)

    Returns:
        ToolResult with either features (on success) or error (on failure)

    The result always includes:
    - tool: Name of the executed tool
    - success: Whether execution succeeded
    - duration_ms: Execution time in milliseconds
    - features: Output GeoJSON features (if success)
    - error: Error details (if failure)
    """
    params = params or {}
    start_time = time.perf_counter()

    try:
        # Get the tool from registry
        tool = registry.get_tool(tool_name)

        # Validate context type
        _validate_context_type(tool, context)

        # Validate feature kinds
        _validate_kinds(tool, context)

        # Schema-validate input features (warn-and-continue)
        if context.features:
            _schema_validate_features(context.features, f"{tool_name}:input")

        # BEFORE _execute_handler — mutation tools mutate context.features in-place
        is_mutation = tool.output_kind.startswith("mutation/")
        input_state_list: list[InputFeatureState] | None = None
        if is_mutation:
            input_state_list = _capture_input_state(context.features)

        # Merge tool default parameter values so provenance records the
        # actual values used, even when the caller omits optional params.
        effective_params = dict(params)
        for p in tool.parameters:
            if p.name not in effective_params and p.default is not None:
                effective_params[p.name] = p.default

        # Execute the tool handler
        output_features = _execute_handler(tool, context, effective_params)

        duration_ms = (time.perf_counter() - start_time) * 1000

        # Attach PROV-aligned log entries to output features
        log_entry = create_log_entry(
            tool_name=tool.name,
            tool_version=tool.version,
            source_features=context.features,
            parameters=effective_params,
            duration_ms=duration_ms,
            input_state=input_state_list,
        )

        # Attach provenance only to GeoJSON Feature outputs (not artifact data)
        is_geojson = all(f.get("type") == "Feature" for f in output_features)
        if is_geojson:
            # Mutation tools preserve the original kind (e.g. 'TRACK') so that
            # downstream type guards continue to work after mutation.
            for feature in output_features:
                if not is_mutation:
                    set_output_kind(feature, tool.output_kind)
                attach_log_entry(feature, log_entry)

            # Validate output if requested (skip kind check for mutations)
            if validate_output and not is_mutation:
                validate_tool_output(output_features, tool.output_kind, tool.name)

            # Schema validation (warn-and-continue during gradual adoption)
            if validate_output:
                _schema_validate_features(output_features, tool.name)

        return ToolResult(
            tool=tool_name, success=True, features=output_features, duration_ms=duration_ms
        )

    except ToolNotFoundError as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        return ToolResult(
            tool=tool_name,
            success=False,
            error=ToolError(code="TOOL_NOT_FOUND", message=e.message, details=e.details),
            duration_ms=duration_ms,
        )

    except InvalidContextError as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        return ToolResult(
            tool=tool_name,
            success=False,
            error=ToolError(code="INVALID_CONTEXT", message=e.message, details=e.details),
            duration_ms=duration_ms,
        )

    except KindMismatchError as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        return ToolResult(
            tool=tool_name,
            success=False,
            error=ToolError(code="KIND_MISMATCH", message=e.message, details=e.details),
            duration_ms=duration_ms,
        )

    except ValidationError as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        return ToolResult(
            tool=tool_name,
            success=False,
            error=ToolError(code="VALIDATION_FAILED", message=e.message, details=e.details),
            duration_ms=duration_ms,
        )

    except Exception as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        return ToolResult(
            tool=tool_name,
            success=False,
            error=ToolError(
                code="EXECUTION_ERROR",
                message=f"Tool '{tool_name}' execution failed: {str(e)}",
                details={"error_type": type(e).__name__, "error_message": str(e)},
            ),
            duration_ms=duration_ms,
        )


def _validate_context_type(tool: Tool, context: SelectionContext) -> None:
    """Validate that context type matches tool requirements."""
    # MULTI tools accept both SINGLE and MULTI contexts (1+ features)
    if tool.context_type == ContextType.MULTI and context.type in (
        ContextType.SINGLE,
        ContextType.MULTI,
    ):
        return
    if tool.context_type != context.type:
        raise InvalidContextError(tool.name, tool.context_type.value, context.type.value)


def _validate_kinds(tool: Tool, context: SelectionContext) -> None:
    """Validate that feature kinds are accepted by the tool."""
    # Skip kind validation for NONE and REGION context types
    if context.type in (ContextType.NONE, ContextType.REGION):
        return

    kinds = context.get_kinds()
    if not kinds:
        # No kinds specified - allow execution
        return

    # Check if tool accepts at least one of the provided kinds
    accepted = False
    for kind in kinds:
        if tool.accepts_kind(kind):
            accepted = True
            break

    if not accepted:
        raise KindMismatchError(tool.name, tool.input_kinds, kinds)


def _schema_validate_features(features: list[GeoJSONFeatureDict], tool_name: str) -> None:
    """Run schema validation on output features (warn-and-continue).

    Validates each feature that has a known ``kind`` against the Pydantic model
    from ``debrief_schemas.validation.FEATURE_MODEL_MAP``. Schema failures are
    logged as warnings rather than raising, to allow gradual adoption.
    """
    try:
        from debrief_schemas.validation import SchemaValidationError, validate_feature
    except ImportError:
        return  # debrief-schemas not available

    for i, feature in enumerate(features):
        try:
            validate_feature(feature, "tool_output")
        except SchemaValidationError as e:
            logger.warning(
                "Schema validation warning for tool '%s' feature[%d]: %s",
                tool_name,
                i,
                e,
            )


def _capture_input_state(
    features: list[GeoJSONFeatureDict],
) -> list[InputFeatureState]:
    """Capture pre-operation geometry and spatial properties from input features."""
    import copy
    import json as _json

    states = []
    for feature in features:
        feature_id = str(feature.get("id", "unknown"))
        geometry = copy.deepcopy(feature.get("geometry", {}))
        props = feature.get("properties", {})
        # Exclude provenance (append-only, never restored)
        spatial_props = {k: copy.deepcopy(v) for k, v in props.items() if k != "provenance"}
        # Generated InputFeatureState uses snake_case field names and string geometry/properties
        states.append(
            InputFeatureState(
                feature_id=feature_id,
                geometry=_json.dumps(geometry),
                properties=_json.dumps(spatial_props) if spatial_props else None,
            )
        )
    return states


def _execute_handler(
    tool: Tool, context: SelectionContext, params: dict[str, Any]
) -> list[GeoJSONFeatureDict]:
    """Execute the tool handler and return output features."""
    if tool.handler is None:
        raise ExecutionError(tool.name, ValueError("Tool has no handler"))

    try:
        result = tool.handler(context, params)

        if not isinstance(result, list):
            raise ExecutionError(
                tool.name, TypeError(f"Handler must return list, got {type(result).__name__}")
            )

        return result

    except Exception as e:
        if isinstance(e, ExecutionError):
            raise
        raise ExecutionError(tool.name, e) from e
