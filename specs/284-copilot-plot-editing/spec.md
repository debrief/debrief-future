# Feature Specification: Copilot Chat Drives Debrief — STAC Plot Retrieval + Python Tool Editing (Spike)

**Feature Branch**: `284-copilot-plot-editing`
**Created**: 2026-07-10
**Status**: Draft
**Input**: User description: "Copilot Chat drives Debrief: STAC plot retrieval + Python tool editing of the current plot (experiment/spike). An analyst using the Debrief VS Code extension can use GitHub Copilot Chat (agent mode) to find and open plots from the local STAC catalog and run Debrief Python analysis/editing tools against the currently open plot, via natural language."

## Positioning: Experiment / Spike

This feature is an **experiment, not a production commitment**. Constitution Article I requires offline-by-default operation, and the #235 feasibility spike (`docs/ideas/235-nl-copilot-feasibility-spike.md`) rejected external LLM clients as a production framing; GitHub Copilot Chat is cloud-backed. The purpose of this work is to **learn how a chat agent drives Debrief through a tool surface** — tool granularity, context passing, confirmation UX, edit round-tripping — and to feed those findings into the E13 NL-copilot epic and the future in-Debrief offline NL panel. A written findings report is a first-class deliverable, equal in importance to the working demo.

Copilot Chat is a legitimate spike vehicle precisely because it is *inside* the Debrief VS Code frontend: unlike the rejected Claude-Desktop/Cursor framings, the Debrief extension mediates every tool call, so the lessons (and much of the code) transfer to a future self-contained NL surface.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find and open a plot from the STAC catalog (Priority: P1)

An analyst with Copilot Chat open (agent mode) types "open the Exercise Alpha day-1 plot". Copilot calls Debrief's plot-search tool, which queries the local STAC catalog; the matching plot opens in the Debrief plot editor (map view). When the request is ambiguous ("show me plots from March involving a submarine"), Copilot presents the candidate matches — title, time span, platforms, spatial extent — in the chat reply so the analyst can pick one, then opens the chosen plot.

**Why this priority**: Retrieval is the entry point of the whole interaction — every other capability assumes a plot is open. It is also the simplest end-to-end proof that Copilot can discover and correctly invoke a Debrief tool.

**Independent Test**: With the sample STAC catalog in the workspace and no plot open, ask Copilot to find plots matching a title fragment, a time range, a platform name, and a rough location; verify correct matches are reported and the selected plot opens in the Debrief editor.

**Acceptance Scenarios**:

1. **Given** the sample catalog is present and no plot is open, **When** the analyst asks Copilot to "open the [known plot title] plot", **Then** the plot-search tool is invoked, the matching STAC item is found, and the plot opens in the Debrief plot editor.
2. **Given** a search phrase that matches several plots, **When** the analyst asks for it, **Then** the chat reply lists the candidates with title, time span, platform names, and spatial extent, and a follow-up choice opens the selected plot.
3. **Given** a search phrase that matches nothing, **When** the analyst asks for it, **Then** the chat reply says no plots matched and states which criteria were applied (no silent failure, no hallucinated plots).

---

### User Story 2 - Edit the current plot via a Python tool (Priority: P1)

The analyst says "colour the submarine track red" or "run speed-filter below 5 knots on OWNSHIP". Copilot discovers the applicable Debrief tool from the live tool registry, proposes the call, and — **after the analyst confirms a human-readable description of the pending change** — the Python tool runs against the open plot's live (in-memory) feature state. The modified features are applied to the open editor as a normal dirty, undoable edit; the map updates immediately; the analyst saves through the usual save flow (or hits undo).

**Why this priority**: This is the core hypothesis of the spike — that a chat agent can safely fire Debrief's Python tool-server at the open plot. P1 alongside retrieval; together they are the demo.

**Independent Test**: Open a sample plot, issue a styling command and a manipulation command via chat, confirm each; verify the features change in the editor, the document is dirty, a single undo reverts the tool's edit, and nothing was written to disk before an explicit save.

**Acceptance Scenarios**:

