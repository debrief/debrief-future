# Round-trip evidence — one representative class per cluster group

Demonstrates the FR-006 round-trip property (Python → JSON → Python
preserves all fields) for one named class per priority slice. The
TS half is verified by the matching `pnpm -r typecheck` run plus the
generated types under `shared/schemas/src/generated/typescript/types.ts`
being structurally identical to the Pydantic model_json_schema (per
`shared/schemas/tests/test_mcp_roundtrip.py::test_envelope_schema_comparison`
and the related discovery/replay assertions).

Captured at git `fc4b5f6` on 2026-05-13T06:19:26Z.

---

## P1 — Envelope: `MCPToolResponse`

### Source fixture: `shared/schemas/fixtures/mcp/MCPToolResponse/valid/mixed-content.json`

```json
{
  "content": [
    {
      "type": "text",
      "text": "Computed 1 result.",
      "annotations": {
        "debrief:resultType": "artifact/text",
        "debrief:label": "Summary",
        "debrief:sourceFeatures": ["track-1"]
      }
    },
    {
      "type": "resource",
      "resource": {
        "uri": "debrief://tool-result/track-length/12345",
        "mimeType": "application/geo+json",
        "text": "{\"type\":\"FeatureCollection\",\"features\":[]}"
      },
      "annotations": {
        "debrief:resultType": "addition/geojson",
        "debrief:label": "Track-length result",
        "debrief:sourceFeatures": ["track-1"]
      }
    }
  ],
  "duration_ms": 42
}
```

### Python round-trip

```python
>>> from debrief_schemas import MCPToolResponse
>>> import json
>>> raw = json.load(open("shared/schemas/fixtures/mcp/MCPToolResponse/valid/mixed-content.json"))
>>> instance = MCPToolResponse.model_validate(raw)
>>> dumped = instance.model_dump(exclude_unset=True)
>>> assert MCPToolResponse.model_validate(dumped).model_dump(exclude_unset=True) == dumped
>>> # Every original field survives the round-trip:
>>> for k, v in raw.items():
...     assert k in dumped and dumped[k] == v
>>> # ✅ no AssertionError raised
```

### TS half — generated interface (`shared/schemas/src/generated/typescript/types.ts`)

```ts
export interface MCPToolResponse {
    content: MCPContentItem[],
    duration_ms: number,
    is_error?: boolean,
    structured_content?: unknown,
}
```

The TS interface has the same required set (`content`, `duration_ms`)
as the Pydantic model_json_schema, validated by
`test_envelope_schema_comparison` (passes).

---

## P2 — Discovery: `MCPParamSchema` (with recursive `items` would-be)

### Source fixture: `shared/schemas/fixtures/mcp/MCPParamSchema/valid/simple.json`

```json
{
  "type": "string",
  "description": "Free-form text parameter."
}
```

### Python round-trip

```python
>>> from debrief_schemas import MCPParamSchema
>>> raw = {"type": "string", "description": "Free-form text parameter."}
>>> instance = MCPParamSchema.model_validate(raw)
>>> dumped = instance.model_dump(exclude_unset=True)
>>> dumped == raw
True
```

### TS half — generated interface

```ts
export interface MCPParamSchema {
    type?: string,
    description?: string,
}
```

The data-model originally proposed a recursive `items: MCPParamSchema`
slot, but the actual consumer shapes use a wider JSON-Schema-like
fragment (enum, default, x-debrief-param-type) that is narrowed at the
consumer site via intersection. Recursive items would be supported as
an additive widening when a future tool needs it — the spec records
this as an open follow-up.

---

## P3 — Replay: `ToolResultForLog`

### Source fixture: `shared/schemas/fixtures/mcp/ToolResultForLog/valid/success.json`

```json
{
  "success": true,
  "duration_ms": 42,
  "tool_id": "track-length",
  "result_type": "artifact/text",
  "source_feature_ids": ["track-1"],
  "features": {
    "type": "FeatureCollection",
    "features": []
  }
}
```

### Python round-trip

```python
>>> from debrief_schemas import ToolResultForLog
>>> raw = json.load(open("shared/schemas/fixtures/mcp/ToolResultForLog/valid/success.json"))
>>> instance = ToolResultForLog.model_validate(raw)
>>> dumped = instance.model_dump(exclude_unset=True)
>>> assert ToolResultForLog.model_validate(dumped).model_dump(exclude_unset=True) == dumped
>>> assert all(dumped[k] == v for k, v in raw.items())
>>> # ✅ slot names, multivalued list, and free-form `features` all preserved
```

### TS half — generated interface

```ts
export interface ToolResultForLog {
    success: boolean,
    features?: unknown,
    duration_ms: number,
    result_type?: string,
    source_feature_ids?: string[],
    artifact_href?: string,
    tool_id?: string,
    input_state?: unknown[],
}
```

The consumer site at `services/session-state/src/log/types.ts:97`
narrows `features` to `{ type: 'FeatureCollection'; features: unknown[] }`
and `input_state` to `InputFeatureState[]` (the inner shape is owned
by #224 session-state) via the same `Omit`-and-intersection pattern.

---

## Aggregate verification

All 54 MCP-cluster pytest tests pass:

```text
$ uv run pytest shared/schemas/tests/test_mcp_roundtrip.py shared/schemas/tests/test_mcp_fixtures.py shared/schemas/tests/test_mcp_log_fixture_compat.py -v
…
======================== 54 passed, 1 skipped, 1 warning in 0.42s ========================
```
