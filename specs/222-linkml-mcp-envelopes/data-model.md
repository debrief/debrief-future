# Phase 1 — Data Model: MCP transport envelopes

**Feature**: 222-linkml-mcp-envelopes
**Date**: 2026-05-12
**Source file**: `shared/schemas/src/linkml/mcp.yaml` (new — created in implementation)

Enumerates every class to be added to LinkML, its fields, ranges,
multiplicity, and consumer mapping. Authoritative checklist for
FR-001 / FR-002 and the input for JSON-fixture authoring in FR-006.

Cross-references:

- **Spec FR-001** lists the named classes.
- **Spec §Edge Cases** records the boundary-loose / function-alias exceptions.
- **Research R-001** sets the `SessionMCPToolName` permissible-values pattern.

## Naming and slot conventions

- Class names match the audit's existing TS names verbatim.
- Slot names follow LinkML snake_case in YAML; the TS generator emits
  camelCase via existing project generator config.
- Optional slots use `required: false` (default); required slots are
  marked `required: true` explicitly.
- Free-form payload slots use `range: Any` with an inline comment
  pointing to spec §Edge Cases #3 and Constitution Article XV.2.

---

## Group 1 — Envelopes (P1)

### `MCPRequest`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `tool` | `SessionMCPToolName` | Yes | Discriminator. |
| `input` | `Any` | Yes | Free-form per-tool payload. Article XV.2 narrowing is the consumer's responsibility. See R-006. |

**Consumers**:
- `services/session-state/src/server/mcp.ts:23` (DELETED on migration)

### `MCPContentItem`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `type` | `MCPContentItemTypeEnum` | Yes | `text`, `resource_link`, `image`, `structured`. |
| `text` | `string` | No | Set when `type == text`. |
| `resource` | `string` | No | Set when `type == resource_link`. |
| `mime_type` | `string` | No | Set when `type in {resource_link, image}`. |
| `data` | `string` | No | Base64-encoded payload when `type == image`. |
| `structured_content` | `Any` | No | Set when `type == structured`. See R-003. |

**Consumers**:
- `shared/utils/src/mcp-types.ts:30` (DELETED)

### `MCPToolResponse`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `content` | `MCPContentItem` (multivalued, ordered) | Yes | |
| `is_error` | `boolean` | No | Defaults to `false`. |
| `structured_content` | `Any` | No | Top-level free-form payload (e.g. vega-spec). |

**Consumers**:
- `shared/utils/src/mcp-types.ts:42` (DELETED)

### `MCPErrorResponse`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `code` | `integer` | Yes | JSON-RPC-style error code. |
| `message` | `string` | Yes | Human-readable error message. |
| `data` | `Any` | No | Free-form error context. |

**Consumers**:
- `shared/utils/src/mcp-types.ts:50` (DELETED)

---

## Group 2 — Discovery (P2)

### `MCPParamSchema`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `type` | `MCPParamTypeEnum` | Yes | `string`, `number`, `integer`, `boolean`, `array`, `object`. |
| `description` | `string` | No | |
| `enum_values` | `string` (multivalued) | No | |
| `items` | `MCPParamSchema` | No | Set when `type == array`. Recursive. |
| `default` | `Any` | No | |

**Consumers** (drift-cluster resolution):
- `shared/components/src/ToolMatch/mcpAdapter.ts:50` (DELETED)
- `apps/vscode/src/services/mcpToolAdapter.ts:16` (DELETED)

### `MCPSelectionRequirement`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `feature_type` | `string` | Yes | E.g. `track`, `point`, `polygon`. |
| `min_count` | `integer` | No | |
| `max_count` | `integer` | No | |

**Consumers**:
- `shared/utils/src/mcp-types.ts:65` (DELETED)

### `MCPToolDefinition`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `name` | `string` | Yes | |
| `description` | `string` | No | |
| `input_schema` | `MCPParamSchema` | No | |
| `selection_requirement` | `MCPSelectionRequirement` (multivalued) | No | |
| `category` | `ToolCategoryEnum` | No | Reuses enum from `tool.yaml` via `imports:`. |
| `version` | `string` | No | |

**Consumers**:
- `shared/utils/src/mcp-types.ts:76` (DELETED)

### `ToolParameter` *(drift-cluster resolution)*

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `name` | `string` | Yes | |
| `label` | `string` | No | |
| `param_schema` | `MCPParamSchema` | Yes | |
| `required` | `boolean` | No | |

**Consumers** (both DELETED — drift resolved):
- `shared/components/src/ToolMatch/types.ts:34`
- `apps/vscode/src/types/tool.ts:26`

**Drift reconciliation**: The two existing copies differ slightly
(one carries a `validation` slot, the other carries a `hint` slot).
The new canonical class is the union of both (additive).

### `ToolParameterMeta`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `name` | `string` | Yes | |
| `display_label` | `string` | No | |
| `validation_hint` | `string` | No | |
| `placeholder` | `string` | No | |

**Consumers**: `apps/web-shell/src/mocks/calcService.ts:138` (DELETED)

### `ToolDefinition`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `name` | `string` | Yes | |
| `description` | `string` | No | |
| `parameters` | `ToolParameter` (multivalued, ordered) | Yes | |
| `parameter_meta` | `ToolParameterMeta` (multivalued, ordered) | No | |
| `category` | `ToolCategoryEnum` | No | |

**Consumers**: `apps/web-shell/src/mocks/calcService.ts:145` (DELETED)

### `ToolResult`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `success` | `boolean` | Yes | |
| `output` | `Any` | No | Set on success. |
| `error` | `string` | No | Set on failure. |

**Consumers**: `apps/web-shell/src/mocks/calcService.ts:26` (DELETED)

---

## Group 3 — Replay / Logging (P3)

