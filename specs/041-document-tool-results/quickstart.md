# Quickstart: Tool Results Architecture

## Prerequisites

- Python 3.11+ with uv
- Node.js 18+ with pnpm
- Existing debrief-calc and debrief-stac services set up

## Schema: Define Result Types

1. The result type schema lives in `shared/schemas/src/linkml/tool-result.yaml`
2. Generate Python and TypeScript types:

```bash
cd shared/schemas
uv run gen-pydantic src/linkml/tool-result.yaml > generated/python/tool_result.py
uv run gen-json-schema src/linkml/tool-result.yaml > generated/json-schema/tool-result.json
```

3. Run schema adherence tests:

```bash
uv run pytest tests/test_tool_result_schema.py -v
```

## Tool Response: Build Annotated Results

Tools use the result builder to construct MCP-compliant responses:

```python
from debrief_calc.result_builder import build_mutation, build_addition, build_artifact

# Mutation example
response = build_mutation(
    features=[smoothed_track],
    result_subtype="track/smoothed",
    source_feature_ids=["track_a"],
    label="Smoothed Track A",
)

# Addition example
response = build_addition(
    features=[cpa_point],
    result_subtype="analysis/cpa_point",
    source_feature_ids=["track_a", "track_b"],
    label="CPA between Track A and Track B",
)
```

Run tool response tests:

```bash
cd services/calc
uv run pytest tests/test_result_builder.py -v
```

## Persistence: Atomic STAC Operations

After a tool returns a result, the orchestrator iterates the content array and calls the appropriate atomic STAC operation for each content item. debrief-stac has no knowledge of result types — the orchestrator interprets them.

```python
from debrief_stac.features import update_features, add_features, delete_features
from debrief_stac.artifacts import store_artifact

# For mutations — update existing features
count = update_features("/data/catalog", "plot_001", [modified_feature])

# For additions — append new features
count = add_features("/data/catalog", "plot_001", [new_feature])

# For deletions — remove features by ID
count = delete_features("/data/catalog", "plot_001", ["contact_001", "contact_002"])

# For artifacts — write file and update item.json
item = store_artifact("/data/catalog", "plot_001", data, "./results/report.json", "application/json", "Outlier report")
```

Run persistence tests:

```bash
cd services/stac
uv run pytest tests/test_features.py tests/test_artifacts.py tests/test_provenance.py -v
```

## Diff: Compare FeatureCollections

After persistence, diff the old and new FeatureCollections:

```typescript
import { diffFeatureCollections } from "@debrief/diff";

const diff = diffFeatureCollections(oldFC, newFC);
// diff.added    → Feature[]
// diff.removed  → string[] (feature IDs)
// diff.modified → { id: string, feature: Feature }[]
```

Run diff tests:

```bash
cd shared/components/diff
pnpm test
```

## Verify End-to-End

1. Invoke a tool via MCP → verify response has content array with annotations
2. For each content item, call appropriate atomic STAC operation → verify FeatureCollection updated
3. Diff old and new FC after each operation → verify correct changes reported incrementally
4. Check `properties.prov` on affected features → verify provenance recorded
5. For artifacts: check `results/` directory and `item.json` assets
6. For multi-result responses: verify each content item processed sequentially in array order
