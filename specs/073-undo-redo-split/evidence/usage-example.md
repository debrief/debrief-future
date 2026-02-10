# Usage Example: 073 — Split Undo/Redo

## Before (12-field snapshot)

```typescript
// Pressing Ctrl+Z could accidentally revert which plot is loaded
store.getState().setFeatureCollectionUri('stac://exercise-alpha');
store.getState().setPlaybackRate(2.0);
store.getState().undo();
// featureCollectionUri was reverted to null — analytical work lost!
```

## After (10-field UI-only snapshot)

```typescript
import { createSessionStore } from '@debrief/session-state';

const store = createSessionStore();

// Load a plot (data operation — tracked by Log Service, not undo)
store.getState().setFeatureCollectionUri('stac://exercise-alpha');

// Make UI changes (tracked by undo)
store.getState().setPlaybackRate(2.0);
store.getState().setRotation(45);
store.getState().setSelection(['track-1'], 'track-1');

// Undo reverses UI changes only
store.getState().undo(); // selection reverted
store.getState().undo(); // rotation reverted
store.getState().undo(); // playbackRate reverted

// featureCollectionUri is still 'stac://exercise-alpha' — safe!
console.log(store.getState().featureCollectionUri); // 'stac://exercise-alpha'

// savePath is also protected from undo
store.getState().setSavePath('/home/analyst/plot.json');
store.getState().setPlaybackRate(3.0);
store.getState().undo(); // only playbackRate reverted
console.log(store.getState().savePath); // '/home/analyst/plot.json' — unchanged
```

## The Boundary

| Ctrl+Z Reverses (UI State) | Log Service Tracks (Data Changes) |
|-------|------|
| Viewport pan/zoom | Tool execution results |
| Map rotation | Feature collection loading |
| Time position & filter | Property edits |
| Playback rate & mode | File save location |
| Selection | — |
| Track visibility | — |
