# Backlog Navigator — full mobile parity

**Item**: #244 (Feature, Medium complexity, proposed)
**Predecessor**: spec 242 (the desktop Backlog Navigator)
**Estimate**: 1–2 dev-weeks
**Trigger**: emergent requirement raised on 2026-05-02 — analysts want to triage and refine the backlog from a phone or tablet (train, sofa, between meetings).

## Context

Spec 242 shipped the Backlog Navigator as a desktop-only static SPA. The
12-column items table assumes ~1280px width; the filter strip is a single-row
horizontal bar; cell editing is "click a cell to open an editor inline" with
no touch affordance; the Push dialog is a centred modal sized for desktop.
On a phone (~375px) the table doesn't fit; on an iPad in landscape (~1024px)
it's marginally usable for read-only browsing but editing is awkward.

Two narrower options were considered and rejected as insufficient:

- **Read-responsive only** (~1 day) — collapse toolbar to a hamburger, hide
  V/M/A/Total/Created/Updated below 768px, surface ID + Description + Status +
  Epic only. Banner on touch devices says "Open on desktop to edit."
  *Rejected*: doesn't deliver "refinement" — analysts can read but still
  reach for a laptop to flip a status, defeating the use case.
- **Card view + bottom-sheet editors** (~3–5 days) — second layout for narrow
  viewports, each item rendered as a card with a tap-to-edit drawer. Status /
  Complexity / Score editing on mobile; ID rename and Description editing
  stay desktop-only. *Rejected as the v1 cut*: the partial-editing story is
  hard to communicate ("you can change status but not description") and the
  awkwardness compounds for the workflows analysts actually want to run on
  the move (writing a one-line note on a proposed item, fixing a typo in a
  description).

This spec ships the full mobile parity option: every workflow that works on
desktop works on touch.

## Capability

A reviewer opens
`https://debrief.github.io/debrief-future/backlog-navigator/` (or a per-PR
preview URL) on a phone or tablet and can:

1. **Browse**: scroll a virtualised card list (one card per item) showing
   ID + Status chip + Category + truncated Description + Epic +
   `Updated`. The card layout reflows to portrait phones, landscape phones,
   portrait tablets, and landscape tablets.
2. **Filter and group**: tap a filter button in the bottom navigation bar to
   open a full-screen filter sheet (Status, Category, Epic, Complexity,
   free-text). Tap "Group by epic" to switch to a grouped card list with
   sticky epic headers showing `done/total` + a progress bar.
3. **Edit any cell** via a tap-to-open bottom sheet (iOS / Android pattern):
   - Status / Complexity / Epic / Score / Category — picker wheels or
     segmented controls.
   - ID rename — numeric on-screen keyboard with collision check.
   - Description — full-screen Markdown editor with live preview; supports
     paste from clipboard, voice dictation through the OS keyboard.
   - Created / Updated — native `<input type="date">` pickers.
4. **Stage edits** with the same `localStorage` envelope as desktop. The
   edited-cell affordance is a coloured chip; long-press a cell to undo.
   The footer becomes a sticky bottom bar with the pending count + "Push
   Changes" CTA.
5. **Push Changes** opens a full-screen sheet with the structured summary,
   editable PR title/body, and a swipe-to-confirm action. Raw-diff toggle
   renders the diff in a horizontally-scrollable monospace pane.
6. **Auth**: PAT entry uses `<input type="password">` to engage the phone's
   password manager. iOS Keychain / 1Password autofill works.

## Out of scope

- **Native iOS / Android apps**. This is a Progressive Web App (PWA); a
  manifest + service worker make it installable to home screen. Native
  apps are a separate decision.
- **Push notifications** (e.g. "your PR was reviewed"). Out of scope for v1.
- **Offline editing across sessions**. The PWA caches the static shell so
  the app loads offline, but baseline `BACKLOG.md` requires network. Edits
  staged offline persist in `localStorage`; pushing requires reconnection.

## Architectural decisions to capture during /speckit.plan

