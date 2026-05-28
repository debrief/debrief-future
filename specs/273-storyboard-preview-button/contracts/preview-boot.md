# Contract: Renderer URL-boot (live preview) path

**Feature**: 273 | Component: `apps/briefing-renderer/`

Defines the additive boot path. The existing inline/dev-fixture path is a frozen baseline — every assertion here is **in addition to**, never a change to, current behaviour.

## Trigger

- Launch URL contains `?features=<encoded-url>` → **URL-boot** (async).
- Launch URL omits `features` → **inline-boot** (unchanged, synchronous).

## URL-boot sequence

1. `App.tsx` detects `features` param (independently of the existing `?story=` hook).
2. `bootState` = `loading`.
3. `urlDataLoader.fetchAndValidate(url)`:
   - `fetch(url)` → on non-OK HTTP or network failure → `InlineDataLoadError`.
   - parse JSON → on parse failure → `InlineDataLoadError`.
   - run the **existing** validators: FeatureCollection shape; exactly one `StoryboardFeature`; every `SceneFeature.storyboard_id` matches it; scene ordering by `(timestamp, creation_order)`.
   - synthesise minimal `item` (`{type:'Feature', id, properties:{}, assets:{}, links:[]}`) and `config` (with online `tileLayerUrl`).
4. `store.seed({ features, item, scenes, config })` — the **unchanged** seed method.
5. `bootState` → `ready` (or `empty` if zero scenes).

## Guarantees (testable)

- **G1**: With no `features` param and empty inline slots + `disableDevFixture`, boot returns `error` (existing test — must stay green).
- **G2**: With no `features` param and populated inline slots, boot seeds synchronously from slots (existing behaviour — must stay green).
- **G3**: With no `features` param, the renderer issues **zero** network requests for storyboard data (offline-zip guarantee — FR-011).
- **G4**: With a valid `features` URL, the renderer fetches it once, validates, and reaches `ready` with the storyboard playing.
- **G5**: With an unreachable/invalid `features` URL, the renderer reaches `error` with a human-readable message (FR-008) — never a blank screen.
- **G6**: A storyboard with one scene reaches `ready` (not `empty`); zero scenes reaches `empty`.
- **G7**: The two boot paths share the same validators and the same `store.seed()` — no divergent normalisation.

## Basemap

- `BriefingMap` tile URL = `config.tileLayerUrl ?? './tiles/{z}/{x}/{y}.png'`.
- URL-preview sets an online template → tiles load when online; offline degrades to `errorTileUrl` placeholder (no crash).
- Inline/zip leaves `tileLayerUrl` unset → bundled local tiles, byte-identical to today.
