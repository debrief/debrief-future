---
feature: "190-live-llm-transport"
captured_at: "2026-04-17T08:55:00Z"
git_sha: "46d43e2"
---

# Usage Example: Live LLM Transport (#190)

End-to-end walkthrough of enabling the live transport and submitting an off-corpus phrase. Captures the operator experience targeted by SC-004 ("cold-start operator activates live mode in under 5 minutes").

## Before — fixture-only mode (default)

From a fresh checkout, no live configuration:

```sh
$ cd apps/nl-demo
$ pnpm install
$ pnpm sync-data
[sync-data] copied 73 item.json files into data/items/
[sync-data] copied responses.json + corpus.json
[sync-data] copied platform-registry.json + enum-bundle.json
[sync-data] bundled debrief-lib.js (46.0 KB)
[sync-data] complete.
$ pnpm serve
[serve] http://localhost:8080 (root=/.../apps/nl-demo)
```

Open <http://localhost:8080>:

- Subtitle reads **“Demo: hand-authored corpus, no live LLM”**.
- No transport-mode indicator in the header.
- Typing `South Korean destroyers` → the off-corpus banner, as in #189.
- Browser devtools → Network → zero requests to `/generate` or `anthropic.com` (SC-003).

## Switching on live mode

1. Create `.env` (gitignored; proxy-only, never reaches the bundle):

    ```sh
    $ cp .env.example .env
    $ echo "ANTHROPIC_API_KEY=sk-ant-…(real key)…" >> .env
    ```

2. Create `live-config.json` at the app root (gitignored; browser-visible, no credentials):

    ```json
    {
      "enabled": true,
      "proxyUrl": "http://127.0.0.1:8081/generate",
      "model": "claude-haiku-4-5-20251001",
      "timeoutMs": 12000,
      "maxCalls": 50,
      "maxResponseBytes": 262144
    }
    ```

3. Start the proxy in a second terminal:

    ```sh
    $ pnpm exec node scripts/live-proxy.mjs
    [proxy] startup config: { mode: 'live', bind: '127.0.0.1', port: 8081, allowRemote: false, tokenRequired: false, model: 'claude-haiku-4-5-20251001' }
    [proxy] ready on http://127.0.0.1:8081/generate (mode=live, model=claude-haiku-4-5-20251001)
    ```

4. Reload the demo:

- Subtitle reads **“Demo: live LLM transport”**.
- A **Live · Anthropic · `claude-haiku-4-5-20251001`** indicator appears in the header.
- Browser devtools → Console → `[nl-demo/live] { ts, provider, model, durationMs, outcome, responseBytes, callIndex }` — one record per submission; no prompt, response, or credential content.

## After — off-corpus phrase via live transport

Typing `South Korean destroyers`:

1. Browser issues `POST http://127.0.0.1:8081/generate` with the verbatim prompt.
2. Proxy forwards to `https://api.anthropic.com/v1/messages` (upstream keep-alive agent).
3. Proxy returns `{ ok: true, rawResponse, bytes, providerLatencyMs }`.
4. Demo runs `parseResponse(rawResponse)` → chips + filtered grid render.
5. No off-corpus banner; no transport-error banner.

### Sample `rawResponse` (stub mode, used by CI)

```json
{
  "cql2": {
    "op": "and",
    "args": [
      { "op": "a_containedBy", "args": [["KR"], { "property": "debrief:platforms[*].nationality" }] },
      { "op": "like", "args": [{ "property": "debrief:platforms[*].vessel_class" }, "%destroyer%"] }
    ]
  },
  "lozenges": [
    { "filterType": "nationality", "value": "KR" },
    { "filterType": "vessel-class", "value": "destroyer" }
  ],
  "unrecognised_terms": []
}
```

## Reverting to fixture mode

Any one of these is sufficient on next reload:

- Delete `apps/nl-demo/live-config.json`.
- Set `"enabled": false` inside `live-config.json`.
- Stop the proxy (the demo shows a transport banner on the next submission and fully reverts on reload).

## Programmatic usage

```ts
import {
  createLiveLLMClient,
  validateLiveConfig,
  generateCql2,
} from "@debrief/components/nl-cql2";

const raw = await fetch("./live-config.json").then(r => r.json());
const v = validateLiveConfig(raw);
if (!v.ok) throw new Error(`bad live-config: ${v.errors[0].field} — ${v.errors[0].message}`);

const client = createLiveLLMClient(v.value);
const result = await generateCql2("South Korean destroyers", { client, enums });

if (result.error?.kind === "transport") {
  // reason ∈ { auth-failure | rate-limit | provider-error | transport-error
  //          | timeout | oversize-response | usage-cap-reached }
  showBanner(result.error.error.reason, result.error.error.message);
} else if (result.error?.kind === "generation") {
  showBanner("malformed-response", result.error.error.message);
} else {
  render(result.cql2, result.lozenges);
}
```

## Key invariants demonstrated

- **Offline by default**: no `live-config.json` → no outbound call, ever.
- **Credential isolation**: `ANTHROPIC_API_KEY` never appears in the served bundle — only the proxy's environment holds it.
- **Safe failures**: every transport failure has a distinct, user-readable banner; the query bar stays usable; no `console.error` from demo code.
- **Supersession**: submitting a new phrase while a previous call is pending supersedes the older call; only the latest result reaches the UI.
