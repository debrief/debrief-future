# Contract: expected generated JSON Schema artefacts

**Feature**: 222-linkml-mcp-envelopes
**Generator**: `gen-json-schema` from `shared/schemas/src/linkml/mcp.yaml`
**Output path**: `shared/schemas/src/generated/json-schema/mcp.schema.json`

Acceptance contract for the JSON Schema artefacts produced by the
schema build. The round-trip / schema-comparison test (FR-006 /
`shared/schemas/tests/test_mcp_roundtrip.py`) asserts each of the
following.

## File-level

- [ ] One JSON file emitted: `mcp.schema.json`.
- [ ] Top-level `$id` equals `https://debrief.info/schemas/mcp`.
- [ ] Top-level `$defs` contains exactly **15 entries** (one per class /
      permissible-values enum, excluding the 2 TS-only function aliases).

## Per-class assertions

For each class in `data-model.md`:

- [ ] An entry exists under `$defs/{ClassName}`.
- [ ] All slots marked `required: true` appear in `$defs/{ClassName}.required`.
- [ ] All `range: Any` slots produce property type `{}`;
      `additionalProperties: true`.
- [ ] All `range: <enum>` slots produce `{ "enum": [<permissible_values>] }`.
- [ ] All `multivalued: true` slots produce
      `{ "type": "array", "items": { "$ref": "#/$defs/<Range>" } }`.
- [ ] Recursive slots (e.g. `MCPParamSchema.items`) produce
      `{ "$ref": "#/$defs/MCPParamSchema" }`.

## Discriminator / `equals_string` handling

- [ ] `ToolsUpdateMessage.type` produces
      `{ "type": "string", "const": "tools:update" }`.

## Inheritance handling

- [ ] `ToolExecutionResultForReplay` produces an `allOf` referencing
      `$defs/ToolResultForLog` plus its own additional properties.

## Cross-language parity (Pydantic vs JSON Schema)

`shared/schemas/tests/test_schema_compare.py` extends to cover the
new classes:

- [ ] For each new class, the JSON Schema produced by `gen-json-schema`
      MUST match the JSON Schema produced by `BaseModel.model_json_schema()`
      on the generated Pydantic class (modulo permitted whitespace /
      ordering differences accepted by the existing helper).

## Fixture round-trip parity (FR-006)

For each class added in this feature, the fixture corpus under
`shared/schemas/tests/fixtures/mcp/<class_name>/` MUST include:

- [ ] At least one golden positive JSON fixture that validates against
      both the LinkML-derived JSON Schema and the generated Pydantic class.
- [ ] At least one negative JSON fixture that fails validation —
      asserts the failure mode is a field-level error.
- [ ] One round-trip fixture per class: Python `model_dump()` → JSON
      string → TS `JSON.parse + ajv.validate` → JSON string → Python
      `model_validate()` produces a value structurally equal to the
      original.

## Negative coverage matrix (sketch)

| Class | Negative fixture | Expected error |
|-------|------------------|----------------|
| `MCPRequest` | Unknown tool name | "`tool` is not one of [enum]" |
| `MCPRequest` | Missing `input` | "`input` is required" |
| `MCPContentItem` | Missing `type` | "`type` is required" |
| `MCPToolResponse` | Empty `content` array | (documented; covered as TODO follow-up) |
| `MCPErrorResponse` | Missing `code` | "`code` is required" |
| `MCPParamSchema` | Unknown `type` value | "`type` is not one of [enum]" |
| `MCPParamSchema` | `items` with circular ref | (round-trip survives) |
| `MCPToolDefinition` | Missing `name` | "`name` is required" |
| `ToolParameter` | Missing `param_schema` | "`param_schema` is required" |
| `ToolDefinition` | `parameters` is non-array | "`parameters` must be an array" |
| `ToolResult` | Both `output` and `error` set | (Not validated by schema — follow-up) |
| `ToolResultForLog` | Missing `timestamp` | "`timestamp` is required" |
| `ToolResultForLog` | Both `result` and `error` set | Caught by Pydantic `model_validator` |
| `ToolExecutionResultForReplay` | Missing `replay_status` | "`replay_status` is required" |
| `ToolsUpdateMessage` | `type != "tools:update"` | "`type` must equal `tools:update`" |
