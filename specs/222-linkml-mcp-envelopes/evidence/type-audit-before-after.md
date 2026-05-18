# Type-audit re-run: before / after (#222 cluster)

Documents the §3.1 (`cross-domain-hand-typed`) and §3.2
(`drift-candidate`) row counts attributed to #222 before and after
the migration lands.

## Before — audit commit `01166d6e` (2026-04-21)

Per the published [type-audit-2026.md §3.1](../../../docs/type-audit-2026.md#31-cross-domain-hand-typed)
the seventeen rows attributed to #222 were:

| Audit row | File | Declaration |
|---|---|---|
| §3.1 row 1 | `shared/components/src/ToolMatch/mcpAdapter.ts:50` | `MCPParamSchema` |
| §3.1 row 4 | `services/session-state/src/log/types.ts:89` | `ToolResultForLog` |
| §3.1 row 6 | `services/session-state/src/log/types.ts:271` | `ToolExecutionResultForReplay` |
| §3.1 row 7 | `services/session-state/src/log/types.ts:281` | `ToolExecutor` (function alias) |
| §3.1 row 8 | `services/session-state/src/log/types.ts:299` | `ToolVersionResolver` (function alias) |
| §3.1 row 13 | `services/session-state/src/server/mcp.ts:23` | `MCPRequest` |
| §3.1 row 14 | `services/session-state/src/server/mcp.ts:49` | `ToolName` (`keyof typeof TOOLS`) |
| §3.1 row 15 | `shared/utils/src/mcp-types.ts:30` | `MCPContentItem` |
| §3.1 row 16 | `shared/utils/src/mcp-types.ts:42` | `MCPToolResponse` |
| §3.1 row 17 | `shared/utils/src/mcp-types.ts:50` | `MCPErrorResponse` |
| §3.1 row 18 | `shared/utils/src/mcp-types.ts:65` | `MCPSelectionRequirement` |
| §3.1 row 19 | `shared/utils/src/mcp-types.ts:76` | `MCPToolDefinition` |
| §3.1 row 20 | `apps/web-shell/src/mocks/calcService.ts:26` | `ToolResult` |
| §3.1 row 21 | `apps/web-shell/src/mocks/calcService.ts:138` | `ToolParameterMeta` |
| §3.1 row 22 | `apps/web-shell/src/mocks/calcService.ts:145` | `ToolDefinition` |
| §3.1 row 27 | `apps/vscode/src/services/mcpToolAdapter.ts:16` | `MCPParamSchema` (drift) |
| §3.1 row 28 | `apps/vscode/src/webview/web/activityPanel.tsx:52` | `ToolsUpdateMessage` |

Plus §3.2 drift cluster:

| Audit row | File | Declaration |
|---|---|---|
| §3.2 row 37 | `shared/components/src/ToolMatch/types.ts:34` | `ToolParameter` |
| §3.2 row 86 | `apps/vscode/src/types/tool.ts:26` | `ToolParameter` |

**Totals attributed to #222**:
- §3.1 `cross-domain-hand-typed`: **17 rows**
- §3.2 `drift-candidate`: **2 rows** (one cluster, two members)

## After — feature branch `claude/implement-speckit-222-OSCnj` at `fc4b5f6`

Every site listed above has been migrated. Per the audit's R4 rule
(any file importing from `@debrief/schemas` is reclassified as
schema-rooted) the count attributed to #222 is now **zero** in both
§3.1 and §3.2.

Verification — local grep across the in-scope tree (matches SC-003):

```sh
$ git grep -nE "interface (MCPRequest|MCPToolResponse|MCPErrorResponse|MCPContentItem|MCPToolDefinition|MCPSelectionRequirement|MCPParamSchema|ToolDefinition|ToolParameter|ToolParameterMeta|ToolResult|ToolResultForLog|ToolExecutionResultForReplay|ToolsUpdateMessage)\b" -- apps shared services | grep -v "shared/schemas/" | grep -v "shared/schemas/src/typescript/aliases/"
$ # → no output. PASS.

$ git grep -n "type ToolName = keyof typeof TOOLS" -- services/ apps/ shared/
$ # → no output. PASS.
```

The schema-rooted replacements all live under:

- `shared/schemas/src/linkml/mcp.yaml` (the source of truth, 15 LinkML classes + 4 enums)
- `shared/schemas/src/generated/{python,typescript,json-schema}/` (generated artefacts)
- `shared/schemas/src/typescript/aliases/mcp-functions.ts` (R-002 — TS-only function aliases, schema-rooted via R4)
- Consumer sites that now `import type { … } from '@debrief/schemas'` and narrow with `Omit` + intersection where needed (FR-004)

### Migrations recorded per consumer site

| Site | Before | After |
|---|---|---|
| `services/session-state/src/server/mcp.ts` | `interface MCPRequest` + `type ToolName = keyof typeof TOOLS` | `import type { MCPRequest } from '@debrief/schemas'` + `type ToolName = ${SessionMCPToolName}` (compile-time guard against drift) |
| `shared/utils/src/mcp-types.ts` | 4 hand-typed interfaces (`MCPContentItem`, `MCPToolResponse`, `MCPErrorResponse`, `MCPSelectionRequirement`, `MCPToolDefinition`) | All five `Omit`+intersection narrowings over generated bases |
| `shared/components/src/ToolMatch/types.ts` | `interface ToolParameter` (drift cluster member 1) | `Omit<ToolParameterSchema, ...> & { ... }` over `@debrief/schemas.ToolParameter` |
| `shared/components/src/ToolMatch/mcpAdapter.ts` | `interface MCPParamSchema` (drift) | `MCPParamSchemaBase & { enum?, default?, 'x-debrief-param-type'? }` |
| `apps/vscode/src/types/tool.ts` | `interface ToolParameter` (drift cluster member 2) | Same `Omit`+intersection pattern — drift cluster closed |
| `apps/vscode/src/services/mcpToolAdapter.ts` | `interface MCPParamSchema` (drift) | Same narrowing as the components site |
| `apps/vscode/src/webview/web/activityPanel.tsx` | `interface ToolsUpdateMessage` | `Omit<ToolsUpdateMessageSchema, 'payload'> & { payload: { tools, hasToolInventory?, hasSelection? } }` |
| `apps/web-shell/src/mocks/calcService.ts` | 3 hand-typed (`ToolResult`, `ToolParameterMeta`, `ToolDefinition`) | All three now consume the generated bases; `ToolResult` narrows with GeoJSON-typed result layers, others are direct re-exports |
| `services/session-state/src/log/types.ts` | `interface ToolResultForLog` + `interface ToolExecutionResultForReplay` + `type ToolExecutor` + `type ToolVersionResolver` | All four schema-rooted (R4 import of `@debrief/schemas`); two function aliases re-exported via the shared TS-only module at `shared/schemas/src/typescript/aliases/mcp-functions.ts` |

## Net change

| Metric | Before | After | Δ |
|---|---|---|---|
| §3.1 rows attributed to #222 | 17 | 0 | **−17** |
| §3.2 `ToolParameter` drift members | 2 | 0 | **−2** |
| LinkML classes in `mcp.yaml` | 0 | 15 | +15 |
| LinkML enums in `mcp.yaml` | 0 | 4 | +4 |
| TS-only function aliases (schema-rooted) | 0 | 2 | +2 |
| `@debrief/schemas` named exports added | 0 | ~21 | +21 (4 enums, 15 classes, 2 function-aliases) |
| New `as any` / `# type: ignore` / `// @ts-expect-error` in consumer code | — | 0 | (Article XV.2 free-form fields are documented schema-side only; no consumer cast was added) |

## Notes on the scanner re-run

The actual scanner (`scripts/audits/type-audit/scan.ts`) is invoked
via the steps in `specs/222-linkml-mcp-envelopes/quickstart.md`. It
must be re-run after merge to produce the canonical post-merge
report excerpt for `docs/type-audit-2026.md` §5 (already updated in
this branch with the before/after counts and a link back to spec 222).