1. **Given** an open plot containing a track, **When** the analyst asks for a styling change and confirms the previewed edit, **Then** the tool executes against the editor's in-memory features, the map reflects the change, and the document is marked dirty (not yet saved).
2. **Given** a chat-driven edit has been applied, **When** the analyst invokes undo, **Then** the plot returns to its pre-edit state in a single undo step.
3. **Given** Copilot proposes a mutating tool call, **When** the confirmation is shown, **Then** it describes the change in plain language (tool name, target features, parameter values) — not raw JSON — and declining leaves the plot untouched.
4. **Given** a tool that produces analytical output rather than edits (e.g. track statistics), **When** it runs, **Then** a summary is returned to the chat reply **and** the full result appears in the existing Results panel, identical to running the same tool from the Tools panel.
5. **Given** the Python tool fails (bad parameters, tool error), **Then** the failure reason reaches the chat reply and the plot state is unchanged.

---

### User Story 3 - Ask questions about the current plot (Priority: P2)

With a plot open, the analyst asks "what's in this plot?" or "which tracks are in the last hour?". Copilot calls the current-plot summary tool, which returns the plot's metadata plus a thinned feature inventory (feature names, types, platform identities, time spans, counts — not full geometry), and answers from that data.

**Why this priority**: The summary is the context foundation for edits — Copilot cannot target "the submarine track" without knowing the plot's contents — but it delivers standalone value (plot Q&A) even before any edit tool works.

**Independent Test**: Open a sample plot, ask content questions in chat, and verify answers are grounded in the actual features (names, counts, times match the plot data).

**Acceptance Scenarios**:

1. **Given** an open plot, **When** the analyst asks what the plot contains, **Then** the summary tool is invoked and the reply correctly reports the plot's title, time span, and per-feature inventory.
2. **Given** two plots open with plot A focused, **When** the analyst asks about "the current plot", **Then** the summary describes plot A; **When** the analyst names plot B explicitly, **Then** the tool is invoked with plot B's identifier and describes plot B.
3. **Given** no plot open, **When** the analyst asks about the current plot, **Then** the tool returns a clear "no plot is open" result that Copilot relays (with the suggestion to search the catalog), rather than an error trace.

---

### User Story 4 - Act on the current selection (Priority: P3)

The analyst selects features in the plot editor, then says "summarise the selection" or "run speed-filter on the selection". Tools can read the current selection so "the selection" resolves to the analyst's actual selected features.

