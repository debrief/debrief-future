# Quickstart — Active-Storyboard Selection Persistence

**Feature**: #237
**Audience**: Implementer (developer / AI agent) picking up `/speckit.tasks`

This is the runbook for delivering #237. It assumes you've read
`spec.md`, `plan.md`, `research.md`, `data-model.md`, and the contract
at `contracts/active-storyboard-selection-store.ts`. Everything below
is "where to put what" plus the test mappings.

---

## TL;DR

1. Add a typed interface in `@debrief/components`.
2. Implement two adapters — one Node-backed (VS Code), one
   `localStorage`-backed (web-shell).
3. Wire the VS Code adapter into `storyboardPlayback.ts` at two
   points: `onPlotOpened` (read) and `setActiveStoryboard` (write).
4. Wire the web-shell adapter into `StoryboardPanelMount.tsx` at two
   points: an init `useEffect` (read) and the `onActiveStoryboardChange`
   callback (write). Thread `itemPath` from `App.tsx`.
5. Add the new web-shell adapter file to the existing
   `no-direct-persistence-in-frontend` ESLint exception list.
6. Vitest for each adapter, RTL for the web-shell mount, service-test
   for the VS Code playback service, one Playwright E2E.

---

## Files you will touch

### NEW

| Path | Purpose |
|------|---------|
| `shared/components/src/storyboard/activeStoryboardSelectionStore.ts` | Typed interface + key-encoding / JSON-map helpers (`encodeMap`, `decodeMap`). Interface re-exported from `shared/components/src/storyboard/index.ts`. |
| `shared/components/src/storyboard/__tests__/activeStoryboardSelectionStore.test.ts` | Unit tests for `encodeMap` / `decodeMap`, plus the parameterised conformance suite from the contract (used by both adapter tests). |
| `apps/vscode/src/services/activeStoryboardSelectionStoreVscode.ts` | Node adapter — reads/writes the `activeStoryboardSelections` preference via `@debrief/config`'s `getPreference` / `setPreference`. JSON-stringifies the map; tolerates malformed values (data-model V-1). |
| `apps/vscode/src/services/__tests__/activeStoryboardSelectionStoreVscode.test.ts` | Vitest unit tests against an in-memory fake of `@debrief/config` (or a tmpdir-backed real one if simpler). Runs the conformance suite. |
| `apps/web-shell/src/services/activeStoryboardSelectionStoreWebShell.ts` | Browser adapter — reads/writes `localStorage["debrief.activeStoryboardSelections"]`. JSON-stringifies; tolerates malformed; catches `QuotaExceededError` and `SecurityError`. |
| `apps/web-shell/src/services/__tests__/activeStoryboardSelectionStoreWebShell.test.ts` | Vitest unit tests in a jsdom env; mocks `localStorage` to inject failures (quota, security). Runs the conformance suite. |
| `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts` | Single Playwright E2E covering US1 happy path + US2 stale-fallback. Page object: extend the existing `AnalysisPage` (no new page object). |

### MODIFIED

| Path | Change |
|------|--------|
| `apps/vscode/src/services/storyboardPlayback.ts` | (a) Constructor / `onPlotOpened` accepts an `ActiveStoryboardSelectionStore` and an `itemPath: string` resolved from `EditSessionManager.resolveStoreContext(documentUri)`. (b) After the existing `state.activeStoryboardId = active?.properties.id ?? null` (around line 265), call `store.get(itemPath)`; if non-null and present in `plot.features`, overwrite `state.activeStoryboardId`. (c) In `setActiveStoryboard` (around line 360), after the existing `state.activeStoryboardId = storyboardId` write, call `store.set(itemPath, storyboardId)`. Both calls are inside try/catch — but the adapter's contract says it never throws, so the catch is a belt-and-braces no-op log. |
| `apps/vscode/src/extension.ts` (or wherever `StoryboardPlaybackService` is constructed today) | Inject the new `ActiveStoryboardSelectionStoreVscode` adapter at construction time. |
| `apps/web-shell/src/StoryboardPanelMount.tsx` | (a) New prop `itemPath: string`. (b) New prop `selectionStore: ActiveStoryboardSelectionStore` (or — preferred — construct the singleton once in `App.tsx` and pass it down, so unit tests can inject a fake). (c) Replace `const [activeOverrideId, setActiveOverrideId] = React.useState<string | null>(null)` with an effect that runs on `(itemPath, plot)` change, calls `selectionStore.get(itemPath)`, validates the return against `plot.features`, and seeds `activeOverrideId` accordingly. (d) In every `setActiveOverrideId(storyboardId)` call site (around lines 320–325 and 361), follow with `selectionStore.set(itemPath, storyboardId)`. (e) The existing useEffect at lines 214–218 that resets stale overrides also calls `selectionStore.clear(itemPath)` if appropriate (resolves V-2 self-heal). |
| `apps/web-shell/src/App.tsx` | Pass `currentPlot.itemPath` and the `ActiveStoryboardSelectionStoreWebShell` singleton (constructed once at module init) to `<StoryboardPanelMount>`. |
| `shared/components/src/storyboard/index.ts` | Re-export the interface (`ActiveStoryboardSelectionStore`, `ItemPath`, `StoryboardId`) from `activeStoryboardSelectionStore.ts`. |
| `shared/eslint-rules/no-direct-persistence-in-frontend.cjs` | Add `apps/web-shell/src/services/activeStoryboardSelectionStoreWebShell.ts` to the existing override list (alongside `stacWriterIdb.ts` and `stacWriterCapability.ts`) so the adapter file may use `localStorage`. |

