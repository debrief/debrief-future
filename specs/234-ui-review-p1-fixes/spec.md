# Feature Specification: UI Review P1 Fixes

**Feature Branch**: `234-ui-review-p1-fixes`
**Created**: 2026-04-27
**Status**: Draft
**Input**: User description: "UI Review P1 Fixes — address the 5 highest-priority issues from the 2026-04-26 UI review (docs/ui-review-2026-04-26.md)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tracks render with distinct colours on first load (Priority: P1)

When an analyst opens an exercise in either the web-shell or the VS Code
extension, every track in that exercise must render in a visually distinct
colour from every other track in the same plot. Today both tracks render in
identical mid-grey, which makes it impossible to tell ownship from contact at
a glance — even though the same data renders correctly in the Storybook
fixture.

**Why this priority**: This is the single most damaging perceived-quality
issue in the live product. An analyst's first impression of a loaded plot
is "I can't tell the ships apart." The bug reproduces in both surfaces, so
fixing it once in the shared component pipeline benefits every consumer.

**Independent Test**: Open `Exercise Alpha` in the web-shell. Confirm
`track-hms-defender` and `track-uss-freedom` render in different colours.
Repeat the same workflow in the VS Code extension via the STAC tree.
Capture before/after screenshots in both surfaces.

**Acceptance Scenarios**:

1. **Given** the analyst has just opened Exercise Alpha in the web-shell,
   **When** the map finishes rendering tracks, **Then** every track stroke
   is visibly distinct from every other track stroke (no two tracks share
   the same rendered colour).
2. **Given** the analyst has just opened Exercise Alpha via the STAC tree
   in the VS Code extension, **When** the map finishes rendering, **Then**
   the same colour-distinctness rule holds.
3. **Given** an exercise containing only a single track, **When** it
   renders, **Then** the track uses a deterministic, repeatable colour
   (so screenshots are stable across test runs).
4. **Given** any plot loaded today via either surface, **When** the diagnosis
   document for this feature is opened, **Then** it identifies the exact
   pipeline stage at which colour metadata was being dropped, with a
   committed before-fix file reference.

---

### User Story 2 - Properties form respects the active theme (Priority: P1)

When the analyst toggles between light and dark themes (and between the
two high-contrast variants), the Properties form in the activity panel
must visually re-skin to match the host theme. Today the form is locked
to a light skin in every theme — confirmed by byte-identical light/dark
evidence screenshots.

**Why this priority**: Theme support is a constitutional commitment for
this platform (the four themes already exist and the rest of the UI honours
them). A single locked-light component undermines the credibility of the
theme system, especially for night-shift analysts on dark themes.

**Independent Test**: With a feature selected (so the Properties form is
populated), apply each of the four themes in turn and capture a screenshot
of the form. The four screenshots must be visually distinct.

**Acceptance Scenarios**:

1. **Given** the active theme is dark, **When** a track is selected and
   the Properties form populates, **Then** the form background, input
   fields, labels, and chip backgrounds all match the dark-theme palette
   (no white surfaces visible).
2. **Given** the active theme is high-contrast dark, **When** the form
   appears, **Then** every interactive control has a visible focus ring
   and every label meets WCAG AAA contrast against the form background.
3. **Given** the user re-runs the existing properties-screenshot E2E,
   **Then** the captured dark screenshot is no longer byte-identical to
   the light variant.

---

### User Story 3 - High-contrast light theme has readable navigation links (Priority: P1)

When the analyst is using the high-contrast light theme, every visible
hyperlink and navigation control in the application chrome must be readable
without squinting. Today the "Component Storybook →" and "VS Code Preview →"
links in the web-shell header (and any links sharing those tokens) render
as low-contrast blue on a near-white background.

**Why this priority**: The platform's expected user base includes UK
Defence customers with HC theme accessibility requirements. WCAG AAA
compliance in HC mode is non-negotiable; an unreadable link in the
top-level navigation is an immediate disqualifier.

**Independent Test**: Switch to the HC-light theme, take a screenshot of
the web-shell header, and confirm every link text passes WCAG AAA contrast
(7:1 for body text, 4.5:1 for large text) against its background using an
automated contrast checker.

**Acceptance Scenarios**:

1. **Given** the HC-light theme is active, **When** any link in the
   application chrome is at rest (not hovered, not focused), **Then**
   its text passes WCAG AAA contrast against its background.