### `ToolResultForLog`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `tool_id` | `string` | Yes | |
| `tool_version` | `string` | No | |
| `feature_ids` | `string` (multivalued, ordered) | Yes | |
| `params` | `Any` | Yes | Per-tool input payload. |
| `result` | `MCPToolResponse` | No | Set on success. |
| `error` | `MCPErrorResponse` | No | Set on failure. |
| `timestamp` | `datetime` | Yes | ISO-8601 UTC. |
| `input_hash` | `string` | No | SHA-256 of canonicalised input. |

**Consumers**: `services/session-state/src/log/types.ts:89` (DELETED)

**Validation**: Pydantic `model_validator` enforces `result XOR error`.

### `ToolExecutionResultForReplay`

Extends `ToolResultForLog` via `is_a: ToolResultForLog`.

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `resolved_tool_version` | `string` | No | |
| `replay_status` | `ReplayStatusEnum` | Yes | `unchanged`, `version_drift`, `tool_removed`. |

**Consumers**: `services/session-state/src/log/types.ts:271` (DELETED)

### `ToolsUpdateMessage`

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `type` | `string` (const `tools:update`) | Yes | Discriminator. |
| `tools` | `MCPToolDefinition` (multivalued, ordered) | Yes | |
| `epoch` | `integer` | No | |

**Consumers**: `apps/vscode/src/webview/web/activityPanel.tsx:52` (DELETED)

---

## TS-only aliases (not LinkML classes)

These live in `shared/schemas/src/typescript/aliases/mcp-functions.ts`
(new file, inside `@debrief/schemas` — see Research R-002).

### `ToolExecutor`

```ts
export type ToolExecutor = (
  tool_id: string,
  feature_ids: string[],
  params: Record<string, unknown>,
) => Promise<ToolResultForLog>;
```

### `ToolVersionResolver`

```ts
export type ToolVersionResolver = (
  tool_id: string,
) => Promise<string | null>;
```

The original hand-spelled definitions at
`services/session-state/src/log/types.ts:281` and `:299` are DELETED.

---

## Permissible-value enums (new)

### `SessionMCPToolName`

`session.getState`, `session.getTemporalState`, `session.getSpatialState`,
`session.getFeaturesState`, `session.getDocumentState`,
`session.setCurrentTime`, `session.setViewport`, `session.setSelection`,
`session.setHiddenFeatures`, `session.setPlaybackRate`,
`session.setRotation`.

Authoritative source: the `TOOLS` const at
`services/session-state/src/server/mcp.ts:31-47` at the audit commit.

### `MCPContentItemTypeEnum`

`text`, `resource_link`, `image`, `structured`.

### `MCPParamTypeEnum`

`string`, `number`, `integer`, `boolean`, `array`, `object`.

### `ReplayStatusEnum`

`unchanged`, `version_drift`, `tool_removed`.

---

## Class summary table

| # | Class / Enum | Group | Audit row(s) closed | Consumer site DELETED |
|---|--------------|-------|--------------------|------------------------|
| 1 | `MCPRequest` | Envelopes | §3.1 row 13 | `services/session-state/src/server/mcp.ts:23` |
| 2 | `MCPContentItem` | Envelopes | §3.1 row 15 | `shared/utils/src/mcp-types.ts:30` |
| 3 | `MCPToolResponse` | Envelopes | §3.1 row 16 | `shared/utils/src/mcp-types.ts:42` |
| 4 | `MCPErrorResponse` | Envelopes | §3.1 row 17 | `shared/utils/src/mcp-types.ts:50` |
| 5 | `MCPParamSchema` | Discovery | §3.1 rows 1, 27 | ToolMatch + VS Code adapters |
| 6 | `MCPSelectionRequirement` | Discovery | §3.1 row 18 | `shared/utils/src/mcp-types.ts:65` |
| 7 | `MCPToolDefinition` | Discovery | §3.1 row 19 | `shared/utils/src/mcp-types.ts:76` |
| 8 | `ToolParameter` | Discovery | §3.2 rows 37, 86 *(drift)* | ToolMatch + VS Code types |
| 9 | `ToolParameterMeta` | Discovery | §3.1 row 21 | `apps/web-shell/src/mocks/calcService.ts:138` |
| 10 | `ToolDefinition` | Discovery | §3.1 row 22 | `apps/web-shell/src/mocks/calcService.ts:145` |
| 11 | `ToolResult` | Discovery | §3.1 row 20 | `apps/web-shell/src/mocks/calcService.ts:26` |
| 12 | `ToolResultForLog` | Replay | §3.1 row 4 | `services/session-state/src/log/types.ts:89` |
| 13 | `ToolExecutionResultForReplay` | Replay | §3.1 row 6 | `services/session-state/src/log/types.ts:271` |
| 14 | `ToolsUpdateMessage` | Replay | §3.1 row 28 | `apps/vscode/src/webview/web/activityPanel.tsx:52` |
| 15 | `SessionMCPToolName` *(enum)* | Replay | §3.1 row 14 | `services/session-state/src/server/mcp.ts:49` |
| TS-1 | `ToolExecutor` *(alias)* | Replay | §3.1 row 7 | `services/session-state/src/log/types.ts:281` |
| TS-2 | `ToolVersionResolver` *(alias)* | Replay | §3.1 row 8 | `services/session-state/src/log/types.ts:299` |

**Total**: 15 LinkML classes/enums + 2 TS-only aliases = 17 declarations,
matching the audit's §3.1 + §3.2 row count for #222.

## Open follow-ups (deferred — not blocking #222)

- Nested `object` sub-properties for `MCPParamSchema` — deferred until
  a tool ships object-typed inputs at this depth.
- Closing the `feature_type` set on `MCPSelectionRequirement` —
  deferred to E11 phase 4.