---

## How a developer reads this in 30 seconds

```text
StoryboardPanel (shared, unchanged)
  ▲     ▲
  │     │ activeStoryboardId / onActiveStoryboardChange
  │     │
StoryboardPanelMount (web-shell, MODIFIED)        StoryboardPlaybackService (VS Code, MODIFIED)
  ▲                                                 ▲
  │ selectionStore.get/set on mount + change        │ selectionStore.get/set on open + override
  │                                                 │
ActiveStoryboardSelectionStoreWebShell (NEW)      ActiveStoryboardSelectionStoreVscode (NEW)
  ▲                                                 ▲
  │ implements                                      │ implements
  │                                                 │
  └──── ActiveStoryboardSelectionStore (NEW interface in @debrief/components) ────┘
              │                                                           │
              │  encodeMap / decodeMap (NEW helpers)                      │
              │                                                           │
              ▼                                                           ▼
   localStorage["debrief.activeStoryboardSelections"]      @debrief/config preference
                                                            "activeStoryboardSelections"
   (per-origin, per-browser-install)                       (~/.config/debrief/config.json)
```

---

## Testing — acceptance scenario → test file mapping

This is the executable definition of "done". Every spec acceptance
scenario MUST land on at least one test file from this table. The
table is the **only** authoritative crosswalk between spec and tests
— `/speckit.tasks` will derive its test tasks from this.

