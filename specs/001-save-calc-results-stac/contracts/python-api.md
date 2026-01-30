# Python API Contract: Save Analysis Results to STAC

## Module: debrief_stac.results

### create_result()

Creates a new STAC Item for a calc tool result with provenance links.

```python
def create_result(
    catalog_path: str,
    result_id: str,
    features: list[dict],
    tool_name: str,
    tool_version: str,
    execution_time: str,
    duration_ms: float,
    parameters: dict,
    source_item_ids: list[str],
    title: str | None = None,
) -> str:
    """
    Create a STAC Item for a calc tool result.

    Args:
        catalog_path: Path to the STAC catalog directory
        result_id: Unique ID for the result (execution ID)
        features: GeoJSON features with provenance metadata
        tool_name: Name of the tool that produced the result
        tool_version: Version of the tool
        execution_time: ISO 8601 timestamp of execution
        duration_ms: Execution duration in milliseconds
        parameters: Tool parameters used
        source_item_ids: IDs of source STAC Items (for derived_from links)
        title: Optional display title (auto-generated if not provided)

    Returns:
        Path to the created item.json file

    Raises:
        FileNotFoundError: If catalog_path does not exist
        ValueError: If result_id is empty or source_item_ids is empty
        FileExistsError: If item with result_id already exists (idempotency)
    """
```

### result_exists()

Checks whether a result item already exists in the catalog.

```python
def result_exists(catalog_path: str, result_id: str) -> bool:
    """
    Check if a result item exists in the catalog.

    Args:
        catalog_path: Path to the STAC catalog directory
        result_id: ID to check

    Returns:
        True if item exists, False otherwise
    """
```

## Module: debrief_stac.mcp.server

### MCP Tool: save_result

```json
{
  "name": "save_result",
  "description": "Save a calc tool result as a STAC Item with provenance links",
  "inputSchema": {
    "type": "object",
    "properties": {
      "catalog_path": { "type": "string", "description": "Path to STAC catalog" },
      "result_id": { "type": "string", "description": "Unique result ID (execution ID)" },
      "features": { "type": "array", "description": "GeoJSON features with provenance" },
      "tool_name": { "type": "string" },
      "tool_version": { "type": "string" },
      "execution_time": { "type": "string", "format": "date-time" },
      "duration_ms": { "type": "number" },
      "parameters": { "type": "object" },
      "source_item_ids": { "type": "array", "items": { "type": "string" } },
      "title": { "type": "string" }
    },
    "required": ["catalog_path", "result_id", "features", "tool_name", "tool_version", "execution_time", "duration_ms", "parameters", "source_item_ids"]
  }
}
```

**Success response:**
```json
{
  "success": true,
  "item_path": "/path/to/result-id/item.json",
  "already_exists": false
}
```

**Idempotent response (already saved):**
```json
{
  "success": true,
  "item_path": "/path/to/result-id/item.json",
  "already_exists": true
}
```

**Error response:**
```json
{
  "success": false,
  "error": "Catalog not found at /path/to/catalog"
}
```
