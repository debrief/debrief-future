# Feature Specification: Copilot Chat Integration Best-Practices Upgrade

**Feature Branch**: `285-copilot-best-practices`
**Created**: 2026-07-11
**Status**: Draft
**Input**: User description: "Copilot Chat integration best-practices upgrade — optimise the #284 spike surface for demoing and research: priming file location fix, Debrief Analyst custom agent, prompt-file demo scenarios, budget-aware token-efficient tool results with spatial digest, approvals hardening, MCP hybrid catalog-search experiment. Successor to spike #284."

## Positioning

Spike #284 proved that a chat agent can drive Debrief through a four-tool surface
(`debrief_searchPlots`, `debrief_summarizeCurrentPlot`, `debrief_listTools`,
`debrief_runTool`). Its findings report recommends adopting that surface as the
contract for the future offline NL panel (epic E13) and names concrete gaps.
Meanwhile the host platform has moved: VS Code shipped native MCP support (GA),
automatic tool grouping above a hard per-request tool limit, and a customization
stack (workspace instructions, prompt files, custom agents, per-tool approval
policy) that the spike predates.

This feature upgrades the spike surface to current best practice so that
**demos are reproducible and friction-free** and **the research measurements
(model routing, priming effect, token budgets) are trustworthy**. Like #284 it
is demo/research-facing, not a production commitment: Copilot's cloud dependency
remains acceptable here because the deliverable is knowledge and demo capability
feeding E13 (Constitution Article I still governs shipped capability). The
local-model validation remains deliberately deferred (see #235).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Domain priming actually loads (Priority: P1)

The #284 domain-priming file lives at `apps/vscode/.github/copilot-instructions.md`,
but the host only auto-applies a priming file found at the **workspace root** of
the folder open in the editor. In the browser preview (Code Server) and in any
session opened at the repo root, the priming file is silently ignored — which
both weakens live demos and invalidates the with/without-priming comparisons the
research relies on. An analyst or demo operator opens the demo workspace, asks a
domain question in chat, and the model demonstrably has the Debrief vocabulary
and conventions loaded.

**Why this priority**: Every other measurement and demo behaviour in this
feature (and in #284's standing findings) assumes priming is active. If the file
never loads, the priming A/B results are comparing nothing against nothing.
Cheapest fix, largest correctness impact.

**Independent Test**: Open each supported demo workspace (preview Code Server
workspace; repo root), inspect the chat request's applied-instructions
indicator, and confirm the Debrief priming content is listed as applied.

**Acceptance Scenarios**:

1. **Given** the browser-preview Code Server workspace is open, **When** a user sends any chat request in agent mode, **Then** the chat UI's applied-context indicator shows the Debrief priming instructions were included in the request.
2. **Given** the repository is opened at its root in a desktop editor, **When** a user sends a chat request, **Then** the same priming instructions are applied.
3. **Given** the priming content is maintained in one canonical location, **When** it is edited, **Then** every workspace that loads it reflects the edit without manual copying (or a documented, automated sync keeps copies identical).

---

### User Story 2 - Reproducible demos: curated agent + scripted scenarios (Priority: P1)

A demo operator (or a stakeholder following the quickstart) selects a
**"Debrief Analyst"** agent from the chat agent picker. That agent runs with a
pinned model and a restricted tool list — the four Debrief tools plus the
minimum built-ins — so the demo behaves the same regardless of the user's
defaults, and the model is never distracted by dozens of unrelated tools. The
operator then invokes any of the #284 demo scenarios as a one-keystroke slash
command (e.g. `/demo-find-plot`), each scenario pre-wired to the right agent,
model, and tools.

**Why this priority**: This is the core "optimise what we're demoing /
researching" ask. The #284 routing probe showed model choice dominates
tool-call quality, and community experience shows models routinely ignore
*instructions* to use specific tools — restricting the available tool list is
the reliable lever. A curated agent also approximates the future offline panel
(a model in a loop with only the Debrief surface), making research findings
transfer better to E13.

**Independent Test**: On a fresh machine/profile with the workspace open,
select the Debrief Analyst agent, run each scenario slash command, and confirm
each completes its scripted flow without manual tool-picker or model-picker
setup.

**Acceptance Scenarios**:

1. **Given** a fresh editor profile with the extension installed and the demo workspace open, **When** the user opens the chat agent picker, **Then** a "Debrief Analyst" agent is offered, described in analyst terms.
2. **Given** the Debrief Analyst agent is selected, **When** the user inspects its available tools, **Then** only the four Debrief tools (plus a documented minimal set of built-ins) are enabled, and the model is the pinned one.
3. **Given** the demo workspace, **When** the user types `/` in chat, **Then** each of the eight #284 scenarios (5 happy-path + 3 fail-safe) is offered as a named prompt command, and invoking it reproduces that scenario's scripted flow.
4. **Given** a scenario prompt is invoked under the Debrief Analyst agent, **When** it completes, **Then** the outcome matches the corresponding #284 transcript expectation (same terminal tool, same gating behaviour).

---

### User Story 3 - Mutation approvals can never be bypassed; read-only tools are frictionless (Priority: P2)

A security-conscious stakeholder watches a demo where the operator has enabled
the editor's global "auto-approve everything" convenience mode. Even so, when
the chat runs a mutating Debrief tool, the plain-language confirmation dialog
still appears — the extension declares its mutating tool ineligible for
auto-approval. Conversely, the three read-only tools are pre-approved at
workspace scope by a documented one-time setup step, so a demo shows exactly
one kind of dialog: the meaningful mutation gate.

**Why this priority**: Defence posture is a first-class product story
("the safety lives in the extension, not the prose" — #284 findings). Making
the mutation gate bypass-proof strengthens that story; removing read-only
confirmation noise makes demos watchable. Depends on nothing else in this
feature.

**Independent Test**: Enable the editor's global tool auto-approval, run a
mutating tool via chat, and observe the confirmation still appears; run each
read-only tool after the documented pre-approval step and observe no dialogs.

**Acceptance Scenarios**:

1. **Given** the editor's global tool auto-approval setting is enabled, **When** chat invokes the mutating run-tool path, **Then** the plain-language confirmation dialog is still presented and the run does not proceed without explicit approval.
2. **Given** the confirmation dialog is declined, **When** the model reports back, **Then** the outcome is "declined", nothing is applied, and the plot remains byte-identical (unchanged from #284 behaviour).
3. **Given** the documented one-time pre-approval steps have been followed, **When** chat invokes search, summarise, or list-tools, **Then** no approval dialog interrupts the flow.
4. **Given** a fresh workspace where pre-approval has NOT been performed, **When** a read-only tool is invoked, **Then** the default host approval flow appears (no silent auto-approval is granted by the extension itself).

---

### User Story 4 - Token-efficient, budget-aware plot summary with spatial digest (Priority: P2)

An analyst with a very large plot open asks the agent to summarise it. Instead
of a fixed 200-feature cap with a blunt `truncated` flag, the summary adapts to
the token budget the host grants the request: highest-value content (plot
metadata, feature names/ids/types) survives, lower-priority detail (per-feature
time spans, the new spatial digest) is shed first, and the model is told what
was omitted. Every feature entry now carries a coarse **spatial digest** (e.g.
relative position/extent) so requests like "the northern track" become
answerable from the summary alone — closing the Q2 gap named in the #284
findings. All tool results also stop wasting tokens on decorative formatting.

**Why this priority**: Token cost per summary is the standing measurement the
E13 local-model decision rests on ("numbers, not vibes"). Making results
budget-aware improves both live demo quality on large plots and the fidelity of
the token-budget dataset. Larger effort than US1–US3, hence P2.

**Independent Test**: Summarise fixture plots at the four #284 token-probe
sizes; verify small plots gain the spatial digest with modest size growth, and
oversized plots degrade by dropping documented lower-priority content rather
than hard-truncating at a fixed count.

**Acceptance Scenarios**:

1. **Given** a typical plot (tens of features), **When** it is summarised, **Then** each feature entry includes a coarse spatial digest sufficient to distinguish "northern" from "southern" features, and the reported approximate token size remains within the documented budget for typical plots.
2. **Given** a plot large enough to exceed the granted budget, **When** it is summarised, **Then** the summary fits the budget by omitting content in the documented priority order, and it tells the model the inventory is partial and how to narrow scope.
3. **Given** any tool result, **When** its serialized form is inspected, **Then** it contains no purely decorative whitespace/indentation (compact serialization), and the reported approximate token count reflects the emitted payload.
4. **Given** the #284 token-probe fixture sizes, **When** the probe is re-run, **Then** an updated fits/doesn't-fit table against representative local-model context windows is produced for the E13 record.

---

### User Story 5 - MCP hybrid experiment: catalog search served by the existing Python MCP server (Priority: P3)

A researcher configures the extension to expose Debrief's **existing** Python
STAC MCP server to the editor's agent mode, so catalog search is available as
an MCP tool alongside (or instead of) the extension-contributed search tool.
They run the routing scenarios both ways and record a comparison — routing
quality, latency, confirmation behaviour, setup friction — as a findings note
feeding E13 and validating the strategy bet that Debrief's MCP-first services
pay off in AI integrations ("the payoff of the MCP architectural choice").

**Why this priority**: Highest research value per line of new code (the Python
MCP server already exists), but it is an experiment with a written comparison
as its deliverable, not a demo-critical capability — the editor-coupled tools
(summarise, run-tool) must stay extension-contributed regardless, because MCP
servers cannot see the open editor or selection.

**Independent Test**: With the MCP server registered, ask the agent to find a
plot using only the MCP-served search tool (extension search tool disabled);
confirm results match the extension tool for the same queries; comparison note
exists in evidence.

**Acceptance Scenarios**:

1. **Given** the extension is installed, **When** agent mode starts in the demo workspace, **Then** the Debrief STAC MCP server is discoverable and its catalog-search capability is listed among available tools without manual server configuration by the user.
2. **Given** identical search queries (text, time, platform, spatial), **When** run via the MCP-served tool and via the extension search tool, **Then** the returned plot sets are identical.
3. **Given** the routing scenarios that terminate in search, **When** each is run under both configurations, **Then** a written comparison records per-configuration routing outcome, latency, and any behavioural differences, with a recommendation for the E13 tool-surface contract.
4. **Given** the MCP server fails to start (e.g. missing Python environment), **When** agent mode is used, **Then** the extension-contributed search tool still works and the failure is reported non-fatally.

---

### Edge Cases

- Priming file present at two roots (repo root and preview workspace): content drift between copies — mitigated by canonical-source + sync check (US1, FR-003).
- The pinned model in the custom agent is unavailable to the user's Copilot subscription: the agent must degrade to the user's default model with a visible indication, not fail silently — demo docs note the fallback.
- Host version predates custom agents / per-tool approval policy: older editors ignore the new files/settings; the four tools must keep working exactly as in #284 (graceful degradation, no hard dependency on newest host features).
- A scenario prompt is invoked with no plot open: fail-safe scenarios must behave as scripted (corrective refusal), which is itself part of the demo set.
- Budget-aware summary asked for a budget smaller than the minimum useful summary: emit the highest-priority core (plot id, title, counts) plus an explicit "narrow the scope" instruction, never an empty or garbled result.
- Spatial digest on features without geometry (e.g. metadata-only entries): digest omitted for that entry, never fabricated.
- MCP-served search and extension search both enabled simultaneously: the model may pick either; the comparison protocol must control for this by disabling one side per run.
- Auto-approval ineligibility flag on a host that does not support it: the mutation gate must still hold via the existing prepare-invocation confirmation (defence in depth).

## Requirements *(mandatory)*

### Functional Requirements

**Priming placement (US1)**

- **FR-001**: The Debrief domain-priming instructions MUST be automatically applied to chat requests in every supported demo workspace: the browser-preview (Code Server) workspace and the repository opened at its root.
- **FR-002**: Applied priming MUST be verifiable by a demo operator from the chat UI (the request's applied-context/instructions indicator), and the verification step MUST be documented in the demo quickstart.
- **FR-003**: The priming content MUST have a single canonical source; if placement requires copies, an automated check MUST fail (in CI) when copies drift from the canonical source.

**Curated agent (US2)**

- **FR-004**: The workspace MUST provide a "Debrief Analyst" custom agent, selectable in the chat agent picker, with: a pinned model choice, a restricted tool list containing the four Debrief tools plus a documented minimal built-in set, and an analyst-facing description.
- **FR-005**: The custom agent definition MUST embed (or reference) the Debrief tool-usage conventions (summarise-before-edit, list-before-run, never fabricate ids) so the persona carries them even where workspace instructions are not loaded.
- **FR-006**: The agent MUST degrade gracefully when the pinned model is unavailable: chat remains usable with the user's default model, and demo documentation states the expected behaviour.

**Scenario prompt files (US2)**

- **FR-007**: Each of the eight #284 demo scenarios (5 happy-path, 3 fail-safe) MUST be invocable as a named slash-command prompt in the demo workspace, pre-wired to the Debrief Analyst agent and its tool set.
- **FR-008**: Each scenario prompt MUST reproduce the corresponding #284 scripted-transcript flow: same terminal tool, same confirmation gating, same fail-safe refusals.
- **FR-009**: The demo quickstart MUST be updated to drive demos through the agent picker + slash commands, replacing free-typed prompts as the primary demo path.

**Approvals (US3)**

- **FR-010**: The mutating run-tool capability MUST be declared ineligible for auto-approval, such that host-level blanket auto-approval settings do not bypass its confirmation dialog.
- **FR-011**: The existing plain-language confirmation (tool, target plot, target features by name, parameters) MUST remain the gate content; declining MUST continue to resolve as "declined" with zero changes applied.
- **FR-012**: A documented one-time workspace setup MUST allow the three read-only tools to run without approval dialogs; the extension itself MUST NOT silently grant approval (user/host-controlled only).
- **FR-013**: On hosts lacking per-tool approval-eligibility support, the mutation confirmation MUST still be enforced by the existing invocation-preparation gate (no regression from #284).

**Token-efficient results (US4)**

- **FR-014**: All tool results MUST use compact serialization (no pretty-printed indentation); reported approximate token counts MUST be computed over the emitted payload.
- **FR-015**: The plot summary MUST adapt its content to the token budget granted per request, shedding content in a documented priority order (core plot identity and feature ids last to go; per-feature detail and spatial digest first), replacing the fixed feature-count cap as the primary size control.
- **FR-016**: When content is shed, the summary MUST state that the inventory is partial and instruct the model how to narrow scope (selection, search, or feature filters).
- **FR-017**: Each feature entry in the summary MUST include a coarse spatial digest (relative position/extent within the plot) sufficient to resolve positional references such as "the northern track", omitted (not fabricated) for features without geometry.
- **FR-018**: The token-budget evidence table (probe sizes vs representative local-model context windows) MUST be regenerated with the new summary format and recorded for E13.

**MCP hybrid experiment (US5)**

- **FR-019**: The extension MUST be able to register Debrief's existing Python STAC MCP server with the editor's agent mode without manual per-user server configuration, exposing catalog search as an MCP-served tool.
- **FR-020**: The MCP-served search MUST return result sets identical to the extension-contributed search tool for the same query inputs (text, time range, platform, spatial extent).
- **FR-021**: MCP server startup failure MUST be non-fatal: the extension-contributed tools remain fully functional and the failure is surfaced as a log/diagnostic, not an error dialog.
- **FR-022**: A written comparison (routing outcome per scenario, latency, confirmation behaviour, setup friction, recommendation for the E13 contract) MUST be captured as evidence, following the #284 findings-report discipline.

**Cross-cutting**

- **FR-023**: All #284 behavioural invariants MUST be preserved: chat edits applied dirty-only with zero on-disk writes, structured corrective fail-safe results, per-invocation telemetry, and provenance capture of the analyst utterance.
- **FR-024**: The existing automated verification layers (unit tests, 8-scenario transcript replay) MUST remain green, extended to cover the new summary format and approval-eligibility declaration.

### Key Entities

- **Priming instructions**: The canonical Debrief domain-vocabulary and conventions document applied to every chat request; one source, placement per workspace.
- **Debrief Analyst agent**: A named chat persona definition — description, pinned model, restricted tool list, embedded conventions — the curated environment for demos and research runs.
- **Scenario prompt**: A named, parameterless (or minimally parameterised) invocable command reproducing one #284 demo scenario; the unit of reproducible demos and future trajectory-level evaluation.
- **Budget-aware plot summary**: The thinned plot inventory, now priority-ranked and budget-adaptive, each entry optionally carrying a spatial digest; the tool-result contract the E13 offline panel inherits.
- **Approval policy declaration**: The per-tool statement of auto-approval eligibility (mutating: never; read-only: host/user discretion).
- **MCP-served catalog search**: The same catalog-search capability delivered through the existing Python MCP service; comparison subject of the hybrid experiment.
- **Comparison findings note**: The written MCP-vs-extension-tool comparison feeding the E13 tool-surface contract decision.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In both supported demo workspaces, the applied-context indicator confirms priming is loaded on 100% of chat requests, verified and screenshotted for evidence.
- **SC-002**: A demo operator on a fresh editor profile can go from "workspace open" to "first scenario completed" using only the agent picker and a slash command, with zero manual tool-picker or model-picker configuration, in under 2 minutes.
- **SC-003**: All eight scenario prompts reproduce their #284 scripted outcomes (terminal tool, gating, refusals) — 8/8 in a recorded live session.
- **SC-004**: With host-level blanket auto-approval enabled, 100% of mutating invocations still present the confirmation dialog; with documented pre-approval applied, 0 approval dialogs appear across the three read-only tools in a full demo run.
- **SC-005**: A typical plot summary (tens of features) including spatial digests stays within the documented typical-plot token budget; an over-budget plot degrades in the documented priority order with an explicit partial-inventory notice — both verified against the #284 probe fixture sizes, and compact serialization alone reduces summary payload size by a measurable amount (target ≥15%) at every probe size.
- **SC-006**: "The northern track" class of positional reference resolves to the correct feature id from the summary alone in the scenario replay, without a follow-up tool call.
- **SC-007**: The MCP-served search returns identical result sets to the extension search for 100% of the comparison query matrix, and the written comparison note answers: does routing quality differ, and which serving mode should the E13 contract prefer?
- **SC-008**: Existing #284 verification (48 unit tests + 8-scenario replay) remains green throughout, extended with new assertions for the summary format and approval declaration.

## Assumptions

- The browser-preview Code Server workspace root and the repo root are the two workspaces that matter for demos; other ad-hoc folder opens are out of scope.
- The pinned demo model is a Sonnet-class model, per the #284 routing-probe finding that the stronger model dominates tool-routing quality; exact identifier is an implementation-time choice, and probe data should inform it.
- "Minimal built-in set" for the custom agent will be determined during implementation by running the scenarios and enabling only what they require; the spec bounds it to "documented and deliberately chosen", not a specific list.
- The eight #284 scenarios are adopted as-is; authoring new scenarios is out of scope (the sequence-aware routing-probe harness recommended by #284 is a separate follow-up item, though scenario prompts should be written so that harness can reuse them).
- The spatial digest granularity (e.g. compass-sector + relative extent) is an implementation choice; the requirement is only that positional references like "northern" resolve correctly.
- The MCP experiment reuses the existing Python STAC MCP service; no new Python service capability is written for it beyond registration/config glue.
- Local-model work remains deferred (#235); nothing in this feature depends on a local runtime.

## Out of Scope

- The sequence-aware, multi-turn routing-probe harness (recommended by #284; separate backlog item).
- Local-model validation of the tool surface (#235, deliberately deferred).
- Serving the editor-coupled tools (summarise, run-tool) over MCP — architecturally excluded because MCP servers cannot access the open editor, selection, or dirty-edit path.
- Any change to the offline in-Debrief NL panel itself (E13 epic; this feature only feeds its contract).
- New demo scenarios beyond the #284 eight.
