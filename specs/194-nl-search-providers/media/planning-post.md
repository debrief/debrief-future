---
layout: future-post
title: "Planning: NL Search — Non-Anthropic Providers"
date: 2026-04-18
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, nl-search, llm, vscode]
excerpt: "Letting analysts choose between Claude, OpenAI, and a local Ollama model as the backend for natural-language catalogue search."
---

## What We're Building

Last month we wired up natural-language catalogue search, backed by Claude. An analyst types "tracks north of Scapa Flow last Tuesday" into the filter bar, and a CQL2 expression comes back that the existing filter engine already knows how to run. The piece that's been quietly bothering me since then is the word "Claude". For a lot of the people this platform is actually for — analysts working behind network boundaries, on budgets that don't include commercial API spend, or on estates where Anthropic simply isn't on the approved list — a single hardcoded provider is the difference between useful and unreachable.

This feature adds two more options behind the same filter bar: OpenAI (for the larger cohort of users who already have those credentials provisioned) and Ollama (for anyone running a local model, including fully air-gapped deployments). One VS Code setting switches between them. Nothing else about the analyst's workflow changes.

## How It Fits

This is the third step in the natural-language search thread. Feature #190 built the live LLM transport — a loopback proxy, a stub harness for CI, and the `LLMClient` contract. Feature #191 turned that contract into the analyst-facing filter bar experience. Both shipped against Claude only, which was the right first move: prove the shape of the thing before generalising it. #194 generalises it. All three sit under epic E10 — natural-language entry into the catalogue — and the pattern we're establishing here (a pluggable adapter seam behind a stable client contract) is also how we intend to plug in future analysis assistants, not just search. The Offline-by-default principle in the constitution is what pushes Ollama from "nice to have" to P2.

## Key Decisions

- **One adapter seam, three pure functions.** Each provider is a file exporting `composeRequest`, `parseResponse`, and `mapError`. The transport core (`providerCall()`) stays untouched; the `LLMClient` interface consumed by the webview and the filter bar stays untouched. Adding a fourth provider is one new file plus one registry line — we're targeting under an engineering day.
- **The prompt stays provider-neutral.** The canonical prompt body is identical across all three providers. The only per-provider variation is where the system message lives (dedicated `system` role for OpenAI and Ollama; embedded in the user message for Anthropic, which is how its API expects it). No semantic rewrites, no provider-specific few-shots — if one provider needs a cleverer prompt to match the others, that's a signal we should fix the prompt, not fork it.
- **No new SDKs.** OpenAI's SDK is tempting; so is Anthropic's. We're not adopting either. All three providers are called directly via `fetch` and `node:https`. Every dependency is a liability (Constitution IX), and the surface area we actually use from these APIs is tiny.
- **No new error kinds.** The nine-variant `LiveOutcome` union from #190 already covers what we need — auth, rate-limit, provider-error, transport, timeout, malformed response, not-configured, ceiling-reached, success. Each adapter owns a small mapping table from its provider's HTTP conditions into those variants. Downstream code doesn't learn that OpenAI exists.
- **Back-compat default.** `debrief.nlSearch.provider` defaults to `"anthropic"`. Existing users see no change unless they opt in.
- **Credentials isolated the same way as before.** OpenAI's API key goes into VS Code SecretStorage, exactly like the Anthropic key — never crosses the webview boundary, never appears in logs. Ollama has no credential; it just needs a base URL.
- **Corpus parity tests in CI.** The existing validation harness gets per-provider recorded fixtures. We'll flag any phrase where a provider's translated CQL2 drifts more than tolerance from the Claude baseline. Target is ≥ 90% per-phrase parity. Fast, deterministic, no live calls in CI.

## What We'd Love Feedback On

- **Ollama model defaults.** We're inclined to leave the model name operator-configured with no default, because "sensible default" depends entirely on what the operator has pulled locally. Is that the right call, or should we ship a recommended model and a warning when it's missing?
- **Failure messaging across providers.** When Ollama's server is unreachable vs. OpenAI returning 429 vs. Claude returning 529 — these are all `transport-error` or `rate-limit` under the hood, but the analyst probably wants different guidance. How much provider-specific flavouring in the UI is helpful before it becomes noise?
- **Who's missing?** P1 is OpenAI, P2 is Ollama. Are we overlooking a provider that's materially blocking you today — Azure OpenAI with its different auth flow, a specific on-prem gateway, something else?

→ [Join the discussion](https://github.com/IanMayo/debrief-future/discussions)
