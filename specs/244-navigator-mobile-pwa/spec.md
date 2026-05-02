# Feature Specification: Backlog Navigator — Full Mobile Parity (PWA)

**Feature Branch**: `244-navigator-mobile-pwa` (cloud session: `claude/implement-speckit-244-KPwO3`)
**Created**: 2026-05-02
**Status**: Draft
**Input**: BACKLOG.md item 244 — `[backlog-id:244]` handoff from `/speckit.start 244`. Source idea: `docs/ideas/244-backlog-navigator-mobile.md`. Follow-up to #242 (desktop Backlog Navigator).

**Coordination note**: Spec #243 (Backlog Navigator UI Refresh) is in flight in
parallel. This spec assumes the post-#243 view of the desktop layout (10
columns: ID, Category, Description, **Score**, Status, Epic, Touched,
**Dates**, Live Status; Phase + Include-completed filter; strikethrough on
`complete`). If #243 is rejected or amended before merge, the mobile layout
in this spec falls back to whatever desktop ships with — there is **no
mobile-specific column override beyond what the responsive layout already
adapts**.

## Why this exists

The desktop Backlog Navigator (#242) gave us a fast, in-browser editor for
`BACKLOG.md` running entirely in the analyst's GitHub-authenticated browser
session. Reviewer feedback after the first week is that the navigator is
useful **anywhere the analyst already has GitHub** — including on a phone
during a stand-up, or on an iPad during a coffee-shop triage pass. The
existing 12-column table (10 post-#243) is unusable below ~900px viewport
width: cells truncate, inline editors don't fit, and there's no realistic
way to type a status change with a thumb.

Building a sibling mobile app would split the parser, state model, and push
pipeline across two codebases and double the maintenance cost. Instead, this
feature extends the existing single-page React app with **responsive layout
+ mobile-native interaction patterns + PWA installability**, so the same
deployed app at the same URL works on every screen size the analyst already
uses, with no second codebase, no extra deploy target, and no behavioural
divergence between hosts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse and find a backlog item from a phone (Priority: P1)

An analyst on a phone (e.g. iPhone 12, viewport `375 x 812`) opens the
navigator URL, lands in an authenticated GitHub session, and needs to find
a specific backlog row by scrolling and/or filtering — without zooming,
horizontal-scrolling, or rotating to landscape.

**Why this priority**: Without browse + find on a phone, the rest of mobile
parity is irrelevant. This is the smallest functional slice that delivers
real value (read-only consultation during a meeting).

**Independent Test**: Load the deployed navigator at `375 x 812`, confirm
the card list renders, scroll to row #150, confirm its Description, Score,
Phase, and Updated date are all readable without horizontal scroll.

**Acceptance Scenarios**:

1. **Given** the analyst is signed in on a phone at `375 x 812`, **When** they navigate to the deployed navigator URL, **Then** the backlog renders as a vertical card list (one row per card), every card fits within the viewport width with no horizontal overflow, and the list scrolls smoothly through 200+ rows without dropped frames.
2. **Given** the card list is rendered, **When** the analyst types `123` into the search field, **Then** the visible cards are filtered to those whose ID contains `123` or whose Description matches the term, using the same matching rules as the desktop search input.
3. **Given** the card list is rendered, **When** the analyst opens the Phase filter and selects **Active**, **Then** the list narrows to rows whose status is in the Active phase (`implementing`, `blocked`), matching the post-#243 phase definition exactly.
4. **Given** any card list state, **When** the analyst toggles the **Include completed items** checkbox, **Then** rows in the Done phase appear or hide consistent with the post-#243 desktop behaviour.

---

### User Story 2 — Edit a row from a phone or tablet (Priority: P1)

The same analyst now wants to change a row's Status from `proposed` to
`approved`, edit a Score, and change a Category — using a touch interface
without any keyboard mode that obscures more than half the viewport.

**Why this priority**: Tied with Story 1 for P1. The whole reason mobile
parity matters is that decisions made in stand-ups need to land in
`BACKLOG.md` immediately, not "when I get back to my desk."

**Independent Test**: Load the deployed navigator at `375 x 812`, tap row
#10, change its Status to `approved` via the bottom-sheet editor, confirm
the change appears in the card and is queued for push.

**Acceptance Scenarios**:

1. **Given** the card list is rendered on a phone, **When** the analyst taps any cell-equivalent control inside a card (Status badge, Score chip, Category chip, Epic tag), **Then** a bottom sheet slides up from the bottom edge containing the relevant editor (dropdown for Status/Category/Epic, number stepper for V/M/A scores).
2. **Given** the bottom sheet is open, **When** the analyst dismisses it (drag-down gesture, tap-outside, or explicit Close button), **Then** any pending edit either commits (if Save was tapped) or discards (if Cancel/dismiss was used), with the same commit semantics as the desktop inline editor.
3. **Given** the bottom sheet is open, **When** the on-screen keyboard appears (for inputs that need it), **Then** the active input field stays visible above the keyboard and the sheet content scrolls if necessary; the keyboard never covers the input.
4. **Given** an edit has been made, **When** the analyst returns to the card list, **Then** the changed cell renders the new value and the card displays a "modified" indicator consistent with the desktop dirty-row marker.

---

### User Story 3 — Edit Description in a full-screen Markdown editor (Priority: P2)

The analyst needs to revise a long Description (paragraphs, embedded
Markdown links to other specs, escaped pipes) on a phone or tablet, with
enough vertical space to actually read what they're editing.

**Why this priority**: Description is the only free-text field and is
routinely 200–600 characters. Squeezing it into a bottom sheet would force
either a tiny editor or a sheet that's already 90% of the screen. A
full-screen modal is the standard mobile pattern.

**Independent Test**: Tap the Description in any card; confirm a
full-screen editor opens with the raw Markdown source, allow editing, save,
and confirm the rendered Markdown updates in the card.

**Acceptance Scenarios**:

1. **Given** the card list is rendered on a phone, **When** the analyst taps the Description region of a card, **Then** a full-screen editor opens covering the entire viewport, showing the raw Markdown source in an editable textarea with monospace font.
2. **Given** the full-screen editor is open, **When** the analyst taps Save, **Then** the editor dismisses, the card's Description re-renders the new Markdown (links, strikethrough, escaped pipes), and the row is marked dirty.
3. **Given** the full-screen editor is open with unsaved changes, **When** the analyst taps the back/dismiss control, **Then** a confirmation prompt appears asking whether to discard changes; only an explicit confirm dismisses without saving.

---

### User Story 4 — Push changes from a phone (Priority: P2)

After making one or more edits during a stand-up, the analyst wants to push
the changes to GitHub from the phone, without scrolling back up to find a
top-bar Push button.

**Why this priority**: Without a usable Push affordance, every mobile edit
session ends with "I'll push it later from my laptop" — which defeats the
point. P2 because it's only meaningful once Stories 1 + 2 work.

**Independent Test**: Make any edit on a phone; confirm a sticky bottom bar
appears with a Push-Changes button; tap Push; confirm the same PR or commit
flow as desktop runs and reports success.

**Acceptance Scenarios**:

1. **Given** the analyst has made one or more dirty edits on a phone, **When** any card is rendered in any scroll position, **Then** a sticky bottom bar appears showing a dirty count and a Push-Changes button, fixed to the viewport bottom and not occluded by the device's home-bar safe area.
2. **Given** the sticky push bar is visible, **When** the analyst taps Push-Changes, **Then** the same push flow as desktop runs (commit message prompt, GitHub API call), and the bar updates to reflect success/failure with the same conflict-detection semantics as desktop.
3. **Given** there are no dirty edits, **When** the user views the card list, **Then** the sticky push bar is **hidden** (it appears only when there's something to push), to avoid permanent screen-real-estate cost.

---

### User Story 5 — Install as a Progressive Web App (Priority: P3)

The analyst, having used the navigator on their phone twice, wants to add
it to their home screen so it opens like a native app (no browser chrome,
fast cold start, app icon).

**Why this priority**: P3 because the responsive layout (Stories 1–4) is
the substantive deliverable; PWA installability is an ergonomic upgrade on
top. Worth doing in the same feature because it shares the bundle and the
acceptance gates already include a Lighthouse PWA score.

**Independent Test**: Open the deployed navigator on a phone; confirm the
browser surfaces an "Add to Home Screen" affordance (or that the app meets
the PWA install criteria); install; confirm the app launches from the home
screen with its own icon, no browser chrome, and the cached app shell loads
even with the device in airplane mode (data still requires network).

**Acceptance Scenarios**:

1. **Given** the analyst has visited the navigator at least once on a mobile browser, **When** they trigger the browser's install affordance ("Add to Home Screen" / "Install app"), **Then** the app installs successfully and a home-screen icon appears with the navigator's branding.
2. **Given** the app is installed, **When** the analyst launches it from the home screen, **Then** it opens in standalone mode (no browser address bar, no tabs), and the app shell renders within the cold-start budget defined in Success Criteria.
3. **Given** the device is offline (airplane mode) and the app shell is cached, **When** the analyst launches the installed app, **Then** the app shell renders with a clear "offline — backlog data unavailable" empty state; no crash, no white screen, no console errors.
4. **Given** Lighthouse is run against the deployed app on a mobile profile, **When** the PWA category is evaluated, **Then** the score is **≥ 90**.

---

### Edge Cases

- **Boundary at 1024px**: A device or browser sized exactly `1024 x N` MUST render the desktop table layout, not the card list. Below 1024px = mobile. (Convention: `min-width: 1024px` for desktop.)
- **Tablet portrait `768 x 1024`**: Renders the mobile card list, **not** the desktop table — viewport width is below 1024px. Bottom-sheet editors must accommodate the wider tablet width without stretching to absurd line lengths.
- **Tablet landscape `1024 x 768`**: Renders the desktop table layout (≥1024px). Tap targets must remain ≥44×44 CSS pixels even though the layout is desktop-style.
- **Rotation while a bottom sheet is open**: The sheet must reflow to the new viewport width; it must not leave the screen partially off-edge or cover content that's now a different size.
- **On-screen keyboard partially covers bottom sheet**: The active input remains visible (sheet content scrolls / sheet rises above keyboard); the sheet does not get "stuck" behind the keyboard.
- **Card list with 230+ rows**: Scroll performance does not degrade with row count (virtualisation required); first-paint cost is not proportional to row count.
- **Description with embedded Markdown table or escaped pipe (`\|`)**: Renders correctly in the card, opens correctly in the full-screen editor (raw source preserved), and round-trips byte-stable through the parser.
- **Network drops mid-push from a phone**: Push reports a clear error with the same retry semantics as desktop; dirty edits are not lost.
- **Service worker update**: When a new version of the app is deployed, the previously installed PWA must surface an "update available" affordance and reload to the new version on user confirmation; it must not silently keep showing stale code.
- **Storage cleared by browser**: If the OS evicts the service-worker cache (e.g. low storage), the next online launch must re-fetch the app shell without user intervention.

## Requirements *(mandatory)*

### Functional Requirements

**Layout and rendering**

- **FR-001**: The system MUST render a single responsive React app whose layout adapts at the `1024px` viewport-width breakpoint: card list below, desktop table at and above.
- **FR-002**: The card list MUST be virtualised so the number of DOM rows on screen is bounded by the viewport, regardless of total item count.
- **FR-003**: Each card MUST surface (at minimum) the row's ID, Category, Description, Score (`Total` primary; `V·M·A` secondary), Phase/Status, Updated date, Epic tag (if any), and Live Status (if any), arranged so all primary information is readable without horizontal scroll at `375 x 812`.
- **FR-004**: A row whose status is `complete` MUST render its Description with strikethrough/muted styling on the card, consistent with the post-#243 desktop convention.

**Interaction**

- **FR-005**: Tapping a card's Status, Category, Epic, or Score control MUST open a bottom sheet containing the appropriate editor (dropdown for enums; number stepper for V/M/A axes; preserves the post-#243 inline-edit dropdown options).
- **FR-006**: Tapping the Description region of a card MUST open a full-screen Markdown source editor.
- **FR-007**: The bottom sheet MUST be dismissible by drag-down gesture, tap-outside, and an explicit Close control.
- **FR-008**: All tap targets (card interactive zones, bottom-sheet controls, push button) MUST be at least `44 x 44` CSS pixels.
- **FR-009**: The full-screen Markdown editor MUST prompt for confirmation before discarding unsaved changes.
- **FR-010**: A sticky bottom Push-Changes bar MUST appear on viewports below 1024px **only when there are unsynced dirty edits**, displaying the dirty-count and a Push button.

**Filtering and search**

- **FR-011**: The mobile filter UI MUST expose the same Phase + Include-completed filter shape as the post-#243 desktop layout (5 phases: any, Triage, Ready, Active, Done; checkbox forced-on when Phase = Done).
- **FR-012**: The mobile search MUST behave identically to desktop search (same matching rules, same field coverage).
- **FR-013**: The default sort on first load MUST be Updated descending, matching the post-#243 desktop default.

**Codebase invariants**

- **FR-014**: The mobile layout MUST share the same parser, state model, and push pipeline as desktop. There MUST NOT be a sibling mobile codebase.
- **FR-015**: Every status change, score change, category change, description change, and push operation made on mobile MUST produce **byte-identical** `BACKLOG.md` output to the same change made on desktop.
- **FR-016**: The same conflict-detection model as desktop MUST apply to mobile pushes (e.g. push fails when the remote `BACKLOG.md` has moved since the local fetch).

**PWA**

- **FR-017**: The app MUST ship a valid PWA manifest with name, short name, icons (at least 192×192 and 512×512), `display: standalone`, theme colour, and start URL.
- **FR-018**: The app MUST register a service worker that caches the app shell (HTML, JS, CSS, fonts, icons) so the shell loads when the device is offline.
- **FR-019**: When offline, the app MUST display a clear "backlog data unavailable" empty state in the card list area; it MUST NOT crash, white-screen, or display stale data without clearly indicating it is stale.
- **FR-020**: When a new version of the service worker is detected on a subsequent visit, the app MUST surface an "update available" affordance and reload to the new version on user confirmation. Silent stale-version persistence is forbidden.

**Testing gates**

- **FR-021**: Multi-viewport Playwright tests MUST exercise Story 1 + Story 2 acceptance scenarios at all three target viewports: `375 x 812`, `768 x 1024`, and `1024 x 768`.
- **FR-022**: A Lighthouse PWA audit MUST be run as a CI gate against a representative deployed/preview build; the threshold is **≥ 90** for the PWA category.
- **FR-023**: The desktop E2E suite from #242 (`browse / interaction / a11y / realWrite / prMode`) MUST continue to pass at `≥ 1024px` after this feature lands. No regressions to desktop behaviour.
- **FR-024**: The build MUST not increase the desktop bundle's gzipped JavaScript payload by more than **15%** relative to the pre-244 baseline. (Carry-cost guard for the responsive logic.)

### Key Entities *(include if feature involves data)*

- **BacklogItem**: Same shape as #242 (`Item` from `apps/backlog-navigator/src/types.ts`). No mobile-specific schema. ID, Category, Description, V, M, A, Total, Complexity, Status, Epic, Touched/Live status, Created, Updated.
- **MobileLayoutMode**: Derived UI state — `card-list` when `viewport-width < 1024px`, `desktop-table` otherwise. Single source of truth: media query / `matchMedia`.
- **BottomSheetState**: Transient UI state — `open | closed`, `editor-kind` (status / category / epic / score-V / score-M / score-A), `pending-value`, `dirty`. Discarded on dismiss.
- **DescriptionEditorState**: Transient UI state for the full-screen editor — `open | closed`, `raw-markdown`, `dirty`.
- **PWAInstallState**: Read-only signal — `not-installed | installable | installed`, derived from browser-native PWA install events.
- **ServiceWorkerUpdateState**: `up-to-date | update-available | updating`, surfaced to the UI when a new version is detected.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: A single deployed Backlog Navigator that an analyst can use comfortably on a phone, tablet, or laptop without switching apps, codebases, or workflows.
- **Key Decision(s)**:
  1. **Browse vs. edit vs. push**: at any moment the analyst is in one of these three modes; the UI must make the current mode obvious and the transitions thumb-cheap.
  2. **Save vs. discard**: every editor (bottom sheet, full-screen Markdown) presents the same Save/Cancel decision with consistent semantics.
  3. **Push now vs. push later**: when the dirty bar appears, the analyst decides whether this is a good moment to commit. Bar must be present **only** when there's something to push, to avoid pressuring the user to push prematurely.
- **Decision Inputs**: Card content (ID, Description, Score, Phase, Updated), dirty-count badge on the push bar, conflict-detection error messaging on push failure, browser-native PWA install affordance.

### Screen Progression

| Step | Screen/State                            | User Action                                           | Result                                                              |
|------|-----------------------------------------|-------------------------------------------------------|---------------------------------------------------------------------|
| 1    | Card list (browse mode)                 | Scroll / search / filter                              | Locates the target row                                              |
| 2    | Card list with target visible           | Tap a Status/Category/Epic/Score control on the card  | Bottom sheet slides up with the relevant editor                     |
| 3    | Bottom sheet open                       | Change value, tap Save                                | Sheet dismisses, card shows new value, row marked dirty             |
| 3a   | Card with long Description              | Tap Description region                                | Full-screen Markdown editor opens                                   |
| 3b   | Full-screen Markdown editor             | Edit raw source, tap Save                             | Editor dismisses, card re-renders new Markdown, row marked dirty    |
| 4    | Card list with one or more dirty rows   | (any scroll position)                                 | Sticky bottom Push-Changes bar appears with dirty-count             |
| 5    | Push bar visible                        | Tap Push-Changes                                      | Same push flow as desktop; bar reflects success/failure             |
| 6    | After successful push                   | (continues browsing or closes app)                    | Dirty count returns to zero; sticky bar hides                       |

### UI States

- **Empty State**:
  - **Card list, no rows match filter**: "No items match your filter." with a Reset link.
  - **Card list, offline first launch**: "Backlog data unavailable — you're offline. Reconnect to load items." (App shell still renders.)
- **Loading State**: Skeleton cards (4–6) animate while the parser hydrates from the fetched `BACKLOG.md`. Same skeleton component is reused on desktop.
- **Error State**:
  - **Parse error**: Full-card error region with the parser's error message and a Retry control.
  - **Push conflict**: Sticky bar turns red and shows "Remote moved — pull and review before retrying." (Same wording as desktop conflict.)
  - **Network error during push**: Sticky bar shows "Push failed — check connection." with a Retry control.
- **Success State**:
  - **Edit committed**: Card briefly highlights (subtle background flash) to confirm the change landed in local state.
  - **Push succeeded**: Sticky bar shows a transient "Pushed N changes" toast then hides. Dirty count returns to zero.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At viewport `375 x 812`, the analyst can locate any backlog row in **under 10 seconds** using either scroll or search, with the card list scrolling at **≥ 50 fps** on a representative mid-tier device profile.
- **SC-002**: At viewport `375 x 812`, the analyst can change a row's Status from `proposed` to `approved` in **3 taps or fewer** (open card, open status editor, select value).
- **SC-003**: At viewport `375 x 812`, the analyst can open the Description editor, append a sentence, save, and see the updated Description on the card in **under 15 seconds** of continuous interaction.
- **SC-004**: At viewport `375 x 812`, after one or more edits, the analyst can push to GitHub in **2 taps** (open push bar action, confirm).
- **SC-005**: 100% of the Story 1 + Story 2 acceptance scenarios pass at all three target viewports (`375 x 812`, `768 x 1024`, `1024 x 768`) in CI.
- **SC-006**: Lighthouse PWA score is **≥ 90** on a representative mobile build profile, measured in CI.
- **SC-007**: After installing the PWA, cold-start time from home-screen tap to the first interactive card list is **under 3 seconds** on a representative mid-tier device profile (network-permitting; offline cold-start to app-shell-ready is **under 1.5 seconds**).
- **SC-008**: The desktop E2E suite from #242 continues to pass at 100% after this feature lands. **No regressions** in desktop behaviour, layout, or push semantics.
- **SC-009**: Every mobile-originated change to `BACKLOG.md` produces output **byte-identical** to the same change made via the desktop UI, verified by the round-trip Vitest gate from #242 / #245.
- **SC-010**: The desktop bundle's gzipped JS payload grows by **≤ 15%** relative to the pre-244 baseline.
- **SC-011**: When a new app version is deployed, an installed PWA surfaces an "update available" affordance within **one minute** of the next launch, and reloads to the new version on user confirmation. Zero observed cases of indefinite stale version.

## Assumptions

These assumptions were used to fill gaps in the input rather than emitting
[NEEDS CLARIFICATION] markers. They are reasonable defaults; reviewers
should flag any that conflict with their understanding.

- **A-1 — Offline edits are out of scope.** "Offline shell" means the app shell loads when offline so the user can launch the installed app and see a graceful empty state. It does **not** mean queued edits while offline; the existing GitHub-backed model (fetch from raw, push via API) requires network for both fetch and push, and adding offline edit queueing introduces a conflict-resolution surface that is not in scope for this feature.
- **A-2 — Single breakpoint at 1024px.** No fine-grained breakpoints (e.g. separate phone/tablet/landscape rules); the card list adapts within itself for any width below 1024px. This matches the description's three target viewports (one phone + two tablet) and avoids combinatorial test surface.
- **A-3 — No native install prompting.** The app does not implement custom install prompts (`beforeinstallprompt` capture + custom CTA); it relies on the browser's native install affordance. This is the most platform-respectful default and avoids the "annoying install prompt" anti-pattern.
- **A-4 — Same authentication path as desktop.** Mobile uses the same GitHub-authenticated browser session as desktop (#242). No separate OAuth flow, no PAT-on-mobile UX.
- **A-5 — Card surfaces the same fields as the post-#243 desktop columns.** ID, Category, Description (with strikethrough on `complete`), Score (Total + V·M·A), Phase/Status, Epic tag, Updated date, Live Status. No mobile-only field hiding beyond the layout adaptation.
- **A-6 — Bottom-sheet gesture is hand-rolled.** Per Article IX guidance and the source idea doc, the gesture is hand-rolled (~80 lines) unless implementation finds it brittle, in which case `vaul` is evaluated. This is a planning-time decision and does not affect the spec's behavioural requirements.
- **A-7 — Lighthouse audit runs against a representative build.** The CI gate measures a deployed/preview build (not a `vite dev` server). The exact runner placement (existing CI workflow vs. new job) is a planning decision.

## Dependencies

- **#242 (Backlog Navigator desktop)**: parent feature; this spec extends its app, parser, state model, and push pipeline. Must be merged before #244 implementation.
- **#243 (Backlog Navigator UI Refresh)**: in flight; supplies the post-merge column set, phase-filter shape, and strikethrough convention referenced throughout this spec. If #243 is rejected/amended, the parent state of those decisions changes; the mobile layout inherits whatever desktop ships with.
- **#245 (Backlog Navigator E2E fixture)**: in flight; replaces live-`BACKLOG.md` coupling in Playwright tests with a curated fixture. The mobile Playwright tests added in this feature SHOULD use the same fixture (depend on #245's path), not the live file. If #245 has not landed, the mobile tests can replicate the fixture pattern locally and migrate to the shared fixture later.
- **`@tanstack/react-virtual`**: already present in the project (added by #094); used for card-list virtualisation. No new dependency.
- **PWA tooling**: implementation may add a service-worker generator (e.g. `vite-plugin-pwa`) — that is a planning decision, not a spec requirement. The spec only requires the manifest + service-worker behaviour, not a specific tool.

## Out of Scope

- Native iOS / Android apps (App Store / Play Store distribution).
- Push notifications, badging, share-target, or any PWA capability beyond installability + offline app shell.
- Offline editing, queued edits, or background-sync of edits.
- Mobile-specific authentication flows (PATs entered on phone, biometric unlock, etc.).
- Mobile-specific data shapes, schemas, or `BACKLOG.md` columns (the file format is unchanged).
- Per-axis V/M/A sorting (already out of scope post-#243).
- A separate mobile codebase, sibling app, or alternate entry point. There is **one** app.
- Optimisations for very small phones below `320px` width (the floor is `375 x 812`).
- Optimisations for ultra-wide tablets above `1024px` width (those use the desktop layout unchanged).
