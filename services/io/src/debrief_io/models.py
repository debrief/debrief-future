"""Pydantic models for parse results.

These models define the structure of parsing outputs,
including features, warnings, and handler metadata.
"""

from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


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

    features: list[dict[str, Any]] = Field(default_factory=list)
    """Parsed and validated GeoJSON features.

    Each feature is a TrackFeature or ReferenceLocation from debrief-schemas.
    Schema-validated at the parser output boundary (warn-and-continue).
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

    def schema_validate_features(self) -> list[ParseWarning]:
        """Run schema validation on parsed features (warn-and-continue).

        Returns a list of ParseWarning for any schema validation failures.
        Features that fail schema validation are NOT removed from the list.
        """
        schema_warnings: list[ParseWarning] = []
        try:
            from debrief_schemas.validation import SchemaValidationError, validate_feature
        except ImportError:
            return schema_warnings

        for i, feature in enumerate(self.features):
            try:
                validate_feature(feature, "parser_output")
            except SchemaValidationError as e:
                warning = ParseWarning(
                    message=f"Schema validation: {e}",
                    code="SCHEMA_VALIDATION",
                )
                schema_warnings.append(warning)
                logger.warning("Parser output schema warning for feature[%d]: %s", i, e)

        self.warnings.extend(schema_warnings)
        return schema_warnings


class ImportWarning(BaseModel):
    """Non-fatal issue encountered during batch import."""

    file: str
    code: str
    message: str


class ImportFileError(BaseModel):
    """Fatal error for a single file during batch import."""

    file: str
    error: str


class ImportResult(BaseModel):
    """Result of a batch import operation."""

    catalog_path: str
    files_processed: int = 0
    files_succeeded: int = 0
    files_failed: int = 0
    total_tracks: int = 0
    total_sensors: int = 0
    total_narratives: int = 0
    warnings: list[ImportWarning] = Field(default_factory=list)
    errors: list[ImportFileError] = Field(default_factory=list)
    duration_seconds: float = 0.0
