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

## Persistence: Store Results via debrief-stac

After a tool returns a result, the orchestrator sends it to debrief-stac:

```python
from debrief_stac.results import persist_result

updated_fc = persist_result(
    catalog_path="/data/catalog",
    plot_id="plot_001",
    result=tool_response,  # MCP-compliant result from debrief-calc
)
```

Run persistence tests:

```bash
cd services/stac
uv run pytest tests/test_results.py -v
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

1. Invoke a tool via MCP → verify response has annotations
2. Send result to debrief-stac → verify FeatureCollection updated
3. Diff old and new FC → verify correct changes reported
4. Check `properties.prov` on affected features → verify provenance recorded
5. For artifacts: check `results/` directory and `item.json` assets
