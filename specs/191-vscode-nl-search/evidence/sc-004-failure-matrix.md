# SC-004 Failure Matrix — 7 classes × banner copy × recovery affordance

Captured against the `NlModeWithStubClient` Storybook story + the
VS Code E2E stub harness (the latter guarded by `.skip` until the
code-server harness lands — see `tests/e2e/test-vscode-nl-search.spec.ts`).

| #  | `outcome.kind` | Trigger phrase | `data-transport-reason` | Banner copy | Recovery button | Screenshot |
|----|---|---|---|---|---|---|
| 1  | `auth-failure` | `auth-failure test` | `auth-failure` | "The provider rejected the API key. Check your configuration." | **Open settings** (posts `nlBannerAction:open-settings` → `workbench.action.openSettings` filtered on `debrief.nlSearch`) | `screenshots/banner-auth-failure.png` |
| 2  | `rate-limit` | `rate-limit test` | `rate-limit` | "The provider rate limit was hit. Try again in a moment." | **Retry** | `screenshots/banner-rate-limit.png` |
| 3  | `provider-error` | `provider-error test` | `provider-error` | "The language-model provider returned an error." | **Retry** | `screenshots/banner-provider-error.png` |
| 4  | `timeout` | `timeout test` | `timeout` | "The provider did not respond in time." | **Retry** | `screenshots/banner-timeout.png` |
| 5  | `malformed-response` | `malformed test` | `malformed-response` | "The provider's response could not be processed." | **Rephrase** | `screenshots/banner-malformed-response.png` |
| 6  | `not-configured` | `not-configured test` (or feature disabled / key missing at runtime) | `not-configured` | "NL search is disabled — enable it in settings…" OR "NL search needs an API key — run the Set Anthropic API Key command." (depending on `reason`) | **Open settings** | `screenshots/banner-not-configured.png` |
| 7  | `ceiling-reached` | `ceiling-reached test` (or real call-index overflow) | `ceiling-reached` | "Live-mode call limit reached (50). Reload the editor to reset." | **Reload window** (posts `nlBannerAction:reload` → `workbench.action.reloadWindow`) | `screenshots/banner-ceiling-reached.png` |

## Invariants

- Every non-success outcome sets `data-testid="live-transport-banner"`
  and `data-transport-reason=<kind>` on the root banner element, so
  the E2E selector is stable across all 7 classes.
- Existing lozenges survive every banner — the banner is purely
  additive (Decision 7 regression guard in `FilterBar.nl.test.tsx`
  `[#191 regression]`).
- **Cancellations produce no banner** by design (Decision 11).
  `transport-error/cancelled` outcomes are dropped by the FilterBar
  token guard so superseded calls are invisible to the analyst.
