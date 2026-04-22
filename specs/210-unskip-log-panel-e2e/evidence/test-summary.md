---
feature: "210-unskip-log-panel-e2e"
captured_at: "2026-04-22T20:48:49Z"
git_sha: "0a5b008a"
tests_passed: 0
tests_failed: 0
tests_skipped: 3
coverage_pct: null
---

# Test Summary: Un-skip Webview Log-Panel E2E Suite

> **Important — read before interpreting counts.** This feature shipped via the
> FR-005 / R7(b) escape hatch: the three reactivated tests surfaced two real,
> deterministic failure modes on the first live run, and per the spec's
> no-silent-re-skip policy the implementer filed a new blocker (#509) and
> applied per-test `test.fixme(…, 'pending #509 …')` rather than silently
> re-skipping onto the long-closed `#143`.
>
> Counts reflect the shipped state: 0 passed / 0 failed / 3 skipped (via
> `test.fixme`). SC-002 and SC-003 in `spec.md` were designed for the happy
> path and are deferred to the follow-up feature that closes #509. SC-001
> is satisfied in spirit (no suite-level skip, no stale `#143` reference);
> the strict grep form is partially satisfied (per-test `test.fixme` for
> #509 is, by design, exempt from the stale-marker ban).

## Results

| Metric | Value |
|--------|-------|
| Total Tests (discovered) | 3 |
| Passed | 0 |
| Failed | 0 |
| Skipped (via `test.fixme` → #509) | 3 |
| Coverage | N/A (test-infrastructure feature) |

## Test Breakdown

### `tests/e2e/test-log-panel.spec.ts` — three code-server webview E2E tests

| Test | Status | Failure Mode (first live run) | Routed to |
|------|--------|------------------------------|-----------|
| Log Panel › log panel shows empty state when no tools have run | `test.fixme` | Webview frame with `[data-testid="log-panel"]` not discoverable within 15 s after `openPlotViaStacTree` | [#509](https://github.com/debrief/debrief-future/issues/509) — failure mode 1 |
| Log Panel › running a tool creates a log entry | `test.fixme` | `.leaflet-interactive` features never render in map webview within 15 s | [#509](https://github.com/debrief/debrief-future/issues/509) — failure mode 2 |
| Log Panel › log entries are shown most recent first | `test.fixme` | Same as above — `.leaflet-interactive` not visible | [#509](https://github.com/debrief/debrief-future/issues/509) — failure mode 2 |

### Environment-sanity baseline (not part of the reactivated suite)

| Test | Status |
|------|--------|
| `tests/e2e/test-stac-stores.spec.ts` T050 | Pass |
| `tests/e2e/test-stac-stores.spec.ts` T051 | Pass |
| `tests/e2e/test-stac-stores.spec.ts` T052 | Pass |

These three green results (captured in `playwright-run.txt` during Phase 1
T002 substitution) rule out environment-level regressions — openvscode-server,
the bundled Debrief VSIX, the `@sparticuz/chromium` runner, and the STAC-tree
navigation helpers (`openPlotViaStacTree`'s upstream path) all function in
the same sandbox.

## Key Scenarios Verified

- **US1 — suite-level reactivation contract**: `test.describe.fixme`/`skip`
  removed, stale `#143` comment removed, Playwright runner discovers the
  three tests and reports them explicitly as pending (not silently
  dropped). Policy-level win preserved: SC-001's qualitative spirit is met.
- **US2 — dead-marker hygiene (adjusted)**: grep for
  `(\.describe\.fixme|\.describe\.skip|#143|// blocked)` returns zero
  matches. Only surviving `test.fixme` entries reference the *new* blocker
  `#509`, not the closed `#143`. See the appended hygiene block inside
  `playwright-run.txt`.
- **Failure-mode documentation (R7(b))**: two distinct failure modes
  isolated in `playwright-run.txt` and recorded in issue #509 with
  reproduction steps — no information loss in the hand-off.
- **Environment viability**: `test-stac-stores.spec.ts` 3/3 green in the
  exact same preview proves the infrastructure path is healthy, so #509
  can focus on the specific LogPanel-webview-iframe / Leaflet-render
  root causes rather than chasing environmental red herrings.

## Known Issues

- **#509** (new blocker): `LogPanel webview iframe not discoverable + map
  features absent after openPlotViaStacTree` — carries the detailed
  failure modes, a likely root-cause theory for failure mode 1 (research
  R5 palette-string nit), and the reproduction command. Blocks SC-002
  and SC-003 for this feature.
- The three tests are `test.fixme(true, 'pending #509 — …')` — Playwright
  will continue to flag them as pending in every CI run until #509 ships.
  This is the loud-signal behaviour the feature's policy stance mandates,
  not a regression.

## Environment

- Runner: Playwright (npx playwright test) via `tests/e2e/playwright.config.ts`
- Branch: `claude/speckit-specify-210-uRbqr` (spec dir `specs/210-unskip-log-panel-e2e/`)
- Chromium: Google Chrome for Testing 145.0.7632.6 (build 1208, bundled via `@sparticuz/chromium`)
- VS Code server: code-server v4.116.0 serving the prebuilt `apps/vscode/debrief-vscode-0.1.0.vsix`
- Platform: Ubuntu 24.04 LTS, sandboxed cloud session
- Date: 2026-04-22

## Related Artefacts

- `playwright-run.txt` — raw Playwright terminal output (two captures appended: first live-run with real failures, re-run after `test.fixme` applied showing 3 skipped) + SC-001 hygiene grep block.
- `stability-run.txt` — SC-003 deferral rationale.
- `diff.patch` — the reactivation edit: `describe.skip` → `describe` + three per-test `test.fixme` references to #509. Net 34-line diff, single file.
- `usage-example.md` — reviewer-facing "how to reproduce" demo.
