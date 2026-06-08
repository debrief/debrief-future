# Feature Specification: UI Review Follow-up — Remaining P1 & All P2 Fixes

**Feature Branch**: `281-ui-review-p1-p2-fixes`
**Created**: 2026-06-06
**Status**: Draft
**Input**: User description: "produce a plan to resolve the remaining P1 and all of the P2 issues identified in the UI review: docs/ui-review-2026-04-26.md"

## Context

The 2026-04-26 UI review (re-walked 2026-06-06) produced a prioritised punch
list of fourteen findings. As of the 2026-06-06 re-review, three of the five
P1 items are confirmed resolved on `main` (track symbology, properties dark
theme, VS Code toast pile-up). This feature closes the **remaining two P1
items** and **all four P2 items**. The P3 items are explicitly out of scope.

In-scope findings (review IDs):

| Review ID | Title | Surface | Review status |
|-----------|-------|---------|---------------|
| P1.3 | High-contrast LIGHT theme header links are below the contrast target | web-shell | Partially resolved — header re-skinned, link contrast still wants a fix/audit |
| P1.4 | `properties-screenshots` E2E suite is flaky | E2E | Unchanged — open |
| P2.1 | Default analysis-view split doesn't scale to wide screens | web-shell | Unchanged — open |
| P2.2 | At 720-tall viewports the Properties panel is hidden below the fold | web-shell | Unchanged — open |
| P2.3 | Catalog timeline + map preview row not (discoverably) collapsible | web-shell | Unchanged — open |
| P2.4 | Thumbnail S/M/L size toggle has no visible effect | web-shell | Unchanged — open |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Readable header links in high-contrast light mode (Priority: P1)

