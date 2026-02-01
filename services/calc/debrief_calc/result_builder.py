"""
MCP response builder for debrief-calc tool results.

Constructs MCP-compliant responses with Debrief-specific annotations
for each of the four result types: mutation, addition, deletion, artifact.
"""

import base64
import json

from debrief_calc.result_types import ResultTypePath

VALID_ERROR_CATEGORIES = {"invalid_input", "algorithm_failure", "resource_not_found"}


def build_mutation(
    features: list[dict],
    result_subtype: str,
    source_feature_ids: list[str],
    label: str,
) -> list[dict]:
    """Build MCP ResourceContent items for mutation results."""
    if not features:
        raise ValueError("features must not be empty")
    _validate_subtype(result_subtype)

    result_type = f"mutation/{result_subtype}"
    ResultTypePath(result_type)  # validate

    return [
        {
            "type": "resource",
            "resource": {
                "uri": f"feature://{f.get('id', f.get('properties', {}).get('id', 'unknown'))}",
                "mimeType": "application/geo+json",
                "text": json.dumps(f),
            },
            "annotations": {
                "debrief:resultType": result_type,
                "debrief:sourceFeatures": list(source_feature_ids),
                "debrief:label": label,
            },
        }
        for f in features
    ]


def build_addition(
    features: list[dict],
    result_subtype: str,
    source_feature_ids: list[str],
    label: str,
) -> list[dict]:
    """Build MCP ResourceContent items for addition results."""
    if not features:
        raise ValueError("features must not be empty")
    _validate_subtype(result_subtype)

    result_type = f"addition/{result_subtype}"
    ResultTypePath(result_type)  # validate

    return [
        {
            "type": "resource",
            "resource": {
                "uri": f"feature://{f.get('id', f.get('properties', {}).get('id', 'unknown'))}",
                "mimeType": "application/geo+json",
                "text": json.dumps(f),
            },
            "annotations": {
                "debrief:resultType": result_type,
                "debrief:sourceFeatures": list(source_feature_ids),
                "debrief:label": label,
            },
        }
        for f in features
    ]


def build_deletion(
    deleted_feature_ids: list[str],
    result_subtype: str,
    source_feature_ids: list[str],
    label: str,
) -> dict:
    """Build MCP TextContent item for deletion results."""
    if not deleted_feature_ids:
        raise ValueError("deleted_feature_ids must not be empty")
    _validate_subtype(result_subtype)

    result_type = f"deletion/{result_subtype}"
    ResultTypePath(result_type)  # validate

    return {
        "type": "text",
        "text": f"Deleted {len(deleted_feature_ids)} feature(s)",
        "annotations": {
            "debrief:resultType": result_type,
            "debrief:sourceFeatures": list(source_feature_ids),
            "debrief:label": label,
            "debrief:deletedFeatures": list(deleted_feature_ids),
        },
    }


def build_artifact(
    data: bytes,
    mime_type: str,
    result_subtype: str,
    source_feature_ids: list[str],
    label: str,
    href: str,
) -> dict:
    """Build MCP content item for artifact results."""
    if not data:
        raise ValueError("data must not be empty")
    if not href:
        raise ValueError("href must not be empty")
    _validate_subtype(result_subtype)

    result_type = f"artifact/{result_subtype}"
    ResultTypePath(result_type)  # validate

    annotations = {
        "debrief:resultType": result_type,
        "debrief:sourceFeatures": list(source_feature_ids),
        "debrief:label": label,
        "debrief:href": href,
    }

    if mime_type.startswith("image/"):
        return {
            "type": "image",
            "data": base64.b64encode(data).decode("ascii"),
            "mimeType": mime_type,
            "annotations": annotations,
        }
    else:
        return {
            "type": "resource",
            "resource": {
                "uri": f"artifact://{href}",
                "mimeType": mime_type,
                "text": data.decode("utf-8"),
            },
            "annotations": annotations,
        }


def build_error(
    message: str,
    category: str,
    affected_feature_ids: list[str],
    code: int = -32000,
) -> dict:
    """Build MCP error response with Debrief metadata."""
    if category not in VALID_ERROR_CATEGORIES:
        raise ValueError(f"category must be one of {VALID_ERROR_CATEGORIES}, got: '{category}'")

    return {
        "code": code,
        "message": message,
        "data": {
            "debrief:errorCategory": category,
            "debrief:affectedFeatures": list(affected_feature_ids),
        },
    }


def build_response(content_items: list[dict]) -> dict:
    """Build an MCP tool response containing one or more content items.

    Args:
        content_items: List of content dicts (from build_mutation, build_addition, etc.)
                      For build_mutation/build_addition, pass the list directly or flatten multiple.

    Returns:
        MCP response dict with content array.

    Raises:
        ValueError: If content_items is empty.
    """
    if not content_items:
        raise ValueError("content_items must not be empty")
    return {"content": content_items}


def _validate_subtype(subtype: str) -> None:
    if not subtype or not isinstance(subtype, str):
        raise ValueError("subtype must be a non-empty string")
