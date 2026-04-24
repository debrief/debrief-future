# Storyboard Edit Suite — Webview Wiring + Web-shell Harness + Error Triage

**Project:** Debrief-Future
**Component:** Storyboard panel (VS Code webview + web-shell) + edit-error triage
**Version:** 0.1.0
**Date:** 2026-04-24
**Status:** Draft
**Parent:** [#218 Storyboarding — Edit Suite + Housekeeping](../../specs/218-storyboarding-edit/spec.md)
**Related PR:** [#520](https://github.com/debrief/debrief-future/pull/520)

---

## 1. Overview

### 1.1 Purpose

Spec #218 landed the full orchestration, service, component, and command-handler surface for the Storyboard edit suite — 94 of 104 tasks, 2983 tests green. What it did **not** wire is the webview-side integration needed to make the features usable end-to-end: the row-level affordance for opening the edit form, the client-side reducer that translates extension→webview messages into `<StoryboardPanel>` props, and the outbound `postMessage` path from form/toast clicks back to the service.

Without that wiring, the edit suite is reachable only via the command palette and #217's hard-block "Open for editing" button. None of the Phase 5 Playwright E2E (T068/T087/T094) can run because the polish loop isn't click-through-able.

This SRD specifies:

1. **Webview entry-point reducer** + row-level edit affordance (chevron expand + double-click + right-click overflow menu) — makes the VS Code panel fully interactive.
2. **Web-shell interactive harness** with a full reducer mirrored in Storybook stories — makes the web-shell the primary Playwright surface.
3. **Error triage** for the two known pre-existing errors (`Failed to load plot`, `Capture failed — viewport not reported`) plus anything else surfaced during manual testing.

### 1.2 Scope

**In scope**:

- `apps/vscode/src/webview/web/storyboardPanel.tsx` — client-side reducer; handling of 3 new inbound messages; dispatching 11 new outbound messages; row-level affordance (chevron + dbl-click + right-click).
- `apps/vscode/src/views/storyboardPanelView.ts` — `refresh()` must shape `sceneEditViewModels` / `pendingUndoToast` / Storyboard-level edit view-model alongside the existing scene rows.
- `shared/components/src/panels/StoryboardPanel/SceneRow.tsx` — render the chevron + overflow trigger; no behaviour baked in (callbacks from parent).
- `shared/components/src/panels/StoryboardPanel/SceneOverflowMenu.tsx` **(new)** — right-click / keyboard-triggered menu with the six Scene-level actions.
- `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx` — upgrade the four edit-suite stories from pre-seeded fixtures to **fully interactive** stories with the same reducer the VS Code entry point uses.
- `apps/web-shell/` — add an interactive harness page that renders `<StoryboardPanel>` against mock extension ports.
- `apps/web-shell/playwright/tests/storyboard-edit.spec.ts` **(new)** — the deferred T068/T087 web-shell E2E.
- `tests/e2e/test-storyboard-edit.spec.ts` **(new, thin)** — lightweight code-server E2E covering only the VS Code-chrome paths (native input-box, quick-pick, notification) that the web-shell can't exercise.
- Fix: **viewport-race** on first plot open (`Capture failed — map has not reported a viewport yet`).
- Fix: **Failed to load plot** — diagnose the STAC metadata load path returning null.
- Evidence: screenshots + interaction GIF under `specs/218-storyboarding-edit/evidence/screenshots/` from the Playwright run.
- Media: shipped blog post via the Content Specialist agent.

**Out of scope** (defer to follow-up SRDs):

- Full deep-copy of thumbnail PNGs on `copy-to-other-storyboard` (currently returns a distinct but shared ref — satisfies FR-MODULE-015 but not the spec's intent). A proper PNG-pair tmp/fsync/rename lives with a #216 / #174 follow-up.
- LogPanel consecutive-same-op collapse **renderer** inside `LogTimeline.tsx`. The pure helper ships with #218; the renderer integration is on #176's maintainers.
- LinkML round-trip gate (T025) — depends on generating `LogEntry.schema.json` from LinkML first.
- Multi-user / multi-tab concurrency beyond what last-write-wins already handles.

### 1.3 Design Constraints

| Constraint | Rationale |
|------------|-----------|
| Web-shell is the primary E2E surface | Avoids VS Code iframe issues; single source of truth for screenshots and blog media |
| No new runtime deps | Inherits from #218 (Article IX) |
| Webview reducer is idiomatic React (no Redux / Zustand) | Scope is small; `useReducer` + `useEffect` is sufficient and lint-friendly |
| Chevron + dbl-click + right-click affordance | Chosen by Doc Boeuf over overflow-only; more discoverable + keyboard-friendly |
| Pre-existing errors fixed here, not deferred | Ship the edit suite with a clean open-plot / first-capture experience |
| Interactivity parity: stories and VS Code entry point share the same reducer source | Prevents divergence between Storybook demos and production behaviour |

---

## 2. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State ownership | Webview-side, keyed by `sceneId` | The extension's edit service owns durable state (undo buffer, stale cache); the webview only mirrors display state (which row is expanded, which toast is visible). Keeps the postMessage contract stateless-per-message. |
| Reducer shape | Single `useReducer` with discriminated action union mirroring `ExtensionToStoryboardPanelMessage` | One place to see every state transition; trivially testable with a pure reducer export. |
| Expand semantics | Single-row-at-a-time (clicking chevron on another row collapses the previous) | Matches most disclosure-triangle patterns; reduces vertical space pressure in the panel. Overridable via a future setting if demand emerges. |
| Double-click routing | Dispatches the same action as chevron click | Keeps the affordance redundant — dbl-click is a discoverability fallback. |
| Right-click menu | Native `<menu>` / `aria-haspopup="menu"` with `role="menu"`; no third-party lib | vscrui doesn't expose a menu primitive; keeps the component headless. |
| Web-shell harness shape | New page `apps/web-shell/src/pages/StoryboardEditHarness.tsx` with mock extension ports | Mirrors `apps/web-shell/src/pages/<existing>.tsx` conventions; Playwright navigates to a known URL rather than mounting Storybook. |
| Test split between web-shell and code-server | Web-shell covers every click flow + screenshots; code-server covers only `showInputBox` / `showQuickPick` / native notifications | Minimises flaky VS Code chrome time; keeps Playwright runs under the per-test budget. |
| Viewport-race fix | Emit an initial viewport event from the webview after `useEffect` mount + after the map's `load` event | Two paths because either can fire first depending on the embed. |
| STAC-load failure | Diagnostic pass first (log which code path returns null), then fix | We don't know the root cause yet; SRD reserves scope but commits to the diagnostic step before the fix design. |

---

## 3. Functional Requirements

### 3.1 Row-level edit affordance (VS Code + web-shell)

- **FR-230-001**: Every `SceneRow` renders a chevron button (`>` when collapsed, `v` when expanded) as a first-child sibling of the row's thumbnail. Click toggles the row's edit form.
- **FR-230-002**: Double-clicking anywhere on a `SceneRow` (excluding the overflow trigger) also toggles the edit form. Single-click continues to fire `scene-row-clicked` (transport-select — #217 behaviour preserved).
- **FR-230-003**: Right-clicking a `SceneRow` opens a context menu (`<SceneOverflowMenu>`) with six items: **Edit description**, **Update to current**, **Duplicate**, **Copy to other storyboard**, **Delete**, **Refresh thumbnail**. Keyboard-equivalent: focus row + `ContextMenu` key / `Shift+F10`.
- **FR-230-004**: Only one row may have its edit form open at a time. Opening a new row's form collapses the previous.
- **FR-230-005**: Overflow menu items dispatch the existing #218 outbound messages (`scene-update-to-current-clicked`, `scene-delete-requested`, etc.); Edit description sets `editFormOpen: true` via the reducer.
- **FR-230-006**: The overflow-menu-driven Delete, Duplicate, Copy-to-other, Update-to-current match the behaviour of their command-handler counterparts (same prompts, same error toasts) because they all route through the same service methods.

### 3.2 Webview reducer (VS Code entry point)

- **FR-230-010**: `storyboardPanel.tsx` introduces a `useReducer` with the action union:
  - `'scenes-message'` / `'snapshot-message'` (existing flows)
  - `'scene-edit-form-open'` (inbound)
  - `'scene-edit-form-close'` (local — fired by the form's Cancel button)
  - `'scene-stale-flags-updated'` (inbound)
  - `'scene-undo-toast-shown'` (inbound; `null` clears)
  - `'expand-row-toggle'` (local — from chevron click / dbl-click / overflow Edit description)
- **FR-230-011**: The reducer maintains `editFormOpenFor: sceneId | null`, `pendingUndoToast: UndoToastState | null`, `staleFlags: ReadonlyMap<sceneId, { stale: boolean; unresolvedFeatureIds: readonly string[] }>`.
- **FR-230-012**: The reducer composes `sceneEditViewModels: Record<sceneId, SceneEditViewModel>` as a derived selector from scene rows + local state + stale flags. Pure; no side effects.
- **FR-230-013**: Every outbound edit-suite action uses `vscode.postMessage(...)` with the correct discriminator. No outbound action carries derived state from another action's result — each action is a standalone event.
- **FR-230-014**: `pendingUndoToast.onDismiss` is panel-local and sets `pendingUndoToast: null` in the reducer; no outbound message is sent (mirrors the service's expectation that the session-scoped buffer finalises on plot close regardless of UI).

### 3.3 Panel view dispatcher enrichment (extension side)

- **FR-230-020**: `storyboardPanelView.refresh()` builds `SceneEditViewModel[]` for the active Storyboard's rows by composing the Scene Feature's attributes with `storyboardEditService.getStaleFlag(docUri, sceneId)` + `service.getPendingDeletes(docUri)`. Emits these on the existing `scenes` / `snapshot` message shape via an extended payload.
- **FR-230-021**: The `refresh()` invariant (R4 / review 13A) is preserved: O(active-storyboard Scenes) at spec bound. An inline comment calls out that expensive work here breaks the polish-loop UX.

### 3.4 Web-shell interactive harness

- **FR-230-030**: New page `apps/web-shell/src/pages/StoryboardEditHarness.tsx` mounts `<StoryboardPanel>` with:
  - A mock scene list (3–5 fixture Scenes)
  - An in-memory reducer identical to the VS Code entry point's reducer (extracted to a shared hook at `shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.ts`)
  - Button clicks mutate reducer state without crossing a webview boundary (no `vscode.postMessage`; the mock "extension" is an adjacent hook simulating service responses).
- **FR-230-031**: The harness exposes query-string knobs for test setup: `?stale=sceneA,sceneC`, `?pendingDelete=sceneB`, `?missingData=sceneC:track-alpha,track-bravo`. Playwright navigates to a URL with the required initial state.
- **FR-230-032**: The four edit-suite Storybook stories (`WithEditForm`, `WithUndoToast`, `WithStaleBadge`, `WithMissingDataRemediation`) consume the **same reducer hook** rather than pre-seeded static fixtures. Clicking the chevron in the story actually opens the form; the story no longer diverges from production.

### 3.5 Playwright — web-shell (primary E2E surface)

- **FR-230-040**: New `apps/web-shell/playwright/tests/storyboard-edit.spec.ts` exercises the polish loop end-to-end:
  - rename → describe → delete + undo → update-to-current → duplicate → duplicate-at-colliding-timestamp → copy-to-other → deep-copy-failure (induced via mock) → Storyboard rename/describe
  - stale-badge render + refresh → bulk refresh-all-stale
  - missing-data routing + remediation
- **FR-230-041**: Captures screenshots directly into `specs/218-storyboarding-edit/evidence/screenshots/` via the `properties-screenshots.spec.ts` path-resolution pattern. Naming matches the Evidence Requirements table in #218's tasks.md.
- **FR-230-042**: Produces `interaction.gif` (< 5 s, < 2 MB) via Playwright `recordVideo` + GIF conversion for the rename → describe → delete+undo → refresh-stale flow.
- **FR-230-043**: Validates LogPanel card emission by asserting on `data-testid="log-panel-card"` attributes; every successful op must land a card with `data-op` matching the expected value.

### 3.6 Playwright — code-server (thin, VS Code chrome only)

- **FR-230-050**: New `tests/e2e/test-storyboard-edit.spec.ts` covers **only** flows that require real VS Code chrome:
  - Command palette invocation for each of the 11 new commands
  - `showInputBox` interactions (rename prompt, duplicate-timestamp prompt, storyboard rename)
  - `showQuickPick` for copy-to-other destination
  - Native notification toasts (verify `window.showInformationMessage` / `showWarningMessage` appearing)
- **FR-230-051**: Does **not** re-test click flows already covered by web-shell E2E. Captures one `vscode-native-chrome.png` screenshot showing a real input-box + quick-pick mid-flow.

### 3.7 Viewport-race fix

- **FR-230-060**: The Storyboard-panel webview emits an initial viewport event to the extension host after mount. Current behaviour depends on the map firing its own `load` event; some embeds don't fire it reliably.
- **FR-230-061**: The fix lives in the MapPanel webview entry point (`apps/vscode/src/webview/web/mapView.tsx`): after React mount **and** after Leaflet's `map.whenReady` callback, emit a viewport event with the current centre/zoom/bounds. Safe to emit twice (the session store reducer is idempotent per-field).
- **FR-230-062**: Acceptance: opening a fresh plot and immediately clicking Capture (before user panning) must not surface `Capture failed — map has not reported a viewport yet`.

### 3.8 STAC-load failure diagnostic + fix

- **FR-230-070**: Diagnostic step: `stacService.loadPlot` currently returns `null` in some cases without surfacing which code path. Add structured logging at each failure point (item.json missing, parse error, missing required field) writing to the Debrief output channel.
- **FR-230-071**: With the diagnostics live, reproduce the failure against the specific plot from Doc Boeuf's screenshot and capture the failing path.
- **FR-230-072**: Fix the root cause based on the diagnostic finding. Expected candidates: STAC item path resolution when the store directory is symlinked; missing `properties.datetime` field on older plots; race between `openPlot` and session initialisation.
- **FR-230-073**: Acceptance: the specific plot that surfaced the error in #520's manual test opens cleanly without the toast.

### 3.9 Additional errors surfaced during manual testing

- **FR-230-080**: Every new error surfaced during Doc Boeuf's follow-up manual test pass (per Q2C's rationale — we don't know them yet) must be either:
  - fixed in this SRD, if the root cause is a wiring gap introduced by #218's webview work, OR
  - captured as a new BACKLOG item with a reproduction recipe if the root cause predates #218 and is non-trivial.

---

## 4. Out-of-scope items (explicit)

These stay deferred past this SRD:

- **Full thumbnail deep-copy** for `copy-to-other-storyboard` — current implementation returns a distinct-but-shared asset key. A proper PNG-pair tmp/fsync/rename of the on-disk files is a #216 / #174 follow-up.
- **LogPanel consecutive-same-op collapse renderer inside `LogTimeline.tsx`** — the pure helper shipped with #218 (`collapseStoryboardEdits`); wiring into the LogPanel is #176's call.
- **LinkML round-trip gate (T025)** — depends on generating `LogEntry.schema.json` first.

---

## 5. Non-functional requirements

- **Performance**: No regressions against the SC-014 perf budget (`onPlotOpened` ≤ 50 ms median at spec scale). The reducer is synchronous + purely declarative; the overflow-menu render is lazy (only when open).
- **Accessibility**: Chevron button carries `aria-expanded` + `aria-controls`; overflow menu carries `role="menu"` / `role="menuitem"`; keyboard navigation (`ArrowDown` / `Enter` / `Escape`) works.
- **Internationalisation**: All new user-visible strings route through `apps/vscode/src/messages/storyboardEdit.ts` (already established for #218).
- **Test coverage**: Every reducer action has a unit test; every web-shell click flow has a Playwright test; every FR listed above has a matching test.

---

## 6. Acceptance criteria

| SC | Criterion |
|----|-----------|
| **SC-230-A** | In the VS Code extension host, opening a Scene row's edit form is possible via (a) chevron click, (b) double-click, (c) right-click → **Edit description**. All three routes land on the same rendered form. |
| **SC-230-B** | Every edit op is reachable from the Scene row's right-click overflow menu. Each op produces the expected LogPanel card. |
| **SC-230-C** | Soft-delete renders the `UndoToast` at the bottom of the Storyboard panel; clicking **Undo** within the session restores the row byte-identically. |
| **SC-230-D** | Stale Scenes render the `StaleBadge` on their row with a tooltip naming unresolved feature IDs. Clicking **Refresh** clears the badge on success, shows a red toast on #174 failure. |
| **SC-230-E** | The web-shell harness runs the full polish loop end-to-end under Playwright without VS Code. All screenshots listed in #218's Evidence Requirements table land under `specs/218-storyboarding-edit/evidence/screenshots/`. |
| **SC-230-F** | Code-server E2E proves each of the 11 new commands is invokable from the palette + that `showInputBox` / `showQuickPick` / native notifications appear as expected. |
| **SC-230-G** | Opening a fresh plot and immediately clicking Capture does **not** surface `Capture failed — map has not reported a viewport yet`. |
| **SC-230-H** | The plot that surfaced `Failed to load plot` in #520's manual test opens cleanly; the output channel records which STAC code path failed in the original bug report. |
| **SC-230-I** | All four edit-suite Storybook stories are interactive — clicking the chevron opens the form; clicking Undo restores the row; stale-badge Refresh clears the badge. |
| **SC-230-J** | Zero regressions in the 2983 tests #218 ships; `task verify` passes green. |

---

## 7. Dependencies

- **#218 Storyboarding Edit Suite** (hard) — this SRD is a follow-up that completes the wiring. Service, dispatcher, component, and command-handler layers are already landed on PR #520.
- **#215 Storyboarding Schema + CRUD core** (hard, transitively via #218).
- **#174 Thumbnail capture pipeline** (hard, transitively via #218's `refreshSceneThumbnail`).
- **#176 Analysis Log Panel** (hard) — every edit op emits a card; the web-shell harness must include the `LogPanel` for assertions.
- **#217 Storyboarding Playback Panel** (hard, transitively).
- `@sparticuz/chromium` (existing) — Playwright runs against the bundled Linux Chromium.

---

## 8. Implementation phases

### Phase A — Row-level affordance + webview reducer (≈2 days)

- Extract `useStoryboardEditReducer` hook (shared/components).
- Add chevron to `SceneRow`; add `SceneOverflowMenu` component.
- Rewrite `storyboardPanel.tsx` webview entry point to consume the reducer.
- Update `storyboardPanelView.refresh()` to emit `sceneEditViewModels` alongside scenes.
- Unit tests for the reducer + new component tests for SceneOverflowMenu.

### Phase B — Interactive stories + web-shell harness (≈1.5 days)

- Rewrite the four edit-suite stories to use the shared reducer hook.
- New `StoryboardEditHarness` page in web-shell with query-string initial-state knobs.
- Unit tests for the query-string parser.

### Phase C — Playwright E2E + evidence (≈1.5 days)

- `apps/web-shell/playwright/tests/storyboard-edit.spec.ts` — full polish loop.
- `tests/e2e/test-storyboard-edit.spec.ts` — thin code-server chrome coverage.
- Screenshots land under `specs/218-storyboarding-edit/evidence/screenshots/`.
- `interaction.gif` generated via `recordVideo` + gif conversion.

### Phase D — Error triage (≈0.5–2 days, depends on STAC-load diagnosis)

- Viewport-race fix in MapPanel webview.
- STAC-load diagnostic pass + fix.
- Manual retest against the original reproduction plot.
- Any additional errors surfaced get triaged per FR-230-080.

### Phase E — Media + merge (≈0.5 day)

- Content Specialist agent drafts `shipped-post.md` + `linkedin-shipped.md`.
- Update #218's PR description to reflect Phase 6 completion.
- Merge.

**Total effort estimate: 6–8 developer-days.**

---

## 9. Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| STAC-load failure root cause is deeper than expected (touches #178 STAC code) | Medium | High (blocks SC-230-H) | The diagnostic step is scoped separately; if the fix balloons, spin it out to its own SRD and downgrade SC-230-H to "diagnostic logged, BACKLOG item created". |
| Playwright flake on the dbl-click affordance | Low | Medium | Use `page.dblclick()` with a short delay; assert on post-click state via `waitFor` not on transient animation state. |
| Webview reducer state diverges from extension service state (e.g. stale flag dropped client-side but service still holds it) | Low | Low | The reducer treats inbound messages as authoritative; never holds state the extension doesn't also hold. |
| `SceneOverflowMenu` keyboard navigation fails accessibility audit | Medium | Low | Model on existing `@debrief/components` menu patterns; include `@axe-core/playwright` in the E2E. |
| Interactive Storybook stories become brittle (click → state → re-render → different DOM) | Medium | Medium | The reducer hook is pure; test it once; stories just pass initial state. Playwright uses `data-testid` selectors not DOM positions. |

---

## 10. Open questions

Resolve during Phase A kick-off:

1. **Chevron vs twistie vs caret** — which glyph fits the existing Storyboard-panel aesthetic best? Check vscrui icons.
2. **Overflow menu placement** — to the right of the scene meta column, or on right-click anywhere on the row? (FR-230-003 specifies right-click; the mouse-only trigger is TBD.)
3. **Escape key semantics** — does `Escape` inside the edit form close the form (reducer dispatch `scene-edit-form-close`), or is it trapped by the textarea for normal text-editing use? Expected: trap inside textarea, escape-at-form-level only when textarea not focused.
4. **Inline vs. modal overflow menu** — some DOM-positioning libraries simplify this; is it worth pulling in e.g. `@floating-ui/react`? Decision: no, native menu is enough for v1.

---

## 11. Appendices

### 11.1 Relevant commit history on PR #520

```
aa89b388 docs(218): Phase 5b — evidence artifacts + tasks.md status
415df9e3 feat(218): Phase 5a — gcOrphanAssets wiring + LogPanel collapser + perf budget
225ff739 feat(218): Phase 4 — stale detection + refresh-thumbnail + bulk refresh
1a89fb47 feat(218): Phase 3f — Storybook stories for edit-suite components (T064)
e9b9b4cd feat(218): Phase 3e — real updateToCurrent + copyToOther command handlers
e2ba09eb feat(218): Phase 3d — wire SceneEditForm + UndoToast into StoryboardPanel (T060)
82f39ce9 feat(218): Phase 3c — real command handlers for palette invocation
26cc5bf9 feat(218): Phase 3b — panel dispatcher + real SceneEditForm / UndoToast
02a5cadd feat(218): Phase 3a — StoryboardEditService Story 1 implementations
16d90c80 feat(218): Phase 2 foundation — #215 + #174 + LogService extensions
8ca662c5 feat(218): Phase 1 scaffolding — storyboard edit suite skeletons
```

### 11.2 Outbound postMessages (from #218, reiterated here as the contract for Phase A)

- `scene-title-rename-committed` { sceneId, newTitle }
- `scene-description-edit-submitted` { sceneId, description: string \| null }
- `scene-delete-requested` { sceneId }
- `scene-undo-delete-clicked` { sceneId }
- `scene-update-to-current-clicked` { sceneId }
- `scene-duplicate-clicked` { sceneId }
- `scene-copy-to-other-clicked` { sceneId }
- `scene-refresh-thumbnail-clicked` { sceneId }
- `storyboard-refresh-all-stale-clicked` { storyboardId }
- `storyboard-name-rename-committed` { storyboardId, newName }
- `storyboard-description-edit-submitted` { storyboardId, description: string \| null }

### 11.3 Inbound postMessages (from #218, reiterated)

- `scene-edit-form-open` { sceneId }
- `scene-stale-flags-updated` { flags: { sceneId; stale; unresolvedFeatureIds }[] }
- `scene-undo-toast-shown` { toast: SceneUndoToastDescriptor \| null }

### 11.4 Tests deferred from #218 that land here

- **T068** Web-shell Playwright E2E — FR-230-040 through FR-230-043
- **T087** Web-shell E2E for Story 2 (stale + refresh) — folded into FR-230-040
- **T094** Code-server Playwright E2E — FR-230-050 through FR-230-051
- **T097** Evidence screenshots — produced by FR-230-041
- **T101 / T102** Shipped blog post + LinkedIn summary — Phase E
