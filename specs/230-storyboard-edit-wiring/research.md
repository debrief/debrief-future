# Research: Storyboard Edit Suite Webview Wiring

**Feature**: 230 | **Phase**: 0 | **Date**: 2026-04-24

This document resolves the design unknowns identified while drafting `plan.md`. Each entry follows the standard **Decision / Rationale / Alternatives considered** format.

---

## R1. Reducer vs. useState pile for the webview entry point

**Decision**: Introduce a single `useReducer`-based hook `useStoryboardEditReducer` exported from `shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.ts`. Mirrors the action union to `ExtensionToStoryboardPanelMessage` + a small set of local actions (`'expand-row-toggle'`, `'scene-edit-form-close'`).

**Rationale**:

- Today's `storyboardPanel.tsx` has seven independent `useState` calls (scenes, activeStoryboardName, activeStoryboardId, storyboards, currentSceneId, transport, captureInFlight, theme). Adding the eight new state slices this feature requires (`editFormOpenFor`, `pendingUndoToast`, `staleFlags`, `storyboardEditViewModel`, `sceneEditViewModels`, three menu-open states) would push the file past readable. A reducer collapses them to a single source of truth.
- The VS Code entry point and the web-shell harness MUST share behaviour (FR-022, FR-023). Extracting the reducer to a hook is the only path that lets both mount points use byte-identical transitions — closure-captured `useState` setters are not shareable.
- Pure reducer → trivially unit-testable without rendering (FR-035 matches each FR to at least one test).

**Alternatives considered**:

- **Zustand / Redux / MobX** — rejected. Zero new runtime deps (Article IX). The scope is one panel; `useReducer` is enough.
- **Keep `useState` pile; duplicate logic in the harness** — rejected. Guaranteed drift between VS Code and harness behaviour over time; directly violates FR-023 ("same behavioural layer").
- **Lift state to `@debrief/session-state` store** — rejected. That store is for *persisted, cross-panel* state. Which row's edit form is open is purely ephemeral display state and must not survive plot close.

---

## R2. Chevron glyph

**Decision**: Use the `codicon-chevron-right` (collapsed) / `codicon-chevron-down` (expanded) icons exposed via `vscrui` — the same icon-set the existing `StoryboardHeader` overflow uses.

**Rationale**:

- `vscrui` is already a dependency; matches the VS Code native Explorer disclosure glyph; no new asset pipeline.
- ARIA: icon container carries `aria-hidden="true"`; the button itself carries `aria-expanded={boolean}` and `aria-controls={formId}` per FR-006 (reducer) + accessibility audit (FR-NON-A11Y).

**Alternatives considered**:

- **Custom SVG caret** — rejected. Diverges from vscrui aesthetic; extra surface for dark/light theme regressions.
- **Triangle (▶ / ▼) unicode** — rejected. No guaranteed font fallback across platforms; small on high-DPI.

---

## R3. Single-row-at-a-time expand semantics

**Decision**: Exactly one row's edit form may be open at a time. Opening a second row's form collapses the first. State lives as `editFormOpenFor: sceneId | null` in the reducer.

**Rationale**:

- FR-004 mandates this. UX: matches VS Code Explorer / Outline / Source Control disclosure pattern. Vertical space in the Storyboard panel is tight (map + list + activity panel compete).
- Simpler reducer: one slot, not a `Set<sceneId>`.

**Alternatives considered**:

- **Multi-row expand** — rejected by FR-004 and by the panel's vertical-space constraint.
- **Accordion (click outside to close)** — deferred. Worth considering later if analysts find the single-slot semantics constraining; not scoped for v1.

---

## R4. Double-click routing

**Decision**: Double-click on the Scene row body (excluding the overflow trigger) dispatches the same `'expand-row-toggle'` reducer action as the chevron. Single-click continues to fire `scene-row-clicked` (transport-select) per #217 behaviour.

**Rationale**:

- FR-002. Redundant affordance → discoverability without splintering the mental model.
- Playwright can drive it reliably via `page.dblclick()`.

**Alternatives considered**:

- **Double-click toggles transport-select** — rejected. That is already the single-click behaviour from #217; conflating the two routes would break existing transport UX.
- **Drop double-click; rely on chevron only** — rejected. Discoverability suffers and the SRD explicitly calls for redundancy (SRD §1.3, §3.1).

---

## R5. Overflow menu — native `<menu>` vs. floating library

**Decision**: Native `<menu role="menu">` with Popover API-style positioning computed from the row's bounding rect. No third-party dependency. Implemented as a dedicated `SceneOverflowMenu.tsx` component; does **not** reuse the existing `StoryboardHeader`-embedded overflow (that one operates at Storyboard level with a different action set).

