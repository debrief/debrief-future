# T003 — active_storyboard call-site inventory

Captured 2026-05-28. Sites to repoint/retire in Phase 3.

## The #237 implementation layers

| Layer | File | Role |
|---|---|---|
| Pure FC read/write | `shared/components/src/storyboard/activeStoryboardSelection.ts` | `getActiveStoryboardSelection(plot)` / `setActiveStoryboardSelection(plot, id)` — the canonical wire-shape logic. Re-exported from `shared/components/src/storyboard/index.ts`. **Helper delegates here (R-011, NG-002).** |
| Web-shell wrapper | `apps/web-shell/src/services/activeStoryboardPersistence.ts` | `readPersistedActiveStoryboardId(fc)` / `persistActiveStoryboardId(fc, id, setFc)` — thin host-private wrapper. **To be folded into the shared helper + deleted (FR-015, T052→T054).** |

## Call sites

### Web-shell (`apps/web-shell/`) — to re-point to `@debrief/session-state` (T053)
- `src/StoryboardPanelMount.tsx:45–47` — imports `persistActiveStoryboardId`, `readPersistedActiveStoryboardId` from `./services/activeStoryboardPersistence`.
- `src/StoryboardPanelMount.tsx:199` — `readPersistedActiveStoryboardId(featureCollection).id` (initial state).
- `src/StoryboardPanelMount.tsx:207` — `readPersistedActiveStoryboardId(featureCollection)` (effect).
- `src/StoryboardPanelMount.tsx:220,388,434` — `persistActiveStoryboardId(...)` (writes).

### Shared components (`shared/components/`) — leave as-is (canonical logic, helper delegates here)
- `src/storyboard/index.ts:143–144` — re-exports.
- `src/storyboardPlayback/service.ts:278,288,295,444` — playback service uses `get/setActiveStoryboardSelection` directly for healing/selection. **Not touched** — these are storyboard-playback internals, delegated to (R-011).

### VS Code — none today (VS Code writes no SystemState). New wiring added in T055/T056.

## Decision
The helper's `active_storyboard` converter (T050) delegates to `@debrief/components`'s `get/setActiveStoryboardSelection`. The web-shell wrapper (`activeStoryboardPersistence.ts`) is deleted after its callers re-point to `@debrief/session-state`. Wire shape unchanged (NG-002).
