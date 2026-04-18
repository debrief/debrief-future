---
feature: "190-live-llm-transport"
captured_at: "2026-04-17T08:50:00Z"
git_sha: "46d43e2"
tests_passed: 1555
tests_failed: 0
tests_skipped: 4
coverage_pct: null
---

# Test Summary: Live LLM Transport (#190)

## Results

| Metric | Value |
|--------|-------|
| Python tests (pytest) | 1733 passed · 1 skipped · 1 xfailed |
| TypeScript unit tests (vitest) | 1506 passed · 4 skipped |
| Playwright end-to-end | 16 passed |
| **Total** | 3255 passed · 5 skipped · 1 xfailed |
| Feature-specific (live-transport) | 38 vitest + 8 Playwright = 46 scenarios |

## Test Breakdown

### Foundation tests (Phase 2)

| Test | Status |
|------|--------|
| validateLiveConfig — valid input (T007) · 3 cases | Pass |
| validateLiveConfig — invalid input (T029) · 11 cases | Pass |
| isLiveTransportError (T009) · 4 cases | Pass |

### Live-client unit tests (`shared/components/src/nl-cql2/__tests__/liveClient.test.ts`)

| Test | Status |
|------|--------|
| createLiveLLMClient — happy path (T010) · 3 cases | Pass |
| createLiveLLMClient — supersession (FR-012 / T011) | Pass |
| createLiveLLMClient — no prompt-hash check (FR-009 / T012) | Pass |
| createLiveLLMClient — TransportCallRecord emission (T013) · 2 cases | Pass |
| createLiveLLMClient — malformed-response fallthrough (T038) | Pass |
| createLiveLLMClient — usage cap (SC-008 / T037) | Pass |
| createLiveLLMClient — failure-class matrix (T036) · 7 cases | Pass |
| FR-002 interchangeability regression guard (T061) | Pass |

### Live-transport Playwright E2E (`apps/nl-demo/e2e/live-transport.spec.ts`)

| Test | Status |
|------|--------|
| T028 happy path — off-corpus phrase renders chips | Pass |
| T030 SC-003 zero-outbound in fixture default | Pass |
| T031 malformed-config diagnostic banner | Pass |
| T039 auth-failure distinct banner | Pass |
| T039 rate-limit distinct banner | Pass |
| T039 provider-error distinct banner | Pass |
| T040 cross-transport recovery | Pass |
| T041 proxy-down boot fallback | Pass |

### Regression coverage (`nl-cql2` existing suite)

| Test | Status |
|------|--------|
| parseResponse — all 5 GenerationErrorReason classes | Pass (updated for new union) |
| generate — happy path + passthrough | Pass |
| corpus / harness / rehash / prompt-size | Pass |

## Key Scenarios Verified

- **FR-012 supersession**: slow call 1 + cancelPending() → call 1 resolves with `reason: "transport-error"` / `message: "superseded"`; call 2's result reaches consumer.
- **SC-008 usage cap**: 50 successes then call 51 short-circuits with `reason: "usage-cap-reached"` WITHOUT issuing a fetch.
- **SC-003 zero-outbound**: 11 phrases submitted without `live-config.json` — no URLs matching `/generate` or `anthropic.com` observed by `page.on('request')`.
- **SC-005 failure classes**: 7 `LiveTransportErrorReason` values + `malformed-json` `GenerationError` each surface a distinct UI message; query bar remains enabled; no demo-emitted `console.error` on any transport failure.
- **FR-018 transport-mode indicator**: present only when `live-config.json` validates AND health check returns `ok: true`; absent in every other branch.
- **Cross-transport recovery (US3 AC4)**: 3 live failures in a row, then a corpus phrase still filters cards correctly.
- **Proxy-down boot (US2 AC4 / T041)**: boot-time health check fails → banner names the proxy URL + fallback to fixture mode; indicator hidden.

## Known Issues

- None blocking. Vitest `4 skipped` are pre-existing in the nl-cql2 suite (capture-only tests that run off-harness).

## Environment

- Runner: vitest (1.6), Playwright (1.58) via `run-playwright.mjs` + bundled @sparticuz/chromium
- Branch: `claude/implement-speckit-190-dwRTe`
- Date: 2026-04-17
- Platform: Linux (Claude Code cloud session)