2. **Given** the HC-light theme is active, **When** a link is focused via
   keyboard, **Then** the focus indicator is visibly distinct from the
   resting state.
3. **Given** the HC-dark theme is active, **When** the same links are
   inspected, **Then** they continue to pass (regression-guard).

---

### User Story 4 - Properties screenshot E2E suite runs deterministically (Priority: P1)

When CI or a developer runs `properties-screenshots.spec.ts`, the suite
must pass on the first attempt without retries. Today both the light and
dark variants timeout on first run and pass only on retry, which masks
real regressions and adds wall-clock time to every CI run.

**Why this priority**: A flake hides regressions. Properties is the surface
most likely to receive incremental UI changes (the form drives most user
edits), so a flake here is exactly where we cannot afford it. The fix is
small (a wait gate on the right selector), so its priority is "do this
before the rest of P1 lands so the new evidence captures are themselves
deterministic."

**Independent Test**: Disable the suite's retry configuration locally,
run the suite ten times in a row, and confirm 10/10 first-attempt passes.

**Acceptance Scenarios**:

1. **Given** retries are disabled for the suite, **When** it runs ten
   consecutive times, **Then** every run passes on the first attempt.
2. **Given** the same suite runs in the cloud-sandbox configuration, **Then**
   the same 10/10 pass rate holds.
3. **Given** a developer introduces a regression that breaks the
   Properties form, **Then** the suite fails consistently (not flakily) on
   the first attempt.

---

### User Story 5 - VS Code first session has a calm, uncluttered welcome (Priority: P1)

When the analyst opens the Debrief workspace in the VS Code extension for
the first time, no more than one informational toast may be visible at any
moment, and no toast may persist beyond a reasonable read-and-dismiss window.
Today two toasts pile up immediately (the Debrief activity-bar hint and the
generic VS Code "git repository was found" prompt), occluding ~30 % of the
editor area for the entire first session.

**Why this priority**: First impressions in VS Code are formative. An
analyst opening Debrief for the first time should see the workspace, not
a stack of dialogs. The fix touches only the Debrief profile and the
extension's notification logic; it does not affect the rest of the UI.

**Independent Test**: Wipe the VS Code user state directory, install the
Debrief profile cleanly, open the workspace, and confirm at most one toast
is visible at any moment and that any toast auto-clears within the
read-and-dismiss window or has been seen before.

**Acceptance Scenarios**:

1. **Given** a fresh VS Code session with the Debrief profile applied,
   **When** the workspace finishes loading, **Then** the Debrief
   activity-bar hint is the only Debrief-sourced toast visible, and the
   generic git-repo prompt does not appear.
2. **Given** the Debrief activity-bar hint is visible, **When** the
   read-and-dismiss window elapses without user interaction, **Then**
   the hint dismisses itself.
3. **Given** the analyst has seen the Debrief activity-bar hint once,
   **When** they restart VS Code, **Then** the hint does not reappear.
4. **Given** the analyst opens the workspace from a folder that genuinely
   is inside a git repository, **Then** the Debrief profile suppression
   for the parent-folder git prompt does not interfere with the analyst's
   ability to use git on intentionally git-tracked workspaces.

---

### Edge Cases

- **Track colour collisions** — when two consecutive tracks happen to be
  assigned palette colours that are close to one another, the assignment
  algorithm must space them apart on the colour wheel rather than picking
  sequential palette entries.
- **Tracks with explicit colour metadata** — if a track in the source
  catalog already carries an explicit colour, the assigned-by-default
  algorithm must defer to it rather than overriding.
- **Theme change while the Properties form is open** — when the user
  switches themes while a feature is selected, the form must re-skin
  without losing in-flight edits.
- **HC-mode link tokens shared with non-HC modes** — the fix must not
  regress contrast in light or dark themes (i.e. the HC-only token
  variant must be applied conditionally, not unconditionally).
- **Extension reinstall** — the "seen this hint" cache must survive a
  Debrief extension reinstall, but it may reset if the user explicitly
  clears their VS Code state.
- **Analyst genuinely wants the git prompt** — the Debrief profile's
  suppression of the parent-folder git prompt applies only to the
  workspace's *parent* folders. If the workspace itself is a git
  repository, normal git affordances continue to work.

