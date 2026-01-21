"""
Main annotation parser for REP file special comments.

Parses annotation lines and produces GeoJSON features with styling properties.
Uses fail-fast error handling - invalid data raises AnnotationParseError immediately.
"""

import uuid
from typing import Any

from debrief_io.exceptions import AnnotationParseError, ErrorCode

# Annotation type prefixes
ANNOTATION_PREFIXES = frozenset(
    [
        ";NARRATIVE:",
        ";NARRATIVE2:",
        ";CIRCLE:",
        ";RECT:",
        ";LINE:",
        ";VECTOR:",
        ";TEXT:",
        ";POLY:",
        ";POLYLINE:",
        ";ELLIPSE:",
        ";ELLIPSE2:",
        ";TIMETEXT:",
        ";PERIODTEXT:",
        ";WHEEL:",
        ";DYNAMIC_RECT:",
        ";DYNAMIC_CIRCLE:",
        ";DYNAMIC_POLY:",
        ";SENSOR:",
        ";SENSOR2:",
        ";TMA_POS:",
        ";TMA_RB:",
        ";TRACKSPLIT",  # Note: no colon
    ]
)


def is_annotation_line(line: str) -> bool:
    """
    Check if a line is an annotation (special comment).

    Args:
        line: Line to check

    Returns:
        True if line is an annotation, False otherwise
    """
    stripped = line.strip()
    return any(stripped.startswith(prefix) for prefix in ANNOTATION_PREFIXES)


def get_annotation_type(line: str) -> str | None:
    """
    Extract annotation type from a line.

    Args:
        line: Annotation line

    Returns:
        Annotation type (e.g., "CIRCLE", "NARRATIVE") or None
    """
    stripped = line.strip()
    for prefix in ANNOTATION_PREFIXES:
        if stripped.startswith(prefix):
            # Extract type without semicolon and colon
            type_name = prefix.lstrip(";").rstrip(":")
            return type_name
    return None


def parse_annotations(
    lines: list[tuple[int, str]],
    filename: str = "<unknown>",
) -> list[dict[str, Any]]:
    """
    Parse annotations from REP file lines.

    This is the main entry point for annotation parsing.

    Args:
        lines: List of (line_number, line_text) tuples containing annotation lines
        filename: Source filename for error messages

    Returns:
        List of GeoJSON Feature dictionaries

    Raises:
        AnnotationParseError: If any annotation data is invalid (fail-fast)
    """
    features = []

    for line_number, line in lines:
        if not is_annotation_line(line):
            continue

        annotation_type = get_annotation_type(line)
        if annotation_type is None:
            continue

        try:
            feature = _parse_annotation(line, line_number, filename, annotation_type)
            if feature is not None:
                features.append(feature)
        except AnnotationParseError:
            # Re-raise with context preserved
            raise
        except ValueError as e:
            # Convert ValueError to AnnotationParseError
            raise AnnotationParseError(
                str(e),
                line_number=line_number,
                code=ErrorCode.PARSE_ERROR,
                filename=filename,
                annotation_type=annotation_type,
            ) from e

    return features


def _parse_annotation(
    line: str,
    line_number: int,
    filename: str,
    annotation_type: str,
) -> dict[str, Any] | None:
    """
    Parse a single annotation line.

    Args:
        line: Annotation line text
        line_number: Line number in source file
        filename: Source filename
        annotation_type: Type of annotation

    Returns:
        GeoJSON Feature dictionary or None if not implemented yet
    """
    # Import builders here to avoid circular imports
    from . import builders

    # Route to appropriate builder based on annotation type
    builders_map = {
        "NARRATIVE": builders.build_narrative,
        "NARRATIVE2": builders.build_narrative,
        "CIRCLE": builders.build_circle,
        "RECT": builders.build_rectangle,
        "LINE": builders.build_line,
        "VECTOR": builders.build_vector,
        "TEXT": builders.build_text,
        # P2 types - to be implemented
        "POLY": builders.build_polygon,
        "POLYLINE": builders.build_polyline,
        "ELLIPSE": builders.build_ellipse,
        "ELLIPSE2": builders.build_ellipse,
        "TIMETEXT": builders.build_timetext,
        "PERIODTEXT": builders.build_periodtext,
        "WHEEL": builders.build_wheel,
        # P3 types - to be implemented
        "DYNAMIC_RECT": builders.build_dynamic_rect,
        "DYNAMIC_CIRCLE": builders.build_dynamic_circle,
        "DYNAMIC_POLY": builders.build_dynamic_poly,
        "SENSOR": builders.build_sensor,
        "SENSOR2": builders.build_sensor,
        "TMA_POS": builders.build_tma,
        "TMA_RB": builders.build_tma,
        "TRACKSPLIT": builders.build_tracksplit,
    }

    builder = builders_map.get(annotation_type)
    if builder is None:
        # Unknown annotation type - skip silently for forward compatibility
        return None

    return builder(line, line_number, filename)


def generate_feature_id() -> str:
    """Generate a unique feature ID."""
    return str(uuid.uuid4())
