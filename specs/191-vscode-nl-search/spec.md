# Feature Specification: NL Search in VS Code Catalog Overview

**Feature Branch**: `191-vscode-nl-search`
**Created**: 2026-04-17
**Status**: Draft
**Input**: User description: "how to surface the capability in the vs-code preview"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyst runs natural-language search inside the Catalog Overview (Priority: P1)

A maritime analyst opens the Catalog Overview in VS Code, sees the familiar filter bar at the top, and types a plain-English phrase ("UK submarines", "French frigates on ASW operations"). The phrase is interpreted by the configured language model and turned into filter chips that narrow the visible plot list and map — the same experience the standalone browser demo provides today, now reachable without leaving the editor.

**Why this priority**: This is the headline value of the feature — analysts keep their working context (code, STAC catalogue, tools) in VS Code, and expecting them to flip to a separate browser demo breaks the flow. Without P1 there is no feature; P2 and P3 only refine how it behaves when something is wrong.

**Independent Test**: With the live language-model transport configured, open the Catalog Overview panel, type a supported phrase, press Enter, and confirm that chips appear and the plot list + map are filtered. Verifiable end-to-end against a real provider or a stubbed one.

**Acceptance Scenarios**:

1. **Given** the live LLM transport is enabled and configured, **When** the analyst types "UK submarines" into the Catalog Overview filter bar and submits, **Then** matching filter chips appear and the plot list narrows to UK-flagged submarine plots.
2. **Given** the live LLM transport is disabled (default), **When** the analyst types the same phrase, **Then** the existing literal-substring title search runs and no language-model calls are made.
3. **Given** a phrase is already showing filter chips, **When** the analyst removes a chip, **Then** the list re-expands exactly as it does in the standalone demo.

---

### User Story 2 - Opt-in configuration with credentials isolated from the webview (Priority: P2)

An analyst (or their organisation) decides whether to enable the live language-model path at all. When enabled, the analyst provides an API key once, via a settings surface that never exposes the key to the webview, to logs, or to any colleague browsing the workspace. Turning it off returns the filter bar to plain literal-substring search.

**Why this priority**: The feature has to be shippable in contexts where network calls to an LLM provider are unacceptable (air-gapped work, confidential customer deployments, cost control). An opt-in toggle + credential-isolation story is the prerequisite for enabling the feature at all for many users.

**Independent Test**: Toggle the setting off with a key present, reload the Catalog Overview, confirm no outbound LLM calls are made on any phrase. Toggle it on with a valid key, confirm live calls happen. Inspect the webview's DevTools / network traffic and confirm the key is never present in any webview-visible artefact.

**Acceptance Scenarios**:

1. **Given** live LLM mode is disabled, **When** the Catalog Overview is opened and phrases submitted, **Then** no LLM-provider calls are made from the extension host or webview.
2. **Given** live LLM mode is enabled with a valid key, **When** the analyst inspects the webview's DevTools network tab during a query, **Then** only calls to the extension host (not a third-party provider) are visible, and the API key does not appear in any request visible to the webview.
3. **Given** the analyst deletes their key in settings, **When** they submit a phrase, **Then** the live path is skipped and the fallback path (or a clear "not configured" banner) is used instead of a silent failure.

---

### User Story 3 - Graceful failure when the model, network, or credentials fail (Priority: P3)

When the language model is unreachable, slow, returns malformed content, rejects the credential, or rate-limits the request, the analyst sees a clearly labelled banner that distinguishes these failure classes and offers a retry / rephrase affordance. The plot list remains usable (filters from prior successful calls stay applied) so the analyst is never left with an empty or broken panel.

**Why this priority**: Analysts should never have to read JavaScript errors in a DevTools panel. This story is the difference between "nice when it works" and "trusted tool". It is P3 because the earlier stories must exist first, but it defines the quality bar.

