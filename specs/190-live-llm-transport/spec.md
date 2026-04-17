# Feature Specification: Live LLM Transport

**Feature Branch**: `190-live-llm-transport`
**Created**: 2026-04-16
**Status**: Draft
**Input**: User description: "[E10] Live LLM transport — second implementation of #188's `LLMClient` interface backed by a real provider; auth, endpoint config, MCP/proxy/direct decision; drops in as a config toggle to expand #189 beyond the fixture corpus (requires #188, #189)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stakeholder asks an off-corpus phrase and sees a live-generated filtered result (Priority: P1)

A stakeholder is running the #189 demo with the live transport enabled. They type a phrase that is not in the hand-authored corpus — for example "South Korean destroyers" or "anything in the Atlantic in 2005" — and press Enter. Rather than the off-corpus banner from #189, the system forwards the phrase to a real language model, interprets the structured response back into a CQL2 filter + chip set, and filters the card grid. The stakeholder sees chips and cards that correctly reflect their intent without any code change between queries.

**Why this priority**: This is the raison d'être of the whole item. Expanding #189 beyond the fixture corpus to open-ended analyst queries is the only reason live transport exists. If this flow doesn't work, the feature has failed.

**Independent Test**: Run the #189 demo with live transport configured. Type each of 5 phrases explicitly chosen to be outside the fixture corpus (e.g. "South Korean destroyers", "Russian subs after 2010", "Exercise Trident Juncture ships", "tankers with comms tag", "Virginia-class submarines"). For each phrase, verify: (a) a live-LLM call is made (observable via browser devtools network panel or an equivalent log), (b) chips appear that reflect the recognised dimensions, (c) the card grid updates to show a filtered result set consistent with the chips. No off-corpus banner appears.

**Acceptance Scenarios**:

1. **Given** the demo is configured to use live transport and the stakeholder has provisioned credentials, **When** the stakeholder submits a phrase not in the fixture corpus, **Then** the system calls the configured live provider, returns a valid CQL2 + chip set, and the card grid updates — matching the behaviour pattern of corpus phrases rather than showing the off-corpus banner.
2. **Given** the demo is configured to use live transport, **When** the stakeholder submits a phrase that IS in the fixture corpus, **Then** the live provider is still called (the transport does not silently fall back to the fixture) and the returned CQL2 filters the catalog correctly. Corpus and live-off-corpus phrases are indistinguishable in the UI once results render.
3. **Given** the demo has the live transport disabled (default configuration), **When** the stakeholder submits any phrase, **Then** behaviour is identical to the #189 baseline — corpus hits filter normally, off-corpus phrases show the banner — and no live-provider network call is ever made.

---

### User Story 2 - Operator configures credentials and endpoint without rebuilding the demo (Priority: P2)

An operator (a developer preparing a demo session, or a stakeholder running it themselves from their laptop) wants to switch the demo from fixture-only mode to live mode. They follow documented steps to supply a provider credential and endpoint reference to the running demo — without editing source, rebuilding, or redeploying static assets. After supplying the configuration, reloading the page activates the live transport; removing the configuration reverts to fixture-only mode.

**Why this priority**: Without a configuration path, live transport is undemonstrable outside the authoring developer's machine. This story makes the capability portable and keeps credentials out of the static bundle. Second priority because it is supporting infrastructure for User Story 1, not the core generative behaviour.

**Independent Test**: Starting from a freshly served copy of the #189 static bundle with no live configuration, verify the demo runs in fixture-only mode. Then, without touching the bundle's source files, supply a credential + endpoint via the documented mechanism. Reload the page. Verify the live transport is now active (submit an off-corpus phrase and confirm a live-provider call is made). Remove the configuration; reload; verify fixture-only mode is restored.

**Acceptance Scenarios**:

1. **Given** a freshly served demo bundle and no configuration supplied, **When** the page loads, **Then** the demo runs in fixture-only mode and no live-provider call is attempted under any interaction.
2. **Given** a running demo, **When** the operator supplies credential + endpoint + model name via the documented mechanism and reloads, **Then** the live transport activates and subsequent off-corpus phrase submissions call the configured provider.
3. **Given** the demo is running in live mode, **When** the operator revokes the credential (removes it from the configuration source), **Then** on next reload the demo returns to fixture-only mode and displays no stale state from the live session.
4. **Given** live configuration is supplied but is incomplete or malformed (missing endpoint, empty credential, unparseable model name), **When** the page loads, **Then** the demo refuses to activate live mode, displays a clear diagnostic indicating what is missing, and falls back to fixture-only mode rather than crashing.

---

### User Story 3 - Live call fails gracefully without breaking the demo (Priority: P3)

During a live demo, the provider returns an error — authentication rejected, rate limit exceeded, timeout, malformed response, or network unreachable. The stakeholder sees a clear, non-alarming message explaining the problem, retains the option to try a different phrase, and can recover to the fixture corpus path without reloading. No uncaught exceptions, no infinite spinners, no silently-empty result grids.

**Why this priority**: Live services fail. A demo that hangs or explodes on the first auth typo or rate-limit is worse than one that stays on fixtures. This story makes live mode safe to enable in front of stakeholders. Third priority because User Stories 1 and 2 deliver the value; this protects it.

**Independent Test**: For each failure mode — invalid credential, network error, timeout, malformed model response, rate-limit response — deliberately inject the condition (via a test stub of the live transport) and submit a phrase. Verify the demo displays a distinct, user-readable diagnostic per failure class; the query bar remains usable; no `console.error`, no uncaught promise rejection; the stakeholder can submit a subsequent phrase without reloading the page.

**Acceptance Scenarios**:

1. **Given** live mode is active with an invalid credential, **When** the stakeholder submits a phrase, **Then** the UI shows a "provider rejected the request (check credentials)" message, the query bar remains enabled, and no uncaught error appears in the browser console.
2. **Given** live mode is active and the provider's response does not parse as the expected structured format, **When** a phrase is submitted, **Then** the UI shows a "could not understand the provider's response" message distinct from the credential failure, and offers a retry affordance or the option to try a different phrase.
3. **Given** live mode is active and the provider times out (response exceeds the configured timeout), **When** the timeout is reached, **Then** the UI cancels the request, shows a "the provider did not respond in time" message, and the stakeholder can immediately submit a new phrase.
4. **Given** a sequence of 3 live failures in quick succession against the same phrase, **When** the stakeholder gives up and types a phrase that IS in the fixture corpus, **Then** the corpus phrase still resolves normally via the fixture transport path (live failures do not poison fixture behaviour).

---

### Edge Cases