## Requirements *(mandatory)*

### Functional Requirements

**Track symbology pipeline (User Story 1)**

- **FR-001**: A written diagnosis document MUST be committed before any
  symbology code change is made. The diagnosis MUST identify the exact
  stage in the live data path (catalog load → feature transform → style
  computation → map style application) at which the per-track colour
  metadata is being dropped or overridden, including before-fix file
  references and the differing behaviour between fixture and live data.
- **FR-002**: When an exercise is loaded in either the web-shell or the
  VS Code extension, the resulting map MUST render every track in a
  colour that is visually distinct from every other track in the same
  plot.
- **FR-003**: Track colour assignment MUST be deterministic — given the
  same input plot, the resulting colours MUST be the same on every
  load (so visual-regression screenshots are stable).
- **FR-004**: Where a track in the source catalog carries explicit colour
  metadata, the renderer MUST honour that metadata in preference to any
  assigned-by-default palette colour.
- **FR-005**: The fix MUST be applied in shared component code, so that
  both the web-shell and the VS Code extension inherit the corrected
  behaviour from a single source of truth.

**Properties form theming (User Story 2)**

- **FR-006**: The Properties form MUST consume colours, surfaces, and
  borders exclusively via theme tokens (CSS custom properties). No
  hard-coded colour literals MAY remain in the form's stylesheets.
- **FR-007**: When the active theme changes, the Properties form MUST
  re-skin without requiring a remount, page reload, or loss of in-flight
  edits.
- **FR-008**: For each of the four themes (light, dark, HC light, HC dark),
  the Properties form's evidence screenshot MUST be visually distinct from
  every other theme's evidence screenshot for the same form state.

**High-contrast link readability (User Story 3)**

- **FR-009**: In the HC-light theme, every link in the application chrome
  MUST meet WCAG AAA contrast (7:1 for body text, 4.5:1 for large text)
  against its background at rest, on hover, and on focus.
- **FR-010**: HC-mode link styling adjustments MUST be conditional on the
  active HC theme — applying them in non-HC themes MUST NOT change the
  rendered appearance of those themes' links.
- **FR-011**: The HC-dark theme link contrast MUST also pass the same
  WCAG AAA threshold (regression guard against the same fix).

**E2E suite determinism (User Story 4)**

- **FR-012**: The properties-screenshots E2E suite MUST pass on first
  attempt for ten consecutive runs (without invoking the suite's retry
  mechanism), in both the local-developer and cloud-sandbox configurations.
- **FR-013**: The wait gate within the suite MUST be on the selector that
  appears *before* the click that opens the form, not on the form itself.
- **FR-014**: Other E2E suites that use a similar gate-on-the-form pattern
  MUST be audited and corrected if they exhibit the same anti-pattern.

**VS Code first-session toast hygiene (User Story 5)**

- **FR-015**: At any moment during the first session of a fresh Debrief
  install, at most one Debrief-sourced informational toast MAY be visible.
- **FR-016**: Each Debrief-sourced informational toast MUST either
  auto-dismiss after a reasonable read-and-dismiss window, OR record a
  "seen" flag on first display so it does not reappear on subsequent
  sessions on the same machine.
- **FR-017**: The bundled Debrief VS Code profile MUST suppress the
  generic VS Code "git repository was found in parent folders" prompt
  for workspaces opened under the profile.
- **FR-018**: The git-prompt suppression MUST NOT impair the user's
  ability to use ordinary git affordances when the workspace itself is
  a git-tracked folder.

**Cross-cutting evidence and scope**

- **FR-019**: For every user story above, evidence delivered with the
  feature MUST include both before and after screenshots from both
  surfaces (web-shell and the VS Code extension via code-server),
  produced through the documented procedures
  (`apps/web-shell/run-playwright.mjs` and
  `tests/e2e/scripts/cloud-e2e-setup.sh`).
- **FR-020**: This feature MUST NOT introduce new schemas, new transports,
  or new services. All changes MUST be confined to the surface-polish
  layer of existing components, themes, profile bundles, and tests.

### Key Entities

- **Theme token set** — the named CSS custom properties (background,
  surface, border, text, link, focus-ring, etc.) that define each of the
  four themes. The Properties form must consume from this set; the HC
  link variant must be added to it.
