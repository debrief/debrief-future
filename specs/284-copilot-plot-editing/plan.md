# Implementation Plan: Copilot Chat Drives Debrief — STAC Plot Retrieval + Python Tool Editing (Spike)

**Branch**: `284-copilot-plot-editing` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/284-copilot-plot-editing/spec.md`

## Summary

Wire GitHub Copilot Chat (agent mode) to the Debrief VS Code extension via the **VS Code Language Model Tools API**, so an analyst can find/open plots from the local STAC catalog and run debrief-calc Python tools against the open plot in natural language. Four LM tools are contributed and mediated entirely inside the extension: `debrief_searchPlots`, `debrief_summarizeCurrentPlot`, `debrief_listTools`, and `debrief_runTool`. Search and open reuse the extension's existing `stacService.listItems()` + `debrief.openPlot` command (least-work per FR-007). Tool execution reuses `calcService.executeTool()` — the same Python stdio path the Tools panel uses — but the edit-apply step **diverges deliberately** from the Tools-panel command: chat edits apply through `mapPanel.updatePlotFeatures()` into live in-memory state and mark the session dirty, **without** the immediate `stacService.writeGeoJson()` disk write the panel path performs, honouring FR-011. Read tools auto-run; mutating tools gate on a `prepareInvocation` confirmation. The spike ships learning instrumentation (telemetry JSONL, token-budget probe, multi-model runs, a domain-priming instructions file) and a findings report feeding E13.

## Technical Context

**Language/Version**: TypeScript 5.x (strict — Article XV) in `apps/vscode`; Python 3.11 unchanged (debrief-calc/debrief-stac consumed as-is)
**Primary Dependencies**: VS Code Extension API — **Language Model Tools API** (`vscode.lm.registerTool` + `contributes.languageModelTools`); existing `calcService` (debrief-calc stdio), `stacService` (catalog), `resultsPanelService`, `openPlotsService`, `toolMatchAdapter`, `sessionManager`, `@debrief/schemas`, `@debrief/session-state` (`LogService`)
**Storage**: Local STAC catalog (read for search; writes only via the existing `saveSession`/`stacService` path — never direct from chat). Telemetry JSONL under the extension's log dir + copied to `evidence/`
**Testing**: Four automated layers, no human required (see "Verification Approach"): vitest unit (mocked LM + services); vitest **integration** (real debrief-calc Python + fixture STAC catalog); **extension-host** via `vscode-test` + `vscode.lm.invokeTool` (real editor apply/dirty/no-disk-write); a network-gated **model-routing probe** (nightly, reuses #191 Anthropic transport). No Playwright — Copilot Chat itself can't be headless-driven, but everything below the tool boundary is deterministic and fully automated.
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
├── src/__tests__/copilot/             # NEW — unit tests w/ mocked LanguageModelTool invocations
│   ├── *.test.ts                      #   per-tool unit tests
│   ├── integration/                   #   real debrief-calc + fixture catalog (FR-029)
│   └── transcript/                    #   scripted 8-scenario replay (FR-031)
├── src/test/copilot/                  # NEW — vscode-test extension-host suite (FR-030)
│   └── lmTools.host.test.ts           #   vscode.lm.invokeTool → assert dirty/no-disk-write/open
├── test-fixtures/copilot-catalog/     # NEW — small committed STAC catalog for integration/host
└── scripts/model-routing-probe.ts     # NEW — gated Anthropic routing probe (FR-032)

.github/workflows/
└── copilot-routing-probe.yml          # NEW — nightly/opt-in; no-ops without ANTHROPIC_API_KEY
```

**Structure Decision**: All new code lands in a new `apps/vscode/src/copilot/` folder; the four services it depends on are consumed unchanged. The only edits to existing files are `package.json` (contribution + engine bump) and the extension activation entry to call `registerLmTools`. This keeps the spike self-contained and trivially removable, matching its throwaway positioning. Python services (`debrief-calc`, `debrief-stac`) are **not modified** — search runs client-side in TS and execution reuses the existing stdio path.

## Media Components

None — this is a chat-driven / infrastructure feature with no new Storybook-able React component. The demo surface is Copilot Chat inside VS Code, captured as transcript screenshots/GIF in `evidence/`, not a bundleable component.

## Storybook E2E Testing

None — no interactive UI components are added to the shared component library.

## Web-Shell E2E Testing

None — no web-shell workflow changes, and Copilot Chat itself cannot be driven by Playwright. **But automated coverage does NOT stop at mocks** — see "Verification Approach" below: a real-Python integration suite and a `vscode-test` extension-host suite (via `vscode.lm.invokeTool`) verify the whole Debrief side of the boundary end-to-end with no human and no LLM. The live Copilot session produces supplementary screenshots only (FR-019), not the correctness gate.

## Verification Approach

A developer or CI must be able to assess this feature end-to-end **without sitting in Copilot Chat** (FR-029–FR-032). Only the model's tool *selection* is non-deterministic; everything below the tool boundary — search, summary, confirmation gating, the Python round-trip, the dirty-only edit apply — is deterministic extension code and is verified automatically. Four layers, fast → high-fidelity:

| Layer | Harness | Command | Proves | Human? | LLM? |
|-------|---------|---------|--------|--------|------|
| **Unit** | vitest + mocked services | `test:unit` | each tool delegates/gates/routes correctly | no | no |
| **Integration** | vitest, spawns real debrief-calc; fixture STAC catalog | `test:unit` (tagged) or a dedicated script | the **real** 4-criteria search + **real** Python tool round-trip work | no | no |
| **Extension-host** | `@vscode/test-electron` (`test:integration`) + `vscode.lm.invokeTool` | `test:integration` | the registered tools, invoked through the real path with **no model**, change the open plot, mark it dirty, and write **nothing to disk** (FR-011); decline applies nothing; `searchPlots` opens via `debrief.openPlot` | no | no |
| **Model-routing probe** | reuses #191 `llmProxy` Anthropic transport; **network-gated**, skips without a key | separate nightly/opt-in job | a model emits the expected tool call + schema-valid params from the schemas (proxy for tool-description quality; feeds FR-026) | no | yes (gated) |

Key enabler: **`vscode.lm.invokeTool(name, options)`** invokes a *registered* LM tool by name without any model in the loop — so the extension-host test drives `debrief_runTool`/`debrief_searchPlots` through the exact registration + apply path a real chat turn uses, then asserts editor state. The **scripted-transcript replay** (FR-031) encodes the eight quickstart scenarios as canned tool-call sequences run through these harnesses — the automated stand-in for the manual demo, and the SC-002 gate.

**Fixtures**: a small committed STAC catalog under the feature's test fixtures (or reuse `apps/vscode/test-data/local-store/`) gives search + open + edit deterministic inputs. The `no-disk-write` assertion snapshots the fixture store before/after a mutating run and asserts equality.

**CI wiring**: unit + integration + extension-host run on every PR (the FR-029/FR-030 gate, SC-009). The routing probe is a separate workflow that no-ops without `ANTHROPIC_API_KEY`, so it never blocks the offline gate.

## Complexity Tracking

No constitution violations — table not required.