- **Corpus phrase under live mode**: Live transport is called for every non-empty phrase when active (see User Story 1 AC2). If cost or latency becomes a demo concern, a future enhancement could short-circuit known corpus phrases — explicitly out of scope here.
- **Empty / whitespace phrase**: The #188 generator already short-circuits empty phrases before calling any transport; the live transport is never invoked. No change in behaviour from #189.
- **Prompt-hash mismatch**: The recorded-response client verifies prompt hashes; the live client MUST NOT apply the same check because its responses are generated fresh per call and have no recorded hash to compare against.
- **Provider returns valid JSON but with a hallucinated catalog field**: This is the same failure class #188 already handles via `GenerationError` reason `hallucinated-field`; the live transport simply feeds the raw response through the existing validator.
- **Credential exposure risk**: If the operator accidentally publishes their configuration (e.g. commits a dotfile, pastes a URL containing their key), the demo MUST have made it structurally hard — credentials MUST NOT be fetched from sources where static-bundle mirroring (CDNs, public caches) would capture them.
- **Demo hosted behind a corporate proxy that blocks outbound calls to the provider**: Live mode surfaces a network-error diagnostic; fixture mode remains available.
- **Provider response exceeds a sensible size bound** (runaway model): The transport caps the response size and surfaces a distinct diagnostic rather than blocking the UI while the browser processes megabytes of text.
- **Multiple in-flight live calls**: If the stakeholder submits a phrase while a previous live call is still pending, the newer call supersedes the older one and stale responses are discarded (no out-of-order chip updates).
- **Usage cap reached**: The transport optionally enforces a simple per-session call count ceiling to prevent a single demo from burning an unbounded number of credits. When the ceiling is hit, subsequent submissions surface a "usage cap reached, reload to reset" message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a second implementation of #188's `LLMClient` contract — `generate(prompt) → Promise<string>` — that forwards prompts to a real language model provider and returns the provider's raw response verbatim for #188's existing validator to parse.
- **FR-002**: The live client MUST satisfy the same contract as the recorded-response client such that #188's `generateCql2`, the harness, and #189's demo can consume either implementation interchangeably with no changes to call sites beyond transport selection.
- **FR-003**: The #189 demo MUST expose a runtime configuration mechanism to select between the fixture transport (default) and the live transport. The default MUST remain fixture-only — a freshly-served demo with no configuration MUST NOT attempt any live-provider call.
- **FR-004**: The live transport MUST accept its provider credential, endpoint, and model identifier from a runtime configuration source that is external to the static bundle. Credentials MUST NOT be embedded in the deployed HTML, JS, JSON, or CSS artefacts of the demo.
- **FR-005**: The live transport MUST refuse to activate when its required configuration (credential, endpoint, model identifier) is absent or malformed. In this state the demo MUST display a clear diagnostic and fall back to fixture-only mode.
- **FR-006**: When the live transport is active, every non-empty phrase submitted through the demo MUST be routed through the live transport (not the fixture transport), so that the operator can visibly demonstrate the open-ended capability. (The fixture transport remains available as the fallback path when live mode is disabled or misconfigured.)
- **FR-007**: The live transport MUST enforce a configurable per-request timeout. Requests exceeding the timeout MUST be cancelled and surfaced as a timeout-class error distinct from authentication and parsing failures.
- **FR-008**: The live transport MUST map provider-side failures into a dedicated `LiveTransportError` shape — distinct from #188's `GenerationError` (which remains responsible for LLM-output-semantics failures) — with reason identifiers that distinguish, at minimum: authentication/authorization failure, rate-limit / quota failure, network/transport failure, timeout, oversize-response, provider-returned-error, and usage-cap-reached. The transport surfaces `LiveTransportError` via `GenerationResult.error` (discriminated by `kind: "transport"`) — it is never thrown, preserving #188's "`generateCql2` never throws on normal failure paths" invariant. The demo UI MUST display a message chosen from these classes rather than a raw stack trace or HTTP status code. Response-parsing failures (malformed JSON, schema-violation, hallucinated-field) continue to flow through #188's existing `GenerationError` path.
- **FR-009**: The live transport MUST NOT verify prompt hashes against any stored fixture — this check is specific to the recorded-response client and would fail every call against a real model.
- **FR-010**: The live transport MUST enforce a per-session cap on live-provider calls (configurable, with a sensible default such as 50) to prevent runaway usage during a demo. When the cap is reached, subsequent submissions MUST show a "usage cap reached" diagnostic and MUST NOT call the provider again until the page is reloaded.
- **FR-011**: The live transport MUST cap the size of the response it will accept from the provider. Responses exceeding the cap MUST be rejected and surfaced as a distinct error class so the UI does not stall on a runaway model.
- **FR-012**: When multiple live calls are in flight (stakeholder submits a second phrase while a first is still pending), the transport MUST ensure that only the most recent call's result reaches the UI. Earlier, superseded responses MUST be discarded so the chip set and card grid do not update out of order.
- **FR-013**: The live transport MUST document a single, explicit choice of transport style (direct-from-browser provider call, local proxy, or MCP tool) and ship exactly one implementation of that style. The chosen style MUST be consistent with the credential-isolation requirement in FR-004.
- **FR-014**: The live transport MUST emit (at minimum to the browser console, ideally to a structured log channel) a per-call record containing: provider name, model identifier, request start time, elapsed duration, success/failure class, and response size. Secrets MUST NOT appear in this record.
- **FR-015**: The test suite MUST include a deterministic harness for the live client — a stubbed provider whose responses can be scripted for success, auth failure, timeout, malformed response, rate-limit, and oversize response — so that User Story 3 acceptance scenarios can run in CI without any network or credentials.
- **FR-016**: The test suite MUST include an end-to-end smoke test verifying that when the live transport is selected, #188's `generateCql2` calls the live client rather than the fixture client for a representative off-corpus phrase, and that the end-to-end result shape matches what the demo expects.
- **FR-017**: Documentation MUST explain how an operator supplies configuration (credential, endpoint, model), how they verify that live mode is active, and how they revert to fixture-only mode. The instructions MUST be accurate against the shipped artefacts.
- **FR-018**: When live mode is active, the demo MUST display a small, non-intrusive transport-mode indicator near the page header so the operator can visually confirm live mode is engaged (supports SC-004's "confirm live-mode activation" in under 5 minutes). When live mode is inactive — whether by default configuration, deliberate revocation, malformed config (FR-005), or failed proxy health check — the indicator MUST NOT display, or MUST display a clearly-different "fixture mode" state, so the operator cannot mistake one mode for the other.

### Key Entities *(include if feature involves data)*

- **Live LLM Client**: The second implementation of #188's `LLMClient` interface. Holds a reference to its provider configuration and an outbound-request capability. Produces raw response strings that #188's existing validator parses.
- **Provider Configuration**: The runtime-supplied record describing where and how to call the provider: endpoint URL, credential handle, model identifier, timeout, per-session call cap, max response size. Sourced from outside the static bundle.
- **Credential Handle**: An opaque reference to the operator's provider secret. Stored only in the configuration source and injected into outbound requests at call time; never logged, never echoed to the UI, never mirrored to static artefacts.
- **Transport Style**: The single chosen mechanism by which the browser-side demo reaches the provider — direct browser-to-provider call, a local proxy that the demo delegates to, or an MCP tool. Exactly one style is implemented; the choice is documented.
- **Call Record**: Per-call observability entry: provider name, model, start time, elapsed duration, outcome class, response size. Consumed by developers debugging demo behaviour; not shown to stakeholders.
- **Transport Mode Selector**: The runtime flag that chooses fixture vs live at demo load time. Defaults to fixture. Reset by page reload.
- **Usage Counter**: Per-session counter of live calls made. Consulted before each live call; blocks further calls when the configured cap is reached.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 5 off-corpus analyst phrases (chosen to exercise nationality, vessel type, date, exercise, and tag dimensions outside the fixture corpus) produce CQL2 + chip sets via the live transport that correctly filter the sample catalog when inspected by a reviewer — with no code change between phrases.
- **SC-002**: All 9 prototype corpus phrases still produce their expected match counts when the live transport is active — demonstrating that switching transports does not regress known-good behaviour.
- **SC-003**: A freshly-served demo bundle with no operator configuration makes zero outbound calls to any live-provider endpoint, verifiable via browser devtools network inspection, across any sequence of stakeholder interactions.
- **SC-004**: A cold-start operator following the written documentation can switch a demo into live mode and confirm live-mode activation in under 5 minutes, without editing source files or rebuilding the bundle.
- **SC-005**: Each of the 7 failure classes called out in FR-008 (auth-failure, rate-limit, transport-error, timeout, oversize-response, provider-error, usage-cap-reached) plus the separately-handled malformed-response class (from #188's `GenerationError` path) surfaces a distinct, user-readable message in the demo UI — verifiable by injecting each condition via the test stub.
- **SC-006**: No credential value appears in any file inside the deployed demo bundle, verifiable by a CI `gitleaks` step that scans `dist/`, `apps/nl-demo/dist/`, and the committed worktree against provider-key patterns (`sk-ant-*`, `ANTHROPIC_API_KEY=.+`) with a `gitleaks.toml` allowlist limited to `.env.example` placeholders.
- **SC-007**: End-to-end latency for a typical live phrase (credential valid, provider responsive) is under 10 seconds at the 95th percentile during demo conditions; longer responses trigger the timeout path cleanly.
- **SC-008**: The per-session usage cap correctly blocks a 51st live call in a row (given the default cap of 50) with a clear diagnostic, verifiable in the stub-backed test suite.
- **SC-009**: `task verify` passes on the feature branch, including the deterministic live-client stub harness and an end-to-end smoke test that exercises the transport-selection path.

## Assumptions

- #188 is merged and exposes the `LLMClient` interface, the `generateCql2` entry point, and the `GenerationError` shape as stable contracts. This item adds a second implementation behind that contract and does not alter the contract itself.
- #189 is merged and its demo integration point for selecting a transport is either already present or trivially extensible to add the fixture-vs-live selector described in FR-003. The demo UI changes required here are limited to the transport-selection hook, transport-failure messaging in the existing banner/empty-state, and the call-record console logging.
- Stakeholder demos continue to run as static-hosted bundles (per #189's constraints). This item adds an optional runtime-configurable live path; it does not introduce a backend requirement for fixture-only operation.
- The specific choice of transport style — direct browser call, local proxy, or MCP tool — is made during `/speckit.plan`. The functional requirements above constrain the choice (no credentials in the static bundle; supports all failure classes; verifiable without credentials in CI) but do not pre-select.
- The specific live provider (Claude, OpenAI, local model, etc.) is a planning-time decision. The spec's functional requirements treat the provider as an abstract endpoint identified by configuration; multi-provider support is not required at this item's scope.
- Live-mode configuration follows a "bring-your-own-key" model by default: the operator supplies their own provider credential. Shared demo credentials provisioned centrally are out of scope. This keeps infrastructure and provisioning concerns out of the item.
- The hand-authored fixture corpus from #188 remains the CI baseline. The live transport's own tests run against a deterministic stub — CI never makes a real provider call, so CI has no dependency on credentials, network, or provider availability.
- Streaming responses, prompt caching, multi-turn conversation, and cost/usage dashboards are out of scope. Live mode is a single-shot request per phrase.
- Internationalisation, localisation, and non-English phrases inherit #188's "English-only" scope — not changed here.

## Out of Scope

- Modifying #188's `LLMClient` contract, `generateCql2` signature, or `GenerationError` shape.
- Adding new corpus entries, new prompt templates, or new enum extraction — #187 and #188 own those.
- Multi-provider runtime switching (between, say, Claude and OpenAI inside a single session). Planning picks one provider; multi-provider abstraction is deferred.
- Centrally-provisioned shared credentials, credential rotation, credential vault integration.
- Streaming responses, prompt caching, response de-duplication across sessions, conversation memory.
- A cost or usage dashboard beyond the per-session counter enforced by FR-010.
- Persisting live-call results into the fixture corpus as a "record-live-to-fixture" workflow (interesting, but separate work).
- Changes to #189's card grid, chip bar, or results count beyond the diagnostic messaging added for failure handling.
- Production-grade rate limiting or abuse protection beyond the per-session cap.
- Classified-data redaction, legal review of provider terms, export-control review — out of scope at the demo level.

## Dependencies

- **#188** — NL → CQL2 prompt design + generation. Provides the `LLMClient` contract and `generateCql2` entry point this item plugs into.
- **#189** — Stakeholder demo UI. Provides the consumer that selects the transport and renders results; this item adds the alternate transport that the demo can switch to.
- **#187** — Build-time enum extraction. Already consumed by #188; no new dependency here.
- **#185** — CQL2 `array_filter` evaluator. Already consumed by #189; no new dependency here.
