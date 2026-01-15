"""
Provenance tracking for debrief-calc.

Provides functions to create and attach provenance information
to tool output features, ensuring full traceability per Constitution III.1.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from debrief_calc.models import Provenance, SourceRef


def create_provenance(
    tool_name: str,
    tool_version: str,
    source_features: list[dict[str, Any]],
    parameters: dict[str, Any] | None = None,
    timestamp: datetime | None = None
) -> Provenance:
    """
    Create a Provenance instance from tool execution context.

    Args:
        tool_name: Name of the tool that produced the output
        tool_version: Version of the tool
        source_features: List of input GeoJSON features
        parameters: Optional parameters passed to the tool
        timestamp: Optional execution timestamp (defaults to now)

    Returns:
        Provenance instance with source references extracted from features
    """
    sources = []
    for feature in source_features:
        feature_id = feature.get("id", "unknown")
        props = feature.get("properties", {})
        kind = props.get("kind", "unknown")
        sources.append(SourceRef(id=str(feature_id), kind=kind))

    return Provenance(
        tool=tool_name,
        version=tool_version,
        timestamp=timestamp or datetime.utcnow(),
        sources=sources,
        parameters=parameters or {}
    )


def attach_provenance(
    feature: dict[str, Any],
    provenance: Provenance
) -> dict[str, Any]:
    """
    Attach provenance information to a GeoJSON feature.

    Modifies the feature in place and also returns it for chaining.
    The provenance is stored in feature.properties.provenance.

    Args:
        feature: GeoJSON Feature dictionary
        provenance: Provenance instance to attach

    Returns:
        The modified feature with provenance attached
    """
    if "properties" not in feature:
        feature["properties"] = {}

    feature["properties"]["provenance"] = {
        "tool": provenance.tool,
        "version": provenance.version,
        "timestamp": provenance.timestamp.isoformat() + "Z",
        "sources": [{"id": s.id, "kind": s.kind} for s in provenance.sources],
        "parameters": provenance.parameters
    }

    return feature


def set_output_kind(feature: dict[str, Any], kind: str) -> dict[str, Any]:
    """
    Set the kind attribute on a feature's properties.

    Args:
        feature: GeoJSON Feature dictionary
        kind: The kind value to set

    Returns:
        The modified feature
    """
    if "properties" not in feature:
        feature["properties"] = {}

    feature["properties"]["kind"] = kind
    return feature
