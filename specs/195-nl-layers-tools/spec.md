# Feature Specification: NL Search in Layers & Tools Panels

**Feature Branch**: `195-nl-layers-tools`
**Created**: 2026-04-18
**Status**: REJECTED 2026-04-27
**Input**: Backlog #195 — "[E10] NL search in Layers & Tools panels. Extend NL-mode to other VS Code webview surfaces once #191 proves out in the Catalog Overview; FilterBar `llmClient` prop carries over, wiring is presentational (requires #191)."

## Rejection Notice (2026-04-27)

**This feature is not being implemented.** Decision recorded during `/speckit.clarify` after the implementation start surfaced two problems:

1. **The "wiring is presentational" premise was false.** Layers and Tools panels do not render `FilterBar`. Spreading the NL UI to them would require a new shared component, per-panel taxonomy builders, threading `nlConfig` and two `LLMClient` instances into the Activity Panel webview, and ~600–900 LOC of work — substantially more than the original Medium-complexity estimate. (See `plan.md` for the full re-plan that was drafted before rejection.)

2. **Neither panel has a discoverability problem that NL search would meaningfully address.** Layers shows tens of features in one open plot; the analyst can already see them on the map and visually select. Tools is already partitioned into "applicable to current selection" vs "inactive with explanation"; that partition does most of the discoverability work. A per-panel NL filter bar would consume Activity Panel real estate without proportional value.

