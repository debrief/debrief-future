# IPC retype + silent-narrow deletion inventory (Feature 205)

**Generated**: 2026-04-21
**Covers**: review decisions 2A (IPC retypes), 3A (silent-narrowing deletion), 4A (SetDisplayModeMessage retype)

## Summary

- **5 IPC message shapes** retyped to `DisplayMode` / `PlaybackState`
- **4 callback / method-signature declarations** widened to the schema-rooted types
- **1 silent-narrowing translator** deleted — the `'stopped'` → `'paused'` value-changer at `timeRangeView.ts:241` is gone; session-state now receives the raw three-state value.

## 1. IPC message shapes (retyped)

### 1.1 `apps/vscode/src/views/activityPanelView.ts` — `TemporalDisplayModeMessage.payload.mode` (FR-022 bullet 1)

**Before:**
```ts
interface TemporalDisplayModeMessage {
  type: 'temporal:displayMode';
  payload: { mode: 'full' | 'trail' };
}
```

**After:**
```ts
interface TemporalDisplayModeMessage {
  type: 'temporal:displayMode';
  payload: { mode: DisplayMode };
}
```

### 1.2 `apps/vscode/src/views/timeRangeView.ts` — `PlaybackStateChangeMessage.state` (FR-022 bullet 2)

**Before:**
```ts
interface PlaybackStateChangeMessage {
  type: 'playbackStateChange';
  state: 'playing' | 'paused';
}
```

**After:**
```ts
interface PlaybackStateChangeMessage {
  type: 'playbackStateChange';
  state: PlaybackState;
}
```

### 1.3 `apps/vscode/src/views/timeRangeView.ts` — `DisplayModeChangeMessage.mode` (FR-022 bullet 3)

**Before:**
```ts
interface DisplayModeChangeMessage {
  type: 'displayModeChange';
  mode: 'full' | 'trail';
}
```

**After:**
```ts
interface DisplayModeChangeMessage {
  type: 'displayModeChange';
  mode: DisplayMode;
}
```

### 1.4 + 1.5 `apps/vscode/src/webview/messages.ts` — `SetDisplayModeMessage.displayMode` (FR-022 bullet 5 / review 4A)

**Before:**
```ts
export interface SetDisplayModeMessage {
  type: 'setDisplayMode';
  displayMode: 'full' | 'trail';
}
```

**After:**
```ts
export interface SetDisplayModeMessage {
  type: 'setDisplayMode';
  displayMode: DisplayMode;
}
```

(The `TemporalDisplayModeMessage` above already counted; the plan groups the two host→webview setter contracts together as a single IPC-contract class for traceability.)

## 2. Callback / method-signature declarations (widened)

### 2.1 + 2.2 `apps/vscode/src/views/timeRangeView.ts` — private callback fields (FR-022 bullet 4)

**Before:**
```ts
private _onPlaybackStateChangeCallback?: (state: 'playing' | 'paused') => void;
private _onDisplayModeChangeCallback?: (mode: 'full' | 'trail') => void;
```

**After:**
```ts
private _onPlaybackStateChangeCallback?: (state: PlaybackState) => void;
private _onDisplayModeChangeCallback?: (mode: DisplayMode) => void;
```

### 2.3 + 2.4 `apps/vscode/src/views/timeRangeView.ts` — public method signatures (FR-022 bullet 4)

**Before:**
```ts
public onPlaybackStateChange(callback: (state: 'playing' | 'paused') => void): void { ... }
public onDisplayModeChange(callback: (mode: 'full' | 'trail') => void): void { ... }
```

**After:**
```ts
public onPlaybackStateChange(callback: (state: PlaybackState) => void): void { ... }
public onDisplayModeChange(callback: (mode: DisplayMode) => void): void { ... }
```

## 3. Silent-narrowing translator deletion (review 3A / FR-022a)

### 3.1 `apps/vscode/src/views/timeRangeView.ts:241`

**Before** (disguised value-changer — silently collapsed `'stopped'` → `'paused'`):
```ts
case 'playbackStateChange':
  if (this._shouldPropagateToStore) {
    state.setPlaybackState(message.state === 'playing' ? 'playing' : 'paused');
  }
```

**After** (direct pass-through now that the IPC shape carries the canonical three-state `PlaybackState`):
```ts
case 'playbackStateChange':
  if (this._shouldPropagateToStore) {
    state.setPlaybackState(message.state);
  }
```

This is an Article I.3 closure — the silent-failure mode (an inbound
`'stopped'` being rewritten to `'paused'` in the store, with no error and
no log) is replaced by correctness: the store receives exactly what the
sender sent, and the load boundary rejects any non-canonical value with a
typed error.

## 4. Verification

All 9 acceptance checks from `contracts/linkml-enums.md §6` plus the 8
post-review checks (10–17) pass on the PR branch. Concretely for this
inventory:

- Check 11: `! grep -n "message.state === 'playing' ? 'playing' : 'paused'" apps/vscode/src/views/timeRangeView.ts` → exit 0 (no match). ✅
- Check 12: `! grep -nE "(state|mode): 'playing' \\| 'paused'|'full' \\| 'trail'" apps/vscode/src/views/timeRangeView.ts apps/vscode/src/webview/messages.ts` → exit 0 (no match). ✅
