---
feature: 206-audit-non-linkml-types
epic: E11
captured_at: 2026-04-21
git_sha: 01166d6e8ef72ed5cf25c339f0d9fa7dfc2b15b1
scanner_version: v1
---

# Type-declaration audit — Debrief monorepo (2026)

Back-link: this audit is the first deliverable under Epic **E11 — Schema-First
Boundary Typing**, tracked at [docs/ideas/E11-schema-first-boundary-typing.md](ideas/E11-schema-first-boundary-typing.md).
Its purpose is to enumerate every named TypeScript `interface` / `type` /
`enum` under `apps/`, `shared/`, and `services/` (excluding generated and
test-local code) and classify each declaration so that the phase list for E11
is driven by evidence, not intuition.

## 1. Summary

| Metric | Count |
|--------|-------|
| In-scope declarations scanned | 885 |
| Drift clusters (same-name + different-shape) | 25 |
| Files traversed | 317 |
| Schema-rooted | 260 |
| Boundary / parse-time loose | 5 |
| Single-domain convenience | 486 |
| Cross-domain hand-typed | 28 |
| Drift candidate | 106 |

### Newly opened backlog items

- **#222** — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML
- **#223** — [E11] Promote STAC catalog hand-types (StacItem / StacCatalog / StacCollection) to LinkML — replace hand-authored aliases in apps/vscode/src/types/stac.ts + apps/web-shell/src/mocks/stacService.ts
- **#224** — [E11] Promote session-state wire shapes (StateSnapshot / FeatureProvenance / ModifiedFeature / InputFeatureState / BranchPointLocation / CreateSnapshotOptions) to LinkML
- **#225** — [E11] Promote loader↔main IPC envelopes (CreatePlotResponse / AddFeaturesResponse / ListPlotsResponse / OpenPlotArgs / ParseResult) to LinkML — wire shapes shared between Electron main/renderer and VS Code extension
- **#226** — [E11] Resolve real drift clusters surfaced by the type-audit — same-name different-shape declarations that indicate unintended semantic divergence (excludes Storybook Story / React Props per-file conventions)
- **#227** — [E11] Storybook / React component local-convention drift rollup — Story (38 sites) and Props (14 sites) re-declarations are per-file conventions rather than semantic drift; treat as no-action but document in a rollup so future audits can ignore them

### Existing items reused

- **#204** — RawGeoJSONFeature — already-open E11 child that covers GeoJSON hand-types

## 2. Methodology

### 2.1 Scope

| Aspect | Value |
|--------|-------|
| In-scope roots | `apps/`, `shared/`, `services/` |
| Excluded paths | `shared/schemas/src/generated/**`, `**/__tests__/**`, `**/__fixtures__/**`, `**/*.test.ts`, `**/*.spec.ts`, `**/node_modules/**`, `**/dist/**` |
| Generator output boundary | Path-based — anything under `shared/schemas/src/generated/` is authoritative (LinkML-generated) and excluded. |

### 2.2 Declaration extraction

- Uses the **TypeScript compiler API** via
  `scripts/audits/type-audit/scan.ts`.
- Traverses every `.ts` / `.tsx` / `.d.ts` file in scope, emitting one
  record per top-level `InterfaceDeclaration`, `TypeAliasDeclaration`, or
  `EnumDeclaration`.
- Records are stable-sorted by `${packageName}:${filePath}:${declarationName}`
  for diff-friendly output. SHA-1 shape hashes power drift detection.
- Output contract: `specs/206-audit-non-linkml-types/contracts/scan-output.schema.json`.

### 2.3 Classification rules (applied in order)

| Rule | Trigger | Classification |
|------|---------|----------------|
| R1   | Declaration name is in a drift cluster (≥ 2 sites, distinct shape hashes). | `drift-candidate` |
| R2   | Type-alias RHS bottoms out in `unknown` / `any` / `Record<string, unknown>` / `Record<string, any>` (transitively through unions / intersections / parens). | `boundary-loose` |
| R3   | Declaration name matches one of the committed cross-domain name patterns (MCP\*, Stac\*, GeoJson\*, StateSnapshot / FeatureProvenance / ModifiedFeature / InputFeatureState / BranchPointLocation / CreateSnapshotOptions, CreatePlotResponse / AddFeaturesResponse / ListPlotsResponse / OpenPlotArgs / ParseResult, ToolResultEnvelope / CalcResult / ToolContext) **and** the containing file does not import `@debrief/schemas`. | `cross-domain-hand-typed` |
| R4   | Containing file imports from `@debrief/schemas` (or any `@debrief/schemas/*` sub-path). | `schema-rooted` |
| R5   | Fallback. | `single-domain` |

The cross-domain name patterns in R3 are committed in
`scripts/audits/type-audit/generate-report.ts` (constant
`CROSS_DOMAIN_NAME_PATTERNS`). To extend the audit, edit that constant and
re-run `pnpm tsx scripts/audits/type-audit/generate-report.ts`.

### 2.4 Re-run

```bash
# 1. Scan
mkdir -p tmp
pnpm tsx scripts/audits/type-audit/scan.ts \
  --roots apps shared services \
  --exclude "shared/schemas/src/generated/**" \
  --exclude "**/__tests__/**" \
  --exclude "**/__fixtures__/**" \
  --exclude "**/*.test.ts" \
  --exclude "**/*.spec.ts" \
  --exclude "**/node_modules/**" \
  --exclude "**/dist/**" \
  --out tmp/type-audit.json

# 2. Validate (belt-and-braces — scanner tests already enforce this)
#    Inline Ajv validation is trivial; the scanner's own vitest suite
#    includes a contract test against scan-output.schema.json.

# 3. Regenerate this report
pnpm tsx scripts/audits/type-audit/generate-report.ts \
  --in tmp/type-audit.json \
  --out docs/type-audit-2026.md
```

### 2.5 Known gaps / caveats

