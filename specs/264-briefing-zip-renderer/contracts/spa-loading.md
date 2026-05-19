# Contract — Briefing Renderer SPA loading & playback

**Surface**: standalone single-page application
**Entry**: `apps/briefing-renderer/src/main.tsx` → `apps/briefing-renderer/dist/index.html`
**Runtime**: any modern desktop browser opening the bundled `index.html`
from `file://` origin (or any HTTP origin — the SPA is origin-agnostic).

## Loading sequence (must not deviate)

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Browser loads index.html from file:// or http://             │
│ 2. SPA reads inlined <script type="application/json"> blocks    │
│    via document.getElementById(…).textContent + JSON.parse      │
│    → BriefingFeatureCollection, BriefingItemJson, BriefingConfig│
│ 3. Boundary-validate (data-model § 8). On failure → Error state │
│ 4. Construct local Zustand store; seed with features + scenes   │
│ 5. Mount React tree:                                            │
│       <App>                                                     │
│         <MapView tileLayerUrl="./tiles/{z}/{x}/{y}.png" … />    │
│         <ChromeRouter mode="minimal" />  ← FR-026 default       │
│       </App>                                                    │
│ 6. Instantiate StoryboardPlaybackService with browser adapters: │
│       new StoryboardPlaybackService({                           │
│         mapPanel:        new BrowserMapAdapter(leafletMapRef),  │
│         sessionManager:  new LocalSessionStoreAdapter(zustand), │
│         panelView:       new BrowserPanelViewAdapter(zustand),  │
│         timeRangeView:   new BrowserTimeRangeViewAdapter(zustand),│
│         // runTimeRangeTween + defaultScheduler imported from   │
│         // @debrief/components/storyboardPlayback (shipped #263)│
│       })                                                        │
│ 7. Render first Scene (Scene 0) at rest. Wait for user input.   │
└─────────────────────────────────────────────────────────────────┘
```

Spec mapping: FR-014, FR-015, FR-016, FR-017, FR-026.

## Origin & network behaviour

| Resource | Source | Network? |
|----------|--------|----------|
| HTML / CSS / JS | local zip, relative paths | never |
| `BriefingFeatureCollection` | inline `<script type="application/json">` | never |
| `BriefingItemJson` | inline `<script type="application/json">` | never |
| `BriefingConfig` | inline `<script type="application/json">` | never |
| Scene thumbnails | `./scene-thumbnails/scene-{ULID}.png` via `<img>` | never |
| Basemap tiles | `./tiles/{z}/{x}/{y}.png` via Leaflet `<img>` | never |
| Tile placeholder | `./tiles/placeholder.png` via Leaflet's `errorTileUrl` | never |

**No `fetch()` calls. No `XMLHttpRequest`. No service worker. No
WebSocket. No external CDN for fonts/icons.**

Spec mapping: FR-015, FR-027, FR-028, FR-029, SC-002.

## Public component surface

```ts
// apps/briefing-renderer/src/App.tsx
export interface AppProps {
  inlineData?: {                            // optional override for tests
    features: BriefingFeatureCollection;
    item: BriefingItemJson;
    config: BriefingConfig;
  };
}
export const App: React.FC<AppProps>;
```

The `inlineData` prop allows Playwright tests to bypass the
`<script type=application/json>` extraction step and inject fixtures
directly, without needing a full export pipeline run.

## Display modes

```ts
// apps/briefing-renderer/src/store.ts (excerpt)
export type DisplayMode = 'present' | 'minimal';

