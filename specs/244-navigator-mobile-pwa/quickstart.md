# Quickstart — Backlog Navigator Mobile Parity (#244)

How to bring up the mobile path locally and exercise it the same way CI
does. Assumes the #244 branch is checked out and `pnpm install` /
`uv sync` have been run from the repo root.

---

## 1. Run the app in mobile-emulation mode (no install needed)

```sh
pnpm --filter @debrief/backlog-navigator dev
```

Vite serves the navigator at `http://localhost:5173/`. To exercise mobile
layout in a desktop Chrome/Firefox without a phone:

1. Open DevTools → Toggle Device Toolbar (`Ctrl+Shift+M` / `Cmd+Shift+M`).
2. Choose **iPhone 13** (375 × 812). The card list should render; the
   table layout should disappear.
3. Click a card's status chip → the bottom sheet should slide up.
4. Click the Description region → the full-screen editor should open.
5. Make any edit → the sticky bottom Push-Changes bar should appear.
6. Resize the device toolbar to **iPad Mini Portrait (768 × 1024)** —
   still card list. Resize to **iPad Mini Landscape (1024 × 768)** —
   should switch to desktop table.

> **Note**: Vite dev mode does **not** register the service worker
> (`vite-plugin-pwa` runs in `devOptions: { enabled: false }`). Use
> Section 2 to test the SW.

## 2. Run the production build + preview (PWA install path)

```sh
pnpm --filter @debrief/backlog-navigator build
pnpm --filter @debrief/backlog-navigator preview
```

The preview server runs at `http://localhost:4173/`. This is the path that
Lighthouse and CI use, and it's where the service worker is active.

To install the PWA:

- **Chrome/Edge desktop**: address bar shows the install icon (a small
  monitor with a down-arrow). Click it.
- **Android Chrome**: open the URL on your phone (use ngrok / tailscale
  / your network's IP), three-dot menu → "Add to Home screen".
- **iOS Safari**: Share menu → "Add to Home Screen". (No native install
  prompt; this is iOS's only path — see R-13.)

To test offline:

1. Install the PWA (above).
2. With the installed app open, throttle the network to **Offline**
   (DevTools → Network → Offline checkbox).
3. Reload. The app shell should render. The card list should show:
   "Backlog data unavailable — you're offline."

To test the update prompt:

1. Note the current `dist/sw.js` content hash.
2. Make any change to `src/App.tsx` and rebuild.
3. Reload the preview window. Within ~5 seconds an "Update available"
   banner appears.
4. Click Reload → the banner shows "Updating…" and the page reloads.

## 3. Run the mobile E2E tests

### Cloud session (Claude Code on the web)

```sh
cd apps/backlog-navigator
node run-playwright.mjs mobile/
```

This auto-extracts `@sparticuz/chromium` and runs the new specs at all
three target viewports. (See `docs/project_notes/playwright-installation-research.md`
for why this is the cloud-correct path.)

### Local desktop

```sh
pnpm --filter @debrief/backlog-navigator test:e2e mobile/
```

Or, for one viewport only:

```sh
pnpm --filter @debrief/backlog-navigator test:e2e mobile/ --project=mobile-iphone
```

### Run the full suite (mobile + desktop + a11y)

```sh
pnpm --filter @debrief/backlog-navigator test:e2e
```

The desktop suite (`browse / interaction / a11y / realWrite / prMode`)
should still pass at `1280×720` after this feature lands (FR-023).

## 4. Run the Lighthouse PWA gate locally

```sh
pnpm --filter @debrief/backlog-navigator build
pnpm --filter @debrief/backlog-navigator preview &
PREVIEW_PID=$!
sleep 2
pnpm dlx @lhci/cli autorun --config apps/backlog-navigator/.lighthouserc.json
kill $PREVIEW_PID
```

Reports land in `.lighthouseci/`. The PWA category must be ≥ 0.90.

In CI: `.github/workflows/backlog-navigator-lighthouse.yml` runs the
above on every PR that touches `apps/backlog-navigator/**` or
`shared/components/**`.

## 5. Verify the bundle-size budget

```sh
pnpm --filter @debrief/backlog-navigator build
node scripts/check-bundle-size.mjs
```

Output:
```
Pre-244 baseline (gzipped):  87,410 bytes
Current build (gzipped):     94,221 bytes
Headroom:                    13,810 bytes (15.8% allowed; 7.8% used)
PASS
```

If the script fails, the `dist/assets/*.js` total has exceeded baseline ×
1.15 — investigate in `dist/assets/` (Vite emits per-chunk filenames with
content hashes; `du -h` ranks them by size).

## 6. Round-trip byte-stable check (regression guard)

The Vitest gate from #242 / #245 verifies that mobile-originated edits
produce byte-identical output:

```sh
pnpm --filter @debrief/backlog-navigator test
```

Look for `liveBacklog.roundtrip.test.ts` (or its #245 successor) — must
pass after this feature lands.

## 7. Constitution gate

```sh
task verify
```

Runs lint + typecheck + unit tests + Playwright across the monorepo.
Required before pushing.

> **Cloud network heads-up** (CLAUDE.md): if `pnpm install` 403s on the
> registry, set Network access = Trusted in `claude.ai/code` env settings,
> then start a fresh session.

## Common issues

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Card list doesn't appear in DevTools mobile mode | DevTools device emulation only changes UA + viewport, but `matchMedia` listens to actual layout viewport. Toggle the Device Toolbar and ensure viewport reads `375` not `1024`. | Choose a preset device or set Responsive ≤ 1023 px. |
| Bottom sheet doesn't drag closed | Pointer events not captured. Check `setPointerCapture` was called on `pointerdown`. | See R-5; review `BottomSheet.tsx`. |
| Lighthouse PWA score = 0 | SW not registered (dev mode) or manifest missing. | Use `pnpm preview`, not `pnpm dev`. |
| iOS install adds a generic icon | `<link rel="apple-touch-icon">` missing from `index.html`. | See `contracts/pwa-manifest.md` § iOS-specific augmentation. |
| `update-available` banner never fires | New build wasn't published or browser cached `sw.js`. | Hard-reload (`Shift+R`) once; subsequent reloads use SW. |
| Sticky push bar covered by iOS home bar | `viewport-fit=cover` missing or `env(safe-area-inset-bottom)` not in CSS. | Check `index.html` `<meta name="viewport">` and `mobile.css`. |
