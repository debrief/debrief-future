---
feature: "191-spec-navigator"
captured_at: "2026-04-17T14:23:00Z"
git_sha: "d7f8aeb5"
tests_passed: 162
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: 191 Spec Navigator & Review Tool

## Results

| Metric | Value |
|--------|-------|
| Total vitest tests | 138 |
| Vitest passed | 138 |
| Total Playwright E2E | 24 |
| Playwright passed | 24 |
| Axe-core a11y checks | 6 (desktop + mobile × 3 states) |
| WCAG 2.1 AA violations | 0 |
| Failed | 0 |
| Skipped | 0 |
| Bundle size (gzip, largest chunk) | 176 KB (budget: 400 KB) |

## Test Breakdown

### Foundation (Phase 2)

| Suite | Tests | Status |
|------|------|--------|
| `src/github/__tests__/schemas.test.ts` | 8 | Pass |
| `src/github/__tests__/auth.test.ts` | 5 | Pass |
| `src/github/__tests__/api.test.ts` | 13 | Pass |
| `src/state/__tests__/persistence.test.ts` | 7 | Pass |
| `src/state/__tests__/commentsReducer.test.ts` | 11 | Pass |
| `src/state/__tests__/useFeature.test.ts` | 8 | Pass |
| `src/format/__tests__/selectionAnchor.test.ts` | 7 | Pass |
| `src/format/__tests__/classifyArtefact.test.ts` | 6 | Pass |
| `src/format/__tests__/renderFeedbackComment.test.ts` | 10 | Pass |

### Components (Phases 3–7)

| Suite | Tests | Status |
|------|------|--------|
| `src/components/__tests__/ArtifactView.test.tsx` | 5 | Pass |
| `src/components/__tests__/CommentComposer.test.tsx` | 9 | Pass |
| `src/components/__tests__/CommentDrawer.test.tsx` | 9 | Pass |
| `src/components/__tests__/SelectionAnchor.test.tsx` | 4 | Pass |
| `src/components/__tests__/SettingsPanel.test.tsx` | 8 | Pass |
| `src/components/__tests__/SubmitButton.test.tsx` | 5 | Pass |
| `src/components/__tests__/markdownRender.bench.test.ts` | 3 | Pass |

### Security + policy

| Suite | Tests | Status |
|------|------|--------|
| `src/__tests__/cspPresence.test.ts` | 2 | Pass |
| `src/__tests__/xssAdversarial.test.ts` | 10 | Pass |
| `src/__tests__/softGaps.test.ts` | 7 | Pass |
| `src/__tests__/bundleSize.test.ts` | 1 | Pass |

### E2E (Playwright)

| Suite | Tests | Status |
|------|------|--------|
| `e2e/submit.spec.ts` | 3 | Pass |
| `e2e/stale-head.spec.ts` | 3 | Pass |
| `e2e/drawer.spec.ts` | 5 | Pass |
| `e2e/render.spec.ts` | 3 | Pass |
| `e2e/auth.spec.ts` | 4 | Pass |
| `e2e/a11y.spec.ts` | 6 | Pass |

## Key Scenarios Verified

- **Review-then-submit happy path** — reviewer opens `?pr=<n>`, navigates
  tree, adds feature/document/selection comments, submits once; exactly
  one PR comment is POSTed, body contains the trigger line + fenced
  `json spec-review-feedback-v1` block validating against the contract
  schema.
- **Stale-head detection** — PR head.sha moves between load and submit;
  `StaleHeadModal` opens; Submit-anyway POSTs with
  `originalHeadSha !== submittedAtHeadSha` plus the human-readable
  admonition; Cancel preserves drafts and does NOT POST.
- **Draft persistence** — three drafts survive page reload (FR-021);
  drafts are cleared after a successful submit so reload shows the
  empty-state copy (FR-022).
- **Authentication flow** — Settings panel open-by-default with no PAT;
  401 response shows scope error banner; valid PAT probe auto-closes
  panel; Clear wipes storage so next reload reopens Settings.
- **Error mapping** — 401 → credential-rejected, 403 with rate-limit-0
  → rate-limit, 404 → pr-not-found, 422 → server-validation, 429 →
  rate-limit, network failures → network. PAT never leaks into error
  messages across any mapped status code (regex-tested against a
  known secret sentinel).
- **XSS resistance** — 10 standard payloads (`<script>`, `onerror=`,
  `<svg/onload>`, `javascript:`, `data:text/html`, `<iframe>`) all
  sanitised by react-markdown + rehype; zero active HTML, zero
  `on*=` attributes, zero scripted URL schemes in the rendered DOM.
- **CSP** — `default-src 'self'; connect-src 'self' https://api.github.com
  https://raw.githubusercontent.com; script-src 'self'; style-src 'self'
  'unsafe-inline'; img-src 'self' https://raw.githubusercontent.com data:;
  base-uri 'self'; form-action 'none'` asserted byte-for-byte at test time.
- **Accessibility** — axe-core WCAG 2.1 AA sweep over 3 states × 2
  viewports (desktop 1280×720, mobile 375×812), zero violations.
- **Bundle size** — largest JS chunk 580 KB raw / 176 KB gzipped,
  well under the 400 KB gzipped budget.
- **Markdown render performance** — 50 KB / 150 KB / 300 KB real-world
  fixtures render in ~90 / 230 / 550 ms average respectively; soft-gate
  at 3000 ms (hard ceiling; 1000 ms is the under-calm-conditions target).

## Notes

- Tests are run with `pnpm --filter @debrief/spec-navigator test`
  (vitest) and `pnpm exec playwright test` (E2E).
- Cloud/CI environments use `node run-playwright.mjs` which sources
  chromium from `@sparticuz/chromium`; local macOS uses the default
  Playwright-installed chromium.
- Total wall-clock: ~14s vitest + ~18s Playwright.
