---
feature: "190-live-llm-transport"
captured_at: "2026-04-17T08:55:00Z"
git_sha: "46d43e2"
---

# SC-005: Failure-class matrix

Each of the 7 `LiveTransportErrorReason` values + #188's `malformed-json` generator error surfaces a distinct, user-readable message in the demo UI. The mapping is deterministic — injecting any stub scenario produces exactly one branch.

## Matrix

| # | Class | Trigger (stub scenario) | Banner text (data-transport-reason) | Test |
|---|---|---|---|---|
| 1 | `auth-failure` | `{"kind": "auth"}` → proxy 401 | **Live-mode call failed** · "Provider rejected the request — check credentials, then restart the proxy." | Playwright T039 + vitest T036 |
| 2 | `rate-limit` | `{"kind": "rate-limit"}` → proxy 429 | **Live-mode call failed** · "Provider rate limit hit — try again in a moment or use a different phrase." | Playwright T039 + vitest T036 |
| 3 | `provider-error` | `{"kind": "provider-error"}` → proxy 502 | **Live-mode call failed** · "The language-model provider returned an error. Try a different phrase." | Playwright T039 + vitest T036 |
| 4 | `transport-error` | Network failure (fetch rejects) OR `bad-request` → proxy 400 | **Live-mode call failed** · "Could not reach the language-model proxy. Is it running?" | vitest T036 + T041 proxy-down boot-time health-check |
| 5 | `timeout` | `{"kind": "timeout"}` → stub stalls past `timeoutMs` | **Live-mode call failed** · "The provider did not respond in time. Try a different phrase or retry." | vitest T036 |
| 6 | `oversize-response` | `{"kind": "oversize", "sizeBytes": > maxResponseBytes}` | **Live-mode call failed** · "The provider's response was too large to process. Try a different phrase." | vitest T036 |
| 7 | `usage-cap-reached` | Submit N+1 where N = `maxCalls` | **Live-mode call failed** · "Live-mode call limit reached — reload to reset." | vitest T037 (SC-008) |
| 8 | `malformed-json` (GenerationError kind) | `{"kind": "malformed", "raw": "not valid json"}` | **Live-mode call failed** · Raw generator message, routed through the transport banner's `provider-error` visual variant | vitest T038 (liveClient.test.ts) |

## Invariants asserted

For every branch:

- `banner` has attribute `data-testid="live-transport-banner"` and `data-transport-reason=<reason>`.
- Query input (`data-testid="query-input"`) remains **enabled** immediately after banner renders.
- No demo-emitted `console.error` fires (`nl-demo/live` records use `console.info` only).
- Submitting a subsequent phrase works without a page reload (cross-transport recovery, T040).

## Screenshots

Screenshots per class live under `evidence/screenshots/banner-<reason>.png`. Captured by a helper Playwright run during evidence capture; not part of the CI spec.

- `banner-auth-failure.png`
- `banner-rate-limit.png`
- `banner-provider-error.png`
- `banner-transport-error.png`
- `banner-timeout.png`
- `banner-oversize-response.png`
- `banner-usage-cap-reached.png`
- `banner-malformed-response.png`

Capture is reviewer-reproducible via:

```sh
cd apps/nl-demo && CLAUDE_CODE=1 node run-playwright.mjs live-transport.spec -g "failure-class"
# trace zips land in test-results/
```
