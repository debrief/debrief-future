# Mockup 06 — PWA states (US5, 375 × 812)

> Two states: (a) installed PWA launched offline showing the empty state,
> (b) "update available — reload?" affordance after a SW update.

## State A — installed PWA launched offline

```
┌──────────────────────────────────────────────────┐ ← 375 × 812
│                                                  │  no browser chrome
│                                                  │  (display: standalone)
│  ☰  Backlog Navigator              👤  ⚙        │
├──────────────────────────────────────────────────┤
│  🔍  Search backlog…                          ╳  │  search disabled
├──────────────────────────────────────────────────┤
│  Phase: ▾ any        ☐ Include completed         │  filters disabled
├══════════════════════════════════════════════════┤
│                                                  │
│                                                  │
│                       ⚪                          │  offline glyph
│                                                  │
│       Backlog data unavailable                   │  empty state
│                                                  │
│       You're offline. Reconnect to               │  per FR-019
│       load items.                                │
│                                                  │
│       ┌─────────────────────────────┐           │
│       │      Try again              │           │  retry button
│       └─────────────────────────────┘           │  (re-attempts fetch)
│                                                  │
│                                                  │
│              ─── home bar ───                    │
└──────────────────────────────────────────────────┘
```

### Notes

- The app **shell** loads (HTML/JS/CSS/icons cached by SW). Only the
  data fetch fails.
- No white screen, no console error visible to user.
- "Try again" calls the same fetch path as the initial load — when the
  device comes back online, this hydrates the list.
- `data-testid="offline-empty-state"` on the wrapper for the E2E gate
  in T068.
- The dirty edits from a previous (online) session are still in
  `localStorage` if any; we just can't show the cards behind them. Reviewer
  decision: should we show "1 unsynced edit (offline)" in the push bar
  even when offline so the user knows their work isn't lost? (Push bar is
  hidden per FR-010 when no rows are present, but with an empty list we
  can't show row-attached dirty markers.)

## State B — "update available — reload?"

```
┌──────────────────────────────────────────────────┐
│                                                  │  no browser chrome
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐ │  banner — non-modal,
│  │  ✨  An updated Backlog Navigator is ready│ │  appears at top of
│  │                                            │ │  viewport (above any
│  │      ┌─────────┐    ┌─────────────────┐   │ │  scroll position)
│  │      │ Reload  │    │     Dismiss     │   │ │
│  │      └─────────┘    └─────────────────┘   │ │
│  └────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│  ☰  Backlog Navigator              👤  ⚙        │
├──────────────────────────────────────────────────┤
│  🔍  Search backlog…                          ╳  │
├──────────────────────────────────────────────────┤
│  Phase: ▾ Active     ☐ Include completed         │
├──────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐ │
│ │ #244     [Feature]              [10] V·M·A   │ │
│ │  …                                           │ │
│ └──────────────────────────────────────────────┘ │
│  …                                               │
└──────────────────────────────────────────────────┘
```

### Notes

- Banner sits at the top of the viewport, above the app chrome. Pushes
  the rest of the layout down by ~64 px.
- Both buttons ≥ 44 px tall.
- "Reload" calls `workbox.messageSkipWaiting()` then `location.reload()`.
- "Dismiss" closes the banner for this session only — on next page
  navigation, `onNeedRefresh` re-fires (no persistence; per
  contracts/service-worker.md "Dismiss behaviour").
- During the reload itself, the banner switches to "Updating…" with a
  spinner. The reload typically completes within 1 second so this is
  rarely observed.

## State C — currently NOT covered (just for awareness)

The browser-native install affordance ("Add to Home Screen" on iOS;
chrome's install icon on Android) is **not** drawn here because we don't
control its appearance. Per Assumption A-3, we use the OS default rather
than capturing `beforeinstallprompt` and rendering our own.

iOS users may need a brief in-app help link explaining "Tap the share
icon → Add to Home Screen". This is a **Phase 7 task T068 / T091**
decision, not a mockup decision.

## Open questions

1. **Update banner placement**: top of viewport (current draft) or as a
   small chip in the bottom-right corner (less intrusive)? Current draft
   prioritises discoverability.

2. **Offline retry button label**: "Try again" or "Retry"? Current draft =
   "Try again" (gentler).

3. **iOS install help link**: do we ship a small in-app "How to install
   on iOS" link, or rely on documentation outside the app?
