# Usage Example: Viewport Lock

**Spec**: [260-viewport-lock](../spec.md) · **Branch**: `claude/implement-viewport-lock-CpJR4`

The pitch in 60 seconds: lock the map so a capture series shares one frame.

## See it work

Open the web-shell with the Storyboard rail enabled:

```bash
pnpm --filter @debrief/web-shell dev
# → http://localhost:5173/?storyboardPanel=1
```

1. **Pick a plot** from the catalog (any of the bundled samples).
2. **Pan and zoom** until the framing tells the story you want to tell.
3. **Click the padlock** in the Storyboard panel header (immediately left of Capture). The padlock flips to `🔒` and `aria-pressed="true"`; an unmistakable banner appears along the top of the map:
   > 🔒 Viewport locked — click to unlock
4. Try to **drag the map**. Nothing moves. Try the **scroll-wheel** — nothing. Try **double-click** — nothing. Hover the toolbar's **zoom-in** button — the tooltip says "Viewport locked" and the click is short-circuited. (Six gesture handlers — drag, scrollWheel, doubleClick, touch, box, keyboard — go inert at the same moment.)
5. **Capture a scene**. The Capture button is unaffected; a new scene lands in the rail with the framing you locked.
6. **Move the time slider forward** five minutes. The tracks update; the framing does not.
7. **Capture again**. And again. Three scenes, all sharing one centre and one zoom.
8. **Press `L`** with focus on the map. The lock toggles off. The banner disappears, the toolbar wakes up, gestures return.

## What just shipped

| Surface | Before | After |
|---------|--------|-------|
| `MapView` | Six handlers always live; toolbar always enabled. | While locked: six handlers disabled (snapshot-and-restore so a host-pre-disabled handler stays off); toolbar zoom/fit visibly disabled with native title tooltip. |
| `StoryboardPanel` header | Capture only. | Padlock toggle sibling of Capture, `aria-pressed` mirrors store. |
| MCP `session.setViewport` | Silently mutates the viewport. | Rejects with `{ success: false, errorCode: 'VIEWPORT_LOCKED' }` when locked; unchanged on unlocked path. |
| `.debrief.json` | Not affected by this feature. | Still not affected — `viewportLocked` is excluded structurally via `Omit<SpatialSlice, 'viewportLocked' \| 'drawingMode' \| 'drawingPaletteIndex'>`. Sessions always load unlocked. |

## Verify automatically

```bash
# Unit tests for the foundation + UI + shortcuts
pnpm --filter @debrief/session-state test
pnpm --filter @debrief/components test

# MCP-transport integration
pnpm --filter @debrief/session-state test -- setViewport-mcp

# Storybook E2E (3 stories × 3 themes — screenshots into evidence/)
pnpm --filter @debrief/components test:e2e ViewportLock

# Web-shell Playwright (lock → drag-is-inert → unlock → drag-works again)
cd apps/web-shell && node run-playwright.mjs viewport-lock
```

## Inspect the MCP reject envelope

A locked-rejection sample is checked in at [`evidence/mcp-locked-response.json`](./mcp-locked-response.json). Reproduce it inline:

```bash
curl -sX POST http://localhost:3000/mcp \
  -H 'content-type: application/json' \
  -d '{"tool":"session.setViewport","input":{"coordinates":[
    {"longitude":-5,"latitude":55},
    {"longitude":5,"latitude":55},
    {"longitude":5,"latitude":50},
    {"longitude":-5,"latitude":50}
  ]}}'
```

Locked store returns:

```json
{
  "success": false,
  "error": "Viewport is locked — unlock to change view.",
  "errorCode": "VIEWPORT_LOCKED"
}
```

Unlocked store returns:

```json
{
  "success": true,
  "viewport": { "coordinates": [ ... ] },
  "center": { "longitude": 0, "latitude": 52.5 }
}
```

## Things the lock does NOT do

- It does NOT change the captured scene shape. A scene's `viewport` property is unchanged by this feature.
- It does NOT persist into `.debrief.json`. Save while locked, reopen — the file loads unlocked.
- It does NOT gate every internal viewport-mutation site — only the externally-callable MCP tool. The UI cannot trigger the host-internal sites while locked (that scoping is recorded in the audit doc at `docs/project_notes/viewport-mutation-audit.md` Section E, and the cross-host guard layer is queued as backlog #262).
- It does NOT affect the Capture command. You can capture whether the lock is on or off; the lock is a workflow modifier, not a precondition.