**Rationale**:

- Article IX (zero new deps). `@floating-ui/react` would add ~30 KB for a pattern we can implement in < 200 lines.
- vscrui does not expose a menu primitive, so we would have to write one either way — better to keep it headless and testable.
- `role="menu"` + `role="menuitem"` + ArrowUp/ArrowDown/Enter/Escape keyboard nav is a well-understood a11y pattern; `@axe-core/playwright` will audit it in E2E.

**Alternatives considered**:

- **`@floating-ui/react`** — rejected (new dep, cost/benefit poor at this scope).
- **Re-use `StoryboardHeader`'s existing embedded overflow** — rejected. The header menu operates at Storyboard level (create/rename/delete storyboards); a Scene menu needs six different actions. Extracting them to share a primitive is a possible *future* refactor but scope-creepy here.
- **VS Code native context menu via `showQuickPick`** — rejected. Only works when an extension command fires it; we want the menu available anywhere the webview runs (including the web-shell harness).

---

## R6. Web-shell harness shape — dedicated page vs. displayMode extension

**Decision**: Add a new top-level branch in `apps/web-shell/src/App.tsx` that mounts `<StoryboardEditHarness>` when the URL contains `?storyboard-edit-harness=1`. The harness renders the `StoryboardPanel` against an in-memory mock extension port (JS object implementing the postMessage contract) that drives the same `useStoryboardEditReducer` hook.

**Rationale**:

- The web-shell uses a single-App pattern (no React Router; routes are `displayMode` inside the session-state store). Adding a fifth display mode touches the store schema and every mode switch — disproportionate for a test-only harness.
- A query-string branch at the App root is local to this feature and removable without migration if the harness is ever replaced.
- Query-string knobs (`?stale=sceneA,sceneC`, `?pendingDelete=sceneB`, `?missingData=sceneC:track-alpha,track-bravo` per FR-021) compose naturally via `URLSearchParams`, and `App.tsx` already uses this API elsewhere (line 221).
- Playwright navigates once per test to the right harness URL — zero flake.

**Alternatives considered**:

- **Dedicated page via React Router** — rejected. No router today; pulling one in solely for the harness violates Article IX.
- **New `displayMode = 'storyboard-edit-harness'`** — rejected. Pollutes the persisted `session-state` store with a display mode that ships to end users.
- **Storybook as harness** — rejected on its own (not as a supplement). Storybook iframes behave differently from a real app for mock-port interactions; the web-shell faithfully mirrors the extension's rendering environment.

---

## R7. Interactive stories — share reducer vs. simulate

**Decision**: The four edit-suite stories (`WithEditForm`, `WithUndoToast`, `WithStaleBadge`, `WithMissingDataRemediation`) all consume the same `useStoryboardEditReducer` hook via a thin story-only mock port. Replace the static `args`-based props with a reducer-backed wrapper that seeds initial state from story args.

**Rationale**:

- FR-023: stories MUST match production behaviour. A reviewer clicking through a story should see real state transitions, not a frozen placeholder.
- One behavioural layer → one source of truth. Regressions surface in either Storybook or the web-shell harness — you cannot have a broken story with a working harness (or vice versa).

**Alternatives considered**:

- **Leave stories static; use web-shell for interactivity** — rejected. Loses the narrative value of stories for the blog post + stakeholder reviews (SC-009).

---

## R8. Viewport-race fix location

**Decision**: In `apps/vscode/src/webview/web/mapView.tsx`, emit a `viewport` postMessage both after React mount (`useEffect(() => { postMessage({type: 'viewport', ...}); }, [])`) **and** after Leaflet's `map.whenReady(() => postMessage({type: 'viewport', ...}))`. The extension-side handler is idempotent per field, so the double-emit is safe.

**Rationale**:

- FR-050. Currently the viewport `useState<{center, zoom} | undefined>` starts undefined and is set only when an inbound `setViewport` arrives — but some embeds do not fire the inbound event reliably on first open (root cause of the existing "viewport not reported" toast).
- Double-emit covers both race arms: either the useEffect fires first (no map yet — emits with Leaflet defaults) or `whenReady` fires first (emits with the real map state). The second emit corrects the first if needed.
- Idempotent at the session-store reducer because each viewport field (`center`, `zoom`, `bounds`) is last-write-wins.

**Alternatives considered**:

- **Emit only on `whenReady`** — rejected. Covers the common case but not all embeds (some do not fire `load` / `whenReady` until user interaction).
- **Poll the map state** — rejected. Wasteful; and racy by construction.
- **Require the extension to bootstrap an initial viewport** — rejected. The extension doesn't know the map's final size until the webview reports it; forward flow is the right direction.

---

## R9. STAC-load null-diagnostic strategy