1. **Single codebase or separate route?** Default position: single
   responsive React app under `apps/backlog-navigator/`, with a CSS
   media-query breakpoint at 1024px that swaps `<ItemsTable>` for
   `<ItemsCardList>`. Both render against the same `BacklogDocument` +
   `useFilteredSortedItems` selectors. Editors are reused; the container
   that opens them differs (inline cell editor on desktop, bottom-sheet
   modal on touch).
   *Alternative*: `apps/backlog-navigator-mobile/` as a sibling app sharing
   `state/`, `parser/`, `github/`, `format/` via a workspace package.
   *Trade-off*: separate app keeps the desktop bundle lean (no mobile-only
   code) but doubles the surface area to maintain. Single app is simpler
   but adds ~30–50KB of mobile-specific JS to every desktop load.
   Decision: **single responsive app** unless `/speckit.plan` finds a
   compelling reason to split.

2. **PWA vs. plain web app?** Default position: **PWA** (manifest +
   service worker via Vite-PWA plugin). Reviewers can "Add to Home
   Screen", the app icon shows up like a native app, the static shell
   loads offline. The marginal cost is one Vite plugin and ~3KB of
   runtime overhead.

3. **Card layout** uses `@tanstack/react-virtual` (already in the project
   for #094) so 230+ rows scroll smoothly on low-end devices. Each card is
   a fixed-height element so virtualisation is trivial.

4. **Bottom-sheet implementation**. Default: hand-rolled with a
   transform-and-pointer-event approach (~80 lines), no library — Article
   IX. The sheet swipes-to-dismiss; tapping outside closes.
   *Alternative*: `vaul` (the React bottom-sheet library used by many iOS
   web clients). 12KB gz, well-tested. Decide during `/speckit.plan`.

5. **Description editor on phone**: full-screen takeover with a Markdown
   live-preview tab. Voice dictation comes free from the OS keyboard.
   Long-press selection on a chip jumps the editor to that field.

6. **Touch-target sizing**: every interactive element ≥44pt (Apple HIG /
   Android M3). Status chips, filter buttons, footer actions all hit-tested
   against this target.

## Test discipline

- **Vitest** unit tests for the new selectors (`isMobileViewport`,
  `useBottomSheetGesture`) and any new derived state.
- **Playwright** E2E with viewport overrides (`375x812` for phone,
  `768x1024` for tablet portrait, `1024x768` for tablet landscape) verifying
  the responsive breakpoint cuts in and that the same Story 1/2 acceptance
  scenarios pass under each.
- **axe-core** a11y on the card view, the bottom-sheet, and the full-screen
  Description editor.
- **Lighthouse PWA score** ≥90 on the production build.

## Acceptance scenarios

1. **Given** a reviewer opens the navigator on iPhone 14 Pro
   (`393x852` viewport), **When** the page loads, **Then** they see a
   sticky top filter button + sticky bottom Push-Changes bar, and a
   scrollable virtualised card list of items — no horizontal scroll, no
   table.
2. **Given** the reviewer taps a status chip on a card, **When** the
   bottom sheet opens, **Then** they see the status options as a
   single-column list of large tap targets, can pick one, and the sheet
   closes leaving the card visibly modified.
3. **Given** the reviewer taps the Description on a card, **When** the
   full-screen editor opens, **Then** they can type or paste Markdown,
   toggle to live preview, and dismiss with a confirm or cancel chevron;
   the OS keyboard's "voice input" button works.
4. **Given** the reviewer has staged 4 edits on iPad portrait
   (`820x1180`), **When** they tap "Push Changes", **Then** the push sheet
   takes the lower 70% of the viewport and renders the structured summary
   + raw-diff toggle + swipe-to-confirm action.
5. **Given** the reviewer has installed the app to home screen as a PWA,
   **When** they launch it offline, **Then** the static shell loads, an
   "offline — backlog not loaded" banner is shown, and any
   already-staged edits remain visible in the pending footer.
6. **Given** the reviewer triages on the train (cellular flake), **When**
   a Push Changes attempt fails network, **Then** edits are preserved
   exactly and the banner offers retry.

## Why Medium complexity

- New layout (cards + bottom-sheet + full-screen editors) but reuses every
  underlying primitive: `BacklogDocument`, parser, GitHub client,
  pending-edits store, push pipeline.
- PWA wiring is a known pattern with first-class Vite support.
- Largest unknown is the bottom-sheet gesture implementation; if `vaul` is
  acceptable, that risk drops to library-evaluation work.
- Visual polish (typography on small screens, dark-mode tuning, fixed-width
  numeric columns) is the time sink.

Estimate: 1–2 dev-weeks including evidence (multi-viewport screenshots,
interaction GIF on a phone-sized viewport, Lighthouse PWA score).
