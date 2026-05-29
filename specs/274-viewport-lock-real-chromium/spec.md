# Feature Specification: Viewport lock holds under real Chromium (un-suppress `viewport-lock:103`)

**Spec**: `274-viewport-lock-real-chromium`
**Type**: Bug / Tech Debt
**Created**: 2026-05-28
**Status**: Draft
**Origin**: Quarantine created during PR #651 (spec 261) to keep CI green. The
failing assertion is suppressed via `test.fixme` and MUST be re-enabled here.

## Background

`apps/web-shell/playwright/tests/viewport-lock.spec.ts` contains the spec-260
acceptance test:

> **`locked map gestures (drag, scroll) leave viewport unchanged`** (was line 103)

It locks the map viewport via the padlock, performs a drag (200 px) and a
scroll-wheel zoom, and asserts the session-store `viewport` is byte-identical
before and after — i.e. the lock fully suppresses pan/zoom gestures.

This test **passes** under the cloud `@sparticuz/chromium` headless build used
for local development and `run-playwright.mjs`, but **fails under CI's real
Chromium** (`pnpm exec playwright install --with-deps chromium`). The observed
CI failure:

```
expect(received).toBe(expected)
Expected: {"coordinates":[…],"zoom":10}   // locked snapshot
Received: {"coordinates":[…],"zoom":12}   // after drag + scroll-wheel
```

So under real Chromium a *locked* map still responds to scroll-wheel zoom
(10 → 12) and drag-pan — the gesture-disable from spec 260 is not holding in
that environment. The test runs in two CI jobs (both gate merge):
`Web-Shell E2E` (`.github/workflows/e2e.yml`) and the `web-shell-pw` step of
`Test & Lint` (`.github/workflows/ci.yml`).

### What was suppressed (and where)

- File: `apps/web-shell/playwright/tests/viewport-lock.spec.ts`
- Change: `test('locked map gestures …')` → **`test.fixme('locked map gestures …')`**
- A `// SUPPRESSED (spec 274 …)` comment block sits directly above it.
- The other three viewport-lock tests (padlock toggle disables controls;
  plot-switch auto-unlock; `L` shortcut) are **not** suppressed and continue to
  pass.

### What this is NOT

- **Not** caused by spec 261 (the PR that quarantined it). Spec 261 touches no
  viewport-lock / `MapView` / `viewportLocked` plumbing, and this test passes
  4/4 with the spec-261 code under `@sparticuz`. The failure is a pre-existing
  real-Chromium divergence in the spec-260 lock; PR #651 merely surfaced it on
  the branch's CI.

## Why it likely diverges (hypotheses to confirm)

The lock works by disabling Leaflet's interaction handlers (`dragging`,
`scrollWheelZoom`, `doubleClickZoom`, `touchZoom`, `boxZoom`, `keyboard`) in a
`MapView` effect that reacts to `viewportLocked`. Candidate root causes:

1. **Race**: the test gestures immediately after the lock *banner* renders, but
   the handler-disable effect may not have run yet under real Chromium's timing
   (headless `@sparticuz` happens to win the race; real Chromium loses it).
2. **Real-Chromium wheel/drag semantics**: `page.mouse.wheel` / drag may drive
   Leaflet zoom/pan through a path the disable doesn't cover under real
   Chromium (e.g. smooth-wheel, inertia, or a handler re-enabled by a
   subsequent re-render).
3. **Re-render re-enables handlers**: a render after the lock (e.g. fitBounds
   settling, a store update) re-runs map setup and re-enables a handler.

## Requirements

- **FR-001**: Determine the real root cause under **real Chromium** (CI or a
  local real-Chromium install — NOT only `@sparticuz`). Reproduce the failure
  first.
- **FR-002**: Fix the viewport-lock product code (`MapView` /
  `LeafletToolbar` / the `viewportLocked` effect) so a locked map ignores
  scroll-wheel zoom and drag-pan under real Chromium. No silent partial lock.
- **FR-003**: Re-enable the assertion by changing `test.fixme(` back to
  `test(` in `viewport-lock.spec.ts`. Remove the `// SUPPRESSED (spec 274 …)`
  comment block.
- **FR-004**: If part of the failure is test-timing (hypothesis 1), harden the
  test to wait for the lock to be *effective* (e.g. poll until the Leaflet
  `dragging`/`scrollWheelZoom` handlers report disabled) before gesturing —
  but the product fix (FR-002) is the priority; do not paper over a real
  product gap with a test-only wait.

## Acceptance Criteria

- **AC-001**: `viewport-lock.spec.ts › locked map gestures (drag, scroll) leave
  viewport unchanged` passes under CI real Chromium (both `Web-Shell E2E` and
  the `Test & Lint` `web-shell-pw` step), with no `test.fixme`/`test.skip` on it.
- **AC-002**: A locked map demonstrably ignores scroll-wheel zoom and drag-pan
  in a manual real-Chromium check (or recorded evidence).
- **AC-003**: The other viewport-lock tests still pass (no regression).

## Notes / scope

- Scope is the single suppressed assertion + its product fix. Do not broaden to
  unrelated web-shell E2E specs.
- Cross-refs: spec 260 (viewport lock), PR #651 / spec 261 (created the
  quarantine), `docs/project_notes/decisions.md` (if a real-Chromium-vs-
  `@sparticuz` testing-environment ADR emerges from the investigation).
