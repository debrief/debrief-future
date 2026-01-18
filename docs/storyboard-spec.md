# Specification: Storyboard Briefings

## Context

Analysts need to communicate findings to remote stakeholders who don't have Debrief access. Currently this requires screen recordings or static screenshots with separate narration. A storyboard capability enables structured, reproducible briefings that can be played back within Debrief and (future) exported as standalone mini-apps.

### Use Cases (Priority Order)

1. **Remote stakeholder briefing** — sharing analysis findings with people without Debrief
2. **Training debrief delivery** — instructors walking students through exercises
3. **Analyst workflow** — structuring analysis narrative during investigation
4. **Archival** — reproducible records of key moments (secondary)

### MVP Scope

Authoring + in-app playback. Mini-app export deferred to future iteration.

---

## Information Model

### Storyboard Feature

Stored as a single GeoJSON Feature with a **MultiPolygon geometry** representing the coverage of all scene viewports:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": [
      [[[lon, lat], [lon, lat], [lon, lat], [lon, lat], [lon, lat]]],
      [[[lon, lat], [lon, lat], [lon, lat], [lon, lat], [lon, lat]]]
    ]
  },
  "properties": {
    "type": "Storyboard",
    "id": "uuid",
    "title": "Exercise Alpha Debrief",
    "description": "Key moments from the intercept sequence",
    "created": "2026-01-18T10:30:00Z",
    "autoPlay": false,
    "loopPlayback": false,
    "scenes": []
  }
}
```

### Coverage Geometry

The MultiPolygon geometry is **derived from scene viewports on save**:
- Each scene's viewport (center + zoom) produces a bounding box polygon
- All scene polygons combined into a MultiPolygon
- Recalculated whenever scenes are added, removed, or viewports updated
- Rendered on map to show storyboard coverage at a glance
- Empty storyboard (no scenes) has `geometry: null`
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| type | `"Storyboard"` | Yes | Discriminator for feature type |
| id | string (UUID) | Yes | Unique identifier |
| title | string | Yes | Display name |
| description | string | No | Optional summary |
| created | ISO8601 | Yes | Creation timestamp |
| autoPlay | boolean | Yes | Start playback automatically |
| loopPlayback | boolean | Yes | Return to first scene after last |
| scenes | array | Yes | Ordered list of scenes |

### Scene Object

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Initial Contact",
  "description": "Sonar detects contact bearing 045",
  "viewport": {
    "center": [-4.235, 50.127],
    "zoom": 12,
    "bearing": 0
  },
  "targetTime": "2026-01-15T08:30:00Z",
  "endTime": "2026-01-15T08:35:00Z",
  "transitionDuration": 2.5,
  "thumbnail": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.png"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string (UUID) | Yes | Unique identifier |
| title | string | Yes | Display name (shown on thumbnail) |
| description | string | No | Optional narration text |
| viewport | object | **Yes** | Map state (always required) |
| viewport.center | [lon, lat] | Yes | Map center coordinates |
| viewport.zoom | number | Yes | Zoom level |
| viewport.bearing | number | Yes | Rotation in degrees (default 0, north-up) |
| targetTime | ISO8601 | No | Time to jump/animate to. If null, time unchanged |
| endTime | ISO8601 | No | End of time range (only valid if targetTime set) |
| transitionDuration | number | No | Seconds to animate viewport and time transition |
| thumbnail | string | No | Filename in `.storyboard/thumbnails/` (authoring only, not exported) |

### Playback Behaviour Derivation

The `transitionDuration`, `targetTime`, and `endTime` fields combine to produce playback modes:

| targetTime | endTime | transitionDuration | Behaviour |
|------------|---------|-------------------|-----------|
| null | — | — | Viewport changes only, time continues |
| set | null | null/0 | Snap to viewport + time |
| set | null | > 0 | Animate viewport + time over duration |
| set | set | — | Animate through time range (viewport animates to position, then time plays through range) |

### Multiple Storyboards

A plot may contain multiple storyboard Features. Only one is active at a time for display/playback.

---

## UI Wireframes

### Panel Location

Horizontal panel docked at bottom of map view. Collapsible — hidden by default, shown when storyboard exists or authoring initiated.

### Panel Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [▼ Storyboard: Exercise Alpha ▾] [+ New]  [🔒 Freeze]      [◀][⏸▶][▶│]          │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐       │
│  │░░░░░░░░░░│   │░░░░░░░░░░│   │░░░░░░░░░░│   │░░░░░░░░░░│   │░░░░░░░░░░│  ···  │
│  │░ thumb  ░│   │░ thumb  ░│   │░ thumb  ░│   │░ thumb  ░│   │░ thumb  ░│       │
│  │░░░░░░░░░░│   │░░░░░░░░░░│   │░░░░░░░░░░│   │░░░░░░░░░░│   │░░░░░░░░░░│       │
│  ├──────────┤   ├──────────┤   ├──────────┤   ├──────────┤   ├──────────┤       │
│  │Initial   │   │Track     │   │Intercept │   │Close     │   │Depart    │       │
│  │Contact   │   │Develop   │   │Point     │   │Pass      │   │          │       │
│  │ 🗺️ ⏱️ ▶  │   │ 🗺️ ⏱️    │   │ 🗺️ ⏱️ ⏩ │   │ 🗺️      │   │ 🗺️ ⏱️    │       │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘       │
│      [◀ ▶]          [◀ ▶]          [◀ ▶]          [◀ ▶]          [◀ ▶]          │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Header Bar Elements

| Element | Description |
|---------|-------------|
| **Storyboard dropdown** | Selects active storyboard from available list |
| **+ New** | Creates new storyboard (prompts for title) |
| **🔒 Freeze Viewport** | Toggle. When active, manual pan/zoom disabled — prevents accidental viewport changes during authoring |
| **Transport controls** | ◀ Step Back, ⏸/▶ Play/Pause, ▶│ Step Forward |

### Scene Card Elements

Each scene displays as a card in a horizontal scrolling strip:

| Element | Description |
|---------|-------------|
| **Thumbnail** | Small map snapshot captured at scene creation |
| **Title** | Scene title (truncated if long) |
| **Constraint indicators** | Icons showing what the scene controls |
| **Reorder buttons** | ◀ ▶ arrows (visible on hover/focus for accessibility) |

### Constraint Indicators

| Icon | Meaning |
|------|---------|
| 🗺️ | Viewport constrained (always present) |
| ⏱️ | Time constrained (`targetTime` set) |
| ▶ | Animated transition (`transitionDuration` > 0) |
| ⏩ | Time range playback (`endTime` set) |

### Interaction Behaviours

| Action | Result |
|--------|--------|
| **Click scene card** | Map navigates to scene viewport/time AND populates Properties Panel |
| **Drag scene card** | Reorders scenes (drag-and-drop) |
| **◀ ▶ buttons on card** | Reorders scene (accessibility alternative) |
| **Keyboard: Space** | Play/Pause |
| **Keyboard: Left/Right** | Step back/forward |
| **Keyboard: Cmd/Ctrl+Shift+S** | Quick capture (no prompt) |
| **Keyboard: Cmd/Ctrl+Alt+S** | Prompted capture (title dialog) |

### Commands (Command Palette)

| Command | ID |
|---------|-----|
| Debrief: Open Storyboard Editor | `debrief.storyboard.open` |
| Debrief: Capture Scene | `debrief.storyboard.captureScene` |
| Debrief: Capture Scene with Details | `debrief.storyboard.captureScenePrompted` |
| Debrief: Play Storyboard | `debrief.storyboard.play` |
| Debrief: Step Forward | `debrief.storyboard.stepForward` |
| Debrief: Step Back | `debrief.storyboard.stepBack` |

### Scene Capture Flow

**Quick Capture (Cmd+Shift+S or button):**
1. Current viewport captured
2. Current time captured (if time slider active)
3. Scene added to end with auto-title "Scene N"
4. Thumbnail generated
5. Scene card appears in strip

**Prompted Capture (Cmd+Alt+S or menu):**
1. Dialog appears with fields: Title, Description
2. On confirm: same as quick capture with provided metadata

### Scene Editing

Selecting a scene populates the standard Debrief **Properties Panel** with:

- Title (text field)
- Description (text area)
- Viewport section: Center, Zoom, Bearing (read-only display, "Recapture Viewport" button)
- Time section: Target Time, End Time (date-time pickers, clearable)
- Transition: Duration slider (0-10 seconds)
- Delete button

**Recapture Viewport** updates the scene's viewport fields from the current map view AND regenerates the thumbnail.

### Playback States

| State | Visual Indicator |
|-------|------------------|
| **Stopped** | No highlight, Play button shown |
| **Playing** | Current scene highlighted with accent border, Pause button shown |
| **Paused** | Current scene highlighted (dimmed), Play button shown |

### Empty State

When no storyboard exists:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│     No storyboard yet. [Create Storyboard] to start capturing scenes.           │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Collapsed State

When panel collapsed, show minimal bar:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ▶ Storyboard: Exercise Alpha (5 scenes)                                    [▲]  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### Authoring

- [ ] Analyst can create a new storyboard with title
- [ ] Analyst can capture scene via button or keyboard shortcut
- [ ] Quick capture adds scene with auto-generated title
- [ ] Prompted capture allows title/description entry
- [ ] Scene thumbnail generated on capture
- [ ] Analyst can reorder scenes via drag-and-drop
- [ ] Analyst can reorder scenes via arrow buttons (accessibility)
- [ ] Analyst can edit scene properties in Properties Panel
- [ ] Analyst can delete individual scenes
- [ ] Analyst can delete entire storyboard
- [ ] Viewport Freeze toggle prevents accidental pan/zoom
- [ ] Multiple storyboards supported per plot
- [ ] Storyboard dropdown switches active storyboard

### Playback

- [ ] Click on scene navigates map to that viewport/time
- [ ] Click on scene populates Properties Panel
- [ ] Step Forward advances to next scene
- [ ] Step Back returns to previous scene
- [ ] Play auto-advances through scenes
- [ ] Scenes without `targetTime` preserve current time
- [ ] Scenes with `transitionDuration` animate smoothly
- [ ] Scenes with `endTime` play through time range
- [ ] Current scene visually highlighted during playback
- [ ] Playback loops if `loopPlayback: true`
- [ ] Playback stops on last scene if `loopPlayback: false`
- [ ] Time fields disabled (with tooltip) for time-less plots

### Persistence

- [ ] Storyboard saved as Feature in plot GeoJSON
- [ ] Storyboard changes saved with plot save (not auto-saved)
- [ ] Storyboard survives save/load cycle
- [ ] Scene order preserved on reload
- [ ] Thumbnail files created in `.storyboard/thumbnails/`
- [ ] Thumbnail regenerated when viewport recaptured
- [ ] Thumbnail deleted when scene deleted
- [ ] Empty storyboard (no scenes) persists until explicitly deleted
- [ ] Coverage geometry (MultiPolygon) derived from scene viewports on save
- [ ] Coverage geometry recalculated when scenes added/removed/viewport changed
- [ ] Coverage polygons rendered on map

---

## Future Considerations (Out of Scope for MVP)

- **Mini-app export**: Package as self-contained HTML with embedded data and background raster
- **Audio narration**: `audioUrl` field on scenes for voice-over
- **Viewport-only export**: Static background image for air-gapped delivery
- **Collaborative annotations**: Viewer can add temporary markers
- **Branching narratives**: Non-linear storyboards with decision points

---

## VS Code Implementation

### Panel Architecture

The storyboard editor is implemented as a **Webview Panel** — a standalone dockable panel that can be positioned anywhere in the VS Code layout (bottom, side, floating).

| Aspect | Approach |
|--------|----------|
| **Panel type** | `vscode.window.createWebviewPanel()` |
| **View type ID** | `debrief.storyboardEditor` |
| **Default position** | Bottom panel area (alongside Terminal) |
| **Retains context** | Yes — preserves state when hidden |

### Communication

Map webview and storyboard panel communicate via the extension host:

```
┌─────────────────┐     postMessage      ┌─────────────────┐
│  Map Webview    │ ◄──────────────────► │  Extension Host │
└─────────────────┘                      └────────┬────────┘
                                                  │
                                         postMessage
                                                  │
                                         ┌────────▼────────┐
                                         │  Storyboard     │
                                         │  Webview Panel  │
                                         └─────────────────┘
