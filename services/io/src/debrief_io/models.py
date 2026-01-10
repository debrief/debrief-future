"""Pydantic models for parse results.

These models define the structure of parsing outputs,
including features, warnings, and handler metadata.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ParseWarning(BaseModel):
    """Non-fatal issue encountered during parsing.

    Warnings are collected during parsing for issues that don't
    prevent successful parsing but may indicate data quality problems.

    Attributes:
        message: Human-readable warning description
        line_number: Source file line number if applicable
        field: Field name if this is a validation warning
        code: Warning code for programmatic handling
    """

    message: str
    """Human-readable warning description."""

    line_number: int | None = None
    """Source file line number if applicable."""

    field: str | None = None
    """Field name if validation warning."""

    code: str
    """Warning code (e.g., UNKNOWN_RECORD, INVALID_COORD)."""


class HandlerInfo(BaseModel):
    """Metadata about a registered file handler.

    Used to provide information about available handlers
    without exposing handler implementation details.

    Attributes:
        extension: File extension (lowercase, with dot)
        name: Handler display name
        description: Handler description
        version: Handler version string
    """

    extension: str
    """File extension (lowercase, with dot)."""

    name: str
    """Handler display name."""

    description: str
    """Handler description."""

    version: str
    """Handler version."""


class ParseResult(BaseModel):
    """Result of a successful parse operation.

    Contains all parsed features, any warnings encountered,
    and metadata about the parse operation.

    Attributes:
        features: Parsed and validated GeoJSON features
        warnings: Non-fatal issues encountered during parsing
        source_file: Absolute path to source file
        encoding: Detected file encoding
        parse_time_ms: Parse duration in milliseconds
        handler: Name of handler that processed the file
    """

    features: list[Any] = Field(default_factory=list)
    """Parsed and validated GeoJSON features.

    Each feature is a TrackFeature or ReferenceLocation from debrief-schemas.
    Using Any here to avoid circular import; actual types enforced at runtime.
    """

    warnings: list[ParseWarning] = Field(default_factory=list)
    """Non-fatal issues encountered during parsing."""

    source_file: str
    """Absolute path to source file."""

    encoding: str = "utf-8"
    """Detected file encoding."""

    parse_time_ms: float = 0.0
    """Parse duration in milliseconds."""

    handler: str
    """Name of handler that processed the file."""
