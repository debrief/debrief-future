The API key never reaches the browser. That's the design constraint that shaped feature #190 — a live language-model transport for the natural-language catalog-discovery demo, and the final phase of Epic E10.

Rather than use Anthropic's direct-browser access path, we're putting a small Node HTTP proxy in front of the provider. The key lives in a gitignored `.env` file read only by the proxy process. The browser talks to a loopback port. Three independent levers (config flag, env file, process state) revert the demo to its hand-authored fixture corpus — which remains the default and the CI baseline.

This "offline by default, online by explicit operator action" pattern matters for a defence-facing tool. Fixtures give us a deterministic path CI can rely on. The live transport is opt-in, capped at 50 calls per session, and bounded by a 256 KB response limit. Operators keep control of when a credential is in play and when it isn't.

Planning post covers the proxy rationale, the `LiveTransportError` type split, and the open questions we'd like feedback on.

[link to planning post]

#FutureDebrief #MaritimeAnalysis #OpenSource
