# Add storyboarding capability for mission/exercise briefings

## Problem

Analysts need a way to create guided walkthroughs of recorded exercises for briefings and training. Currently, sharing analysis insights requires either live screen-sharing or exporting static images that lack context and narrative flow.

## Proposed Solution

Add a storyboarding feature that allows analysts to capture a sequence of "scenes" — each combining a map viewport (center, zoom, bearing) and/or timestamp — and play them back in order. This enables:

1. **Scene Capture**: Button in storyboard panel + keyboard shortcut to capture current view/time as a scene
2. **Storyboard Panel**: Horizontal list of scene thumbnails at bottom of map view
3. **Playback Controls**: Play (auto-advance with configurable delay) and Step (manual) modes
4. **Scene Editing**: Full editing — reorder via drag, edit title/description, delete scenes
5. **Multiple Storyboards**: A plot can have multiple named storyboards (e.g., "Engagement Overview", "Track Analysis")

### Data Storage

Store storyboards in GeoJSON as a point-less Point geometry (null coordinates) with storyboard data in properties:

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": null },
  "properties": {
    "debrief:type": "storyboard",
    "name": "Engagement Overview",
    "scenes": [
      {
        "title": "Initial Contact",
        "description": "First radar detection of hostile tracks",
        "viewport": { "center": [lon, lat], "zoom": 12, "bearing": 45 },
        "timestamp": "2024-03-15T14:30:00Z"
      }
    ]
  }
}
```

## Success Criteria

- [ ] Analyst can capture scenes with current viewport and/or timestamp
- [ ] Scenes displayed as thumbnail strip in storyboard panel
- [ ] Play button auto-advances through scenes with configurable delay
- [ ] Step buttons move forward/backward one scene at a time
- [ ] Map viewport and time slider animate to match scene settings
- [ ] Scenes can be reordered via drag-and-drop
- [ ] Scene title and description can be edited inline
- [ ] Multiple named storyboards supported per plot
- [ ] Storyboard data persists in GeoJSON via debrief-stac
- [ ] Works fully offline

## Constraints

- Must work offline (CONSTITUTION Article I)
- Store in GeoJSON to maintain schema compliance (CONSTITUTION Article II)
- UI in VS Code extension; data operations via services (CONSTITUTION Article IV)

## Out of Scope (Phase 2)

- Mini-app export packaging with embedded data and snapshot background images
- Storyboard sharing/collaboration features
- Video export
