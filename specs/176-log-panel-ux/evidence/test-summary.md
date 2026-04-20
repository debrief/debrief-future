---
feature: "176-log-panel-ux"
captured_at: "2026-04-19T14:23:13Z"
git_sha: "e755061"
tests_passed: 1600
tests_failed: 0
tests_skipped: 4
coverage_pct: null
---

# Test Summary: Analysis Log Panel — Rich Card UX

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 1604 |
| Passed | 1600 |
| Failed | 0 |
| Skipped | 4 |
| Coverage | not measured (gated on #209 axe audit) |

## Test Breakdown

### LogPanel — vitest component + unit suites (70 tests)

| Test File | Tests | Status |
|-----------|-------|--------|
| `ParameterChip.test.tsx` | 8 | Pass |
| `formatDuration.test.ts` | 7 | Pass |
| `formatTimestamp.test.ts` | 4 | Pass |
| `paramTypeInference.test.ts` | 19 | Pass |
| `ToolCategoryIcon.test.tsx` | 7 | Pass |
| `TrackBadge.test.tsx` | 3 | Pass |
| `LogActionBar.test.tsx` | 7 | Pass |
| `LogEntry.test.tsx` | 8 | Pass |
| `LogEntryEdgeCases.test.tsx` | 7 | Pass |

### Rest of the `@debrief/components` vitest suites (1530 tests)

All other component test suites continue to pass. Full run: 1600 passed,
4 skipped (see "Known Issues"), 0 failed.

### Playwright component E2E — `shared/components/e2e/LogPanel.spec.ts`

Spec authored as part of T017. Exercises three describe blocks:

| Test | Status |
|------|--------|
| `rich card rendering — timeline-default 3-row anatomy` | Pending (requires Storybook server) |
| `rich card rendering — all-categories (6 icons)` | Pending |
| `rich card rendering — edge-cases placeholders + multi-track` | Pending |
| `tab cycling — clicking each of the 4 tabs updates aria-selected` | Pending |
| `tab cycling — card selection toggles aria-selected + selected class` | Pending |
| `theme variants — timeline-default light theme evidence capture` | Pending |
| `theme variants — timeline-default vscode theme evidence capture` | Pending |
| `theme variants — edge-cases light theme evidence capture` | Pending |
| `theme variants — disabled-card light theme evidence capture` | Pending |

The Playwright component E2E is run locally via
`pnpm --filter @debrief/components test:e2e` (or
`CLAUDE_CODE=1 pnpm --filter @debrief/components test:e2e` in cloud
sessions). Screenshots produced by the theme-variant block populate
`specs/176-log-panel-ux/evidence/screenshots/` on successful runs. The
pnpm session used for this capture does not have a Storybook server
running, so these tests are marked Pending; they are not part of the CI
gate yet.

### Webview E2E (`tests/e2e/test-log-panel.spec.ts`)

| Test | Status |
|------|--------|
| All tests in `test.describe.fixme('Log Panel')` | Skipped (fixme) |

Converted from `describe.skip` to `describe.fixme` per Decision 9A so the
block is surfaced as a known-pending suite instead of silently dropped.
Unblocks when issue #143 ships.

## Key Scenarios Verified

- **Rich card anatomy** — each card renders a header row (step + category
  icon + tool name + optional rationale icon + badges), a meta row (track
  badges + timestamp + optional duration), and a params row or
  placeholder. Verified via `LogEntry.test.tsx`.
- **Category icons** — the five manifest categories (`import`, `style`,
  `calc`, `filter`, `snapshot`) and the neutral-grey fallback render the
  correct background colour, glyph, and `aria-label`. Verified via
  `ToolCategoryIcon.test.tsx`.
- **Parameter chips** — five chip types (`colour`, `number`, `boolean`,
  `range`, `enum`) render their type-specific icon prefix and formatted
  value; non-default values carry the red-dot marker with the
  `chipNonDefaultTooltip` aria-label. Verified via `ParameterChip.test.tsx`.
- **Overflow + placeholders** — `+N more` indicator appears when >5
  parameters; "No parameters" shows when the chip list is empty;
  "Manual checkpoint" shows on snapshot-category entries and the
  duration is suppressed. Verified via `LogEntryEdgeCases.test.tsx`.
- **Accessibility** — card root has `aria-selected` and step-numbered
  `aria-label`; 4-tab `role="tablist"` has exactly one `aria-selected`
  tab with roving `tabIndex`; `ArrowLeft`/`ArrowRight`/`Home`/`End`
  cycle and jump correctly. Verified via `LogActionBar.test.tsx` +
  `LogEntry.test.tsx`.
- **Timezone stability** — `formatTimestamp` emits `HH:MM:SS UTC`
  regardless of the input ISO 8601 timezone offset. Verified via
  `formatTimestamp.test.ts`.
- **Duration formatting** — whole seconds render as `X.Xs` (single
  decimal), sub-second values as `Xms`, combined h/m/s values without
  decimals. Verified via `formatDuration.test.ts`.
- **Disabled entries** — render at reduced opacity with a badge and
  remain clickable. Verified via `LogEntryEdgeCases.test.tsx`.
- **Track badges** — deleted features carry a suffixed aria-label using
  the `trackBadgeDeletedSuffix` i18n string. Verified via
  `TrackBadge.test.tsx`.

## Known Issues

- Four `@debrief/components` tests are skipped by design
  (`nl-cql2/__tests__/*` harnesses that require external fixtures).
  Unrelated to this feature.
- Webview E2E (`tests/e2e/test-log-panel.spec.ts`) remains `.fixme`
  pending issue #143 (webview iframe selector instability in
  openvscode-server).
- A11y audit (`#209`) — `@axe-core/playwright` run against all LogPanel
  stories in all themes is a proposed follow-up; not part of this
  feature.

## Environment

- Runner: vitest (unit + component), Playwright (component E2E)
- Branch: `claude/implement-speckit-176-bLhvF`
- Date: 2026-04-19
- Node: 20.x, pnpm: 9.x
