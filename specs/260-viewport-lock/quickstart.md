# Quickstart: Viewport Lock

**Date**: 2026-05-18
**Spec**: [spec.md](./spec.md)

This page tells a reviewer how to verify the viewport lock works end-to-end, in both the web-shell and VS Code, in under 10 minutes.

---

## Prereqs

- Local dev environment up (`pnpm install` + `uv sync` already run).
- A sample plot loadable from `preview/workspace/samples/local-store/` (any plot with at least three minutes of track data — the existing sample fixtures are fine).

---

## Path A — Web-shell (5 minutes)

The web-shell is the primary E2E surface; everything observable here is also observable in VS Code.

```bash
pnpm --filter @debrief/web-shell dev
# Open http://localhost:5173/
```

### Story 1 — Locked multi-scene capture

1. Open any plot from the catalog.
2. Pan and zoom until you've framed a clear region of interest.
3. In the **Storyboard panel** (right column), click the **🔒 padlock** button (sibling of Capture).
4. Verify the **on-map banner** appears along the top of the map: "🔒 Viewport locked — click to unlock".
5. Verify the **toolbar buttons** (zoom-in, zoom-out, fit-to-window) are visibly disabled. Hover one — tooltip reads "Viewport locked".
6. Try every inert gesture: **drag the map**, **scroll-wheel zoom**, **double-click**, hold Shift and drag a **box-zoom**, and use **arrow keys** (with the map focused). Nothing should move.
7. Click **Capture**. A scene appears in the list.
8. Move the **time slider** forward by ~5 minutes. The map content updates (tracks advance) but the centre/zoom do not.
9. Click **Capture** again. Second scene.
10. Repeat for a third capture.
11. **Verify**: the three scene thumbnails along the right edge all show the same framing — same coastline, same orientation — and differ only in time-dependent track content. This is SC-001.

> **Note for automated verification (Story 1 in the Playwright spec)**: the test asserts the same property in a hermetic way by reading each captured scene's `properties.viewport.coordinates` directly from the session store (via `page.evaluate(...)`) and comparing the three coordinate arrays for exact equality. **Do NOT use `apps/web-shell/playwright/helpers/viewport-invariants.ts`** for this assertion — despite its name, that helper checks map-control *occlusion* during a flow, not viewport equality across captured scenes.

### Story 3 — Auto-unlock on plot switch

12. With the lock still on, open a different plot from the catalog.
13. **Verify**: the padlock button is back to its unlocked state; the banner is gone; drag the new map — it pans. This is FR-012 / SC-004.

### Keyboard shortcut

14. With focus on the map, press **`L`**. Banner appears (or disappears if already locked). Press again to toggle back.

---

## Path B — VS Code extension (3 minutes)

```bash
pnpm --filter @debrief/vscode build
# Press F5 in VS Code to launch the Extension Development Host
```

15. Open the same sample plot via the catalog file tree.
16. Repeat steps 2–10 from Path A. The behaviour is identical.

---

## Path C — MCP `setViewport` reject (2 minutes)

This verifies FR-009 / SC-003.

17. With a plot open and the lock **on**, send an MCP `session.setViewport` call (the easiest way is via the MCP inspector or by running the `services/session-state` test suite with `pnpm --filter @debrief/session-state test`).
18. **Verify** the response has:
    ```json
    {
      "success": false,
      "error": "Viewport is locked — unlock to change view.",
      "errorCode": "VIEWPORT_LOCKED"
    }
    ```
19. **Verify** `store.getState().viewport` is unchanged.
20. Turn the lock off. Repeat the same `setViewport` call. **Verify** `success: true` and `errorCode` is absent — no regression on the unlocked path (FR-010).

---

## What to look for

| Check | Expected | Spec reference |
|-------|----------|----------------|
| 3+ scenes with identical framing | Visual identity, no perceptible drift | SC-001 |
| Every locked gesture inert | 0 viewport changes from 7 listed gestures | SC-002 |
| MCP rejects with stable code | `errorCode === 'VIEWPORT_LOCKED'` | SC-003 |
| Plot/session switch clears lock | Padlock returns to open state | SC-004 |
| Unlocked path unchanged | Pre-feature gestures + toolbar behaviour | SC-005 |
| Lock state discoverable | Banner + tooltips explain "why" within 10s | SC-006 |

---

## Cleanup

Nothing to clean up — the lock is runtime state. Closing the plot or refreshing the page resets to unlocked. Saved `.debrief.json` files do **not** contain the lock state (FR-011); a session saved while locked loads back unlocked. This is verifiable by saving while locked, reopening the file, and observing the unlocked initial state.