An analyst working in a bright environment (or with a vision-accessibility
requirement) switches the web-shell to the high-contrast **light** theme. The
header navigation links ("Component Storybook →", "VS Code Preview →", "Edit
Backlog →") must be clearly readable against the near-white background, meeting
the platform's accessibility commitment for its UK Defence audience.

**Why this priority**: P1 — accessibility/contrast failures erode trust and can
be a procurement blocker for the target audience. The review flags WCAG AAA in
high-contrast mode as "non-negotiable."

**Independent Test**: Switch to the high-contrast light theme and verify, by
automated contrast measurement, that every header link meets the contrast
target against its background; confirm visually that links are distinguishable
as links (not just coloured text).

**Acceptance Scenarios**:

1. **Given** the web-shell in high-contrast light theme, **When** the header is
   rendered, **Then** each header link's text-to-background contrast ratio is at
   least 7:1 (WCAG AAA for normal-size text).
2. **Given** the high-contrast light theme, **When** a user views the header
   links, **Then** each link carries a non-colour affordance (underline and/or
   bolder weight) so it is identifiable as a link without relying on colour
   alone.
3. **Given** any of the four shipped themes (light, dark, high-contrast light,
   high-contrast dark), **When** the header links are rendered, **Then** all
   links remain legible (no regression introduced by the high-contrast fix).
4. **Given** a future header link is added to the same group, **When** it is
   rendered in high-contrast light mode, **Then** it inherits the same readable
   treatment automatically (the fix is applied at the shared link/token level,
   not per-link).

---

### User Story 2 - Reliable properties-screenshots E2E run (Priority: P1)

A developer runs the `properties-screenshots` E2E suite as part of CI or a
pre-push check. The suite must pass deterministically on the first attempt, so
that a real regression in the properties form (for any feature type) is caught
rather than masked by retry-passing flake.

**Why this priority**: P1 — a flaky gate hides real regressions. The review
notes a ~2/13 first-attempt failure rate, which means a properties regression
affecting one feature type could slip through unnoticed.

**Independent Test**: Run the properties-screenshots suite repeatedly (e.g. 10
consecutive runs) with no retries permitted, and confirm a 100% first-attempt
pass rate.

**Acceptance Scenarios**:

1. **Given** the properties-screenshots suite, **When** it is run 10 times
   consecutively with retries disabled, **Then** it passes on the first attempt
   every time.
2. **Given** a row is clicked to open the properties form, **When** the test
   proceeds, **Then** it waits for the correct, reliably-present anchor element
   *before* the click that opens the form, rather than waiting for the form
   itself in a way that races the click.
3. **Given** the properties form genuinely fails to render after a row click,
   **When** the test runs, **Then** it fails with a clear, actionable assertion
   (the fix must not paper over real breakage by simply extending timeouts).

---

### User Story 3 - Analysis layout uses wide-screen space well (Priority: P2)

An analyst on a typical 1920×1080 display opens a plot in the analysis view.
The activity column (Time Controller, Tools, Layers, Properties) must be wide
enough to show its longest tool names (e.g. "Apply Symbol Style") without
truncation, while the map still gets the majority of the space. On narrower
displays (≤1366 wide) the activity column must not steal space the map needs.

**Why this priority**: P2 — wasted/awkward space at the analyst's most common
resolution lowers perceived polish but does not block core tasks.

**Independent Test**: Open the analysis view at 1280, 1440, and 1920 widths and
verify the activity column width adapts to the viewport band and that tool names
are fully visible at the wide band.

**Acceptance Scenarios**:

1. **Given** a viewport ≥1600px wide, **When** the analysis view opens with its
   default layout, **Then** the activity column is wide enough that the longest
   tool name is fully visible without truncation or ellipsis.
2. **Given** a viewport ≤1366px wide, **When** the analysis view opens with its
   default layout, **Then** the activity column stays compact (around a 280px
   rail) so the map retains usable space.
3. **Given** a user has previously customised and saved the layout, **When**
   they reopen the analysis view, **Then** their saved layout is respected (the
   responsive default applies only when no saved layout exists or the layout is
   reset).
4. **Given** any supported viewport width, **When** the default layout is
   applied, **Then** the map retains the majority share of horizontal space.

---

### User Story 4 - Properties panel is discoverable on short laptops (Priority: P2)

An analyst on a 1280×720 laptop opens a plot. They must be able to discover and
reach the Properties panel without realising on their own that the activity
column scrolls — i.e. there is a clear affordance that more content exists below
the fold, or the layout adapts so Properties is reachable.

**Why this priority**: P2 — a user may not realise a Properties panel exists at
all on a short screen, which hides a whole capability, but it is reachable for
users who know to scroll.

**Independent Test**: Open the analysis view at 1280×720, select a feature, and
verify that the Properties panel is either visible or its presence is clearly
signalled (and reachable) without prior knowledge that the column scrolls.

**Acceptance Scenarios**:

1. **Given** a 720px-tall viewport with a feature selected, **When** the
   analysis view is shown, **Then** the user can reach the Properties panel
   through a discoverable affordance (e.g. auto-collapsed upper sections, a
   visible scroll/"more below" hint, or a relocated Properties surface).
2. **Given** a 720px-tall viewport, **When** a feature is selected, **Then** the
   selected feature's properties are surfaced without the user needing to know
   in advance that the activity column is scrollable.
3. **Given** a taller viewport (≥900px) where everything already fits, **When**
   the analysis view is shown, **Then** no short-viewport adaptation is forced
   (the adaptation is conditional on available height).

---

### User Story 5 - Catalog timeline + map row is discoverably collapsible (Priority: P2)

A user browsing the catalog with a long exercise list wants to reclaim the
vertical space taken by the bottom timeline + map preview row. They must be able
to collapse that row (and restore it) through a discoverable control, so a tall
list is not forced into a small scroll area while half the screen shows a sparse
timeline.

**Why this priority**: P2 — the row consumes ~50% of vertical estate while often
conveying little; reclaiming it is a meaningful quality-of-life gain but the
catalog is usable without it.

**Independent Test**: From the catalog, collapse the timeline + map row via a
discoverable control, confirm the exercise list expands into the reclaimed
space, then restore the row.

**Acceptance Scenarios**:

1. **Given** the catalog with the timeline + map row visible, **When** the user
   activates a clearly-visible collapse control on the row, **Then** the row
   collapses and the exercise list expands to use the reclaimed vertical space.
2. **Given** the row is collapsed, **When** the user looks for a way to bring it
   back, **Then** a clearly-visible restore control is present and restores the
   row.
3. **Given** a first-time user with no saved catalog layout, **When** the
   catalog first loads, **Then** the default visibility of the bottom row
   follows the agreed first-run default (see Assumptions) and is remembered
   thereafter.
4. **Given** the user has collapsed or restored the row, **When** they reload
   the catalog, **Then** their choice is remembered.

---

### User Story 6 - Thumbnail S/M/L toggle visibly resizes the list (Priority: P2)

A user in the catalog clicks the S / M / L thumbnail-size toggle to make the
exercise-list thumbnails larger or smaller. The change must be immediately
visible — both the thumbnail imagery and the row sizing must respond — so the
control is honest about what it does.

**Why this priority**: P2 — a half-wired control is "worse than no control"
(review). It undermines confidence in the whole catalog surface.

**Independent Test**: In the catalog, click S, then M, then L, and verify that
the exercise-list items visibly change size (thumbnail and row) at each step.

**Acceptance Scenarios**:

1. **Given** the catalog exercise list, **When** the user selects "L", **Then**
   the list items (thumbnail and row height) become visibly larger than at "M".
2. **Given** the catalog exercise list, **When** the user selects "S", **Then**
   the list items become visibly smaller than at "M".
3. **Given** the user has chosen a thumbnail size, **When** the catalog is
   reloaded, **Then** the chosen size is remembered.
4. **Given** the toggle is shown, **When** the user inspects it, **Then** the
   currently-active size is clearly indicated and matches the rendered list
   size.

---

### Edge Cases

- **No saved layout vs. stale saved layout**: When a stored layout predates the
  responsive-default change (older layout version), the responsive default
  should apply rather than a broken legacy split.
- **Reset Layout**: Pressing "Reset Layout" must reapply the new responsive
  default (US3/US4) and the agreed first-run state for the catalog bottom row
  (US5), not the old fixed defaults.
- **Resize across breakpoints mid-session**: Behaviour when a window is dragged
  from a narrow band to a wide band — the spec requires the *default* to be
  correct on open; live re-flow on drag is desirable but not required (see
  Assumptions).
- **High-contrast dark links**: The contrast fix for high-contrast light must
  not regress high-contrast dark, dark, or light header links.
- **Thumbnail toggle with missing thumbnails**: When an exercise has no
  thumbnail image, selecting a larger size must still resize the row
  consistently (placeholder scales too) without layout breakage.
- **Collapsed row with empty catalog**: Collapsing the bottom row when the
  exercise list is empty must not leave an unusable blank screen.

## Requirements *(mandatory)*

### Functional Requirements

**P1.3 — High-contrast light header link contrast**

- **FR-001**: In the high-contrast light theme, every header navigation link
  MUST meet a text-to-background contrast ratio of at least 7:1 (WCAG AAA for
  normal-size text).
- **FR-002**: Header links in high-contrast modes MUST carry a non-colour
  affordance (underline and/or bolder weight) identifying them as links.
- **FR-003**: The contrast fix MUST be applied at the shared link/theme-token
  level so that newly-added header links inherit the readable treatment without
  per-link styling.
- **FR-004**: The fix MUST NOT reduce legibility of header links in the light,
  dark, or high-contrast dark themes.

**P1.4 — properties-screenshots E2E reliability**

- **FR-005**: The properties-screenshots E2E suite MUST pass on the first
  attempt across 10 consecutive runs with retries disabled.
- **FR-006**: The suite MUST gate on a reliably-present anchor element before the
  row-click that opens the properties form, rather than racing the form's own
  appearance.
- **FR-007**: The fix MUST preserve the suite's ability to fail loudly when the
  properties form genuinely does not render (no masking real breakage by
  blanket timeout increases).

**P2.1 / P2.2 — Analysis-view layout scaling and Properties discoverability**

- **FR-008**: When no saved analysis-view layout exists (or after Reset Layout),
  the default activity-column width MUST scale with viewport width: compact
  (~280px) at ≤1366px wide and wider (~360–400px) at ≥1600px wide.
- **FR-009**: At the wide band, the activity column MUST be wide enough to show
  the longest tool name without truncation.
- **FR-010**: At every supported width, the map MUST retain the majority share
  of horizontal space.
- **FR-011**: A user's previously-saved layout MUST be respected; the responsive
  default applies only when no valid saved layout is present.
- **FR-012**: At short viewports (~720px tall), the Properties panel MUST be
  reachable through a discoverable affordance without the user needing prior
  knowledge that the activity column scrolls.
- **FR-013**: The short-viewport adaptation MUST be conditional on available
  height (not applied when everything already fits, e.g. ≥900px tall).

**P2.3 — Catalog timeline + map row collapsibility**

- **FR-014**: The catalog MUST provide a clearly-visible control to collapse the
  bottom timeline + map preview row, reclaiming its vertical space for the
  exercise list.
- **FR-015**: The catalog MUST provide a clearly-visible control to restore the
  bottom row after it has been collapsed.
- **FR-016**: The collapsed/restored state of the bottom row MUST persist across
  catalog reloads.
- **FR-017**: The first-run default visibility of the bottom row MUST follow the
  agreed default (see Assumptions) and be applied when no saved catalog layout
  exists.

**P2.4 — Thumbnail size toggle**

- **FR-018**: Selecting S, M, or L in the thumbnail-size toggle MUST produce an
  immediately visible change in exercise-list item size (both thumbnail imagery
  and row sizing).
- **FR-019**: The toggle MUST clearly indicate the currently-active size, and
  that indication MUST match the rendered list size.
- **FR-020**: The chosen thumbnail size MUST persist across catalog reloads.

**Cross-cutting**

- **FR-021**: All changes MUST preserve existing functionality (no regression to
  the now-resolved P1 items — track symbology, properties dark theme, VS Code
  toasts — nor to the catalog filter bar, storyboard, or log panel surfaces).
- **FR-022**: Visual evidence (screenshots) MUST be captured for each in-scope
  finding demonstrating the before/after state at the relevant viewport(s) and
  theme(s).

### Key Entities

- **Theme tokens**: The set of colour/affordance variables that drive header
  link appearance per theme variant; the unit changed for P1.3.
- **Analysis-view layout configuration**: The default and persisted panel split
  (activity column vs map) for the analysis view; the unit changed for P2.1/P2.2.
- **Catalog layout configuration**: The default and persisted visibility/size of
  the catalog's exercise list, timeline, and map panels; the unit changed for
  P2.3.
- **Thumbnail size preference**: The S/M/L selection and its mapping to list
  item rendering; the unit changed for P2.4.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Make the web-shell's first-impression surfaces (catalog and
  analysis view) read as polished and trustworthy at the analyst's real
  viewports and in accessibility themes.
