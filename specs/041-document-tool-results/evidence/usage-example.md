# Usage Example: Tool Results Architecture (#041)

## Building a Tool Response (Python)

```python
from debrief_calc.result_types import ResultTopType, ResultTypePath
from debrief_calc.result_builder import (
    build_mutation, build_addition, build_deletion,
    build_artifact, build_error, build_response,
)

# 1. Mutation: smoothed track
smoothed = {"type": "Feature", "id": "track_a", "geometry": {...}, "properties": {...}}
mutation_items = build_mutation(
    features=[smoothed],
    result_subtype="track/smoothed",
    source_feature_ids=["track_a"],
    label="Smoothed Track A",
)
response = build_response(mutation_items)
# response = {"content": [{"type": "resource", "resource": {...}, "annotations": {...}}]}

# 2. Addition: CPA point
cpa = {"type": "Feature", "id": "cpa_001", "geometry": {...}, "properties": {...}}
addition_items = build_addition(
    features=[cpa],
    result_subtype="analysis/cpa_point",
    source_feature_ids=["track_a", "track_b"],
    label="CPA between tracks",
)

# 3. Multi-result: deletion + artifact
deletion_item = build_deletion(
    deleted_feature_ids=["c1", "c2", "c3"],
    result_subtype="sensor",
    source_feature_ids=["track_a"],
    label="Removed outlier contacts",
)
artifact_item = build_artifact(
    data=b"report content",
    mime_type="application/json",
    result_subtype="report/outlier_summary",
    source_feature_ids=["track_a"],
    label="Outlier analysis report",
    href="./results/outlier_report.json",
)
multi_response = build_response([deletion_item, artifact_item])
# Two content items processed sequentially by orchestrator
```

## Persisting Results (Python)

```python
from debrief_stac.features import add_features, update_features, delete_features
from debrief_stac.artifacts import store_artifact
from debrief_stac.provenance import write_provenance

# Update features (mutation)
write_provenance(smoothed, "track-smoother", "1.0.0", ["track_a"])
count = update_features("/data/catalog", "plot_001", [smoothed])

# Add features (addition)
write_provenance(cpa, "cpa-calculator", "1.0.0", ["track_a", "track_b"])
count = add_features("/data/catalog", "plot_001", [cpa])

# Delete features
count = delete_features("/data/catalog", "plot_001", ["c1", "c2", "c3"])

# Store artifact
item = store_artifact(
    "/data/catalog", "plot_001",
    b"report content", "./results/report.json",
    "application/json", "Outlier report",
)
```

## Diffing FeatureCollections (TypeScript)

```typescript
import { diffFeatureCollections, matchesResultType, getTopLevelType } from "@debrief/diff";

// After each atomic STAC operation, diff old and new FC
const diff = diffFeatureCollections(oldFC, newFC);
console.log(`Added: ${diff.added.length}, Removed: ${diff.removed.length}, Modified: ${diff.modified.length}`);

// Type degradation
const typePath = "artifact/report/ssa_assessment";
matchesResultType(typePath, "artifact");         // true — generic consumer
matchesResultType(typePath, "artifact/report");   // true — report viewer
getTopLevelType(typePath);                        // "artifact"
```
