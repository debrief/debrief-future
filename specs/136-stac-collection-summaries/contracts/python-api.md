# Python API Contract: Collection Summaries

## New Functions

### `update_collection_summaries(path, item_data, operation)`

Updates the Collection summaries incrementally after an item mutation.

**Parameters**:
- `path: CatalogPath` — Path to the catalog directory
- `item_data: STACItem` — The item that was added/modified
- `operation: Literal["add", "update"]` — Type of mutation

**Behaviour**:
1. Opens catalog.json
2. If `type == "Catalog"`: promotes to Collection with full scan of all items
3. If `type == "Collection"`: merges item's properties into existing summaries
4. Saves updated catalog.json

### `rebuild_collection_summaries(path)`

Full recomputation of Collection summaries from all items. Used after deletions and for initial promotion.

**Parameters**:
- `path: CatalogPath` — Path to the catalog directory

**Behaviour**:
1. Opens catalog.json
2. Scans all `rel: "item"` links
3. Reads each item.json
4. Computes extent (bbox union, temporal range) and summaries (distinct property values)
5. Writes updated catalog.json as Collection

### `read_collection_summaries(path)`

Reads the Collection summaries without loading individual items.

**Parameters**:
- `path: CatalogPath` — Path to the catalog directory

**Returns**: `CollectionSummaries | None` — None if catalog hasn't been promoted yet

## Modified Functions

### `create_plot()` — Add summary update hook

After creating the item and updating catalog links, call `update_collection_summaries(path, item_data, "add")`.

### `add_features()` — Add summary update hook

After updating the item's bbox and properties, call `update_collection_summaries(path, item_data, "update")`.

### `update_features()` — Add summary update hook

After updating features and bbox, call `update_collection_summaries(path, item_data, "update")`.

### `delete_features()` — Add rebuild hook (conditional)

After deleting features, if the item's bbox or extension properties changed, call `rebuild_collection_summaries(path)`.

## New Type

### `STACCollection`

```python
STACCollection: TypeAlias = dict[str, Any]
```

Note: Follows existing pattern of using `dict[str, Any]` type aliases. The `Any` usage is at the JSON boundary where STAC data enters the system — consistent with existing `STACCatalog` and `STACItem` type aliases that also use `dict[str, Any]`.

## New Pydantic Model

### `CollectionSummaries`

```python
class CollectionSummaries(BaseModel):
    vessel_classes: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    feature_tags: list[str] = Field(default_factory=list)
    track_names: list[str] = Field(default_factory=list)
    nationalities: list[str] = Field(default_factory=list)
    bbox: list[float] | None = None
    temporal_start: str | None = None
    temporal_end: str | None = None
```
