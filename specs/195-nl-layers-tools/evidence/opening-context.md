<!--
Cached opener for the feature post. Written during `/speckit.plan`, read
by `/speckit.pr` to assemble the top of `media/shipped-post.md`.
-->

## Hook

- Type "submarine tracks" into the Layers panel and the feature list narrows to matching layers
- Type "tools that operate on tracks" into the Tools panel and the tool list narrows to what applies
- The same live-mode indicator, failure banners, and session-wide ceiling from #191 carry over unchanged
- Aborting a search in Layers no longer cancels an in-flight search in Tools — each panel has its own scope
- All three NL surfaces (Catalog Overview, Layers, Tools) toggle off together via `debrief.nlSearch.enabled`

## What We're Building

The natural-language search we shipped in #191 — type a phrase, get a filtered view — now lives in two more places an analyst spends time: the Layers sub-section and the Tools sub-section of the Activity Panel inside the VS Code extension. The Layers search narrows the visible feature list using the open plot's own taxonomy (feature types, tags, platform attributes). The Tools search narrows the available tool list using the calc inventory (tool names, categories, applicable feature types). A reader can ask the panels questions in their own words instead of constructing chip predicates by hand.

Everything that made #191 trustworthy comes along with it: the seven failure classes, the live-mode indicator, the failure banners, and the session-wide call ceiling. The opt-in setting governs all three surfaces uniformly, so an operator who has the capability switched off sees no NL affordances anywhere, and an operator who has it on gets the same experience consistently.

## How It Fits

This is the second beat of the NL search story — #191 proved the pipeline in the Catalog Overview, and #195 demonstrates that the pipeline is portable. The bigger architectural move is the new shared `NlSearchBar` component that lives alongside `FilterBar` in `shared/components/`: it owns the QuickSearch input, the live-mode indicator, the transport banner, and the chip strip, and is generic over the chip-seed type. The Activity Panel webview now hosts two `LLMClient` instances (one per panel-context), each scoped through a `panelOrigin` literal that threads through the post-message protocol, the live-proxy's abort-controller map, and the structured telemetry record.

## Key Decisions

- **Extract `NlSearchBar` from `FilterBar`.** The original plan assumed the panels already rendered a `FilterBar` and the work was "thread `llmClient` through". When the implementation started, that turned out to be false — the Layers and Tools panels had no search input at all, and `FilterBar` was structurally tied to the Catalog's CQL2 chip vocabulary. We re-planned: pull the panel-agnostic pieces out of `FilterBar` into a new shared component, and let each panel supply its own `chipsToPredicate` adapter and `nlEnums` bundle. Complexity moved from Medium to High, but every panel now consumes the same UI primitive, and a future fourth surface costs less than this one did.

- **Two `LLMClient` instances inside the Activity Panel webview, not one.** A single client would have shared an abort scope between Layers and Tools — calling `client.abort()` after a slow Layers search would cancel any in-flight Tools search too. Instantiating two clients keeps the abort scopes isolated, at the cost of the panels not being able to share a request queue. Given the session-wide ceiling, the queue-sharing argument is weak, so isolated abort scopes won.

- **`panelOrigin` threaded through every layer, not inferred at the proxy.** The proxy could in principle have inferred which panel a request came from based on which webview opened the connection. We passed `panelOrigin: "catalog-overview" | "layers" | "tools"` explicitly through the message protocol instead, and used it as part of the proxy's composite abort key (`${panelOrigin}:${requestId}`). Explicit beats inferred when the value also has to appear in telemetry — and it gave us a single grep target when wiring up the third surface.

- **Ceiling stays session-scoped, not panel-scoped.** Each panel-context could have had its own budget, but the call ceiling exists to bound the operator's exposure to a paid API across a session, not to ration attention between panels. Once any panel-context exhausts the budget, every panel-context shows `ceiling-reached`. Simpler to reason about and matches the intent of the ceiling.
