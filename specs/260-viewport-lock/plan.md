# Implementation Plan: Viewport Lock

**Branch**: `260-viewport-lock` (working branch: `claude/implement-viewport-lock-rjNkL`) | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/260-viewport-lock/spec.md`

## Summary

Adds a session-runtime `viewportLocked` boolean to the `spatial` slice of `@debrief/session-state`. When `true`: (1) `MapView` disables six Leaflet gesture handlers (`dragging`, `scrollWheelZoom`, `doubleClickZoom`, `touchZoom`, `boxZoom`, `keyboard`) and restores them to their snapshotted prior state on unlock; (2) `LeafletToolbar` renders the zoom-in / zoom-out / fit-to-window buttons in a disabled-with-tooltip state; (3) an on-map banner is rendered along the map's top edge with click-to-unlock; (4) the MCP `setViewport` tool rejects with `errorCode: 'VIEWPORT_LOCKED'`. The toggle lives in the Storyboard panel header (sibling of Capture), with an `L` keyboard shortcut when the map has focus. The flag is **excluded from `PersistentSessionState`** via `Omit<SpatialSlice, 'viewportLocked'>` so it never round-trips through `.debrief.json`. Loading a plot or session resets it to `false`. Capture remains independent of lock state.

This realises Section E of `docs/project_notes/viewport-mutation-audit.md` and closes the residual fragility left after PRs #623/#625.

## Technical Context

**Language/Version**: TypeScript 5.x strict (per Constitution Article XV). No new languages.
**Primary Dependencies**: React 18.x, Zustand ^5 (`@debrief/session-state`), Leaflet 1.9.x via `react-leaflet` 4.2 (`MapView`), `@debrief/components` (`LeafletToolbar`, `StoryboardPanel`), `@debrief/schemas` (existing types — no schema changes), VS Code Extension API ^1.85.0 (host messaging only — no command palette additions). **No new runtime dependencies.**
**Storage**: N/A — the lock is runtime state only; explicitly **NOT** persisted to `.debrief.json`. The session-load path produces `viewportLocked: false` by always emitting it as `false` via the typed exclusion pattern (see Constitution Article IV.5 / ADR-033 framing in CLAUDE.md).
**Testing**: Vitest unit tests for the slice reducer + the MCP `setViewport` reject branch; React Testing Library for the StoryboardPanel padlock + on-map banner; Playwright web-shell E2E covering Story 1 (locked multi-scene capture series with identical thumbnails) and Story 3 (auto-unlock on plot switch); existing `shared/components/e2e/StoryboardPanel.spec.ts` extended to cover the padlock toggle a11y contract.
**Target Platform**: VS Code extension host (Node 20.x) + web-shell (Chromium via `@sparticuz/chromium` in CI). Identical behaviour required in both (the spec is host-agnostic by design).
**Project Type**: Single monorepo (pnpm workspaces). This feature touches three workspaces — `services/session-state/`, `shared/components/`, `apps/vscode/` — plus the existing Playwright surface in `apps/web-shell/`.
**Performance Goals**: Toggle latency imperceptible (< 16ms — single boolean state update + React re-render in the affected subtree). No allocation pressure: the handler-snapshot is six booleans on a single ref.
**Constraints**: Lock state changes MUST NOT cause map flicker (no re-mount of the Leaflet `Map` instance — handler toggles only). Banner overlay MUST NOT intercept clicks meant for the toolbar (z-order discipline). Disabled toolbar buttons MUST remain visually present (no reflow — see FR-004).
**Scale/Scope**: ~13 functional requirements, 3 user stories, ~5 source files touched plus tests + 3 Storybook stories.

## Constitution Check

| Article | Status | Notes |
|---------|--------|-------|
| **I. Defence-Grade Reliability** | ✅ Pass | Offline by default (lock is local state). No silent failures: locked state is visible via two distinct affordances (panel padlock + on-map banner) and MCP tool returns a structured error. Reproducible: identical inputs → identical lock state. |
| **II. Schema Integrity** | ✅ Pass | **No schema changes.** `viewportLocked` is a TypeScript-only runtime field on `SpatialSlice`, excluded from the persisted shape via `Omit`. No LinkML edits, no derived-type regeneration. The (already-generated) `@debrief/schemas#SpatialSlice` does not include this field and that is intentional — it's deliberately runtime-only and not part of the on-disk contract. |
| **III. Data Sovereignty** | ✅ Pass | No data writes. Lock toggling is a UI-state change; no provenance entries are produced. Existing capture-scene provenance is unchanged (the captured viewport itself, when captured, is already provenance-tracked). |
| **IV. Architectural Boundaries** | ✅ Pass | **IV.1**: No services touch UI. **IV.2/IV.4**: No new persistence — the lock is deliberately runtime-only. The `Omit<SpatialSlice, 'viewportLocked'>` boundary in `PersistentSessionState.spatial` enforces this at the type level. **IV.3**: The MCP tool change is a thin reject branch in `services/session-state/src/server/tools/setViewport.ts` against a typed store slice — no domain logic added to the wrapper. **IV.5 (boundary types derived)**: The persisted shape is computed via `Omit<SpatialSlice, 'viewportLocked'>` — fields are NOT re-listed; adding more ephemeral fields to `SpatialSlice` later does not require touching `PersistentSessionState`. |
| **V. Extensibility** | ✅ Pass | No extension surface affected. |
| **VI. Testing** | ✅ Pass | Unit tests for slice reducer + MCP tool reject; component tests for padlock + banner + disabled-toolbar state; Playwright E2E for Stories 1 + 3. CI gates all three. |
| **VII. Test-Driven AI Collaboration** | ✅ Pass | Spec has 12 acceptance scenarios across 3 stories + 6 success criteria, all testable. The checklist at `checklists/requirements.md` defines done. |
| **VIII. Documentation** | ✅ Pass | Spec is in place. Plan, research, data-model, contracts, quickstart produced by this command. CHANGELOG entry pending at PR time. |
| **IX. Dependencies** | ✅ Pass | **Zero new runtime dependencies.** No new devDeps either — Vitest, RTL, Playwright already present. |
| **X. Security** | ✅ Pass | No secrets, no network. |
| **XI. Internationalisation** | ⚠️ Note | Two new user-facing strings: tooltip "Viewport locked" and banner "🔒 Viewport locked — click to unlock". Strings live in component files and are exposed for future i18n extraction following the project's current pattern (which is "ASCII strings inline, externalisable later" pre-v4.0 per Article XIV). No hard-coded translations introduced. |
| **XII. Community Engagement** | ✅ Pass | Spec public, PR #626 open. Cached opener prepared in Phase 2 for the eventual feature post. |
| **XIII. Contribution Standards** | ✅ Pass | One atomic feature, PR-based, CI gating. |
| **XIV. Pre-Release Freedom** | n/a | Pre-v4.0.0 mode. |
| **XV. Strict Type Safety** | ✅ Pass | All additions strictly typed: `viewportLocked: boolean` on `SpatialSlice`; `errorCode?: 'VIEWPORT_LOCKED'` (literal type) on `SetViewportOutput`; React props typed via existing interfaces. No `any` introduced. |