- **Key Decision(s)**:
  1. (Analyst) How much screen space to give the activity column vs the map —
     the responsive default should make a good first choice on the user's
     behalf, with manual override preserved.
  2. (Analyst) Whether to keep the catalog's timeline + map preview visible, or
     reclaim that space for a long exercise list.
  3. (Analyst) How large to render exercise-list thumbnails (S / M / L).
- **Decision Inputs**: Current viewport size, whether a saved layout exists,
  the length of the exercise list, the longest tool name, and the active theme.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Catalog cold start (no saved layout) | Open the web-shell | Bottom row shown/collapsed per first-run default; thumbnails at default size; layout fits viewport |
| 2 | Catalog | Click the timeline+map collapse control | Row collapses; exercise list expands into reclaimed space; choice remembered |
| 3 | Catalog | Click S / M / L thumbnail toggle | Exercise-list items visibly resize; active size indicated; choice remembered |
| 4 | Analysis view at ≥1600px wide | Open a plot | Activity column widens enough to show full tool names; map keeps the majority |
| 5 | Analysis view at 1280×720 | Select a feature | Properties panel is discoverable/reachable without hidden-scroll knowledge |
| 6 | High-contrast light theme | View header | Header links are clearly readable (≥7:1) and identifiable as links |

### UI States

