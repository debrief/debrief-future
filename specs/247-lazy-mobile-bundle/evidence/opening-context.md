## Hook

| Before | After |
|---|---|
| Desktop entry chunk ships every mobile-only component | Mobile subtree split into a separate chunk, fetched only on small viewports |
| Bundle guard summed all chunks — splitting just shifted bytes | Guard reads the Vite manifest and measures the entry chunk alone |
| Approaching the +30% cap committed in #244's baseline | Re-baselined to the post-split entry size; future PRs gate against the real floor |

## What We're Building

The Backlog Navigator runs as a single SPA, but its mobile components — CardList, ItemCard, BottomSheet, the two editor screens, StickyPushBar, MobileFilterBar — are dead weight on a desktop session. Until now they all rode along in the entry chunk that every visitor downloads on first paint. With the navigator's mobile PWA shipped in #244, that subtree had grown enough to push the desktop bundle towards the +30% cap we'd committed to in `scripts/bundle-baseline-244.json`.

This change code-splits the mobile subtree behind two `React.lazy` boundaries so a desktop visitor never pays for code they will never render. A mobile visitor sees a `SkeletonLoader` shimmer for the brief moment the chunk is in flight, and a `ChunkErrorBoundary` catches the gnarlier failure modes (stale deploys, flaky networks, Safari's idiosyncratic error message) and offers a Reload button rather than a blank screen.

## How It Fits

The bundle-budget guard introduced in #244 is the enforcement mechanism for our "first paint stays cheap" commitment, and it's where the interesting work lives. Splitting code is straightforward; making the *guard* honest about what it measures is the part that actually defends the saving over time. We flip Vite's `build.manifest` flag, teach `scripts/check-bundle-size.mjs` to identify the entry chunk from `dist/.vite/manifest.json`, and gzip-measure only that file. Without this step, simply moving bytes between chunks would satisfy the old guard while leaving the desktop visitor exactly where they started.

## Key Decisions

- **Two lazy boundaries, not one.** The naive split — wrapping `CardList` in `App.tsx` and stopping there — leaves half the mobile subtree in the entry chunk because `EditorOverlayProvider` statically imports both editor screens and renders them unconditionally. Splitting in both `App.tsx` and `editors/EditorOverlayProvider.tsx` was the only configuration that actually moved the editors out.
- **Manifest-aware measurement.** Vite's manifest is the canonical source of truth for "which file is the entry"; relying on filename heuristics or summing `dist/assets/*.js` would be fragile. Turning on `build.manifest = true` costs nothing and makes the guard precise.
- **Re-baseline rather than ratchet down quietly.** `bundle-baseline-244.json` is updated in this PR to the post-split entry-chunk size. The byte drop is the SC-001 evidence; from here on, regressions are measured against the new floor, not the inflated old one.
- **Zero new dependencies.** `React.lazy` and `Suspense` are React 18 built-ins, the manifest is built into Vite, and the PWA precache from #244 picks up the new chunk automatically. The skeleton fallback reuses `@debrief/components`'s existing `SkeletonLoader` rather than introducing a second shimmer primitive.
- **Loud failures over silent ones.** A class-component error boundary catches `ChunkLoadError`, `Failed to fetch dynamically imported module`, and Safari's `Importing a module script failed`, and shows a Reload button. Constitution I.3 forbids swallowing these — a stale deploy on a phone needs to surface, not stall behind a permanent skeleton.