**Independent Test**: Inject each failure class (auth, rate-limit, provider-error, timeout, malformed response) and verify a distinct, human-readable banner appears in the Catalog Overview with an appropriate recovery affordance, while any prior chips and filtered list remain on screen.

**Acceptance Scenarios**:

1. **Given** the provider is returning 401 auth errors, **When** a phrase is submitted, **Then** a banner names the credential problem and directs the user to settings.
2. **Given** a phrase produces a 429 rate-limit response, **When** the user sees the banner, **Then** it tells them to retry shortly (without burning further credit on auto-retry).
3. **Given** the provider responds with JSON that fails schema validation, **When** the banner appears, **Then** it invites the user to rephrase, and the previously applied filter state is preserved.

---

### Edge Cases

- Webview reloads mid-request (e.g. editor restart) — the in-flight call should be abandoned cleanly, not block the next submission.
- Analyst edits the settings while a request is in flight — the in-flight call finishes under the old config; the next call uses the new config.
- Multiple Catalog Overview panels open against the same workspace — each panel runs independent requests; results do not bleed across panels.
- Very long phrase (>prompt length budget) — the submission is rejected with a clear message before any call is made.
- The free / quick-search literal-substring path is still available with the live transport enabled (analyst can opt out per-phrase by not treating input as NL).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Catalog Overview filter bar MUST accept natural-language phrases and, when live mode is enabled, translate them into filter chips plus a filter expression using the same NL → filter pipeline proven in the browser demo.
- **FR-002**: The extension MUST hold any provider credential outside the webview. The webview MUST NOT be able to read, log, or transmit the credential, and credentials MUST NOT appear in webview-visible network traffic.
- **FR-003**: The feature MUST be opt-in. A single user-facing setting MUST enable or disable the live path. With the setting off, the filter bar MUST behave exactly as it does today (literal-substring title search).
- **FR-004**: Users MUST be able to configure at minimum: whether the feature is enabled, the provider credential, and a model identifier. Defaults MUST be safe (feature off, no key).
- **FR-005**: The system MUST distinguish and surface at least these failure classes with user-legible banners: authentication failure, rate limit, provider error, request timeout, malformed response, transport/connectivity failure.
- **FR-006**: On failure, existing filter chips and filtered list state MUST be preserved; the analyst MUST NOT lose prior context.
- **FR-007**: Each submission MUST emit a structured record (timestamp, duration, outcome, response size, model identifier) without capturing prompt content or response content.
- **FR-008**: The feature MUST respect any per-session call ceiling that protects users from unexpected provider spend; reaching the ceiling MUST show a clear banner, not a silent stall.
- **FR-009**: Removing a chip, clearing all chips, and adding manual chips MUST continue to work exactly as they do today — the NL path is additive, not a replacement.
- **FR-010**: The Catalog Overview MUST render an indicator when live mode is active, naming the provider and model, so the analyst knows a network call will happen on submission.

### Key Entities *(include if feature involves data)*

- **Live NL Config**: The user's configuration for whether the live path is enabled, which model to target, a per-session call ceiling, and a timeout. Includes the location where the credential is stored (outside the webview, outside any shared workspace artefact).
- **NL Submission**: A single request/response pair triggered by pressing Enter — its lifecycle (pending, succeeded, failed-with-class) drives the filter bar's state.
- **Failure Banner**: A user-facing message keyed off one of the declared failure classes, with a recovery affordance (Retry, Rephrase, Open Settings).

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Let an analyst narrow a STAC plot catalogue by describing what they want in plain English, without leaving VS Code.
- **Key Decision(s)**:
  1. Whether to enable the live language-model path at all (privacy, cost, connectivity).
  2. What phrase to type (and whether to rephrase after a zero-match or failure).
  3. Whether to keep, adjust, or clear the resulting filter chips.
