# Quickstart: Copilot Chat Drives Debrief (Spike)

Run the demo scenarios and produce the evidence.

## Prerequisites

- VS Code **1.99+** with GitHub Copilot Chat (agent mode) signed in and enabled (`chat.agent.enabled: true`).
- Debrief extension built from this branch (`engines.vscode ^1.99.0`, `contributes.languageModelTools` present).
- debrief-calc Python env resolvable (same one the Tools panel uses — verify the Tools panel runs a tool first).
- The sample STAC catalog in the workspace (`preview/workspace/samples/local-store/`).

## Verify tool discovery

1. Open Copilot Chat, switch to **Agent** mode.
2. Type `#debrief_listTools` — Copilot should list the four Debrief tools. If not, check the extension activated and the engine bump took effect.

## Happy-path scenarios (FR-019 — capture transcript + screenshot/GIF into `evidence/`)

1. **Open** — "open the Exercise Alpha day-1 plot" → `searchPlots` → plot opens in the editor.
2. **Summarise** — "what's in this plot?" → `summarizeCurrentPlot` → grounded answer.
3. **Style edit** — "colour the submarine track red" → `listTools` + `runTool` → confirm the plain-language gate → track turns red, editor dirty, **not** saved.
4. **Selection analysis** — select a track, "run speed-filter below 5 kts on the selection" → confirm → result in chat + Results panel.
5. **Selection summary** — "summarise the selection".

After each: confirm undo/revert behaves (R5), and that nothing was written to disk until you explicitly Save.

## Fail-safe scenarios (FR-028 — must fail safely, also evidenced)

6. **No plot open** — close all plots, "colour the track red" → structured "no plot open", nothing happens.
7. **Ambiguous reference** — plot with several tracks, "colour the track red" → Copilot asks which / tool reports ambiguity; no blind edit.
8. **Invented tool** — coax an invalid `toolId` → `runTool` returns a corrective error, no Python spawn, plot unchanged.

## Learning instrumentation

- **Telemetry**: after the runs, collect the JSONL log and copy to `evidence/telemetry.jsonl`; validate against `contracts/telemetry-record.schema.json`.
- **Token budget (FR-025)**: note each `approxTokens` from summary results; tabulate vs. two local-model context windows in the report.
- **Multi-model (FR-026)**: repeat scenarios 1–5 under a second model from Copilot's picker; annotate `activeModel` per run.
- **Priming (FR-027)**: run once with `.github/copilot-instructions.md` present, once renamed away; note the difference.

## Automated tests

```sh
pnpm --filter @debrief/vscode test   # unit: mocked LanguageModelTool invoke/prepareInvocation
```

Cover: read tools skip confirmation; mutating `runTool` produces `confirmationMessages`; invalid `toolId`/params rejected pre-dispatch; mutation applies via `updatePlotFeatures` with no `writeGeoJson` call; analytical result routes to `resultsPanelService`; decline applies nothing.

## Done

All 8 scenarios evidenced, telemetry validates, findings report written (FR-020) answering the six learning questions (SC-008).
