# Research: Context-Sensitive Tool Offering VS Code Integration

**Feature**: #038 Context-Tool-VSCode
**Date**: 2026-01-27

## Research Questions

### 1. How to bridge session-state selection to ToolMatchService Selection type?

**Decision**: Create a `ToolMatchAdapter` service that subscribes to session selection changes and converts `FeatureSelection` (from session-state) to `Selection` (Map<string, number> from ToolMatchService).

**Rationale**:
- Session-state stores `featureIds: string[]` which identifies features but not their kinds
- ToolMatchService needs `Selection` = Map<string, number> mapping kinds to counts
- The adapter needs access to the feature collection to look up feature kinds

**Implementation Pattern**:
```typescript
// ToolMatchAdapter bridges session selection to ToolMatchService
class ToolMatchAdapter {
  constructor(
    private sessionManager: SessionManager,
    private calcService: CalcService
  ) {}

  // Convert FeatureSelection → ToolMatchService Selection
  getSelection(features: GeoJSONFeature[], selectedIds: string[]): Selection {
    const counts: Record<string, number> = {};
    for (const id of selectedIds) {
      const feature = features.find(f => f.id === id);
      const kind = feature?.properties?.kind ?? 'UNKNOWN';
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    return createSelectionFromCounts(counts);
  }
}
```

