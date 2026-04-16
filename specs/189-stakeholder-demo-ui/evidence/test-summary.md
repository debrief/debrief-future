---
feature: "189-stakeholder-demo-ui"
captured_at: "2026-04-16T17:10:00Z"
git_sha: "c1006f8"
tests_passed: 28
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Stakeholder Demo UI for NL Catalog Search

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 28 |
| Passed | 28 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | n/a (vitest+Playwright; no coverage gate for the demo per plan) |

## Test Breakdown

### Vitest unit tests (`apps/nl-demo/__tests__/`)

| Test File | Tests | Status |
|-----------|-------|--------|
| `colour.test.mjs` (chip palette mapping) | 6 | Pass |
| `projection.test.mjs` (StacBrowserItem → CardProjection) | 13 | Pass |
| `recompute.test.mjs` (chip → CQL2 round-trip with filterByCql2Json) | 6 | Pass |

### Playwright smoke tests (`apps/nl-demo/e2e/smoke.spec.ts`)

| Scenario | User Story | Status |
|----------|------------|--------|
| Type "uk submarines" → see chips + filtered grid + remove chip broadens | US1 | Pass |
| Type off-corpus phrase → banner + example phrases recover the flow | US2 | Pass |
| Clear-all returns to unfiltered state | US1 | Pass |

## Key Scenarios Verified

- **US1 core flow**: Typing a corpus phrase produces the right `LozengeSeed[]`,
  the chip bar renders both chips with the correct colours, the count toggles
  from `N plots` to `N of M plots`, and the card grid reflects the filtered
  set. Removing a chip re-evaluates `cql2FromChips` against
  `filterByCql2Json` (with the vessel-class taxonomy passed in for descendant
  expansion) and produces a strictly broader (or equal) result count.
- **US2 off-corpus banner**: Phrases not in the recorded fixture corpus —
  including ones that fail the prompt-hash check, since we treat both as
  "off-corpus" gracefully — surface a friendly banner with five clickable
  example phrases (drawn from `corpus.json` so their casing matches the
  recorded fixtures exactly).
- **US3 card detail polish**: Each card renders title, year, truncated
  description (word-boundary, no mid-word cut), nationality badge ("UK" for
  GB), vessel-type badge resolved through the platform registry to the
  human-readable name (e.g. "Type 23 (Duke-class)"), and up to three tag
  badges. The badges that match an active chip dimension get the
  `is-active` outline.
- **Pure-helper round-trip**: `cql2FromChips` produces an `a_containedBy`
  for hierarchical chip types (nationality, vessel-class, tag, track-name)
  and an `array_filter` for per-platform compound chips (domain, vessel_type,
  vessel_role). The vitest round-trip asserts the recomputed CQL2 filters
  the same items as the LLM-generated CQL2 for nationality + domain
  combinations.
- **Phrase canonicalisation**: User input "uk submarines" (any casing) is
  canonicalised, looked up against `corpus.json`, and the original-case
  phrase ("UK submarines") is sent to `generateCql2` so the recorded
  fixture's `promptHash` check passes.

## Known Issues

- The Playwright smoke test asserts "shown < total" rather than a fixed
  "18 of 72" because the catalog can be regenerated between runs. The
  spec's exact-count expectation is still verified upstream by 188's
  corpus regression test, which holds the catalog and fixtures together.
- Bundle size for `data/vendor/babel.min.js` is ~3 MB. This is the
  unavoidable cost of in-browser JSX transformation per FR-001 and is
  acceptable for a stakeholder demo (it loads from the same origin —
  zero network calls after first load).

## Environment

- Runners: vitest 1.6.x + Playwright 1.58.x (via `@sparticuz/chromium`
  bundled binary, the same pattern as `apps/web-shell`)
- Branch: `claude/implement-speckit-189-Tg5BB`
- Commands:
  - `cd apps/nl-demo && pnpm sync-data` (one-off, after install)
  - `pnpm test` — vitest unit tests
  - `node run-playwright.mjs` — Playwright smoke tests
- Date: 2026-04-16
