Revoking a demo's live-LLM access should be one file deletion and a page reload. That's the bar we set for #190.

The stakeholder demo can now call a real language model for phrases outside the hand-authored corpus. The API key lives only in the proxy's environment — it never reaches the static bundle. The browser fetches a separate `live-config.json` (proxy URL, model name, call cap — no credentials). Delete that file, reload, and the demo returns to fixture-only mode with no stale state. A gitleaks CI gate scans every PR for provider-key patterns across the built artefacts.

The entire CI suite — 38 vitest unit tests and 8 Playwright E2E scenarios — runs against a deterministic stub without any network calls or credentials. Zero new runtime dependencies: the proxy is Node stdlib, the client is browser-native fetch.

More on the two-file config split, the loopback-default proxy, and the 7 failure-class banners:
https://debrief-future.dev/blog/190-live-llm-transport

#FutureDebrief #MaritimeAnalysis #OpenSource
