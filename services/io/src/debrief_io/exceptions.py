"""Domain exceptions for debrief-io.

All exceptions include context for better error messages:
- Line numbers where parsing errors occurred
- Field names for validation errors
- Original exceptions for debugging
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pydantic import ValidationError as PydanticValidationError


class ParseError(Exception):
    """Fatal error during file parsing.

    Raised when a file cannot be parsed due to structural issues.
    Includes line number context when available.

    Attributes:
        message: Error description
        line_number: Line where error occurred (optional)
        field: Field that caused error (optional)
    """

    def __init__(
        self,
        message: str,
        line_number: int | None = None,
        field: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.line_number = line_number
        self.field = field

    def __str__(self) -> str:
        parts = [self.message]
        if self.line_number is not None:
            parts.append(f"(line {self.line_number})")
        if self.field is not None:
            parts.append(f"[field: {self.field}]")
        return " ".join(parts)


class UnsupportedFormatError(Exception):
    """File format not recognized by any registered handler.

    Raised when attempting to parse a file with an extension
    that has no registered handler.

    Attributes:
        extension: Unrecognized file extension
        supported: List of supported extensions
    """

    def __init__(self, extension: str, supported: list[str]) -> None:
        self.extension = extension
        self.supported = supported
        super().__init__(
            f"Unsupported file format: {extension}. "
            f"Supported: {', '.join(supported) if supported else 'none'}"
        )


class ValidationError(ParseError):
    """Feature failed schema validation.

    Wraps Pydantic ValidationError with parse context,
    providing line numbers and field information for debugging.

    Attributes:
        pydantic_error: Original Pydantic validation error (optional)
    """

    def __init__(
        self,
        message: str,
        line_number: int | None = None,
        pydantic_error: PydanticValidationError | None = None,
    ) -> None:
        super().__init__(message, line_number)
        self.pydantic_error = pydantic_error

    @classmethod
    def from_pydantic(
        cls,
        error: PydanticValidationError,
        line_number: int | None = None,
    ) -> ValidationError:
        """Create ValidationError from Pydantic ValidationError.

        Args:
            error: Original Pydantic validation error
            line_number: Line number where the invalid data originated

        Returns:
            ValidationError with extracted error details
        """
        errors = error.errors()
        if errors:
            first_error = errors[0]
            loc = ".".join(str(x) for x in first_error.get("loc", []))
            msg = first_error.get("msg", str(error))
            message = f"Validation failed at '{loc}': {msg}" if loc else msg
        else:
            message = str(error)
        return cls(message, line_number, error)
