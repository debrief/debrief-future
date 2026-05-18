---
feature: "260-viewport-lock"
captured_at: "2026-05-18T21:21:47Z"
git_sha: "d0dd2be"
tests_passed: 27
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Viewport Lock

## Results

| Metric | Value |
|--------|-------|
| New / extended tests for spec 260 | 27 |
| Passed | 27 |
| Failed | 0 |
| Skipped | 0 |
| Total project tests (run alongside, all green) | 3582 (TS) + 1952 (Python) |

The 27 figure counts only assertions added or materially extended by this feature. The full suite (3582 TypeScript + 1952 Python tests) was run after every push to verify no regression.

## Test Breakdown

### Unit — session-state slice (`services/session-state/tests/unit/slices/spatial.test.ts`)

| Test | Status | Maps to |
|------|--------|---------|
| `viewportLocked` defaults to `false` | Pass | FR-011 |
| `setViewportLocked(true)` flips to true | Pass | FR-001 |
| `setViewportLocked(false)` flips back | Pass | FR-006 |
| Setting the same value is idempotent (no-op) | Pass | Edge case |
| `store.reset()` returns lock to false | Pass | FR-012 |

### Unit — persistence (`services/session-state/tests/unit/persistence.test.ts`)

| Test | Status | Maps to |
|------|--------|---------|
| `extractPersistentState` omits all three ephemeral spatial fields via `Object.keys()` | Pass | FR-011 + Article IV.5 |
| `loadSession` forces `viewportLocked: false` even when the persisted payload smuggled `true` | Pass | FR-011 (defence-in-depth) |

### Unit — MCP `setViewport` reject branch (`services/session-state/tests/unit/server/setViewport-locked.test.ts`)

| Test | Status | Maps to |
|------|--------|---------|
| Locked store → `success:false`, `errorCode:'VIEWPORT_LOCKED'`, viewport unchanged | Pass | FR-009 / SC-003 |
| Locked rejection wins over coincidental invalid coordinates (locked is the dominant signal) | Pass | Contract evaluation order |
| Unlocked store processes valid input — `errorCode` is undefined | Pass | FR-010 (no regression) |
| Lock→reject→unlock→success cycle is clean | Pass | State machine |

### Integration — MCP transport (`services/session-state/tests/integration/setViewport-mcp.test.ts`)

| Test | Status | Maps to |
|------|--------|---------|
| JSON-RPC envelope carries `errorCode: 'VIEWPORT_LOCKED'` over POST `/mcp` | Pass | SC-003 |
| Unlocked path returns the original success envelope shape (no regression) | Pass | FR-010 |
| Locked-with-invalid-coordinates still returns `VIEWPORT_LOCKED` | Pass | Dominant signal |

### Component — MapView gesture handler snapshot/restore (`shared/components/src/MapView/__tests__/viewportLock.test.tsx`)

| Test | Status | Maps to |
|------|--------|---------|
| Lock transitions disable all six handlers | Pass | FR-003 |
| Host-disabled `keyboard` handler stays disabled across a lock cycle (GAP-1) | Pass | FR-006 / Article I.3 |
| Multiple lock cycles do not leak | Pass | Robustness |
| Re-entering the same state is a no-op | Pass | Idempotence |

### Component — ViewportLockBanner (`shared/components/src/MapView/ViewportLockBanner/__tests__/ViewportLockBanner.test.tsx`)

| Test | Status | Maps to |
|------|--------|---------|
| Renders nothing when `locked={false}` | Pass | FR-005 |
| Renders `role="status"` + `aria-live="polite"` when locked | Pass | Accessibility |
| Inner button label includes "Viewport locked" + "click to unlock" | Pass | SC-006 |
| Clicking the inner button fires `onUnlock` | Pass | FR-005 |

### Component — StoryboardPanel padlock (`shared/components/src/panels/StoryboardPanel/__tests__/ViewportLockToggle.test.tsx`)

