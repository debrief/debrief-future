# Phase 0 Research — Storyboard Capture & Maintenance UX (Cross-Host)

**Feature**: 235-storyboard-capture-ux
**Date**: 2026-04-28
**Purpose**: Resolve every Technical Context unknown and document the
non-obvious decisions before Phase 1 design begins.

The plan deliberately introduces **no new runtime dependencies** and **no
new persistence path** — most "research" here is reconciling the existing
infrastructure (the #215 module, the #217/#218 panel, the #230 reducer
wiring, and the #174 thumbnail pipeline) with the new cross-host UX
demands. Each section below is in the format **Decision / Rationale /
Alternatives considered**.

---

## 1. Where the inline naming row + collision banner live

**Decision**: Both rows are **panel-internal state** owned by
`useStoryboardEditReducer` (the same reducer #230 introduced for the
edit-row open/close machine). Two new state slices are added:

```ts
namingRow: {
  visible: boolean;
  pendingName: string;
  collisionWith: string | null;  // existing storyboard name, or null
} | null;

collisionBanner: {
  visible: boolean;
  conflictingSceneId: string;
  proposedTimestamp: string;     // ISO-8601, updated on Offset
} | null;
```

**Rationale**: The reducer is already the single source of truth for
panel-local display state (#230). Folding the two new rows into it
means (a) every state transition has a unit test target identical in
shape to the existing edit-row tests, (b) both hosts share the same
state-machine semantics for free, and (c) the visibility-invariant
guarantees (FR-VIS-022/023) become reducer-level testable — the
reducer never produces a state where any modal or overlay descriptor
exists.

**Alternatives considered**:

- **Host-side state in the VS Code extension + parallel React state in
  web-shell**: rejected. Diverges the cross-host UX, makes SC-003
  (visual parity) harder to assert, doubles the number of reducer
  tests.
- **Standalone <NamingRow /> + <CollisionBanner /> components with
  internal `useState`**: rejected. Their visibility is driven by
  external events (capture press; CRUD-side `DuplicateTimestampError`
  thrown by #215); coordinating that across hooks is messier than
  routing through the reducer that already tracks panel state.

---

## 2. How VS Code's existing quick-pick / modal entry points are removed

**Decision**: Remove the `vscode.window.showInputBox(…)` call from the
first-capture branch in `apps/vscode/src/commands/captureScene.ts` and
the modal `showInformationMessage(…, 'Replace', 'Offset', 'Cancel')`
call from the duplicate-timestamp branch. Both branches instead post a
`storyboard:request-capture-name` / `storyboard:request-collision-
resolution` message to the panel webview; the panel sets the relevant
reducer slice; the user resolves it inline; the panel posts a
`storyboard:capture-name-resolved` / `storyboard:collision-resolved`
message back; the command resumes.

The keybinding (`ctrl/cmd+alt+c`), the Map Viewer `when`-clause, and
the `apps/vscode/src/commands/captureScene.ts` entry remain — only the
*prompts inside the orchestration* change.

**Rationale**: `captureScene.ts` already has the dependency-injection
hooks (`showInputBox`, `showInformationMessage` on `CaptureCommandDeps`)
that exist to make this swap testable. The injection seam was put
there in #216 anticipating a future panel-driven path; this slice
exercises it. SC-009 is enforced by removing the production default
implementations of those two deps.

**Alternatives considered**:

- **Keep the VS Code prompts and add panel mirrors for web-shell**:
  rejected. Violates the single-cross-host-UX thesis (Q1 answered
  "Replace outright" in clarify); doubles the prompt surface; users
  switching between hosts hit two different flows.
- **Replace via feature flag**: rejected for the same reason — Q1 took
  Option A (Replace) over Option C (settings flag).

---

## 3. Web-shell thumbnail capture adaptor

**Decision**: New file `apps/web-shell/src/services/webSceneThumbnailAdapter.ts`
adapts #174's `captureNode()` API (already imported via `modern-screenshot`)
to produce the same `WriteSceneThumbnailResult` shape that
`apps/vscode/src/services/sceneThumbnailService.ts` emits. The adaptor
returns a base64 string for the large (full-size) and small (panel-
thumbnail) renders, which the web-shell capture command then writes to
the plot's STAC asset directory through the existing `stacService` web
adaptor.

**Rationale**: `modern-screenshot` is already in the web-shell
dependency tree (per the Active Technologies list in CLAUDE.md, line
for #174). The VS Code thumbnail service already returns a portable
result shape; matching that contract means
`captureSceneWeb.ts` can be a near-mirror of
`apps/vscode/src/commands/captureScene.ts` with only the dep-resolver
swapped — high reuse, low surface area.

**Alternatives considered**:

- **Render the map server-side via Puppeteer**: rejected. Violates
  Article I (offline-by-default); no server in the web-shell
  architecture.
- **Capture only the visible map element** (skip the rail / chrome):
  this is **what we do**. `captureNode(mapContainerRef)` targets the
  Leaflet container alone, matching #174's existing target selection.

---

## 4. How the web-shell keyboard shortcut is bound without browser collision

**Decision**: Bind `ctrl/cmd+alt+c` via `useEffect` + `keydown` on
`window` in `StoryboardPanelMount`, scoped by checking that the active
focus target is not an `<input>`, `<textarea>`, or
`contenteditable`. Browsers don't intercept this chord on any major
desktop platform (verified in the existing CLAUDE.md notes on
preview/web-shell shortcut work for #142). On macOS Safari it remains
unbound by the host OS as well.

If a browser does intercept (corporate-deployment scenarios), the
fallback is the visible Capture Scene button — no analyst is gated by
the shortcut alone (FR-CAP-009 + FR-CAP-011).

**Rationale**: The lightest possible binding is the right one — no
custom keymap layer, no host-shortcut registry, no settings UI.
Matches how the web-shell already handles `Ctrl+Z` / `Ctrl+Y` for
undo/redo (per `apps/web-shell/src/App.tsx`).

**Alternatives considered**:

- **A new `usePlatformShortcut(chord, handler)` hook** in
  `@debrief/components`: deferred. Premature abstraction; only one
  call site exists today.
- **Different web-shell chord** (e.g. `ctrl+shift+c`): rejected.
  Cross-host muscle memory is the goal; same chord wins unless a
  collision proves otherwise.

---

## 5. Side-rail collapse threshold for narrow viewports (FR-UX-007)

**Decision**: Collapse trigger at **central area width < 720 px** —
the existing `useIsMobile()` heuristic in `@debrief/components`
(consumed by `apps/web-shell/src/App.tsx`'s `MobileTabLayout` path)
already uses this threshold. The collapsed state replaces the rail with
a vertical tab strip; clicking the tab expands the rail in an overlay
that covers only the rail's column, not the central area.

**Rationale**: Reuses an existing project threshold; no new responsive
rule to maintain. Aligns with how the rest of the app already adapts.

**Alternatives considered**:

- **A bespoke `<storyboard-rail-collapse>` breakpoint**: rejected.
  Same threshold as the rest of the app reduces visual surprise.

---

## 6. Web-shell session-state wiring vs. fixture harness

**Decision**: `apps/web-shell/src/StoryboardEditHarness.tsx` stays in
the codebase but is **no longer mounted by default**. The default
Analysis-view render path mounts a new `StoryboardPanelMount.tsx` that
reads from `getSessionStore()` (live featureCollection) and writes via
the new `captureSceneWeb` command + the existing
`storyboardEditService`-equivalent path on the web side.

The legacy harness remains accessible via the existing
`?storyboardEditHarness=…` query string for component-development use
only (see `storyboard-edit-harness-querystring.ts`).

**Rationale**: Keeps the fixture harness available to story-only
mock-handler runs (so visual regression tests on the harness itself
keep working) while flipping the default analyst-facing path to the
real wiring.

**Alternatives considered**:

- **Delete `StoryboardEditHarness` entirely**: rejected. It still has
  value for component dev when no plot is loaded, and the test
  `apps/web-shell/src/__tests__/StoryboardEditHarness.querystring.test.ts`
  guards the query-string path.

---

## 7. Visibility-invariant assertion strategy (FR-VIS-022/023/024)

**Decision**: Implement `assertViewportControlsRemainAccessible(page)`
as a Playwright helper in `apps/web-shell/playwright/pages/`. It
performs three checks per call:

1. `expect(mapContainer).toBeVisible()` and
   `expect(timeController).toBeVisible()`.
2. `expect(mapContainer).not.toHaveCSS('pointer-events', 'none')` and
   the same for `timeController`. Walks the ancestor chain to
   guarantee no parent disables pointer events.
3. `getBoundingBox()` for both controls vs. the bounding box of every
   element in the DOM with `role="dialog"`, `aria-modal="true"`,
   `[data-overlay]`, or `position: fixed` with z-index > rail z-index
   — assert no rectangular intersection.

The helper is invoked at every meaningful step of every Playwright
test in this spec.

**Rationale**: Programmatic enforcement (FR-VIS-024). Screenshot
diffing alone is too brittle — themes shift pixels, but the invariant
is structural.

**Alternatives considered**:

- **Manual screenshot review**: rejected; not deterministic, doesn't
  scale to per-PR runs.
- **A custom Playwright matcher** (`toHaveAccessibleViewportControls`):
  deferred. Helper-function form is sufficient; matcher gives nicer
  error output but is more infra. Revisit if assertion failures get
  noisy.

---

## 8. Active-Storyboard persistence across plot reloads

**Decision**: Active-Storyboard selection is **session-scoped, not
persisted**. On plot open, the panel defers to #215's
`getActiveStoryboardDefault(plotFeatures)` — the most recently
modified Storyboard. The analyst's explicit dropdown selection
overrides for the lifetime of the panel mount but is not saved to the
plot.

**Rationale**: #215's spec already states "active selection is an
ephemeral UI concern handled by #217." Persisting active selection
would require either a new property on the plot (schema change — out
of scope) or a new user-config sidecar (Article III tension). The
default-selection rule is good enough in practice.

**Alternatives considered**:

- **Persist on the Storyboard Feature itself** (e.g. `is_active`):
  rejected. Not in #215's schema; adding it is breaking; ergonomically
  wrong (state on a Feature about how a UI displays it).
- **Persist in `debrief-config` user state**: deferred. May be revisited
  if analysts complain about losing selection across sessions.

---

## 9. Concurrent-edit semantics if both hosts open the same plot

**Decision**: **Out of scope.** This spec inherits the existing
plot-edit concurrency story (last-writer-wins on plot save) from the
existing Debrief plot-editing path. No change here. If two hosts have
the same plot open, the host that saves last wins; the other host's
panel reflects stale state until it reloads.

**Rationale**: Real concurrent-edit support requires either CRDTs or a
server-side authoritative store; either is multi-spec and out of
scope. The realistic analyst workflow is "one host at a time per
plot."

**Alternatives considered**:

- **Lock the plot on open** in either host: rejected. Adds locking
  surface; doesn't help the analyst who closes the host without saving.

---

## 10. Internationalisation pass for new strings

**Decision**: All new user-facing strings (Capture Scene button label,
naming row placeholder, collision banner text and three button labels,
undo toast labels, cascade-delete confirm copy, error messages) live
in the existing `@debrief/components` string surface — same module +
same key namespace as the existing #218 strings. No new
translation infrastructure introduced.

**Rationale**: Article XI compliance, matches existing pattern,
zero infrastructure cost.

**Alternatives considered**: None — this is the established pattern.

---

## Summary of "no NEEDS CLARIFICATION remain"

Every Technical Context field in `plan.md` resolves to a concrete
decision above. No `[NEEDS CLARIFICATION]` markers remain. Phase 1
design can proceed against the decisions in §1–§10.
