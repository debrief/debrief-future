# Research: Copilot Chat Drives Debrief (Spike)

Phase 0 findings. Each decision resolves an unknown from the spec or Technical Context. Anchored to concrete code in `apps/vscode`.

## R1 — Integration surface: VS Code Language Model Tools API

- **Decision**: Contribute four tools via `contributes.languageModelTools` in `apps/vscode/package.json` and register implementations with `vscode.lm.registerTool` at activation. Tools set `canBeReferencedInPrompt: true` and `tags: ["debrief"]` so Copilot agent mode auto-discovers them.
- **Rationale**: The extension mediates every call, so it natively knows the active plot (`getMapPanel()`), the selection (`toolMatchAdapter.getSelectedFeatureIds()`), and can apply edits to the open editor — none of which an out-of-process MCP server would have. No user configuration required.
- **Engine requirement**: Agent-mode tool integration shipped in **VS Code 1.99** (March 2025); the extension currently declares `engines.vscode: ^1.85.0`. **Bump to `^1.99.0`.** ([VS Code 1.99 release notes](https://code.visualstudio.com/updates/v1_99), [LM Tool API guide](https://code.visualstudio.com/api/extension-guides/ai/tools))
- **Confirmation**: `LanguageModelTool.prepareInvocation` returns `confirmationMessages` (title + markdown body). A generic confirmation is always shown for extension tools, but we customise the body to the plain-language change description (FR-015). Read tools omit `confirmationMessages` so they auto-run.
- **Result type**: `invoke` returns a `LanguageModelToolResult` of `LanguageModelTextPart` — the tools return compact JSON/markdown the model reads back.
- **Alternatives rejected**: (a) MCP server — loses live editor context, adds a process for the user to configure; (b) `@debrief` chat participant — forces explicit invocation and reimplements orchestration Copilot already does. Both were rejected in spec Positioning / #235.

## R2 — Known limitation: the tool cannot read the active model

- **Finding**: The LM Tools API exposes no active-model identity to `invoke`. Copilot's model picker is out of the tool's reach.
- **Impact on FR-026 (multi-model comparison)**: the telemetry record's `activeModel` field is **operator-annotated per scenario run** (the operator selects the model, then runs the scripted set), not auto-captured. The comparison is still valid; it just isn't automatic.
- **Consequence for the findings report**: model attribution is a manual column. Documented as a known limitation (spec SC-008 "model sensitivity").

## R3 — STAC search placement (resolves FR-007)

- **Decision**: Implement the 4-criteria search **client-side in TypeScript** over `stacService.listItems()`, in a new `searchCatalog.ts`. No new Python `debrief-stac` search API.
- **Rationale (least-work)**:
  - `stacService.listItems()` (`apps/vscode/src/services/stacService.ts:269`) already enumerates catalog items with the metadata the four criteria need (title/description, datetime, geometry/bbox); collection summaries (#136) surface platform lists.
  - Opening the chosen plot already has a command: **`debrief.openPlot`** (referenced from the STAC tree provider, `apps/vscode/src/providers/stacTreeProvider.ts:203`). The search tool calls it directly — no new open path.
  - Putting search in Python would mean a new MCP surface + a second code path for something the extension can already read. For a spike, TS-side filtering over the enumerated items is the smallest diff.
- **Filter semantics**: free-text = case-insensitive substring over title+description; time = interval overlap with item datetime/`start_datetime`/`end_datetime`; platform = membership against item platform properties / collection summary; spatial = bbox intersection. All optional and AND-combined (FR-004).
- **Alternative rejected**: Python `debrief-stac` search — cleaner Article IV.1 placement long-term, but out of proportion for a spike, and the future offline NL panel would revisit search placement anyway. Noted as a follow-up if the capability graduates.

## R4 — Tool execution reuse

- **Decision**: `debrief_runTool` and `debrief_listTools` delegate to the existing `CalcService`.
  - `listTools` → `calcService.listTools()` (`calcService.ts:213`) — already returns the live registry (MCP annotations, 60 s cache, circuit breaker). The LM tool returns the tool ids + parameter schemas + applicability.
  - `runTool` → `calcService.executeTool({toolId, featureIds, params})` (`calcService.ts:256`) — spawns the debrief-calc MCP server over stdio with the interpreter from `getPythonPath()` (`calcService.ts:566`), returns a typed `ToolExecutionResult` (`features`, `resultType` `mutation/*` vs additive/dataset, `modifiedFeatures`, `parameters`, `tool_version`).
- **Rationale**: Chat-invoked and panel-invoked runs share one execution path (FR-013), so validation, provenance shape, and behaviour match automatically.
- **Validation (FR-017)**: before dispatch, `runTool` checks the requested `toolId` against `calcService.getCurrentTools()` and validates params against that tool's schema, returning a corrective text result on mismatch rather than spawning Python.

## R5 — Edit round-trip and the disk-write divergence (resolves FR-011/FR-012)

- **Critical finding**: the existing Tools-panel command (`apps/vscode/src/commands/executeTool.ts`) applies a mutation via `panel.updatePlotFeatures(layer)` (`mapPanel.ts:338`) **and then immediately writes the mutation to disk** via `stacService.writeGeoJson(...)` (`executeTool.ts:297–320`). It does **not** use a VS Code custom-document `WorkspaceEdit`; the plot editor is a **webview custom editor** whose dirty/save state is app-managed through `sessionManager` and the `debrief.saveSession` command.
- **Decision**: the chat path reuses `calcService.executeTool` + `calcService.createResultLayer` + `mapPanel.updatePlotFeatures` (live in-memory update + webview refresh) but **omits the immediate `writeGeoJson` branch**. The edit therefore lands in live state and marks the session dirty, to be persisted only by the user's normal save — exactly FR-011 ("no direct STAC/GeoJSON writes from chat-driven edits").
- **Undo (FR-012)**: because undo is app/session-managed (not VS Code's native stack), "revert in a single step" maps to the existing session revert / discard-unsaved mechanism, not `undo` on a text document. Phase-1 task work must **verify** whether the current session model gives a clean single-step revert of an `updatePlotFeatures` change; if it does not, that is a **reported finding** (a gap the future NL panel must close), not new undo infrastructure built inside this spike. Spec SC-004 is satisfied by "decline/failure leaves the plot byte-identical" (guaranteed — nothing is applied on decline) plus whatever revert the session already offers for an applied-but-unsaved edit.
- **Analytical results (FR-014)**: dataset/statistics results route to `resultsPanelService.addDatasetsForToolResult({plotKey, toolId, result, sourceFeatureIds, sourceFeatureNames, parameters, parentActivityId})` and errors to `addErrorTab(...)` — identical to the panel path (`executeTool.ts:445–486`).

## R6 — Current-plot & selection resolution (resolves FR-009/FR-010)

- **Decision**: `plotContext.ts` resolves the target plot as: explicit `plotId` arg if supplied and matching an open plot, else the active panel from `getMapPanel()`. Open plots + their ids come from `openPlotsService.getOpenPlots()` (`openPlotsService.ts:27`) and are surfaced by `summarizeCurrentPlot`/`listTools` so Copilot can pass an override.
- **Selection**: read synchronously from `toolMatchAdapter.getSelectedFeatureIds()`; features from `panel.getFeatures()`. An empty selection on a selection-scoped request returns a "nothing selected" text result (FR-010 / US4 AC-2) — no guessing.

## R7 — Provenance with the initiating utterance (resolves FR-023)

- **Decision**: chat runs call the same `LogService.recordToolResult(...)` path the panel uses (`executeTool.ts:405`), and additionally stamp the run as chat-initiated together with the analyst's originating utterance.
- **Placement**: the utterance rides in the provenance metadata as an additive field (chat initiator + verbatim request). If the session-state provenance model has no free field, the spike carries it in the existing `parameters`/metadata envelope rather than amending the LinkML schema — a schema change is out of proportion for a spike and would trip Article II adherence tests. Exact field is a Phase-1 task decision; the requirement is that lineage can answer "why did this change happen" in the analyst's words.

## R8 — Learning instrumentation

- **Telemetry (FR-024)**: `telemetry.ts` appends one JSONL record per LM tool invocation (tool id, params, validation outcome, retry count, confirmation outcome, per-stage latency, operator-annotated `activeModel`, priming on/off). Reuses the structured-logging pattern from #191 (`apps/vscode/src/services/llmProxy.ts`). The file is copied into `evidence/` for the report. Throwaway instrumentation — not a shipped audit trail (spec Out of Scope clarification).
- **Token-budget probe (FR-025)**: `summarize.ts` computes an approximate token count of each summary it emits (character/word heuristic — no tokenizer dependency for a spike) and includes it in the tool result; the report tabulates measured sizes vs. ≥2 representative local-model context windows.
- **Domain priming (FR-027)**: `.github/copilot-instructions.md` teaches Debrief vocabulary + tool conventions; scenarios run with and without it (rename/remove to toggle), difference reported.

## Summary of decisions

| # | Decision | Rationale |
|---|----------|-----------|
| R1 | LM Tools API, 4 tools, engine → ^1.99.0 | Extension mediates context; native Copilot discovery |
| R2 | Model identity operator-annotated | API limitation — tool can't read the model |
| R3 | Search client-side in TS over `stacService.listItems` | Least-work; reuses `debrief.openPlot` |
| R4 | Delegate to `calcService.listTools/executeTool` | One shared execution path (FR-013) |
| R5 | Apply via `updatePlotFeatures`, **suppress disk write**, mark dirty | Honours FR-011; undo maps to session revert (verify/report) |
| R6 | Active plot + explicit `plotId`; sync selection read | FR-009/010 |
| R7 | Provenance via `recordToolResult` + utterance metadata field | FR-023 without a schema change |
| R8 | JSONL telemetry, token heuristic, priming file | Quantitative findings (FR-024/025/027) |
