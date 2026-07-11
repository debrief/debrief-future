# Contract: LM Tools (`contributes.languageModelTools`)

The four tools contributed in `apps/vscode/package.json` and registered via `vscode.lm.registerTool`. Names use VS Code's `{verb}_{noun}` convention. `modelDescription` is what Copilot reads to decide when to call each.

## 1. `debrief_searchPlots` (read — no confirmation)

- **displayName**: "Search Debrief plots"
- **modelDescription**: "Search the local STAC catalog for plots by free text (title/description), time range, platform name/type, and/or spatial bounding box. Returns matching plots with id, title, time span, platforms, and extent. Optionally opens a single match in the Debrief plot editor."
- **inputSchema**: `SearchPlotsInput` (data-model.md). All properties optional.
- **result**: JSON array of `PlotMatch`. If `open: true` and exactly one match, also invokes `debrief.openPlot` and notes it opened.
- **canBeReferencedInPrompt**: true · **tags**: `["debrief"]`

## 2. `debrief_summarizeCurrentPlot` (read — no confirmation)

- **modelDescription**: "Summarise the currently open Debrief plot: metadata plus a thinned inventory of its features (names, types, platforms, time spans, counts — no geometry). Use before targeting an edit. Accepts an optional plotId to summarise a specific open plot; also lists all open plots."
- **inputSchema**: `SummarizeCurrentPlotInput`
- **result**: `PlotSummary` (includes `approxTokens`, `openPlots`, `truncated`). No open plot ⇒ `{ noPlotOpen: true, hint: "search the catalog first" }`.

## 3. `debrief_listTools` (read — no confirmation)

- **modelDescription**: "List the Debrief analysis/editing tools available for the current plot and selection, with their parameters and whether each modifies the plot. Call before runTool to choose a tool and build valid parameters."
- **inputSchema**: `ListToolsInput`
- **result**: JSON array of `ToolRegistryView` (live from `calcService`). Registry unavailable ⇒ `{ toolsUnavailable: true, reason }` (edge case — never a stale list).

## 4. `debrief_runTool` (mutate/analyse — confirmation via prepareInvocation)

- **modelDescription**: "Run a Debrief tool by id against the current plot. Tools that modify the plot require user confirmation; analytical tools return a summary and populate the Results panel. Pass the analyst's original request as `utterance` for provenance."
- **inputSchema**: `RunToolInput`
- **prepareInvocation**:
  - Resolve the tool from the live registry. If `mutating`, return `confirmationMessages`:
    - **title**: `Run {toolName} on {plotTitle}`
    - **message** (markdown, plain-language — FR-015): what changes, which features (by name, from selection/scope), and the parameter values. Never raw JSON.
  - If analytical (non-mutating), omit `confirmationMessages` (auto-run).
  - `invocationMessage`: `Running {toolName}…`
- **invoke**:
  1. Validate `toolId` + `params` against the registry schema → corrective text result on failure (FR-017), no Python spawn.
  2. Resolve target plot (R6) and operating features (`scope`).
  3. `calcService.executeTool(...)` (shared path, R4).
  4. **Mutation** → `applyChatEdit` (`updatePlotFeatures`, mark dirty, **no disk write** — R5/FR-011). **Analytical** → `resultsPanelService.addDatasetsForToolResult`. **Failure** → `addErrorTab` + structured error text (FR-018).
  5. Record provenance + utterance (R7) and append a `TelemetryRecord` (R8).
  6. Return a `LanguageModelToolResult` text part summarising the outcome (features changed / result location / error).
- **Guarantees**: decline ⇒ nothing applied, resolves as declined not error (FR-016). A mutating result reaching `invoke` without a prior confirmation MUST throw (data-model validation rule).

## Confirmation policy matrix

| Tool | Mutates? | Confirmation |
|------|----------|--------------|
| searchPlots | no | none |
| summarizeCurrentPlot | no | none |
| listTools | no | none |
| runTool (analytical toolId) | no | none |
| runTool (mutating toolId) | yes | `prepareInvocation` plain-language gate |
