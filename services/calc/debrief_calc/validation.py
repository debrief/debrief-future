"""
Validation utilities for debrief-calc.

Provides functions to validate GeoJSON structures and tool outputs
against the Debrief schema requirements.
"""

from typing import Any

from debrief_calc.exceptions import ValidationError


def validate_geojson(data: dict[str, Any]) -> list[str]:
    """
    Validate that data is a valid GeoJSON Feature or FeatureCollection.

    Args:
        data: Dictionary to validate as GeoJSON

    Returns:
        List of validation error messages (empty if valid)
    """
    errors = []

    if not isinstance(data, dict):
        return ["GeoJSON must be a dictionary"]

    geojson_type = data.get("type")
    if geojson_type not in ("Feature", "FeatureCollection"):
        errors.append(f"Invalid GeoJSON type: {geojson_type}")
        return errors

    if geojson_type == "Feature":
        errors.extend(_validate_feature(data))
    elif geojson_type == "FeatureCollection":
        features = data.get("features", [])
        if not isinstance(features, list):
            errors.append("FeatureCollection.features must be a list")
        else:
            for i, feature in enumerate(features):
                feature_errors = _validate_feature(feature)
                errors.extend([f"features[{i}]: {e}" for e in feature_errors])

    return errors


def _validate_feature(feature: dict[str, Any]) -> list[str]:
    """Validate a single GeoJSON Feature."""
    errors = []

    if not isinstance(feature, dict):
        return ["Feature must be a dictionary"]

    if feature.get("type") != "Feature":
        errors.append("Feature.type must be 'Feature'")

    # Properties validation
    properties = feature.get("properties")
    if properties is None:
        errors.append("Feature.properties is required")
    elif not isinstance(properties, dict):
        errors.append("Feature.properties must be a dictionary")

    # Geometry validation
    geometry = feature.get("geometry")
    if geometry is not None and not isinstance(geometry, dict):
        errors.append("Feature.geometry must be a dictionary or null")
    elif geometry is not None:
        geom_type = geometry.get("type")
        valid_geom_types = {
            "Point", "MultiPoint", "LineString", "MultiLineString",
            "Polygon", "MultiPolygon", "GeometryCollection"
        }
        if geom_type not in valid_geom_types:
            errors.append(f"Invalid geometry type: {geom_type}")

        if geom_type != "GeometryCollection" and "coordinates" not in geometry:
            errors.append("Geometry must have coordinates")

    return errors


def validate_tool_output(
    features: list[dict[str, Any]],
    expected_kind: str,
    tool_name: str
) -> None:
    """
    Validate tool output features against requirements.

    Ensures all output features:
    - Are valid GeoJSON Features
    - Have the expected 'kind' attribute in properties
    - Have provenance information

    Args:
        features: List of output GeoJSON features
        expected_kind: The kind that should be set in each feature
        tool_name: Name of the tool (for error messages)

    Raises:
        ValidationError: If any validation fails
    """
    validation_errors = []

    for i, feature in enumerate(features):
        # Validate GeoJSON structure
        geojson_errors = _validate_feature(feature)
        for error in geojson_errors:
            validation_errors.append({
                "feature_index": i,
                "error": error
            })

        # Skip further checks if basic structure is invalid
        if geojson_errors:
            continue

        properties = feature.get("properties", {})

        # Check kind attribute
        kind = properties.get("kind")
        if kind is None:
            validation_errors.append({
                "feature_index": i,
                "error": "Feature.properties.kind is required"
            })
        elif kind != expected_kind:
            validation_errors.append({
                "feature_index": i,
                "error": f"Expected kind '{expected_kind}', got '{kind}'"
            })

        # Check provenance
        provenance = properties.get("provenance")
        if provenance is None:
            validation_errors.append({
                "feature_index": i,
                "error": "Feature.properties.provenance is required"
            })
        elif not isinstance(provenance, dict):
            validation_errors.append({
                "feature_index": i,
                "error": "Feature.properties.provenance must be a dictionary"
            })
        else:
            # Validate provenance structure
            if "tool" not in provenance:
                validation_errors.append({
                    "feature_index": i,
                    "error": "provenance.tool is required"
                })
            if "version" not in provenance:
                validation_errors.append({
                    "feature_index": i,
                    "error": "provenance.version is required"
                })
            if "timestamp" not in provenance:
                validation_errors.append({
                    "feature_index": i,
                    "error": "provenance.timestamp is required"
                })
            if "sources" not in provenance:
                validation_errors.append({
                    "feature_index": i,
                    "error": "provenance.sources is required"
                })

    if validation_errors:
        raise ValidationError(
            f"Tool '{tool_name}' produced invalid output",
            validation_errors
        )


def validate_feature_kind(feature: dict[str, Any], accepted_kinds: list[str]) -> str | None:
    """
    Check if a feature's kind is in the accepted list.

    Args:
        feature: GeoJSON Feature to check
        accepted_kinds: List of kinds that are acceptable

    Returns:
        The feature's kind if valid, None if kind is missing or invalid
    """
    properties = feature.get("properties", {})
    kind = properties.get("kind")

    if kind is None:
        return None

    if kind in accepted_kinds:
        return kind

    return None
