"""
Exception hierarchy for debrief-calc.

All exceptions inherit from DebriefCalcError, enabling callers to catch
all debrief-calc errors with a single except clause while still allowing
specific error handling when needed.
"""

from typing import Any


class DebriefCalcError(Exception):
    """Base exception for all debrief-calc errors."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to dictionary for serialization."""
        return {
            "code": self.__class__.__name__.replace("Error", "").upper(),
            "message": self.message,
            "details": self.details,
        }


class ToolNotFoundError(DebriefCalcError):
    """Raised when a requested tool does not exist in the registry."""

    def __init__(self, tool_name: str):
        super().__init__(
            f"Tool '{tool_name}' not found in registry",
            {"tool_name": tool_name}
        )
        self.tool_name = tool_name

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": "TOOL_NOT_FOUND",
            "message": self.message,
            "details": self.details,
        }


class InvalidContextError(DebriefCalcError):
    """Raised when selection context doesn't match tool requirements."""

    def __init__(self, tool_name: str, expected: str, actual: str):
        super().__init__(
            f"Tool '{tool_name}' requires context type '{expected}', got '{actual}'",
            {"tool_name": tool_name, "expected": expected, "actual": actual}
        )
        self.tool_name = tool_name
        self.expected = expected
        self.actual = actual

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": "INVALID_CONTEXT",
            "message": self.message,
            "details": self.details,
        }


class KindMismatchError(DebriefCalcError):
    """Raised when feature kind is not accepted by the tool."""

    def __init__(self, tool_name: str, accepted_kinds: list[str], actual_kinds: set[str]):
        super().__init__(
            f"Tool '{tool_name}' accepts kinds {accepted_kinds}, got {list(actual_kinds)}",
            {"tool_name": tool_name, "accepted_kinds": accepted_kinds, "actual_kinds": list(actual_kinds)}
        )
        self.tool_name = tool_name
        self.accepted_kinds = accepted_kinds
        self.actual_kinds = actual_kinds

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": "KIND_MISMATCH",
            "message": self.message,
            "details": self.details,
        }


class ValidationError(DebriefCalcError):
    """Raised when input or output fails schema validation."""

    def __init__(self, message: str, validation_errors: list[dict[str, Any]] | None = None):
        super().__init__(
            message,
            {"validation_errors": validation_errors or []}
        )
        self.validation_errors = validation_errors or []

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": "VALIDATION_FAILED",
            "message": self.message,
            "details": self.details,
        }


class ExecutionError(DebriefCalcError):
    """Raised when tool handler raises an exception during execution."""

    def __init__(self, tool_name: str, original_error: Exception):
        super().__init__(
            f"Tool '{tool_name}' execution failed: {str(original_error)}",
            {"tool_name": tool_name, "original_error": str(original_error), "error_type": type(original_error).__name__}
        )
        self.tool_name = tool_name
        self.original_error = original_error

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": "EXECUTION_ERROR",
            "message": self.message,
            "details": self.details,
        }
