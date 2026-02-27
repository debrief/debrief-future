"""
Provenance tracking for debrief-calc.

Provides functions to create and attach PROV-aligned Log entries
to tool output features, ensuring full traceability per Constitution III.1.

The Log entry format follows W3C PROV vocabulary:
- wasGeneratedBy: tool identity and parameters
- used: input feature IDs
- generated: output feature IDs or asset paths
- activityId: shared UUID across all features in one operation
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from debrief_calc.models import LogEntry, ParameterValue, Provenance, SourceRef, WasGeneratedBy


def _duration_ms_to_iso8601(duration_ms: float) -> str:
    """Convert milliseconds to ISO 8601 duration string (e.g., PT0.3S)."""
    seconds = duration_ms / 1000.0
    if seconds == int(seconds):
        return f"PT{int(seconds)}S"
    # Use fixed-point notation to avoid scientific notation (e.g., PT7e-05S)
    # Strip trailing zeros for cleaner output
    formatted = f"{seconds:.6f}".rstrip("0").rstrip(".")
    return f"PT{formatted}S"


def create_log_entry(
    tool_name: str,
    tool_version: str,
    source_features: list[dict[str, Any]],
    parameters: dict[str, Any] | None = None,
    duration_ms: float = 0.0,
    generated: list[str] | None = None,
    generated_result_id: str | None = None,
    timestamp: datetime | None = None,
    activity_id: str | None = None,
) -> LogEntry:
    """
    Create a PROV-aligned LogEntry from tool execution context.

    Args:
        tool_name: Name of the tool that produced the output
        tool_version: Version of the tool
        source_features: List of input GeoJSON features
        parameters: Optional parameters passed to the tool (flat dict)
        duration_ms: Execution duration in milliseconds
        generated: Optional list of output feature IDs or asset paths
        generated_result_id: Optional stable result ID for artifact tools
        timestamp: Optional execution timestamp (defaults to UTC now)
        activity_id: Optional activity ID (defaults to UUID v4)

    Returns:
        LogEntry instance ready to be attached to features
    """
    # Extract feature IDs from source features
    used = []
    for feature in source_features:
        feature_id = feature.get("id", "unknown")
        used.append(str(feature_id))

    # Convert flat parameters dict to ParameterValue dict
    typed_params: dict[str, ParameterValue] = {}
    if parameters:
        for key, val in parameters.items():
            if isinstance(val, ParameterValue):
                typed_params[key] = val
            else:
                typed_params[key] = ParameterValue(value=val)

    return LogEntry(
        activityId=activity_id or str(uuid.uuid4()),
        timestamp=timestamp or datetime.now(UTC),
        wasGeneratedBy=WasGeneratedBy(
            tool=tool_name,
            toolVersion=tool_version,
            parameters=typed_params,
        ),
        used=used,
        generated=generated or [],
        executionDuration=_duration_ms_to_iso8601(duration_ms),
        generatedResultId=generated_result_id,
        tune=None,
    )


def attach_log_entry(
    feature: dict[str, Any],
    log_entry: LogEntry,
) -> dict[str, Any]:
    """
    Attach a PROV-aligned Log entry to a GeoJSON feature.

    Appends the entry to feature.properties.provenance as an array.
    Creates the array if it doesn't exist. Wraps legacy single-object
    provenance in an array if encountered.

    Args:
        feature: GeoJSON Feature dictionary
        log_entry: LogEntry instance to attach

    Returns:
        The modified feature with log entry appended to provenance array
    """
    if "properties" not in feature:
        feature["properties"] = {}

    # Serialize using Pydantic with camelCase aliases
    entry_dict = log_entry.model_dump(mode="json", by_alias=True)

    existing = feature["properties"].get("provenance")

    if existing is None:
        # No provenance yet — start a new array
        feature["properties"]["provenance"] = [entry_dict]
    elif isinstance(existing, list):
        # Already an array — append
        existing.append(entry_dict)
    elif isinstance(existing, dict):
        # Legacy single-object format — wrap in array, then append new entry
        feature["properties"]["provenance"] = [existing, entry_dict]

    return feature


# --- Deprecated functions (kept for backward compatibility) ---


def create_provenance(
    tool_name: str,
    tool_version: str,
    source_features: list[dict[str, Any]],
    parameters: dict[str, Any] | None = None,
    timestamp: datetime | None = None,
) -> Provenance:
    """
    Deprecated: Use create_log_entry() instead.

    Create a Provenance instance from tool execution context.
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
        timestamp=timestamp or datetime.now(UTC),
        sources=sources,
        parameters=parameters or {},
    )


def attach_provenance(feature: dict[str, Any], provenance: Provenance) -> dict[str, Any]:
    """
    Deprecated: Use attach_log_entry() instead.

    Attach provenance information to a GeoJSON feature.
    """
    if "properties" not in feature:
        feature["properties"] = {}

    feature["properties"]["provenance"] = {
        "tool": provenance.tool,
        "version": provenance.version,
        "timestamp": provenance.timestamp.isoformat() + "Z",
        "sources": [{"id": s.id, "kind": s.kind} for s in provenance.sources],
        "parameters": provenance.parameters,
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
