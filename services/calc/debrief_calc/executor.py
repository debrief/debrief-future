"""
Tool execution engine for debrief-calc.

Provides the main entry point for running analysis tools with:
- Input validation (context type, kind compatibility)
- Provenance tracking
- Output validation
- Error handling
"""

from __future__ import annotations

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
    SelectionContext,
    Tool,
    ToolError,
    ToolResult,
)
from debrief_calc.provenance import attach_provenance, create_provenance, set_output_kind
from debrief_calc.registry import registry
from debrief_calc.validation import validate_tool_output


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

        # Execute the tool handler
        output_features = _execute_handler(tool, context, params)

        # Attach provenance to output features
        provenance = create_provenance(
            tool_name=tool.name,
            tool_version=tool.version,
            source_features=context.features,
            parameters=params,
        )

        for feature in output_features:
            set_output_kind(feature, tool.output_kind)
            attach_provenance(feature, provenance)

        # Validate output if requested
        if validate_output:
            validate_tool_output(output_features, tool.output_kind, tool.name)

        duration_ms = (time.perf_counter() - start_time) * 1000

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


def _execute_handler(
    tool: Tool, context: SelectionContext, params: dict[str, Any]
) -> list[dict[str, Any]]:
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