**Decision**: Add structured logging at each currently-silent null-return branch in `stacService.loadPlot` (lines 307, 375 of `apps/vscode/src/services/stacService.ts`). Each branch writes to the Debrief output channel with: (a) the specific failure cause (`"Plot item not found at path X"`, `"Plot item parse error: Y"`, `"Plot item missing required field Z"`, etc.), (b) the plot URI, and (c) any caught exception's message. No behaviour change on first pass; this is **diagnostic-first**, per SRD §3.8 (FR-070..FR-073).

**Rationale**:

- We do not know the root cause of the `Failed to load plot` error today. Guessing at a fix risks shipping the wrong one.
- With diagnostics live, reproducing against the plot from PR #520's manual test reveals the exact path. The fix then becomes targeted (correct path resolution, add missing field tolerance, tolerate symlinked store dir — whichever applies).
- Structured logging to the output channel is already the established Debrief pattern (used by #176's LogService).

**Alternatives considered**:

- **Guess + fix** — rejected. The SRD explicitly requires diagnostic-first; a wrong guess burns another round-trip.
- **Raise exceptions instead of returning null** — rejected. Breaks the contract with every existing caller; out of scope here.

---

## R10. Code-server test split

**Decision**: `tests/e2e/test-storyboard-edit.spec.ts` covers **only** flows that require real VS Code chrome: command-palette invocation for each of the 11 new commands; `showInputBox` prompts (rename, duplicate-timestamp, storyboard rename); `showQuickPick` for copy-to-other destination; native `showInformationMessage` / `showWarningMessage` toasts. All click flows (expand, overflow menu, form submit, undo, refresh) are covered exclusively in the web-shell suite.

**Rationale**:

- FR-033 + FR-034 + SRD design constraint: minimise flaky VS Code chrome time; keep Playwright under the per-test budget.
- `test-storyboard-playback.spec.ts` already establishes the `.monaco-inputbox input, .quick-input-widget input` selector pattern (lines 261–265) — reuse it verbatim.
- One screenshot (`vscode-native-chrome.png`) captured mid-flow is enough evidence that the integration point works; the detailed flow evidence lives in the web-shell suite.

**Alternatives considered**:

- **Re-run every web-shell scenario in code-server for "full coverage"** — rejected. Doubles flake risk, doubles CI time, duplicates signal.
- **Skip code-server entirely (trust the web-shell)** — rejected. `showInputBox` / `showQuickPick` / native notifications only exist inside VS Code; FR-033 requires their integration to be tested.

---

## R11. `a11y` audit surface

**Decision**: Run `@axe-core/playwright` against:

1. The Storyboard panel with the overflow menu open (the new surface)
2. The Storyboard panel with an edit form open + stale badge visible (combined state)
3. The Storybook iframe for each of the four upgraded edit-suite stories

No serious/critical violations permitted; moderate violations documented in `evidence/a11y-report.md` with either a fix or an accepted-risk entry.

**Rationale**:

- The overflow menu is the highest-risk new surface for a11y regressions (right-click / keyboard-context-menu / ArrowDown nav are all new).
- Storybook stories are where stakeholder reviewers land first; a11y regressions here damage trust most.

**Alternatives considered**:

- **Manual audit only** — rejected. Non-reproducible; misses regressions.
- **Full-site axe scan** — rejected. Out of scope; this feature's contract is the menu + form, not the whole panel.

---

## R12. Evidence screenshot & GIF ownership

**Decision**: Screenshots and the < 5 s interaction GIF land under `specs/218-storyboarding-edit/evidence/screenshots/` (the parent feature's evidence dir), NOT under `specs/230-storyboard-edit-wiring/evidence/`.

**Rationale**:

- FR-040 explicitly requires this path (it completes #218's deferred T097).
- Downstream blog post + PR description reference the #218 evidence table; splitting artefacts across two directories breaks that flow.
- This feature's **own** evidence directory holds process artefacts only: `opening-context.md`, `a11y-report.md`, `viewport-diagnostic-log.md`, `stac-load-diagnostic-log.md`, `test-summary.md`.

**Alternatives considered**:

- **Write to `specs/230-.../evidence/screenshots/` and symlink** — rejected. Symlinks + Windows + cloud sessions = flaky. Direct write is the established pattern (`properties-screenshots.spec.ts`).
- **Write to both** — rejected. Duplication; drift risk.

---

## Summary of unresolved items

**None.** All NEEDS CLARIFICATION markers from planning were resolved above. The three SRD-level open questions (chevron glyph, overflow menu placement detail, escape key semantics, floating-ui decision) are addressed by R2, R5, and the edge-cases table in spec.md.

Proceeding to Phase 1 (data-model + contracts + quickstart).
