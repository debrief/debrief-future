# Data Model: 039 — Wire TimeController to TemporalTrackLayer

No new data entities. This feature wires existing models together.

## Existing Types Used

### TemporalSlice (session-state)
```typescript
interface TemporalSlice {
  currentTime: TimeInstant | null;  // epoch wrapper
  displayMode: DisplayMode;         // 'normal' | 'snailTrail'
  // ... other fields unchanged
}
```

### Track (VS Code webview)
```typescript
interface Track {
  id: string;
  times: string[];       // ISO 8601 per-coordinate timestamps
  geometry: LineString;   // coordinates: [lon, lat][]
  // ... other fields unchanged
}
```

### New: Cached Temporal Data (TrackRenderer internal)
```typescript
// Cached per track on load, not a new external type
interface CachedTrackTemporal {
  timestamps: number[];  // epoch ms, parsed from Track.times
}
```

## New Message Types

### SetDisplayModeMessage (Extension → Webview)
```typescript
interface SetDisplayModeMessage {
  type: 'setDisplayMode';
  displayMode: 'full' | 'trail';
}
```

## DisplayMode Mapping

| Session State | Webview Message | Meaning |
|---------------|-----------------|---------|
| `'normal'` | `'full'` | Full track + highlight marker |
| `'snailTrail'` | `'trail'` | Track from start to current time |
