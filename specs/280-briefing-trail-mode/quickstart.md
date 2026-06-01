# Quickstart: Briefing Renderer Honours Trail Display Mode

**Feature**: 280-briefing-trail-mode

## What this changes

In the standalone briefing renderer (`apps/briefing-renderer/`), a scene captured
in **Trail** mode now renders each platform track as a *growing* snail-trail that
follows the moving position dot, instead of always drawing the full route. **Full**
and legacy (no `display_mode`) scenes are unchanged — the whole track is shown.

The change is confined to `apps/briefing-renderer/src/components/BriefingMap.tsx`
plus test fixtures/tests; no schema, capture, export, or host code is touched.

## See it locally (dev)

```sh
# Start the renderer dev server (loads src/fixtures/dev-fixture.ts)
pnpm --filter @debrief/briefing-renderer dev
# open the printed http://localhost:5173 URL
```

The dev fixture is extended for this feature to include a **Trail** scene and a
**Full** scene. To see the behaviour:

1. Land on the Trail scene. Drag the time-slider from left to right — each track
   draws from its start and **grows** toward the moving dot.
2. Switch to the Full scene. Drag the slider — the **whole** track stays drawn at
   every position; only the dot moves.

## Run the tests

```sh
# Unit tests (the pure mapping + classification — Contracts A & B)
pnpm --filter @debrief/briefing-renderer test

# Playwright growth screenshot + behavioural checks (Contract C), cloud-friendly
cd apps/briefing-renderer && node run-playwright.mjs briefing-zip-trail-mode && cd ../..
#   → writes specs/280-briefing-trail-mode/evidence/screenshots/trail-{start,growth,end}.png
```

## Verify before pushing (full CI parity)

```sh
task verify          # lint + typecheck + test (what CI runs)
# then the briefing-renderer Playwright wrapper above for the evidence screenshot
```

## Acceptance walkthrough (maps to spec Success Criteria)

| Step | Action | Expect | SC |
|------|--------|--------|----|
| 1 | Trail scene, slider at start | little/no track drawn | SC-001 |
| 2 | Trail scene, slider advancing | drawn track grows monotonically, trailing the dot | SC-001 |
| 3 | Trail scene, slider at end | full track drawn | SC-001 |
| 4 | Full scene, slider start→mid→end | full track at every position | SC-002 |
| 5 | Legacy briefing (no `display_mode`) | full track, no error | SC-003 |
| 6 | Compare Trail scene to the same scene in the main app preview | trail head matches | SC-004 |

## Key files

| Path | Role |
|------|------|
| `apps/briefing-renderer/src/components/BriefingMap.tsx` | The fix — read `display_mode`, slice tracks in Trail mode, render via `<Polyline>` |
| `apps/briefing-renderer/package.json` | Adds `@debrief/utils` workspace dep |
| `apps/briefing-renderer/src/fixtures/dev-fixture.ts` | Extended with Trail + Full scenes |
| `apps/briefing-renderer/src/components/__tests__/` | Unit tests (Contracts A & B) |
| `apps/briefing-renderer/playwright/tests/briefing-zip-trail-mode.spec.ts` | Playwright growth test (Contract C) |
| `@debrief/utils` → `sliceTrackToTime` | Reused trail-slice helper (parity with main app) |
