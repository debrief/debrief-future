# Model-routing probe (FR-032 / SC-005)

The automated routing probe (`apps/vscode/scripts/model-routing-probe.ts`)
feeds the four Debrief tool schemas + the eight scenario prompts to a model via
the Anthropic Messages API and asserts the model emits the **expected tool call**
with schema-valid parameters — the automated stand-in for "did a model route
correctly", feeding the FR-026 routing-quality finding.

## Run in this session: SKIPPED (no key)

```
[routing-probe] ANTHROPIC_API_KEY not set — skipping cleanly (FR-032).
This probe is opt-in and never blocks the offline gate.
```

The probe is **network-gated by design**: it exits 0 with the message above when
`ANTHROPIC_API_KEY` is absent, so it never blocks offline developers or the core
PR gate. It runs as a separate nightly / opt-in job
(`.github/workflows/copilot-routing-probe.yml`).

## How to run it

```sh
ANTHROPIC_API_KEY=sk-… npx tsx apps/vscode/scripts/model-routing-probe.ts
# optional: COPILOT_PROBE_MODEL=claude-sonnet-5 to compare a second model (FR-026)
```

On a keyed run it rewrites this file with a per-scenario table:

| Scenario | Expected tool | Actual tool | ✓ |
|----------|---------------|-------------|---|
| open the Exercise Alpha day-1 plot | `debrief_searchPlots` | … | … |
| what's in this plot? | `debrief_summarizeCurrentPlot` | … | … |
| which Debrief tools can I run right now? | `debrief_listTools` | … | … |
| colour the submarine track red | `debrief_runTool` | … | … |
| run speed-filter below 5 knots on the selection | `debrief_runTool` | … | … |
| summarise the selection | `debrief_summarizeCurrentPlot` | … | … |
| find plots from March involving a submarine | `debrief_searchPlots` | … | … |
| list the tools available for the current selection | `debrief_listTools` | … | … |

**Gate (SC-005):** ≥80% first-attempt correct tool selection (≥7/8). The probe
exits non-zero below that threshold so the nightly job flags regressions.

## Note on model attribution (research R2)

The VS Code LM Tools API does not expose the active model to a tool, so the
Copilot-side telemetry's `activeModel` is operator-annotated
(`debrief.copilot.activeModel` setting), not auto-captured. The routing probe
sidesteps this by owning the model choice directly (`COPILOT_PROBE_MODEL`),
giving a clean per-model routing-accuracy number for the findings.