interface DisplayModeActions {
  setMode(mode: DisplayMode): void;          // preserves playback state — FR-025
  toggleMode(): void;
}
```

### Mode chrome contract

| Mode | Chrome visible | Toggle reachability |
|------|---------------|---------------------|
| `'minimal'` (default) | transport bar (play / pause / prev Scene / next Scene), time slider, current Scene index, "Enter Present" button | always |
| `'present'` | nothing visible by default | keyboard shortcut `P` toggles back to Minimal; mouse movement near the top-right reveals a discreet "Exit Present" affordance for 3 seconds, then it hides again |

Spec mapping: FR-023, FR-024, FR-025, FR-026.

### Toggle interaction

```ts
// apps/briefing-renderer/src/components/ModeToggle.tsx
const handlePresentEntry = () => {
  // Confirmed by interaction:
  //  - playback state preserved
  //  - chrome hidden in <1 frame
  //  - keyboard listener for 'P' installed
  setMode('present');
};
```

## Playback contract (inherited from #217 / #258 / #263)

The SPA does **not** reimplement playback. It composes:

- `StoryboardPlaybackService` (hoisted by this feature from
  `apps/vscode/src/services/storyboardPlayback.ts` to
  `shared/components/src/storyboardPlayback/service.ts`) — the
  orchestrator that branches on `isTimeRangeScene(scene)` and chooses
  between the instant and time-range paths.
- `runTimeRangeTween` + `defaultScheduler` from
  `shared/components/src/storyboardPlayback/timeRangeTween.ts` — the
  host-agnostic RAF-driven primitive already shipped by #263 that drives
  per-frame `setCurrentTime()` + `flyToViewport(durationMs=0)` for
  time-range Scenes.

with four browser port adapters supplied by the SPA. The SPA never
forks or shadows playback logic.

Per-Scene behaviour follows the parent contract verbatim:

| Scene type | Behaviour |
|-----------|-----------|
| Instant (`time_range === null`) | Tween viewport into `viewport` over `transition_duration_ms`; slider rests at `timestamp`. |
| Time-range (`time_range !== null`) | Simultaneously interpolate `viewport → viewport_end` and `slider t_start → t_end` over the captured wall-clock duration (linear). |
| Mixed Storyboard | Both kinds coexist; transitions between them work per parent contract. |

Spec mapping: FR-016, FR-017, FR-020.

## Error & empty states

| State | Trigger | UI |
|-------|---------|----|
| Empty | `scenes.length === 0` | Full-viewport message: "This Storyboard has no Scenes to play." No transport controls. |
| Loading | First mount, < 200 ms before first paint | Lightweight skeleton; no spinner that implies network. |
| Error (data unreadable) | Boundary validation fails | Full-viewport message identifying which file is unreadable. No retry button (offline; nothing to retry against). |
| Error (browser hostile to `file://`) | Detected via feature probe at boot | Single-line banner suggesting opening in a different browser. SPA still attempts to load. |
| Success | Validation passed, ≥ 1 Scene | Minimal chrome over Scene 0 at rest, awaiting Play. |

Spec mapping: FR-030, FR-031.

## Browser-compat probes at boot

Three quick feature probes run before mount and inform the Error
banner if needed (they never block boot):

```ts
const probes = {
  inlineJsonReadable: canReadInlineJson(),         // always true
  relativeImgLoadable: canLoadRelativeImage(),     // tested with a 1x1 pixel
  leafletTilesLoadable: canLoadRelativeTile(),     // tested with placeholder.png
};
```

A failed probe logs to console and surfaces the banner; the SPA does
**not** attempt to recover by falling back to network.

## Replay behaviour

When the user reaches the end of the Storyboard:

1. SPA rests on the final Scene (FR-021).
2. Minimal-mode transport shows a "Replay" button in place of "Next".
3. Pressing Replay resets `currentSceneIndex` to `0` and `currentTime`
   to the first Scene's `timestamp`. No fetches occur (FR-022).
4. Present-mode users press `Space` (already wired to play/pause) to
   restart; alternatively the keyboard shortcut `R` triggers Replay.

## Test obligations

| Test | Verifies | Location |
|------|----------|----------|
| Playwright: `briefing-zip-file-protocol.spec.ts` | SPA boots from `file://` and renders Scene 0 | `apps/briefing-renderer/playwright/tests/` |
| Playwright: `briefing-zip-network-isolation.spec.ts` | Zero external requests across load → play → toggle → replay | same dir |
| Playwright: `briefing-zip-playback.spec.ts` | Instant + time-range Scene playback matches expected slider/viewport trajectory | same dir |
| Playwright: `briefing-zip-mode-toggle.spec.ts` | 10 consecutive toggles preserve playback state (SC-005) | same dir |
| Vitest: `inlineDataLoader.test.ts` | Boundary validation rejects malformed payloads with clear errors | `apps/briefing-renderer/src/loaders/` |
| Vitest: `BrowserMapAdapter.test.ts` | Adapter implements `MapPanel` port correctly | `apps/briefing-renderer/src/adapters/` |

## Constitution-check notes

- **I.1 (offline by default)**: enforced by FR-015, the network-isolation
  Playwright test, and the absence of `fetch`/SW from the SPA.
- **I.3 (no silent failures)**: every Error state has a user-visible
  surface; nothing degrades silently.
- **IV.1 (services never touch UI)**: the SPA is a frontend; it consumes
  the `StoryboardPlaybackService` via its existing port interface.
- **XV (strict types)**: SPA is TypeScript strict; the inline data
  loader narrows to typed models at the boundary (XV.5).
