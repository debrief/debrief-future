# Quickstart — Storyboarding Panel + Playback

**Feature**: 217-storyboarding-playback
**Audience**: Implementers of this slice; authors of sibling #218
(edit suite); QA running the manual verification script; reviewers
preparing stakeholder demos.

This quickstart walks a developer through standing up the feature
from a clean clone, verifying the acceptance scenarios end-to-end,
and onto the review-app preview where stakeholders will exercise it.

---

## 1. Prerequisites

- Node 20+, pnpm 9+, Python 3.11 + uv, VS Code 1.85+.
- Clone includes `main` merged up to the #216 **Storyboarding
  Capture** slice (`StoryboardPanel` minimal version present;
  `@debrief/components/storyboard` CRUD module present).
- Preview-app sample data: `preview/workspace/samples/local-store/`
  carries at least one `.rep` plot that parses cleanly into
  `DebriefFeature[]`.

---

## 2. Clean-build from scratch

```bash
cd ~/dev/debrief-future
git switch 217-storyboarding-playback           # this feature's branch
pnpm install
uv sync
pnpm -r build --filter '@debrief/schemas'       # regen types (no-op for this slice)
pnpm -r build                                   # builds shared/components + apps/vscode
```

Expect:

- `shared/components/dist/` contains the extended `StoryboardPanel`
  exports plus the new `SceneRectangleLayer`.
- `apps/vscode/dist/extension.js` contains the new
  `StoryboardPlaybackService` and the transport / management
  commands.

---

## 3. Run the unit tests

```bash
# TypeScript tests (fast — hot path for day-to-day work)
pnpm --filter @debrief/components test
pnpm --filter @debrief/vscode-extension test

# Python tests (no-op for this slice, but CI runs them)
uv run pytest
```

Tests added by this slice:

| Suite | Notes |
|---|---|
| `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx` | Dropdown + overflow + transport + highlight + hard-block |
| `shared/components/src/MapView/__tests__/SceneRectangleLayer.test.tsx` | New layer — 10 test cases |
| `shared/components/src/MapView/__tests__/flyTo.test.tsx` | `flyTo` prop transitions, zero-duration, cancellation |
| `apps/vscode/src/services/__tests__/storyboardPlayback.test.ts` | Transport state machine |
| `apps/vscode/src/commands/__tests__/storyboardCommands.test.ts` | Command handlers |

All must pass before the E2E suite runs.

---

## 4. Run the Storybook E2E

```bash
pnpm --filter @debrief/components storybook:build
node apps/web-shell/run-playwright.mjs   # the shared runner (@sparticuz/chromium)
```

Three new stories are exercised under light / dark / vscode themes:

- `panels-storyboardpanel--with-multiple-storyboards`
- `panels-storyboardpanel--transport`
- `panels-storyboardpanel--hard-block-modal`

Screenshots land under `specs/217-storyboarding-playback/evidence/storybook/`.

---

## 5. Run the VS Code webview E2E

```bash
pnpm --filter @debrief/vscode-extension build
cd tests/e2e
pnpm exec playwright test test-storyboard-playback.spec.ts
```

The suite covers all acceptance scenarios from `spec.md` plus the
edge cases in §6 below. Screenshots land under
`specs/217-storyboarding-playback/evidence/e2e/`.

---

## 6. Manual verification script

Stakeholder demo + final sanity check. Assumes you have a plot with
≥ 3 Scenes captured via #216 (or the included test fixture
`preview/workspace/samples/storyboarding/three-scenes.rep`).

### 6.1 Happy-path forward traversal

1. Open the plot in the code-server preview (or a local VS Code).
2. Open the Storyboard panel (Command Palette → "Storyboard: Open Panel").
3. Expect: dropdown populated; Scene list populated; one Scene
   highlighted (Scene 1 of N); transport shows *N-1* forward steps
   possible.
4. Press **Forward** (button). Expect: map animates via `flyTo` to
   Scene 2's viewport; time slider tweens; panel highlight jumps to
   row 2; counter reads *2 of N*.
5. Press **Forward** again until you hit Scene N. Expect: Forward
   button greyed out; pressing it has no effect.
6. Press **Backward** to reverse. Expect: mirror of the above.

### 6.2 Scoped arrow keys (SC-007)

1. Position on Scene 1.
2. Click into the map (`debrief.mapFocused === true`). Press `Right`.
   Expect: Forward fires (Scene 2 highlighted).
