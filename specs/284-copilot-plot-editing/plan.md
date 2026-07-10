# Implementation Plan: Copilot Chat Drives Debrief — STAC Plot Retrieval + Python Tool Editing (Spike)

**Branch**: `284-copilot-plot-editing` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/284-copilot-plot-editing/spec.md`

## Summary

Wire GitHub Copilot Chat (agent mode) to the Debrief VS Code extension via the **VS Code Language Model Tools API**, so an analyst can find/open plots from the local STAC catalog and run debrief-calc Python tools against the open plot in natural language. Four LM tools are contributed and mediated entirely inside the extension: `debrief_searchPlots`, `debrief_summarizeCurrentPlot`, `debrief_listTools`, and `debrief_runTool`. Search and open reuse the extension's existing `stacService.listItems()` + `debrief.openPlot` command (least-work per FR-007). Tool execution reuses `calcService.executeTool()` — the same Python stdio path the Tools panel uses — but the edit-apply step **diverges deliberately** from the Tools-panel command: chat edits apply through `mapPanel.updatePlotFeatures()` into live in-memory state and mark the session dirty, **without** the immediate `stacService.writeGeoJson()` disk write the panel path performs, honouring FR-011. Read tools auto-run; mutating tools gate on a `prepareInvocation` confirmation. The spike ships learning instrumentation (telemetry JSONL, token-budget probe, multi-model runs, a domain-priming instructions file) and a findings report feeding E13.

## Technical Context

**Language/Version**: TypeScript 5.x (strict — Article XV) in `apps/vscode`; Python 3.11 unchanged (debrief-calc/debrief-stac consumed as-is)
**Primary Dependencies**: VS Code Extension API — **Language Model Tools API** (`vscode.lm.registerTool` + `contributes.languageModelTools`); existing `calcService` (debrief-calc stdio), `stacService` (catalog), `resultsPanelService`, `openPlotsService`, `toolMatchAdapter`, `sessionManager`, `@debrief/schemas`, `@debrief/session-state` (`LogService`)
**Storage**: Local STAC catalog (read for search; writes only via the existing `saveSession`/`stacService` path — never direct from chat). Telemetry JSONL under the extension's log dir + copied to `evidence/`
**Testing**: vitest + mocked `LanguageModelTool.invoke`/`prepareInvocation` (unit); no Playwright E2E (Copilot Chat cannot be driven headlessly — see Web-Shell E2E section)
**Target Platform**: VS Code desktop, **engine bumped `^1.85.0` → `^1.99.0`** (agent-mode tool integration landed in 1.99, March 2025)
**Project Type**: VS Code extension (single frontend package) + throwaway spike instrumentation
**Performance Goals**: Interactive — summary/search return < 1 s on the sample catalog; a tool run is bounded by the existing calc timeout; the editor never blocks during a Python run (reuse `withProgress`/cancellation token)
**Constraints**: FR-011 (no direct disk writes from chat), FR-015 (mutations confirm), strict types, offline-core-untouched (the cloud LLM is an additive spike surface, not the critical path)
**Scale/Scope**: Sample catalog (tens of plots); 4 LM tools; ~5 happy-path + ~3 fail-safe demo scenarios; ≥2 model runs

### Resolved unknowns (detail in research.md)

- **FR-007 search placement** → TypeScript `stacService` + client-side filtering (it already enumerates items with metadata and owns `debrief.openPlot`; no new Python API needed).
- **Edit round-trip** → reuse `calcService.executeTool` + `createResultLayer`; apply via `mapPanel.updatePlotFeatures`; **suppress the panel path's immediate disk write**; mark dirty via `sessionManager`.
- **Undo semantics** → the plot editor is a webview custom editor with app-managed session state, not VS Code's native undo stack. "Single undo" (FR-012) maps to the existing session revert/save-discard; exact granularity is a research finding to verify and, if a gap, report in findings rather than build new undo infrastructure for a spike.
- **Model identity** → the LM Tools API does **not** expose the active model to the tool. FR-026 multi-model comparison is therefore operator-annotated per run (the telemetry record's `activeModel` is set from run context, not auto-read). Recorded as a known limitation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status |
|---------|------|--------|
| I. Defence-Grade Reliability (offline by default) | Core stays offline; the cloud LLM is an **additive, optional** spike surface, explicitly positioned as non-shipping (spec Positioning). No core path gains a network dependency. | ✅ Pass (spike-scoped; the whole point is to inform the offline successor) |
| I.3 No silent failures | Every tool returns structured success/failure to chat; validation rejections are corrective (FR-017/018). | ✅ Pass |
| III. Data Sovereignty (provenance always) | Chat runs record provenance via the shared `LogService.recordToolResult` path, **plus** the initiating utterance (FR-023). No new external calls beyond the user-invoked Copilot request. | ✅ Pass |
| IV. Architectural Boundaries | LM tools live in the frontend and orchestrate only; all domain logic stays in debrief-calc/debrief-stac; **all writes route through the existing writer/`saveSession` path** (FR-011) — no divergent persistence code path. | ✅ Pass |
| VI/VII. Testing | Tool adapters unit-tested with mocked LM invocations; definition-of-done is the evidenced scenarios + findings (FR-019/020/021, SC-002/006). | ✅ Pass |
| VIII. Specs before code | Spec #284 merged before this plan. | ✅ Pass |
| XV. Strict Type Safety | All new TS strict, no `any`; LM tool inputs validated to typed models at the boundary; calc registry schemas narrowed before dispatch. | ✅ Pass |

**No violations to justify.** The only notable posture is the deliberate cloud-LLM dependency, which Article I permits as an additive/optional feature and which the spec bounds to experiment-only.

## Project Structure

### Documentation (this feature)

```text
specs/284-copilot-plot-editing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (LM tool + meta-tool contracts)
│   ├── lm-tools.md
│   └── telemetry-record.schema.json
├── checklists/
│   └── requirements.md  # (from /speckit.specify)
└── evidence/
    └── opening-context.md   # cached blog opener (Phase 2)