- **Empty State**: Catalog with no exercises — collapse/restore and thumbnail
  controls remain coherent; no blank unusable screen when the bottom row is
  collapsed.
- **Loading State**: Existing loading affordances unchanged; layout defaults
  apply once content is available.
- **Error State**: If a saved layout is invalid/stale, the responsive default is
  applied silently rather than rendering a broken split.
- **Success State**: At each common viewport and in each theme, the catalog and
  analysis view read as intentionally laid out — no truncated tool names, no
  hidden Properties panel, no half-wired controls, no low-contrast links.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of header links in the high-contrast light theme measure ≥7:1
  contrast against their background (automated audit).
- **SC-002**: The properties-screenshots E2E suite passes on the first attempt
  in 10/10 consecutive runs with retries disabled.
- **SC-003**: At ≥1600px wide, the longest tool name in the activity column is
  fully visible (0 truncated/ellipsised tool labels) in the default layout.
- **SC-004**: At ≤1366px wide, the default activity column occupies roughly a
  280px rail and the map retains the majority of horizontal width.
- **SC-005**: At 1280×720 with a feature selected, a first-time user can reach
  the Properties panel without being told the column scrolls (verified in
  usability walkthrough / captured evidence).
- **SC-006**: A user can collapse and restore the catalog timeline + map row
  using on-screen controls, and the state survives a reload (verified by
  reload).
