# Migration Quickstart: DisplayMode and PlaybackState

**Feature**: 205-promote-enums-linkml
**Date**: 2026-04-21

This guide is the step-by-step recipe for implementing feature 205. Work through each step in order; run `task verify` after Step 5 and Step 6 to catch issues early.

---

## Step 1: Rename `DisplayModeEnum` values in LinkML

**File**: `shared/schemas/src/linkml/session-state.yaml`

```yaml
# BEFORE
  DisplayModeEnum:
    description: Track visualization display mode
    permissible_values:
      normal:
        description: Standard track display
      snailTrail:
        description: Trail showing recent positions

# AFTER
  DisplayModeEnum:
    description: >-
      Track visualization display mode.
      'full': entire track always visible.
      'trail': snail-trail up to current time cursor only.
      Canonical vocabulary aligns with shared/components usage;
      the session-state 'normal'/'snailTrail' naming is retired.
    permissible_values:
      full:
        description: Entire track rendered at all times, regardless of time cursor position
      trail:
        description: Only the track portion from start up to the current time cursor is rendered
```

Also update `PlaybackStateEnum` description (values unchanged) per `contracts/linkml-enums.md §1`.

---

## Step 2: Add post-processor patches to `generate.py`

**File**: `shared/schemas/scripts/generate.py` — inside `generate_typescript()`, after the existing `_point_shape_sentinel` block.

Add Patches A, B, and C from `contracts/linkml-enums.md §3`. The patches:
- Inject `export type PlaybackState = \`${PlaybackStateEnum}\`` after `PlaybackStateEnum { ... };`
- Inject `export type DisplayMode = \`${DisplayModeEnum}\`` after `DisplayModeEnum { ... };`
- Narrow `TemporalSlice.playbackState: string` → `PlaybackState`
- Narrow `TemporalSlice.displayMode: string` → `DisplayMode`

---

## Step 3: Regenerate all artefacts

```bash
cd shared/schemas
uv run python scripts/generate.py
```

Verify the generated output contains:
```bash
grep "export type PlaybackState" src/generated/typescript/types.ts
grep "export type DisplayMode" src/generated/typescript/types.ts
grep "playbackState: PlaybackState," src/generated/typescript/types.ts
grep "displayMode: DisplayMode," src/generated/typescript/types.ts
grep "full" src/generated/python/debrief_schemas/__init__.py
grep "trail" src/generated/python/debrief_schemas/__init__.py
```

---

## Step 4: Add schema fixtures

Create `shared/schemas/fixtures/session-state/` directory and add the seven fixture files from `contracts/linkml-enums.md §4`. Also extend `shared/schemas/tests/test_golden.py` to validate the new fixtures — see the existing `ENTITY_MAP` pattern for reference.

---

## Step 5: Migrate `services/session-state`

### 5a. Update `src/types/temporal.ts`

```typescript
// BEFORE (delete these two lines)
export type PlaybackState = 'stopped' | 'playing' | 'paused';
export type DisplayMode = 'normal' | 'snailTrail';

// AFTER (add import)
import type { PlaybackState, DisplayMode } from '@debrief/schemas';
export type { PlaybackState, DisplayMode };
```

Update `DEFAULT_TEMPORAL_SLICE`:
```typescript
// BEFORE
displayMode: 'normal',

// AFTER
displayMode: 'full',
```

### 5b. Update `tests/unit/slices/temporal.test.ts`

```typescript
// Replace 'normal' → 'full' and 'snailTrail' → 'trail' throughout
// Before
it('should have displayMode of normal by default', () => {
  expect(store.getState().displayMode).toBe('normal');

// After
it('should have displayMode of full by default', () => {
  expect(store.getState().displayMode).toBe('full');

// Before
it('should set display mode to snailTrail', () => {
  store.getState().setDisplayMode('snailTrail');
  expect(store.getState().displayMode).toBe('snailTrail');

it('should set display mode to normal', () => {
  store.getState().setDisplayMode('snailTrail');
  store.getState().setDisplayMode('normal');
  expect(store.getState().displayMode).toBe('normal');

// After
it('should set display mode to trail', () => {
  store.getState().setDisplayMode('trail');
  expect(store.getState().displayMode).toBe('trail');

it('should set display mode to full', () => {
  store.getState().setDisplayMode('trail');
  store.getState().setDisplayMode('full');
  expect(store.getState().displayMode).toBe('full');
```

### 5c. Update `tests/unit/persistence.test.ts`

Replace all occurrences of `'snailTrail'` → `'trail'` and `'normal'` → `'full'` in this file. Also update the inline fixture object:
```typescript
// Before
{ playbackState: 'stopped', displayMode: 'normal' }

// After
{ playbackState: 'stopped', displayMode: 'full' }
```

### 5d. Update `src/persistence/load.ts`

```typescript
// Before
if (temporal.displayMode) {
  store.getState().setDisplayMode(temporal.displayMode as never);

// After
import type { DisplayMode } from '@debrief/schemas';
// ...
if (temporal.displayMode) {
  store.getState().setDisplayMode(temporal.displayMode as DisplayMode);
```

