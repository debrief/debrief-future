"""
Provenance writing for debrief-stac features.

Records lineage information in feature properties to enable traceability
per Constitution III.1 (Provenance always).
"""

from datetime import UTC, datetime


def write_provenance(
    feature: dict,
    tool: str,
    version: str,
    source_feature_ids: list[str],
    parameters: dict | None = None,
) -> dict:
    """Write provenance metadata to a feature's properties.

    Sets properties.prov with tool, version, timestamp, and source references.

    Args:
        feature: GeoJSON Feature dict (modified in-place)
        tool: Tool identifier
        version: Tool version
        source_feature_ids: IDs of input features
        parameters: Optional tool parameters

    Returns:
        The feature dict with properties.prov populated
    """
    if "properties" not in feature:
        feature["properties"] = {}

    feature["properties"]["prov"] = {
        "tool": tool,
        "version": version,
        "timestamp": datetime.now(UTC).isoformat(),
        "sources": [
            {"id": fid, "kind": "feature"} for fid in source_feature_ids
        ],
        "parameters": parameters or {},
    }

    return feature
