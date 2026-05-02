<!--
Cached opener for the 244-navigator-mobile-pwa feature post.
Written during /speckit.plan; read by /speckit.pr at ship time.
-->

## Hook

| Before (#242 desktop only) | After (#244 mobile parity) |
|---|---|
| 12-column table, unusable below ~900px | Virtualised card list at 375x812 |
| Inline cell editors that require a mouse | Tap-to-edit bottom sheets with thumb-reach controls |
| Top-bar Push button lost behind horizontal scroll on phones | Sticky bottom Push-Changes bar, always visible |
| Browser tab only — no install, no offline shell | Installable PWA, offline app shell, "update available" banner |

![Backlog Navigator on iPhone, iPad portrait, and desktop side by side](screenshots/multi-viewport-hero.png)

## What We're Building

The Backlog Navigator now works on a phone. The same app a reviewer uses on a desktop during planning sessions also opens on an iPhone during a stand-up and on an iPad over coffee — without losing a single workflow. Below 1024px we swap the 12-column table for a virtualised card list, replace inline cell editors with tap-to-edit bottom sheets, push long-form Description edits into a full-screen Markdown editor, and pin the "Push Changes" action to a sticky bottom bar where a thumb expects it.

There is one codebase, one Vite build, one parser, one state model, one GitHub push pipeline. The mobile and desktop layouts diverge once — at the top of `App.tsx`, behind a `useLayoutMode()` hook — and converge again on the same `BACKLOG.md` output. Story 1 and Story 2 from #242 now pass at 375x812, 768x1024, and 1024x768. Lighthouse PWA scores 90 or better. Install it on a phone home screen and it launches like a native app.

## How It Fits

This is the second half of #242 (Backlog Navigator). #242 proved the pattern — parse `BACKLOG.md`, edit in-app, push back to GitHub via the REST API, reconcile in the browser. #244 extends that pattern to every device an analyst already carries, without forking the codebase. It sits inside `apps/backlog-navigator/`: no sibling app, no new top-level package. The parser, state reducer, and push pipeline under `src/` are byte-for-byte unchanged. The new code lives in `src/components/mobile/`, `src/hooks/`, and `src/pwa/`. It mirrors the responsive-app philosophy already in place for the Spec Navigator (#191) and lands the navigator alongside the other always-available analyst surfaces in the Future Debrief estate.

## Key Decisions

- **Single responsive app, not a sibling mobile codebase.** A sibling app would have split the parser, state model, and push pipeline across two repos and doubled the test surface. We branch once on `matchMedia('(min-width: 1024px)')` and share everything below the branch.
- **PWA via `vite-plugin-pwa` (Workbox).** First-class Vite tooling, generates the manifest, registers the service worker, and exposes `virtual:pwa-register` for an explicit "update available" banner — no silent reloads. Recorded as ADR-029.
- **Two-zone cache: shell precached, GitHub fetches network-only.** Stale backlog data would be a trap, so we never cache it. Offline means the shell renders with a clear "backlog data unavailable" empty state — honest about what works and what doesn't.
- **Hand-rolled bottom-sheet gesture (~80 lines of Pointer Events + transform).** Per Article IX we only reach for `vaul` if the hand-roll proves brittle. So far it isn't.
- **Virtualised card list via `@tanstack/react-virtual`** — already in the monorepo from #094, so zero new dependency cost.
- **CI gates the regression risk.** Multi-viewport Playwright runs Story 1 and Story 2 at all three viewports, a Lighthouse PWA gate fails the build below 90, and a bundle-size budget guard fails if desktop gzipped JS grows by more than 15% versus the pre-#244 baseline.