```

### Message Types

**Map → Extension → Storyboard:**
- `viewport:changed` — current viewport state (for capture)
- `time:changed` — current time slider position
- `scene:navigate:complete` — playback arrived at scene

**Storyboard → Extension → Map:**
- `scene:navigate` — request map to go to scene viewport/time
- `scene:capture:request` — request current viewport/time for new scene
- `viewport:freeze` — lock/unlock map interaction

**Extension → Both:**
- `storyboard:loaded` — storyboard data from GeoJSON
- `storyboard:updated` — sync after edits

### Activation

Panel created on:
- Command: `Debrief: Open Storyboard Editor`
- First storyboard feature detected in loaded plot
- Keyboard shortcut for scene capture (auto-opens if closed)

### Thumbnail Storage

Thumbnails are an **authoring-time convenience only** — used in VS Code to help analysts visually identify scenes. Not included in exported mini-app (which has transport controls only, no scene picker).

**Storage approach:**
- Thumbnails saved as PNGs in sidecar folder: `.storyboard/thumbnails/{scene-id}.png`
- Scene references thumbnail by filename (not embedded base64)
- Sidecar folder excluded from export

**Thumbnail lifecycle:**
- **Created** on scene capture
- **Regenerated** when viewport is recaptured via "Recapture Viewport" button
- **Deleted** when scene is deleted

### Thumbnail Generation

Thumbnails captured via:
1. Storyboard requests capture from extension
2. Extension requests map webview to render current view to canvas
3. Map returns base64 PNG (scaled to ~150x100px)
4. Extension saves to sidecar folder
5. Scene stores reference: `"thumbnail": "{scene-id}.png"`

---

## Behavioural Details

### Active Storyboard

When multiple storyboards exist, the "active" one is **UI state only** — the extension remembers the last-viewed storyboard but this resets on reload. No persistence in file.

### Scene Selection

**Click navigates AND selects** — clicking a scene card navigates the map to that viewport/time AND populates the Properties Panel for editing. No separate selection mechanism needed.

### Save Behaviour

Storyboard changes are held in memory and **saved with the plot**. Follows the same dirty-state pattern as other plot modifications.

### End-of-Playback

After the last scene completes:
- If `loopPlayback: true` — returns to first scene, continues playing
- If `loopPlayback: false` — stops, stays on last scene

### Thumbnail Cleanup

When a scene is deleted, the extension **immediately deletes** its thumbnail file from `.storyboard/thumbnails/`.

### Empty Storyboard

If all scenes are deleted, the **empty storyboard persists** with `scenes: []`. Analyst must explicitly delete the storyboard via the dropdown menu.

### Time-less Plots

If the plot has no temporal data:
- Time fields (`targetTime`, `endTime`) are **visible but disabled** in Properties Panel
- Tooltip explains: "No temporal data in this plot"
- Scenes capture viewport only

---

## Design Decisions

### Time Range Playback Speed

When a scene has `endTime` set, the time range is **compressed or expanded to fit `transitionDuration`**. This keeps one field controlling the pace of both viewport animation and time progression.

### Bearing/Rotation

`bearing` field **retained in schema** (defaults to 0, north-up). Rendering support deferred — Leaflet plugin required. For MVP, bearing is stored but ignored on playback.