Note: `as DisplayMode` is acceptable here — this is a persistence boundary where the value has been JSON-parsed. The cast is narrower than `as never` and documents the expected type.

---

## Step 6: Migrate `shared/components`

### 6a. Delete `DisplayMode` from `src/utils/types.ts`

```typescript
// Delete lines 76-80 (the JSDoc + type declaration):
/**
 * Track display mode.
 * ...
 */
export type DisplayMode = 'full' | 'trail';

// Add import at top of file
import type { DisplayMode } from '@debrief/schemas';
// Re-export for consumers of @debrief/components
export type { DisplayMode };
```

### 6b. Delete `PlaybackState` from `src/TimeController/types.ts`

```typescript
// Delete line 17:
export type PlaybackState = 'playing' | 'paused';

// Add import at top
import type { PlaybackState, DisplayMode } from '@debrief/schemas';
export type { PlaybackState, DisplayMode };

// Widen PlaybackControlsProps to accept the three-value type
// (no change needed — the 'stopped' value is assignable to PlaybackState)
```

### 6c. Update `src/ActivityPanel/types.ts`

```typescript
// Add import
import type { DisplayMode, PlaybackState } from '@debrief/schemas';

// Replace inline literals
// Before:  | { type: 'temporal:displayMode'; payload: { mode: 'full' | 'trail' } }
// After:   | { type: 'temporal:displayMode'; payload: { mode: DisplayMode } }

// Before:  playbackState?: 'playing' | 'paused';
// After:   playbackState?: PlaybackState;

// Before:  displayMode?: 'full' | 'trail';
// After:   displayMode?: DisplayMode;
```

### 6d. Update `src/ActivityPanel/ActivityPanel.tsx`

```typescript
// Add import
import type { DisplayMode, PlaybackState } from '@debrief/schemas';

// Replace inline parameter types
// Before:  (mode: 'full' | 'trail') => {
// After:   (mode: DisplayMode) => {

// Before:  (state: 'playing' | 'paused') => {
// After:   (state: PlaybackState) => {
// Note: the if (state === 'playing') check continues to work — 'stopped' falls to else
```

### 6e. Update `src/MapView/PositionSymbolsLayer.tsx`

```typescript
// Add import
import type { DisplayMode } from '@debrief/schemas';

// Before:  displayMode?: 'full' | 'trail';
// After:   displayMode?: DisplayMode;
```

---

## Step 7: Run full verify

```bash
task verify
```

All three steps (lint + typecheck + tests) must pass. Watch for:
- Any remaining `'normal'` or `'snailTrail'` string literal references in source (not test fixture comments)
- TypeScript errors on `PlaybackState` / `DisplayMode` imports (check `@debrief/schemas` is in package `dependencies`)
- Schema adherence test failures on the new `display-mode-legacy-normal.json` invalid fixture (should fail validation — that's correct)

---

## Step 8: Write ADR

Append to `docs/project_notes/decisions.md`:

```markdown
## ADR-NNN: Promote DisplayMode and PlaybackState to LinkML (2026-04-21)

**Context**: Two enum-style types were defined in two TypeScript packages each, with divergent vocabularies.
`DisplayMode` used `'full'|'trail'` in shared/components and `'normal'|'snailTrail'` in session-state.
`PlaybackState` used `'playing'|'paused'` in components and `'stopped'|'playing'|'paused'` in session-state.

**Decision**: Promote both to `PlaybackStateEnum` and `DisplayModeEnum` in LinkML (session-state.yaml).
Canonical `DisplayMode` vocabulary is `full`/`trail` (components wins — clearer user-facing terms).
Canonical `PlaybackState` is the three-value superset: `stopped`, `playing`, `paused`.
TypeScript consumers get template-literal type aliases (`PlaybackState`, `DisplayMode`) via the
`generate.py` post-processor — same pattern as `PointShape` for `PointShapeEnum`.

**Deleted**: `type DisplayMode = 'full' | 'trail'` (shared/components/utils/types.ts),
`type PlaybackState = 'playing' | 'paused'` (shared/components/TimeController/types.ts),
`type DisplayMode = 'normal' | 'snailTrail'` (session-state/types/temporal.ts),
`type PlaybackState = 'stopped' | 'playing' | 'paused'` (session-state/types/temporal.ts).

**Spec**: specs/205-promote-enums-linkml/spec.md
```

---

## Step 9: Commit and push

```bash
git add -p   # review all changes
git commit -m "feat(205): promote DisplayMode and PlaybackState to LinkML

Rename DisplayModeEnum values normal→full, snailTrail→trail in session-state.yaml.
Inject PlaybackState and DisplayMode template-literal type aliases via generate.py
post-processor; narrow TemporalSlice fields from string to the derived types.
Delete four hand-typed enum definitions; migrate all consumers to @debrief/schemas.
Add schema golden fixtures; update session-state tests for new vocabulary."

git push -u origin 205-promote-enums-linkml
```
