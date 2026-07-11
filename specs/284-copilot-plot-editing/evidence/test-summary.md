---
feature: 284-copilot-plot-editing
captured_at: 2026-07-11T08:45:00Z
git_sha: ef4b7c5f
tests_passed: 896
tests_failed: 0
tests_skipped: 1
coverage_pct: null
---

# Test Summary — Copilot Chat Drives Debrief (Spike)

## Headline

The whole Debrief side of the Copilot boundary is verified with **no human and
no LLM**. The full `debrief-vscode` unit suite is green, including the 48 new
Copilot tests and the scripted-transcript replay of all eight quickstart
scenarios (the SC-002 / FR-031 correctness gate).

```
Test Files  73 passed | 1 skipped (74)
     Tests  895 passed | 1 skipped (896)
```

Command (the SC-009 one-command verdict):

```sh
pnpm --filter debrief-vscode test:unit
```

## Copilot suite breakdown (48 tests)

| Suite | Tests | Covers |
|-------|------:|--------|
| `searchCatalog.test.ts` | 8 | 4-criteria filter (text / time-overlap / platform / bbox), AND-combination, list-all, projection, no-match criteria (US1) |
| `searchPlotsTool.test.ts` | 5 | `invoke` delegates, opens single `open:true` match via `debrief.openPlot`, no-open on ambiguous, no-match message, telemetry (US1) |
| `listToolsTool.test.ts` | 2 | registry → `ToolRegistryView[]` with derived `mutating` flag; degraded-registry sentinel (US2) |
| `runTool.prepare.test.ts` | 3 | mutating tool → plain-language confirmation (no raw JSON); analytical → none; unknown → none (FR-015) |
| `runTool.invoke.test.ts` | 8 | invalid toolId/params rejected pre-dispatch (no `executeTool`); mutation → `updatePlotFeatures` + `markDirty`, **no disk write**; analytical → Results panel; failure → error tab; guard throws on unconfirmed mutation; no-plot-open; provenance + utterance (FR-011/14/17/18/23, T025) |
| `selectionScope.test.ts` | 4 | `scope:'selection'` passes exact ids; empty selection → "nothing selected"; default-to-selection / default-to-all (US4) |
| `summarize.test.ts` | 5 | thinned inventory (no geometry), truncation cap, `approxTokens` probe (US3/FR-025) |
| `summarizeTool.test.ts` | 4 | active-plot summary + openPlots; `noPlotOpen` sentinel; selection-only; unknown plotId (US3) |
| `scenarios.transcript.test.ts` | 9 | **the SC-002 gate** — 5 happy-path + 3 fail-safe scenarios replayed as canned tool calls, plus telemetry-completeness (SC-006) |

## Verification layers (plan.md "Verification Approach")

| Layer | Status | Notes |
|-------|--------|-------|
| **Unit** (mocked LM + services) | ✅ green | 48 tests above |
| **Scripted-transcript replay** (SC-002 / FR-031) | ✅ green | 8 scenarios, no human, no LLM; emits `telemetry.jsonl` |
| **Real-Python integration** (FR-029) | ⏸ deferred | needs a provisioned debrief-calc interpreter — not available in the cloud build session; see `apps/vscode/src/test/copilot/README.md` |
| **Extension-host** `vscode.lm.invokeTool` (FR-030) | ⏸ deferred | Electron download blocked (HTTP 403) and no `.vscode-test.mjs` harness wired; key invariants (no-disk-write, dirty, decline-applies-nothing) proven at the unit layer against the production code path |
| **Model-routing probe** (FR-032) | ✅ ran (real) | executed 2026-07-11 across `claude-sonnet-5` + `claude-haiku-4-5` × priming on/off — Sonnet 75% strict / 100% sequence-aware, Haiku 38–50% strict; see `routing-probe.md`. Still skips cleanly without a key for the offline gate; nightly workflow added |

## Evidence artifacts

- `telemetry.jsonl` — 9 records from the transcript replay, validated against `contracts/telemetry-record.schema.json` (all required fields + valid `tool` enum). SC-006 satisfied.
- `token-budget.md` — measured summary token sizes vs. context windows (FR-025 / SC-007).
- `routing-probe.md` — written by the probe when a key is present; skipped-state note otherwise.
- `usage-example.md` — annotated chat-turn → confirmed edit walkthrough.
- `findings-report.md` — the primary deliverable (SC-008's six questions).

## Known gaps (reported, not hidden)

1. **Two verification layers deferred** to a runner with a Python env + Electron (see above). The stated correctness gate (transcript replay) is green.
2. **Live Copilot screenshots** — captured after all (in the browser-based preview): `evidence/screenshots/live-list-tools.png` (registry projection) and `live-symbol-edit.png` (mutating edit → 5 features, dirty, no disk write), plus the empty-selection fail-safe. Copilot Chat still can't be Playwright-driven in CI, so the automated replay remains the gate; the live shots are supplementary evidence.
3. **Undo granularity** (research R5) is a design question the extension-host layer would exercise; recorded in the findings as a spike observation, not new infrastructure.
