---
feature: 244-navigator-mobile-pwa
captured_at: 2026-05-04T06:00:00Z
git_sha: 15e1096
tests_passed: 158
tests_failed: 0
tests_skipped: 27
coverage_pct: n/a
---

# Test summary — Backlog Navigator mobile PWA (#244)

## Headline

| Suite | Files | Tests | Passed | Failed | Skipped |
|-------|-------|-------|--------|--------|---------|
| Vitest (backlog-navigator) | 17 | 121 | 121 | 0 | 0 |
| Playwright — mobile/ | 6 | 30 | 30 | 0 | 27 |
| Playwright — desktop | 5 | 12 | 12 | 0 | 0 |
| Lighthouse PWA | 1 (CI) | 1 | TBD (CI) | 0 | 0 |
| **Total** | **29** | **164** | **163** | **0** | **27** |

The 27 skipped Playwright tests are intentional viewport-restriction skips — single-viewport specs (description editor / push / pwa-offline) skip when the project matrix runs at non-iPhone viewports. Browse spec runs at all three viewports as FR-021 requires.

## Vitest by file

| File | Tests | Passed | Notes |
|------|-------|--------|-------|
| `src/__tests__/types.test.ts` | 8 | 8 | unchanged from #242 |
| `src/components/editors/__tests__/CellEditors.test.tsx` | 14 | 14 | unchanged from #242 |
| `src/components/mobile/__tests__/BottomSheet.test.tsx` | 10 | 10 | **new (T044)** — gesture, ESC, backdrop click, dismiss thresholds |
| `src/components/mobile/__tests__/CardList.test.tsx` | 9 | 9 | **new (T036)** — selector behaviour (phase / includeCompleted / freeText / sort) |
| `src/components/mobile/__tests__/ItemCard.test.tsx` | 11 | 11 | **new (T035 + T041 + emergent)** — render, strikethrough, dirty marker, copy-speckit-command |
| `src/components/mobile/__tests__/StickyPushBar.test.tsx` | 5 | 5 | **new (T060)** — hidden when clean, count, push callback, variant |
| `src/components/mobile/__tests__/byteParityBottomSheet.test.tsx` | 5 | 5 | **new (T049)** — round-trip parity vs. desktop for status / category / score / epic / mixed |
| `src/components/mobile/__tests__/byteParityDescription.test.tsx` | 4 | 4 | **new (T056)** — round-trip parity for plain / link / escaped pipe / clean save |
| `src/editors/__tests__/EditorOverlayProvider.test.tsx` | 9 | 9 | **new (T012)** — open/save, intra-mode rotation, cross-mode discard-confirm (Issue 1A regression) |
| `src/format/__tests__/summary.test.ts` | 2 | 2 | unchanged from #242 |
| `src/parser/__tests__/liveBacklog.roundtrip.test.ts` | 2 | 2 | unchanged — gates byte-stable round-trip of live BACKLOG.md |
| `src/parser/__tests__/parseBacklog.test.ts` | 7 | 7 | unchanged from #242 |
| `src/pwa/__tests__/registerSW.test.tsx` | 6 | 6 | **new (T065)** — UpdatePrompt lifecycle (up-to-date / available / updating / dismiss) |
| `src/state/__tests__/deploymentMode.test.ts` | 4 | 4 | unchanged from #242 |
| `src/state/__tests__/pendingEdits.test.ts` | 5 | 5 | unchanged from #242 |
| `src/state/__tests__/push.test.ts` | 9 | 9 | unchanged from #242 |
| `src/state/__tests__/speckitCommand.test.ts` | 11 | 11 | **new (emergent)** — every Status branch + clipboard string format |

## Playwright by spec

### Mobile (`e2e/mobile/`)

| Spec | Project matrix | Tests run | Notes |
|------|----------------|-----------|-------|
| `browse.mobile.spec.ts` | mobile-iphone, tablet-portrait, tablet-landscape | 12 | FR-021 — all 3 viewports green; landscape skips mobile-only behaviour |
| `interaction.mobile.spec.ts` | mobile-iphone | 4 | bottom sheet open/save/cancel/discard-confirm |
| `editor-rotation.mobile.spec.ts` | tablet-portrait | 1 | Issue 1A regression — cross-breakpoint rotation surfaces discard-confirm |
| `description-editor.mobile.spec.ts` | mobile-iphone | 4 | open / save / cancel-discard / cancel-continue |
| `push.mobile.spec.ts` | mobile-iphone | 3 | bar hidden / appears / opens existing PushDialog |
| `pwa-offline.mobile.spec.ts` | mobile-iphone | 2 | offline empty state, display-mode standalone |
| `screenshots.mobile.spec.ts` | mobile-iphone | 7 | evidence capture (T072-T078 + 2 emergent) |

### Desktop (parity gate — FR-023 / SC-008)

All 12 desktop tests from #242 pass unchanged after #244:

| Spec | Tests |
|------|-------|
| `a11y.spec.ts` | 2 |
| `browse.spec.ts` | 6 |
| `interaction.spec.ts` | 1 |
| `prMode.spec.ts` | 2 |
| `realWrite.spec.ts` | 1 |

