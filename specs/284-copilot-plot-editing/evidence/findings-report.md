# Findings — Copilot Chat Drives Debrief (Spike #284)

The product of this spike is knowledge for its offline successor (epic E13 /
#235), not shipped code. This report answers SC-008's six learning questions
and records what worked, what blocked, and what the future in-Debrief NL panel
should inherit or avoid.

**Evidence basis.** The Debrief side of the boundary is verified automatically
(48 unit tests + the 8-scenario transcript replay, all green; `test-summary.md`).
The model's own routing quality (Q4) and the priming A/B (Q5) were **measured for
real** via the automated routing probe run across two models × priming
(`routing-probe.md`, captured 2026-07-11) — not left to a live session. A live
Copilot session would add in-situ screenshots but is not required for these
findings. Everything below the tool boundary is deterministic and is reported
from the automated layers.

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

## Q4 — Model sensitivity: **measured — large, and it favours the stronger model**

The routing probe was run for real (2026-07-11) across two models × priming, 8
scenarios each (`routing-probe.md`). Strict scoring (terminal tool on the first
call): **Sonnet 5 = 6/8 (75%)**, **Haiku 4.5 = 4/8 (50%)**. Neither clears the
SC-005 ≥80% *strict* gate — but the gap between models is the real finding.

Two nuances the raw number hides:

1. **Haiku's failure mode is *under-calling*, not mis-routing.** Three of its
   four misses are **no tool call at all** — it answered "what's in this plot?",
   "summarise the selection", and "list the tools" in prose instead of invoking
   the tool. Sonnet called a tool every time. For a small/local target model
   (the E13 audience) this is the headline risk: the model hedges in text rather
   than driving the tool surface.
2. **The two edit/analysis scenarios are multi-step**, and the single-first-call
   probe under-scores them (see Q5 and `routing-probe.md`). Re-scored
   sequence-aware, **Sonnet 5 is effectively 8/8 (100%)** — it never mis-routed,
   only grounded-first — while Haiku is 50–62%.

**For E13:** model capability dominates. A local model must be chosen (or
fine-tuned) for *reliable tool invocation on discovery intents*, which is exactly
where the weaker model failed.

## Q5 — Priming value: **measured — it steers the pattern, and the probe is the wrong ruler**

The probe was run with `.github/copilot-instructions.md` sent as the system
prompt vs. not. Strict scores: Haiku **50% → 38%** (priming *lowered* it),
Sonnet **75% → 75%** (unchanged). At face value priming looks useless-to-harmful
— but that is a **probe artifact**, and the artifact is itself the finding:

- Priming pushes the model toward **grounding-first** on the two multi-step
  intents — a primed Haiku answers "colour the track red" with
  `summarizeCurrentPlot` and "speed-filter on the selection" with `listTools`,
  which is **exactly what the instructions say to do** ("summarise before you
  edit", "call listTools before runTool"). The single-first-call probe scores the
  terminal tool, so it penalises the correct prerequisite call.
- Re-scored **sequence-aware**, priming *raises* Haiku (50% → 62%) by nudging it
  to the right first step; Sonnet already grounds correctly with or without it.

**Conclusion:** the domain-priming file demonstrably changes *which* tool the
model reaches for first, toward the instructed grounding-first pattern — a real,
observed effect. Quantifying whether that improves end-to-end success needs a
**multi-turn** harness that scores the whole trajectory, not the single-shot
probe. That harness is the concrete recommended follow-up for E13.

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
single-step-revert verification (R5), and a **sequence-aware routing probe** (a
multi-turn harness that scores the whole trajectory, not just the first tool
call — the current probe structurally under-measures the edit/analyse intents,
see Q5). Wire the routing probe into nightly CI with a key so Q4/Q5 stay standing
measurements; the first real run (2026-07-11) already shows Sonnet 5 ≫ Haiku 4.5,
with the weaker model's risk being *under-calling* tools rather than mis-routing.