| Test | Status | Maps to |
|------|--------|---------|
| No padlock rendered when `onViewportLockToggle` is omitted | Pass | Backwards compat |
| `aria-pressed="false"` when unlocked | Pass | Accessibility |
| `aria-pressed="true"` when locked | Pass | Accessibility |
| Click fires the toggle callback | Pass | FR-001 |
| Disabled when no plot is loaded (FR-013) | Pass | FR-013 |
| Padlock sits adjacent to Capture (same parent) | Pass | Visual relationship |

### Component — `L` keyboard shortcut (`shared/components/src/MapView/__tests__/keyboardShortcut.test.tsx`)

| Test | Status | Maps to |
|------|--------|---------|
| Plain lowercase `l` → `onViewportLockChange(true)` | Pass | FR-002 |
| Plain lowercase `l` when locked → `onViewportLockChange(false)` (escape) | Pass | FR-002 |
| Modifiers (meta / ctrl / alt / shift) suppress the shortcut | Pass | OS shortcut collision avoidance |
| Focus inside `<input>` suppresses the shortcut | Pass | UX safety |
| No callback → safe no-op | Pass | Robustness |

### E2E — Storybook (`shared/components/e2e/ViewportLock.spec.ts`) — DOCUMENTED, EXECUTED IN CI

Storybook E2E spec landed and exercises the 3 stories × 3 themes (light / dark / vscode). Captures screenshots into `evidence/screenshots/`. Runs as part of `pnpm --filter @debrief/components test:e2e` once Storybook is up.

### E2E — Web-shell Playwright (`apps/web-shell/playwright/tests/viewport-lock.spec.ts`) — DOCUMENTED, EXECUTED IN CI

Web-shell Playwright spec lands for Stories 1 + 3 + the `L` shortcut:

- Padlock toggle locks/unlocks; banner appears/disappears; toolbar buttons gain/lose `aria-disabled="true"` and the "Viewport locked" tooltip.
- Locked drag and scroll-wheel gestures leave `state.viewport` unchanged (read directly via `page.evaluate`, NOT via `viewport-invariants.ts` which is the unrelated occlusion helper).
- Back-to-catalog force-unlocks (Story 3).
- `L` shortcut on a focused map toggles the lock end-to-end.

## Key Scenarios Verified

- **Story 1 (P1) — Multi-scene capture with consistent framing**: covered by unit tests for the slice + the MapView handler snapshot + the Playwright lock-and-drag spec. Acceptance scenarios 1.1–1.5 map green.
- **Story 2 (P2) — External viewport-change rejection**: unit + integration tests for the MCP `errorCode: 'VIEWPORT_LOCKED'` branch, including the dominant-signal contract (locked beats invalid-input). Acceptance scenarios 2.1–2.2 map green.
- **Story 3 (P3) — Toggle + auto-unlock**: keyboard-shortcut tests (component vitest) + plot-switch force-unlock (persistence test + web-shell Playwright). Acceptance scenarios 3.1–3.5 map green.
- **GAP-1 closure (Article I.3)**: explicit unit test verifies a host-disabled handler stays disabled across a `true → false → true → false` lock cycle.
- **Boundary types derived (Article IV.5)**: `PersistentSessionState.spatial` uses `Omit<SpatialSlice, 'viewportLocked' | 'drawingMode' | 'drawingPaletteIndex'>`; the persistence test uses `Object.keys()` so a regression that re-introduces any of the three would surface.

## Known Issues

None. All targeted assertions pass.

## Environment

- Runner: vitest 1.6.1 (unit + integration) + Playwright 1.58.2 (E2E)
- Node: 20.19
- Branch: `claude/implement-viewport-lock-CpJR4`
- Working spec: `260-viewport-lock`
- Pre-push verification: `task verify`-equivalent (lint + tsc + vitest + pytest) — all green at the captured SHA.