- **Decision Inputs**:
  - Indicator in the filter bar that live mode is active (or absent — so the user knows whether a submission will hit the network).
  - The current filter chips and plot count (tells the user how well their phrase translated).
  - Failure banners (tell the user why nothing happened and how to recover).
  - Settings surface (tells the user the current model, key presence, call ceiling).

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Catalog Overview open; live-mode indicator visible in filter bar | Types "UK submarines" and presses Enter | Filter bar shows a pending/loading state; indicator shows a call in flight |
| 2 | Live response arrives | (none — system acts) | Chips appear for nationality + vessel-class; plot list narrows; map filters to matching items |
| 3 | Chips visible, list filtered | Removes one chip | List re-expands; remaining chip(s) still applied |
| 4 | New phrase attempted, provider fails | Sees failure banner | Prior chips + filtered list remain; banner names the failure class and offers Retry / Open Settings |
| 5 | Opens settings | Toggles live mode off | Indicator disappears; next submission uses literal-substring search; no outbound calls |

### UI States

- **Empty State (live mode off)**: Filter bar behaves exactly as today — no indicator, no banner. Identical to the pre-feature experience.
- **Empty State (live mode on, no chips)**: Filter bar shows the live-mode indicator (provider + model); placeholder guides the user ("Try: UK submarines").
- **Loading State**: Submit button enters a busy state; indicator shows request in flight; filter bar remains interactive for corrections.
- **Error State**: Inline banner above the plot list names the failure class, preserves prior chips/results, and offers Retry (same phrase), Rephrase (focus input), or Open Settings.
- **Success State**: Chips appear; plot count updates; indicator returns to idle; no banner.
- **Ceiling-Reached State**: Banner explains that the per-session call ceiling has been hit and offers to reset on reload or raise the ceiling in settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst with the feature enabled can go from opening the Catalog Overview to seeing a correctly-filtered list for a representative phrase in under 10 seconds (including LLM round-trip) on a typical broadband connection.
- **SC-002**: With the feature disabled, opening and using the Catalog Overview shows zero outgoing requests to any language-model provider across an entire analyst session, verified by network inspection.
- **SC-003**: Inspection of the webview's DevTools, any exported logs, and any workspace-visible file after a live query shows zero occurrences of the provider credential or raw prompt/response bodies.
- **SC-004**: Each of the declared failure classes (auth, rate-limit, provider-error, timeout, malformed, transport) surfaces a distinct banner in an end-to-end exercise against a stubbed provider — confirmed by a reviewer sampling all six.
- **SC-005**: After a failure, prior filter chips and the filtered plot count remain on screen in 100% of sampled failure scenarios.
- **SC-006**: Enabling, disabling, and re-enabling the feature requires no more than one click per transition from the settings surface — a reviewer can complete all three transitions in under 30 seconds.
- **SC-007**: A representative set of at least 10 everyday analyst phrases ("UK submarines", "French frigates on ASW operations", etc.) produces chips that narrow the list to a non-empty result in at least 70% of cases when the underlying corpus contains matching data.

## Assumptions

- The underlying NL → filter-expression pipeline (prompt template, schema validation, filter engine, chip representation) is reused from the existing shared component library; this feature is the presentation + wiring layer inside VS Code, not a rewrite of the NL grammar.
- The language-model transport continues to run outside the webview process (credential isolation), with the webview communicating through the extension host rather than calling a provider directly — this is the shape proven by the browser demo.
- The Catalog Overview webview is the single initial surface for this capability. Other panels (Layers, Tools, etc.) are out of scope for v1 and can reuse the same wiring if demand appears.
- Configuration lives in VS Code user settings (and/or secrets storage for the credential), not in workspace settings, because a shared workspace file cannot safely carry per-user credentials.
- Provider choice is Claude-family (matching the existing live transport work); adding other providers is a follow-up, not a gate on this feature.
- The literal-substring title QuickSearch path (current behaviour) remains the fallback and the default for any user who has not explicitly opted in — no silent network calls on day one.
