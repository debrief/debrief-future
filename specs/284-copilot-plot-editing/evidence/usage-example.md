# Usage example — a chat turn → confirmed edit

An annotated walkthrough of the spike's centrepiece: styling the current plot
from chat, confirmed, applied as a dirty and undoable editor edit that never
touches disk. This is the deterministic behaviour proven by
`runTool.invoke.test.ts` and replayed in `scenarios.transcript.test.ts` (H3).

## Setup

- Debrief extension built from this branch (`engines.vscode ^1.99.0`,
  `contributes.languageModelTools` present).
- A sample plot open in the Debrief editor (e.g. `apps/vscode/test-data/local-store/exercise-alpha`).
- Copilot Chat in **Agent** mode; a track selected on the map.

## The turn

**Analyst:** _"colour the submarine track red"_

### 1. Ground the request (read, auto-run)

Copilot calls `debrief_summarizeCurrentPlot`. The tool returns the thinned
inventory so the model can identify which feature is "the submarine track":

```json
{
  "plotId": "stac://store-1/items/alpha-day1/item.json",
  "title": "Exercise Alpha — Day 1",
  "features": [
    { "id": "track-1", "name": "HMS Nelson", "type": "TRACK", "platform": "HMS Nelson",
      "timeSpan": { "start": "2026-03-01T00:00:00Z", "end": "2026-03-01T06:00:00Z" }, "pointCount": 120 }
  ],
  "truncated": false,
  "approxTokens": 302,
  "openPlots": [{ "plotId": "stac://store-1/items/alpha-day1/item.json", "title": "Exercise Alpha — Day 1", "active": true }]
}
```

### 2. Discover the tool (read, auto-run)

`debrief_listTools` returns the live registry projected for the model, including
the derived `mutating` flag:

```json
[{ "id": "set-track-color", "name": "Set Track Color", "category": "style", "mutating": true,
   "parameters": [{ "name": "color", "valueType": "string", "required": true }] }]
```

### 3. Propose the call → confirmation gate (mutating)

Copilot calls `debrief_runTool` with `{ toolId: "set-track-color", params: { color: "red" }, scope: "selection", utterance: "colour the submarine track red" }`.
Because `set-track-color` is mutating, `prepareInvocation` returns a
**plain-language** confirmation (never raw JSON):

> **Run Set Track Color on Exercise Alpha — Day 1**
>
> **Set Track Color** will modify **Exercise Alpha — Day 1**.
> - Target: HMS Nelson
> - color: red
>
> The change is applied to the open editor and left unsaved (undo/revert to discard).

### 4. Approve → execute + apply (dirty, no disk write)

On approval, `invoke`:

1. Validates `toolId` + `params` against the live registry (rejects pre-dispatch on mismatch — no Python spawn).
2. Resolves the operating features from `scope: "selection"` → `["track-1"]`.
3. Runs the tool through the shared `calcService.executeTool` path — the same
   Python stdio path the Tools panel uses.
4. The result is `mutation/style`, so `applyChatEdit` calls
   `panel.updatePlotFeatures(layer)` and marks the session dirty via
   `sessionManager` — and **omits** the Tools-panel's `stacService.writeGeoJson`
   disk write (the deliberate FR-011 divergence).
5. Records provenance via `LogService.recordToolResult`, stamping
   `__chatInitiated: true` and `__utterance: "colour the submarine track red"`.

**Chat reply:**

> Applied Set Track Color to 1 feature(s) in "Exercise Alpha — Day 1". The plot is
> now dirty (unsaved) — undo/revert to discard, or Save to persist.

### 5. Save or discard

The map shows the track in red immediately; the editor is dirty. The analyst
saves through the normal Save flow, or discards. **Nothing was written to disk
from the chat turn** — verified by the unit assertion that `updatePlotFeatures`
+ `markDirty` fire while no write path is invoked.

## What the analytical path looks like (contrast)

_"run speed-filter below 5 kts on the selection"_ → `debrief_runTool` with an
analytical (`calc`) tool → **no confirmation**, result routed to the Results
panel via `addDatasetsForToolResult`, and a summary in the chat reply:

> Ran Speed Filter. A summary is in this reply and the full result is in the
> Results panel.

## Fail-safe (contrast)

- _"colour the track red"_ with **nothing selected** → `"Nothing is selected.
  Select one or more features … (I will not guess)."` — no edit.
- An invented tool id → `"Unknown tool id "make-it-pretty". Call
  debrief_listTools first. …"` — no Python spawn, plot unchanged.
- No plot open → `"No plot is open … Search the catalog and open a plot first."`