- Per-file convention drift (Storybook `Story`, React component `Props`) is
  mechanically flagged by R1 but folded into a single rollup backlog item
  (#227) rather than treated as semantic
  drift. Future audits should keep the mechanical rule honest and only suppress
  at the backlog-linkage level.
- R3 cross-domain detection is **name-based, not shape-based**. A type that
  crosses the Python ↔ TS boundary under a non-matching name (e.g.
  `PlotDescriptor`, `SceneLayout`) will fall through to `single-domain`
  unless the reviewer extends `CROSS_DOMAIN_NAME_PATTERNS`. The audit errs
  on the side of not opening backlog noise; follow-up E11 phases should
  re-run with additions.
- Declarations inside `.d.ts` files authored in-repo are included; declarations
  inside `node_modules/` are not. No generated output was found outside
  `shared/schemas/src/generated/` during this run.
- The scanner does not resolve re-exports. A file that `export { Coordinate }
  from '@debrief/schemas'` is still classified via R4 (its file imports from
  `@debrief/schemas`). A re-export that deliberately shadows a schema type
  would not be distinguished.

## 3. Findings

The table for each bucket below includes every in-scope declaration exactly
once (spec SC-001). Rows are stable-sorted by package → file path → line
number → declaration name so re-runs produce diff-friendly output.

### 3.1 Cross-domain hand-typed (28)

| # | Package | File : Line | Name | Summary | Recommended action |
|---|---------|-------------|------|---------|---------------------|
| 1 | @debrief/components | `shared/components/src/ToolMatch/mcpAdapter.ts:50` | `MCPParamSchema` | interface `MCPParamSchema` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 2 | @debrief/session-state | `services/session-state/src/log/types.ts:28` | `InputFeatureState` | interface `InputFeatureState` | Open #224 — [E11] Promote session-state wire shapes (StateSnapshot / FeatureProvenance / ModifiedFeature / InputFeatureState / BranchPointLocation / CreateSnapshotOptions) to LinkML. |
| 3 | @debrief/session-state | `services/session-state/src/log/types.ts:53` | `ModifiedFeature` | interface `ModifiedFeature` | Open #224 — [E11] Promote session-state wire shapes (StateSnapshot / FeatureProvenance / ModifiedFeature / InputFeatureState / BranchPointLocation / CreateSnapshotOptions) to LinkML. |
| 4 | @debrief/session-state | `services/session-state/src/log/types.ts:89` | `ToolResultForLog` | interface `ToolResultForLog` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 5 | @debrief/session-state | `services/session-state/src/log/types.ts:102` | `FeatureProvenance` | interface `FeatureProvenance` | Open #224 — [E11] Promote session-state wire shapes (StateSnapshot / FeatureProvenance / ModifiedFeature / InputFeatureState / BranchPointLocation / CreateSnapshotOptions) to LinkML. |
| 6 | @debrief/session-state | `services/session-state/src/log/types.ts:271` | `ToolExecutionResultForReplay` | interface `ToolExecutionResultForReplay` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 7 | @debrief/session-state | `services/session-state/src/log/types.ts:281` | `ToolExecutor` | type alias = `( tool_id: string, feature_ids: string[], params: Record<string, unkn…` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 8 | @debrief/session-state | `services/session-state/src/log/types.ts:299` | `ToolVersionResolver` | type alias = `(tool_id: string) => Promise<string \| null>` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 9 | @debrief/session-state | `services/session-state/src/log/types.ts:403` | `BranchPointLocation` | type alias = `\| { type: 'current-segment'; entry_index: number } \| { type: 'snapsho…` | Open #224 — [E11] Promote session-state wire shapes (StateSnapshot / FeatureProvenance / ModifiedFeature / InputFeatureState / BranchPointLocation / CreateSnapshotOptions) to LinkML. |
| 10 | @debrief/session-state | `services/session-state/src/log/types.ts:448` | `CreateSnapshotOptions` | interface `CreateSnapshotOptions` | Open #224 — [E11] Promote session-state wire shapes (StateSnapshot / FeatureProvenance / ModifiedFeature / InputFeatureState / BranchPointLocation / CreateSnapshotOptions) to LinkML. |
| 11 | @debrief/session-state | `services/session-state/src/log/types.ts:478` | `GeoJsonFeatureCollection` | interface `GeoJsonFeatureCollection` | Fold into #204 — RawGeoJSONFeature. |
| 12 | @debrief/session-state | `services/session-state/src/log/types.ts:484` | `GeoJsonFeature` | interface `GeoJsonFeature` | Fold into #204 — RawGeoJSONFeature. |
| 13 | @debrief/session-state | `services/session-state/src/server/mcp.ts:23` | `MCPRequest` | interface `MCPRequest` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 14 | @debrief/session-state | `services/session-state/src/server/mcp.ts:49` | `ToolName` | type alias = `keyof typeof TOOLS` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 15 | @debrief/utils | `shared/utils/src/mcp-types.ts:30` | `MCPContentItem` | interface `MCPContentItem` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 16 | @debrief/utils | `shared/utils/src/mcp-types.ts:42` | `MCPToolResponse` | interface `MCPToolResponse` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 17 | @debrief/utils | `shared/utils/src/mcp-types.ts:50` | `MCPErrorResponse` | interface `MCPErrorResponse` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 18 | @debrief/utils | `shared/utils/src/mcp-types.ts:65` | `MCPSelectionRequirement` | interface `MCPSelectionRequirement` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 19 | @debrief/utils | `shared/utils/src/mcp-types.ts:76` | `MCPToolDefinition` | interface `MCPToolDefinition` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 20 | @debrief/web-shell | `apps/web-shell/src/mocks/calcService.ts:26` | `ToolResult` | interface `ToolResult` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 21 | @debrief/web-shell | `apps/web-shell/src/mocks/calcService.ts:138` | `ToolParameterMeta` | interface `ToolParameterMeta` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 22 | @debrief/web-shell | `apps/web-shell/src/mocks/calcService.ts:145` | `ToolDefinition` | interface `ToolDefinition` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 23 | debrief-loader | `apps/loader/src/main/ipc/stac.ts:60` | `ListPlotsResponse` | interface `ListPlotsResponse` | Open #225 — [E11] Promote loader↔main IPC envelopes (CreatePlotResponse / AddFeaturesResponse / ListPlotsResponse / OpenPlotArgs / ParseResult) to LinkML. |
| 24 | debrief-loader | `apps/loader/src/main/ipc/stac.ts:90` | `CreatePlotResponse` | interface `CreatePlotResponse` | Open #225 — [E11] Promote loader↔main IPC envelopes (CreatePlotResponse / AddFeaturesResponse / ListPlotsResponse / OpenPlotArgs / ParseResult) to LinkML. |
| 25 | debrief-loader | `apps/loader/src/main/ipc/stac.ts:118` | `AddFeaturesResponse` | interface `AddFeaturesResponse` | Open #225 — [E11] Promote loader↔main IPC envelopes (CreatePlotResponse / AddFeaturesResponse / ListPlotsResponse / OpenPlotArgs / ParseResult) to LinkML. |
| 26 | debrief-vscode | `apps/vscode/src/commands/openPlot.ts:63` | `OpenPlotArgs` | interface `OpenPlotArgs` | Open #225 — [E11] Promote loader↔main IPC envelopes (CreatePlotResponse / AddFeaturesResponse / ListPlotsResponse / OpenPlotArgs / ParseResult) to LinkML. |
| 27 | debrief-vscode | `apps/vscode/src/services/mcpToolAdapter.ts:16` | `MCPParamSchema` | interface `MCPParamSchema` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |
| 28 | debrief-vscode | `apps/vscode/src/webview/web/activityPanel.tsx:52` | `ToolsUpdateMessage` | interface `ToolsUpdateMessage` | Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML. |


### 3.2 Drift candidate (106)

| # | Package | File : Line | Name | Summary | Recommended action |
|---|---------|-------------|------|---------|---------------------|
| 1 | @debrief/components | `shared/components/src/ActivityPanel/ActivityPanel.stories.tsx:143` | `Story` | type alias = `StoryObj<typeof ActivityPanel>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 2 | @debrief/components | `shared/components/src/ChartRenderer/ChartRenderer.stories.tsx:20` | `Story` | type alias = `StoryObj<typeof ChartRenderer>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 3 | @debrief/components | `shared/components/src/colour-engine/ColourDimensionSelector.stories.tsx:48` | `Story` | type alias = `StoryObj<typeof ColourDimensionSelector>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 4 | @debrief/components | `shared/components/src/colour-engine/ColourLegend.stories.tsx:70` | `Story` | type alias = `StoryObj<typeof ColourLegend>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 5 | @debrief/components | `shared/components/src/ContextMenu/ContextMenu.stories.tsx:74` | `Story` | type alias = `StoryObj<typeof ContextMenu>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 6 | @debrief/components | `shared/components/src/ExerciseListView/ExerciseListView.stories.tsx:30` | `Story` | type alias = `StoryObj<typeof ExerciseListView>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 7 | @debrief/components | `shared/components/src/FeatureList/FeatureList.stories.tsx:37` | `Story` | type alias = `StoryObj<typeof FeatureList>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 8 | @debrief/components | `shared/components/src/FilterBar/FilterBar.stories.tsx:293` | `Story` | type alias = `StoryObj<typeof FilterBar>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 9 | @debrief/components | `shared/components/src/FilterBar/SavedFilters.stories.tsx:187` | `Story` | type alias = `StoryObj` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 10 | @debrief/components | `shared/components/src/FormatMenu/FormatMenuHarness.stories.tsx:306` | `Story` | type alias = `StoryObj` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 11 | @debrief/components | `shared/components/src/FormatMenu/formatMenuItems.ts:12` | `StylePropertyDescriptor` | interface `StylePropertyDescriptor` | Open #226 — drift cluster "StylePropertyDescriptor" (2 members). |
| 12 | @debrief/components | `shared/components/src/GeometryDialog/GeometryDialog.stories.tsx:32` | `Story` | type alias = `StoryObj<typeof GeometryDialog>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 13 | @debrief/components | `shared/components/src/LayersToolbar/FilterDropdown.stories.tsx:35` | `Story` | type alias = `StoryObj<typeof FilterDropdown>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 14 | @debrief/components | `shared/components/src/LayersToolbar/LayersToolbar.stories.tsx:47` | `Story` | type alias = `StoryObj<typeof LayersToolbar>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 15 | @debrief/components | `shared/components/src/LayersToolbar/types.ts:11` | `FilterState` | interface `FilterState` | Open #226 — drift cluster "FilterState" (2 members). |
| 16 | @debrief/components | `shared/components/src/LogPanel/LogPanel.stories.tsx:168` | `Story` | type alias = `StoryObj<typeof LogPanel>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 17 | @debrief/components | `shared/components/src/LogPanel/ParameterEditor.stories.tsx:52` | `Story` | type alias = `StoryObj<typeof ParameterEditor>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 18 | @debrief/components | `shared/components/src/LogPanel/types.ts:103` | `FilterState` | interface `FilterState` | Open #226 — drift cluster "FilterState" (2 members). |
| 19 | @debrief/components | `shared/components/src/LogPanel/types.ts:184` | `ExtensionToWebviewMessage` | type alias = `\| { type: 'timeline:update'; payload: TimelineUpdatePayload } \| { typ…` | Open #226 — drift cluster "ExtensionToWebviewMessage" (2 members). |
| 20 | @debrief/components | `shared/components/src/MapView/Drawing.stories.tsx:34` | `Story` | type alias = `StoryObj` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 21 | @debrief/components | `shared/components/src/MapView/Geoman.stories.tsx:151` | `Story` | type alias = `StoryObj` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 22 | @debrief/components | `shared/components/src/MapView/MapView.stories.tsx:31` | `Story` | type alias = `StoryObj<typeof MapView>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 23 | @debrief/components | `shared/components/src/MapView/ShapeTypes.stories.tsx:42` | `Story` | type alias = `StoryObj<typeof MapView>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 24 | @debrief/components | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx:58` | `Story` | type alias = `StoryObj<typeof StoryboardPanel>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 25 | @debrief/components | `shared/components/src/PanelWorkspace/PanelErrorBoundary.tsx:10` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 26 | @debrief/components | `shared/components/src/PropertiesPanel/messageTypes.ts:11` | `PropertiesCommitMessage` | interface `PropertiesCommitMessage` | Open #226 — drift cluster "PropertiesCommitMessage" (3 members). |
| 27 | @debrief/components | `shared/components/src/StacBrowser/StacBrowser.stories.tsx:173` | `Story` | type alias = `StoryObj<typeof StacBrowser>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 28 | @debrief/components | `shared/components/src/StacFileTree/StacFileTree.stories.tsx:39` | `Story` | type alias = `StoryObj<typeof StacFileTree>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 29 | @debrief/components | `shared/components/src/storyboard/missing-data.ts:25` | `PlotTimeRange` | interface `PlotTimeRange` | Open #226 — drift cluster "PlotTimeRange" (2 members). |
| 30 | @debrief/components | `shared/components/src/storyboard/types.ts:39` | `Plot` | interface `Plot` | Open #226 — drift cluster "Plot" (2 members). |
| 31 | @debrief/components | `shared/components/src/ThemeProvider/ThemeProvider.stories.tsx:22` | `Story` | type alias = `StoryObj<typeof ThemeProvider>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 32 | @debrief/components | `shared/components/src/TimeController/TimeController.stories.tsx:107` | `Story` | type alias = `StoryObj<typeof TimeController>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 33 | @debrief/components | `shared/components/src/Timeline/Timeline.stories.tsx:31` | `Story` | type alias = `StoryObj<typeof Timeline>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 34 | @debrief/components | `shared/components/src/TimelineView/TimelineView.stories.tsx:30` | `Story` | type alias = `StoryObj<typeof TimelineView>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 35 | @debrief/components | `shared/components/src/ToolMatch/ToolMatchHarness/ToolMatchHarness.stories.tsx:44` | `Story` | type alias = `StoryObj<typeof ToolMatchHarness>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 36 | @debrief/components | `shared/components/src/ToolMatch/types.ts:22` | `MatchResult` | interface `MatchResult` | Open #226 — drift cluster "MatchResult" (2 members). |
| 37 | @debrief/components | `shared/components/src/ToolMatch/types.ts:34` | `ToolParameter` | interface `ToolParameter` | Open #222 — drift cluster "ToolParameter" aligns with this E11 phase (schema promotion resolves the drift). |
| 38 | @debrief/components | `shared/components/src/ToolsPanel/ToolsPanel.stories.tsx:71` | `Story` | type alias = `StoryObj<typeof ToolsPanel>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 39 | @debrief/session-state | `services/session-state/src/format/stylePropertyMap.ts:10` | `StylePropertyDescriptor` | interface `StylePropertyDescriptor` | Open #226 — drift cluster "StylePropertyDescriptor" (2 members). |
| 40 | @debrief/session-state | `services/session-state/src/store/index.ts:47` | `StateSnapshot` | interface `StateSnapshot` | Open #224 — drift cluster "StateSnapshot" aligns with this E11 phase (schema promotion resolves the drift). |
| 41 | @debrief/session-state | `services/session-state/src/types/index.ts:96` | `StateSnapshot` | type alias = `Omit<SessionState, 'document'>` | Open #224 — drift cluster "StateSnapshot" aligns with this E11 phase (schema promotion resolves the drift). |
| 42 | @debrief/spec-navigator | `apps/spec-navigator/src/components/ArtifactTree.tsx:30` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 43 | @debrief/spec-navigator | `apps/spec-navigator/src/components/ArtifactView.tsx:10` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 44 | @debrief/spec-navigator | `apps/spec-navigator/src/components/CodeView.tsx:19` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 45 | @debrief/spec-navigator | `apps/spec-navigator/src/components/CommentComposer.tsx:5` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 46 | @debrief/spec-navigator | `apps/spec-navigator/src/components/CommentDrawer.tsx:5` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 47 | @debrief/spec-navigator | `apps/spec-navigator/src/components/ErrorBanner.tsx:1` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 48 | @debrief/spec-navigator | `apps/spec-navigator/src/components/ImageView.tsx:4` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 49 | @debrief/spec-navigator | `apps/spec-navigator/src/components/MarkdownView.tsx:10` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 50 | @debrief/spec-navigator | `apps/spec-navigator/src/components/SelectionAnchor.tsx:6` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 51 | @debrief/spec-navigator | `apps/spec-navigator/src/components/SettingsPanel.tsx:6` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 52 | @debrief/spec-navigator | `apps/spec-navigator/src/components/SpecBrowserModal.tsx:6` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 53 | @debrief/spec-navigator | `apps/spec-navigator/src/components/StaleHeadModal.tsx:3` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 54 | @debrief/spec-navigator | `apps/spec-navigator/src/components/SubmitButton.tsx:8` | `Props` | interface `Props` | Fold into #227 — Props is a well-understood per-file convention (not semantic drift). |
| 55 | @debrief/web-shell | `apps/web-shell/playwright/components/TimeController.ts:9` | `TimeControllerState` | type alias = `'empty' \| 'loading' \| 'ready'` | Open #226 — drift cluster "TimeControllerState" (2 members). |
| 56 | @debrief/web-shell | `apps/web-shell/src/App.stories.tsx:62` | `Story` | type alias = `StoryObj<typeof App>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 57 | @debrief/web-shell | `apps/web-shell/src/App.tsx:122` | `ResultTab` | interface `ResultTab` | Open #226 — drift cluster "ResultTab" (2 members). |
| 58 | @debrief/web-shell | `apps/web-shell/src/mocks/stacService.ts:23` | `StacItem` | interface `StacItem` | Open #223 — drift cluster "StacItem" aligns with this E11 phase (schema promotion resolves the drift). |
| 59 | @debrief/web-shell | `apps/web-shell/src/mocks/stacService.ts:39` | `StacCatalog` | interface `StacCatalog` | Open #223 — drift cluster "StacCatalog" aligns with this E11 phase (schema promotion resolves the drift). |
| 60 | @debrief/web-shell | `apps/web-shell/src/StylingTools.stories.tsx:69` | `Story` | type alias = `StoryObj<typeof App>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 61 | @debrief/web-shell | `apps/web-shell/src/tools/region/analysis/areaSummary.ts:12` | `Position` | type alias = `number[]` | Open #226 — drift cluster "Position" (2 members). |
| 62 | debrief-loader | `apps/loader/src/main/ipc/config.ts:13` | `DebriefConfig` | interface `DebriefConfig` | Open #226 — drift cluster "DebriefConfig" (2 members). |
| 63 | debrief-loader | `apps/loader/src/renderer/types/results.ts:74` | `ParseResult` | interface `ParseResult` | Open #225 — drift cluster "ParseResult" aligns with this E11 phase (schema promotion resolves the drift). |
| 64 | debrief-loader | `apps/loader/src/renderer/types/state.ts:32` | `WizardStep` | type alias = `\| 'store-selection' \| 'plot-configuration' \| 'processing' \| 'complete…` | Open #226 — drift cluster "WizardStep" (2 members). |
| 65 | debrief-loader | `apps/loader/stories/App.stories.tsx:30` | `WizardStep` | type alias = `'store-selection' \| 'plot-configuration' \| 'processing' \| 'complete' …` | Open #226 — drift cluster "WizardStep" (2 members). |
| 66 | debrief-loader | `apps/loader/stories/App.stories.tsx:181` | `Story` | type alias = `StoryObj<typeof InteractiveWizard>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 67 | debrief-loader | `apps/loader/stories/ErrorView.stories.tsx:24` | `Story` | type alias = `StoryObj<typeof ErrorView>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 68 | debrief-loader | `apps/loader/stories/PlotCard.stories.tsx:24` | `Story` | type alias = `StoryObj<typeof PlotCard>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 69 | debrief-loader | `apps/loader/stories/PlotConfig.stories.tsx:38` | `Story` | type alias = `StoryObj<typeof PlotConfig>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 70 | debrief-loader | `apps/loader/stories/ProgressView.stories.tsx:21` | `Story` | type alias = `StoryObj<typeof ProgressView>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 71 | debrief-loader | `apps/loader/stories/StoreCard.stories.tsx:24` | `Story` | type alias = `StoryObj<typeof StoreCard>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 72 | debrief-loader | `apps/loader/stories/StoreSelector.stories.tsx:52` | `Story` | type alias = `StoryObj<typeof StoreSelector>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 73 | debrief-loader | `apps/loader/stories/SuccessView.stories.tsx:21` | `Story` | type alias = `StoryObj<typeof SuccessView>` | Fold into #227 — Story is a well-understood per-file convention (not semantic drift). |
| 74 | debrief-vscode | `apps/vscode/src/panels/catalogOverviewPanel.ts:59` | `PropertiesCommitMessage` | interface `PropertiesCommitMessage` | Open #226 — drift cluster "PropertiesCommitMessage" (3 members). |
| 75 | debrief-vscode | `apps/vscode/src/services/configService.ts:20` | `DebriefConfig` | interface `DebriefConfig` | Open #226 — drift cluster "DebriefConfig" (2 members). |
| 76 | debrief-vscode | `apps/vscode/src/services/resultsPanelService.ts:45` | `ResultTab` | interface `ResultTab` | Open #226 — drift cluster "ResultTab" (2 members). |
| 77 | debrief-vscode | `apps/vscode/src/services/sceneThumbnailService.ts:62` | `StacItem` | interface `StacItem` | Open #223 — drift cluster "StacItem" aligns with this E11 phase (schema promotion resolves the drift). |
| 78 | debrief-vscode | `apps/vscode/src/tools/reference/classification/pointInZoneClassifier.ts:15` | `PointMetadataEntry` | interface `PointMetadataEntry` | Open #226 — drift cluster "PointMetadataEntry" (2 members). |
| 79 | debrief-vscode | `apps/vscode/src/tools/reference/generation/generateReferencePoints.ts:22` | `PointMetadataEntry` | interface `PointMetadataEntry` | Open #226 — drift cluster "PointMetadataEntry" (2 members). |
| 80 | debrief-vscode | `apps/vscode/src/tools/track/manipulation/generateCoursesSpeeds.ts:74` | `Position` | interface `Position` | Open #226 — drift cluster "Position" (2 members). |
| 81 | debrief-vscode | `apps/vscode/src/types/import.ts:71` | `ParseResult` | interface `ParseResult` | Open #225 — drift cluster "ParseResult" aligns with this E11 phase (schema promotion resolves the drift). |
| 82 | debrief-vscode | `apps/vscode/src/types/plot.ts:30` | `Plot` | interface `Plot` | Open #226 — drift cluster "Plot" (2 members). |
| 83 | debrief-vscode | `apps/vscode/src/types/plot.ts:160` | `PlotTimeRange` | interface `PlotTimeRange` | Open #226 — drift cluster "PlotTimeRange" (2 members). |
| 84 | debrief-vscode | `apps/vscode/src/types/stac.ts:114` | `StacItem` | interface `StacItem` | Open #223 — drift cluster "StacItem" aligns with this E11 phase (schema promotion resolves the drift). |
| 85 | debrief-vscode | `apps/vscode/src/types/stac.ts:153` | `StacCatalog` | interface `StacCatalog` | Open #223 — drift cluster "StacCatalog" aligns with this E11 phase (schema promotion resolves the drift). |
| 86 | debrief-vscode | `apps/vscode/src/types/tool.ts:26` | `ToolParameter` | interface `ToolParameter` | Open #222 — drift cluster "ToolParameter" aligns with this E11 phase (schema promotion resolves the drift). |
| 87 | debrief-vscode | `apps/vscode/src/types/tool.ts:64` | `MatchResult` | interface `MatchResult` | Open #226 — drift cluster "MatchResult" (2 members). |
| 88 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:86` | `PropertiesCommitMessage` | interface `PropertiesCommitMessage` | Open #226 — drift cluster "PropertiesCommitMessage" (3 members). |
| 89 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:93` | `WebviewReadyMessage` | interface `WebviewReadyMessage` | Open #226 — drift cluster "WebviewReadyMessage" (4 members). |
| 90 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:97` | `WebviewMessage` | type alias = `\| TemporalSeekMessage \| TemporalPlayMessage \| TemporalPauseMessage \| …` | Open #226 — drift cluster "WebviewMessage" (4 members). |
| 91 | debrief-vscode | `apps/vscode/src/views/resultsPanelView.ts:12` | `IncomingMessage` | interface `IncomingMessage` | Open #226 — drift cluster "IncomingMessage" (2 members). |
| 92 | debrief-vscode | `apps/vscode/src/views/timeRangeView.ts:39` | `WebviewReadyMessage` | interface `WebviewReadyMessage` | Open #226 — drift cluster "WebviewReadyMessage" (4 members). |
| 93 | debrief-vscode | `apps/vscode/src/views/timeRangeView.ts:43` | `WebviewMessage` | type alias = `\| TimeChangeMessage \| PlaybackStateChangeMessage \| DisplayModeChangeM…` | Open #226 — drift cluster "WebviewMessage" (4 members). |
| 94 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:68` | `WebviewReadyMessage` | interface `WebviewReadyMessage` | Open #226 — drift cluster "WebviewReadyMessage" (4 members). |
| 95 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:79` | `WebviewMessage` | type alias = `\| LogPanelMessage \| TuneRequestMessage \| RevertToRequestMessage \| Rev…` | Open #226 — drift cluster "WebviewMessage" (4 members). |
| 96 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:142` | `ExtensionMessage` | type alias = `\| ExtensionToWebviewMessage \| ReplayProgressMessage \| ReplayResultMes…` | Open #226 — drift cluster "ExtensionMessage" (4 members). |
| 97 | debrief-vscode | `apps/vscode/src/webview/messages.ts:117` | `SetCurrentTimeMessage` | interface `SetCurrentTimeMessage` | Open #226 — drift cluster "SetCurrentTimeMessage" (2 members). |
| 98 | debrief-vscode | `apps/vscode/src/webview/messages.ts:217` | `WebviewReadyMessage` | interface `WebviewReadyMessage` | Open #226 — drift cluster "WebviewReadyMessage" (4 members). |
| 99 | debrief-vscode | `apps/vscode/src/webview/messages.ts:422` | `ExtensionToWebviewMessage` | type alias = `\| LoadPlotMessage \| SetSelectionMessage \| ClearSelectionMessage \| Add…` | Open #226 — drift cluster "ExtensionToWebviewMessage" (2 members). |
| 100 | debrief-vscode | `apps/vscode/src/webview/web/activityPanel.tsx:85` | `ExtensionMessage` | type alias = `\| TemporalUpdateMessage \| ToolsUpdateMessage \| LayersUpdateMessage \| …` | Open #226 — drift cluster "ExtensionMessage" (4 members). |
| 101 | debrief-vscode | `apps/vscode/src/webview/web/resultsPanel.tsx:83` | `IncomingMessage` | type alias = `\| SetTabsMessage \| SetVisibilityMessage \| SetLoadingMessage` | Open #226 — drift cluster "IncomingMessage" (2 members). |
| 102 | debrief-vscode | `apps/vscode/src/webview/web/storyboardPanel.tsx:36` | `ExtensionMessage` | type alias = `ScenesMessage \| CaptureInFlightMessage \| ThemeMessage` | Open #226 — drift cluster "ExtensionMessage" (4 members). |
| 103 | debrief-vscode | `apps/vscode/src/webview/web/timeController.tsx:21` | `WebviewMessage` | interface `WebviewMessage` | Open #226 — drift cluster "WebviewMessage" (4 members). |
| 104 | debrief-vscode | `apps/vscode/src/webview/web/timeController.tsx:34` | `SetCurrentTimeMessage` | interface `SetCurrentTimeMessage` | Open #226 — drift cluster "SetCurrentTimeMessage" (2 members). |
| 105 | debrief-vscode | `apps/vscode/src/webview/web/timeController.tsx:44` | `ExtensionMessage` | type alias = `TimeExtentMessage \| SetCurrentTimeMessage \| SetUIStateMessage` | Open #226 — drift cluster "ExtensionMessage" (4 members). |
| 106 | debrief-vscode | `apps/vscode/src/webview/web/timeController.tsx:47` | `TimeControllerState` | interface `TimeControllerState` | Open #226 — drift cluster "TimeControllerState" (2 members). |


### 3.3 Boundary / parse-time loose (5)

| # | Package | File : Line | Name | Summary | Recommended action |
|---|---------|-------------|------|---------|---------------------|
| 1 | @debrief/components | `shared/components/src/nl-cql2/types.ts:17` | `Cql2Json` | type alias bottoming out in `Record<string, unknown>` | Confirm boundary use is intentional; if the shape is knowable, promote to LinkML in a future E11 phase (no current backlog home). |
| 2 | @debrief/components | `shared/components/src/PropertiesPanel/messageTypes.ts:8` | `FieldValue` | type alias bottoming out in `unknown` | Confirm boundary use is intentional; if the shape is knowable, promote to LinkML in a future E11 phase (no current backlog home). |
| 3 | @debrief/components | `shared/components/src/PropertiesPanel/schemaResolver.ts:13` | `UnknownRecord` | type alias bottoming out in `Record<string, unknown>` | Confirm boundary use is intentional; if the shape is knowable, promote to LinkML in a future E11 phase (no current backlog home). |
| 4 | @debrief/components | `shared/components/src/PropertiesPanel/types.ts:10` | `FieldValue` | type alias bottoming out in `unknown` | Confirm boundary use is intentional; if the shape is knowable, promote to LinkML in a future E11 phase (no current backlog home). |
| 5 | @debrief/data | `shared/data/src/ts/registry.ts:26` | `TreeNode` | type alias bottoming out in `Record<string, unknown>` | Confirm boundary use is intentional; if the shape is knowable, promote to LinkML in a future E11 phase (no current backlog home). |


### 3.4 Schema-rooted (260)

| # | Package | File : Line | Name | Summary | Recommended action |
|---|---------|-------------|------|---------|---------------------|
| 1 | @debrief/components | `shared/components/src/ActivityPanel/ActivityPanel.tsx:34` | `SectionErrorBoundaryProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 2 | @debrief/components | `shared/components/src/ActivityPanel/ActivityPanel.tsx:39` | `SectionErrorBoundaryState` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 3 | @debrief/components | `shared/components/src/ActivityPanel/ActivityPanel.tsx:78` | `PaneSectionProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 4 | @debrief/components | `shared/components/src/ActivityPanel/ActivityPanel.tsx:121` | `ResizeHandleProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 5 | @debrief/components | `shared/components/src/ActivityPanel/types.ts:18` | `ActivityPanelCollapseState` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 6 | @debrief/components | `shared/components/src/ActivityPanel/types.ts:38` | `ToolsPanelItem` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 7 | @debrief/components | `shared/components/src/ActivityPanel/types.ts:56` | `ToolsPanelProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 8 | @debrief/components | `shared/components/src/ActivityPanel/types.ts:72` | `ActivityPanelMessage` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 9 | @debrief/components | `shared/components/src/ActivityPanel/types.ts:88` | `ActivityPanelProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 10 | @debrief/components | `shared/components/src/ExerciseListView/types.ts:22` | `ExerciseListItem` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 11 | @debrief/components | `shared/components/src/ExerciseListView/types.ts:37` | `RecentlyOpenedEntry` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 12 | @debrief/components | `shared/components/src/ExerciseListView/types.ts:55` | `SortDimension` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 13 | @debrief/components | `shared/components/src/ExerciseListView/types.ts:58` | `SortDirection` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 14 | @debrief/components | `shared/components/src/ExerciseListView/types.ts:61` | `SortConfiguration` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 15 | @debrief/components | `shared/components/src/ExerciseListView/types.ts:67` | `ExerciseListViewProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 16 | @debrief/components | `shared/components/src/ExerciseListView/types.ts:112` | `ExerciseListItemRowProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 17 | @debrief/components | `shared/components/src/ExerciseListView/types.ts:136` | `ThumbnailSize` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 18 | @debrief/components | `shared/components/src/ExerciseListView/types.ts:139` | `ThumbnailSizeConfig` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 19 | @debrief/components | `shared/components/src/ExerciseListView/types.ts:148` | `SpatialThumbnailProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 20 | @debrief/components | `shared/components/src/FeatureList/flattenFeatures.ts:24` | `DisplayItemType` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 21 | @debrief/components | `shared/components/src/FeatureList/flattenFeatures.ts:26` | `DisplayItem` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 22 | @debrief/components | `shared/components/src/filter-engine/matchers.ts:108` | `MatcherFn` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 23 | @debrief/components | `shared/components/src/filter-engine/types.ts:25` | `CatalogOverviewItem` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 24 | @debrief/components | `shared/components/src/filter-engine/types.ts:53` | `PlatformField` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 25 | @debrief/components | `shared/components/src/filter-engine/types.ts:56` | `CompoundPredicate` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 26 | @debrief/components | `shared/components/src/filter-engine/types.ts:62` | `ArrayFilterPredicate` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 27 | @debrief/components | `shared/components/src/filter-engine/types.ts:69` | `FilterType` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 28 | @debrief/components | `shared/components/src/filter-engine/types.ts:84` | `DurationBucket` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 29 | @debrief/components | `shared/components/src/filter-engine/types.ts:87` | `ModifiedBucket` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 30 | @debrief/components | `shared/components/src/filter-engine/types.ts:90` | `Predicate` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 31 | @debrief/components | `shared/components/src/filter-engine/types.ts:97` | `OrGroup` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 32 | @debrief/components | `shared/components/src/filter-engine/types.ts:102` | `FilterExpression` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 33 | @debrief/components | `shared/components/src/filter-engine/types.ts:112` | `StacBrowserItem` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 34 | @debrief/components | `shared/components/src/filter-engine/types.ts:123` | `VesselTaxonomyNode` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 35 | @debrief/components | `shared/components/src/filter-engine/types.ts:130` | `FilterEngineConfig` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 36 | @debrief/components | `shared/components/src/filter-engine/types.ts:135` | `FilterEngine` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 37 | @debrief/components | `shared/components/src/LayersToolbar/fixtures/tools.ts:9` | `ToolWithCategory` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 38 | @debrief/components | `shared/components/src/LogPanel/types.ts:15` | `OperationCategory` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 39 | @debrief/components | `shared/components/src/LogPanel/types.ts:20` | `ToolCategory` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 40 | @debrief/components | `shared/components/src/LogPanel/types.ts:25` | `ParamType` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 41 | @debrief/components | `shared/components/src/LogPanel/types.ts:33` | `ToolCategoryConfig` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 42 | @debrief/components | `shared/components/src/LogPanel/types.ts:43` | `ParamChipData` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 43 | @debrief/components | `shared/components/src/LogPanel/types.ts:58` | `ViewMode` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 44 | @debrief/components | `shared/components/src/LogPanel/types.ts:72` | `TimelineEntry` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 45 | @debrief/components | `shared/components/src/LogPanel/types.ts:94` | `FeatureDisplayInfo` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 46 | @debrief/components | `shared/components/src/LogPanel/types.ts:124` | `ActionType` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 47 | @debrief/components | `shared/components/src/LogPanel/types.ts:131` | `ParameterSchemaEntry` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 48 | @debrief/components | `shared/components/src/LogPanel/types.ts:148` | `CardReplayStatus` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 49 | @debrief/components | `shared/components/src/LogPanel/types.ts:152` | `LogPanelMessage` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 50 | @debrief/components | `shared/components/src/LogPanel/types.ts:160` | `TimelineUpdatePayload` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 51 | @debrief/components | `shared/components/src/LogPanel/types.ts:165` | `SessionChangePayload` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 52 | @debrief/components | `shared/components/src/LogPanel/types.ts:170` | `SelectionUpdatePayload` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 53 | @debrief/components | `shared/components/src/LogPanel/types.ts:174` | `ActionResultPayload` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 54 | @debrief/components | `shared/components/src/LogPanel/types.ts:180` | `ModeInitPayload` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 55 | @debrief/components | `shared/components/src/LogPanel/types.ts:201` | `LogPanelProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 56 | @debrief/components | `shared/components/src/LogPanel/types.ts:263` | `LogEntryProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 57 | @debrief/components | `shared/components/src/LogPanel/types.ts:305` | `LogFilterRowProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 58 | @debrief/components | `shared/components/src/LogPanel/types.ts:315` | `LogActionBarProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 59 | @debrief/components | `shared/components/src/LogPanel/types.ts:326` | `ToolCategoryIconProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 60 | @debrief/components | `shared/components/src/LogPanel/types.ts:335` | `ParameterChipProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 61 | @debrief/components | `shared/components/src/LogPanel/types.ts:343` | `TrackBadgeProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 62 | @debrief/components | `shared/components/src/LogPanel/types.ts:352` | `SnapshotBoundaryProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 63 | @debrief/components | `shared/components/src/MapView/drawing/createDrawnFeature.ts:20` | `DrawnFeatureProvenance` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 64 | @debrief/components | `shared/components/src/MapView/drawing/createDrawnFeature.ts:27` | `CreateDrawnFeatureOptions` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 65 | @debrief/components | `shared/components/src/MapView/PositionSymbolsLayer.tsx:29` | `SymbolShape` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 66 | @debrief/components | `shared/components/src/MapView/PositionSymbolsLayer.tsx:31` | `PositionSymbolsLayerProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 67 | @debrief/components | `shared/components/src/MapView/sensor-utils.ts:49` | `SensorRenderContact` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 68 | @debrief/components | `shared/components/src/MapView/sensor-utils.ts:69` | `SensorArcRenderData` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 69 | @debrief/components | `shared/components/src/MapView/sensor-utils.ts:82` | `SensorBearingLayerProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 70 | @debrief/components | `shared/components/src/MapView/SensorBearingLayer.tsx:34` | `SensorCanvasLayerInstance` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 71 | @debrief/components | `shared/components/src/StacBrowser/StacBrowser.tsx:333` | `BrowserPanelContext` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 72 | @debrief/components | `shared/components/src/StacBrowser/useBrowserFilter.ts:18` | `UseBrowserFilterArgs` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 73 | @debrief/components | `shared/components/src/storyboard/crud.ts:283` | `CreateStoryboardInput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 74 | @debrief/components | `shared/components/src/storyboard/crud.ts:339` | `RenameStoryboardInput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 75 | @debrief/components | `shared/components/src/storyboard/crud.ts:385` | `DeleteStoryboardInput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 76 | @debrief/components | `shared/components/src/storyboard/crud.ts:448` | `CreateSceneInput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 77 | @debrief/components | `shared/components/src/storyboard/crud.ts:549` | `UpdateScenePatch` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 78 | @debrief/components | `shared/components/src/storyboard/crud.ts:559` | `UpdateSceneInput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 79 | @debrief/components | `shared/components/src/storyboard/crud.ts:658` | `DeleteSceneInput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 80 | @debrief/components | `shared/components/src/storyboard/crud.ts:701` | `DuplicateSceneInput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 81 | @debrief/components | `shared/components/src/storyboard/crud.ts:777` | `CopySceneToOtherStoryboardInput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 82 | @debrief/components | `shared/components/src/storyboard/provenance.ts:27` | `StoryboardCrudOp` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 83 | @debrief/components | `shared/components/src/storyboard/provenance.ts:39` | `StoryboardCrudLogEntryInput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 84 | @debrief/components | `shared/components/src/storyboard/types.ts:20` | `Brand` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 85 | @debrief/components | `shared/components/src/storyboard/types.ts:22` | `Ulid` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 86 | @debrief/components | `shared/components/src/storyboard/types.ts:23` | `StoryboardId` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 87 | @debrief/components | `shared/components/src/storyboard/types.ts:24` | `SceneId` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 88 | @debrief/components | `shared/components/src/storyboard/types.ts:31` | `PlotFeature` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 89 | @debrief/components | `shared/components/src/TimeController/types.ts:13` | `PlaybackSpeed` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 90 | @debrief/components | `shared/components/src/TimeController/types.ts:18` | `UIState` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 91 | @debrief/components | `shared/components/src/TimeController/types.ts:23` | `UseTimePlaybackOptions` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 92 | @debrief/components | `shared/components/src/TimeController/types.ts:41` | `UseTimePlaybackResult` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 93 | @debrief/components | `shared/components/src/TimeController/types.ts:71` | `TimeDisplayProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 94 | @debrief/components | `shared/components/src/TimeController/types.ts:81` | `TimeScrubberProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 95 | @debrief/components | `shared/components/src/TimeController/types.ts:97` | `PlaybackControlsProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 96 | @debrief/components | `shared/components/src/TimeController/types.ts:111` | `SpeedSelectorProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 97 | @debrief/components | `shared/components/src/TimeController/types.ts:125` | `DisplayModeToggleProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 98 | @debrief/components | `shared/components/src/TimeController/types.ts:139` | `TimeControllerProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 99 | @debrief/components | `shared/components/src/ToolMatch/ToolMatchHarness/ToolMatchHarness.tsx:17` | `ToolMatchHarnessProps` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 100 | @debrief/components | `shared/components/src/ToolMatch/types.ts:17` | `Selection` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 101 | @debrief/components | `shared/components/src/utils/types.ts:85` | `TimeExtent` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 102 | @debrief/components | `shared/components/src/utils/types.ts:90` | `SelectionState` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 103 | @debrief/session-state | `services/session-state/src/persistence/load.ts:36` | `LoadResult` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 104 | @debrief/session-state | `services/session-state/src/persistence/load.ts:46` | `SessionFile` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 105 | @debrief/session-state | `services/session-state/src/server/tools/setViewport.ts:11` | `SetViewportInput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 106 | @debrief/session-state | `services/session-state/src/server/tools/setViewport.ts:20` | `SetViewportOutput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 107 | @debrief/session-state | `services/session-state/src/store/slices/results.ts:16` | `ResultsSliceWithActions` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 108 | @debrief/session-state | `services/session-state/src/store/slices/spatial.ts:20` | `SpatialSliceWithActions` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 109 | @debrief/session-state | `services/session-state/src/store/slices/temporal.ts:23` | `TemporalSliceWithActions` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 110 | @debrief/session-state | `services/session-state/src/store/subscriptions.ts:21` | `Selector` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 111 | @debrief/session-state | `services/session-state/src/store/subscriptions.ts:26` | `EqualityFn` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 112 | @debrief/session-state | `services/session-state/src/types/results.ts:25` | `LastToolExecution` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 113 | @debrief/session-state | `services/session-state/src/types/results.ts:41` | `ResultsSlice` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 114 | @debrief/session-state | `services/session-state/src/types/results.ts:59` | `ResultsActions` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 115 | @debrief/session-state | `services/session-state/src/types/spatial.ts:27` | `SpatialSlice` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 116 | @debrief/session-state | `services/session-state/src/types/spatial.ts:51` | `SpatialActions` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 117 | @debrief/session-state | `services/session-state/src/types/spatial.ts:64` | `DrawingMode` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 118 | @debrief/session-state | `services/session-state/src/types/temporal.ts:16` | `TimeInstant` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 119 | @debrief/session-state | `services/session-state/src/types/temporal.ts:68` | `TimeRange` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 120 | @debrief/session-state | `services/session-state/src/types/temporal.ts:87` | `TimeUnit` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 121 | @debrief/session-state | `services/session-state/src/types/temporal.ts:96` | `TimeStep` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 122 | @debrief/session-state | `services/session-state/src/types/temporal.ts:119` | `TemporalSlice` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 123 | @debrief/session-state | `services/session-state/src/types/temporal.ts:153` | `TemporalActions` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 124 | @debrief/utils | `shared/utils/src/bounds.ts:51` | `BoundsInputFeature` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 125 | @debrief/utils | `shared/utils/src/bounds.ts:66` | `BoundsInput` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 126 | @debrief/utils | `shared/utils/src/bounds.ts:75` | `CoordinateTree` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 127 | @debrief/utils | `shared/utils/src/types.ts:20` | `PointShape` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 128 | @debrief/utils | `shared/utils/src/types.ts:25` | `Bounds` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 129 | @debrief/utils | `shared/utils/src/types.ts:31` | `SafeGeometry` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 130 | @debrief/utils | `shared/utils/src/types.ts:40` | `SafeFeature` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 131 | @debrief/utils | `shared/utils/src/types.ts:50` | `SafeFeatureCollection` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 132 | @debrief/utils | `shared/utils/src/types.ts:62` | `ResolvedPositionStyle` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 133 | @debrief/utils | `shared/utils/src/types.ts:77` | `AxisDefinition` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 134 | @debrief/utils | `shared/utils/src/types.ts:86` | `DatasetMetadata` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 135 | @debrief/utils | `shared/utils/src/types.ts:94` | `DataSeries` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 136 | @debrief/utils | `shared/utils/src/types.ts:104` | `DatasetEnvelope` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 137 | @debrief/web-shell | `apps/web-shell/src/App.tsx:87` | `StyleObj` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 138 | @debrief/web-shell | `apps/web-shell/src/App.tsx:88` | `OverridesObj` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 139 | @debrief/web-shell | `apps/web-shell/src/App.tsx:112` | `View` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 140 | @debrief/web-shell | `apps/web-shell/src/App.tsx:115` | `PlotState` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 141 | @debrief/web-shell | `apps/web-shell/src/mocks/stacService.ts:105` | `MockStacService` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 142 | @debrief/web-shell | `apps/web-shell/src/services/toolService.ts:193` | `ValidationError` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 143 | @debrief/web-shell | `apps/web-shell/src/services/toolService.ts:317` | `ToolExecuteFn` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 144 | @debrief/web-shell | `apps/web-shell/src/services/toolService.ts:322` | `ToolRegistryEntry` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 145 | @debrief/web-shell | `apps/web-shell/src/tools/sensor/detection/bufferZoneGenerator.ts:14` | `BufferZoneParams` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 146 | @debrief/web-shell | `apps/web-shell/src/tools/sensor/detection/bufferZoneGenerator.ts:21` | `SensorModelZone` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 147 | @debrief/web-shell | `apps/web-shell/src/tools/sensor/detection/bufferZoneGenerator.ts:27` | `SensorModel` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 148 | @debrief/web-shell | `apps/web-shell/src/tools/shape/manipulation/moveShape.ts:9` | `MoveShapeParams` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 149 | @debrief/web-shell | `apps/web-shell/src/tools/track/analysis/trackStats.ts:64` | `DistanceUnit` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 150 | debrief-loader | `apps/loader/src/renderer/types/results.ts:18` | `LoaderErrorCode` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 151 | debrief-loader | `apps/loader/src/renderer/types/results.ts:31` | `LoaderLoadResult` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 152 | debrief-loader | `apps/loader/src/renderer/types/results.ts:54` | `LoaderError` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 153 | debrief-loader | `apps/loader/src/renderer/types/results.ts:93` | `WriteResult` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 154 | debrief-vscode | `apps/vscode/src/services/calcService.ts:74` | `ConnectionState` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 155 | debrief-vscode | `apps/vscode/src/services/calcService.ts:77` | `ToolCacheEntry` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 156 | debrief-vscode | `apps/vscode/src/services/sessionManager.ts:74` | `PlotSessionData` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 157 | debrief-vscode | `apps/vscode/src/services/stacService.ts:85` | `UpdateItemMetadataInput` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 158 | debrief-vscode | `apps/vscode/src/services/stacService.ts:94` | `UpdateItemMetadataResult` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 159 | debrief-vscode | `apps/vscode/src/tools/reference/generation/generateReferencePoints.ts:16` | `GenerateReferencePointsParams` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 160 | debrief-vscode | `apps/vscode/src/tools/shape/manipulation/enlargeShape.ts:12` | `EnlargeShapeParams` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 161 | debrief-vscode | `apps/vscode/src/tools/shape/manipulation/moveShape.ts:10` | `MoveShapeParams` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 162 | debrief-vscode | `apps/vscode/src/tools/track/styling/applySymbolStyle.ts:16` | `ApplySymbolStyleParams` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 163 | debrief-vscode | `apps/vscode/src/tools/track/styling/labelInterval.ts:10` | `LabelIntervalParams` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 164 | debrief-vscode | `apps/vscode/src/tools/track/styling/setTrackColor.ts:10` | `SetTrackColorParams` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 165 | debrief-vscode | `apps/vscode/src/tools/track/styling/symbolInterval.ts:10` | `SymbolIntervalParams` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 166 | debrief-vscode | `apps/vscode/src/types/plot.ts:68` | `TrackViewModel` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 167 | debrief-vscode | `apps/vscode/src/types/plot.ts:119` | `ReferenceLocationViewModel` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 168 | debrief-vscode | `apps/vscode/src/types/plot.ts:143` | `MapSelection` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 169 | debrief-vscode | `apps/vscode/src/types/plot.ts:177` | `MapViewState` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 170 | debrief-vscode | `apps/vscode/src/types/plot.ts:200` | `RecentPlot` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 171 | debrief-vscode | `apps/vscode/src/types/stac.ts:11` | `StoreStatus` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 172 | debrief-vscode | `apps/vscode/src/types/stac.ts:16` | `StacStore` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 173 | debrief-vscode | `apps/vscode/src/types/stac.ts:36` | `Catalog` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 174 | debrief-vscode | `apps/vscode/src/types/stac.ts:67` | `StacItemSummary` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 175 | debrief-vscode | `apps/vscode/src/types/stac.ts:133` | `StacLink` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 176 | debrief-vscode | `apps/vscode/src/types/stac.ts:143` | `StacAsset` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 177 | debrief-vscode | `apps/vscode/src/types/stac.ts:165` | `StacExtent` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 178 | debrief-vscode | `apps/vscode/src/types/stac.ts:179` | `StacSummaries` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 179 | debrief-vscode | `apps/vscode/src/types/stac.ts:188` | `StacCollection` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 180 | debrief-vscode | `apps/vscode/src/types/stac.ts:203` | `StacCatalogOrCollection` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 181 | debrief-vscode | `apps/vscode/src/types/tool.ts:18` | `SelectionRequirement` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 182 | debrief-vscode | `apps/vscode/src/types/tool.ts:48` | `Tool` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 183 | debrief-vscode | `apps/vscode/src/types/tool.ts:58` | `ToolSelection` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 184 | debrief-vscode | `apps/vscode/src/types/tool.ts:212` | `ToolExecutionStatus` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 185 | debrief-vscode | `apps/vscode/src/types/tool.ts:222` | `ToolExecution` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 186 | debrief-vscode | `apps/vscode/src/types/tool.ts:257` | `LayerStyle` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 187 | debrief-vscode | `apps/vscode/src/types/tool.ts:277` | `ResultLayer` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 188 | debrief-vscode | `apps/vscode/src/types/tool.ts:321` | `ToolProvenance` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 189 | debrief-vscode | `apps/vscode/src/types/tool.ts:344` | `ToolExecutionRequest` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 190 | debrief-vscode | `apps/vscode/src/types/tool.ts:358` | `ToolExecutionResult` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 191 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:34` | `TemporalSeekMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 192 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:39` | `TemporalPlayMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 193 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:44` | `TemporalPauseMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 194 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:48` | `TemporalDisplayModeMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 195 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:53` | `ToolRunMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 196 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:58` | `LayerToggleVisibilityMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 197 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:63` | `LayerDeleteMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 198 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:68` | `LayerSelectMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 199 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:73` | `LayerFormatMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 200 | debrief-vscode | `apps/vscode/src/views/activityPanelView.ts:78` | `FileActionMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 201 | debrief-vscode | `apps/vscode/src/views/timeRangeView.ts:24` | `TimeChangeMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 202 | debrief-vscode | `apps/vscode/src/views/timeRangeView.ts:29` | `PlaybackStateChangeMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 203 | debrief-vscode | `apps/vscode/src/views/timeRangeView.ts:34` | `DisplayModeChangeMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 204 | debrief-vscode | `apps/vscode/src/webview/messages.ts:19` | `Message` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 205 | debrief-vscode | `apps/vscode/src/webview/messages.ts:24` | `RequestMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 206 | debrief-vscode | `apps/vscode/src/webview/messages.ts:29` | `ResponseMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 207 | debrief-vscode | `apps/vscode/src/webview/messages.ts:40` | `LoadPlotMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 208 | debrief-vscode | `apps/vscode/src/webview/messages.ts:52` | `SetSelectionMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 209 | debrief-vscode | `apps/vscode/src/webview/messages.ts:58` | `ClearSelectionMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 210 | debrief-vscode | `apps/vscode/src/webview/messages.ts:63` | `AddResultLayerMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 211 | debrief-vscode | `apps/vscode/src/webview/messages.ts:74` | `UpdatePlotFeaturesMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 212 | debrief-vscode | `apps/vscode/src/webview/messages.ts:80` | `RemoveResultLayerMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 213 | debrief-vscode | `apps/vscode/src/webview/messages.ts:86` | `SetLayerVisibilityMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 214 | debrief-vscode | `apps/vscode/src/webview/messages.ts:93` | `FitBoundsMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 215 | debrief-vscode | `apps/vscode/src/webview/messages.ts:99` | `SetTimeRangeMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 216 | debrief-vscode | `apps/vscode/src/webview/messages.ts:108` | `SetViewportMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 217 | debrief-vscode | `apps/vscode/src/webview/messages.ts:123` | `SetDisplayModeMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 218 | debrief-vscode | `apps/vscode/src/webview/messages.ts:130` | `SetHiddenIdsMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 219 | debrief-vscode | `apps/vscode/src/webview/messages.ts:136` | `SetTrackColorMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 220 | debrief-vscode | `apps/vscode/src/webview/messages.ts:143` | `SetDrawingModeMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 221 | debrief-vscode | `apps/vscode/src/webview/messages.ts:149` | `SetDrawingPaletteIndexMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 222 | debrief-vscode | `apps/vscode/src/webview/messages.ts:155` | `RequestExportPngResponse` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 223 | debrief-vscode | `apps/vscode/src/webview/messages.ts:160` | `RequestTrackDetailsResponse` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 224 | debrief-vscode | `apps/vscode/src/webview/messages.ts:177` | `SelectionChangedMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 225 | debrief-vscode | `apps/vscode/src/webview/messages.ts:187` | `ViewStateChangedMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 226 | debrief-vscode | `apps/vscode/src/webview/messages.ts:199` | `RequestExportPngRequest` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 227 | debrief-vscode | `apps/vscode/src/webview/messages.ts:204` | `RequestTrackColorChangeMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 228 | debrief-vscode | `apps/vscode/src/webview/messages.ts:211` | `RequestTrackDetailsRequest` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 229 | debrief-vscode | `apps/vscode/src/webview/messages.ts:222` | `RequestUndoMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 230 | debrief-vscode | `apps/vscode/src/webview/messages.ts:227` | `RequestRedoMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 231 | debrief-vscode | `apps/vscode/src/webview/messages.ts:232` | `FeatureDrawnMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 232 | debrief-vscode | `apps/vscode/src/webview/messages.ts:248` | `DrawingModeChangedMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 233 | debrief-vscode | `apps/vscode/src/webview/messages.ts:254` | `ViewportChangedMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 234 | debrief-vscode | `apps/vscode/src/webview/messages.ts:271` | `RepFileDropMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 235 | debrief-vscode | `apps/vscode/src/webview/messages.ts:277` | `ImportProgressMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 236 | debrief-vscode | `apps/vscode/src/webview/messages.ts:284` | `ImportCompleteMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 237 | debrief-vscode | `apps/vscode/src/webview/messages.ts:295` | `RequestThumbnailCaptureMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 238 | debrief-vscode | `apps/vscode/src/webview/messages.ts:300` | `ThumbnailCaptureResponseMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 239 | debrief-vscode | `apps/vscode/src/webview/messages.ts:311` | `SaveResultMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 240 | debrief-vscode | `apps/vscode/src/webview/messages.ts:318` | `SaveResultAsMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 241 | debrief-vscode | `apps/vscode/src/webview/messages.ts:327` | `RetryToolMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 242 | debrief-vscode | `apps/vscode/src/webview/messages.ts:333` | `ResultSavedMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 243 | debrief-vscode | `apps/vscode/src/webview/messages.ts:348` | `ResultsTabSnapshot` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 244 | debrief-vscode | `apps/vscode/src/webview/messages.ts:363` | `ResultsSetTabsMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 245 | debrief-vscode | `apps/vscode/src/webview/messages.ts:372` | `ResultsSetVisibilityMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 246 | debrief-vscode | `apps/vscode/src/webview/messages.ts:378` | `ResultsSetLoadingMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 247 | debrief-vscode | `apps/vscode/src/webview/messages.ts:384` | `ResultsWebviewReadyMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 248 | debrief-vscode | `apps/vscode/src/webview/messages.ts:389` | `ResultsSaveMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 249 | debrief-vscode | `apps/vscode/src/webview/messages.ts:395` | `ResultsSaveAsMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 250 | debrief-vscode | `apps/vscode/src/webview/messages.ts:405` | `ResultsRetryMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 251 | debrief-vscode | `apps/vscode/src/webview/messages.ts:411` | `ResultsCloseTabMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 252 | debrief-vscode | `apps/vscode/src/webview/messages.ts:451` | `WebviewToExtensionMessage` | type alias in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 253 | debrief-vscode | `apps/vscode/src/webview/messages.ts:480` | `LoadExerciseListMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 254 | debrief-vscode | `apps/vscode/src/webview/messages.ts:486` | `ExerciseListItemMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 255 | debrief-vscode | `apps/vscode/src/webview/messages.ts:501` | `LoadRecentPlotsMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 256 | debrief-vscode | `apps/vscode/src/webview/messages.ts:507` | `RecentlyOpenedEntryMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 257 | debrief-vscode | `apps/vscode/src/webview/messages.ts:516` | `RequestTrackDataMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 258 | debrief-vscode | `apps/vscode/src/webview/messages.ts:523` | `TrackDataResponseMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 259 | debrief-vscode | `apps/vscode/src/webview/messages.ts:531` | `OpenExerciseMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |
| 260 | debrief-vscode | `apps/vscode/src/webview/messages.ts:537` | `ExerciseListReadyMessage` | interface in a file importing from `@debrief/schemas` | No action — already schema-rooted via `@debrief/schemas` import. |


### 3.5 Single-domain convenience (486)

| # | Package | File : Line | Name | Summary | Recommended action |
|---|---------|-------------|------|---------|---------------------|
| 1 | @debrief/components | `shared/components/src/CascadingMenu/CascadingMenu.tsx:4` | `CascadingMenuItem` | interface `CascadingMenuItem` | Keep — single-domain convenience type (no Python counterpart). |
| 2 | @debrief/components | `shared/components/src/CascadingMenu/CascadingMenu.tsx:16` | `CascadingMenuProps` | interface `CascadingMenuProps` | Keep — single-domain convenience type (no Python counterpart). |
| 3 | @debrief/components | `shared/components/src/CascadingMenu/CascadingMenu.tsx:30` | `SubmenuState` | interface `SubmenuState` | Keep — single-domain convenience type (no Python counterpart). |
| 4 | @debrief/components | `shared/components/src/CascadingMenu/CascadingMenu.tsx:301` | `SubmenuPanelProps` | interface `SubmenuPanelProps` | Keep — single-domain convenience type (no Python counterpart). |
| 5 | @debrief/components | `shared/components/src/CascadingMenu/SearchableCascadingMenu.tsx:14` | `SearchableCascadingMenuProps` | interface `SearchableCascadingMenuProps` | Keep — single-domain convenience type (no Python counterpart). |
| 6 | @debrief/components | `shared/components/src/ChartRenderer/ChartRenderer.tsx:5` | `ChartRendererProps` | interface `ChartRendererProps` | Keep — single-domain convenience type (no Python counterpart). |
| 7 | @debrief/components | `shared/components/src/ChartRenderer/transformer/types.ts:5` | `TransformerErrorType` | type alias = `'unsupported_type' \| 'invalid_schema' \| 'empty_data'` | Keep — single-domain convenience type (no Python counterpart). |
| 8 | @debrief/components | `shared/components/src/ChartRenderer/transformer/types.ts:8` | `TransformerError` | interface `TransformerError` | Keep — single-domain convenience type (no Python counterpart). |
| 9 | @debrief/components | `shared/components/src/ChartRenderer/transformer/types.ts:16` | `TransformResult` | type alias = `\| { ok: true; spec: TopLevelSpec } \| { ok: false; error: TransformerE…` | Keep — single-domain convenience type (no Python counterpart). |
| 10 | @debrief/components | `shared/components/src/ChartRenderer/transformer/types.ts:21` | `TransformFunction` | type alias = `(dataset: DatasetEnvelope) => TopLevelSpec` | Keep — single-domain convenience type (no Python counterpart). |
| 11 | @debrief/components | `shared/components/src/colour-engine/types.ts:11` | `DimensionType` | type alias = `'gradient' \| 'categorical'` | Keep — single-domain convenience type (no Python counterpart). |
| 12 | @debrief/components | `shared/components/src/colour-engine/types.ts:17` | `ColourDimension` | interface `ColourDimension` | Keep — single-domain convenience type (no Python counterpart). |
| 13 | @debrief/components | `shared/components/src/colour-engine/types.ts:32` | `ColourPalette` | interface `ColourPalette` | Keep — single-domain convenience type (no Python counterpart). |
| 14 | @debrief/components | `shared/components/src/colour-engine/types.ts:42` | `LegendEntry` | interface `LegendEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 15 | @debrief/components | `shared/components/src/colour-engine/types.ts:52` | `GradientSpec` | interface `GradientSpec` | Keep — single-domain convenience type (no Python counterpart). |
| 16 | @debrief/components | `shared/components/src/colour-engine/types.ts:64` | `LegendModel` | interface `LegendModel` | Keep — single-domain convenience type (no Python counterpart). |
| 17 | @debrief/components | `shared/components/src/colour-engine/types.ts:76` | `ColourAssignment` | interface `ColourAssignment` | Keep — single-domain convenience type (no Python counterpart). |
| 18 | @debrief/components | `shared/components/src/colour-engine/types.ts:94` | `BuiltInDimensionId` | type alias = `'age' \| 'tag'` | Keep — single-domain convenience type (no Python counterpart). |
| 19 | @debrief/components | `shared/components/src/colour-engine/types.ts:97` | `ColourDimensionSelectorProps` | interface `ColourDimensionSelectorProps` | Keep — single-domain convenience type (no Python counterpart). |
| 20 | @debrief/components | `shared/components/src/colour-engine/types.ts:109` | `ColourLegendProps` | interface `ColourLegendProps` | Keep — single-domain convenience type (no Python counterpart). |
| 21 | @debrief/components | `shared/components/src/ContextMenu/ContextMenu.tsx:14` | `ContextMenuItem` | interface `ContextMenuItem` | Keep — single-domain convenience type (no Python counterpart). |
| 22 | @debrief/components | `shared/components/src/ContextMenu/ContextMenu.tsx:20` | `ContextMenuProps` | interface `ContextMenuProps` | Keep — single-domain convenience type (no Python counterpart). |
| 23 | @debrief/components | `shared/components/src/FeatureList/FeatureList.tsx:8` | `FeatureListProps` | interface `FeatureListProps` | Keep — single-domain convenience type (no Python counterpart). |
| 24 | @debrief/components | `shared/components/src/FeatureList/FeatureRow.tsx:8` | `FeatureRowProps` | interface `FeatureRowProps` | Keep — single-domain convenience type (no Python counterpart). |
| 25 | @debrief/components | `shared/components/src/filter-engine/cql2-json.ts:166` | `Cql2Node` | interface `Cql2Node` | Keep — single-domain convenience type (no Python counterpart). |
| 26 | @debrief/components | `shared/components/src/filter-engine/cql2-json.ts:172` | `Cql2NodeArg` | type alias = `Cql2Node \| { readonly property: string } \| string \| number \| boolean` | Keep — single-domain convenience type (no Python counterpart). |
| 27 | @debrief/components | `shared/components/src/filter-engine/cql2-json.ts:543` | `PlatformAttributeReconstruction` | interface `PlatformAttributeReconstruction` | Keep — single-domain convenience type (no Python counterpart). |
| 28 | @debrief/components | `shared/components/src/filter-engine/taxonomy.ts:14` | `RawTaxonomyNode` | interface `RawTaxonomyNode` | Keep — single-domain convenience type (no Python counterpart). |
| 29 | @debrief/components | `shared/components/src/filter-engine/taxonomy.ts:19` | `RawTaxonomy` | interface `RawTaxonomy` | Keep — single-domain convenience type (no Python counterpart). |
| 30 | @debrief/components | `shared/components/src/filter-engine/taxonomy.ts:39` | `DescendantMap` | type alias = `ReadonlyMap<string, ReadonlySet<string>>` | Keep — single-domain convenience type (no Python counterpart). |
| 31 | @debrief/components | `shared/components/src/filter-engine/taxonomy.ts:95` | `TaxonomyLabelMap` | type alias = `ReadonlyMap<string, string>` | Keep — single-domain convenience type (no Python counterpart). |
| 32 | @debrief/components | `shared/components/src/FilterBar/FilterTypeMenu.tsx:10` | `FilterTypeMenuProps` | interface `FilterTypeMenuProps` | Keep — single-domain convenience type (no Python counterpart). |
| 33 | @debrief/components | `shared/components/src/FilterBar/HistoricFiltersDropdown.tsx:16` | `HistoricFiltersDropdownProps` | interface `HistoricFiltersDropdownProps` | Keep — single-domain convenience type (no Python counterpart). |
| 34 | @debrief/components | `shared/components/src/FilterBar/Lozenge.tsx:21` | `LozengeProps` | interface `LozengeProps` | Keep — single-domain convenience type (no Python counterpart). |
| 35 | @debrief/components | `shared/components/src/FilterBar/OrContainer.tsx:20` | `OrContainerProps` | interface `OrContainerProps` | Keep — single-domain convenience type (no Python counterpart). |
| 36 | @debrief/components | `shared/components/src/FilterBar/PlatformValueEditor.tsx:23` | `PlatformValueEditorProps` | interface `PlatformValueEditorProps` | Keep — single-domain convenience type (no Python counterpart). |
| 37 | @debrief/components | `shared/components/src/FilterBar/QuickSearch.tsx:14` | `QuickSearchProps` | interface `QuickSearchProps` | Keep — single-domain convenience type (no Python counterpart). |
| 38 | @debrief/components | `shared/components/src/FilterBar/SaveFilterButton.tsx:17` | `SaveFilterButtonProps` | interface `SaveFilterButtonProps` | Keep — single-domain convenience type (no Python counterpart). |
| 39 | @debrief/components | `shared/components/src/FilterBar/taxonomyAdapter.ts:11` | `TaxonomyAdapterOptions` | interface `TaxonomyAdapterOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 40 | @debrief/components | `shared/components/src/FilterBar/types.ts:17` | `InputMethod` | type alias = `\| 'hierarchical' \| 'flat-dropdown' \| 'free-text' \| 'bucket' \| 'typeah…` | Keep — single-domain convenience type (no Python counterpart). |
| 41 | @debrief/components | `shared/components/src/FilterBar/types.ts:26` | `FilterTypeOption` | interface `FilterTypeOption` | Keep — single-domain convenience type (no Python counterpart). |
| 42 | @debrief/components | `shared/components/src/FilterBar/types.ts:39` | `PlatformAttributes` | type alias = `Partial<Record<PlatformField, string>>` | Keep — single-domain convenience type (no Python counterpart). |
| 43 | @debrief/components | `shared/components/src/FilterBar/types.ts:42` | `SimpleLozengeItem` | interface `SimpleLozengeItem` | Keep — single-domain convenience type (no Python counterpart). |
| 44 | @debrief/components | `shared/components/src/FilterBar/types.ts:52` | `PlatformLozengeItem` | interface `PlatformLozengeItem` | Keep — single-domain convenience type (no Python counterpart). |
| 45 | @debrief/components | `shared/components/src/FilterBar/types.ts:62` | `LozengeItem` | type alias = `SimpleLozengeItem \| PlatformLozengeItem` | Keep — single-domain convenience type (no Python counterpart). |
| 46 | @debrief/components | `shared/components/src/FilterBar/types.ts:65` | `OrContainerItem` | interface `OrContainerItem` | Keep — single-domain convenience type (no Python counterpart). |
| 47 | @debrief/components | `shared/components/src/FilterBar/types.ts:72` | `FilterBarItem` | type alias = `LozengeItem \| OrContainerItem` | Keep — single-domain convenience type (no Python counterpart). |
| 48 | @debrief/components | `shared/components/src/FilterBar/types.ts:75` | `FilterBarState` | interface `FilterBarState` | Keep — single-domain convenience type (no Python counterpart). |
| 49 | @debrief/components | `shared/components/src/FilterBar/types.ts:80` | `FilterBarAction` | type alias = `\| { type: 'ADD_LOZENGE'; filterType: Exclude<FilterType, 'platform'>;…` | Keep — single-domain convenience type (no Python counterpart). |
| 50 | @debrief/components | `shared/components/src/FilterBar/types.ts:105` | `SavedFilterConfiguration` | interface `SavedFilterConfiguration` | Keep — single-domain convenience type (no Python counterpart). |
| 51 | @debrief/components | `shared/components/src/FilterBar/types.ts:115` | `SavedFiltersCollection` | interface `SavedFiltersCollection` | Keep — single-domain convenience type (no Python counterpart). |
| 52 | @debrief/components | `shared/components/src/FilterBar/types.ts:121` | `SavedFiltersStorage` | interface `SavedFiltersStorage` | Keep — single-domain convenience type (no Python counterpart). |
| 53 | @debrief/components | `shared/components/src/FilterBar/types.ts:127` | `FilterBarProps` | interface `FilterBarProps` | Keep — single-domain convenience type (no Python counterpart). |
| 54 | @debrief/components | `shared/components/src/FilterBar/types.ts:137` | `PlatformDistinctValues` | interface `PlatformDistinctValues` | Keep — single-domain convenience type (no Python counterpart). |
| 55 | @debrief/components | `shared/components/src/FilterBar/useDistinctValues.ts:37` | `DistinctValuesMap` | type alias = `Readonly< Record<Exclude<FilterType, 'platform'>, readonly string[]> …` | Keep — single-domain convenience type (no Python counterpart). |
| 56 | @debrief/components | `shared/components/src/FilterBar/useFilterBar.ts:449` | `UseFilterBarReturn` | interface `UseFilterBarReturn` | Keep — single-domain convenience type (no Python counterpart). |
| 57 | @debrief/components | `shared/components/src/FilterBar/useSavedFilters.ts:51` | `UseSavedFiltersResult` | interface `UseSavedFiltersResult` | Keep — single-domain convenience type (no Python counterpart). |
| 58 | @debrief/components | `shared/components/src/FilterBar/useTaxonomyMatchCounts.ts:13` | `TaxonomyMatchCounts` | type alias = `ReadonlyMap<string, number>` | Keep — single-domain convenience type (no Python counterpart). |
| 59 | @debrief/components | `shared/components/src/FilterBar/ValueEditor.tsx:18` | `ValueEditorProps` | interface `ValueEditorProps` | Keep — single-domain convenience type (no Python counterpart). |
| 60 | @debrief/components | `shared/components/src/FilterBar/ValueEditor.tsx:129` | `TypeaheadInputProps` | interface `TypeaheadInputProps` | Keep — single-domain convenience type (no Python counterpart). |
| 61 | @debrief/components | `shared/components/src/FilterBar/ValueEditor.tsx:229` | `FreeTextInputProps` | interface `FreeTextInputProps` | Keep — single-domain convenience type (no Python counterpart). |
| 62 | @debrief/components | `shared/components/src/FormatMenu/FormatMenu.tsx:8` | `FormatMenuProps` | interface `FormatMenuProps` | Keep — single-domain convenience type (no Python counterpart). |
| 63 | @debrief/components | `shared/components/src/FormatMenu/FormatMenuHarness.stories.tsx:147` | `ChildOverride` | interface `ChildOverride` | Keep — single-domain convenience type (no Python counterpart). |
| 64 | @debrief/components | `shared/components/src/FormatMenu/FormatMenuHarness.stories.tsx:153` | `FormatMenuState` | interface `FormatMenuState` | Keep — single-domain convenience type (no Python counterpart). |
| 65 | @debrief/components | `shared/components/src/FormatMenu/presetPalette.ts:8` | `PresetValue` | interface `PresetValue` | Keep — single-domain convenience type (no Python counterpart). |
| 66 | @debrief/components | `shared/components/src/GeometryDialog/GeometryDialog.tsx:4` | `GeometryDialogProps` | interface `GeometryDialogProps` | Keep — single-domain convenience type (no Python counterpart). |
| 67 | @debrief/components | `shared/components/src/hooks/useSelection.ts:6` | `UseSelectionOptions` | interface `UseSelectionOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 68 | @debrief/components | `shared/components/src/hooks/useSelection.ts:20` | `UseSelectionReturn` | interface `UseSelectionReturn` | Keep — single-domain convenience type (no Python counterpart). |
| 69 | @debrief/components | `shared/components/src/LayersToolbar/LayersToolbar.tsx:11` | `OpenDropdown` | type alias = `'filter' \| 'run' \| 'associated' \| null` | Keep — single-domain convenience type (no Python counterpart). |
| 70 | @debrief/components | `shared/components/src/LayersToolbar/RunDropdown.tsx:7` | `MenuCategory` | interface `MenuCategory` | Keep — single-domain convenience type (no Python counterpart). |
| 71 | @debrief/components | `shared/components/src/LayersToolbar/RunDropdown.tsx:13` | `MenuItem` | interface `MenuItem` | Keep — single-domain convenience type (no Python counterpart). |
| 72 | @debrief/components | `shared/components/src/LayersToolbar/types.ts:83` | `AssociatedFile` | interface `AssociatedFile` | Keep — single-domain convenience type (no Python counterpart). |
| 73 | @debrief/components | `shared/components/src/LayersToolbar/types.ts:101` | `ToolbarLabels` | interface `ToolbarLabels` | Keep — single-domain convenience type (no Python counterpart). |
| 74 | @debrief/components | `shared/components/src/LayersToolbar/types.ts:207` | `FileAction` | type alias = `'open' \| 'openWith' \| 'reveal' \| 'delete'` | Keep — single-domain convenience type (no Python counterpart). |
| 75 | @debrief/components | `shared/components/src/LayersToolbar/types.ts:210` | `SelectionApplyAction` | type alias = `'selectAll' \| 'select' \| 'add' \| 'remove'` | Keep — single-domain convenience type (no Python counterpart). |
| 76 | @debrief/components | `shared/components/src/LayersToolbar/types.ts:215` | `FilterDropdownProps` | interface `FilterDropdownProps` | Keep — single-domain convenience type (no Python counterpart). |
| 77 | @debrief/components | `shared/components/src/LayersToolbar/types.ts:235` | `RunDropdownProps` | interface `RunDropdownProps` | Keep — single-domain convenience type (no Python counterpart). |
| 78 | @debrief/components | `shared/components/src/LayersToolbar/types.ts:251` | `AssociatedFilesDropdownProps` | interface `AssociatedFilesDropdownProps` | Keep — single-domain convenience type (no Python counterpart). |
| 79 | @debrief/components | `shared/components/src/LayersToolbar/types.ts:265` | `LayersToolbarProps` | interface `LayersToolbarProps` | Keep — single-domain convenience type (no Python counterpart). |
| 80 | @debrief/components | `shared/components/src/LogPanel/CardFlip.tsx:14` | `CardFlipProps` | interface `CardFlipProps` | Keep — single-domain convenience type (no Python counterpart). |
| 81 | @debrief/components | `shared/components/src/LogPanel/ColorPickerControl.tsx:9` | `ColorPickerControlProps` | interface `ColorPickerControlProps` | Keep — single-domain convenience type (no Python counterpart). |
| 82 | @debrief/components | `shared/components/src/LogPanel/DeleteConfirmation.tsx:9` | `DeleteConfirmationProps` | interface `DeleteConfirmationProps` | Keep — single-domain convenience type (no Python counterpart). |
| 83 | @debrief/components | `shared/components/src/LogPanel/DisableToggle.tsx:9` | `DisableToggleProps` | interface `DisableToggleProps` | Keep — single-domain convenience type (no Python counterpart). |
| 84 | @debrief/components | `shared/components/src/LogPanel/EditFace.tsx:24` | `EditFaceProps` | interface `EditFaceProps` | Keep — single-domain convenience type (no Python counterpart). |
| 85 | @debrief/components | `shared/components/src/LogPanel/JsonEditorControl.tsx:9` | `JsonEditorControlProps` | interface `JsonEditorControlProps` | Keep — single-domain convenience type (no Python counterpart). |
| 86 | @debrief/components | `shared/components/src/LogPanel/ParameterEditor.tsx:14` | `ParameterEditorProps` | interface `ParameterEditorProps` | Keep — single-domain convenience type (no Python counterpart). |
| 87 | @debrief/components | `shared/components/src/LogPanel/RationaleField.tsx:9` | `RationaleFieldProps` | interface `RationaleFieldProps` | Keep — single-domain convenience type (no Python counterpart). |
| 88 | @debrief/components | `shared/components/src/LogPanel/ReplayProgress.tsx:14` | `ReplayProgressProps` | interface `ReplayProgressProps` | Keep — single-domain convenience type (no Python counterpart). |
| 89 | @debrief/components | `shared/components/src/LogPanel/SkeletonLoader.tsx:9` | `SkeletonLoaderProps` | interface `SkeletonLoaderProps` | Keep — single-domain convenience type (no Python counterpart). |
| 90 | @debrief/components | `shared/components/src/LogPanel/SliderControl.tsx:9` | `SliderControlProps` | interface `SliderControlProps` | Keep — single-domain convenience type (no Python counterpart). |
| 91 | @debrief/components | `shared/components/src/MapView/captureMap.ts:12` | `CaptureMapOptions` | interface `CaptureMapOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 92 | @debrief/components | `shared/components/src/MapView/drawing/drawingGuidance.ts:8` | `GuidanceText` | interface `GuidanceText` | Keep — single-domain convenience type (no Python counterpart). |
| 93 | @debrief/components | `shared/components/src/MapView/DrawingGuidanceOverlay/DrawingGuidanceOverlay.tsx:10` | `DrawingGuidanceOverlayProps` | interface `DrawingGuidanceOverlayProps` | Keep — single-domain convenience type (no Python counterpart). |
| 94 | @debrief/components | `shared/components/src/MapView/GeomanControl/useGeoman.ts:25` | `UseGeomanOptions` | interface `UseGeomanOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 95 | @debrief/components | `shared/components/src/MapView/GeomanControl/useGeoman.ts:33` | `UseGeomanReturn` | interface `UseGeomanReturn` | Keep — single-domain convenience type (no Python counterpart). |
| 96 | @debrief/components | `shared/components/src/MapView/hooks/useMapInteraction.ts:5` | `UseMapInteractionOptions` | interface `UseMapInteractionOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 97 | @debrief/components | `shared/components/src/MapView/hooks/useMapInteraction.ts:16` | `UseMapInteractionReturn` | interface `UseMapInteractionReturn` | Keep — single-domain convenience type (no Python counterpart). |
| 98 | @debrief/components | `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx:17` | `DrawingMode` | type alias = `'point' \| 'rectangle' \| 'polygon' \| 'polyline' \| null` | Keep — single-domain convenience type (no Python counterpart). |
| 99 | @debrief/components | `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx:28` | `ShapePaletteItem` | interface `ShapePaletteItem` | Keep — single-domain convenience type (no Python counterpart). |
| 100 | @debrief/components | `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx:118` | `LeafletToolbarProps` | interface `LeafletToolbarProps` | Keep — single-domain convenience type (no Python counterpart). |
| 101 | @debrief/components | `shared/components/src/MapView/MapView.tsx:36` | `MapViewProps` | interface `MapViewProps` | Keep — single-domain convenience type (no Python counterpart). |
| 102 | @debrief/components | `shared/components/src/MapView/resizeImage.ts:10` | `DownscaleOptions` | interface `DownscaleOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 103 | @debrief/components | `shared/components/src/MapView/temporal-utils.ts:21` | `TemporalTrackData` | interface `TemporalTrackData` | Keep — single-domain convenience type (no Python counterpart). |
| 104 | @debrief/components | `shared/components/src/MapView/TemporalTrackLayer.tsx:20` | `TemporalTrackLayerProps` | interface `TemporalTrackLayerProps` | Keep — single-domain convenience type (no Python counterpart). |
| 105 | @debrief/components | `shared/components/src/MapView/TrackHighlightMarker.tsx:8` | `HighlightMarkerStyle` | interface `HighlightMarkerStyle` | Keep — single-domain convenience type (no Python counterpart). |
| 106 | @debrief/components | `shared/components/src/MapView/TrackHighlightMarker.tsx:24` | `TrackHighlightMarkerProps` | interface `TrackHighlightMarkerProps` | Keep — single-domain convenience type (no Python counterpart). |
| 107 | @debrief/components | `shared/components/src/MapView/useTemporalTrack.ts:14` | `TemporalRenderState` | interface `TemporalRenderState` | Keep — single-domain convenience type (no Python counterpart). |
| 108 | @debrief/components | `shared/components/src/MapView/useTemporalTrack.ts:22` | `UseTemporalTrackResult` | interface `UseTemporalTrackResult` | Keep — single-domain convenience type (no Python counterpart). |
| 109 | @debrief/components | `shared/components/src/MobileTabLayout/MobileTabLayout.tsx:20` | `MobileTab` | interface `MobileTab` | Keep — single-domain convenience type (no Python counterpart). |
| 110 | @debrief/components | `shared/components/src/MobileTabLayout/MobileTabLayout.tsx:55` | `MobileTabLayoutProps` | interface `MobileTabLayoutProps` | Keep — single-domain convenience type (no Python counterpart). |
| 111 | @debrief/components | `shared/components/src/nl-cql2/clients.ts:276` | `ProxyResponseSuccess` | interface `ProxyResponseSuccess` | Keep — single-domain convenience type (no Python counterpart). |
| 112 | @debrief/components | `shared/components/src/nl-cql2/clients.ts:283` | `ProxyResponseError` | interface `ProxyResponseError` | Keep — single-domain convenience type (no Python counterpart). |
| 113 | @debrief/components | `shared/components/src/nl-cql2/clients.ts:296` | `ProxyResponse` | type alias = `ProxyResponseSuccess \| ProxyResponseError` | Keep — single-domain convenience type (no Python counterpart). |
| 114 | @debrief/components | `shared/components/src/nl-cql2/parseResponse.ts:133` | `RawResponse` | interface `RawResponse` | Keep — single-domain convenience type (no Python counterpart). |
| 115 | @debrief/components | `shared/components/src/nl-cql2/types.ts:28` | `LozengeSeed` | type alias = `{ readonly filterType: Extract<LozengeItem, { shape: 'simple' }>['fil…` | Keep — single-domain convenience type (no Python counterpart). |
| 116 | @debrief/components | `shared/components/src/nl-cql2/types.ts:35` | `GenerationErrorReason` | type alias = `\| "malformed-json" \| "schema-violation" \| "hallucinated-field" \| "unr…` | Keep — single-domain convenience type (no Python counterpart). |
| 117 | @debrief/components | `shared/components/src/nl-cql2/types.ts:42` | `GenerationError` | interface `GenerationError` | Keep — single-domain convenience type (no Python counterpart). |
| 118 | @debrief/components | `shared/components/src/nl-cql2/types.ts:48` | `GenerationDiagnostics` | interface `GenerationDiagnostics` | Keep — single-domain convenience type (no Python counterpart). |
| 119 | @debrief/components | `shared/components/src/nl-cql2/types.ts:59` | `GenerationResult` | interface `GenerationResult` | Keep — single-domain convenience type (no Python counterpart). |
| 120 | @debrief/components | `shared/components/src/nl-cql2/types.ts:76` | `LLMClient` | interface `LLMClient` | Keep — single-domain convenience type (no Python counterpart). |
| 121 | @debrief/components | `shared/components/src/nl-cql2/types.ts:80` | `RecordedResponse` | interface `RecordedResponse` | Keep — single-domain convenience type (no Python counterpart). |
| 122 | @debrief/components | `shared/components/src/nl-cql2/types.ts:87` | `ResponseMap` | type alias = `Readonly<Record<string, RecordedResponse>>` | Keep — single-domain convenience type (no Python counterpart). |
| 123 | @debrief/components | `shared/components/src/nl-cql2/types.ts:93` | `VesselClassNode` | interface `VesselClassNode` | Keep — single-domain convenience type (no Python counterpart). |
| 124 | @debrief/components | `shared/components/src/nl-cql2/types.ts:100` | `EnumBundleMeta` | interface `EnumBundleMeta` | Keep — single-domain convenience type (no Python counterpart). |
| 125 | @debrief/components | `shared/components/src/nl-cql2/types.ts:108` | `EnumBundle` | interface `EnumBundle` | Keep — single-domain convenience type (no Python counterpart). |
| 126 | @debrief/components | `shared/components/src/nl-cql2/types.ts:121` | `GenerateDeps` | interface `GenerateDeps` | Keep — single-domain convenience type (no Python counterpart). |
| 127 | @debrief/components | `shared/components/src/nl-cql2/types.ts:132` | `CorpusExpectation` | interface `CorpusExpectation` | Keep — single-domain convenience type (no Python counterpart). |
| 128 | @debrief/components | `shared/components/src/nl-cql2/types.ts:144` | `CorpusRecord` | interface `CorpusRecord` | Keep — single-domain convenience type (no Python counterpart). |
| 129 | @debrief/components | `shared/components/src/nl-cql2/types.ts:151` | `HarnessPass` | interface `HarnessPass` | Keep — single-domain convenience type (no Python counterpart). |
| 130 | @debrief/components | `shared/components/src/nl-cql2/types.ts:158` | `HarnessFail` | interface `HarnessFail` | Keep — single-domain convenience type (no Python counterpart). |
| 131 | @debrief/components | `shared/components/src/nl-cql2/types.ts:171` | `HarnessReport` | interface `HarnessReport` | Keep — single-domain convenience type (no Python counterpart). |
| 132 | @debrief/components | `shared/components/src/nl-cql2/types.ts:178` | `RunHarnessDeps` | interface `RunHarnessDeps` | Keep — single-domain convenience type (no Python counterpart). |
| 133 | @debrief/components | `shared/components/src/nl-cql2/types.ts:200` | `LiveConfig` | interface `LiveConfig` | Keep — single-domain convenience type (no Python counterpart). |
| 134 | @debrief/components | `shared/components/src/nl-cql2/types.ts:216` | `LiveConfigValidationError` | interface `LiveConfigValidationError` | Keep — single-domain convenience type (no Python counterpart). |
| 135 | @debrief/components | `shared/components/src/nl-cql2/types.ts:221` | `LiveConfigValidationResult` | type alias = `\| { readonly ok: true; readonly value: LiveConfig } \| { readonly ok: …` | Keep — single-domain convenience type (no Python counterpart). |
| 136 | @debrief/components | `shared/components/src/nl-cql2/types.ts:226` | `LiveTransportErrorReason` | type alias = `\| "auth-failure" \| "rate-limit" \| "provider-error" \| "transport-error…` | Keep — single-domain convenience type (no Python counterpart). |
| 137 | @debrief/components | `shared/components/src/nl-cql2/types.ts:241` | `LiveTransportError` | interface `LiveTransportError` | Keep — single-domain convenience type (no Python counterpart). |
| 138 | @debrief/components | `shared/components/src/nl-cql2/types.ts:254` | `TransportCallRecord` | interface `TransportCallRecord` | Keep — single-domain convenience type (no Python counterpart). |
| 139 | @debrief/components | `shared/components/src/nl-cql2/types.ts:270` | `GenerationResultError` | type alias = `\| { readonly kind: "generation"; readonly error: GenerationError } \| …` | Keep — single-domain convenience type (no Python counterpart). |
| 140 | @debrief/components | `shared/components/src/nl-cql2/types.ts:286` | `LiveLLMClient` | interface `LiveLLMClient` | Keep — single-domain convenience type (no Python counterpart). |
| 141 | @debrief/components | `shared/components/src/panels/PanelContext.tsx:17` | `ResultArtifactType` | type alias = `'dataset' \| 'image' \| 'other'` | Keep — single-domain convenience type (no Python counterpart). |
| 142 | @debrief/components | `shared/components/src/panels/PanelContext.tsx:20` | `ChartTabData` | interface `ChartTabData` | Keep — single-domain convenience type (no Python counterpart). |
| 143 | @debrief/components | `shared/components/src/panels/PanelContext.tsx:42` | `ChartContextProps` | interface `ChartContextProps` | Keep — single-domain convenience type (no Python counterpart). |
| 144 | @debrief/components | `shared/components/src/panels/PanelContext.tsx:59` | `PanelComponents` | interface `PanelComponents` | Keep — single-domain convenience type (no Python counterpart). |
| 145 | @debrief/components | `shared/components/src/panels/PanelContext.tsx:68` | `PanelContextValue` | interface `PanelContextValue` | Keep — single-domain convenience type (no Python counterpart). |
| 146 | @debrief/components | `shared/components/src/panels/resultsPanelLabels.ts:11` | `ResultsPanelLabels` | interface `ResultsPanelLabels` | Keep — single-domain convenience type (no Python counterpart). |
| 147 | @debrief/components | `shared/components/src/panels/StoryboardPanel/SceneList.tsx:10` | `SceneListProps` | interface `SceneListProps` | Keep — single-domain convenience type (no Python counterpart). |
| 148 | @debrief/components | `shared/components/src/panels/StoryboardPanel/SceneRow.tsx:8` | `SceneRowProps` | interface `SceneRowProps` | Keep — single-domain convenience type (no Python counterpart). |
| 149 | @debrief/components | `shared/components/src/panels/StoryboardPanel/types.ts:10` | `SceneRowViewModel` | interface `SceneRowViewModel` | Keep — single-domain convenience type (no Python counterpart). |
| 150 | @debrief/components | `shared/components/src/panels/StoryboardPanel/types.ts:30` | `StoryboardPanelProps` | interface `StoryboardPanelProps` | Keep — single-domain convenience type (no Python counterpart). |
| 151 | @debrief/components | `shared/components/src/PanelWorkspace/goldenLayoutBridge.ts:22` | `MountedPanel` | interface `MountedPanel` | Keep — single-domain convenience type (no Python counterpart). |
| 152 | @debrief/components | `shared/components/src/PanelWorkspace/layoutPersistence.ts:11` | `PersistedLayout` | interface `PersistedLayout` | Keep — single-domain convenience type (no Python counterpart). |
| 153 | @debrief/components | `shared/components/src/PanelWorkspace/PanelErrorBoundary.tsx:15` | `State` | interface `State` | Keep — single-domain convenience type (no Python counterpart). |
| 154 | @debrief/components | `shared/components/src/PanelWorkspace/panelRegistry.ts:10` | `PanelProps` | interface `PanelProps` | Keep — single-domain convenience type (no Python counterpart). |
| 155 | @debrief/components | `shared/components/src/PanelWorkspace/panelRegistry.ts:16` | `PanelDefinition` | interface `PanelDefinition` | Keep — single-domain convenience type (no Python counterpart). |
| 156 | @debrief/components | `shared/components/src/PanelWorkspace/panelRegistry.ts:27` | `PanelRegistry` | interface `PanelRegistry` | Keep — single-domain convenience type (no Python counterpart). |
| 157 | @debrief/components | `shared/components/src/PanelWorkspace/PanelWorkspace.tsx:23` | `PanelWorkspaceProps` | interface `PanelWorkspaceProps` | Keep — single-domain convenience type (no Python counterpart). |
| 158 | @debrief/components | `shared/components/src/PanelWorkspace/PanelWorkspace.tsx:39` | `PanelWorkspaceElement` | interface `PanelWorkspaceElement` | Keep — single-domain convenience type (no Python counterpart). |
| 159 | @debrief/components | `shared/components/src/PropertiesPanel/ArrayWidget.tsx:16` | `ArrayWidgetProps` | interface `ArrayWidgetProps` | Keep — single-domain convenience type (no Python counterpart). |
| 160 | @debrief/components | `shared/components/src/PropertiesPanel/autoDerivedFields.ts:15` | `AutoDerivedField` | type alias = `(typeof AUTO_DERIVED_FIELDS)[number]` | Keep — single-domain convenience type (no Python counterpart). |
| 161 | @debrief/components | `shared/components/src/PropertiesPanel/BboxWidget.tsx:14` | `BboxWidgetProps` | interface `BboxWidgetProps` | Keep — single-domain convenience type (no Python counterpart). |
| 162 | @debrief/components | `shared/components/src/PropertiesPanel/BboxWidget.tsx:24` | `Tuple4` | type alias = `[number, number, number, number]` | Keep — single-domain convenience type (no Python counterpart). |
| 163 | @debrief/components | `shared/components/src/PropertiesPanel/BboxWidget.tsx:25` | `DraftTuple` | type alias = `[string, string, string, string]` | Keep — single-domain convenience type (no Python counterpart). |
| 164 | @debrief/components | `shared/components/src/PropertiesPanel/DateTimeWidget.tsx:14` | `DateTimeWidgetProps` | interface `DateTimeWidgetProps` | Keep — single-domain convenience type (no Python counterpart). |
| 165 | @debrief/components | `shared/components/src/PropertiesPanel/messageTypes.ts:7` | `FieldKey` | type alias = `string` | Keep — single-domain convenience type (no Python counterpart). |
| 166 | @debrief/components | `shared/components/src/PropertiesPanel/messageTypes.ts:25` | `PropertiesCommittedMessage` | interface `PropertiesCommittedMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 167 | @debrief/components | `shared/components/src/PropertiesPanel/messageTypes.ts:37` | `PropertiesErrorMessage` | interface `PropertiesErrorMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 168 | @debrief/components | `shared/components/src/PropertiesPanel/messageTypes.ts:46` | `PropertiesPanelMessage` | type alias = `\| PropertiesCommitMessage \| PropertiesCommittedMessage \| PropertiesEr…` | Keep — single-domain convenience type (no Python counterpart). |
| 169 | @debrief/components | `shared/components/src/PropertiesPanel/PlatformArrayWidget.tsx:14` | `PlatformArrayWidgetProps` | interface `PlatformArrayWidgetProps` | Keep — single-domain convenience type (no Python counterpart). |
| 170 | @debrief/components | `shared/components/src/PropertiesPanel/PlatformArrayWidget.tsx:24` | `PlatformDraft` | interface `PlatformDraft` | Keep — single-domain convenience type (no Python counterpart). |
| 171 | @debrief/components | `shared/components/src/PropertiesPanel/PlatformArrayWidget.tsx:31` | `EditableField` | type alias = `keyof PlatformDraft` | Keep — single-domain convenience type (no Python counterpart). |
| 172 | @debrief/components | `shared/components/src/PropertiesPanel/PlatformArrayWidget.tsx:33` | `ColumnSpec` | interface `ColumnSpec` | Keep — single-domain convenience type (no Python counterpart). |
| 173 | @debrief/components | `shared/components/src/PropertiesPanel/PlatformArrayWidget.tsx:72` | `PlatformCommit` | interface `PlatformCommit` | Keep — single-domain convenience type (no Python counterpart). |
| 174 | @debrief/components | `shared/components/src/PropertiesPanel/provenanceTypes.ts:9` | `PropertiesProvenanceEntry` | interface `PropertiesProvenanceEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 175 | @debrief/components | `shared/components/src/PropertiesPanel/types.ts:9` | `FieldKey` | type alias = `string` | Keep — single-domain convenience type (no Python counterpart). |
| 176 | @debrief/components | `shared/components/src/PropertiesPanel/types.ts:12` | `FieldDerivationState` | type alias = `'auto-derived' \| 'override' \| 'user'` | Keep — single-domain convenience type (no Python counterpart). |
| 177 | @debrief/components | `shared/components/src/PropertiesPanel/types.ts:14` | `FieldSpec` | type alias = `\| { kind: 'string'; maxLength?: number; pattern?: string } \| { kind: …` | Keep — single-domain convenience type (no Python counterpart). |
| 178 | @debrief/components | `shared/components/src/PropertiesPanel/types.ts:26` | `PropertiesFormField` | interface `PropertiesFormField` | Keep — single-domain convenience type (no Python counterpart). |
| 179 | @debrief/components | `shared/components/src/PropertiesPanel/types.ts:43` | `PropertiesFormProps` | interface `PropertiesFormProps` | Keep — single-domain convenience type (no Python counterpart). |
| 180 | @debrief/components | `shared/components/src/StacBrowser/BrowserSelectionContext.tsx:9` | `BrowserSelection` | interface `BrowserSelection` | Keep — single-domain convenience type (no Python counterpart). |
| 181 | @debrief/components | `shared/components/src/StacBrowser/BrowserSelectionContext.tsx:17` | `BrowserSelectionProviderProps` | interface `BrowserSelectionProviderProps` | Keep — single-domain convenience type (no Python counterpart). |
| 182 | @debrief/components | `shared/components/src/StacBrowser/PropertiesSidePanel.tsx:18` | `PropertiesSidePanelProps` | interface `PropertiesSidePanelProps` | Keep — single-domain convenience type (no Python counterpart). |
| 183 | @debrief/components | `shared/components/src/StacBrowser/ThumbnailPreview.tsx:12` | `ThumbnailPreviewProps` | interface `ThumbnailPreviewProps` | Keep — single-domain convenience type (no Python counterpart). |
| 184 | @debrief/components | `shared/components/src/StacBrowser/ThumbnailSizeToggle.tsx:4` | `ThumbnailSizeToggleProps` | interface `ThumbnailSizeToggleProps` | Keep — single-domain convenience type (no Python counterpart). |
| 185 | @debrief/components | `shared/components/src/StacBrowser/types.ts:14` | `StacBrowserMessage` | type alias = `PropertiesCommitMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 186 | @debrief/components | `shared/components/src/StacBrowser/types.ts:19` | `StacBrowserProps` | interface `StacBrowserProps` | Keep — single-domain convenience type (no Python counterpart). |
| 187 | @debrief/components | `shared/components/src/StacBrowser/types.ts:55` | `BrowserFilterResult` | interface `BrowserFilterResult` | Keep — single-domain convenience type (no Python counterpart). |
| 188 | @debrief/components | `shared/components/src/StacFileTree/StacFileTree.tsx:36` | `TreeNodeProps` | interface `TreeNodeProps` | Keep — single-domain convenience type (no Python counterpart). |
| 189 | @debrief/components | `shared/components/src/StacFileTree/StacFileTree.tsx:146` | `TreeNodeWithHighlightsProps` | interface `TreeNodeWithHighlightsProps` | Keep — single-domain convenience type (no Python counterpart). |
| 190 | @debrief/components | `shared/components/src/StacFileTree/storyFixtures.ts:9` | `FileEntry` | interface `FileEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 191 | @debrief/components | `shared/components/src/StacFileTree/storyFixtures.ts:14` | `DirEntry` | interface `DirEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 192 | @debrief/components | `shared/components/src/StacFileTree/storyFixtures.ts:18` | `FsEntry` | type alias = `FileEntry \| DirEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 193 | @debrief/components | `shared/components/src/StacFileTree/types.ts:8` | `NodeType` | type alias = `'catalog' \| 'collection' \| 'item' \| 'asset' \| 'folder'` | Keep — single-domain convenience type (no Python counterpart). |
| 194 | @debrief/components | `shared/components/src/StacFileTree/types.ts:13` | `DirectoryEntry` | interface `DirectoryEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 195 | @debrief/components | `shared/components/src/StacFileTree/types.ts:23` | `FileStat` | interface `FileStat` | Keep — single-domain convenience type (no Python counterpart). |
| 196 | @debrief/components | `shared/components/src/StacFileTree/types.ts:36` | `FilesystemAdapter` | interface `FilesystemAdapter` | Keep — single-domain convenience type (no Python counterpart). |
| 197 | @debrief/components | `shared/components/src/StacFileTree/types.ts:62` | `TreeNodeData` | interface `TreeNodeData` | Keep — single-domain convenience type (no Python counterpart). |
| 198 | @debrief/components | `shared/components/src/StacFileTree/types.ts:82` | `StacFileTreeProps` | interface `StacFileTreeProps` | Keep — single-domain convenience type (no Python counterpart). |
| 199 | @debrief/components | `shared/components/src/StacFileTree/useTreeState.ts:9` | `UseTreeStateReturn` | interface `UseTreeStateReturn` | Keep — single-domain convenience type (no Python counterpart). |
| 200 | @debrief/components | `shared/components/src/storyboard/errors.ts:10` | `StoryboardErrorCode` | type alias = `\| "DuplicateTimestamp" \| "OrphanScene" \| "UnknownStoryboard" \| "Unkno…` | Keep — single-domain convenience type (no Python counterpart). |
| 201 | @debrief/components | `shared/components/src/storyboard/migration.ts:17` | `MigrationFn` | type alias = `(plot: Plot) => Plot` | Keep — single-domain convenience type (no Python counterpart). |
| 202 | @debrief/components | `shared/components/src/storyboard/missing-data.ts:20` | `MissingDataClassification` | type alias = `\| { kind: "ok" } \| { kind: "missing-features"; missingIds: string[] }…` | Keep — single-domain convenience type (no Python counterpart). |
| 203 | @debrief/components | `shared/components/src/storyboard/queries.ts:54` | `StaleReadResult` | interface `StaleReadResult` | Keep — single-domain convenience type (no Python counterpart). |
| 204 | @debrief/components | `shared/components/src/TableRenderer/TableRenderer.tsx:11` | `TableRendererProps` | interface `TableRendererProps` | Keep — single-domain convenience type (no Python counterpart). |
| 205 | @debrief/components | `shared/components/src/ThemeProvider/electronAdapter.ts:16` | `ElectronThemeAPI` | interface `ElectronThemeAPI` | Keep — single-domain convenience type (no Python counterpart). |
| 206 | @debrief/components | `shared/components/src/ThemeProvider/ThemeContext.ts:6` | `ThemeVariant` | type alias = `'light' \| 'dark' \| 'vscode' \| 'system'` | Keep — single-domain convenience type (no Python counterpart). |
| 207 | @debrief/components | `shared/components/src/ThemeProvider/ThemeContext.ts:11` | `Theme` | interface `Theme` | Keep — single-domain convenience type (no Python counterpart). |
| 208 | @debrief/components | `shared/components/src/ThemeProvider/ThemeContext.ts:22` | `ThemeTokens` | interface `ThemeTokens` | Keep — single-domain convenience type (no Python counterpart). |
| 209 | @debrief/components | `shared/components/src/ThemeProvider/ThemeContext.ts:58` | `ThemeContextValue` | interface `ThemeContextValue` | Keep — single-domain convenience type (no Python counterpart). |
| 210 | @debrief/components | `shared/components/src/ThemeProvider/ThemeProvider.tsx:6` | `ThemeProviderProps` | interface `ThemeProviderProps` | Keep — single-domain convenience type (no Python counterpart). |
| 211 | @debrief/components | `shared/components/src/Timeline/canvas/FeatureBars.ts:6` | `FeatureBarsConfig` | interface `FeatureBarsConfig` | Keep — single-domain convenience type (no Python counterpart). |
| 212 | @debrief/components | `shared/components/src/Timeline/canvas/FeatureBars.ts:38` | `FeatureBarInfo` | interface `FeatureBarInfo` | Keep — single-domain convenience type (no Python counterpart). |
| 213 | @debrief/components | `shared/components/src/Timeline/canvas/TimeAxis.ts:4` | `TimeAxisConfig` | interface `TimeAxisConfig` | Keep — single-domain convenience type (no Python counterpart). |
| 214 | @debrief/components | `shared/components/src/Timeline/Timeline.tsx:8` | `TimelineProps` | interface `TimelineProps` | Keep — single-domain convenience type (no Python counterpart). |
| 215 | @debrief/components | `shared/components/src/TimelineView/TimeBrush.tsx:12` | `TimeBrushProps` | interface `TimeBrushProps` | Keep — single-domain convenience type (no Python counterpart). |
| 216 | @debrief/components | `shared/components/src/TimelineView/TimeBrush.tsx:20` | `DragTarget` | type alias = `'left' \| 'right' \| 'body' \| null` | Keep — single-domain convenience type (no Python counterpart). |
| 217 | @debrief/components | `shared/components/src/TimelineView/TimelineView.tsx:44` | `TooltipState` | interface `TooltipState` | Keep — single-domain convenience type (no Python counterpart). |
| 218 | @debrief/components | `shared/components/src/TimelineView/types.ts:12` | `TemporalFilter` | interface `TemporalFilter` | Keep — single-domain convenience type (no Python counterpart). |
| 219 | @debrief/components | `shared/components/src/TimelineView/types.ts:24` | `ColourFn` | type alias = `(item: StacBrowserItem) => string \| null` | Keep — single-domain convenience type (no Python counterpart). |
| 220 | @debrief/components | `shared/components/src/TimelineView/types.ts:29` | `TimelineBarData` | interface `TimelineBarData` | Keep — single-domain convenience type (no Python counterpart). |
| 221 | @debrief/components | `shared/components/src/TimelineView/types.ts:42` | `TimelineViewProps` | interface `TimelineViewProps` | Keep — single-domain convenience type (no Python counterpart). |
| 222 | @debrief/components | `shared/components/src/ToolMatch/ToolMatchHarness/fixtures/features.ts:8` | `SimpleFeature` | interface `SimpleFeature` | Keep — single-domain convenience type (no Python counterpart). |
| 223 | @debrief/components | `shared/components/src/ToolsPanel/ParameterCollector.tsx:18` | `ParameterCollectorProps` | interface `ParameterCollectorProps` | Keep — single-domain convenience type (no Python counterpart). |
| 224 | @debrief/components | `shared/components/src/utils/temporal-types.ts:14` | `TimeSpan` | interface `TimeSpan` | Keep — single-domain convenience type (no Python counterpart). |
| 225 | @debrief/config | `shared/config-ts/src/schemas.ts:39` | `StoreRegistrationInput` | type alias = `z.infer<typeof StoreRegistrationSchema>` | Keep — single-domain convenience type (no Python counterpart). |
| 226 | @debrief/config | `shared/config-ts/src/schemas.ts:40` | `ConfigInput` | type alias = `z.infer<typeof ConfigSchema>` | Keep — single-domain convenience type (no Python counterpart). |
| 227 | @debrief/config | `shared/config-ts/src/types.ts:8` | `StoreRegistration` | interface `StoreRegistration` | Keep — single-domain convenience type (no Python counterpart). |
| 228 | @debrief/config | `shared/config-ts/src/types.ts:22` | `PreferenceValue` | type alias = `string \| number \| boolean \| null` | Keep — single-domain convenience type (no Python counterpart). |
| 229 | @debrief/config | `shared/config-ts/src/types.ts:27` | `Config` | interface `Config` | Keep — single-domain convenience type (no Python counterpart). |
| 230 | @debrief/data | `shared/data/src/ts/registry.ts:15` | `ResolvedPlatform` | interface `ResolvedPlatform` | Keep — single-domain convenience type (no Python counterpart). |
| 231 | @debrief/nl-demo | `apps/nl-demo/e2e/live-config-helper.ts:27` | `LiveConfigFixture` | type alias = `"valid" \| "malformed" \| "proxy-down" \| "absent"` | Keep — single-domain convenience type (no Python counterpart). |
| 232 | @debrief/session-state | `services/session-state/src/format/formatService.ts:10` | `FormatChangeRequest` | interface `FormatChangeRequest` | Keep — single-domain convenience type (no Python counterpart). |
| 233 | @debrief/session-state | `services/session-state/src/format/formatService.ts:18` | `FormatChangeResult` | interface `FormatChangeResult` | Keep — single-domain convenience type (no Python counterpart). |
| 234 | @debrief/session-state | `services/session-state/src/format/formatService.ts:24` | `FormatMenuItem` | interface `FormatMenuItem` | Keep — single-domain convenience type (no Python counterpart). |
| 235 | @debrief/session-state | `services/session-state/src/format/formatService.ts:32` | `FormatServiceDeps` | interface `FormatServiceDeps` | Keep — single-domain convenience type (no Python counterpart). |
| 236 | @debrief/session-state | `services/session-state/src/format/formatService.ts:45` | `FormatService` | interface `FormatService` | Keep — single-domain convenience type (no Python counterpart). |
| 237 | @debrief/session-state | `services/session-state/src/format/stylePropertyMap.ts:7` | `ValueType` | type alias = `'color' \| 'number' \| 'shape' \| 'dashPattern' \| 'boolean'` | Keep — single-domain convenience type (no Python counterpart). |
| 238 | @debrief/session-state | `services/session-state/src/format/stylePropertyMap.ts:8` | `PropertyCategory` | type alias = `'line' \| 'fill' \| 'point' \| 'stroke' \| 'visibility'` | Keep — single-domain convenience type (no Python counterpart). |
| 239 | @debrief/session-state | `services/session-state/src/log/entryBuilder.ts:69` | `PythonProvenanceFallback` | interface `PythonProvenanceFallback` | Keep — single-domain convenience type (no Python counterpart). |
| 240 | @debrief/session-state | `services/session-state/src/log/logService.ts:39` | `LogServiceDeps` | interface `LogServiceDeps` | Keep — single-domain convenience type (no Python counterpart). |
| 241 | @debrief/session-state | `services/session-state/src/log/parameterValidation.ts:8` | `ValidationResult` | interface `ValidationResult` | Keep — single-domain convenience type (no Python counterpart). |
| 242 | @debrief/session-state | `services/session-state/src/log/types.ts:8` | `ParameterValue` | interface `ParameterValue` | Keep — single-domain convenience type (no Python counterpart). |
| 243 | @debrief/session-state | `services/session-state/src/log/types.ts:14` | `WasGeneratedBy` | interface `WasGeneratedBy` | Keep — single-domain convenience type (no Python counterpart). |
| 244 | @debrief/session-state | `services/session-state/src/log/types.ts:20` | `TuneAnnotation` | interface `TuneAnnotation` | Keep — single-domain convenience type (no Python counterpart). |
| 245 | @debrief/session-state | `services/session-state/src/log/types.ts:34` | `LogEntry` | interface `LogEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 246 | @debrief/session-state | `services/session-state/src/log/types.ts:58` | `PropertyDelta` | interface `PropertyDelta` | Keep — single-domain convenience type (no Python counterpart). |
| 247 | @debrief/session-state | `services/session-state/src/log/types.ts:63` | `CreatedAsset` | interface `CreatedAsset` | Keep — single-domain convenience type (no Python counterpart). |
| 248 | @debrief/session-state | `services/session-state/src/log/types.ts:69` | `ExpandedToolResultFields` | interface `ExpandedToolResultFields` | Keep — single-domain convenience type (no Python counterpart). |
| 249 | @debrief/session-state | `services/session-state/src/log/types.ts:78` | `RecordResult` | interface `RecordResult` | Keep — single-domain convenience type (no Python counterpart). |
| 250 | @debrief/session-state | `services/session-state/src/log/types.ts:84` | `TimelineOptions` | interface `TimelineOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 251 | @debrief/session-state | `services/session-state/src/log/types.ts:117` | `LogService` | interface `LogService` | Keep — single-domain convenience type (no Python counterpart). |
| 252 | @debrief/session-state | `services/session-state/src/log/types.ts:209` | `ReplayEntry` | interface `ReplayEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 253 | @debrief/session-state | `services/session-state/src/log/types.ts:221` | `TuneTarget` | interface `TuneTarget` | Keep — single-domain convenience type (no Python counterpart). |
| 254 | @debrief/session-state | `services/session-state/src/log/types.ts:229` | `ReplayPlan` | interface `ReplayPlan` | Keep — single-domain convenience type (no Python counterpart). |
| 255 | @debrief/session-state | `services/session-state/src/log/types.ts:237` | `ReplayProgress` | interface `ReplayProgress` | Keep — single-domain convenience type (no Python counterpart). |
| 256 | @debrief/session-state | `services/session-state/src/log/types.ts:245` | `ArtifactVersion` | interface `ArtifactVersion` | Keep — single-domain convenience type (no Python counterpart). |
| 257 | @debrief/session-state | `services/session-state/src/log/types.ts:253` | `ReplayHaltReason` | interface `ReplayHaltReason` | Keep — single-domain convenience type (no Python counterpart). |
| 258 | @debrief/session-state | `services/session-state/src/log/types.ts:261` | `ReplayResult` | interface `ReplayResult` | Keep — single-domain convenience type (no Python counterpart). |
| 259 | @debrief/session-state | `services/session-state/src/log/types.ts:292` | `SnapshotLoader` | type alias = `( store_path: string, item_path: string, asset_filename: string ) => …` | Keep — single-domain convenience type (no Python counterpart). |
| 260 | @debrief/session-state | `services/session-state/src/log/types.ts:302` | `ProgressReporter` | type alias = `(progress: ReplayProgress) => void` | Keep — single-domain convenience type (no Python counterpart). |
| 261 | @debrief/session-state | `services/session-state/src/log/types.ts:305` | `ReplayEngineDeps` | interface `ReplayEngineDeps` | Keep — single-domain convenience type (no Python counterpart). |
| 262 | @debrief/session-state | `services/session-state/src/log/types.ts:314` | `ReplayEngine` | interface `ReplayEngine` | Keep — single-domain convenience type (no Python counterpart). |
| 263 | @debrief/session-state | `services/session-state/src/log/types.ts:327` | `ParameterTypeInfo` | interface `ParameterTypeInfo` | Keep — single-domain convenience type (no Python counterpart). |
| 264 | @debrief/session-state | `services/session-state/src/log/types.ts:339` | `SnapshotRef` | interface `SnapshotRef` | Keep — single-domain convenience type (no Python counterpart). |
| 265 | @debrief/session-state | `services/session-state/src/log/types.ts:345` | `SnapshotLinks` | interface `SnapshotLinks` | Keep — single-domain convenience type (no Python counterpart). |
| 266 | @debrief/session-state | `services/session-state/src/log/types.ts:351` | `FileProvEntry` | interface `FileProvEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 267 | @debrief/session-state | `services/session-state/src/log/types.ts:361` | `SystemRecordProperties` | interface `SystemRecordProperties` | Keep — single-domain convenience type (no Python counterpart). |
| 268 | @debrief/session-state | `services/session-state/src/log/types.ts:370` | `BranchRecord` | interface `BranchRecord` | Keep — single-domain convenience type (no Python counterpart). |
| 269 | @debrief/session-state | `services/session-state/src/log/types.ts:380` | `BranchOrigin` | interface `BranchOrigin` | Keep — single-domain convenience type (no Python counterpart). |
| 270 | @debrief/session-state | `services/session-state/src/log/types.ts:388` | `BranchFromOptions` | interface `BranchFromOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 271 | @debrief/session-state | `services/session-state/src/log/types.ts:393` | `BranchResult` | interface `BranchResult` | Keep — single-domain convenience type (no Python counterpart). |
| 272 | @debrief/session-state | `services/session-state/src/log/types.ts:409` | `BranchErrorCode` | type alias = `\| 'ENTRY_NOT_FOUND' \| 'SNAPSHOT_NOT_FOUND' \| 'REPLAY_NOT_AVAILABLE' \|…` | Keep — single-domain convenience type (no Python counterpart). |
| 273 | @debrief/session-state | `services/session-state/src/log/types.ts:417` | `BranchServiceDeps` | interface `BranchServiceDeps` | Keep — single-domain convenience type (no Python counterpart). |
| 274 | @debrief/session-state | `services/session-state/src/log/types.ts:423` | `BranchService` | interface `BranchService` | Keep — single-domain convenience type (no Python counterpart). |
| 275 | @debrief/session-state | `services/session-state/src/log/types.ts:453` | `SnapshotResult` | interface `SnapshotResult` | Keep — single-domain convenience type (no Python counterpart). |
| 276 | @debrief/session-state | `services/session-state/src/log/types.ts:461` | `SnapshotBoundary` | interface `SnapshotBoundary` | Keep — single-domain convenience type (no Python counterpart). |
| 277 | @debrief/session-state | `services/session-state/src/log/types.ts:467` | `SnapshotEntriesResult` | interface `SnapshotEntriesResult` | Keep — single-domain convenience type (no Python counterpart). |
| 278 | @debrief/session-state | `services/session-state/src/log/types.ts:473` | `CrossSnapshotTimelineOptions` | interface `CrossSnapshotTimelineOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 279 | @debrief/session-state | `services/session-state/src/log/types.ts:492` | `SnapshotServiceDeps` | interface `SnapshotServiceDeps` | Keep — single-domain convenience type (no Python counterpart). |
| 280 | @debrief/session-state | `services/session-state/src/log/types.ts:501` | `SnapshotService` | interface `SnapshotService` | Keep — single-domain convenience type (no Python counterpart). |
| 281 | @debrief/session-state | `services/session-state/src/persistence/save.ts:15` | `SaveResult` | interface `SaveResult` | Keep — single-domain convenience type (no Python counterpart). |
| 282 | @debrief/session-state | `services/session-state/src/persistence/schema.ts:11` | `SessionFileHeader` | interface `SessionFileHeader` | Keep — single-domain convenience type (no Python counterpart). |
| 283 | @debrief/session-state | `services/session-state/src/registry/types.ts:11` | `ResultIdMapping` | interface `ResultIdMapping` | Keep — single-domain convenience type (no Python counterpart). |
| 284 | @debrief/session-state | `services/session-state/src/registry/types.ts:19` | `ResultIdChangeEvent` | interface `ResultIdChangeEvent` | Keep — single-domain convenience type (no Python counterpart). |
| 285 | @debrief/session-state | `services/session-state/src/registry/types.ts:28` | `ResultIdChangeCallback` | type alias = `(event: ResultIdChangeEvent) => void` | Keep — single-domain convenience type (no Python counterpart). |
| 286 | @debrief/session-state | `services/session-state/src/registry/types.ts:33` | `StacAssetForHydration` | interface `StacAssetForHydration` | Keep — single-domain convenience type (no Python counterpart). |
| 287 | @debrief/session-state | `services/session-state/src/registry/types.ts:44` | `ResultIdRegistry` | interface `ResultIdRegistry` | Keep — single-domain convenience type (no Python counterpart). |
| 288 | @debrief/session-state | `services/session-state/src/server/index.ts:14` | `ServerOptions` | interface `ServerOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 289 | @debrief/session-state | `services/session-state/src/server/sse.ts:12` | `SSEEventType` | type alias = `\| 'state-sync' \| 'temporal.currentTime' \| 'temporal.timeRange' \| 'tem…` | Keep — single-domain convenience type (no Python counterpart). |
| 290 | @debrief/session-state | `services/session-state/src/server/tools/getState.ts:16` | `GetStateInput` | interface `GetStateInput` | Keep — single-domain convenience type (no Python counterpart). |
| 291 | @debrief/session-state | `services/session-state/src/server/tools/getState.ts:20` | `GetStateOutput` | interface `GetStateOutput` | Keep — single-domain convenience type (no Python counterpart). |
| 292 | @debrief/session-state | `services/session-state/src/server/tools/setCurrentTime.ts:10` | `SetCurrentTimeInput` | interface `SetCurrentTimeInput` | Keep — single-domain convenience type (no Python counterpart). |
| 293 | @debrief/session-state | `services/session-state/src/server/tools/setCurrentTime.ts:15` | `SetCurrentTimeOutput` | interface `SetCurrentTimeOutput` | Keep — single-domain convenience type (no Python counterpart). |
| 294 | @debrief/session-state | `services/session-state/src/server/tools/setHiddenFeatures.ts:8` | `SetHiddenFeaturesInput` | interface `SetHiddenFeaturesInput` | Keep — single-domain convenience type (no Python counterpart). |
| 295 | @debrief/session-state | `services/session-state/src/server/tools/setHiddenFeatures.ts:15` | `SetHiddenFeaturesOutput` | interface `SetHiddenFeaturesOutput` | Keep — single-domain convenience type (no Python counterpart). |
| 296 | @debrief/session-state | `services/session-state/src/server/tools/setPlaybackRate.ts:8` | `SetPlaybackRateInput` | interface `SetPlaybackRateInput` | Keep — single-domain convenience type (no Python counterpart). |
| 297 | @debrief/session-state | `services/session-state/src/server/tools/setPlaybackRate.ts:12` | `SetPlaybackRateOutput` | interface `SetPlaybackRateOutput` | Keep — single-domain convenience type (no Python counterpart). |
| 298 | @debrief/session-state | `services/session-state/src/server/tools/setRotation.ts:8` | `SetRotationInput` | interface `SetRotationInput` | Keep — single-domain convenience type (no Python counterpart). |
| 299 | @debrief/session-state | `services/session-state/src/server/tools/setRotation.ts:12` | `SetRotationOutput` | interface `SetRotationOutput` | Keep — single-domain convenience type (no Python counterpart). |
| 300 | @debrief/session-state | `services/session-state/src/server/tools/setSelection.ts:12` | `SetSelectionInput` | interface `SetSelectionInput` | Keep — single-domain convenience type (no Python counterpart). |
| 301 | @debrief/session-state | `services/session-state/src/server/tools/setSelection.ts:18` | `SetSelectionOutput` | interface `SetSelectionOutput` | Keep — single-domain convenience type (no Python counterpart). |
| 302 | @debrief/session-state | `services/session-state/src/store/index.ts:63` | `UndoHistory` | interface `UndoHistory` | Keep — single-domain convenience type (no Python counterpart). |
| 303 | @debrief/session-state | `services/session-state/src/store/index.ts:71` | `SessionStoreWithUndo` | interface `SessionStoreWithUndo` | Keep — single-domain convenience type (no Python counterpart). |
| 304 | @debrief/session-state | `services/session-state/src/store/index.ts:297` | `SessionStoreApi` | type alias = `ReturnType<typeof createSessionStore>` | Keep — single-domain convenience type (no Python counterpart). |
| 305 | @debrief/session-state | `services/session-state/src/store/middleware/undo.ts:17` | `UndoActions` | interface `UndoActions` | Keep — single-domain convenience type (no Python counterpart). |
| 306 | @debrief/session-state | `services/session-state/src/store/slices/browser-filter.ts:15` | `BrowserFilterSliceWithActions` | type alias = `BrowserFilterSlice & BrowserFilterActions` | Keep — single-domain convenience type (no Python counterpart). |
| 307 | @debrief/session-state | `services/session-state/src/store/slices/document.ts:14` | `DocumentSliceWithActions` | type alias = `DocumentSlice & DocumentActions` | Keep — single-domain convenience type (no Python counterpart). |
| 308 | @debrief/session-state | `services/session-state/src/store/slices/features.ts:34` | `FeaturesSliceWithActions` | type alias = `FeaturesSlice & FeaturesActions` | Keep — single-domain convenience type (no Python counterpart). |
| 309 | @debrief/session-state | `services/session-state/src/types/browser-filter.ts:21` | `BrowserFilterSlice` | interface `BrowserFilterSlice` | Keep — single-domain convenience type (no Python counterpart). |
| 310 | @debrief/session-state | `services/session-state/src/types/browser-filter.ts:39` | `BrowserFilterActions` | interface `BrowserFilterActions` | Keep — single-domain convenience type (no Python counterpart). |
| 311 | @debrief/session-state | `services/session-state/src/types/document.ts:15` | `DocumentSlice` | interface `DocumentSlice` | Keep — single-domain convenience type (no Python counterpart). |
| 312 | @debrief/session-state | `services/session-state/src/types/document.ts:33` | `DocumentActions` | interface `DocumentActions` | Keep — single-domain convenience type (no Python counterpart). |
| 313 | @debrief/session-state | `services/session-state/src/types/features.ts:22` | `FeatureSelection` | interface `FeatureSelection` | Keep — single-domain convenience type (no Python counterpart). |
| 314 | @debrief/session-state | `services/session-state/src/types/features.ts:64` | `FeaturesSlice` | interface `FeaturesSlice` | Keep — single-domain convenience type (no Python counterpart). |
| 315 | @debrief/session-state | `services/session-state/src/types/features.ts:88` | `FeaturesActions` | interface `FeaturesActions` | Keep — single-domain convenience type (no Python counterpart). |
| 316 | @debrief/session-state | `services/session-state/src/types/index.ts:35` | `SessionStore` | type alias = `TemporalSlice & SpatialSlice & FeaturesSlice & DocumentSlice & Result…` | Keep — single-domain convenience type (no Python counterpart). |
| 317 | @debrief/session-state | `services/session-state/src/types/index.ts:59` | `SessionState` | interface `SessionState` | Keep — single-domain convenience type (no Python counterpart). |
| 318 | @debrief/session-state | `services/session-state/src/types/index.ts:70` | `SessionActions` | interface `SessionActions` | Keep — single-domain convenience type (no Python counterpart). |
| 319 | @debrief/session-state | `services/session-state/src/types/index.ts:84` | `PersistentSessionState` | interface `PersistentSessionState` | Keep — single-domain convenience type (no Python counterpart). |
| 320 | @debrief/session-state | `services/session-state/src/utils/selectionPath.ts:17` | `AddressingMode` | type alias = `'id' \| 'index'` | Keep — single-domain convenience type (no Python counterpart). |
| 321 | @debrief/session-state | `services/session-state/src/utils/selectionPath.ts:19` | `LevelDefinition` | interface `LevelDefinition` | Keep — single-domain convenience type (no Python counterpart). |
| 322 | @debrief/session-state | `services/session-state/src/utils/selectionPath.ts:25` | `PathLevel` | interface `PathLevel` | Keep — single-domain convenience type (no Python counterpart). |
| 323 | @debrief/session-state | `services/session-state/src/utils/selectionPath.ts:30` | `ParsedPath` | interface `ParsedPath` | Keep — single-domain convenience type (no Python counterpart). |
| 324 | @debrief/session-state | `services/session-state/src/utils/selectionPath.ts:37` | `PathValidationResult` | interface `PathValidationResult` | Keep — single-domain convenience type (no Python counterpart). |
| 325 | @debrief/spec-navigator | `apps/spec-navigator/e2e/mock-github.ts:12` | `Scenario` | type alias = `'stable-head' \| 'stale-head' \| '401' \| 'empty-folder'` | Keep — single-domain convenience type (no Python counterpart). |
| 326 | @debrief/spec-navigator | `apps/spec-navigator/e2e/mock-github.ts:23` | `CapturedPost` | interface `CapturedPost` | Keep — single-domain convenience type (no Python counterpart). |
| 327 | @debrief/spec-navigator | `apps/spec-navigator/e2e/mock-github.ts:28` | `MockHandle` | interface `MockHandle` | Keep — single-domain convenience type (no Python counterpart). |
| 328 | @debrief/spec-navigator | `apps/spec-navigator/src/components/ArtifactView.tsx:20` | `ContentState` | type alias = `\| { kind: 'idle' } \| { kind: 'loading' } \| { kind: 'loaded-text'; tex…` | Keep — single-domain convenience type (no Python counterpart). |
| 329 | @debrief/spec-navigator | `apps/spec-navigator/src/components/CommentDrawer.tsx:155` | `EntryProps` | interface `EntryProps` | Keep — single-domain convenience type (no Python counterpart). |
| 330 | @debrief/spec-navigator | `apps/spec-navigator/src/components/OpenPrList.tsx:7` | `LoadState` | type alias = `\| { kind: 'idle' } \| { kind: 'loading' } \| { kind: 'loaded'; prs: Pul…` | Keep — single-domain convenience type (no Python counterpart). |
| 331 | @debrief/spec-navigator | `apps/spec-navigator/src/components/SelectionAnchor.tsx:12` | `ChipState` | interface `ChipState` | Keep — single-domain convenience type (no Python counterpart). |
| 332 | @debrief/spec-navigator | `apps/spec-navigator/src/components/SettingsPanel.tsx:10` | `ProbeState` | type alias = `\| { kind: 'idle' } \| { kind: 'probing' } \| { kind: 'success' } \| { ki…` | Keep — single-domain convenience type (no Python counterpart). |
| 333 | @debrief/spec-navigator | `apps/spec-navigator/src/components/SubmitButton.tsx:15` | `SuccessState` | interface `SuccessState` | Keep — single-domain convenience type (no Python counterpart). |
| 334 | @debrief/spec-navigator | `apps/spec-navigator/src/github/api.ts:29` | `ApiOptions` | interface `ApiOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 335 | @debrief/spec-navigator | `apps/spec-navigator/src/github/auth.ts:12` | `Listener` | type alias = `() => void` | Keep — single-domain convenience type (no Python counterpart). |
| 336 | @debrief/spec-navigator | `apps/spec-navigator/src/github/schemas.ts:27` | `PullRequest` | type alias = `z.infer<typeof PullRequestSchema>` | Keep — single-domain convenience type (no Python counterpart). |
| 337 | @debrief/spec-navigator | `apps/spec-navigator/src/github/schemas.ts:46` | `ContentsEntry` | type alias = `z.infer<typeof ContentsEntrySchema>` | Keep — single-domain convenience type (no Python counterpart). |
| 338 | @debrief/spec-navigator | `apps/spec-navigator/src/github/schemas.ts:56` | `IssueCommentCreateResponse` | type alias = `z.infer<typeof IssueCommentCreateResponseSchema>` | Keep — single-domain convenience type (no Python counterpart). |
| 339 | @debrief/spec-navigator | `apps/spec-navigator/src/github/schemas.ts:87` | `PullRequestSummary` | type alias = `z.infer<typeof PullRequestSummarySchema>` | Keep — single-domain convenience type (no Python counterpart). |
| 340 | @debrief/spec-navigator | `apps/spec-navigator/src/state/commentsReducer.ts:13` | `CommentsState` | interface `CommentsState` | Keep — single-domain convenience type (no Python counterpart). |
| 341 | @debrief/spec-navigator | `apps/spec-navigator/src/state/commentsReducer.ts:24` | `CommentsAction` | type alias = `\| { type: 'ADD_COMMENT'; draft: CommentDraft } \| { type: 'EDIT_COMMEN…` | Keep — single-domain convenience type (no Python counterpart). |
| 342 | @debrief/spec-navigator | `apps/spec-navigator/src/state/useComments.ts:16` | `UseCommentsResult` | interface `UseCommentsResult` | Keep — single-domain convenience type (no Python counterpart). |
| 343 | @debrief/spec-navigator | `apps/spec-navigator/src/state/useFeature.ts:13` | `UseFeatureResult` | interface `UseFeatureResult` | Keep — single-domain convenience type (no Python counterpart). |
| 344 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:7` | `ArtefactKind` | type alias = `\| 'spec' \| 'plan' \| 'tasks' \| 'research' \| 'data-model' \| 'quickstart…` | Keep — single-domain convenience type (no Python counterpart). |
| 345 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:19` | `ArtefactMimeType` | type alias = `\| 'text/markdown' \| 'application/json' \| 'application/yaml' \| 'text/p…` | Keep — single-domain convenience type (no Python counterpart). |
| 346 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:29` | `Artefact` | interface `Artefact` | Keep — single-domain convenience type (no Python counterpart). |
| 347 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:40` | `FeatureScope` | interface `FeatureScope` | Keep — single-domain convenience type (no Python counterpart). |
| 348 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:48` | `CommentTag` | type alias = `'question' \| 'scope-concern' \| 'test-gap' \| 'nit' \| 'blocker'` | Keep — single-domain convenience type (no Python counterpart). |
| 349 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:58` | `CommentBase` | interface `CommentBase` | Keep — single-domain convenience type (no Python counterpart). |
| 350 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:66` | `FeatureLevelComment` | interface `FeatureLevelComment` | Keep — single-domain convenience type (no Python counterpart). |
| 351 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:70` | `DocumentLevelComment` | interface `DocumentLevelComment` | Keep — single-domain convenience type (no Python counterpart). |
| 352 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:75` | `SelectionLevelComment` | interface `SelectionLevelComment` | Keep — single-domain convenience type (no Python counterpart). |
| 353 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:84` | `Comment` | type alias = `FeatureLevelComment \| DocumentLevelComment \| SelectionLevelComment` | Keep — single-domain convenience type (no Python counterpart). |
| 354 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:86` | `CommentLevel` | type alias = `Comment['level']` | Keep — single-domain convenience type (no Python counterpart). |
| 355 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:88` | `SelectionContext` | interface `SelectionContext` | Keep — single-domain convenience type (no Python counterpart). |
| 356 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:95` | `DraftCommentSet` | interface `DraftCommentSet` | Keep — single-domain convenience type (no Python counterpart). |
| 357 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:104` | `Credential` | interface `Credential` | Keep — single-domain convenience type (no Python counterpart). |
| 358 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:109` | `Submission` | interface `Submission` | Keep — single-domain convenience type (no Python counterpart). |
| 359 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:119` | `ErrorKind` | type alias = `\| 'credential-missing' \| 'credential-rejected' \| 'pr-not-found' \| 'ra…` | Keep — single-domain convenience type (no Python counterpart). |
| 360 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:131` | `AppError` | interface `AppError` | Keep — single-domain convenience type (no Python counterpart). |
| 361 | @debrief/spec-navigator | `apps/spec-navigator/src/types.ts:139` | `CommentDraft` | type alias = `\| { level: 'feature'; body: string; tag?: CommentTag } \| { level: 'do…` | Keep — single-domain convenience type (no Python counterpart). |
| 362 | @debrief/utils | `shared/utils/src/errorMessages.ts:10` | `ErrorCode` | type alias = `\| 'INVALID_FORMAT' \| 'PARSE_FAILED' \| 'STORAGE_ERROR' \| 'FILE_NOT_FOU…` | Keep — single-domain convenience type (no Python counterpart). |
| 363 | @debrief/utils | `shared/utils/src/errorMessages.ts:19` | `ErrorContext` | interface `ErrorContext` | Keep — single-domain convenience type (no Python counterpart). |
| 364 | @debrief/utils | `shared/utils/src/mcp-types.ts:11` | `DebriefAnnotations` | interface `DebriefAnnotations` | Keep — single-domain convenience type (no Python counterpart). |
| 365 | @debrief/utils | `shared/utils/tests/eslint-rules/helpers.ts:11` | `LintViolation` | interface `LintViolation` | Keep — single-domain convenience type (no Python counterpart). |
| 366 | @debrief/utils | `shared/utils/tests/eslint-rules/helpers.ts:18` | `RestrictedSyntaxEntry` | type alias = `{ selector: string; message: string }` | Keep — single-domain convenience type (no Python counterpart). |
| 367 | @debrief/web-shell | `apps/web-shell/src/mocks/calcService.ts:16` | `IdentifiableFeature` | interface `IdentifiableFeature` | Keep — single-domain convenience type (no Python counterpart). |
| 368 | @debrief/web-shell | `apps/web-shell/src/mocks/calcService.ts:220` | `MockCalcService` | interface `MockCalcService` | Keep — single-domain convenience type (no Python counterpart). |
| 369 | @debrief/web-shell | `apps/web-shell/src/mocks/fsAdapter.ts:86` | `FileEntry` | interface `FileEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 370 | @debrief/web-shell | `apps/web-shell/src/mocks/fsAdapter.ts:91` | `DirEntry` | interface `DirEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 371 | @debrief/web-shell | `apps/web-shell/src/mocks/fsAdapter.ts:95` | `FsEntry` | type alias = `FileEntry \| DirEntry` | Keep — single-domain convenience type (no Python counterpart). |
| 372 | @debrief/web-shell | `apps/web-shell/src/mocks/fsAdapter.ts:98` | `WritableFsAdapter` | interface `WritableFsAdapter` | Keep — single-domain convenience type (no Python counterpart). |
| 373 | debrief-loader | `apps/loader/scripts/capture-screenshots.ts:18` | `Screenshot` | interface `Screenshot` | Keep — single-domain convenience type (no Python counterpart). |
| 374 | debrief-loader | `apps/loader/src/main/cleanup.ts:12` | `PendingOperation` | interface `PendingOperation` | Keep — single-domain convenience type (no Python counterpart). |
| 375 | debrief-loader | `apps/loader/src/main/ipc/io.ts:14` | `ParseFileResponse` | interface `ParseFileResponse` | Keep — single-domain convenience type (no Python counterpart). |
| 376 | debrief-loader | `apps/loader/src/main/ipc/stac.ts:154` | `CopyAssetResponse` | interface `CopyAssetResponse` | Keep — single-domain convenience type (no Python counterpart). |
| 377 | debrief-loader | `apps/loader/src/main/service-paths.ts:14` | `ServiceCommand` | interface `ServiceCommand` | Keep — single-domain convenience type (no Python counterpart). |
| 378 | debrief-loader | `apps/loader/src/main/types/ipc.ts:8` | `JsonRpcRequest` | interface `JsonRpcRequest` | Keep — single-domain convenience type (no Python counterpart). |
| 379 | debrief-loader | `apps/loader/src/main/types/ipc.ts:18` | `JsonRpcSuccessResponse` | interface `JsonRpcSuccessResponse` | Keep — single-domain convenience type (no Python counterpart). |
| 380 | debrief-loader | `apps/loader/src/main/types/ipc.ts:27` | `JsonRpcErrorResponse` | interface `JsonRpcErrorResponse` | Keep — single-domain convenience type (no Python counterpart). |
| 381 | debrief-loader | `apps/loader/src/main/types/ipc.ts:36` | `JsonRpcError` | interface `JsonRpcError` | Keep — single-domain convenience type (no Python counterpart). |
| 382 | debrief-loader | `apps/loader/src/main/types/ipc.ts:45` | `JsonRpcResponse` | type alias = `JsonRpcSuccessResponse<T> \| JsonRpcErrorResponse` | Keep — single-domain convenience type (no Python counterpart). |
| 383 | debrief-loader | `apps/loader/src/main/types/ipc.ts:62` | `ApplicationErrorType` | type alias = `\| 'FILE_NOT_FOUND' \| 'PERMISSION_DENIED' \| 'PARSE_ERROR' \| 'STORE_NOT…` | Keep — single-domain convenience type (no Python counterpart). |
| 384 | debrief-loader | `apps/loader/src/main/types/ipc.ts:74` | `ApplicationErrorData` | interface `ApplicationErrorData` | Keep — single-domain convenience type (no Python counterpart). |
| 385 | debrief-loader | `apps/loader/src/main/types/ipc.ts:84` | `ProvenanceMetadata` | interface `ProvenanceMetadata` | Keep — single-domain convenience type (no Python counterpart). |
| 386 | debrief-loader | `apps/loader/src/preload/index.ts:79` | `ElectronAPI` | type alias = `typeof electronAPI` | Keep — single-domain convenience type (no Python counterpart). |
| 387 | debrief-loader | `apps/loader/src/renderer/App.tsx:19` | `LoaderAction` | type alias = `\| { type: 'SET_FILE'; file: SourceFile } \| { type: 'SET_STORES'; stor…` | Keep — single-domain convenience type (no Python counterpart). |
| 388 | debrief-loader | `apps/loader/src/renderer/components/common/WizardHeader.tsx:8` | `WizardHeaderProps` | interface `WizardHeaderProps` | Keep — single-domain convenience type (no Python counterpart). |
| 389 | debrief-loader | `apps/loader/src/renderer/components/common/WizardNavigation.tsx:8` | `WizardNavigationProps` | interface `WizardNavigationProps` | Keep — single-domain convenience type (no Python counterpart). |
| 390 | debrief-loader | `apps/loader/src/renderer/components/ErrorView.tsx:9` | `ErrorViewProps` | interface `ErrorViewProps` | Keep — single-domain convenience type (no Python counterpart). |
| 391 | debrief-loader | `apps/loader/src/renderer/components/NoStoresView.tsx:10` | `NoStoresViewProps` | interface `NoStoresViewProps` | Keep — single-domain convenience type (no Python counterpart). |
| 392 | debrief-loader | `apps/loader/src/renderer/components/PlotConfig/AddExistingTab.tsx:10` | `AddExistingTabProps` | interface `AddExistingTabProps` | Keep — single-domain convenience type (no Python counterpart). |
| 393 | debrief-loader | `apps/loader/src/renderer/components/PlotConfig/CreateNewTab.tsx:9` | `CreateNewTabProps` | interface `CreateNewTabProps` | Keep — single-domain convenience type (no Python counterpart). |
| 394 | debrief-loader | `apps/loader/src/renderer/components/PlotConfig/index.tsx:15` | `PlotConfigProps` | interface `PlotConfigProps` | Keep — single-domain convenience type (no Python counterpart). |
| 395 | debrief-loader | `apps/loader/src/renderer/components/PlotConfig/PlotCard.tsx:9` | `PlotCardProps` | interface `PlotCardProps` | Keep — single-domain convenience type (no Python counterpart). |
| 396 | debrief-loader | `apps/loader/src/renderer/components/ProgressView/index.tsx:8` | `ProgressViewProps` | interface `ProgressViewProps` | Keep — single-domain convenience type (no Python counterpart). |
| 397 | debrief-loader | `apps/loader/src/renderer/components/StoreSelector/index.tsx:14` | `StoreSelectorProps` | interface `StoreSelectorProps` | Keep — single-domain convenience type (no Python counterpart). |
| 398 | debrief-loader | `apps/loader/src/renderer/components/StoreSelector/StoreCard.tsx:9` | `StoreCardProps` | interface `StoreCardProps` | Keep — single-domain convenience type (no Python counterpart). |
| 399 | debrief-loader | `apps/loader/src/renderer/components/SuccessView.tsx:9` | `SuccessViewProps` | interface `SuccessViewProps` | Keep — single-domain convenience type (no Python counterpart). |
| 400 | debrief-loader | `apps/loader/src/renderer/hooks/useLoadWorkflow.ts:10` | `LoadOptions` | interface `LoadOptions` | Keep — single-domain convenience type (no Python counterpart). |
| 401 | debrief-loader | `apps/loader/src/renderer/hooks/useLoadWorkflow.ts:26` | `UseLoadWorkflowResult` | interface `UseLoadWorkflowResult` | Keep — single-domain convenience type (no Python counterpart). |
| 402 | debrief-loader | `apps/loader/src/renderer/hooks/usePlots.ts:8` | `UsePlotsResult` | interface `UsePlotsResult` | Keep — single-domain convenience type (no Python counterpart). |
| 403 | debrief-loader | `apps/loader/src/renderer/hooks/useStores.ts:8` | `UseStoresResult` | interface `UseStoresResult` | Keep — single-domain convenience type (no Python counterpart). |
| 404 | debrief-loader | `apps/loader/src/renderer/i18n/index.ts:11` | `TranslationKeys` | type alias = `keyof typeof en` | Keep — single-domain convenience type (no Python counterpart). |
| 405 | debrief-loader | `apps/loader/src/renderer/types/forms.ts:8` | `NewPlotForm` | interface `NewPlotForm` | Keep — single-domain convenience type (no Python counterpart). |
| 406 | debrief-loader | `apps/loader/src/renderer/types/forms.ts:24` | `NewStoreForm` | interface `NewStoreForm` | Keep — single-domain convenience type (no Python counterpart). |
| 407 | debrief-loader | `apps/loader/src/renderer/types/state.ts:12` | `SourceFile` | interface `SourceFile` | Keep — single-domain convenience type (no Python counterpart). |
| 408 | debrief-loader | `apps/loader/src/renderer/types/state.ts:42` | `LoaderState` | interface `LoaderState` | Keep — single-domain convenience type (no Python counterpart). |
| 409 | debrief-loader | `apps/loader/src/renderer/types/store.ts:8` | `StacStoreInfo` | interface `StacStoreInfo` | Keep — single-domain convenience type (no Python counterpart). |
| 410 | debrief-loader | `apps/loader/src/renderer/types/store.ts:31` | `PlotInfo` | interface `PlotInfo` | Keep — single-domain convenience type (no Python counterpart). |
| 411 | debrief-vscode | `apps/vscode/src/commands/captureScene.ts:26` | `StoryboardPlotFeature` | type alias = `StoryboardPlot['features'][number]` | Keep — single-domain convenience type (no Python counterpart). |
| 412 | debrief-vscode | `apps/vscode/src/commands/captureScene.ts:40` | `CaptureCommandContext` | interface `CaptureCommandContext` | Keep — single-domain convenience type (no Python counterpart). |
| 413 | debrief-vscode | `apps/vscode/src/commands/captureScene.ts:55` | `CaptureCommandDeps` | interface `CaptureCommandDeps` | Keep — single-domain convenience type (no Python counterpart). |
| 414 | debrief-vscode | `apps/vscode/src/commands/captureScene.ts:72` | `CaptureResult` | type alias = `\| { readonly status: 'captured'; readonly scene: SceneFeature } \| { r…` | Keep — single-domain convenience type (no Python counterpart). |
| 415 | debrief-vscode | `apps/vscode/src/commands/captureScene.ts:90` | `ResolvedDeps` | interface `ResolvedDeps` | Keep — single-domain convenience type (no Python counterpart). |
| 416 | debrief-vscode | `apps/vscode/src/commands/captureScene.ts:125` | `CaptureInFlightSink` | interface `CaptureInFlightSink` | Keep — single-domain convenience type (no Python counterpart). |
| 417 | debrief-vscode | `apps/vscode/src/commands/changeTrackColor.ts:12` | `ChangeColorArgs` | interface `ChangeColorArgs` | Keep — single-domain convenience type (no Python counterpart). |
| 418 | debrief-vscode | `apps/vscode/src/commands/importRep.ts:20` | `ImportRepArgs` | interface `ImportRepArgs` | Keep — single-domain convenience type (no Python counterpart). |
| 419 | debrief-vscode | `apps/vscode/src/commands/importRep.ts:25` | `ExistingPlotPickItem` | interface `ExistingPlotPickItem` | Keep — single-domain convenience type (no Python counterpart). |
| 420 | debrief-vscode | `apps/vscode/src/commands/importRep.ts:32` | `NewPlotPickItem` | interface `NewPlotPickItem` | Keep — single-domain convenience type (no Python counterpart). |
| 421 | debrief-vscode | `apps/vscode/src/commands/importRep.ts:38` | `ImportPickItem` | type alias = `ExistingPlotPickItem \| NewPlotPickItem` | Keep — single-domain convenience type (no Python counterpart). |
| 422 | debrief-vscode | `apps/vscode/src/commands/openPlot.ts:90` | `PlotQuickPickItem` | interface `PlotQuickPickItem` | Keep — single-domain convenience type (no Python counterpart). |
| 423 | debrief-vscode | `apps/vscode/src/panels/catalogOverviewPanel.ts:16` | `LoadCatalogOverviewMessage` | interface `LoadCatalogOverviewMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 424 | debrief-vscode | `apps/vscode/src/panels/catalogOverviewPanel.ts:39` | `ExtensionToOverviewMessage` | type alias = `LoadCatalogOverviewMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 425 | debrief-vscode | `apps/vscode/src/panels/catalogOverviewPanel.ts:42` | `OverviewItemSelectedMessage` | interface `OverviewItemSelectedMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 426 | debrief-vscode | `apps/vscode/src/panels/catalogOverviewPanel.ts:48` | `OverviewWebviewReadyMessage` | interface `OverviewWebviewReadyMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 427 | debrief-vscode | `apps/vscode/src/panels/catalogOverviewPanel.ts:53` | `OverviewViewportChangedMessage` | interface `OverviewViewportChangedMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 428 | debrief-vscode | `apps/vscode/src/panels/catalogOverviewPanel.ts:66` | `OverviewToExtensionMessage` | type alias = `\| OverviewItemSelectedMessage \| OverviewWebviewReadyMessage \| Overvie…` | Keep — single-domain convenience type (no Python counterpart). |
| 429 | debrief-vscode | `apps/vscode/src/providers/layersTreeProvider.ts:34` | `FeatureBase` | interface `FeatureBase` | Keep — single-domain convenience type (no Python counterpart). |
| 430 | debrief-vscode | `apps/vscode/src/providers/layersTreeProvider.ts:50` | `TrackLike` | interface `TrackLike` | Keep — single-domain convenience type (no Python counterpart). |
| 431 | debrief-vscode | `apps/vscode/src/providers/layersTreeProvider.ts:63` | `RefLocLike` | interface `RefLocLike` | Keep — single-domain convenience type (no Python counterpart). |
| 432 | debrief-vscode | `apps/vscode/src/providers/layersTreeProvider.ts:87` | `LayerItem` | type alias = `\| { type: 'header'; label: string; id: string } \| { type: 'feature'; …` | Keep — single-domain convenience type (no Python counterpart). |
| 433 | debrief-vscode | `apps/vscode/src/providers/stacTreeProvider.ts:12` | `TreeItemData` | type alias = `StacStore \| Catalog \| StacItemSummary` | Keep — single-domain convenience type (no Python counterpart). |
| 434 | debrief-vscode | `apps/vscode/src/services/activityBarService.ts:87` | `PinnedViewlet` | interface `PinnedViewlet` | Keep — single-domain convenience type (no Python counterpart). |
| 435 | debrief-vscode | `apps/vscode/src/services/resultsPanelService.ts:37` | `PlotKey` | interface `PlotKey` | Keep — single-domain convenience type (no Python counterpart). |
| 436 | debrief-vscode | `apps/vscode/src/services/resultsPanelService.ts:68` | `ResultsPanelViewController` | interface `ResultsPanelViewController` | Keep — single-domain convenience type (no Python counterpart). |
| 437 | debrief-vscode | `apps/vscode/src/services/resultsPanelService.ts:82` | `ResultsPanelServiceDeps` | interface `ResultsPanelServiceDeps` | Keep — single-domain convenience type (no Python counterpart). |
| 438 | debrief-vscode | `apps/vscode/src/services/sceneThumbnailError.ts:10` | `SceneThumbnailErrorCode` | type alias = `\| 'stac-item-not-found' \| 'item-json-unreadable' \| 'item-json-malform…` | Keep — single-domain convenience type (no Python counterpart). |
| 439 | debrief-vscode | `apps/vscode/src/services/sceneThumbnailService.ts:28` | `WriteSceneThumbnailResult` | interface `WriteSceneThumbnailResult` | Keep — single-domain convenience type (no Python counterpart). |
| 440 | debrief-vscode | `apps/vscode/src/services/sceneThumbnailService.ts:41` | `SceneThumbnailServiceDeps` | interface `SceneThumbnailServiceDeps` | Keep — single-domain convenience type (no Python counterpart). |
| 441 | debrief-vscode | `apps/vscode/src/services/sceneThumbnailService.ts:45` | `FsLike` | type alias = `Pick< typeof fs.promises, 'mkdir' \| 'writeFile' \| 'readFile' \| 'renam…` | Keep — single-domain convenience type (no Python counterpart). |
| 442 | debrief-vscode | `apps/vscode/src/services/sceneThumbnailService.ts:52` | `StacItemAssets` | interface `StacItemAssets` | Keep — single-domain convenience type (no Python counterpart). |
| 443 | debrief-vscode | `apps/vscode/src/services/toolMatchAdapter.ts:37` | `FeatureKindLookup` | type alias = `(featureId: string) => string \| undefined` | Keep — single-domain convenience type (no Python counterpart). |
| 444 | debrief-vscode | `apps/vscode/src/tools/reference/classification/pointInZoneClassifier.ts:23` | `ZoneMetadata` | interface `ZoneMetadata` | Keep — single-domain convenience type (no Python counterpart). |
| 445 | debrief-vscode | `apps/vscode/src/types/import.ts:82` | `ParseWarning` | interface `ParseWarning` | Keep — single-domain convenience type (no Python counterpart). |
| 446 | debrief-vscode | `apps/vscode/src/types/openPlots.ts:11` | `OpenPlotReference` | interface `OpenPlotReference` | Keep — single-domain convenience type (no Python counterpart). |
| 447 | debrief-vscode | `apps/vscode/src/types/openPlots.ts:27` | `OpenPlotsState` | interface `OpenPlotsState` | Keep — single-domain convenience type (no Python counterpart). |
| 448 | debrief-vscode | `apps/vscode/src/types/storyboardPanelMessages.ts:12` | `StoryboardPanelMessage` | type alias = `\| { readonly type: 'ready' } \| { readonly type: 'capture-clicked' } \|…` | Keep — single-domain convenience type (no Python counterpart). |
| 449 | debrief-vscode | `apps/vscode/src/types/storyboardPanelMessages.ts:23` | `ExtensionToStoryboardPanelMessage` | type alias = `\| { readonly type: 'scenes'; readonly scenes: SceneRowViewModel[]; re…` | Keep — single-domain convenience type (no Python counterpart). |
| 450 | debrief-vscode | `apps/vscode/src/views/storyboardPanelView.ts:21` | `StoryboardPlotFeature` | type alias = `StoryboardPlot['features'][number]` | Keep — single-domain convenience type (no Python counterpart). |
| 451 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:28` | `TuneRequestMessage` | interface `TuneRequestMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 452 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:33` | `RevertToRequestMessage` | interface `RevertToRequestMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 453 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:38` | `RevertThisRequestMessage` | interface `RevertThisRequestMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 454 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:43` | `RestoreRequestMessage` | interface `RestoreRequestMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 455 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:48` | `ReplayCancelMessage` | interface `ReplayCancelMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 456 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:53` | `DisableToggleMessage` | interface `DisableToggleMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 457 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:58` | `RationaleUpdateMessage` | interface `RationaleUpdateMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 458 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:63` | `SchemaRequestMessage` | interface `SchemaRequestMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 459 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:103` | `ReplayProgressPayload` | interface `ReplayProgressPayload` | Keep — single-domain convenience type (no Python counterpart). |
| 460 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:110` | `ReplayProgressMessage` | interface `ReplayProgressMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 461 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:116` | `ReplayResultMessage` | interface `ReplayResultMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 462 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:121` | `ReplayErrorMessage` | interface `ReplayErrorMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 463 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:126` | `SchemaResponseMessage` | interface `SchemaResponseMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 464 | debrief-vscode | `apps/vscode/src/webview/logPanelMessages.ts:156` | `VsCodeApiLike` | interface `VsCodeApiLike` | Keep — single-domain convenience type (no Python counterpart). |
| 465 | debrief-vscode | `apps/vscode/src/webview/web/activityPanel.tsx:36` | `ActivityPanelWebviewState` | interface `ActivityPanelWebviewState` | Keep — single-domain convenience type (no Python counterpart). |
| 466 | debrief-vscode | `apps/vscode/src/webview/web/activityPanel.tsx:41` | `TemporalUpdateMessage` | interface `TemporalUpdateMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 467 | debrief-vscode | `apps/vscode/src/webview/web/activityPanel.tsx:61` | `LayersUpdateMessage` | interface `LayersUpdateMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 468 | debrief-vscode | `apps/vscode/src/webview/web/activityPanel.tsx:73` | `SelectionUpdateMessage` | interface `SelectionUpdateMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 469 | debrief-vscode | `apps/vscode/src/webview/web/activityPanel.tsx:80` | `SetUIStateMessage` | interface `SetUIStateMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 470 | debrief-vscode | `apps/vscode/src/webview/web/catalogOverview.tsx:26` | `CatalogData` | interface `CatalogData` | Keep — single-domain convenience type (no Python counterpart). |
| 471 | debrief-vscode | `apps/vscode/src/webview/web/logPanel.tsx:40` | `LogPanelWebviewState` | interface `LogPanelWebviewState` | Keep — single-domain convenience type (no Python counterpart). |
| 472 | debrief-vscode | `apps/vscode/src/webview/web/mapView.tsx:29` | `PersistedState` | interface `PersistedState` | Keep — single-domain convenience type (no Python counterpart). |
| 473 | debrief-vscode | `apps/vscode/src/webview/web/resultsPanel.tsx:39` | `VsCodeApi` | interface `VsCodeApi` | Keep — single-domain convenience type (no Python counterpart). |
| 474 | debrief-vscode | `apps/vscode/src/webview/web/resultsPanel.tsx:51` | `TabSnapshot` | interface `TabSnapshot` | Keep — single-domain convenience type (no Python counterpart). |
| 475 | debrief-vscode | `apps/vscode/src/webview/web/resultsPanel.tsx:65` | `SetTabsMessage` | interface `SetTabsMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 476 | debrief-vscode | `apps/vscode/src/webview/web/resultsPanel.tsx:73` | `SetVisibilityMessage` | interface `SetVisibilityMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 477 | debrief-vscode | `apps/vscode/src/webview/web/resultsPanel.tsx:78` | `SetLoadingMessage` | interface `SetLoadingMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 478 | debrief-vscode | `apps/vscode/src/webview/web/storyboardPanel.tsx:13` | `AcquiredVsCodeApi` | interface `AcquiredVsCodeApi` | Keep — single-domain convenience type (no Python counterpart). |
| 479 | debrief-vscode | `apps/vscode/src/webview/web/storyboardPanel.tsx:19` | `ScenesMessage` | interface `ScenesMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 480 | debrief-vscode | `apps/vscode/src/webview/web/storyboardPanel.tsx:26` | `CaptureInFlightMessage` | interface `CaptureInFlightMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 481 | debrief-vscode | `apps/vscode/src/webview/web/storyboardPanel.tsx:31` | `ThemeMessage` | interface `ThemeMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 482 | debrief-vscode | `apps/vscode/src/webview/web/timeController.tsx:26` | `TimeExtentMessage` | interface `TimeExtentMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 483 | debrief-vscode | `apps/vscode/src/webview/web/timeController.tsx:39` | `SetUIStateMessage` | interface `SetUIStateMessage` | Keep — single-domain convenience type (no Python counterpart). |
| 484 | debrief-vscode | `apps/vscode/tests/__mocks__/vscode.ts:64` | `MockUri` | interface `MockUri` | Keep — single-domain convenience type (no Python counterpart). |
| 485 | debrief-vscode | `apps/vscode/tests/__mocks__/vscode.ts:71` | `MockCommand` | interface `MockCommand` | Keep — single-domain convenience type (no Python counterpart). |
| 486 | debrief-vscode | `apps/vscode/tests/__mocks__/vscode.ts:78` | `MockThemeIcon` | interface `MockThemeIcon` | Keep — single-domain convenience type (no Python counterpart). |


## 4. Python cross-domain appendix

Per spec FR-012 — hand-authored Python types whose instances appear to cross
the Python ↔ TypeScript boundary are surfaced here as signals, without being
classified against the five TS buckets.

Methodology: `grep -r "class.*BaseModel" services/ shared/ --include="*.py"`
at the audit SHA, then inspect each class for evidence of cross-domain use
(MCP JSON-RPC emission, STAC asset persistence, session-state serialisation,
IPC response shape).

| File | Declaration | Kind | Cross-domain evidence | Suggested follow-up |
|------|-------------|------|-----------------------|---------------------|
| `services/calc/debrief_calc/models.py` | `ToolResult` | BaseModel | Returned from MCP tool calls (`debrief-calc` service) — serialised to JSON and consumed by TS `MCPToolResponse` | Fold into #222 — the LinkML source becomes the single root for both Python and TS. |
| `services/calc/debrief_calc/models.py` | `ToolParameter` | BaseModel | Same as ToolResult — MCP tool definitions serialise these | Fold into #222. |
| `services/calc/debrief_calc/models.py` | `ToolError` | BaseModel | MCP error-response envelope | Fold into #222. |
| `services/calc/debrief_calc/models.py` | `Tool` | BaseModel | MCP tool-definition envelope (name, schema, description) | Fold into #222. |
| `services/calc/debrief_calc/models.py` | `Provenance` | BaseModel | Written to STAC asset metadata + session-state FeatureProvenance — name-matches the TS `FeatureProvenance` but structural overlap not verified here | Fold into #224 (session-state) and #223 (STAC) — confirm shape alignment during those phases. |
| `services/calc/debrief_calc/models.py` | `ModifiedFeature` | BaseModel | Name collision with TS `ModifiedFeature` in `services/session-state/src/log/types.ts` — likely meant to be the same wire shape | Fold into #224. |
| `services/calc/debrief_calc/models.py` | `PropertyDelta` | BaseModel | Feature-state change shape, serialised across MCP | Fold into #224. |
| `services/calc/debrief_calc/models.py` | `CreatedAsset` | BaseModel | STAC asset creation response | Fold into #223. |
| `services/calc/debrief_calc/models.py` | `SourceRef` | BaseModel | Feature provenance reference | Fold into #224. |
| `services/calc/debrief_calc/models.py` | `SelectionContext` | BaseModel | MCP tool-context payload (selected features) | Fold into #222. |
| `services/calc/debrief_calc/models.py` | `ContextType` | StrEnum | Used by `SelectionContext` — consumed on the TS side for menu labelling | Fold into #222 (promote to LinkML enum). |
| `services/io/src/debrief_io/models.py` | `ParseResult` | BaseModel | File-parse response — name collides with TS `ParseResult` drift cluster (`apps/loader/src/renderer/types/results.ts` + `apps/vscode/src/types/import.ts`) | Fold into #225. |
| `services/io/src/debrief_io/models.py` | `ParseWarning` | BaseModel | Attached to ParseResult payload | Fold into #225. |
| `services/io/src/debrief_io/models.py` | `ImportResult` | BaseModel | Multi-file import envelope — serialised over IPC to the loader renderer and the VS Code extension host | Fold into #225. |
| `services/io/src/debrief_io/models.py` | `ImportWarning` / `ImportFileError` | BaseModel | Attached to ImportResult | Fold into #225. |
| `services/io/src/debrief_io/models.py` | `HandlerInfo` | BaseModel | File-handler registry returned over IPC | Fold into #225. |
| `services/session-state-py/src/debrief_session/types.py` | `SessionState` | BaseModel | Top-level session-state persisted shape — mirrors TS `StateSnapshot` | Fold into #224. |
| `services/session-state-py/src/debrief_session/types.py` | `SpatialSlice` / `FeaturesSlice` / `DocumentSlice` | BaseModel | Session-state slice shapes — serialised across MCP and to disk | Fold into #224. |
| `services/stac/src/debrief_stac/models.py` | `PlotMetadata` | BaseModel | STAC Item metadata shape persisted to `item.json` and read by the TS loader | Fold into #223. |
| `services/stac/src/debrief_stac/models.py` | `PlotSummary` | BaseModel | STAC list-plots response — consumed by TS `ListPlotsResponse` | Fold into #223 + #225. |
| `services/stac/src/debrief_stac/models.py` | `CollectionExtent` / `CollectionSummaries` / `TemporalExtent` | BaseModel | STAC collection metadata — persisted + returned over MCP | Fold into #223. |
| `services/stac/src/debrief_stac/models.py` | `AssetProvenance` | BaseModel | STAC asset metadata — mirrors calc `Provenance` | Fold into #223 + #224. |
| `services/config/src/debrief_config/models.py` | `Config` | BaseModel | Name collision with TS `DebriefConfig` drift cluster (`apps/loader/src/main/ipc/config.ts` + `apps/vscode/src/services/configService.ts`) — the Python `Config` is the shared authoritative shape | Fold into #226 (residual drift) — the Python side is the win candidate. |
| `services/config/src/debrief_config/models.py` | `StoreRegistration` | BaseModel | Store-registration row of the config bundle | Fold into #226. |

**Caveat**: this appendix is a name-based sweep, not a structural analysis.
A Pydantic class whose instances never cross the boundary (pure intra-Python
convenience) is not distinguishable from one that does without reading each
call site. The entries above were manually verified against MCP tool
registration, STAC persistence, and session-state IPC paths; follow-up
phases should re-verify during schema-promotion work.

## 5. Re-run log / changelog

| Date | Commit | Outcome |
|------|--------|---------|
| 2026-04-21 | `01166d6e` | Initial audit — 885 declarations, 25 drift clusters. |
| 2026-05-13 | `fc4b5f6`  | **#222 MCP cluster resolved** — see [spec 222](../specs/222-linkml-mcp-envelopes/spec.md). §3.1 `cross-domain-hand-typed` rows attributed to #222 dropped from **17 → 0** (MCPRequest, MCPContentItem, MCPToolResponse, MCPErrorResponse, MCPParamSchema×2, MCPSelectionRequirement, MCPToolDefinition, ToolParameterMeta, ToolDefinition, ToolResult, ToolResultForLog, ToolExecutionResultForReplay, ToolExecutor, ToolVersionResolver, ToolName, ToolsUpdateMessage). §3.2 `ToolParameter` drift cluster dropped from **2 → 0** (both sites collapsed onto the existing `tool.yaml.ToolParameter`, extended with a new `choices` slot). 15 LinkML classes + 4 permissible-values enums added under `shared/schemas/src/linkml/mcp.yaml`; 2 TS-only function-type aliases (`ToolExecutor`, `ToolVersionResolver`) live under `shared/schemas/src/typescript/aliases/mcp-functions.ts` and are R4-import-schema-rooted. |
