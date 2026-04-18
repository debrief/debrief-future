Typing "UK submarines" into a filter bar and watching a plot catalogue narrow is already working in our browser demo. Next up: making it work inside VS Code, where analysts actually live.

The interesting constraint is that VS Code webviews run under a strict Content Security Policy that blocks direct calls to third-party hosts. So the Anthropic call has to happen in the extension host, not the webview — which is exactly where you want it anyway, because that's where VS Code SecretStorage lives. The webview asks via `postMessage`, the host brokers the call, and the API key never crosses the boundary.

The feature is opt-in by default. First-time users see zero behaviour change and zero network calls until they flip a switch. That matters for defence and air-gapped contexts where any outbound request needs explicit consent.

The planning post below walks through the transport decisions, the credential story, and three open questions we'd welcome feedback on — including whether "opt-in default off" is the right posture for defence deployments or whether we should ship an intermediate "ask on first use" mode.

[Read the planning post](link-placeholder)

#FutureDebrief #MaritimeAnalysis #OpenSource
