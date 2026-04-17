# Quickstart: Enabling Live LLM Mode in the Demo

**Audience**: operators preparing a stakeholder demo (developers, solution engineers, or stakeholders running it themselves)
**Time**: ~ 5 minutes from a fresh `apps/nl-demo/` checkout to a live query
**Prerequisites**: Node 18+, pnpm, an Anthropic API key

Default behaviour: the demo runs in fixture-only mode with zero outbound calls. You must explicitly enable live mode by creating two config files and starting the proxy sidecar.

---

## 1. Install and sync (once per checkout)

```sh
cd apps/nl-demo
pnpm install          # from the repo root you can also use: pnpm install --filter @debrief/nl-demo
pnpm sync-data        # copies catalog + fixtures + bundles shared library
```

Verify fixture mode works:

```sh
pnpm serve            # starts http://127.0.0.1:8080
```

Open the demo, type `UK submarines`, confirm 18 cards render. Stop the server (`Ctrl-C`).

---

## 2. Supply the proxy credentials

Create `apps/nl-demo/.env` (this file is gitignored):

```sh
cp .env.example .env
```

Edit `.env` to set:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
# Optional overrides (see .env.example for full list)
# PROXY_PORT=8081
# ANTHROPIC_ENDPOINT=https://api.anthropic.com/v1/messages
```

**Security**: `.env` is in `.gitignore`. Never commit it. The proxy is the only process that ever reads this file; the browser bundle does not.

---

## 3. Activate live mode in the browser

Create `apps/nl-demo/live-config.json` (at the app root, also gitignored — NOT inside `data/`):

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

**All fields required**. If any is missing or malformed, the demo refuses to activate live mode and displays a diagnostic banner — it does not crash.

**If you bound the proxy to a non-loopback interface** (`PROXY_BIND=0.0.0.0` + `PROXY_ALLOW_REMOTE=true` in `.env`), the proxy prints a random `X-Proxy-Token` to stderr at startup. Copy that into `live-config.json` as `"proxyToken": "..."`. Without it, every `/generate` call returns 401.

---

## 4. Start the proxy

In a second terminal:

```sh
cd apps/nl-demo
pnpm exec node scripts/live-proxy.mjs
# or for the deterministic stub (CI / dev testing)
pnpm exec node scripts/live-proxy.mjs --stub e2e/fixtures/live-stub.json
```

You should see:

```
[proxy] ready on http://127.0.0.1:8081/generate (model=claude-haiku-4-5-20251001)
```

The proxy refuses to start in live mode if `ANTHROPIC_API_KEY` is missing.

---

## 5. Run the demo in live mode

In the first terminal:

```sh
pnpm serve
```

Open `http://127.0.0.1:8080`.

**Verify live mode is active** (three independent checks):

1. A transport-mode indicator appears near the page header reading *Live · Anthropic · claude-haiku-4-5-20251001* (FR-018). In fixture-only mode no such indicator is shown. If you misconfigured the proxy, the demo falls back to fixture mode at page load and shows a single-line banner pointing at the failed health check — you will not see the indicator.
2. Browser devtools → Network → submit any phrase → you see a POST to `127.0.0.1:8081/generate`. No third-party hosts.
3. Browser devtools → Console → you see one `[nl-demo/live] {...}` record per submission, with `outcome: "success"` on happy-path queries.

Try an off-corpus phrase — for example `South Korean destroyers`. Chips appear; the card grid filters. No off-corpus banner.

---

## 6. Revert to fixture-only mode

Any one of these is sufficient on next reload:

- Delete `apps/nl-demo/live-config.json`.
- Set `"enabled": false` inside `live-config.json`.
- Stop the proxy (the demo falls back to fixture mode with a transport-error banner on the next submission, and fully reverts on reload).

Reload the page. The subtitle returns to *Demo: hand-authored corpus, no live LLM*. No outbound live calls occur.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Demo shows *"Live-mode configuration is invalid"* banner | `live-config.json` has a missing or wrong-typed field | Inspect the banner message for the specific field name; correct the file; reload |
| Proxy fails to start with *"ANTHROPIC_API_KEY missing"* | `.env` is absent or the variable is unset | Create `.env` from `.env.example`; ensure the shell can read it |
| Page-load banner *"Live mode configured but proxy unreachable at ... — running in fixture mode. Did you start scripts/live-proxy.mjs?"* | Boot-time health check failed — proxy not running, wrong port, or missing `proxyToken` | Start the proxy in a second terminal; confirm `proxyUrl` and (if applicable) `proxyToken` in `live-config.json`; reload |
| Phrase submission shows *"Could not reach the language-model proxy. Is it running?"* | Proxy died between page load and submission | Restart the proxy; reload the demo to re-run the health check |
| *"Provider rejected the request — check credentials"* | API key is invalid, expired, or revoked | Rotate the key in Anthropic's dashboard; update `.env`; restart the proxy |
| *"Live-mode call limit reached — reload to reset"* | You've hit the default cap of 50 calls in this session | Reload the page to reset the counter |

---

## 8. CI and automated tests

CI never makes a live call. The Playwright smoke test launches `live-proxy.mjs --stub e2e/fixtures/live-stub.json` as a second entry in Playwright's `webServer` array (alongside the existing `serve.mjs`), binding to a fixed loopback port. The stub scripts success + each failure class deterministically. vitest unit tests exercise `createLiveLLMClient` against the same stub-mode proxy bound to a random loopback port. Neither environment requires `ANTHROPIC_API_KEY`. A `gitleaks` CI step additionally scans every PR for provider-key patterns to catch accidental `.env` commits before merge (SC-006).

To run locally:

```sh
cd apps/nl-demo
pnpm test         # vitest — includes live-client unit tests
pnpm test:e2e     # Playwright — includes live-transport smoke test
```