**Gate verdict**: PASS. No violations require entries in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/260-viewport-lock/
├── plan.md              # This file
├── spec.md              # Approved specification
├── research.md          # Phase 0 — decisions resolved
├── data-model.md        # Phase 1 — SpatialSlice change + MCP I/O shape
├── quickstart.md        # Phase 1 — how to verify the feature locally
├── contracts/
│   └── mcp-setViewport.md   # MCP setViewport contract addendum (reject branch)
├── checklists/
│   └── requirements.md  # Spec-quality checklist (already produced)
└── evidence/
    └── opening-context.md   # Cached blog opener (Phase 2)
```

### Source Code (repository root)

Files touched (with brief role):

```text
services/session-state/
├── src/types/spatial.ts                  # ADD: viewportLocked field + setViewportLocked action signature
├── src/types/index.ts                    # ADD: Omit<SpatialSlice, 'viewportLocked'> on PersistentSessionState.spatial
├── src/store/slices/spatial.ts           # ADD: setViewportLocked reducer + default false
├── src/persistence/save.ts               # No code change required — Omit propagates; existing extractPersistentState already constructs spatial explicitly so the type-check enforces the exclusion
├── src/persistence/load.ts               # ADD: always restore viewportLocked: false (force-unlock on session load — FR-011, FR-012)
├── src/server/tools/setViewport.ts       # ADD: reject branch returning { success: false, errorCode: 'VIEWPORT_LOCKED', error: ... }
└── tests/                                # ADD: slice unit test + MCP reject branch test

shared/components/src/
├── panels/StoryboardPanel/
│   ├── StoryboardPanel.tsx               # ADD: padlock toggle button in header, aria-pressed bound to viewportLocked; new optional props onViewportLockToggle + viewportLocked
│   ├── StoryboardPanel.stories.tsx       # ADD: "Viewport locked" story variant
│   └── __tests__/                        # ADD: RTL test for padlock toggle + aria-pressed
├── MapView/
│   ├── MapView.tsx                       # ADD: useEffect to snapshot + toggle 6 handlers on viewportLocked change; on-map banner overlay child
│   ├── ViewportLockBanner.tsx (new)      # ADD: small overlay component; click-to-unlock
│   ├── ViewportLockBanner.stories.tsx (new) # ADD: Storybook story (locked + unlocked variants)
│   └── LeafletToolbar/LeafletToolbar.tsx # ADD: disabled-with-tooltip state for zoom-in, zoom-out, fit-to-window when viewportLocked

apps/vscode/src/webview/
└── mapPanel.ts                           # No new mutation gates needed (per spec scoping decision); only relays the viewportLocked field over the existing setFeatures/loadPlot wire and reads back lock toggles from webview→host (one new message kind: 'viewportLockChanged')

