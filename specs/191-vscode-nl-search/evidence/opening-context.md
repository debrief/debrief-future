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