**Alternatives Considered**:
- Store feature kinds in session-state selection - Rejected: violates separation (session-state is generic, shouldn't know about Debrief kinds)
- Pass full features to ToolMatchService - Rejected: ToolMatchService API uses Map<string, number>, not features

### 2. How to integrate ToolMatchService with ToolsTreeProvider?

**Decision**: Inject ToolMatchService (via adapter) into ToolsTreeProvider. On selection change, call `service.getMatchResults(selection)` to get active/inactive tools with explanations.

**Rationale**:
- ToolsTreeProvider already receives selection context from MapPanel
- ToolMatchService.getMatchResults() returns both active and inactive tools with explanations
- Tree provider can filter based on "show inactive" toggle

**Implementation Pattern**:
```typescript
// In ToolsTreeProvider
private _toolMatchService: ToolMatchService | null = null;

setToolMatchService(service: ToolMatchService): void {
  this._toolMatchService = service;
}

private getChildren(): ToolTreeItem[] {
  if (!this._toolMatchService || !this._selection) {
    return this._showEmpty();
  }

  const results = this._toolMatchService.getMatchResults(this._selection);
  const visible = this._showInactive
    ? results
    : results.filter(r => r.isActive);

  return visible.map(r => new ToolTreeItem(r.tool, r.isActive, r.explanation));
}
```

**Alternatives Considered**:
- Keep existing contextType-based filtering - Rejected: less flexible, doesn't support explanation text
- Pass tools directly to tree provider - Rejected: violates single-responsibility (tree provider shouldn't do matching)

### 3. How to handle tool discovery from debrief-calc via MCP?

**Decision**: Use existing CalcService.listTools() which caches tool metadata. Convert MCP tool responses to `Tool[]` compatible with ToolMatchService schema.

**Rationale**:
- CalcService already has circuit breaker pattern, 60s TTL cache
- Tool metadata from MCP should conform to LinkML-defined Tool schema
- Validation against schema ensures bad tools are excluded

**Implementation Pattern**:
```typescript
// In CalcService (existing)
async listTools(): Promise<Tool[]> {
  if (this._toolsCache && Date.now() - this._toolsCacheTime < 60000) {
    return this._toolsCache;
  }

  const response = await this._mcpClient.listTools();
  const validated = response.tools.filter(t => validateToolSchema(t));

  this._toolsCache = validated;
  this._toolsCacheTime = Date.now();
  return validated;
}
```

**Alternatives Considered**:
- Fetch tools on every selection change - Rejected: unnecessary network overhead
- Store tools in session-state - Rejected: tools are global, not per-document

### 4. How to implement context menu integration?

**Decision**: Use VS Code's `menus` contribution point with `when` clauses based on context values. Dynamically register menu items when tools change.

**Rationale**:
- VS Code context menus use declarative `when` clauses
- Need to set context values (`debrief.tool.{id}.active`) for each tool
- Context updates trigger menu re-evaluation

**Implementation Pattern**:
```typescript
// In extension.ts - set context for each tool
function updateToolContexts(activeTools: Tool[]): void {
  const activeIds = new Set(activeTools.map(t => t.id));

  for (const tool of allTools) {
    vscode.commands.executeCommand(
      'setContext',
      `debrief.tool.${tool.id}.active`,
      activeIds.has(tool.id)
    );
  }
}

// In package.json contributes.menus
"editor/context": [
  {
    "command": "debrief.executeTool.rangeAndBearing",
    "when": "debrief.plotOpen && debrief.tool.range-and-bearing.active",
    "group": "debrief.tools"
  }
]
```

**Alternatives Considered**:
- Custom context menu provider - Rejected: VS Code webviews don't support custom providers
- Single "Tools" submenu with dynamic items - Accepted as complement: shows grouped tools

### 5. How to implement Command Palette integration?

**Decision**: Register commands for all tools at activation, use `when` clauses to control visibility based on selection state.

**Rationale**:
- VS Code commands must be registered at activation (can't add dynamically)
- `when` clauses hide commands when tool is inactive
- Category prefix "Debrief: " groups commands in palette

**Implementation Pattern**:
```typescript
// In extension.ts
function registerToolCommands(tools: Tool[]): vscode.Disposable[] {
  return tools.map(tool =>
    vscode.commands.registerCommand(
      `debrief.executeTool.${tool.id}`,
      () => executeTool(tool)
    )
  );
}

// In package.json contributes.commands
{
  "command": "debrief.executeTool.rangeAndBearing",
  "title": "Debrief: Range & Bearing",
  "enablement": "debrief.tool.range-and-bearing.active"
}
```

**Alternatives Considered**:
- Quick pick instead of commands - Rejected: doesn't integrate with standard palette UX
- Dynamic command registration - Rejected: VS Code API doesn't support unregistering commands

### 6. How to persist tool results with provenance?

**Decision**: Tool execution returns a result envelope with add/update/remove operations. Apply operations to plot, then persist via StacService with provenance metadata attached.

**Rationale**:
- Provenance is a Constitution requirement (III. Data Sovereignty)
- ResultEnvelope pattern established in #027 spec
- StacService.addFeatures() already supports metadata

**Implementation Pattern**:
```typescript
// In executeTool command
async function executeTool(tool: Tool, selection: FeatureSelection): Promise<void> {
  const result = await calcService.executeTool(tool.id, selection.featureIds);

  const provenance: Provenance = {
    tool: { id: tool.id, name: tool.name, version: tool.version },
    timestamp: new Date().toISOString(),
    sourceFeatureIds: selection.featureIds,
  };

  // Apply result operations
  for (const feature of result.add ?? []) {
    feature.properties.provenance = provenance;
  }

  await stacService.addFeatures(plotUri, result.add ?? []);
  await stacService.updateFeatures(plotUri, result.update ?? []);
  await stacService.removeFeatures(plotUri, result.remove ?? []);
}
```

**Alternatives Considered**:
- Provenance as separate linked document - Rejected: complicates querying, provenance should be inline
- Skip provenance for "simple" tools - Rejected: Constitution requires provenance always

### 7. What test data enrichment is needed?

**Decision**: Update `exercise-alpha.geojson` to include all supported feature kinds: TRACK (existing), CIRCLE, RECTANGLE, LINE, VECTOR, and point types.

**Rationale**:
- Current test data only has tracks and one waypoint
- Tool matching tests need diverse feature kinds
- Storybook demos should show realistic scenarios

**Implementation**:
Add features with kinds:
- 2 TRACK (existing)
- 1 CIRCLE (patrol zone)
- 1 RECTANGLE (search area)
- 1 LINE (boundary)
- 1 VECTOR (course projection)
- 2 Point types: Waypoint (existing), reference location

**Alternatives Considered**:
- Separate test file for tool testing - Rejected: better to have one comprehensive exercise
- Generate features programmatically - Rejected: fixture data should be human-readable

## Summary of Decisions

| Decision | Choice | Impact |
|----------|--------|--------|
| Selection bridge | ToolMatchAdapter service | New file: `toolMatchAdapter.ts` |
| Tree integration | Inject ToolMatchService | Update: `toolsTreeProvider.ts` |
| Tool discovery | Existing CalcService + validation | Update: `calcService.ts` |
| Context menu | VS Code `when` clauses | Update: `package.json` contributes |
| Command palette | Static registration + `enablement` | Update: `package.json` contributes |
| Result persistence | Inline provenance via StacService | Update: `executeTool.ts` |
| Test data | Enrich exercise-alpha.geojson | Update: `exercise-alpha.geojson` |