**Why this priority**: Selection-awareness is the natural analyst workflow (mirrors the Tools panel's selection-driven applicability), but the spike's core lessons don't depend on it — hence P3.

**Independent Test**: Select one or more features on the map, issue a selection-scoped command in chat, and verify the tool receives exactly the selected features.

**Acceptance Scenarios**:

1. **Given** features are selected in the open plot, **When** the analyst issues a selection-scoped command, **Then** the tool operates on exactly the selected features.
2. **Given** nothing is selected, **When** the analyst issues a selection-scoped command, **Then** the reply states that nothing is selected and invites the analyst to select features (no guessing).

---

### Edge Cases

- **No plot open, edit requested**: mutating tools return a structured "no plot open" result; Copilot relays it and can offer to search the catalog first.
- **Multiple plots open**: tools default to the active/last-focused plot editor; the open-plots surface exposes plot identifiers so Copilot can pass an explicit override when the analyst names another open plot. If an explicit identifier matches no open plot, the tool reports the open plots rather than failing silently.
- **Plot has unsaved changes**: chat edits stack on the live state like any other edit — no reload, no clobbering.
- **Tool registry unavailable** (Python environment broken): the list-tools tool reports the degraded state; Copilot is told the registry is empty rather than receiving stale/hallucinated tool ids.
- **Copilot invents a tool id or parameters**: the run-tool surface validates tool id and parameters against the live registry schema and rejects with a corrective message the model can act on.
- **Large plots**: the summary returns a *thinned* inventory (bounded size) so plot size never blows the model's context; the tool must state when it has truncated.
- **Concurrent edit collision**: if the plot document changes between tool dispatch and result application (analyst edits mid-flight), the application step must detect this and refuse rather than overwrite the analyst's manual edit.
- **User declines confirmation**: the tool invocation resolves cleanly as "declined" — no error state, no retry loop.

## Requirements *(mandatory)*

### Functional Requirements

**Tool surface & discovery**

- **FR-001**: The Debrief VS Code extension MUST expose its capabilities to Copilot Chat agent mode via the VS Code Language Model Tools API (statically contributed tools mediated by the extension). No separate user-configured server process and no chat participant are introduced.
- **FR-002**: The extension MUST expose a meta-tool pair fronting the dynamic Python tool registry: a **list-tools** tool returning the live registry (tool ids, descriptions, parameter schemas, applicability) and a **run-tool** tool executing a named tool with parameters. The registry content MUST come from the live Python tool-server at call time, not a baked-in copy.
- **FR-003**: The extension MUST expose a dedicated **plot-search** tool and a dedicated **current-plot summary** tool (statically described so Copilot discovers them without a list-tools round-trip).

**STAC retrieval**

- **FR-004**: The plot-search tool MUST accept any combination of: free-text (matched against plot title/description), a time range, platform/entity names or types, and a spatial extent — all optional, combinable, and applied against the workspace's local STAC catalog.
- **FR-005**: Search results MUST include, per match: plot identifier, title, time span, platform names, and spatial extent — enough for the analyst to choose from the chat reply without opening anything.
- **FR-006**: The plot-search tool (or a companion open-plot action it offers) MUST be able to open a chosen matching plot in the Debrief plot editor.
- **FR-007**: The spec deliberately does **not** mandate where search executes (Python debrief-stac service vs. the extension's existing catalog reading). The plan phase decides on a least-work basis for the spike; the criteria and result shape above are the contract either way.

**Current-plot context**

- **FR-008**: The summary tool MUST return the open plot's metadata (title, id, time span) plus a thinned feature inventory (feature ids/names, types, platform identities, time spans, counts) bounded in size, flagging any truncation.
- **FR-009**: Tools operating on "the current plot" MUST default to the active/last-focused plot editor and MUST accept an explicit plot identifier override; the summary surface MUST expose the identifiers of all open plots.
- **FR-010**: Selection-scoped operation MUST be supported: tools can read the identifiers of the currently selected features in the plot editor and pass them to the Python tool as the operating set.

**Edit round-trip**

- **FR-011**: Mutating tool runs MUST operate on the open editor's in-memory feature collection (not the on-disk file), and their output MUST be applied to the open document as a standard dirty, undoable edit saved via the normal save flow. Chat-driven edits MUST NOT write STAC/GeoJSON files directly.
- **FR-012**: Each applied tool edit MUST be revertible with a single undo step.
- **FR-013**: Tool execution MUST reuse the extension's existing Python tool-server execution path (the same mechanism the Tools panel uses), so chat-invoked and panel-invoked runs share behaviour, validation, and provenance.
- **FR-014**: Analytical (non-mutating) tool results MUST be routed both as a summary in the tool's chat-visible result and in full to the existing Results panel, identically to a Tools-panel run.

**Confirmation & safety**

- **FR-015**: Read-only tools (plot-search, summary, list-tools) MUST run without a custom confirmation gate. Every mutating tool invocation MUST present a confirmation before execution containing a human-readable description of the pending change: tool name, target plot, target features, and parameter values in plain language (not raw JSON).
- **FR-016**: Declining a confirmation MUST leave the plot untouched and resolve the tool call as declined (a state the model can relay), not as an error.
- **FR-017**: The run-tool surface MUST validate the requested tool id and parameters against the live registry schema before dispatch, returning structured, correctable error messages for invalid requests.
- **FR-018**: Tool failures (Python errors, timeouts, no-plot-open, empty selection) MUST surface as structured results in the chat reply with the plot state unchanged.

**Provenance**

- **FR-023**: Chat-invoked tool runs MUST record provenance identically to Tools-panel runs (inherited via the shared execution path, FR-013) and MUST additionally record that the run was chat-initiated together with the analyst's originating natural-language utterance, so a later reader of the plot's lineage can answer "why did this change happen" from the analyst's own words.

**Learning instrumentation** *(the spike's product is knowledge — these make the findings quantitative rather than anecdotal)*

- **FR-024**: Every language-model tool invocation MUST be recorded to a structured, evidence-committable telemetry log capturing: tool id, parameters as received, validation outcome (accepted / rejected with reason), retry count, confirmation outcome (approved / declined / not required), and per-stage latency (registry fetch, Python execution, edit application). Reuse of #191's structured-logging pattern is expected; the exact format is a plan-phase decision.
- **FR-025**: The current-plot summary tool MUST report the approximate token size of each summary it returns, and the findings report MUST tabulate measured summary sizes for the sample plots against at least two representative local-model context windows — restoring #235's "token-budget probe: numbers, not vibes" deliverable.
- **FR-026**: The scripted demo scenarios MUST be executed under at least two different Copilot Chat model selections, with per-model tool-call quality captured in the telemetry log and compared in the findings report — the best available proxy for small/local-model feasibility.
- **FR-027**: The spike MUST ship a repository-level Copilot instructions file teaching Debrief domain vocabulary (plot, track, platform, selection) and the intended tool-usage conventions, and the demo scenarios MUST be run both with and without it, with the observed difference reported in the findings — measuring how much prompt scaffolding the future in-Debrief NL panel will need.

**Spike deliverables**

- **FR-019**: The feature SHOULD ship with 3–5 happy-path scenarios captured from a live Copilot Chat session as chat transcripts with screenshots/GIF in the evidence directory (candidates: "open the day-1 plot", "what's in this plot?", "colour the submarine track red", "run speed-filter below 5 kts on the selection", "summarise the selection"). These are **supplementary evidence** — the corresponding automated scripted-transcript replay (FR-031) is the correctness gate, so a developer can verify the feature without running this manual session.
- **FR-028**: The demo script MUST additionally include 2–3 failure-mode scenarios that MUST fail safely and be evidenced like the happy-path ones: an edit requested with no plot open, an ambiguous feature reference among several candidates (e.g. "colour the track" when several tracks are present), and an invented tool id — demonstrating the strict posture rather than merely specifying it.
- **FR-020**: The feature MUST ship with a written findings report covering: what worked unaided, what blocked or needed workarounds, tool-call quality measured from the telemetry log (correct tool choice, parameter accuracy, hallucination/rejection rate — per model per FR-026), the token-budget numbers (FR-025), the with/without-priming difference (FR-027), confirmation-UX observations, and implications for the future offline in-Debrief NL panel (feeding #235 / E13).
- **FR-021**: The tool adapters MUST have automated unit tests with mocked language-model tool invocations (each tool's `invoke`/`prepareInvocation` asserted against mocked service dependencies).
- **FR-022**: A new backlog row MUST be added for this spike, linked to the E13 NL-copilot epic and referencing #235 as related work.

**Automated verification** *(a developer or CI MUST be able to assess this feature end-to-end without a human in Copilot Chat; only the model's tool-selection is inherently non-deterministic — everything below the tool boundary is deterministic extension code and MUST be verified automatically)*

- **FR-029**: The repository MUST include an integration test suite that invokes the tool implementations directly against the **real** debrief-calc Python execution path and a committed fixture STAC catalog — proving the actual search (all four criteria) and the actual Python tool round-trip work, with no human and no LLM. This runs in CI on every PR.
- **FR-030**: The repository MUST include a VS Code extension-host test (via the existing `vscode-test` harness) that invokes the registered LM tools through the real registration path using `vscode.lm.invokeTool(...)` — with **no model involved** — and asserts the editor-side invariants directly: a mutating run changes the open plot's features, marks the session dirty, and performs **no on-disk write** (FR-011); a declined confirmation applies nothing (FR-016); `searchPlots` opens a plot via `debrief.openPlot`.
- **FR-031**: The eight scenarios (5 happy-path + 3 fail-safe) MUST be encoded as an automated **scripted-transcript replay**: a canned sequence of tool calls (the calls a model would emit) driven through the tools via the harnesses above, asserting the expected outcome for each. This replay — not the manual Copilot run — is the verification gate; the live Copilot session is supplementary evidence capture (screenshots for the findings report and blog), not the mechanism that proves correctness.
- **FR-032**: The spike MUST include an **automated model-routing probe** as a network-gated job (reusing #191's Anthropic transport, NOT Copilot): it feeds the four tool schemas + the scenario prompts to a model and asserts the model emits the expected tool call with schema-valid parameters. The job MUST skip cleanly (not fail) when no API key is present, so it never blocks offline developers or the core PR gate; it runs as a nightly / opt-in check and its output feeds the FR-026 routing-quality findings. This automates the "did a model route correctly" question that FR-026 would otherwise leave to a human.

### Key Entities

- **Plot (STAC Item)**: an analysis document in the local STAC catalog — title, description, time span, spatial extent, platform properties, GeoJSON feature payload. The search target and the edit target.
- **Tool registry entry**: a Python tool's id, description, parameter schema, applicability constraints, and mutating/analytical nature — served live by the tool-server, surfaced through list-tools.
- **Tool invocation**: one chat-initiated run — tool id, parameters, target plot, target features (all/selection), confirmation outcome, result (edited features or analytical payload), and failure detail if any.
- **Plot summary**: the thinned representation of an open plot handed to the model — metadata plus bounded feature inventory with truncation flag and reported token size.
- **Selection**: the set of feature identifiers currently selected in the plot editor.
- **Telemetry record**: one entry in the spike's evidence log per LM tool invocation — tool id, parameters, validation outcome, retry count, confirmation outcome, per-stage latency, active model, and priming-file on/off state.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: accomplish a plot task (find/open, understand, modify, analyse) by stating it in natural language instead of driving panels manually.
- **Key Decision(s)**:
  1. Which plot to open, when a search returns several candidates.
  2. Whether to approve a proposed mutating tool call.
- **Decision Inputs**: for (1) the per-match title, time span, platforms, and extent in the chat reply; for (2) the plain-language confirmation naming the tool, the target plot and features, and the parameter values.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Copilot Chat open (agent mode), Debrief extension active | Analyst types "open the Exercise Alpha day-1 plot" | Copilot invokes plot-search; matches summarised in chat |
| 2 | Search results in chat | Analyst picks / confirms the plot | Plot opens in the Debrief plot editor (map view) |
| 3 | Plot open | Analyst types "colour the submarine track red" | Copilot reads the plot summary, selects the styling tool, proposes the call |
| 4 | Confirmation prompt | Analyst reads the plain-language change description and approves | Python tool runs; edited features applied to the editor; map updates; document dirty |
| 5 | Edited plot | Analyst saves (or undoes) | Normal save flow persists (or single undo reverts) the change |

### UI States

- **Empty State**: no plot open — plot-scoped tools report "no plot is open"; Copilot offers to search the catalog.
- **Loading State**: standard Copilot tool-running indicator while search/summary/tool execution is in flight; long-running Python runs must not freeze the editor.
- **Error State**: tool failure reasons appear in the chat reply as structured text (which criteria matched nothing, which parameter was invalid, why the run failed); the plot is unchanged.
- **Success State**: for edits — map visibly updated, document dirty, undo available; for analytics — summary in chat and full result in the Results panel; for search — candidates listed or plot opened.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst can go from "no plot open" to "requested plot open in the editor" using a single natural-language request (plus at most one disambiguation choice) for each of the four search criteria types — free text, time range, platform, and spatial extent.
- **SC-002**: All eight scenarios (5 happy-path + 3 fail-safe) pass as an **automated scripted-transcript replay** in CI, with no human and no LLM (FR-031); every fail-safe scenario leaves the plot untouched. A live Copilot session is captured as supplementary evidence but is not required to prove SC-002.
- **SC-003**: The extension-host test asserts that 100% of mutating invocations gate on a confirmation before executing and that a mutating run performs **zero on-disk writes** (verified by observing the store, not by inspection) — FR-011/FR-030.
- **SC-004**: The extension-host test asserts a mutating run marks the session dirty and that a declined/failed run leaves the plot byte-identical to its pre-invocation state; undo-revert granularity is exercised and its result recorded (a clean single-step revert, or a documented gap — research R5).
- **SC-005**: In the automated model-routing probe (FR-032), a model selects the correct tool and schema-valid parameters on the first attempt in at least 80% of the eight scenarios; every miss is recorded with its failure mode. When the probe is skipped (no key), this is instead measured from the telemetry of a manual run and noted as such.
- **SC-006**: The telemetry log contains a record for 100% of tool invocations made during the evidenced demo runs — no invocation is unaccounted for.
- **SC-007**: The findings report states measured summary token sizes for every sample plot exercised, with an explicit fits/doesn't-fit verdict against at least two representative local-model context windows.
- **SC-008**: The findings report answers, with evidence, the spike's six learning questions: tool-granularity fit (meta-pair vs. static), context sufficiency (was the thinned summary enough to target edits?), confirmation-UX friction, model sensitivity (did tool-call quality vary across the models tested?), priming value (what difference did the instructions file make?), and transferability of the tool surface to an offline in-Debrief NL panel.
- **SC-009**: A developer gets a one-command, no-human verdict on the feature: `pnpm --filter @debrief/vscode test:unit && pnpm --filter @debrief/vscode test:integration` (unit + real-Python integration + extension-host) passes green in CI on every PR. The network-gated routing probe is excluded from this gate and runs separately.

## Assumptions

- The analyst has a GitHub Copilot licence and Copilot Chat agent mode available; this dependency is acceptable **because the feature is a spike** (see Positioning) — it does not weaken the offline-by-default constitution for shipped capability.
- Copilot Chat's model picker offers at least two distinct models to the licence in use (needed by FR-026); if only one is available, the comparison degrades gracefully to a single-model result, noted as a limitation in the findings.
- The workspace sample STAC catalog (as used by the existing STAC tree/preview workflows) is the search corpus; multi-catalog and remote STAC are out of scope.
- The existing Python tool-server execution path (as used by the Tools panel) is reusable for chat-invoked runs without protocol changes; only new invocation context (live features, selection, plot id) is added.
- "Current plot" resolution can build on the extension's existing open-plots tracking.
- The search-engine placement decision (FR-007) lands in the plan phase; whichever side is chosen, the search criteria and result contract in FR-004/FR-005 hold.
- No explicit time-box is set for this spike (unlike #235's ≤3 days); the evidence + findings deliverables define "done".

## Out of Scope

- Shipping as a supported production feature, or any commitment to Copilot as the long-term NL surface.
- Offline / local-model operation (that is the E13 follow-on this spike informs).
- Multi-catalog or remote STAC search; multi-plot orchestration beyond "search, open one".
- Optimising conversational multi-turn refinement.
- A production audit trail. (The spike's telemetry log, FR-024, is throwaway experiment instrumentation for the findings report — it is not a shipped audit capability; the chat-initiated provenance tagging of FR-023 rides the existing provenance system.)
- Non-Copilot chat clients (Claude Desktop, Cursor, etc. — already rejected as production framings in #235).

## Related Work

- `docs/ideas/235-nl-copilot-feasibility-spike.md` — the NL co-pilot feasibility spike this experiment concretises; findings here feed the E13 epic decomposition.
- Rejected #195 (`specs/195-nl-layers-tools/`) — prior NL framing and why it was dropped.
- #191 VS Code NL search (`apps/vscode/src/services/llmProxy.ts`) — existing LLM plumbing and structured logging.
- Existing execution/UI paths to reuse: `apps/vscode/src/services/calcService.ts` (Python tool-server invocation), `apps/vscode/src/services/stacService.ts` (catalog access), `apps/vscode/src/services/resultsPanelService.ts` (analytical results), `apps/vscode/src/services/openPlotsService.ts` (open-plot tracking), `services/calc/debrief_calc` (tool registry + server), `services/stac/src/debrief_stac/mcp_server.py` (STAC service surface).
