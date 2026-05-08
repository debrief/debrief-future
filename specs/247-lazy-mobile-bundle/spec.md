# Feature Specification: Lazy-load Backlog Navigator mobile component tree

**Feature Branch**: `247-lazy-mobile-bundle`
**Created**: 2026-05-06
**Status**: Draft
**Input**: User description: "[backlog-id:247] Backlog Navigator — lazy-load mobile component tree below the 1024px breakpoint — wrap the entire `src/components/mobile/*` subtree (CardList, ItemCard, BottomSheet, BottomSheetEditor, DescriptionEditorScreen, StickyPushBar, MobileFilterBar) in `React.lazy()` + `<Suspense>` so the desktop bundle never ships the mobile chunk and vice-versa. ~20 LoC + a Suspense fallback (a skeleton card list reusing `@debrief/components` skeletons). Trigger: when the desktop bundle nears the +30% cap committed in `scripts/bundle-baseline-244.json` (#244 review §Issue 4A) and there's nowhere else to cut without compromising the mobile experience."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Desktop visitor stops paying for mobile-only code (Priority: P1)

When someone opens the Backlog Navigator on a desktop-class viewport (≥1024px wide) — the dominant platform for triage and planning sessions — the browser only downloads the code that actually renders on that viewport. The mobile-only component tree (the swipeable card list, the bottom-sheet editor, the sticky push bar, etc.) is split into a separate chunk that desktop visitors never request.