```

### Source Code (repository root)

```text
apps/vscode/
├── package.json                       # + contributes.languageModelTools (4 tools); engines.vscode → ^1.99.0
├── src/
│   ├── copilot/                       # NEW — LM tool implementations + shared context
│   │   ├── registerLmTools.ts         # vscode.lm.registerTool wiring (activation)
│   │   ├── searchPlotsTool.ts         # debrief_searchPlots  (read)
│   │   ├── summarizeCurrentPlotTool.ts# debrief_summarizeCurrentPlot (read)
│   │   ├── listToolsTool.ts           # debrief_listTools    (read)
│   │   ├── runToolTool.ts             # debrief_runTool      (mutate → prepareInvocation gate)
│   │   ├── plotContext.ts             # current-plot + selection resolution (active vs explicit plotId)
│   │   ├── applyChatEdit.ts           # dirty-only apply (no disk write) — the FR-011 divergence
│   │   ├── summarize.ts               # thinned, token-bounded plot summary + token estimate
│   │   ├── searchCatalog.ts           # 4-criteria client-side filter over stacService.listItems
│   │   └── telemetry.ts               # JSONL invocation log (reuses #191 logging pattern)
│   └── services/                      # REUSED, unchanged: calcService, stacService,
│                                      #   resultsPanelService, openPlotsService, toolMatchAdapter
├── .github/
│   └── copilot-instructions.md        # NEW — Debrief domain priming (FR-027; evaluated with/without)
└── src/__tests__/copilot/             # NEW — unit tests w/ mocked LanguageModelTool invocations
```

**Structure Decision**: All new code lands in a new `apps/vscode/src/copilot/` folder; the four services it depends on are consumed unchanged. The only edits to existing files are `package.json` (contribution + engine bump) and the extension activation entry to call `registerLmTools`. This keeps the spike self-contained and trivially removable, matching its throwaway positioning. Python services (`debrief-calc`, `debrief-stac`) are **not modified** — search runs client-side in TS and execution reuses the existing stdio path.

## Media Components

None — this is a chat-driven / infrastructure feature with no new Storybook-able React component. The demo surface is Copilot Chat inside VS Code, captured as transcript screenshots/GIF in `evidence/`, not a bundleable component.

## Storybook E2E Testing

None — no interactive UI components are added to the shared component library.

## Web-Shell E2E Testing

None — no web-shell workflow changes, and by design **Copilot Chat cannot be driven by Playwright** (spec FR-021 accepts this boundary). Automated coverage stops at the tool layer: unit tests exercise each LM tool's `invoke`/`prepareInvocation` with mocked `LanguageModelToolInvocationOptions`, asserting correct delegation to `calcService`/`stacService`, correct confirmation gating for mutating tools, and structured error results. The end-to-end demo evidence (transcripts + screenshots/GIF) is produced by a human operator running the scripted scenarios in a live Copilot session, per FR-019/FR-028.

## Complexity Tracking

No constitution violations — table not required.
