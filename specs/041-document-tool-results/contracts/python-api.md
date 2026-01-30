# Python API Contract: Tool Results Architecture

**Feature**: #041 Tool Results Architecture
**Date**: 2026-01-30

## debrief-calc: Result Type Classification

### `result_types.py`

```python
class ResultTopType(str, Enum):
    """Four permitted top-level result types."""
    MUTATION = "mutation"
    ADDITION = "addition"
    DELETION = "deletion"
    ARTIFACT = "artifact"


class ResultTypePath:
    """
    Hierarchical result type path.

    Examples:
        ResultTypePath("mutation/track/smoothed")
        ResultTypePath("artifact/image/bearing_time_plot")
    """

    def __init__(self, path: str) -> None: ...

    @property
    def top_level(self) -> ResultTopType: ...

    @property
    def segments(self) -> list[str]: ...

    def matches(self, prefix: str) -> bool:
        """Check if this type path starts with the given prefix.

        Args:
            prefix: Type path prefix (e.g., "mutation/track")

        Returns:
            True if this path starts with prefix

        Examples:
            >>> ResultTypePath("mutation/track/smoothed").matches("mutation")
            True
            >>> ResultTypePath("mutation/track/smoothed").matches("mutation/track")
            True
            >>> ResultTypePath("mutation/track/smoothed").matches("addition")
            False
        """
        ...
```

### `result_builder.py`

```python
def build_response(
    content_items: list[dict],
) -> dict:
    """Build an MCP tool response containing one or more content items.

    Args:
        content_items: List of content dicts (from build_mutation, build_addition, etc.)

    Returns:
        MCP response dict with content array

    Raises:
        ValueError: If content_items is empty
    """
    ...


def build_mutation(
    features: list[dict],
    result_subtype: str,
    source_feature_ids: list[str],
    label: str,
) -> list[dict]:
    """Build MCP ResourceContent responses for mutation results.

    Args:
        features: Modified GeoJSON features
        result_subtype: Sub-type path after "mutation/" (e.g., "track/smoothed")
        source_feature_ids: IDs of input features
        label: Human-readable result description

    Returns:
        List of MCP ResourceContent dicts with annotations

    Raises:
        ValueError: If features is empty or subtype is invalid
    """
    ...


def build_addition(
    features: list[dict],
    result_subtype: str,
    source_feature_ids: list[str],
    label: str,
) -> list[dict]:
    """Build MCP ResourceContent responses for addition results.

    Same signature as build_mutation but with "addition/" prefix.
    """
    ...


def build_deletion(
    deleted_feature_ids: list[str],
    result_subtype: str,
    source_feature_ids: list[str],
    label: str,
) -> dict:
    """Build MCP TextContent response for deletion results.

    Args:
        deleted_feature_ids: IDs of features to delete
        result_subtype: Sub-type path after "deletion/" (e.g., "sensor")
        source_feature_ids: IDs of input features
        label: Human-readable result description

    Returns:
        MCP TextContent dict with annotations including debrief:deletedFeatures
    """
    ...


def build_artifact(
    data: bytes,
    mime_type: str,
    result_subtype: str,
    source_feature_ids: list[str],
    label: str,
    href: str,
) -> dict:
    """Build MCP ImageContent or ResourceContent response for artifact results.

    Args:
        data: Raw artifact data
        mime_type: MIME type (e.g., "image/png")
        result_subtype: Sub-type path after "artifact/" (e.g., "image/bearing_time_plot")
        source_feature_ids: IDs of input features
        label: Human-readable result description
        href: Relative file path for persistence (e.g., "./results/bt_plot_001.png")

    Returns:
        MCP content dict with annotations including debrief:href
    """
    ...


def build_error(
    message: str,
    category: str,
    affected_feature_ids: list[str],
    code: int = -32000,
) -> dict:
    """Build MCP error response with Debrief metadata.

    Args:
        message: Human-readable error description
        category: One of "invalid_input", "algorithm_failure", "resource_not_found"
        affected_feature_ids: Feature IDs related to the error
        code: MCP error code (default -32000)

    Returns:
        MCP error dict with debrief:errorCategory and debrief:affectedFeatures

    Raises:
        ValueError: If category is not one of the valid categories
    """
    ...
```

## debrief-stac: Atomic Storage Operations

debrief-stac exposes simple, storage-focused operations with no knowledge of result types. The orchestrator (frontend/LLM) is responsible for interpreting result types and calling the appropriate operation.

### `features.py` (additions to existing module)

```python
def update_features(
    catalog_path: str | Path,
    plot_id: str,
    features: list[dict],
) -> int:
    """Update existing features in-place in a plot's FeatureCollection.

    Matches features by ID and replaces them. Features not found are ignored.
    Updates bbox after modifications.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot
        features: Updated GeoJSON Feature dicts (must have matching IDs)

    Returns:
        Number of features successfully updated

    Raises:
        PlotNotFoundError: If the plot doesn't exist
        ValueError: If features are invalid GeoJSON
    """
    ...


def delete_features(
    catalog_path: str | Path,
    plot_id: str,
    feature_ids: list[str],
) -> int:
    """Remove features from a plot's FeatureCollection by ID.

    Removes features with matching IDs. IDs not found are ignored.
    Updates bbox after removals.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot
        feature_ids: IDs of features to remove

    Returns:
        Number of features actually removed

    Raises:
        PlotNotFoundError: If the plot doesn't exist
    """
    ...
```

### `artifacts.py`

```python
def store_artifact(
    catalog_path: str | Path,
    plot_id: str,
    artifact_data: bytes,
    href: str,
    mime_type: str,
    label: str,
) -> dict:
    """Write an artifact file to the results/ directory and update item.json.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot
        artifact_data: Raw artifact bytes
        href: Relative file path (e.g., "./results/bt_plot_001.png")
        mime_type: MIME type of the artifact
        label: Human-readable label for the asset entry

    Returns:
        Updated STAC Item dict with new asset entry

    Raises:
        PlotNotFoundError: If the plot doesn't exist
        ValueError: If href doesn't start with "./results/"
    """
    ...
```

### `provenance.py`

```python
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
    ...
```
