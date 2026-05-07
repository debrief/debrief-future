# Phase 0 Research: Lazy-load Backlog Navigator mobile component tree

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Status**: All NEEDS CLARIFICATION resolved.

This document records the three open questions identified by the planning step
and the chosen resolution for each. Each entry follows the
**Decision / Rationale / Alternatives** format.

---

## R-1 — How should the bundle-budget guard identify the desktop entry chunk after code-splitting?

**Question**: `scripts/check-bundle-size.mjs` currently sums every JS file in
`apps/backlog-navigator/dist/assets/*.js`. After this feature lands there will
be two (or more) JS chunks: the desktop entry, and the lazy-loaded mobile
chunk. The spec (FR-007) requires the budget gate to track the **desktop entry
chunk** alone — otherwise the split moves bytes between chunks without
reducing the measured number, defeating the ticket.

### Decision

Have Vite emit a build manifest by setting `build.manifest = true` in
`apps/backlog-navigator/vite.config.ts`. Vite writes
`dist/.vite/manifest.json`, where each chunk has a structured entry with an
`isEntry: true` flag on the application's entrypoint. The guard script reads
this manifest, identifies the entry chunk (single entry — there is one `index.html`
script tag), gzips just that file, and compares against the baseline.

The script continues to print **all** chunks (entry + lazy chunks) for human
review, with the entry chunk highlighted. Only the entry chunk's gzipped size
is checked against the budget.

### Rationale

- **Stable contract.** Vite's manifest is the documented public surface for
  asset graph identification (used by SSR servers, Rails/Laravel integrations,
  etc.). It is more stable than parsing `index.html` for the script tag, which
  could break if Vite changes inlining behaviour for tiny entries.
- **Zero new dependencies.** The manifest is JSON; the guard already uses
  `node:fs/promises` and `JSON.parse`.
- **Self-explanatory output.** Printing all chunks alongside the entry-chunk
  number lets reviewers see the split is real (mobile chunk appears in the
  list) and that the entry shrunk.
- **No behavioural change for unrelated callers.** The script still reads
  `bundle-baseline-244.json`, still exits 0/1/2 with the same semantics, still
  takes no CLI arguments — CI invocation is unchanged.

### Alternatives considered

- **Sum all chunks (status quo, no script change).** Rejected: defeats the
  spec entirely. The split would mechanically *not* reduce the measured
  number.
- **Parse `dist/index.html` for the entry script tag.** Workable but more
  fragile. Vite occasionally inlines small modules into the HTML for warm-cache
  hydration; the manifest is the canonical source.
- **Add a separate budget for mobile chunk.** Rejected as scope creep: the
  spec governs the *desktop* budget. A mobile budget can be a follow-up if
  measurement justifies one.
- **Use `rollup-plugin-visualizer`.** Rejected: it is a profiling tool, not a
  CI gate, and would add a dev dependency for no incremental value over the
  manifest.

### Re-baselining note

After the split lands, the existing `baseline_bytes` (121576) becomes obsolete
— it was measured pre-split as the sum of all JS. The guard's first
post-split run will measure only the entry chunk, which will be lower than
121576, so it will pass. The implementation tasks include a step to **re-baseline
to the post-split entry-chunk size** so future PRs gate against the correct
floor. The bump is recorded in the baseline file's `notes` field with the
commit SHA of the re-baseline.

---

## R-2 — Where is the right place to put the lazy boundary, given that `EditorOverlayProvider.tsx` statically imports two mobile components?

**Question**: A naive lazy boundary in `App.tsx` would lazy-import
`CardList`/`MobileFilterBar`/`StickyPushBar` but leave the entry chunk pulling
in `BottomSheetEditor` and `DescriptionEditorScreen` because
`apps/backlog-navigator/src/editors/EditorOverlayProvider.tsx` (lines 19–20)
imports them statically and renders them unconditionally inside the provider.
Without addressing that, the desktop entry would still ship roughly half of
the mobile subtree.

### Decision

Apply lazy boundaries at **both** call-sites:

1. **`App.tsx`** — wrap the mobile-mode render block (the `isMobile ? <>...</>`
   branch) in `<ChunkErrorBoundary><Suspense fallback={<MobileSkeleton/>}>...</Suspense></ChunkErrorBoundary>`,
   and convert the three direct imports
   (`CardList`, `MobileFilterBar`, `StickyPushBar`) to `React.lazy(() => import(...))`.

2. **`EditorOverlayProvider.tsx`** — convert the two static imports
   (`BottomSheetEditor`, `DescriptionEditorScreen`) to `React.lazy(...)`, and
   change the render block (lines 342–349) to mount them only when
   `isMobile` is true, wrapped in a `<Suspense fallback={null}>` (the editors
   are off-screen until activated; no visible fallback is needed). Mobile-only
   gating is safe here: the description-editor logic for desktop lives in
   another file (the `DiscardConfirmModal` is shared and stays inline; the
   discard-confirm has no module-level dependency on the mobile editors).

This pulls every module under `src/components/mobile/*` out of the entry
chunk. The desktop user pays for none of it; the mobile user fetches the
chunk once on cold load and the editors lazy-mount within the chunk on first
activation (effectively free at that point — the chunk is already loaded).

### Rationale

- **Honest split.** With both call-sites converted, the entry chunk genuinely
  contains zero modules from `src/components/mobile/*`, satisfying FR-001
  unambiguously.
