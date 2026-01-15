"""Unit tests for debrief-calc exceptions."""

import pytest

from debrief_calc.exceptions import (
    DebriefCalcError,
    ToolNotFoundError,
    InvalidContextError,
    KindMismatchError,
    ValidationError,
    ExecutionError,
)


class TestDebriefCalcError:
    """Tests for base DebriefCalcError."""

    def test_create_error(self):
        error = DebriefCalcError("Something went wrong")
        assert str(error) == "Something went wrong"
        assert error.message == "Something went wrong"
        assert error.details == {}

    def test_create_error_with_details(self):
        error = DebriefCalcError("Error", details={"key": "value"})
        assert error.details == {"key": "value"}

    def test_to_dict(self):
        error = DebriefCalcError("Error", details={"foo": "bar"})
        d = error.to_dict()
        assert d["code"] == "DEBRIEFCALC"
        assert d["message"] == "Error"
        assert d["details"] == {"foo": "bar"}

    def test_inheritance(self):
        error = DebriefCalcError("Test")
        assert isinstance(error, Exception)


class TestToolNotFoundError:
    """Tests for ToolNotFoundError."""

    def test_create_error(self):
        error = ToolNotFoundError("unknown-tool")
        assert error.tool_name == "unknown-tool"
        assert "unknown-tool" in error.message
        assert "not found" in error.message

    def test_to_dict(self):
        error = ToolNotFoundError("missing")
        d = error.to_dict()
        assert d["code"] == "TOOL_NOT_FOUND"
        assert d["details"]["tool_name"] == "missing"

    def test_is_debrief_calc_error(self):
        error = ToolNotFoundError("test")
        assert isinstance(error, DebriefCalcError)


class TestInvalidContextError:
    """Tests for InvalidContextError."""

    def test_create_error(self):
        error = InvalidContextError("track-stats", "single", "multi")
        assert error.tool_name == "track-stats"
        assert error.expected == "single"
        assert error.actual == "multi"

    def test_message_contains_context_info(self):
        error = InvalidContextError("tool", "single", "multi")
        assert "single" in error.message
        assert "multi" in error.message

    def test_to_dict(self):
        error = InvalidContextError("tool", "single", "multi")
        d = error.to_dict()
        assert d["code"] == "INVALID_CONTEXT"
        assert d["details"]["expected"] == "single"
        assert d["details"]["actual"] == "multi"


class TestKindMismatchError:
    """Tests for KindMismatchError."""

    def test_create_error(self):
        error = KindMismatchError("tool", ["track"], {"zone"})
        assert error.tool_name == "tool"
        assert error.accepted_kinds == ["track"]
        assert error.actual_kinds == {"zone"}

    def test_message_contains_kinds(self):
        error = KindMismatchError("tool", ["track", "point"], {"zone"})
        assert "track" in error.message
        assert "zone" in error.message

    def test_to_dict(self):
        error = KindMismatchError("tool", ["track"], {"zone"})
        d = error.to_dict()
        assert d["code"] == "KIND_MISMATCH"
        assert "track" in d["details"]["accepted_kinds"]


class TestValidationError:
    """Tests for ValidationError."""

    def test_create_error(self):
        error = ValidationError("Invalid GeoJSON")
        assert error.message == "Invalid GeoJSON"
        assert error.validation_errors == []

    def test_create_error_with_errors(self):
        errors = [
            {"field": "properties.kind", "error": "required"},
            {"field": "geometry", "error": "invalid"}
        ]
        error = ValidationError("Validation failed", errors)
        assert len(error.validation_errors) == 2

    def test_to_dict(self):
        errors = [{"field": "test", "error": "bad"}]
        error = ValidationError("Failed", errors)
        d = error.to_dict()
        assert d["code"] == "VALIDATION_FAILED"
        assert d["details"]["validation_errors"] == errors


class TestExecutionError:
    """Tests for ExecutionError."""

    def test_create_error(self):
        original = ValueError("division by zero")
        error = ExecutionError("calc-tool", original)
        assert error.tool_name == "calc-tool"
        assert error.original_error is original

    def test_message_contains_original_error(self):
        original = RuntimeError("connection failed")
        error = ExecutionError("remote-tool", original)
        assert "connection failed" in error.message

    def test_to_dict(self):
        original = TypeError("wrong type")
        error = ExecutionError("tool", original)
        d = error.to_dict()
        assert d["code"] == "EXECUTION_ERROR"
        assert d["details"]["error_type"] == "TypeError"
        assert "wrong type" in d["details"]["original_error"]

    def test_error_can_be_caught_as_base(self):
        original = ValueError("test")
        error = ExecutionError("tool", original)

        with pytest.raises(DebriefCalcError):
            raise error
