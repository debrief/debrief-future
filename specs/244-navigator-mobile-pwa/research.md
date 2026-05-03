# Research — Backlog Navigator Mobile Parity (#244)

Phase 0 output. Resolves all `NEEDS CLARIFICATION` markers from the plan's
Technical Context (there were none) and records the design-time decisions
the implementation must follow.

---

## R-1. PWA tooling: `vite-plugin-pwa` (Workbox-backed)

**Decision**: Adopt `vite-plugin-pwa@^0.20` as a dev-dep of
`apps/backlog-navigator/`.

**Rationale**:
- Project already uses Vite 5.x; `vite-plugin-pwa` is the de-facto Vite
  integration for Workbox (Google's PWA library), with first-class support
  in Vue, SvelteKit, Astro, Solid, and React communities.
- Solves three problems we'd otherwise hand-roll:
  1. **Manifest emission** — the plugin reads a typed config in
     `vite.config.ts` and emits `manifest.webmanifest` into `dist/` with
     correct `Content-Type` and the correct `<link>` injected into
     `index.html`.
  2. **Service worker generation** — the plugin runs Workbox's
     `generateSW` mode, producing a precache manifest of the build output
     and a runtime-cache strategy for the GitHub raw fetch.
  3. **Update lifecycle** — the plugin's `virtual:pwa-register` virtual
     module gives us `onNeedRefresh` and `onOfflineReady` callbacks; we
     surface these to React via `pwa/registerSW.ts`.
- Bundle cost: ≈ 6 KB gzipped runtime + the SW itself (≈ 8 KB gzipped). Well
  within the FR-024 budget (≤ +15% of pre-#244 baseline).
- Active maintenance, MIT-licensed, no proprietary dependencies — passes
  Article IX.3 (no vendor lock-in).

**Alternatives considered**:
- **Hand-rolled SW + hand-emitted manifest**: Rejected. ~200 LoC of glue
  for cache-naming, version-detection, precache-manifest generation,
  scope-correctness, plus the manifest emitter. We'd reinvent Workbox
  badly.
- **`@vite-pwa/assets-generator` only (no Workbox SW)**: Rejected — gives
  us icons + manifest but no SW; offline shell still needs a SW.
- **Workbox `injectManifest` mode (custom SW source file)**: Considered; we
  don't currently need a custom SW (no push, no background-sync). Stay on
  `generateSW` mode unless a future feature requires custom logic.

**ADR**: To be recorded as **ADR-029 — PWA tooling for the Backlog
Navigator** in `docs/project_notes/decisions.md` during implementation. The
ADR will reference this research note as primary rationale.

---

## R-2. Service-worker caching strategy

**Decision**: Two-zone strategy.

**Zone A — App shell**: `precache + cacheFirst`. The Vite build output
(HTML, JS, CSS, fonts, icons) is precached at install time. Subsequent
visits serve from cache, with a stale-while-revalidate update check on
each navigation.

**Zone B — GitHub data fetch**: `networkOnly`. We deliberately do **not**
cache responses from `api.github.com` or `raw.githubusercontent.com`.

**Rationale**:
- Caching `BACKLOG.md` would create a stale-data trap: the user could open
  the installed PWA, see yesterday's backlog, and not realise. Spec Edge
  Case ("must NOT display stale data without clearly indicating it is
  stale" — FR-019) makes this explicit.
- `networkOnly` for the GitHub fetch means: when offline, the fetch fails;
  the app catches the failure and renders the "backlog data unavailable"
  empty state (FR-019).
- App-shell caching is what makes the install + cold-start budget
  achievable (SC-007: < 1.5 s offline cold-start to shell-ready).

**Alternatives considered**:
- **`networkFirst` for GitHub**: Rejected — would still cache responses
  silently and risk stale-data display.
- **`staleWhileRevalidate` for GitHub**: Tempting but worse — paints stale
  data first, then revalidates; user has no signal the data is stale.

---

## R-3. Update protocol (when a new SW version is detected)

**Decision**: Use `registerType: 'prompt'` (not `autoUpdate`). When the SW
detects a waiting version, it fires `onNeedRefresh`; we render an
`<UpdatePrompt>` banner with "Update available — reload?" buttons. On
confirm, we call `updateSW(true)` which `skipWaiting()`s the new SW and
reloads the page.

**Rationale**:
- `autoUpdate` would silently reload the page mid-session, losing unsaved
  edits. Unacceptable given the dirty-edit model.
- `prompt` puts the user in control. Spec FR-020: "MUST surface an 'update
  available' affordance ... reload to the new version on user
  confirmation."
- The banner sits above the sticky push bar but below the card list
  scroll; both can coexist on the same screen.

**Alternatives considered**:
- **`autoUpdate`**: Rejected — unsafe with dirty edits.
- **No update prompt; rely on browser refresh**: Rejected — explicitly
  forbidden by FR-020 ("Silent stale-version persistence is forbidden").

---

## R-4. Responsive breakpoint mechanism

**Decision**: A single `useLayoutMode()` React hook that wraps
`window.matchMedia('(min-width: 1024px)')`. Returns `'desktop' | 'mobile'`,
with SSR-safe initial value `'desktop'` (the navigator never SSRs, but the
hook is defensive).

The hook is consumed once in `App.tsx`. Below that branch, every component
is layout-mode-naive — they don't know whether they're inside the desktop
table or the mobile card. CSS handles intra-mode adaptation (e.g. card
content reflowing within `375–1023px`).

**Rationale**:
- Single source of truth → no two-component drift.
- `matchMedia` over `window.innerWidth` because matchMedia fires on
  breakpoint crossings (rotation, devtools resize) without polling.
- Hook returns a string, not a boolean, so future modes (e.g. compact
  desktop) extend without API churn.

**Alternatives considered**:
- **CSS-only responsive (display: none on the inverse layout)**: Rejected
  — would render BOTH trees in the DOM and mount BOTH virtualisers,
  doubling memory and breaking ref-based selectors in tests.
- **Per-component `useMediaQuery()`**: Rejected — multiple subscriptions
  to the same media query, and individual components could fall out of
  sync mid-render.

---

## R-5. Bottom-sheet gesture: hand-roll vs. `vaul`

**Decision**: **Hand-roll** the gesture, target ~80 LoC inside
`BottomSheet.tsx`. Re-evaluate `vaul` only if the hand-roll proves brittle
during E2E testing. (Confirms spec Assumption A-6 and Article IX guidance
in the source idea doc.)

**Implementation outline**:
- Pointer Events (`pointerdown` → `pointermove` → `pointerup` with
  `setPointerCapture`).
- Track `dragStartY`, `currentY`, compute `deltaY = currentY - dragStartY`.
- Apply `transform: translateY(${deltaY}px)` while `deltaY > 0`; ignore
  upward drag.
- On `pointerup`: if `deltaY > 80px` OR velocity > 0.5 px/ms → close (animate
  to `translateY(100%)` + 200 ms ease-out, then unmount).
- Otherwise → snap back (animate to `translateY(0)` + 200 ms ease-out).
- Honour `prefers-reduced-motion` — replace animation with instant snap.

**Rationale**:
- `vaul` adds ~12 KB gzipped for one component.
- The gesture surface is small and well-bounded.
- Hand-roll keeps the dep count down (Article IX) and gives us full
  control over haptic-free, reduced-motion-respecting behaviour.

**Alternatives considered**:
- **`vaul`**: Reserved as the fallback if hand-roll proves brittle. Re-test
  matrix: iOS Safari rubber-band, Android Chrome scroll containment, drag
  while keyboard open.
- **Framer Motion `useDrag`**: Rejected — Framer Motion is ~40 KB
  gzipped, way out of budget for one gesture.

---

## R-6. Card-list virtualisation

**Decision**: `@tanstack/react-virtual@^3` (already in monorepo via #094).
Use `useVirtualizer` with `estimateSize` derived from a sample card render
(~120 px on phones, ~140 px on tablets due to wider Description wrapping).
`overscan: 4` for smooth scroll.

**Rationale**:
- Already paid the bundle cost; using it directly costs zero new deps.
- Active maintenance (TanStack), used by hundreds of projects.
- Variable-height support handles Description-driven row growth without
  layout thrash.

**Alternatives considered**:
- **`react-window` / `react-virtuoso`**: Rejected on Article IX — adding
  a second virtualisation library when one already exists.
- **No virtualisation, rely on browser scroll**: Rejected — at 230 rows the
  card list is `230 × 120 = 27,600px` of DOM; on a low-end phone this
  drops scroll fps below SC-001.

---

## R-7. Full-screen Markdown editor

**Decision**: A dedicated full-viewport React overlay component
(`<DescriptionEditorScreen>`) using `position: fixed; inset: 0; z-index:
1000`. Header bar with Cancel + Save; body is a `<textarea>` filling the
remaining height with `font-family: ui-monospace`. Live preview is **not**
included — the user types raw Markdown, saves, and sees the rendered
output back on the card.

**Rationale**:
- Spec User Story 3: "showing the raw Markdown source in an editable
  textarea with monospace font."
- Live preview would split the screen and force smaller font on phones —
  worse UX.
- Discard confirmation (FR-009) is a simple `confirm()` or styled overlay
  — implementation detail, not a research decision.

**Alternatives considered**:
- **Inline expand-in-place editor**: Rejected — the card grows to
  obscure the entire viewport anyway; full-screen overlay is cleaner.
- **CodeMirror or Monaco for the editor**: Rejected — both are 200+ KB
  gzipped; the textarea is sufficient for plain Markdown editing.
- **Side-by-side editor + preview**: Rejected — fails the readability
  bar at `375x812`.

---

## R-8. Sticky push bar + safe-area handling

**Decision**: `position: fixed; bottom: 0; left: 0; right: 0`. Padding-bottom
uses `env(safe-area-inset-bottom)` so iOS home-bar areas don't occlude the
button. The bar mounts conditionally based on
`state.dirtyCount > 0 && layoutMode === 'mobile'`.

**Rationale**:
- `env(safe-area-inset-bottom)` is the standard CSS for iOS safe-area
  awareness; supported in iOS Safari 11.2+ (well within target).
- Bar visibility tied to dirty count → no permanent screen-real-estate
  cost when there's nothing to push (FR-010, Story 4 acceptance #3).

**Alternatives considered**:
- **Bar always present**: Rejected — wastes ~64 px of screen height when
  there's nothing to do.
- **Floating action button (FAB) instead of bar**: Rejected — FABs
  obscure card content; a bar is only present when needed and lays out
  predictably.

---

## R-9. Multi-viewport Playwright projects

**Decision**: Add three projects to `apps/backlog-navigator/playwright.config.ts`:

```ts
projects: [
  // existing 'desktop' project at 1280x720 — UNCHANGED
  { name: 'mobile-iphone', use: { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } } },
  { name: 'tablet-portrait', use: { ...devices['iPad Mini'], viewport: { width: 768, height: 1024 } } },
  { name: 'tablet-landscape', use: { ...devices['iPad Mini landscape'], viewport: { width: 1024, height: 768 } } },
]
```

The two new spec files in `e2e/mobile/` use Playwright's `testMatch` so
they only run against the three mobile projects, not against the desktop
default.

**Rationale**:
- One viewport-axis configuration site, three test runs per spec.
- `devices['iPhone 13']` brings touch + user-agent; we override viewport
  so the project name is meaningful.
- Existing desktop specs run only on the desktop project, no regression.

**Alternatives considered**:
- **`test.use({ viewport })` inside specs**: Rejected — duplicates the
  three viewport literals across files; harder to add a fourth viewport
  later.
- **Separate playwright.config.mobile.ts**: Rejected — splits CI runs
  unnecessarily.

---

## R-10. Lighthouse CI gate

**Decision**: New GitHub Actions workflow
`.github/workflows/backlog-navigator-lighthouse.yml`:

1. `pnpm install`
2. `pnpm --filter @debrief/backlog-navigator build`
3. Start the Vite preview server (`pnpm --filter ... preview &`)
4. `pnpm dlx @lhci/cli autorun --config apps/backlog-navigator/.lighthouserc.json`
5. Workflow fails if PWA category < 90.

`.lighthouserc.json` config:
```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4173/"],
      "settings": { "preset": "desktop", "emulatedFormFactor": "mobile" }
    },
    "assert": {
      "assertions": {
        "categories:pwa": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

**Rationale**:
- @lhci/cli is Google's reference implementation; pinning to 0.13.x.
- `--config`-driven asserts mean CI failure is byte-clear in the workflow
  output.

**Alternatives considered**:
- **Manual Lighthouse via Chrome DevTools**: Rejected — no CI gate
  (FR-022).
- **`web-vitals` + custom assertions**: Rejected — doesn't measure the
  PWA category specifically.

---

## R-11. Bundle-size budget enforcement

**Decision**: Add `scripts/check-bundle-size.mjs` (Node) that:

1. Reads every `dist/assets/*.js` after `vite build`.
2. Gzips each (Node `zlib.gzipSync`, level 9).
3. Sums the gzipped sizes.
4. Compares against `scripts/bundle-baseline-244.json` (committed at
   implementation time, captured from a build of `main` immediately before
   the #244 PR is opened).
5. Fails if total > baseline × 1.15.

The script runs as a CI step after `vite build` in the existing CI workflow
(piggy-back on the existing `task verify` chain — no new workflow needed).

**Rationale**:
- FR-024 / SC-010 require the budget; without enforcement the budget is
  aspirational.
- One-shot Node script is ~40 LoC, no new dep.
- Baseline file is committed, so the budget is self-describing in git
  history.

**Alternatives considered**:
- **`size-limit`**: Rejected — adds a dep and a config language for what
  is fundamentally a `du -b *.js | gzip | sum` operation.
- **Webpack-bundle-analyzer-style HTML reports**: Rejected — informative
  but not a gate.

---

## R-12. Backlog test fixture (#245 dependency handling)

**Decision**: Mobile Playwright tests use the same fixture path as #245
introduces — `apps/backlog-navigator/e2e/fixtures/backlog-fixture.md` —
**if** that path exists at implementation time. Otherwise, the mobile
specs read from `BACKLOG.md` directly (matching the existing spec
behaviour pre-#245 fix), with a clear migration note in the spec file
header.

**Rationale**:
- The two efforts are independently mergeable.
- We don't want #244 to block on #245 or vice versa.
- The migration is a one-line `path.resolve` change once #245 lands.

**Alternatives considered**:
- **Block #244 on #245**: Rejected — #244 is the higher-priority feature
  per backlog scores.
- **Duplicate the fixture inside #244**: Rejected — would create two
  fixtures to keep in sync.

---

## R-13. iOS PWA install affordance

**Decision**: **Document, don't automate**. iOS Safari does not surface a
"native" install prompt the way Android Chrome does — the user must use
Share → Add to Home Screen. We add a `README.md` section + a short
`/help` panel inside the app explaining this on first iOS visit.

**Rationale**:
- Spec Assumption A-3: "no native install prompting" — relies on browser
  affordance.
- iOS doesn't expose `beforeinstallprompt`; we can't capture it.
- Suppressing the in-app help on iOS would require UA sniffing, which is
  fragile and out-of-scope.

**Alternatives considered**:
- **Custom in-app banner ("Tap Share, then Add to Home Screen")** with
  illustration: Considered. Defer to a follow-up if user feedback shows
  install confusion. Today, in-app help text suffices.

---

## R-14. PWA icon set

**Decision**: Three icons, all maskable + any-purpose, generated from a
single 1024×1024 source SVG (existing `apps/backlog-navigator` favicon
upscaled + padded for safe-zone).

| File | Size | Purpose |
|------|------|---------|
| `public/icon-192.png` | 192×192 | Android home-screen, manifest min size |
| `public/icon-512.png` | 512×512 | Android splash screen, manifest large size |
| `public/apple-touch-icon.png` | 180×180 | iOS home-screen (Safari ignores manifest icons; reads `<link rel="apple-touch-icon">`) |

**Rationale**:
- 192 + 512 are the minimum two sizes Lighthouse requires for the PWA
  audit (else the gate fails at "manifest icons of correct size").
- iOS reads `apple-touch-icon` from `<link>`; without it, iOS uses a
  generated screenshot — looks ugly.
- One source SVG → three rasters keeps the asset pipeline trivial.

**Alternatives considered**:
- **Many sizes (48/72/96/144/192/256/384/512)**: Rejected — Lighthouse
  doesn't require them and the manifest gets noisier.
- **Vector-only icon**: Rejected — Android home-screen rasterises at
  install time and benefits from explicit raster assets.

---

## Out-of-scope items (deferred)

- **Pull-to-refresh gesture**: Native browser pull-to-refresh handles this
  fine; custom implementation not warranted.
- **Background sync of edits**: Out of scope per spec Assumption A-1.
- **Push notifications**: Out of scope per spec.
- **Share-target API**: Out of scope per spec.
- **`vaul` library**: Reserved as the bottom-sheet fallback; not added
  yet.

---

## Open questions

**None.** All Technical Context fields resolved; all 14 research items have
explicit decisions. Implementation can proceed to Phase 1 (data-model,
contracts, quickstart).