apps/web-shell/
└── playwright/tests/viewport-lock.spec.ts (new)  # ADD: Playwright E2E for Stories 1 + 3
```

**Structure Decision**: Single-monorepo, three-workspace touch (`services/session-state` + `shared/components` + `apps/vscode`), plus one new Playwright spec in `apps/web-shell/`. No new packages, no new top-level directories. The component-library additions follow the existing per-component folder convention (`MapView/ViewportLockBanner.tsx` sits as a sibling of `LeafletToolbar/`).

## Media Components

Two Storybook stories are added (new visual surfaces) and one is updated:

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| `StoryboardPanel` (locked variant) | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx` | `storyboard-panel.js` | Shows padlock toggle in both states; the locked variant demonstrates `aria-pressed="true"` and the visual relationship to the adjacent Capture button. |
| `ViewportLockBanner` | `shared/components/src/MapView/ViewportLockBanner.stories.tsx` *(new)* | `viewport-lock-banner.js` | Standalone story for the on-map banner — locked state (banner visible, click-to-unlock affordance) vs. unlocked state (nothing rendered). |
| `LeafletToolbar` (locked variant) | `shared/components/src/MapView/LeafletToolbar/` (no new story file — extend existing if present, else add `LeafletToolbar.stories.tsx`) | `leaflet-toolbar.js` | Demonstrates the disabled-with-tooltip state for the three affected buttons. |

**Inclusion Criteria Applied**:
- [x] New visual component (`ViewportLockBanner`)
- [x] Significant visual change (`StoryboardPanel` header gets a new control; `LeafletToolbar` gets a disabled-state variant)
- [x] Interactive demo adds narrative value (toggling the padlock in Storybook shows the panel header / banner / toolbar trio reacting in lockstep — the whole UX is visible in one place)

**Bundleability Verified**:
- [x] Stories exist (or will exist) in Storybook
- [x] Components render standalone (no app context — `StoryboardPanel` already renders without a live Leaflet map in its stories; `ViewportLockBanner` is a thin overlay; `LeafletToolbar` story can mock the `L.Map` minimally as the existing stories do)
- [x] Reasonable bundle size expected (< 500KB — these are small React components with no extra dependencies)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/mapview-viewportlockbanner--locked`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `StoryboardPanel.stories.tsx` (locked variant) | Padlock renders with `aria-pressed="true"`; clicking padlock fires toggle; data-testid `viewport-lock-toggle` present | light, dark, vscode | click padlock → assert callback invoked; hover → assert tooltip visible |
| `ViewportLockBanner.stories.tsx` | Banner renders only when `locked=true`; click fires unlock callback; `role="status"` + `aria-live="polite"` present | light, dark, vscode | click banner → assert unlock callback invoked |
| `LeafletToolbar.stories.tsx` (locked variant) | Three buttons render in disabled state with `aria-disabled="true"` and tooltip "Viewport locked" | light, dark, vscode | hover each → assert tooltip text; click each → assert no callback invoked |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input (toggle / unlock callbacks)
- [x] Accessibility attributes present (`data-testid`, `aria-pressed`, `aria-disabled`, `aria-live`)
- [x] Screenshots captured for evidence (locked + unlocked variants of each)

**Test File Location**: `shared/components/e2e/ViewportLock.spec.ts` (new — covers all three stories), plus extensions to `shared/components/e2e/StoryboardPanel.spec.ts` for the padlock interaction.

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=mapview-viewportlockbanner--locked&globals=theme:light
/iframe.html?id=mapview-viewportlockbanner--locked&globals=theme:dark
/iframe.html?id=mapview-viewportlockbanner--locked&globals=theme:vscode
```

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| **Story 1 — Multi-scene capture with consistent framing** | `MapView`, `LeafletToolbar`, `StoryboardPanel` | `.leaflet-container`, `[data-testid="viewport-lock-toggle"]`, `[data-testid="capture-button"]`, `.leaflet-toolbar-button.zoom-in`, scene thumbnails | load plot → pan/zoom to a region → click padlock → assert banner visible + toolbar buttons disabled with tooltip → click Capture three times at three different `currentTime` values → assert all three thumbnails have identical centre+zoom via the existing `viewport-invariants.ts` helper from `apps/web-shell/playwright/helpers/` |
| **Story 1b — Gesture inertness while locked** | `MapView` | `.leaflet-container` | with lock on: drag the map, scroll-wheel zoom, double-click; assert the map's `center` + `zoom` are unchanged after each gesture (use the same `getLeafletViewport()` helper the storyboard tests use) |
| **Story 3 — Auto-unlock on plot switch** | `MapView`, `StoryboardPanel` | `[data-testid="viewport-lock-toggle"]`, plot-switcher chrome | lock viewport → open a different plot via the catalog → assert padlock returns to unlocked state, banner gone, drag works on new map |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell
- [x] Page objects in `apps/web-shell/playwright/pages/` extended for the padlock selector (reuses `AnalysisPage`)
- [x] Screenshots and/or interaction GIF written into `specs/260-viewport-lock/evidence/screenshots/` (locked map with banner; three scene thumbnails side-by-side; the disabled-toolbar tooltip)

**Test File Location**: `apps/web-shell/playwright/tests/viewport-lock.spec.ts` (new).

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs viewport-lock`
- Local: `pnpm --filter @debrief/web-shell test viewport-lock`

## Complexity Tracking

No Constitution violations to justify. This section is intentionally left empty.