**The NL pipeline still has long-term value** — but as **agentic orchestration**, not as a filter bar. An analyst phrase like "show me submarine tracks where speed dropped below 5 kts during Saxon Warrior" should drive Debrief-Future to: resolve the time/exercise scope via STAC + CQL2 (#191's pipeline), load matching plots, narrow to matching features, identify the relevant tool from the MCP-exposed inventory, run it, and return annotated results. That capability — NL → tool selection + invocation, not NL → filter UI — is captured in a successor epic.

**Artefacts in this directory** (`spec.md`, `plan.md`, `evidence/opening-context.md`, `tasks.md`) are retained as a postmortem reference. They document the spec/codebase mismatch and the architectural design that would have been required.

---

*The original specification follows for historical reference.*

---

## Overview

The parent NL-search feature (#191) surfaces a natural-language filter bar in the Catalog Overview webview and proves out the full pipeline — `FilterBar` with an `llmClient` prop, `createPostMessageLLMClient` for host ↔ webview transport, seven failure banners, opt-in setting, credential isolation. This feature extends the same capability to two additional VS Code webview surfaces — the **Layers** panel and the **Tools** panel — by passing the same `llmClient` into the `FilterBar` instances those panels already render. No pipeline changes, no new transport, no new settings, no new failure classes. This is presentation-layer wiring, unlocked by #191's architecture.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyst filters visible layers by natural-language phrase (Priority: P1)

A maritime analyst with live NL mode enabled opens the Layers panel, types a phrase like "submarine tracks" into its existing filter bar, and presses Enter. The same Anthropic round-trip that powers the Catalog Overview resolves the phrase into filter chips that narrow the visible layer list. Removing a chip re-expands the list; the live-mode indicator is visible; the seven failure banners from #191 render identically when something goes wrong.

**Why this priority**: The Layers panel is the analyst's primary tool for controlling what they see on the map. Extending NL-mode here is the highest-value surface beyond Catalog Overview — it lets analysts reason in natural language about the tracks/points/shapes they're actively working with, not just the catalogue they're loading from.

**Independent Test**: Enable live NL mode (using the #191 setting), open the Layers panel in the VS Code extension, type "submarine tracks" in the filter bar, press Enter, and confirm that chips appear, the layer list narrows to matching entries, and removing a chip restores the prior state. Verifiable end-to-end against the same stub or live provider used by #191.

**Acceptance Scenarios**:

1. **Given** live NL mode is enabled and the Layers panel is open, **When** the analyst types a phrase into the Layers filter bar and submits, **Then** chips appear, the layer list narrows, and the live-mode indicator shows the provider + model — identical visual behaviour to the Catalog Overview.
2. **Given** live NL mode is disabled (default), **When** the analyst types the same phrase in the Layers panel, **Then** the existing literal-substring filter runs and no language-model call is made.
3. **Given** a chip is applied in the Layers panel, **When** the analyst removes it, **Then** the remaining chips stay applied and the list re-expands accordingly — identical to the #191 chip-removal behaviour.

---

### User Story 2 - Analyst filters available tools by natural-language phrase (Priority: P2)

An analyst opens the Tools panel, types a phrase like "tools that operate on tracks" into its existing filter bar, and presses Enter. The Tools panel's `FilterBar` resolves the phrase through the same `llmClient` and narrows the visible tool list. The indicator, banners, and chip behaviour are identical to the Catalog Overview and Layers experiences.

**Why this priority**: Tools discovery is secondary to layer management in analyst workflow. P2 because the value pattern ("narrow by natural language") is demonstrably useful in any surface with a `FilterBar`, and shipping this third surface alongside Layers proves the wiring generalises — but shipping Tools alone without Layers would underserve the core workflow.

**Independent Test**: With live NL mode enabled, open the Tools panel, type a phrase, press Enter, confirm chips appear and the tool list narrows. Confirmed end-to-end exactly as for the Layers panel.

**Acceptance Scenarios**:

1. **Given** live NL mode is enabled and the Tools panel is open, **When** the analyst types a phrase and submits, **Then** chips appear and the tool list narrows.
2. **Given** live NL mode is disabled, **When** the analyst types a phrase in the Tools panel, **Then** the existing literal-substring filter runs and no LLM call is made.

---

### User Story 3 - Failure and recovery behaviour is consistent across panels (Priority: P3)

Each of the seven failure banners defined by #191 (auth-failure, rate-limit, provider-error, timeout, malformed, not-configured, ceiling-reached) renders inside the Layers and Tools panels with the same copy, reason attribute, and recovery affordance as the Catalog Overview. Prior chips and filtered list state are preserved across failures in each panel independently.

**Why this priority**: P3 is about quality consistency. The failure UX was the most expensive part of #191 to design; inconsistency between panels would dilute user trust in the feature. Must-have for polish but not for proving the value pattern.

**Independent Test**: Force each of the seven failure classes via a stub provider, one at a time, from the Layers and Tools panels. Confirm each panel shows the same banner contents and `data-transport-reason` attribute as the Catalog Overview equivalent.

**Acceptance Scenarios**:

1. **Given** the provider returns a 401, **When** the analyst submits a phrase from the Layers panel, **Then** the auth-failure banner renders in the Layers panel with identical copy to the Catalog Overview.
2. **Given** each of the seven failure classes is triggered in turn from the Tools panel, **When** the banners render, **Then** every `data-transport-reason` value matches the #191 enumeration exactly.
3. **Given** a phrase already produced chips in the Layers panel and the next submission fails, **When** the banner appears, **Then** prior chips remain on screen and the filtered list is preserved (FR-006 of #191 inherited).

---

### Edge Cases

- **Multiple panels open simultaneously**: Analyst has Catalog Overview, Layers, and Tools all open and submits phrases concurrently. Each panel's submission runs independently; chips in one panel do not affect the others; failure in one does not bleed into the others. Supersession (Decision 11 of #191) applies per panel, not globally.
- **Cross-panel cancellation**: Submitting in the Layers panel while a Catalog Overview request is in flight MUST NOT cancel the Catalog Overview request. Each panel holds its own `AbortController` per submission.
- **Per-session call ceiling reached by one panel**: When the ceiling (from #191) is hit, every panel shows `ceiling-reached` for the remainder of the session — the ceiling is a session-wide budget, not per-panel.
- **Panel opened after NL-mode enabled**: Opening the Layers panel for the first time after enabling live NL mode MUST show the indicator without requiring a reload; first submission MUST route through the NL pipeline.
- **Panel opened before NL-mode enabled, then toggled on**: Toggling the setting on with a Layers panel already open MUST make the indicator appear on next render; first submission after toggle MUST route through NL.
- **Tools panel with no visible tools initially**: Empty filter bar submission in an already-empty Tools panel produces the same "no match" outcome as today; NL path does not attempt to fabricate results.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Layers panel's `FilterBar` MUST accept the same optional `llmClient` prop used by the Catalog Overview (per #191 Decision 12). When the prop is present, Enter-commits MUST route through the NL pipeline; when absent, behaviour MUST be identical to today.
- **FR-002**: The Tools panel's `FilterBar` MUST accept the same optional `llmClient` prop on the same terms as FR-001.
- **FR-003**: The extension host MUST supply a single shared `createPostMessageLLMClient` instance to both the Layers and Tools webviews; no new extension-host service or message variant is introduced.
- **FR-004**: The live-mode indicator, success state (chips), loading state, and each of the seven failure banners from #191 MUST render identically in the Layers and Tools panels — same copy, same `data-transport-reason` attribute values, same recovery affordances.
- **FR-005**: Prior filter chips and prior filtered list state MUST be preserved across failures in each panel, consistent with #191 FR-006 — including across panels (chips in Layers are not affected by failures in Tools).
- **FR-006**: The per-session call ceiling from #191 MUST be shared across panels — once any panel hits the ceiling, every panel's next submission surfaces `ceiling-reached` until the session is reset.
- **FR-007**: Each panel's `AbortController` lifecycle MUST be isolated — a new submission in one panel MUST NOT cancel in-flight submissions in other panels. Supersession within a single panel remains as #191 Decision 11.
- **FR-008**: Structured telemetry (per #191 FR-007) MUST record the originating panel (`catalog-overview | layers | tools`) alongside every outcome, so log review can distinguish per-panel usage and failure patterns.
- **FR-009**: The `debrief.nlSearch.enabled` setting MUST apply uniformly to all three surfaces — there is no per-panel enable/disable. A single toggle governs all three.
- **FR-010**: No new user-facing setting, command, or configuration key is introduced by this feature. All configuration continues to live under the `debrief.nlSearch.*` namespace established by #191.

### Key Entities

- **Panel origin**: A string identifier (`catalog-overview`, `layers`, `tools`) added to the structured telemetry record and, if useful for debugging, to the `nlGenerate` message payload. Enumerated and exhaustive — TypeScript compile-time coverage when new panels are added in future.
- **Shared `LLMClient` instance**: A single `createPostMessageLLMClient` created once in the extension-host webview setup and supplied via `llmClient` prop to every `FilterBar` in every panel. Eviction of this instance (e.g. on settings-toggle-off) removes NL mode from all panels simultaneously.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Let the analyst narrow the Layers or Tools panel by describing what they want, without leaving VS Code and without switching to the Catalog Overview.
- **Key Decision(s)**:
  1. Which panel the analyst is currently working in (they choose contextually — Layers when managing map rendering, Tools when picking an operation).
  2. Whether to keep, adjust, or clear the resulting chips — same decision as #191 but per panel.
- **Decision Inputs**:
  - Live-mode indicator visible in each panel's filter bar (tells the analyst a submission will hit the network).
  - Current chips + filtered count per panel (shows how well the phrase translated).
  - Failure banners per panel (same seven classes as #191).
  - Cross-panel state: chips in one panel don't affect another; but the session-wide ceiling does.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Layers panel open; live-mode indicator visible in Layers filter bar | Types "submarine tracks" and presses Enter | Layers filter bar shows pending state |
| 2 | Response arrives | (none — system acts) | Chips apply in Layers; Layers list narrows; Catalog Overview unaffected |
| 3 | Analyst switches to Tools panel (still in same session) | Types a Tools-relevant phrase | Tools filter bar shows pending; Layers chips preserved |
| 4 | Tools request fails with provider-error | (none — system acts) | Tools shows provider-error banner; Layers chips unaffected; Catalog Overview unaffected |
| 5 | Analyst toggles live NL mode off | (none — system acts) | Indicators disappear from all three panels simultaneously; subsequent submissions run literal-substring |

### UI States

- **Empty State (live mode off)**: All three panels behave exactly as today — no indicator, no NL routing. Identical to the pre-feature experience.
- **Empty State (live mode on, no chips)**: Each panel's filter bar shows the live-mode indicator; placeholder is panel-appropriate ("Try: submarine tracks" in Layers; "Try: tools that operate on tracks" in Tools).
- **Loading State**: Per panel — one panel can be pending while another is idle.
- **Error State**: Inline banner above the panel's list; preserves prior chips + results per panel; banner reason attribute matches #191 enumeration exactly.
- **Success State**: Chips appear; list narrows; indicator returns to idle. Per panel.
- **Ceiling-Reached State**: Affects all panels simultaneously — session-wide budget.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst with the feature enabled can go from opening the Layers panel to seeing a correctly-filtered list for a representative phrase in under 10 seconds (including LLM round-trip), matching the #191 performance bar for the Catalog Overview.
- **SC-002**: The same performance bar (SC-001) applies to the Tools panel.
- **SC-003**: A reviewer sampling all seven failure classes across all three panels (21 banner combinations) confirms each banner's `data-transport-reason` and body copy is byte-identical between panels.
- **SC-004**: Across a representative analyst session with NL submissions in all three panels, structured telemetry records the correct panel origin for every submission (sampled in a log review — 100% of records correctly attributed).
- **SC-005**: Toggling `debrief.nlSearch.enabled` off removes the indicator from all three panels within one render cycle — a reviewer can verify all three disappear in under 2 seconds after toggling.
- **SC-006**: An analyst can trigger submissions from all three panels near-simultaneously without cross-panel cancellation — verified in an E2E scenario where three submissions are issued within 100 ms of each other and all three complete with independent outcomes.
- **SC-007**: No regressions in the Catalog Overview NL experience delivered by #191 — the #191 E2E suite remains fully green.

## Assumptions

- #191 is shipped or shipping in the same release train; its `createPostMessageLLMClient`, `LLMClient` contract, `LiveOutcome` union, seven failure banners, indicator component, and telemetry plumbing exist and are imported directly from `@debrief/components` and `apps/vscode/src/services/llmProxy.ts`. Nothing in this spec re-implements them.
- Both the Layers and Tools panels already render a `FilterBar` with `llmClient` set to `undefined` by default. The work is solely to (a) construct and (b) supply the shared client to those `FilterBar` instances; the panels' own state management does not change.
- The extension host's `llmProxy` service (from #191 Decision 13) is lazy-initialised on first `nlGenerate` regardless of which panel originates the message — no panel-aware initialisation is needed.
- Adding a `panelOrigin` field to the existing `nlGenerate` message variant (per #191's typed union) is additive and does not require a version bump of the message protocol.
- The Catalog Overview's panel origin defaults to `catalog-overview` — #191 did not need the field but retroactively gains it for consistency. This is a one-line edit that the #191 author can accept as part of merging this feature; no API break.
- This spec does NOT introduce non-Anthropic providers (#196), audit-trail logging (#197), or keyring-unavailable banner split (#198). Cross-references only.