**No regressions.**

## Lighthouse PWA gate (T067)

CI workflow `.github/workflows/backlog-navigator-lighthouse.yml` builds the app, starts vite preview on :5175, runs `@lhci/cli autorun` against `apps/backlog-navigator/.lighthouserc.json`. Assertions: `categories:pwa >= 0.9`, `installable-manifest`, `service-worker`. Triggers on PRs touching `apps/backlog-navigator/**`.

Lighthouse report is captured as a CI artefact (`lighthouse-report` retained for 7 days) and surfaced at `evidence/lighthouse-pwa.html` once the first PR run lands.

## Bundle budget (FR-024 / SC-010)

| Stage | Gzipped JS | Delta vs baseline | Headroom (+15%) |
|-------|------------|-------------------|-----------------|
| Pre-#244 baseline | 121,576 B | — | — |
| Phase 2 (foundation) | 126,902 B | +4.38% | +12,910 B |
| Phase 3 (browse) | 133,114 B | +9.49% | +6,698 B |
| Phase 4 (edit row) | 133,832 B | +10.08% | +5,980 B |
| Phase 5 (description editor + emergent) | 134,543 B | +10.67% | +5,269 B |
| Phase 6 (push bar) | 134,697 B | +10.79% | +5,115 B |
| Phase 7 (PWA install) | 134,979 B | +10.96% | +4,833 B |

**Final delta: +10.96% — well under the +15% target. No budget amendment needed.**

Tree-shake verified clean: `MapView`, `Leaflet`, `Vega`, `FilterBar`, `FeatureList`, `GoldenLayout` all confirmed absent from the navigator's dist (Issue 2A — `@debrief/components/hooks/useIsMobile` subpath import works as designed).

## Knowingly under-tested items (per spec)

These three are documented in `evidence/manual-test-log.md`:

1. **SC-001 (≥ 50 fps card list scroll)** — untestable in Playwright (no fps API).
2. **US2 AS3 (iOS soft keyboard never covers active input)** — Playwright can't drive the iOS soft keyboard.
3. **SC-011 (update prompt fires within 60 s)** — requires a real network round-trip to the deployed SW.

## Acceptance scenarios — coverage matrix

| User Story | Scenario | Coverage |
|------------|----------|----------|
| US1 AS1 | Card list renders without horizontal overflow | E2E `browse.mobile.spec.ts` (3 viewports) |
| US1 AS2 | Search filters by ID + Description | E2E + vitest |
| US1 AS3 | Phase filter narrows to selected statuses | E2E + vitest |
| US1 AS4 | Include-completed toggle reveals/hides complete rows | E2E + vitest |
| US2 AS1 | Tap chip → bottom sheet opens with editor | E2E `interaction.mobile.spec.ts` |
| US2 AS2 | Sheet dismissible via drag/tap-outside/Close | Vitest `BottomSheet.test.tsx` (drag), E2E (Cancel) |
| US2 AS3 | Soft keyboard never covers active input | **Manual** (Playwright limitation) |
| US2 AS4 | Card shows new value + dirty marker after edit | E2E + vitest |
| US3 AS1 | Tap Description → full-screen editor with raw Markdown | E2E `description-editor.mobile.spec.ts` |
| US3 AS2 | Save commits + dismisses + card re-renders | E2E + vitest round-trip |
| US3 AS3 | Cancel with dirty edit → discard-confirm dialog | E2E (Discard / Continue paths) |
| US4 AS1 | Sticky push bar appears when dirty | E2E `push.mobile.spec.ts` |
| US4 AS2 | Push runs same flow as desktop, conflict semantics match | Inherited from desktop `realWrite.spec.ts` |
| US4 AS3 | Bar hidden when no dirty edits (FR-010) | E2E + vitest |
| US5 AS1 | Browser install affordance works | **Manual + Lighthouse** (`installable-manifest`) |
| US5 AS2 | Standalone launch (no browser chrome) | E2E `pwa-offline.mobile.spec.ts` (display-mode override) |
| US5 AS3 | Offline empty state in card list area | E2E `pwa-offline.mobile.spec.ts` |
| US5 AS4 | Lighthouse PWA ≥ 90 | **CI gate** (`.github/workflows/backlog-navigator-lighthouse.yml`) |
| Edge — cross-mode rotation with dirty edit | Discard-confirm fires | E2E `editor-rotation.mobile.spec.ts` (Issue 1A regression) |

## Test commands

```sh
# Unit tests + selectors
cd apps/backlog-navigator && pnpm vitest run

# Mobile Playwright (all 3 viewports per the project matrix)
cd apps/backlog-navigator && node run-playwright.mjs mobile/

# Desktop parity (FR-023 / SC-008)
cd apps/backlog-navigator && node run-playwright.mjs --project=desktop

# Bundle budget guard
node scripts/check-bundle-size.mjs

# Lighthouse PWA gate (CI)
# Triggered automatically on PR; manual via gh workflow run.
```
