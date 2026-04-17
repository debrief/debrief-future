---
layout: future-post
title: "Planning: Natural-language catalogue search inside VS Code"
date: 2026-04-17
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, vscode, nl-search, filter-bar, live-llm]
excerpt: "The browser demo's natural-language catalogue search moves inside VS Code — with the API key kept out of the webview."
---

## What We're Building

An analyst opens the Catalog Overview in VS Code, types "UK submarines" or "French frigates on ASW operations" into the filter bar, and watches filter chips appear and the plot list narrow — without leaving the editor. It's the same natural-language pipeline that's been running in the `nl-demo` browser page for a few weeks, now reachable where people actually work.

The translation from phrase to filter chips is unchanged from the demo. What's new is the wiring: getting a Claude call to happen from inside a VS Code webview, without the webview ever seeing the credential.

## How It Fits

Feature #188 gave us the NL→CQL2 prompt and parser. #189 built the stakeholder demo UI around it. #190 verified the live transport end-to-end against real Anthropic Haiku 4.5 — the browser demo now answers real phrases with real chips. This feature is the fourth step: take the pieces that already work and surface them inside the editor.

The FilterBar component picks up an optional `llmClient` prop. When it's present, Enter routes the phrase through the NL pipeline; when it's absent, the existing literal-substring QuickSearch runs exactly as it does today. The browser demo and VS Code end up as two consumers of the same component — no fork, no parallel implementation.

## Key Decisions

- **Transport is `postMessage`, not a loopback HTTP proxy.** The webview's CSP blocks direct calls to `127.0.0.1:8081`, and the extension host already owns the trust boundary — SecretStorage, network, webview lifecycle. Re-using #190's `callAnthropic` logic as an in-process module avoids a child-process and a second binary for security review to consider.
- **The API key lives in VS Code SecretStorage.** Not `settings.json`, not an environment variable, not a workspace file. SecretStorage uses the host OS keyring and isn't synced by Settings Sync — so a shared workspace can't accidentally ship a credential.
- **Opt-in default off.** First-time users see zero behaviour change and zero network calls. A single `debrief.nlSearch.enabled` toggle is the master switch; when it's off, the extension doesn't even read SecretStorage. The literal-substring fallback remains the default search path.
- **Per-session call ceiling enforced in the host.** Default 50, matching #190. A rogue or second webview panel can't bypass it. Reload-the-window is the reset affordance.
- **Five failure classes, distinct banners.** Auth, rate-limit, provider-error, timeout, malformed — same vocabulary as #190. Prior chips and filtered results stay on screen through any failure. No JavaScript errors in DevTools for an analyst to decipher.

## What We'd Love Feedback On

Three questions we're genuinely unsure about:

1. **Is "opt-in default off" the right posture for DSTL and defence contexts?** Or would an `ASK_ON_FIRST_USE` intermediate be more useful — the feature installs dormant but prompts on the first phrase, so users don't have to know the setting exists?
2. **Are five failure banners enough, and are they clear enough?** In particular, should the malformed-response case include an explicit "try rephrasing" hint, given that the fix is usually on the analyst's side rather than the provider's?
3. **Should we ship `debrief.nlSearch.providerChoice` now?** A setting that offers Claude, local-ollama, or disabled-only would open the door for air-gapped deployments. But v1 prompt tuning is hand-calibrated to Claude's JSON-following behaviour, and adding a second provider without testing it against the acceptance scenarios feels premature.

The spec, plan, and research notes are on the feature branch (`191-vscode-nl-search`) if you want the full detail on any of these.

[Join the discussion on GitHub](https://github.com/debrief/debrief-future/discussions)
