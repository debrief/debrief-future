# Usage Example: update_temporal_metadata()

## Python Service Usage

```python
from debrief_stac.catalog import create_catalog
from debrief_stac.features import add_features
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot, update_temporal_metadata

# Create catalog and plot
catalog_path = create_catalog("/data/exercises")
metadata = PlotMetadata(title="Exercise Alpha")
plot_id = create_plot(catalog_path, metadata)

# Add track features with temporal data
tracks = [
    {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": [[-5.0, 50.0], [-4.0, 50.5]]},
        "properties": {
            "name": "Track Alpha",
            "kind": "TRACK",
            "start_time": "2022-08-27T09:00:00Z",
            "end_time": "2022-09-01T12:00:00Z",
        },
    },
    {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": [[-3.0, 51.0], [-2.5, 51.2]]},
        "properties": {
            "name": "Track Bravo",
            "kind": "TRACK",
            "start_time": "2022-08-30T06:00:00Z",
            "end_time": "2022-09-10T16:44:49Z",
        },
    },
]
add_features(catalog_path, plot_id, tracks)

# Compute and set temporal metadata
result = update_temporal_metadata(catalog_path, plot_id)

if result:
    print(f"Exercise start: {result.datetime}")
    print(f"Temporal extent: {result.start_datetime} to {result.end_datetime}")
else:
    print("No temporal data found in tracks")

# Verify on the STAC Item
item = read_plot(catalog_path, plot_id)
print(f"Item datetime: {item['properties']['datetime']}")
print(f"Item start: {item['properties']['start_datetime']}")
print(f"Item end: {item['properties']['end_datetime']}")
```

### Output

```
Exercise start: 2022-08-27T09:00:00Z
Temporal extent: 2022-08-27T09:00:00Z to 2022-09-10T16:44:49Z
Item datetime: 2022-08-27T09:00:00Z
Item start: 2022-08-27T09:00:00Z
Item end: 2022-09-10T16:44:49Z
```

## MCP Tool Usage

```json
{
  "tool": "update_temporal_metadata",
  "arguments": {
    "catalog_path": "/data/exercises",
    "plot_id": "exercise-alpha"
  }
}
```

### Response (tracks with temporal data)

```json
{
  "datetime": "2022-08-27T09:00:00Z",
  "start_datetime": "2022-08-27T09:00:00Z",
  "end_datetime": "2022-09-10T16:44:49Z",
  "plot_id": "exercise-alpha"
}
```

### Response (no temporal data)

```json
{
  "message": "No temporal data found",
  "plot_id": "exercise-alpha"
}
```
