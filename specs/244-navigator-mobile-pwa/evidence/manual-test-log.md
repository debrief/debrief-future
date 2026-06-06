# Manual-test log — knowingly under-tested items

Three spec items are documented as Playwright-untestable in
`plan.md §Issue 3A` and `tasks.md` T082. They are gated by manual
real-device smoke before any production deploy of #244. This file
records the protocol; reviewers / future maintainers should append
new entries here when re-running on a fresh device.

## SC-001 — ≥ 50 fps card list scroll on mid-tier mobile

**Why manual:** there is no fps API exposed to JavaScript that's both
reliable AND headless-driveable. Playwright cannot assert.

**Protocol:**
1. Open the deployed navigator URL on a mid-tier iPhone (target:
   iPhone 12 or newer), portrait, mobile Safari.
2. Wait for the card list to hydrate (~230 rows from current
   `BACKLOG.md`).
3. With Safari → Develop → Web Inspector → Timelines, record an FPS
   timeline.
4. Scroll continuously from top to bottom (1–2 seconds of finger drag).
5. Read the FPS timeline; the median frame rate during the scroll
   should be ≥ 50 fps.

**Last run:** _to be filled at first deploy_
**Device + OS:** _to be filled_
**Observed FPS:** _to be filled_

## US2 AS3 — iOS soft keyboard never covers the active input

**Why manual:** Playwright's headless browsers cannot drive the iOS
soft keyboard.

**Protocol:**
1. Open the navigator on an iPhone in portrait.
2. Tap a Category chip (or any chip whose editor uses a text input —
   the Status / Epic dropdowns don't trigger the soft keyboard).
3. Confirm the bottom sheet opens.
4. Tap inside the input field; the iOS soft keyboard appears.
5. Confirm the input field stays visible above the keyboard at all
   times. The sheet content scrolls if necessary; the keyboard never
   covers the input.

**Last run:** _to be filled at first deploy_
**Device + OS:** _to be filled_
**Observed:** _to be filled_

## SC-011 — Update prompt fires within 60 s of new deploy

**Why manual:** requires a real network round-trip to the deployed
service worker after a redeploy. CI cannot orchestrate this in a
single job.

**Protocol:**
1. Install the navigator as a PWA on a phone (Add to Home Screen).
2. Confirm it launches in standalone mode.
3. Trigger a new deploy of the navigator (any `apps/backlog-navigator/`
   change merged + auto-deploy).
4. Open the installed PWA from the home screen.
5. Within 60 seconds of launch, the "An updated Backlog Navigator is
   ready" banner should appear at the top of the viewport.
6. Tap Reload — the page should reload to the new version.

**Last run:** _to be filled after first post-#244 deploy_
**Device + OS:** _to be filled_
**Time-to-banner observed:** _to be filled_

---

If any of the three items fail in real-device testing, file a follow-up
issue and link it back to spec #244. The acceptance gate for
v1-of-mobile-PWA is "all three smoke checks pass at least once" — and
each new device family the team supports re-runs them.