**Why this priority**: This is the entire trigger for the ticket. The desktop bundle is governed by the +30% cap committed in `scripts/bundle-baseline-244.json` (introduced in #244 to keep the navigator's transfer cost bounded). The mobile component tree contributes meaningful weight — gestures, bottom-sheet machinery, mobile filter chips — that desktop visitors do not exercise. When the desktop bundle nears the cap and there is no further compression to cut, this ticket is the safety valve.

**Independent Test**: Build the navigator, inspect the emitted asset graph, and confirm that (a) the desktop entry chunk does not contain identifiers exported by `src/components/mobile/*`, and (b) loading the navigator on a ≥1024px viewport does not request the mobile chunk over the network.

**Acceptance Scenarios**:

1. **Given** a freshly deployed Backlog Navigator and a desktop viewport (≥1024px), **When** the user navigates to the navigator URL with a cold cache, **Then** the network panel shows the main entry chunk being requested but no chunk containing mobile component code is requested.
2. **Given** the production build output, **When** the asset graph is inspected, **Then** the components in `src/components/mobile/*` resolve to a separate chunk distinct from the main entry chunk, and that chunk's identifiers do not appear in the entry chunk.
3. **Given** the bundle-size budget recorded in `scripts/bundle-baseline-244.json`, **When** the desktop main chunk is measured after this change, **Then** its byte size is strictly smaller than the combined single-chunk baseline captured before the split.

---

### User Story 2 - Mobile visitor sees an immediate skeleton, then the card list (Priority: P1)

When someone opens the Backlog Navigator on a phone or narrow viewport (<1024px), the page paints something useful immediately — a skeleton resembling the card list — while the mobile chunk is being fetched, parsed, and executed. The user is never staring at a blank screen, and the transition from skeleton to real cards is calm (no layout jank, no flash of error UI under healthy network conditions).

**Why this priority**: The whole point of code-splitting is undermined if mobile users perceive a regression. Mobile traffic is, by definition, the audience for this code. A jarring blank-screen window during chunk fetch would be worse than the bundle savings delivered to desktop users. This story closes the loop.

**Independent Test**: Throttle the network to a slow 3G profile in the browser, open the navigator on a narrow viewport, and confirm the skeleton appears within the first paint and is replaced cleanly by the real card list once the chunk arrives.

**Acceptance Scenarios**:

1. **Given** a mobile viewport (<1024px) and a cold cache, **When** the user opens the navigator, **Then** a skeleton card list (reusing the `@debrief/components` skeleton primitives) is visible on first paint and remains visible until the mobile chunk is ready.
2. **Given** the mobile chunk has loaded, **When** rendering completes, **Then** the skeleton is replaced by the real card list with no layout shift greater than would occur without code-splitting.
3. **Given** the mobile chunk is already cached (warm visit, second navigation in the same session, or PWA offline), **When** the user opens the navigator on mobile, **Then** the skeleton is either not shown or is shown so briefly that there is no perceptible delay.

---

### User Story 3 - Viewport transitions and chunk-load failures degrade gracefully (Priority: P2)

When a user crosses the 1024px breakpoint mid-session — rotating a tablet, resizing a desktop browser to a narrow side-panel, or unplugging an external monitor — the navigator transitions to the appropriate layout without breaking. If the network drops or a stale chunk URL is invalidated by a fresh deploy mid-session, the user sees an actionable recovery affordance rather than a silent failure.

**Why this priority**: These are real conditions for an installable PWA that lives across desktop and mobile. The lazy boundary introduces a new failure mode (chunk load can fail) that did not exist when everything shipped in one bundle. Regression here would erode trust.

**Independent Test**: (a) Resize a desktop browser from 1200px to 600px and confirm the mobile card list lazy-loads and renders; (b) block the chunk URL via DevTools network blocking, reload on mobile, and confirm a clear "couldn't load — try again" affordance.

**Acceptance Scenarios**:

1. **Given** a desktop viewport that has rendered the desktop layout, **When** the user resizes the window below 1024px, **Then** the navigator fetches the mobile chunk (if not already cached), shows the skeleton during the fetch, and then renders the mobile card list.
2. **Given** the mobile chunk URL is unreachable (network blocked, 404, or fresh-deploy chunk invalidation), **When** the user opens the navigator on mobile, **Then** a recovery message is shown that names the failure in user-friendly terms and offers a retry action (typically a full reload).
3. **Given** the navigator is installed as a PWA and the device is offline, **When** the user opens the app on mobile, **Then** the mobile chunk loads from the service-worker cache and the skeleton-to-content transition completes without a network round-trip.

---

### Edge Cases

- **Viewport at exactly 1023/1024px**: Resize crossings exactly on the breakpoint must not thrash between layouts. The behaviour should match the existing `useIsMobile` hook (`MOBILE_BREAKPOINT_MAX = 1023`).
- **Chunk-load races on slow networks**: A user who resizes the window twice in quick succession (desktop → mobile → desktop) before the mobile chunk arrives must not be left with a stuck skeleton when they end on desktop, nor with mismatched layout if they end on mobile.
- **Stale chunk after deploy**: When a new deploy invalidates the chunk URL embedded in the running session's main bundle, the chunk fetch will 404. The recovery UX must handle this without leaving the user with a blank screen.
- **Bundle baseline file**: The desktop-bundle measurement script that consumes `scripts/bundle-baseline-244.json` must continue to work. After this change there is more than one JS asset; the measurement contract may need to identify the desktop entry chunk explicitly rather than summing all JS.
- **Offline-first PWA on first visit**: A user who visits the navigator for the first time while offline (e.g. cold open from the home-screen icon before any prior online visit) cannot lazy-load anything. This is an inherited limitation of code-splitting + PWAs and is acceptable; offline-first only protects users who have visited before.
- **Tests and Storybook**: Existing unit tests, Playwright tests, and stories that import mobile components directly must continue to work. Test importers may bypass the lazy boundary.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Backlog Navigator's desktop entry chunk MUST NOT contain code from `src/components/mobile/*` (CardList, ItemCard, BottomSheet, BottomSheetEditor, DescriptionEditorScreen, StickyPushBar, MobileFilterBar).
- **FR-002**: When a user is on a viewport <1024px and the mobile component code has not yet loaded, the navigator MUST render a skeleton fallback that visually approximates a card list and reuses the existing skeleton primitives in `@debrief/components`.
- **FR-003**: Once the mobile component code has loaded, the navigator MUST replace the skeleton with the real mobile card list without a full-page reload.
- **FR-004**: When the user crosses the 1024px breakpoint during a session, the navigator MUST lazy-load any not-yet-loaded chunk required by the new viewport, showing the skeleton fallback during the fetch.
- **FR-005**: When the lazy-loaded chunk fails to load (network error, 404, or stale-deploy URL), the navigator MUST present an actionable recovery message that explains the failure in plain language and offers a retry path (reload).
- **FR-006**: The PWA service-worker configuration MUST cache the mobile chunk so that a user who has previously loaded the navigator online can open it on mobile while offline.
- **FR-007**: The bundle-budget measurement that reads `scripts/bundle-baseline-244.json` MUST continue to gate desktop-bundle growth correctly after the split — i.e. it must measure the *desktop entry chunk*, not the sum of all JS assets, so that mobile-only code excluded from the entry chunk is correctly excluded from the desktop budget.
- **FR-008**: The 1024px breakpoint that drives the lazy decision MUST remain a single source of truth aligned with the existing `MOBILE_BREAKPOINT_MAX` constant; no new divergent breakpoint may be introduced.
- **FR-009**: All existing unit tests, Playwright E2E tests, and Storybook stories that exercise mobile components MUST continue to pass without removing assertions on functionality (test environments may opt out of the lazy boundary, but the behaviour they assert must remain unchanged).
- **FR-010**: Telemetry-style logs already emitted on viewport transitions and on PWA offline-load events MUST NOT regress; no log line that was previously emitted should disappear because of the split.

### Key Entities

- **Desktop entry chunk**: The JavaScript asset downloaded by every visitor on first navigation. After this change, contains the desktop layout (table mode, filter bar, push dialog, etc.) but excludes any module under `src/components/mobile/*`.
- **Mobile chunk**: A separately-emitted JavaScript asset containing the `src/components/mobile/*` subtree. Requested only when the navigator decides to render the mobile layout.
- **Skeleton fallback**: The placeholder UI rendered while the mobile chunk is in flight. Resembles a card list and reuses `@debrief/components` skeleton primitives.
- **Bundle baseline (`scripts/bundle-baseline-244.json`)**: The committed budget artefact recording the pre-#244 single-chunk size and the +15% target / +30% cap that gate desktop-bundle growth in CI.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Render the right layout for the user's current viewport while paying only for the code that layout actually needs.
- **Key Decision(s)** *(made by the system, not the user)*:
  1. Viewport class (mobile / desktop) at the moment of render — drives which subtree to mount.
  2. Whether the relevant chunk is already loaded — drives whether to show a skeleton or proceed straight to content.
- **Decision Inputs**: Window inner-width vs. the 1024px breakpoint; presence of the mobile module in the JS module cache (or, on subsequent visits, in the PWA service-worker cache).

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Cold visit on mobile (<1024px) | Opens the navigator | Skeleton card list paints immediately while mobile chunk is fetched |
| 2 | Mobile chunk arrives | (passive) | Skeleton is replaced by the real card list with no full-page reload |
| 3 | Cold visit on desktop (≥1024px) | Opens the navigator | Desktop layout paints from the entry chunk; mobile chunk is never requested |
| 4 | Resize desktop → mobile | Drags window narrower than 1024px | Navigator shows skeleton, fetches mobile chunk if needed, then renders card list |
| 5 | Chunk fetch fails | (network loss or stale-deploy URL) | Recovery message appears with a clear retry/reload action |

### UI States

- **Empty State**: Not applicable to this change — emptiness is governed by the existing card-list-empty state, which is unchanged.
- **Loading State**: Skeleton card list (reusing `@debrief/components` skeleton primitives) — visible during the mobile chunk fetch on cold mobile visits and during viewport transitions that cross the breakpoint for the first time in a session.
- **Error State**: Recovery panel shown when the lazy chunk cannot be loaded; reuses the navigator's existing error-banner styling and offers a reload action. The wording explains that part of the app couldn't load and recommends reloading.
- **Success State**: The real mobile card list, indistinguishable from the pre-split experience.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The desktop entry chunk emitted by the production build is at least 15 KB smaller (transferred / pre-gzip JS) than the pre-split entry chunk measured against the same git tree, and the saving is attributable to the absence of `src/components/mobile/*` modules in the entry chunk.
- **SC-002**: After this change the desktop entry chunk is, and remains for the foreseeable backlog, comfortably below the +30% cap recorded in `scripts/bundle-baseline-244.json`, restoring headroom for incremental desktop features.
- **SC-003**: On a cold mobile visit over a slow-3G-equivalent network, the skeleton fallback is visible within the first contentful paint, and the median time from skeleton to real card list is under 2 seconds on that profile.
- **SC-004**: First contentful paint on a cold desktop visit is no slower than before the split (within measurement noise), and is expected to be marginally faster owing to the smaller entry chunk.
- **SC-005**: 100% of existing automated test runs (unit, E2E, Storybook visual where applicable) pass after the split with no test changes that weaken assertions on functionality.
- **SC-006**: When the lazy chunk is artificially blocked, the recovery message is reachable and offers a working reload affordance — i.e. zero "blank screen" failure modes remain.
- **SC-007**: When the navigator is opened from the PWA shell while offline, after at least one prior online visit, the mobile card list renders without a network round-trip.
- **SC-008**: Desktop first-paint time-to-interactive after the split MUST NOT exceed the pre-change baseline by more than 5%, measured on the same hardware/network profile against the same git tree. This is the regression mitigation for any overhead introduced by the lazy boundary's runtime machinery (Suspense, error boundary, manifest plumbing) on the desktop path that does not benefit from the chunk-size reduction.

## Assumptions

- The desktop bundle measurement script consuming `scripts/bundle-baseline-244.json` either already targets a named "entry" asset, or will be adjusted (in plan/tasks) so that the budget gate measures the desktop entry chunk and not the sum of all emitted JS. Without this, the split would mechanically *add* to the measured budget rather than reduce it, defeating the ticket's purpose.
- **Scope is mobile-only.** This iteration lazy-loads the mobile subtree only; the desktop component tree remains eagerly imported by the entry chunk. The "and vice-versa" phrasing in the original ticket is **explicitly out of scope** here — wrapping the desktop tree in a symmetric `React.lazy()` boundary to also remove desktop code from mobile transfers is deferred. Trigger for revisiting: subsequent mobile-side bundle measurement showing mobile transfer dominated by desktop-only modules. Tracked as backlog item #252.
- The 1024px breakpoint is fixed and matches the existing `MOBILE_BREAKPOINT_MAX = 1023` constant used by `useIsMobile`. No breakpoint change is part of this work.
- `@debrief/components` already exposes a skeleton primitive suitable for the card-list fallback. If it does not, an in-app skeleton built from the same primitives stack (no new dependency) is acceptable.
- The PWA workbox configuration introduced in #244 already covers same-origin chunk URLs by default; no new caching strategy is required, only verification that the chunk falls under the existing strategy.
- Test environments (Vitest, Playwright, Storybook) are permitted to import mobile components statically, bypassing the lazy boundary, in order to keep tests deterministic. The lazy boundary lives at the App-level call site, not inside the mobile components themselves.
