# `@debrief/components` — Changelog

This package is pre-v4.0.0; entries here are advisory rather than SemVer-guaranteed. Public-API surfaces noted under "Public API" headings are pinned (signature + invariant) and require a CHANGELOG entry to change.

---

## Unreleased

### Public API

- **`composeSceneEditViewModels` promoted from "exported helper" to "public API with perf invariant".**
  Pinned location: `shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.ts`.
  Pinned contract: `shared/components/src/panels/StoryboardPanel/CONTRACTS.md`.
  Invariant: O(active-storyboard Scenes) — the function MUST iterate only the active storyboard's scenes (FR-008, carried forward from #230).
  Perf budget: median ≤ 50 ms (hard) / ≤ 60 ms (CI soft) over 100 iterations against a 50-Scene active storyboard inside a 5 × 50-Scene fixture (FR-030).
  Regression guard: `shared/components/src/panels/StoryboardPanel/__tests__/composeSceneEditViewModels.perf.test.ts` — failure message cites `CONTRACTS.md`.
  Origin: feature 234, FR-046.

### Test-only surfaces (NOT public API)

- **`__testing__/storyOnlyMockPort.ts` test-only export surface introduced.**
  Files under `**/__testing__/**` are intended for stories + harness use only. Production imports from `apps/vscode/src/**` are forbidden by an ESLint `no-restricted-imports` rule (FR-044). See `shared/components/src/panels/StoryboardPanel/__testing__/` (or, if the helper is not yet present in your checkout, feature 234 plan.md §Project Structure for the timeline).