- **No behavioural change for users.** The provider's rotation guard, dirty
  prompt, and editor lifecycle all continue to work — they only mount when
  the user is on a mobile viewport, which is exactly when those editors can
  be opened in the first place.
- **Preserved testability.** The provider's existing `isMobileOverride` prop
  (used by tests to force a mode synchronously without `matchMedia`) keeps
  working. Tests that import the editors directly bypass the lazy boundary.
- **Single chunk, not two.** Vite/Rollup naturally collapses dynamic imports
  that share most of their dependencies into one shared chunk by default
  (manualChunks left at the default). All seven mobile modules end up in a
  single `mobile-XXXXXX.js`, cleanly cached as one PWA precache entry.

### Alternatives considered

- **Lazy boundary only in `App.tsx`.** Rejected: leaves
  `BottomSheetEditor`/`DescriptionEditorScreen` in the entry chunk because of
  the provider's static imports. Would deliver maybe half of the available
  saving.
- **Refactor `EditorOverlayProvider` to *not* render the editors at all
  (move the mounts into the mobile branch of `App.tsx`).** Cleaner in the
  abstract but a larger architectural refactor than the ticket warrants
  (~0.5 dev-day budget). The provider keeps the editor-state machine and the
  rotation-discard guard logic together, which is the whole reason it exists;
  splitting that across `App.tsx` would scatter the logic. The lazy-mount-when-mobile
  pattern keeps the existing structure intact.
- **Use Vite `manualChunks` to force the split.** Rejected as redundant —
  `React.lazy` + dynamic `import()` already triggers Rollup chunk-splitting
  automatically. Manual chunking would only be needed if we wanted finer
  control over which mobile sub-modules end up where, which is not required.

---

## R-3 — How should chunk-load failures and PWA caching be handled?

**Question**: Code-splitting introduces a new failure mode: the lazy chunk
URL embedded in the running session's main bundle can become stale (404 after
a fresh deploy) or unreachable (network drop). The spec (FR-005, FR-006)
requires (a) graceful recovery on failure and (b) offline reload after a
prior online visit. Both must be addressed concretely.

### Decision

**Failure recovery** — add a minimal class-component error boundary
(`ChunkErrorBoundary`) around the `<Suspense>` boundaries. It catches
errors thrown by the lazy import (`ChunkLoadError` from webpack/Vite, or any
async `import()` rejection) and renders a recovery panel with:

- A clear message explaining that part of the app couldn't load
- A "Reload" button that calls `window.location.reload()`
- Reuses the existing `StatusBanner` styling for visual consistency

The boundary distinguishes **chunk-load** errors from arbitrary render errors
by checking `error.name === 'ChunkLoadError'` or that the error message
matches `/Loading chunk \d+ failed|Failed to fetch dynamically imported module/`.
Other render errors are re-thrown so they reach the global error handler
(none currently exists; behaviour is unchanged for non-chunk errors).

**PWA caching** — verify that the existing `vite-plugin-pwa` workbox
configuration in `apps/backlog-navigator/vite.config.ts` (lines 42–43) already
includes `**/*.js` in `globPatterns`. It does. No config change needed; the
new mobile chunk is precached on first install of the service worker. A
Playwright assertion in the cold-mobile-load test confirms the chunk is in
the precache manifest after `vite build`.

### Rationale

- **No new dependencies.** React's built-in class-component error boundary
  pattern is the documented way to catch errors from lazy children. No need
  for `react-error-boundary` or similar.
- **Stale-deploy recovery is the dominant failure mode.** When workbox swaps
  in a new precache entry on a fresh deploy, it invalidates the old chunk
  URL embedded in the still-running tab. The "Reload" action triggers the
  new SW to take over (the navigator already uses workbox's prompt-based
  update flow per `vite.config.ts:38` `registerType: 'prompt'`). Reload
  fetches the fresh entry chunk + fresh chunk URLs in one go.
- **Offline reload works for free.** Workbox's default `globPatterns` covers
  all built JS; the mobile chunk is precached on first online visit. A
  user opening the navigator offline after that visit sees the chunk served
  from cache.
- **First-ever-offline visit is correctly out of scope.** A user installing
  the PWA and opening it for the first time while offline cannot fetch
  anything (it's an inherited limitation of code-split + PWAs); the spec's
  Edge Cases section already calls this out.

### Alternatives considered

- **No error boundary, rely on `Suspense` fallback indefinitely.** Rejected:
  on chunk failure, the skeleton would be shown forever with no recovery
  path. Violates Constitution Article I.3 (no silent failures).
- **Show a toast and auto-retry.** Rejected as overkill for the current
  estimate (~0.5 dev-day) and risks an infinite loop if the chunk is
  permanently unavailable. A user-driven Reload is the simplest robust
  recovery.
- **Add `runtimeCaching` for the chunk URL.** Rejected as redundant —
  precaching covers the offline case; runtime caching would only help if the
  chunk were *not* precached, which it is.
- **Use `react-error-boundary`.** Rejected per Article IX (no new
  dependencies when the standard pattern suffices).

---

## Summary

All three planning questions are resolved with no new runtime or dev
dependencies, no constitutional violations, and a clear path to satisfying
every functional requirement and success criterion in the spec. Phase 1
artefacts (data-model.md, contracts, quickstart) are ready to be written.
