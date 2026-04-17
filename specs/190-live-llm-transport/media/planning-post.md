---
layout: future-post
title: "Planning: Live LLM Transport"
date: 2026-04-16
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, nl-cql2, llm, epic-e10]
excerpt: "A second LLMClient implementation wired to a real model, behind a local proxy that keeps the key out of the browser."
---

## What We're Building

Feature #190 adds a live language-model transport to the natural-language catalog-discovery demo. It's a second implementation of the `LLMClient` contract introduced in #188 — same shape, same output validation, but backed by a real provider instead of hand-authored fixtures. Analysts can then type open-ended questions ("show me sonar tracks near the Shetlands from last March") and get a CQL2 filter back, rather than being limited to whichever phrasings we happened to bake into the fixture corpus.

This is the final phase of Epic E10. The earlier phases laid the groundwork: platform registry (#180), schema updates (#181), import and save-time resolution (#182, #183), the regenerated sample catalog (#184), the CQL2 `array_filter` evaluator (#185), filter-chip UI (#186), build-time enum extraction (#187), the NL→CQL2 prompt plus fixture corpus (#188), and the demo UI itself (#189). With #190 landed, the demo has both a deterministic path for CI and a live path for stakeholder sessions.

Crucially, fixture-only remains the default. Live transport is opt-in, configured by the operator, and degrades gracefully back to fixtures whenever it can't run.

## How It Fits

The transport slots into the existing architecture without adding a workspace package or a new build step. The client sits alongside `fixtureClient.ts` in `shared/components/src/nl-cql2/`, exported through the same barrel. The demo picks which client to instantiate based on a runtime check against `apps/nl-demo/data/live-config.json`.

The provider call itself goes through a Node HTTP sidecar (`apps/nl-demo/scripts/live-proxy.mjs`) running on a loopback port. The browser talks to the proxy; the proxy talks to the provider. The API key lives in `apps/nl-demo/.env`, which is gitignored and read only by the proxy process.

The same script doubles as a deterministic stub in CI. `live-proxy.mjs --stub scenarios.json` scripts success plus all six failure classes — auth, rate-limit, provider-error, transport, timeout, oversize-response — so Playwright and vitest can exercise the live path without ever making a real provider call.

## Key Decisions

- **Local proxy sidecar, not direct browser calls.** Anthropic offers a "dangerous-direct-browser-access" header that lets the SDK run client-side. We rejected it. For a defence-facing tool, the API key should never be shipped to a client, even a trusted one. The proxy costs us one extra process to start; it buys us credential isolation that survives DevTools, browser extensions, and memory dumps.
- **Anthropic Claude Haiku 4.5 as the default provider.** Cheap, fast, and reliably produces structured JSON from our bounded CQL2 schema. Operators can override via `live-config.json`. Multi-provider support is deferred — single-provider scope is enough to validate the transport contract.
- **Three independent revocation levers.** Live mode requires all of: `live-config.json` present with `enabled: true`, `.env` present with a key, and the proxy process running. Delete any one, flip any one flag, kill the process — the demo reverts to fixtures on the next reload. No single point of failure for "how do I turn this off".
- **Zero new runtime dependencies.** `node:http` for the proxy. Browser-native `fetch` and `AbortController` for the client. No SDK, no `msw`, no `nock`. If we ever swap providers, the surface area to replace is small.
- **`LiveTransportError` is distinct from `GenerationError`.** Transport failure (auth, network, timeout) is a different concern from LLM-output failure (malformed JSON, schema mismatch, hallucinated fields). Keeping the types separate preserves the semantic meaning of `GenerationError` from #188 and lets the UI render appropriate banners for each.
- **Operational limits baked in.** 50 calls per session (closure-enforced), 256 KB response cap, in-flight call supersession via `AbortController`. All configurable per operator, but the defaults are tight on purpose.

## What We'd Love Feedback On

The proxy-versus-direct decision is the one we most want pressure-tested. We believe credential isolation is non-negotiable for this audience, but we'd like to hear from people who've shipped similar patterns in operational environments:

- Does the three-lever revocation model (config flag, env file, process) match how your environment thinks about toggling online capabilities on and off?
- Is Haiku 4.5 the right default, or should we prioritise a different provider for structured-output reliability? We have the escape hatch but would rather not ship a default that most operators will want to change.
- The 50 calls/session cap is a guess at what feels safe for a demo session. Does that map to how you'd want to budget spend during a stakeholder walkthrough?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