| Spec scenario | Type | Test file | Assertion (paraphrased) |
|---------------|------|-----------|-------------------------|
| US1 #1 — close + reopen restores `B` | Playwright E2E | `active-storyboard-persistence.spec.ts` | After picking `B` from dropdown then reloading the page, the dropdown still shows `B` and the scene list contains only `B`'s scenes. |
| US1 #1 — same flow, VS Code | Vitest service | `storyboardPlayback.test.ts` | After `setActiveStoryboard(B)` then a fresh `onPlotOpened`, `state.activeStoryboardId === B`. |
| US1 #2 — first-ever open uses default | Vitest component (web-shell) | `StoryboardPanelMount.test.tsx` | With an empty store, mount the panel; the active selection equals `getActiveStoryboardDefault(plot).properties.id`. |
| US1 #3 — second analyst on different machine | Vitest unit (adapter conformance) | `activeStoryboardSelectionStore.test.ts` | Adapters `set` only into their per-origin / per-user container; a second adapter instance backed by a separate container reads `null`. (Cross-machine isolation is structural, not behavioural — proven by container key scoping.) |
| US2 #1 — stale ID falls back silently | Playwright E2E | `active-storyboard-persistence.spec.ts` (second test in the file) | `page.addInitScript` seeds `localStorage` with a Storyboard ID not in the fixture plot; on load, dropdown shows `getActiveStoryboardDefault()` and no error banner is visible. |
| US2 #2 — stale record self-heals | Vitest component (web-shell) | `StoryboardPanelMount.test.tsx` | Seed store with stale ID `X`; mount; pick `Y` from dropdown; verify `selectionStore.get(itemPath) === Y` (not `X`). |
| US2 #3 — zero storyboards remaining | Vitest component | `StoryboardPanelMount.test.tsx` | With store seeded but plot containing no storyboards, panel shows the existing #235 empty-state UX (assertion is "no persistence-specific banner"). |
| US3 #1 — flipping between two plots | Vitest unit (adapter) | `activeStoryboardSelectionStore.test.ts` | `set(p1, b1); set(p2, b2); get(p1) === b1; get(p2) === b2`. |
| US3 #2 — re-pinning P1 doesn't change P2 | Vitest unit (adapter) | `activeStoryboardSelectionStore.test.ts` | After US3 #1, `set(p1, b1prime); get(p2) === b2`. |
| US3 #3 — same name, different IDs | Vitest unit (adapter) | `activeStoryboardSelectionStore.test.ts` | Storyboard names are not part of the store; the test is a simple "store is keyed on `(itemPath, storyboardId)`" assertion. |
| Edge case — first-ever open | Vitest component | `StoryboardPanelMount.test.tsx` | (covered by US1 #2). |
| Edge case — single Storyboard plot | Vitest component | `StoryboardPanelMount.test.tsx` | Mount with a one-storyboard plot; dropdown is hidden per #235; `selectionStore.get(itemPath)` is still allowed to return non-null without errors. |
| Edge case — concurrent two-host write | (out of test scope) | n/a | Last-writer-wins is structural; not exercised in CI. |
| Edge case — persistence layer unavailable | Vitest unit (adapter) | `activeStoryboardSelectionStoreWebShell.test.ts` and `…Vscode.test.ts` | Mock `localStorage` to throw `SecurityError` on read; assert `get` returns `null`, no exception. Same for write throwing `QuotaExceededError`. |

### Success-Criterion gates (CI)

| Criterion | Verified by | Pass condition |
|-----------|-------------|----------------|
| SC-001 (100% restore on reopen) | Playwright E2E + Vitest service | E2E reload assertion passes; service-level reopen assertion passes. |
| SC-002 (default unchanged) | The existing #235 / #217 acceptance tests | None of the existing storyboard tests are modified; CI passes them. |
| SC-003 (byte-identical plot files) | Existing schema round-trip + golden-fixture suites | No diff in any plot golden fixture; LinkML adherence tests unchanged. |
| SC-004 (silent fallback) | Playwright E2E (US2 #1) | Page contains the existing default selection AND `[data-testid="error-banner"]` is absent (or however the panel exposes its no-error state today). |
| SC-005 (per-origin isolation) | Vitest unit (adapter) | (covered by US3 conformance tests). |
| SC-006 (storage outage tolerated) | Vitest unit (adapter) | (covered by edge-case tests). |

---

## Run commands

### Local development

```sh
# Unit tests — fastest feedback loop
pnpm --filter @debrief/components test activeStoryboardSelectionStore
pnpm --filter @debrief/web-shell test activeStoryboardSelectionStoreWebShell
cd apps/vscode && pnpm test activeStoryboardSelectionStoreVscode

# Playwright E2E
cd apps/web-shell && node run-playwright.mjs active-storyboard-persistence
```

### Pre-push (full local CI)

```sh
task verify
```

### Cloud sessions

The `run-playwright.mjs` script auto-provisions
`@sparticuz/chromium`; no `pnpm exec playwright install` is needed.

---

## Implementation order (suggested)

1. Interface + helpers (`shared/components/src/storyboard/activeStoryboardSelectionStore.ts`)
   and its unit tests, including the parameterised conformance suite.
2. VS Code adapter + its unit test running the conformance suite.
3. VS Code wiring in `storyboardPlayback.ts` + service-level test.
4. Web-shell adapter + its unit test (conformance suite).
5. ESLint exception entry.
6. Web-shell wiring (`StoryboardPanelMount.tsx` and `App.tsx` thread) +
   RTL component test.
7. Playwright E2E (US1 + US2 specs).
8. Manual smoke in both hosts before declaring done — record a GIF for
   the blog post under `evidence/screenshots/`.

This order lets steps 1–2 ship green before web-shell touches anything;
the web-shell wiring then has a tested adapter to consume.

---

## What you do NOT need to do

- Modify `getActiveStoryboardDefault`. It stays pure.
- Modify the shared `StoryboardPanel` React component. It stays prop-driven.
- Modify the LinkML schema, the `StoryboardFeature` Pydantic model, or
  the generated TS types. None of those see this feature.
- Add a "pinned" / "clear pin" UI affordance. Spec Out-of-Scope.
- Add a provenance entry on selection change. Spec FR-014.
- Add a feature flag. The behaviour is a strict superset of today
  (first-open with empty store === today's behaviour).
