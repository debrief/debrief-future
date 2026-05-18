# Usage example: adding a field to `MCPToolResponse`

This demonstrates the canonical "single source of truth" workflow that
spec 222 delivers — edit the LinkML source once, and the field appears
simultaneously in Pydantic, TypeScript, and JSON Schema.

**Matches User Story 1 / Acceptance Scenario 1.**

## Before

`shared/schemas/src/linkml/mcp.yaml`:

```yaml
MCPToolResponse:
  description: Successful MCP tool response.
  attributes:
    content:
      range: MCPContentItem
      multivalued: true
      required: true
    duration_ms:
      range: integer
      required: true
    is_error:
      range: boolean
    structured_content:
      range: Any
```

## Step 1 — Add a slot to the LinkML class

```diff
   MCPToolResponse:
     description: Successful MCP tool response.
     attributes:
       content:
         range: MCPContentItem
         multivalued: true
         required: true
       duration_ms:
         range: integer
         required: true
       is_error:
         range: boolean
       structured_content:
         range: Any
+      partial:
+        description: True for streaming chunk envelopes (mid-tool progress).
+        range: boolean
```

## Step 2 — Re-run the schema build

```sh
$ cd shared/schemas && uv run python scripts/generate.py
Generating Pydantic models...
  [OK] Generated: src/generated/python/debrief_schemas/__init__.py
Generating JSON Schema...
  [OK] Generated: src/generated/json-schema/debrief.schema.json
  (+ per-entity files)
Generating TypeScript interfaces...
  [OK] Generated: src/generated/typescript/types.ts
  [OK] Generated: src/generated/typescript/index.ts

[OK] Generation complete
```

Total runtime ≈ 7 seconds (well within the 20% NFR-001 budget over
the 6.65s pre-feature baseline).

## Step 3 — Observe the field in Python

`shared/schemas/src/generated/python/debrief_schemas/__init__.py`:

```python
class MCPToolResponse(ConfiguredBaseModel):
    """Successful MCP tool response."""
    content: list[MCPContentItem] = Field(default=..., ...)
    duration_ms: int = Field(default=..., ...)
    is_error: Optional[bool] = Field(default=None, ...)
    structured_content: Optional[dict[str, object]] = Field(default=None, ...)
    partial: Optional[bool] = Field(
        default=None,
        description="""True for streaming chunk envelopes (mid-tool progress).""",
        ...
    )
```

## Step 4 — Observe the field in TypeScript

`shared/schemas/src/generated/typescript/types.ts`:

```ts
export interface MCPToolResponse {
    content: MCPContentItem[],
    duration_ms: number,
    is_error?: boolean,
    structured_content?: unknown,
    /** True for streaming chunk envelopes (mid-tool progress). */
    partial?: boolean,
}
```

## Step 5 — Observe the field in the JSON Schema

`shared/schemas/src/generated/json-schema/debrief.schema.json`:

```json
"MCPToolResponse": {
  "type": "object",
  "required": ["content", "duration_ms"],
  "properties": {
    "content": { ... },
    "duration_ms": { "type": "integer" },
    "is_error": { "type": "boolean" },
    "structured_content": { ... },
    "partial": {
      "type": "boolean",
      "description": "True for streaming chunk envelopes (mid-tool progress)."
    }
  }
}
```

## Step 6 — Existing consumers pick it up automatically

Both halves of every site that imports `MCPToolResponse` from
`@debrief/schemas` / `debrief_schemas` — including
`shared/utils/src/mcp-types.ts` (consumer-narrowed projection),
`services/session-state/src/log/types.ts`, the VS Code calcService,
the web-shell toolService — now type-check against the new
`partial` field with no further edits.

Adding a new field to the wire format takes **a single LinkML edit**.
Pre-feature, the same change required hand-editing every cross-domain
declaration site by hand (~16 files for this cluster) and there was no
type-level guarantee that Python and TypeScript stayed aligned.

## Cleanup (this example is for illustration only)

```sh
git checkout -- shared/schemas/src/linkml/mcp.yaml
cd shared/schemas && uv run python scripts/generate.py
```
