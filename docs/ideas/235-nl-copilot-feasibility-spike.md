# [E13] NL Co-pilot for the open plot — feasibility spike

**Item**: #235 (Research Spike, Low complexity, proposed)
**Status**: Predecessor: rejected #195
**Time-box**: ≤3 days

## Context

Backlog #195 ("NL search in Layers & Tools panels") was rejected on 2026-04-27 after the implementation start surfaced two problems: (a) the original spec/plan rested on a false premise that the Layers and Tools panels already rendered a `FilterBar`, when in fact they had no search input at all; and (b) neither panel has a discoverability problem that NL search would address (the Layers list is a tens-of-features view the analyst can already see on the map; the Tools list is already partitioned into applicable/inactive).

The capability still has long-term value — but in a different form. This spike scopes the right shape before committing to a multi-item epic.

## Capability hypothesis

An analyst with a plot open issues NL commands via a panel that lives **inside Debrief** — likely a CoPilot-style side panel or a transient command pane. Commands either modify data and presentation (filter, hide, color-by, group, change display mode) or extract value from the data (find threshold crossings, summarise selection, run a tool with the selection as input).

Worked examples:

- "filter to submarine tracks"
- "hide non-allied platforms"
- "run speed-filter below 5 kts on the current selection"
- "summarise the current selection"
- "find threshold crossings below 5 kts during the last hour of the plot"

The current open plot is the scope. Multi-plot orchestration (resolving "during Saxon Warrior" via STAC, loading matching plots, then operating on them) is **out of scope** for this epic — that's a future epic if/when we get there.

## Architectural constraints

**Production target: local LLM, no internet** (Article I of the constitution — Defence-Grade Reliability, offline by default). Real analysts will not have internet access. The capability MUST eventually run with a local model bundled or shipped alongside Debrief.

**Cloud LLM acceptable for the spike.** #191's existing Anthropic pipeline can be reused for exploration. The spike must demonstrate a clear upgrade path so the same code ships when a local runtime replaces Anthropic — abstraction layer, prompt + tool-call format, context-token budget, trust/confirmation flow.

**Tightly integrated into Debrief.** External MCP-client framings (drive Claude Desktop or Cursor against Debrief's services) were considered and rejected. Production must be self-contained.

## Spike deliverables

1. **Minimal in-Debrief panel OR command pane** in the VS Code extension wired to 2–3 plot-acting commands. The spike picks one UI shape (CoPilot panel vs. command pane) and justifies the pick.
2. **`LLMClient` abstraction reused from #191** with a documented local-model implementation path — which runtime (e.g. `llama.cpp` HTTP server, `ollama`), which model size is feasible, which tool-call format survives the swap.
3. **Token-budget probe** — does a typical plot's metadata + a thinned representation of its features fit in a 7B/13B context window? Numbers, not vibes.
4. **UI-choice trade-off note** — CoPilot panel vs. command pane: which feels right for "act on the open plot" commands, what the trade-offs are.
5. **Tool-call confirmation policy proposal** — per-call gate vs. session-level trust-mode vs. mixed (some tools auto-run, some need confirmation). Defence context implies a default-strict posture.

## Output

A one-page report covering:

- What worked unaided.
- What blocked or required workarounds.
- The recommended UI surface.
- The local-model upgrade plan (runtime, model size, tool-call format, known gaps).
- The recommended decomposition for the follow-up [E13] epic — which items, dependency order, complexity ratings.

The report drives a `/epic` invocation that produces the [E13] backlog rows.

## Out of scope (for this spike)

- Multi-plot STAC orchestration (a future epic).
- Conversational refinement / multi-turn chat (the panel may have history, but the spike doesn't optimise for it).
- Cross-organisation tool catalogues (`/contrib/`).
- Non-Anthropic cloud providers (#196 covers that orthogonally).
- An audit trail beyond the structured logging #191 already provides — that's a candidate item for the follow-up epic, not this spike.

## References

- Predecessor: rejected #195 (`specs/195-nl-layers-tools/`)
- NL pipeline this builds on: #191 ("VS Code NL search" — `apps/vscode/src/services/llmProxy.ts`, `shared/components/src/nl-cql2/`)
- Tool execution layer this calls into: `services/calc/` (debrief-calc) — direct in-process for the spike, not via MCP
- Constitutional driver: Article I (Defence-Grade Reliability), Article IV (Architectural Boundaries)
