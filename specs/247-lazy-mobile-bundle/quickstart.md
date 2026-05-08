# Quickstart: Verifying #247 locally

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This document is the minimum recipe to confirm the lazy-load split works as
intended on your local machine. It assumes the implementation is in place
(or you are reviewing a PR that claims it is). Total time: ~5 minutes.

---

## Prerequisites

- Node 20.x (per `.nvmrc` / project root)
- `pnpm` (workspace root)
- A clean checkout of the `247-lazy-mobile-bundle` work (or any branch with
  the spec implemented)

```sh
cd /home/user/debrief-future
pnpm install
```

## 1. Build the navigator and inspect the chunk graph

```sh
pnpm --filter @debrief/backlog-navigator build
ls apps/backlog-navigator/dist/assets/
```

**Expected**: at least two `.js` files in `dist/assets/`. One is the entry
chunk (`index-XXXXXX.js`), one is the mobile chunk (Vite/Rollup default
naming pulls from the dynamic-import source — typically named like
`CardList-YYYYYY.js` or a shared name like `mobile-YYYYYY.js`).

```sh
cat apps/backlog-navigator/dist/.vite/manifest.json | python3 -m json.tool
```

**Expected**: a JSON object. Find the entry: one entry has `"isEntry": true`.
That same entry's `dynamicImports` array should reference one or more
chunks under `src/components/mobile/`.

## 2. Run the bundle-budget guard

```sh
node scripts/check-bundle-size.mjs
```

**Expected**: exit code 0; stdout shows the entry chunk's gzipped size
(smaller than the pre-#247 baseline of 121 576 B) and lists all chunks with
`(entry)` / `(lazy)` annotations. Look for `OK: entry chunk within budget.`.

If you see `ERROR: manifest not found...` you forgot the build step in §1.

## 3. Verify the entry chunk does not contain mobile component identifiers

```sh
grep -l 'BottomSheetEditor\|MobileFilterBar\|CardList\b\|StickyPushBar' \
  apps/backlog-navigator/dist/assets/index-*.js \
  || echo "OK: no mobile component identifiers in entry chunk"
```

**Expected**: `OK: no mobile component identifiers in entry chunk`. The
identifiers should appear only in the lazy chunk(s). Note: identifiers in
the entry are minified, so look for the source-export names; they survive
when emitted as code-splitting boundary names.

## 4. Run the navigator locally

```sh
pnpm --filter @debrief/backlog-navigator preview
# or for hot-reload during development:
pnpm --filter @debrief/backlog-navigator dev
```

Open the URL in two browser windows:

- **Desktop window** (≥1024px wide). Open DevTools → Network. Reload.
  **Expected**: no request for any chunk whose path matches `mobile-*.js` or
  contains a mobile component name.
- **Mobile-emulated window** (DevTools → Device toolbar → iPhone 12, ~390px).
  Reload. **Expected**: a brief skeleton renders, then the card list. The
  Network tab shows the mobile chunk being requested.

## 5. Run the unit tests

```sh
pnpm --filter @debrief/backlog-navigator test
```

**Expected**: all tests pass, including the new
`__tests__/lazyBoundary.test.tsx` and
`__tests__/chunkErrorBoundary.test.tsx`.

```sh
node --test scripts/__tests__/check-bundle-size.test.mjs
```

**Expected**: all six fixture cases pass (within-budget, over-budget,
no-entry, multi-entry, missing-manifest, lazy-chunks-listed).

## 6. Run the Playwright E2E tests

Cloud or CI:

```sh
cd apps/backlog-navigator
node run-playwright.mjs lazy-mobile-chunk
```

Local (macOS/Windows with locally-installed Chromium):

```sh
pnpm --filter @debrief/backlog-navigator test:e2e lazy-mobile-chunk
```

**Expected**: all four scenarios pass —
1. Cold mobile load shows skeleton then card list.
2. Cold desktop load never requests mobile chunk.
3. Blocked mobile chunk shows recovery banner with reload action.
4. Resize across breakpoint lazy-loads chunk.

## 7. Verify the PWA precaches the mobile chunk

After §1, inspect the workbox manifest:

```sh
grep -E 'mobile|CardList|MobileFilter' apps/backlog-navigator/dist/sw.js \
  | head -5
```

**Expected**: at least one match, confirming the mobile chunk URL is in the
precache manifest. (The exact filename will be hash-suffixed.)

To verify offline behaviour interactively: start `preview`, open DevTools →
Application → Service Workers, "Update" and ensure activation. Then DevTools
→ Network → Throttling → Offline. Reload on a mobile-emulated viewport. The
skeleton-then-card-list should still render, served entirely from the
service-worker cache.

---

## Troubleshooting

- **Bundle guard fails with "exceeds budget"** after the split: this can
  legitimately happen if the entry-chunk size is still above the
  `baseline_bytes` × `(1 + current_budget_pct/100)` ceiling. Check the
  per-chunk listing — if the entry chunk is significantly smaller than
  121 576 B but the *guard* still says fail, the baseline file likely needs
  re-baselining to the post-split entry size (this is part of the
  implementation tasks; if you're reviewing pre-baseline, it should already
  reflect the new floor).
- **`mobile-*.js` not present in dist**: the lazy boundaries did not actually
  split. Check that `App.tsx` and `EditorOverlayProvider.tsx` use
  `React.lazy(() => import('...'))` (dynamic) and not static imports.
- **Skeleton flashes on desktop**: the lazy boundary is firing on desktop
  too. Check that the `<Suspense>` boundary in `App.tsx` is *inside* the
  `isMobile ? <>...</> : <>...</>` ternary, not wrapping it.