- **SC-007**: Selecting each of S/M/L produces a visibly distinct exercise-list
  item size, and the chosen size survives a reload.
- **SC-008**: No regression in the previously-resolved P1 items or other
  catalog/analysis surfaces (existing E2E + visual evidence confirm parity).

## Assumptions

- **Scope boundary**: Only the remaining P1 items (P1.3, P1.4) and all P2 items
  (P2.1–P2.4) are in scope. The P3 items (#10–#15 in the revised punch list,
  including the new read-only-banner observation) are explicitly out of scope.
- **P1.1/P1.2/P1.5/P1.6 are already resolved** on `main` and are not revisited
  except to guard against regression (FR-021).
- **P1.4 surface**: The flaky suite is the web-shell `properties-screenshots`
  Playwright spec; the fix is a test-reliability fix (wait-gate), not a product
  behaviour change.
- **P2.3 partial existing mechanism**: A per-panel hide control and filter-bar
  restore affordance already exist for the catalog timeline/map panels. This
  feature treats P2.3 as a *discoverability + default + persistence* problem
  (make the collapse obvious, pick a sensible first-run default, remember the
  choice) rather than building collapse from scratch.
- **P2.4 root cause**: The toggle already drives an internal row-height value but
  does not visibly change the list; this feature treats P2.4 as ensuring the
  selection is actually applied and visible (thumbnail + row), not merely adding
  a new control.
- **First-run default for catalog bottom row**: Default **shown** once a dataset
  context exists, matching the review's "default open after the first dataset is
  loaded" suggestion; a first-time empty catalog may default collapsed. The
  precise first-run rule can be refined in planning but must satisfy FR-017.
- **Responsive default timing**: The responsive layout default must be correct
  *on open / reset*. Live re-flow when dragging a window across breakpoints is
  desirable but not a hard requirement for this feature.
- **Contrast target**: 7:1 (WCAG AAA, normal text) is the bar for high-contrast
  modes, per the review's stated commitment.
- **Persistence mechanism**: Layout and preference persistence reuses the
  existing per-surface saved-layout/preference storage already in place; no new
  cross-device sync is introduced.
- **Surfaces**: All in-scope items are web-shell / shared-component changes.
  P2.1/P2.2 layout improvements benefit the VS Code host only insofar as it
  reuses the same shared components; VS Code-specific layout is not in scope.

## Out of Scope

- All P3 items: double `+` map icons (#10), active-vs-disabled tool affordance
  (#11), LOG-tab discoverability (#12), filter-type picker grouping (#13),
  VS Code boot loading-state consistency (#14), and the read-only-banner noise
  observation (#15).
- VS Code-host-specific layout, profiles, or toasts (the P1.5 toast work is
  already done).
- Any change to the symbology pipeline, theming engine internals beyond the
  header-link token, or the catalog filter system.