- **Track style assignment** — the per-track style record produced by
  the live data pipeline that feeds the map renderer. This is the entity
  inside which the colour drop occurs and within which the diagnosis must
  pinpoint the failing stage.
- **First-session toast state** — the per-machine record of which
  Debrief-sourced informational toasts have already been seen, used to
  decide whether to display them on a given session.
- **Debrief VS Code profile** — the bundled `.code-profile` file that
  ships with the extension and is the source of the workspace-level
  configuration override for the git prompt.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Restore polish and accessibility on first interaction
  with a loaded plot in both surfaces.
- **Key Decision(s)**:
  1. (Story 1) Which deterministic colour palette to assign to tracks
     in the absence of explicit metadata.
  2. (Story 5) Whether each Debrief informational toast is best handled
     by auto-dismissal, by once-per-machine display, or both.
- **Decision Inputs**: The 36 evidence screenshots in
  `docs/project_notes/evidence/ui-review-2026-04-26/`, the existing theme
  token catalogue, and the WCAG AAA contrast targets.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Catalog (cold) | Open Exercise Alpha | Plot opens; all tracks render in distinct colours |
| 2 | Plot loaded | Click a track on the map | Properties form populates with theme-correct skin |
| 3 | Plot loaded (any theme) | Switch to HC-light theme | Header links remain readable; form re-skins live |
| 4 | VS Code first session | Open the workspace via the Debrief profile | At most one informational toast visible; no git-folder prompt |

### UI States

- **Empty State**: Catalog open, no plot loaded — header link contrast
  passes WCAG AAA in every theme.
- **Loading State**: While a plot is loading, the activity panel shows
  consistent per-section skeletons in the active theme palette (no
  light-mode flash on dark theme).
- **Error State**: If a plot fails to load, the failure surface uses
  theme tokens (no white-on-dark error banners).
- **Success State**: Plot rendered, tracks visibly distinct in colour,
  Properties form correctly themed, only the Debrief activity-bar hint
  visible (and only for first-machine-session users), no git-folder prompt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst who has never used the platform before, opening
  Exercise Alpha for the first time, can identify which track is which
  ship from the map alone within 5 seconds (no legend lookup required).
- **SC-002**: For every theme combination (light, dark, HC light, HC dark)
  × every persistent panel (Properties form, header chrome), a contrast
  audit passes the WCAG threshold appropriate to that theme — AA for
  light/dark, AAA for the HC variants — for 100 % of audited surfaces.
- **SC-003**: The properties-screenshots E2E suite passes on the first
  attempt in 10/10 consecutive runs, both locally and in the cloud
  sandbox.
- **SC-004**: First-session VS Code users see at most one informational
  toast at any moment, and the legitimate Debrief activity-bar hint
  auto-clears or is suppressed on subsequent sessions on the same machine.
- **SC-005**: Before/after evidence screenshots for every P1 item are
  produced from both surfaces (web-shell and code-server VS Code) and
  committed under `specs/234-ui-review-p1-fixes/evidence/screenshots/`.
- **SC-006**: A reviewer comparing the post-fix evidence to the
  2026-04-26 UI review evidence can verify each P1 item is resolved
  without needing to read the implementation code.

## Assumptions

- **A-001**: The four existing themes already define a complete-enough
  token catalogue for the Properties form to consume; no new tokens are
  needed beyond the conditional HC link variant called out in FR-010.
- **A-002**: The `cloud-e2e-setup.sh` cloud-VS-Code procedure documented
  in `docs/project_notes/code-server-cloud-testing.md` works for the
  CI environment that will run the new evidence captures, not just the
  local Claude Code cloud session in which it was first proven.
- **A-003**: The Debrief activity-bar hint's text content is acceptable
  as-is; this feature changes only its visibility lifecycle, not its
  copy.
- **A-004**: The bundled Debrief `.code-profile` is the appropriate
  vehicle for suppressing the parent-folder git prompt; if the profile
  cannot carry per-workspace settings overrides, an equivalent mechanism
  in the extension's activation will be substituted (implementation
  choice, out of scope for this spec).
- **A-005**: The properties-screenshots flake is fully attributable to
  the wait-gate selector mismatch; no other concurrent issue (such as
  CSS transition timing) is contributing. Phase-0 diagnosis for Story 1
  will check this assumption against Story 4 before changes land.
