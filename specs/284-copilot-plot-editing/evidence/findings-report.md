# Findings — Copilot Chat Drives Debrief (Spike #284)

The product of this spike is knowledge for its offline successor (epic E13 /
#235), not shipped code. This report answers SC-008's six learning questions
and records what worked, what blocked, and what the future in-Debrief NL panel
should inherit or avoid.

**Evidence basis.** The Debrief side of the boundary is verified automatically
(48 unit tests + the 8-scenario transcript replay, all green; `test-summary.md`).
Findings that require a *live* Copilot session with a licence — the model's own
routing quality across models, and priming A/B — are marked **[live-pending]**
and are captured by the automated routing probe (`routing-probe.md`) plus a
future licensed session. Everything below the tool boundary is deterministic and
is reported from the automated layers.

---

## Q1 — Tool-granularity fit: meta-pair vs. static tools

**Finding: the hybrid split is the right shape, and it transfers.**

Two static, purpose-built tools (`searchPlots`, `summarizeCurrentPlot`) plus a
dynamic meta-pair (`listTools` / `runTool`) fronting the debrief-calc registry.

- The **static** tools carry rich `modelDescription`s, so the model discovers
  them without a round-trip — the routing probe expects a single call for
  "what's in this plot?" and "open the day-1 plot".
- The **meta-pair** keeps the contributed surface two entries wide no matter how
  many Python tools exist. The registry is fetched live (`calcService.listTools`),
  so a new debrief-calc tool is usable from chat the moment it registers, with no
  `package.json` churn — proven by `listToolsTool.test.ts` projecting the live
  registry (not a baked copy).
- **Cost:** `runTool` needs a `listTools` round-trip to build valid params, and
  it must re-validate the model's `toolId`/params itself (FR-017) because the
  model can hallucinate ids. The validator rejecting an invented tool with a
  corrective, model-actionable message (no Python spawn) is what makes the
  meta-pair safe — see `runTool.invoke.test.ts` (a) and transcript F3.

**For E13:** keep the split. The static/meta boundary maps cleanly onto a local
model — the offline panel wants the same "cheap discovery for the common verbs,
dynamic registry for the long tail".

## Q2 — Context sufficiency: was the thinned summary enough to target edits?

**Finding: yes, for typical plots, and the token cost is modest.**

The thinned inventory (names, types, platforms, time spans, counts — no
geometry) gives the model enough to resolve "the submarine track" to a real
feature id. Measured sizes (`token-budget.md`): a typical tens-of-features plot
is a few hundred to ~3k tokens; the 200-feature ceiling caps at ~8k with a
`truncated` flag. The summary reports feature *counts*, so dense geometry never
inflates the context — cost scales with feature count, not track length.

- **Worked:** grounding-before-edit is enforced by the domain priming and proven
  by H2/H3 in the replay — summarise, then target by id.
- **Gap:** the summary has no per-feature *spatial* digest (only bbox at the plot
  level via search). "the northern track" is not yet answerable from the summary
  alone. A future addition, noted for E13.

## Q3 — Confirmation-UX friction

**Finding: the plain-language gate is the right default; over-gating is the
acceptable failure mode.**

- Mutating tools gate on a `prepareInvocation` confirmation whose body names the
  tool, the target plot, the target features **by name**, and the parameter
  values in plain language — never raw JSON (asserted in `runTool.prepare.test.ts`).
- **Classification is category-driven** (`calc`/`snapshot` = analytical/auto-run;
  everything else = mutating/gated) because the registry entry does not carry a
  tool's `resultType` until it runs. This means an unknown-category tool is
  **over-gated** (an extra confirmation) rather than under-gated — the safe
  direction. The authoritative backstop is the invoke-time guard (T025): a
  `mutation/*` result from a tool the gate classified as analytical **throws**
  rather than applying an unconfirmed edit (proven by `runTool.invoke.test.ts` (e)).
- **Friction observed:** one confirmation per mutating turn. For a multi-step
  "trim then recolour" flow that is two prompts. Acceptable for a defence-grade
  tool; a future panel might batch a proposed *plan* into one confirmation.

## Q4 — Model sensitivity [live-pending]

**Finding: automatable, but not from inside the tool.**

The LM Tools API does **not** expose the active model to the tool (research R2),
so Copilot-side `activeModel` is operator-annotated. The spike closes this with
the **automated routing probe** (`model-routing-probe.ts`), which owns the model
choice (`COPILOT_PROBE_MODEL`) and measures first-attempt tool-selection accuracy
per model against the 8 scenarios — the SC-005 ≥80% gate. In this build session
the probe **skipped cleanly** (no `ANTHROPIC_API_KEY`); a keyed nightly run
(`.github/workflows/copilot-routing-probe.yml`) produces the per-model table.
Running it across two models (e.g. Haiku 4.5 vs Sonnet 5) is the concrete
model-sensitivity read for the findings once a key is wired.

## Q5 — Priming value [live-pending]

**Finding: instrumented, A/B-ready; the instructions file encodes exactly the
conventions the automated layers assume.**

`.github/copilot-instructions.md` teaches the Debrief vocabulary (plot, track,
platform, selection) and the tool conventions (summarise-before-edit, prefer the
selection, never fabricate). The telemetry records a `primingEnabled` flag
(operator-toggled via `debrief.copilot.primingEnabled`) so a with/without run is
a labelled comparison. The expected difference — and the reason to ship the file —
is fewer "invent a tool id / edit without grounding" misses; the fail-safe
assertions (F2/F3) already prove the *tool* refuses those, so priming's job is to
reduce how often the model attempts them. Quantifying the delta needs the live
A/B session.

## Q6 — Transferability to the offline in-Debrief NL panel

**Finding: high. The tool surface is the deliverable that outlives the spike.**

- **Search** reuses `stacService.listItems` + the `debrief.openPlot` command; the
  4-criteria filter is plain TypeScript with zero Copilot coupling — it drops
  straight into an offline panel.
- **Execution** reuses the exact `calcService.executeTool` Python stdio path the
  Tools panel drives (FR-013), so chat-invoked and panel-invoked runs share
  validation, provenance shape, and behaviour.
- **The safety divergence** (`applyChatEdit`: apply-dirty, no disk write) is
  Copilot-agnostic and is precisely what a local-model panel wants.
- **Quarantine:** every Copilot-specific line lives in `src/copilot/` + one
  `package.json` contribution + one activation call. The offline panel reuses
  `searchCatalog`, `summarize`, `plotContext`, `applyChatEdit`, `registry`, and
  the telemetry/validation seams unchanged; only the *transport* (Copilot LM
  tools vs. a local model loop) is replaced.

---

## What worked

- Extension-mediated LM tools carry live editor context (open plot, selection)
  natively — the reason it feels like *driving* Debrief, not querying it.
- The dirty-only, no-disk-write edit path (FR-011) is clean and fully
  unit-proven; the divergence from the Tools-panel disk write is one omitted
  branch, not a parallel persistence code path.
- Strict-by-default posture: every fail-safe (no plot, empty selection, invalid
  params, invented tool) returns a structured, corrective, model-actionable
  result and applies nothing.

## What blocked / needed a workaround

- **Model identity is invisible to the tool** (R2) → operator-annotation +
  external routing probe. Worked around, recorded as a known limitation.
- **Pre-execution mutating classification** is a heuristic (category-based)
  because `resultType` is only known post-run → the invoke-time guard is the real
  safety net. Correct, but means a mis-categorised analytical tool that mutates
  will *error* rather than silently apply — a deliberate, reported trade-off.
- **Two verification layers deferred** (real-Python integration, extension-host
  `vscode.lm.invokeTool`) — Electron download blocked and no Python env in the
  cloud build session (`apps/vscode/src/test/copilot/README.md`). The stated
  SC-002 gate (transcript replay) is green; the deferred layers have written
  acceptance criteria for a follow-up.

## Undo granularity (research R5)

The Debrief editor is a webview custom editor with app-managed session state, not
VS Code's native undo stack, so "single undo" (FR-012) maps to the session
revert / discard-unsaved mechanism, not a text-document undo. The spike applies
the edit and marks the session dirty; **decline/failure leaves the plot
byte-identical because nothing is applied** (guaranteed and unit-proven).
Whether the current session model gives a *clean single-step* revert of an
applied-but-unsaved `updatePlotFeatures` change is the one invariant that the
deferred extension-host layer is designed to exercise. Per spike discipline this
is a **reported finding** (a gap the offline panel must close), not new undo
infrastructure built here.

## Recommendation for E13

Adopt this tool surface as the contract for the offline NL panel. The static +
meta-pair split, the summarise-before-edit grounding, the plain-language
confirmation gate, and the dirty-only apply all transfer. The two open items to
close first: a per-feature spatial digest in the summary (Q2 gap) and the
single-step-revert verification (R5). Wire the routing probe into nightly CI with
a key to turn Q4/Q5 from [live-pending] into standing measurements.
