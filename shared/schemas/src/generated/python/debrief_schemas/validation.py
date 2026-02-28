"""Schema validation infrastructure for Debrief GeoJSON features.

Provides:
- FEATURE_MODEL_MAP: dispatch dictionary mapping kind → Pydantic model class
- validate_feature(): validate a single feature against its schema
- validate_features(): batch validation with fail-fast
- resolve_feature_model(): look up model class for a kind
- resolve_enum_values(): get valid values for a schema enum
- SchemaValidationError / FieldError: structured validation errors
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from pydantic import ValidationError as PydanticValidationError

from debrief_schemas import (
    CardinalDirectionEnum,
    CircleAnnotation,
    DurationPresetEnum,
    LineAnnotation,
    MarkerSymbolEnum,
    MultiPointFeature,
    MultiPolygonFeature,
    NamedColorEnum,
    NarrativeEntry,
    NumericPresetEnum,
    PolyAnnotation,
    RectangleAnnotation,
    ReferenceLocation,
    ReferencePointPatternEnum,
    SystemState,
    TextAnnotation,
    TrackFeature,
    VectorAnnotation,
)

if TYPE_CHECKING:
    from debrief_schemas import ConfiguredBaseModel

# ============================================================================
# T016: FEATURE_MODEL_MAP — dispatch dictionary for all 12 kinds
# ============================================================================

FEATURE_MODEL_MAP: dict[str, type[ConfiguredBaseModel]] = {
    "TRACK": TrackFeature,
    "POINT": ReferenceLocation,
    "NARRATIVE": NarrativeEntry,
    "CIRCLE": CircleAnnotation,
    "RECTANGLE": RectangleAnnotation,
    "LINE": LineAnnotation,
    "TEXT": TextAnnotation,
    "VECTOR": VectorAnnotation,
    "POLY": PolyAnnotation,
    "MULTI_POINT": MultiPointFeature,
    "MULTI_POLYGON": MultiPolygonFeature,
    "SYSTEM": SystemState,
}

# ============================================================================
# T20: Enum resolution map — param_type string → schema enum class
# ============================================================================

_ENUM_MAP: dict[str, type] = {
    "NamedColor": NamedColorEnum,
    "MarkerSymbol": MarkerSymbolEnum,
    "DurationPreset": DurationPresetEnum,
    "ReferencePointPattern": ReferencePointPatternEnum,
    "CardinalDirection": CardinalDirectionEnum,
    "NumericPreset": NumericPresetEnum,
}


# ============================================================================
# T015: SchemaValidationError and FieldError
# ============================================================================


@dataclass
class FieldError:
    """A single field-level validation error."""

    field_path: str
    expected: str
    actual: str
    message: str


@dataclass
class SchemaValidationError(Exception):
    """Raised when feature data does not conform to its expected schema.

    Attributes:
        boundary: Where validation failed (parser_output, tool_input,
                  tool_output, catalog_write, catalog_read).
        feature_id: ID of the failing feature (if available).
        feature_kind: kind value of the failing feature (if available).
        errors: List of individual field errors.
    """

    boundary: str
    feature_id: str | None
    feature_kind: str | None
    errors: list[FieldError] = field(default_factory=list)

    def __str__(self) -> str:
        id_part = f" Feature '{self.feature_id}'" if self.feature_id else ""
        kind_part = f" ({self.feature_kind})" if self.feature_kind else ""
        header = f"SchemaValidationError at {self.boundary}:{id_part}{kind_part}"
        if not self.errors:
            return header
        lines = [header]
        for err in self.errors:
            lines.append(f"  - {err.field_path}: {err.message}")
        return "\n".join(lines)


# ============================================================================
# T19: resolve_feature_model()
# ============================================================================


def resolve_feature_model(kind: str) -> type[ConfiguredBaseModel] | None:
    """Return the Pydantic model class for a given kind, or None if unknown."""
    return FEATURE_MODEL_MAP.get(kind)


# ============================================================================
# T20: resolve_enum_values()
# ============================================================================


def resolve_enum_values(param_type: str) -> set[str] | None:
    """Return the set of valid string values for a schema enum, or None if unknown.

    Args:
        param_type: Name matching a schema enum (e.g., "NamedColor", "MarkerSymbol").

    Returns:
        Set of valid string values, or None if param_type is not recognised.
    """
    enum_cls = _ENUM_MAP.get(param_type)
    if enum_cls is None:
        return None
    return {e.value for e in enum_cls}


# ============================================================================
# T17: validate_feature()
# ============================================================================


def validate_feature(feature: dict[str, Any], boundary: str) -> None:
    """Validate a single GeoJSON feature against its schema model.

    Extracts ``kind`` from ``feature["properties"]["kind"]``, looks up the
    corresponding Pydantic model in FEATURE_MODEL_MAP, and calls
    ``model.model_validate(feature)``.

    Args:
        feature: GeoJSON feature dict with ``properties.kind``.
        boundary: Validation boundary identifier (e.g., "tool_output").

    Raises:
        SchemaValidationError: If the feature fails validation.
    """
    # Extract properties
    properties = feature.get("properties")
    if properties is None or not isinstance(properties, dict):
        raise SchemaValidationError(
            boundary=boundary,
            feature_id=feature.get("id"),
            feature_kind=None,
            errors=[FieldError("properties", "dict", str(type(properties).__name__), "Missing properties")],
        )

    # Extract kind
    kind = properties.get("kind")
    if kind is None:
        raise SchemaValidationError(
            boundary=boundary,
            feature_id=feature.get("id"),
            feature_kind=None,
            errors=[FieldError("properties.kind", "FeatureKindEnum", "None", "Missing kind discriminator")],
        )

    # Resolve model
    model = FEATURE_MODEL_MAP.get(kind)
    if model is None:
        raise SchemaValidationError(
            boundary=boundary,
            feature_id=feature.get("id"),
            feature_kind=kind,
            errors=[FieldError("properties.kind", "known FeatureKindEnum", kind, f"Unknown feature kind: {kind}")],
        )

    # Validate against schema model
    try:
        model.model_validate(feature)
    except PydanticValidationError as e:
        field_errors = []
        for err in e.errors():
            path = ".".join(str(p) for p in err["loc"])
            field_errors.append(
                FieldError(
                    field_path=path,
                    expected=err.get("ctx", {}).get("expected", err["type"]),
                    actual=str(err.get("input", "")),
                    message=err["msg"],
                )
            )
        raise SchemaValidationError(
            boundary=boundary,
            feature_id=feature.get("id"),
            feature_kind=kind,
            errors=field_errors,
        ) from e


# ============================================================================
# T18: validate_features() batch wrapper
# ============================================================================


def validate_features(features: list[dict[str, Any]], boundary: str) -> None:
    """Validate a list of features. Fails on first invalid feature.

    Args:
        features: List of GeoJSON feature dicts.
        boundary: Validation boundary identifier.

    Raises:
        SchemaValidationError: On first validation failure.
    """
    for feature in features:
        validate_feature(feature, boundary)
