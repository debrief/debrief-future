# Copilot spike (#284) — higher-fidelity test layers

The Debrief side of the Copilot boundary is verified by four layers (plan.md
"Verification Approach"). Two of them run in this repo today; two are specified
here and wired to run where the harness exists.

## Runs on every PR (the SC-009 gate)

| Layer | Where | Command |
|-------|-------|---------|
| **Unit** (mocked LM + services) | `apps/vscode/tests/unit/copilot/*.test.ts` | `pnpm --filter debrief-vscode test:unit` |
| **Scripted-transcript replay** (8 scenarios, the SC-002 gate, FR-031) | `apps/vscode/tests/unit/copilot/scenarios.transcript.test.ts` | same |

These prove — with no human and no LLM — that each tool delegates, gates, and
routes correctly, that a mutation applies via `updatePlotFeatures` + marks the
session dirty while calling **no** disk-write path (FR-011), that a declined /
failed / empty-selection run applies nothing, and that `searchPlots` opens via
`debrief.openPlot`. Every invocation emits a telemetry record
(`evidence/telemetry.jsonl`, schema-validated).

## Specified, harness-gated (FR-029 / FR-030)

| Layer | Intended file | Proves | Status |
|-------|---------------|--------|--------|
| **Real-Python integration** | `toolRoundtrip.integration.test.ts` | real 4-criteria search + a real debrief-calc mutation/analytical round-trip against `apps/vscode/test-data/local-store/` | **deferred** — requires a provisioned debrief-calc Python env (uv sync + interpreter); not available in the Claude-Code cloud session used to build this spike |
| **Extension-host** (`@vscode/test-electron`) | `lmTools.host.test.ts` | `vscode.lm.invokeTool(...)` with no model → editor features change, session dirty, **store snapshot byte-identical before/after** (no on-disk write); decline applies nothing | **deferred** — the repo has no `.vscode-test.mjs` harness wired, and the Electron binary download is blocked (HTTP 403) in the cloud environment |

### Why deferred, and what covers the gap meanwhile

The `vscode.lm.invokeTool` host layer and the real-Python layer both need
infrastructure this session cannot provision (Electron download blocked; no
debrief-calc interpreter). Rather than ship a broken/never-run harness, the two
key host invariants are proven at the unit layer against the exact production
code path:

- **No disk write on a chat edit (FR-011)** — `applyChatEdit` structurally has
  no `stacService`/`writeGeoJson` dependency (it is not in `ApplyChatEditDeps`),
  and `runTool.invoke.test.ts` asserts `updatePlotFeatures` + `markDirty` fire
  while the Results-panel/disk paths do not. The divergence from the Tools-panel
  command (which *does* `writeGeoJson`) is the whole point of the module.
- **Decline applies nothing (FR-016)** — VS Code only calls `invoke` after a
  confirmation is approved, so decline is a framework no-op; the unit tests
  additionally prove that every pre-dispatch refusal (unknown tool, invalid
  params, empty selection, no plot open) applies nothing and never spawns Python.

Wiring the two deferred layers is a clean follow-up once a CI runner with the
Python env + a `.vscode-test.mjs` harness is available; the assertions above are
the acceptance criteria for that work.