3. Press `Right` again. Expect: Scene 3 highlighted.
4. Focus the Log Panel (another webview). Press `Right`. Expect:
   **no transport change** — the scoped binding did not fire.
5. Focus the file explorer. Press `Right`. Expect: **no transport
   change**.

### 6.3 Scrub-window lock (SC-004)

1. Position on Scene 1. Note the time slider's extent.
2. Attempt to drag the slider past Scene 2's timestamp. Expect:
   clamp at Scene 2's boundary.
3. Position on Scene N (last). Attempt to drag past its timestamp.
   Expect: clamp at Scene N's timestamp.

### 6.4 On-map Scene rectangles (FR-PLAY-016 / -017 / -018)

1. With the active Storyboard selected, the map shows faint
   rectangles at each Scene's viewport.
2. Switch the dropdown to another Storyboard. Expect: previous
   rectangles disappear; new Storyboard's rectangles render
   (SC-006) — within the same user interaction.
3. Click a non-current Scene rectangle. Expect: transport jumps to
   that Scene; map animates to its viewport.

### 6.5 Hard-block on missing data (FR-PLAY-019 / -020 / -021)

1. Deliberately delete a feature referenced in some Scene's
   `visible_feature_ids` (use the VS Code Features view to remove
   a track's line feature).
2. Step forward onto that Scene. Expect: modal prompt naming the
   missing feature ID and offering *Jump past this scene* / *Open
   for editing*.
3. Click *Jump past this scene*. Expect: transport advances past
   the blocked Scene; no animation into the blocked Scene occurred.
4. Click *Open for editing* on a repeat. Expect: read-only detail
   toast (full editor is #218).

### 6.6 Multi-Storyboard CRUD (FR-PLAY-001 / -002 / -003 / -004)

1. From the panel overflow menu, choose **Create**. Enter a new
   Storyboard name. Expect: dropdown includes the new Storyboard;
   panel switches to it; Scene list is empty.
2. Use capture (`Ctrl/Cmd+Alt+C`) to add a Scene to the new
   Storyboard. Expect: Scene list populates.
3. Choose **Rename**. Change the name. Expect: dropdown updates.
4. Choose **Delete**. Expect: confirmation modal naming the Scene
   count. Confirm. Expect: Storyboard gone from dropdown; active
   selection falls back to most-recently-modified.

### 6.7 Offline check (SC-009)

1. Disconnect from the network.
2. Repeat §6.1 – §6.6 end-to-end. Expect: everything works
   identically.

---

## 7. Preview-app deployment

Per-PR preview apps are provisioned by Heroku Review Apps
(`app.json` / `heroku.yml` / `Dockerfile.preview`). When the PR for
this feature opens, the GitHub Actions bot posts a "🚀 Preview
Deployments" comment with:

- **Code Server** — exercise §6 end-to-end inside a browser.
- **Web Shell** — render the `StoryboardPanel` in isolation.
- **Storybook** — exercise the three new stories under each theme.

The GIF captured for the shipped blog post (§8 below) lives under
`specs/217-storyboarding-playback/evidence/media/`.

---

## 8. Evidence checklist (for the PR)

- [ ] `specs/217-storyboarding-playback/evidence/storybook/` — 9
      screenshots (3 stories × 3 themes).
- [ ] `specs/217-storyboarding-playback/evidence/e2e/` — screenshots
      per acceptance scenario from `spec.md`.
- [ ] `specs/217-storyboarding-playback/evidence/media/forward-traversal.gif` —
      1-minute GIF of the forward-through-a-storyboard flow.
- [ ] Test summary at
      `specs/217-storyboarding-playback/evidence/test-summary.md`
      using `.specify/templates/evidence/test-summary-template.md`
      (include YAML front matter with `git_sha` + `captured_at`).

---

## 9. Downstream hand-off to #218

#218 (edit suite) consumes:

- `StoryboardPlaybackService.resolveHardBlockByOpeningForEditing` —
  currently a stub (`showInformationMessage` with read-only details);
  #218 replaces with a full editor surface.
- `StoryboardPanel`'s new overflow menu per-Scene slots — #218 adds
  rename / delete+undo / update-to-current / duplicate / copy-to-
  other-storyboard.
- `StoryboardPlaybackService.onSnapshotChange` — #218's edit ops must
  trigger a snapshot refresh (via the existing
  `onPlotFeaturesChanged` lifecycle).

No breaking changes to this slice's surface are expected from #218 —
only additive extensions.
