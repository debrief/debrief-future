# Quickstart: Consumer Migration Recipe

**Feature**: 205-displaymode-playbackstate-linkml
**Audience**: implementer migrating consumer TS files from hand-typed `DisplayMode` / `PlaybackState` declarations (and their translators) to the schema-rooted `@debrief/schemas` exports.

This is not a tutorial — it is the recipe that `tasks.md` will refer to.

---

## 0. Prerequisites

1. You are on branch `205-displaymode-playbackstate-linkml`.
2. Schema source + generator edit have landed (steps 1–2 of research.md §5) and artefacts have been regenerated:
   ```sh
   uv run python shared/schemas/scripts/generate.py all
   ```
3. `task verify` was green before you started migration. If not, halt and fix the pre-existing failure first.
4. The nine acceptance checks in `contracts/linkml-enums.md §6` all pass. If any check fails, the generator edit is wrong — fix there first, not in consumer code.

## 1. TypeScript consumer migration

The recipe has three shapes:

### 1A. Import-rename-only (most files)

The old forms:

```ts
import type { DisplayMode } from '../utils/types';
// or
import type { DisplayMode, PlaybackState } from '@debrief/components';
// or
import type { PlaybackState, DisplayMode } from '@debrief/session-state';
```

become:

```ts
import type { DisplayMode } from '@debrief/schemas';
// or
import type { DisplayMode, PlaybackState } from '@debrief/schemas';
// or
import type { PlaybackState, DisplayMode } from '@debrief/schemas';
```

No in-file reference changes are needed — existing string literals (`'full'`, `'trail'`, `'playing'`, `'paused'`, `'stopped'`) continue to work because `DisplayMode` / `PlaybackState` are template-literal types that accept those string literals.

### 1B. Structural edit (four files)

Four files carry the hand-typed **declarations** to delete. Apply each by hand:

**`shared/components/src/utils/types.ts`** — delete line 80, add to the re-exports block:

```diff
-export type DisplayMode = 'full' | 'trail';
+// DisplayMode moved to @debrief/schemas (Feature 205). Re-exported from the
+// shared/schemas barrel for package-level ergonomics.
+export type { DisplayMode } from '@debrief/schemas';
```

**`shared/components/src/TimeController/types.ts`** — delete lines 15–17, replace with two imports that preserve `TimeExtent`'s current home (review 5A correction — `TimeExtent` lives only in `../utils/types`, NOT in `@debrief/schemas`):

```diff
-import type { DisplayMode, TimeExtent } from '../utils/types';
-
-export type { DisplayMode };
+import type { DisplayMode, PlaybackState } from '@debrief/schemas';
+import type { TimeExtent } from '../utils/types';
+export type { DisplayMode, PlaybackState };
```

Delete line 17 (was `export type PlaybackState = 'playing' | 'paused';`).

**`services/session-state/src/types/temporal.ts`** — delete lines 105 and 110; replace with imports at the top of the file:

```diff
+import type { PlaybackState, DisplayMode } from '@debrief/schemas';
+export type { PlaybackState, DisplayMode };
+
 // ... existing code ...

-/**
- * Current state of time playback (FR-010).
- * Ephemeral - not persisted or tracked in undo history.
- */
-export type PlaybackState = 'stopped' | 'playing' | 'paused';
-
-/**
- * Track visualization display mode (FR-011).
- */
-export type DisplayMode = 'normal' | 'snailTrail';
```

Also flip the default in `DEFAULT_TEMPORAL_SLICE` (line 149):

```diff
 export const DEFAULT_TEMPORAL_SLICE: TemporalSlice = {
   currentTime: null,
   timeRange: null,
   timeFilter: null,
   stepSize: { value: 1, unit: 'minute' },
   playbackRate: 1.0,
   playbackState: 'stopped',
-  displayMode: 'normal',
+  displayMode: 'full',
 };
```

And remove the now-stale "discriminated union literals for type safety" divergence comment above `TemporalSlice` (lines 117–125 in the current file). The divergence is gone; the comment is actively misleading.

**`shared/components/src/ActivityPanel/types.ts`** — widen line 94:

```diff
-  playbackState?: 'playing' | 'paused';
+  playbackState?: PlaybackState;
```

Add the `PlaybackState` import at the top of the file from `@debrief/schemas` if not already imported.

### 1C. Translator deletion (three files)

The legacy translator sites pass session-state-vocabulary through one-off ternaries to/from component vocabulary. After the rename both sides speak the canonical vocabulary — the ternaries collapse to pass-through.

**`apps/vscode/src/views/activityPanelView.ts`** — four sites:

```diff
 // Line ~47-49 — retype the message shape
-interface TemporalDisplayModeMessage {
-  type: 'temporal:displayMode';
-  payload: { mode: 'full' | 'trail' };
-}
+interface TemporalDisplayModeMessage {
+  type: 'temporal:displayMode';
+  payload: { mode: DisplayMode };
+}

 // Line ~210
-            displayMode: state.displayMode === 'snailTrail' ? 'trail' : 'full',
+            displayMode: state.displayMode,

 // Line ~252
-        displayMode: temporal.displayMode === 'snailTrail' ? 'trail' : 'full',
+        displayMode: temporal.displayMode,

 // Line ~434
-                  displayMode: state.displayMode === 'snailTrail' ? 'trail' : 'full',
+                  displayMode: state.displayMode,

 // Line ~467
-          state.setDisplayMode(message.payload.mode === 'trail' ? 'snailTrail' : 'normal');
+          state.setDisplayMode(message.payload.mode);
```

Add `import type { DisplayMode } from '@debrief/schemas'` at the top if not already present.

**`apps/vscode/src/views/timeRangeView.ts`** — one site (line ~253):

```diff
-          state.setDisplayMode(message.mode === 'trail' ? 'snailTrail' : 'normal');
+          state.setDisplayMode(message.mode);
```

**`apps/vscode/src/webview/mapPanel.ts`** — three sites (lines ~688, 704, 873):

```diff
 // Line ~688
-        const webviewMode = initialState.displayMode === 'snailTrail' ? 'trail' : 'full';
+        const webviewMode = initialState.displayMode;

 // Line ~704
-        const webviewMode = temporal.displayMode === 'snailTrail' ? 'trail' : 'full';
+        const webviewMode = temporal.displayMode;

 // Line ~873
-          const webviewMode = state.displayMode === 'snailTrail' ? 'trail' : 'full';
+          const webviewMode = state.displayMode;
```

The local variable is kept (rather than inlining the rhs) so the `setDisplayMode` message still reads clearly — but it can be trivially inlined if the message-construction style prefers that.

**`apps/web-shell/src/App.tsx`** — delete lines 96–100 entirely:

```diff
-// Map between session-state DisplayMode ('normal'|'snailTrail') and
-// components DisplayMode ('full'|'trail') — the two enums diverged historically.
-const toComponentMode = (m: StoreDisplayMode): ComponentDisplayMode =>
-  m === 'snailTrail' ? 'trail' : 'full';
-const toStoreMode = (m: string): StoreDisplayMode =>
-  m === 'trail' ? 'snailTrail' : 'normal';
```

Delete the `StoreDisplayMode` and `ComponentDisplayMode` import aliases if they exist (unused once the helpers are gone). Update call sites that previously called `toComponentMode(x)` to use `x` directly, and `toStoreMode(x)` likewise.

### 1D.1. Extended IPC retypes (review 2A + 3A + 4A)

Beyond the single `TemporalDisplayModeMessage` retype in §1C, four more IPC / callback shapes need retyping. Apply each by hand; then delete the silent-narrowing ternary at `timeRangeView.ts:241`.

**`apps/vscode/src/views/timeRangeView.ts`** — retype two message shapes, two private callbacks, two public methods; delete one silent-narrowing translator:

```diff
 import type { DisplayMode, PlaybackState } from '@debrief/schemas';

-interface PlaybackStateChangeMessage {
-  type: 'playbackStateChange';
-  state: 'playing' | 'paused';
-}
+interface PlaybackStateChangeMessage {
+  type: 'playbackStateChange';
+  state: PlaybackState;
+}

-interface DisplayModeChangeMessage {
-  type: 'displayModeChange';
-  mode: 'full' | 'trail';
-}
+interface DisplayModeChangeMessage {
+  type: 'displayModeChange';
+  mode: DisplayMode;
+}

 // ... later in the class body ...

-  private _onPlaybackStateChangeCallback?: (state: 'playing' | 'paused') => void;
-  private _onDisplayModeChangeCallback?: (mode: 'full' | 'trail') => void;
+  private _onPlaybackStateChangeCallback?: (state: PlaybackState) => void;
+  private _onDisplayModeChangeCallback?: (mode: DisplayMode) => void;

 // ... in the message-handler switch ...

-        case 'playbackStateChange':
-          if (this._shouldPropagateToStore) {
-            state.setPlaybackState(message.state === 'playing' ? 'playing' : 'paused');
-          }
+        case 'playbackStateChange':
+          if (this._shouldPropagateToStore) {
+            state.setPlaybackState(message.state);
+          }

 // ... public methods near the bottom of the class ...

-  public onPlaybackStateChange(callback: (state: 'playing' | 'paused') => void): void {
+  public onPlaybackStateChange(callback: (state: PlaybackState) => void): void {
     this._onPlaybackStateChangeCallback = callback;
   }

-  public onDisplayModeChange(callback: (mode: 'full' | 'trail') => void): void {
+  public onDisplayModeChange(callback: (mode: DisplayMode) => void): void {
     this._onDisplayModeChangeCallback = callback;
   }
```

The deleted ternary at line 241 is the critical change — pre-deletion it silently collapsed `'stopped'` → `'paused'`. After `PlaybackStateChangeMessage.state: PlaybackState` lands, the TypeScript compiler allows the three-state pass-through directly.

**`apps/vscode/src/webview/messages.ts`** — retype the canonical host→webview setter contract at line 126 (review 4A):

```diff
+import type { DisplayMode } from '@debrief/schemas';

 export interface SetDisplayModeMessage {
   type: 'setDisplayMode';
-  displayMode: 'full' | 'trail';
+  displayMode: DisplayMode;
 }
```

This is the message consumed by `mapPanel.ts` (3 sites), `timeController.tsx` (webview setter), and `activityPanelView.ts` — every translator deletion from §1C depends on this retype landing first.

### 1D.2. Load-boundary validation (review 1A + D2; revised per R2-1A to match LoadResult return-pattern)

**`services/session-state/src/persistence/load.ts`** — add runtime validation and replace two `as never` casts. The validation MUST return via the existing `LoadResult` shape (`{ success: false, error: ... }`), NOT throw — matching the module's existing convention at lines 49, 56, 267.

Near the top of the file, next to the existing generated-schema imports, add:

```ts
import {
  DisplayModeEnum,
  PlaybackStateEnum,
  type DisplayMode,
  type PlaybackState,
} from '@debrief/schemas';

// Load-boundary membership check (Feature 205 / FR-023a — Article I.3).
// Returns a typed narrowing if the value is a permissible enum member,
// or null otherwise. The caller short-circuits `loadSessionState` with
// the canonical `LoadResult` shape when null is returned.
function validateEnumMember<T extends string>(
  value: unknown,
  permissible: readonly T[],
): T | null {
  return typeof value === 'string' && (permissible as readonly string[]).includes(value)
    ? (value as T)
    : null;
}
```

Replace the two `as never` casts at lines 117 and 123 with the new validation pattern. Because `loadSessionState` returns `Promise<LoadResult>`, the two new validation branches short-circuit with `return { success: false, error: ... }`:

```diff
   if (temporal.stepSize) {
-    store.getState().setStepSize(temporal.stepSize as never);
+    // Feature 205 / FR-023b: stepSize is a TimeStep object, not an enum;
+    // the `as never` was an inherited bypass. The Zustand setter accepts
+    // TimeStep directly once the temporal payload is typed at the boundary.
+    store.getState().setStepSize(temporal.stepSize as TimeStep);
   }
   if (typeof temporal.playbackRate === 'number') {
     store.getState().setPlaybackRate(temporal.playbackRate);
   }
   if (temporal.displayMode !== undefined) {
-    store.getState().setDisplayMode(temporal.displayMode as never);
+    const displayMode = validateEnumMember<DisplayMode>(
+      temporal.displayMode,
+      Object.values(DisplayModeEnum) as DisplayMode[],
+    );
+    if (displayMode === null) {
+      return {
+        success: false,
+        error:
+          `Invalid temporal.displayMode: ${JSON.stringify(temporal.displayMode)}. ` +
+          `Expected one of ${Object.values(DisplayModeEnum).join(', ')}.`,
+      };
+    }
+    store.getState().setDisplayMode(displayMode);
+  }
+  // New guard: validate playbackState if the payload carries one.
+  if (temporal.playbackState !== undefined) {
+    const playbackState = validateEnumMember<PlaybackState>(
+      temporal.playbackState,
+      Object.values(PlaybackStateEnum) as PlaybackState[],
+    );
+    if (playbackState === null) {
+      return {
+        success: false,
+        error:
+          `Invalid temporal.playbackState: ${JSON.stringify(temporal.playbackState)}. ` +
+          `Expected one of ${Object.values(PlaybackStateEnum).join(', ')}.`,
+      };
+    }
+    store.getState().setPlaybackState(playbackState);
   }
```

**Do not modify** the other `as` coercions in `load.ts` (lines 62, 64, 98, 103–113, 138, 140–141, 194, 229–232). They are parse-boundary narrowing for legacy-payload compatibility and are out of scope.

**Do not introduce a `SessionLoadError` class or a `throw` statement** — the module uses `LoadResult` return-shape error signalling (see line 15–22 for the interface; lines 49, 56, 267 for existing error returns). The new validation conforms to that convention (R2-1A).

### 1D. Storybook regression-guard variant + PlaybackControls test (review 10A)

**Storybook variant** — Add one new story to `shared/components/src/TimeController/TimeController.stories.tsx` that demonstrates `playbackState === 'stopped'`. Visually indistinguishable from the existing `'paused'` story by design; this is a rendering-regression guard per SC-006.

**New unit test** — Create `shared/components/src/TimeController/PlaybackControls.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PlaybackState } from '@debrief/schemas';
import { PlaybackControls } from './PlaybackControls';

describe('PlaybackControls — stopped ≡ paused rendering rule (Feature 205 / FR-023)', () => {
  const playCases: Array<{ state: PlaybackState; ariaLabel: string }> = [
    { state: 'stopped', ariaLabel: 'Play' },
    { state: 'paused', ariaLabel: 'Play' },
  ];

  it.each(playCases)(
    'renders play glyph with aria-label="$ariaLabel" when playbackState is "$state"',
    ({ state, ariaLabel }) => {
      const onToggle = vi.fn();
      render(<PlaybackControls playbackState={state} onToggle={onToggle} />);
      const btn = screen.getByTestId('play-pause');
      expect(btn).toHaveAttribute('aria-label', ariaLabel);
      fireEvent.click(btn);
      expect(onToggle).toHaveBeenCalledOnce();
    },
  );

  it('renders pause glyph with aria-label="Pause" when playbackState is "playing"', () => {
    const onToggle = vi.fn();
    render(<PlaybackControls playbackState="playing" onToggle={onToggle} />);
    const btn = screen.getByTestId('play-pause');
    expect(btn).toHaveAttribute('aria-label', 'Pause');
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
```

This pins FR-023 (`stopped ≡ paused` rendering rule) with an explicit assertion. The `'stopped'` and `'paused'` cases share their assertion set via `it.each` — if the rule is ever broken (e.g. someone adds an `if (state === 'stopped')` branch that diverges), one of these two cases fails loudly.

```tsx
export const StoppedPlayback: Story = {
  args: {
    // ... existing args from Paused story ...
    initialPlaybackState: 'stopped',
  },
  parameters: {
    docs: {
      description: {
        story:
          "Regression guard for Feature 205 FR-023 — `stopped` renders identically to `paused`. " +
          "If this story visually diverges from the Paused story, revisit the `stopped ≡ paused` rule.",
      },
    },
  },
};
```

## 2. Python consumer migration

**None.** The only Python consumers of these enums are the generated Pydantic model itself and any transitive Python code that reads `TemporalSlice` from a MCP payload — and those use the enum member names that did not change for `PlaybackStateEnum` and will automatically pick up the new `DisplayModeEnum` values once regeneration runs.

Verify with:

```sh
grep -rE "class (DisplayMode|PlaybackState)" services/ --include='*.py'
# expected: only the generated file (debrief_schemas/__init__.py)

grep -rE "'normal'|'snailTrail'" services/ --include='*.py'
# expected: zero matches (if non-zero, a Python consumer is reading legacy string values — migrate it in the same commit)
```

## 3. Test-side updates

Most test files change only the imported enum type. **Three specific assertion sites** carry literal-string values that need substitution (review 8A — the grep sweep found exactly these three; no others):

**`services/session-state/tests/unit/slices/temporal.test.ts:44`** —
```diff
-      expect(store.getState().displayMode).toBe('normal');
+      expect(store.getState().displayMode).toBe('full');
```

**`services/session-state/tests/unit/slices/temporal.test.ts:146`** —
```diff
-      expect(store.getState().displayMode).toBe('normal');
+      expect(store.getState().displayMode).toBe('full');
```

**`services/session-state/tests/unit/persistence.test.ts:207`** — update the fixture literal:
```diff
-        displayMode: 'normal',
+        displayMode: 'full',
```

The other two test files in the session-state unit suite (`dirty.test.ts`, `undo.test.ts`) use `DEFAULT_TEMPORAL_SLICE` indirectly and pick up the rename transparently; no literal substitution needed there (confirmed by grep). **`apps/web-shell/playwright/tests/time-controller.spec.ts`** and **`undo-redo-split.spec.ts`** — any `'snailTrail'` / `'normal'` assertion literals become `'trail'` / `'full'`.

### New persistence.test.ts cases (review 9A / FR-028)

Also in `services/session-state/tests/unit/persistence.test.ts`, add at least two new `describe`/`it` blocks exercising the load-boundary validation from §1D.2:

```ts
describe('loadSessionState — temporal enum validation (Feature 205 / FR-023a)', () => {
  it('returns LoadResult {success:false} for legacy displayMode "snailTrail"', async () => {
    const legacy = buildValidSession({ displayMode: 'snailTrail' as unknown as 'full' });
    const result = await loadSessionState(store, fileBuffer(legacy), 'test.json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid temporal.displayMode.*snailTrail/);
  });

  it('returns LoadResult {success:false} for legacy displayMode "normal"', async () => {
    const legacy = buildValidSession({ displayMode: 'normal' as unknown as 'full' });
    const result = await loadSessionState(store, fileBuffer(legacy), 'test.json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid temporal.displayMode.*normal/);
  });

  it('returns LoadResult {success:false} for typo playbackState "palying"', async () => {
    const payload = buildValidSession({ playbackState: 'palying' as unknown as 'playing' });
    const result = await loadSessionState(store, fileBuffer(payload), 'test.json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid temporal.playbackState.*palying/);
  });

  it('returns LoadResult {success:true} for every canonical permissible value', async () => {
    for (const playbackState of ['stopped', 'playing', 'paused'] as const) {
      for (const displayMode of ['full', 'trail'] as const) {
        const valid = buildValidSession({ playbackState, displayMode });
        const result = await loadSessionState(store, fileBuffer(valid), 'test.json');
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
      }
    }
  });
});
```

The negative cases assert on `result.success` + `result.error` string — **not `rejects.toThrow`** — because `loadSessionState` returns a resolved `LoadResult`, never throws (R2-3A; tied to R2-1A).

(`buildValidSession` / `fileBuffer` are whatever helpers the existing file uses to construct valid payloads — pattern-match on the existing test cases in the same file.)

### New pytest — regeneration idempotency (review 11B / FR-030)

Create `shared/schemas/tests/test_regen_idempotent.py`. The test MUST operate on pytest's `tmp_path` fixture — **never mutate the working-tree `shared/schemas/src/generated/`** (R2-4A: local `uv run pytest` must not clobber committed artefacts for developers with uncommitted schema changes).

```python
"""
Regeneration idempotency adherence test (Feature 205 / FR-030 / SC-014).

Running `generate.py all` twice in succession MUST produce byte-identical
output. Locks in the Phase 0 deterministic-regeneration assumption so a
future LinkML toolchain update cannot silently introduce ordering drift.

The test operates on pytest's tmp_path fixture — the working-tree
generated artefacts at `shared/schemas/src/generated/` are NEVER mutated
by this test (R2-4A).
"""

import hashlib
import shutil
import subprocess
import sys
from pathlib import Path

SCHEMAS_ROOT = Path(__file__).parent.parent


def _hash_tree(root: Path) -> dict[str, str]:
    hashes: dict[str, str] = {}
    for f in sorted(root.rglob("*")):
        if f.is_file() and not f.name.endswith(".pyc"):
            hashes[str(f.relative_to(root))] = hashlib.sha256(f.read_bytes()).hexdigest()
    return hashes


def test_generate_is_idempotent(tmp_path: Path) -> None:
    """Two consecutive `generate.py all` runs produce byte-identical output.

    Uses tmp_path for both the LinkML source and generator script, so the
    committed artefacts under `shared/schemas/src/generated/` are never
    touched by this test.
    """
    # Stage a minimal working copy of `shared/schemas/` under tmp_path.
    sandbox = tmp_path / "schemas"
    shutil.copytree(SCHEMAS_ROOT / "src" / "linkml", sandbox / "src" / "linkml")
    shutil.copytree(SCHEMAS_ROOT / "scripts", sandbox / "scripts")
    shutil.copytree(SCHEMAS_ROOT / "fixtures", sandbox / "fixtures", dirs_exist_ok=True)
    (sandbox / "src" / "generated").mkdir(parents=True, exist_ok=True)

    gen_script = sandbox / "scripts" / "generate.py"
    generated_dir = sandbox / "src" / "generated"

    # First run — populates generated/.
    subprocess.run(
        [sys.executable, str(gen_script), "all"],
        check=True,
        cwd=sandbox,
    )
    first = _hash_tree(generated_dir)

    # Second run — into the same sandbox; expected to be byte-identical.
    subprocess.run(
        [sys.executable, str(gen_script), "all"],
        check=True,
        cwd=sandbox,
    )
    second = _hash_tree(generated_dir)

    assert first == second, (
        "generate.py is not idempotent — second run produced different output:\n"
        + "\n".join(
            f"  {path}: {first.get(path, '<missing>')} -> {second.get(path, '<missing>')}"
            for path in sorted(set(first) | set(second))
            if first.get(path) != second.get(path)
        )
    )
```

Runs per-PR in CI at ~20–30 s cost (review 12A accepts). The `tmp_path` fixture sandbox adds ~1–2 s of copy overhead — negligible. If `generate.py` has additional input dependencies beyond `src/linkml/`, `scripts/`, and `fixtures/`, the `shutil.copytree` calls above are extended during implementation (the grep sweep at implementation time should catch any missed input path).

## 4. ADR entry

Append to `docs/project_notes/decisions.md`:

```markdown
## ADR-NN: Schema-Rooted DisplayMode and PlaybackState — 2026-04-21

*(Replace `NN` with the next available two-digit ADR number — currently ADR-022 assuming #204 took ADR-021.)*

**Context.** Two enum-style types were defined twice in TypeScript with drifted
vocabularies: `DisplayMode` as `'full' | 'trail'` (components) vs `'normal' |
'snailTrail'` (session-state); `PlaybackState` as `'playing' | 'paused'`
(components) vs `'stopped' | 'playing' | 'paused'` (session-state). Seven-plus
translation ternaries bridged the two vocabularies at host–webview and
session-state↔component boundaries, plus one disguised silent-narrowing
translator at `apps/vscode/src/views/timeRangeView.ts:241` that collapsed
`'stopped'` → `'paused'` in session-state. `persistence/load.ts` contained two
`as never` bypass casts (lines 117, 123) that silently accepted any persisted
value. LinkML already had enum definitions generating to Pydantic and
TypeScript — `PlaybackStateEnum` with three canonical values; `DisplayModeEnum`
with the legacy `normal|snailTrail` strings — but `gen-typescript` emitted
`TemporalSlice.playbackState` / `.displayMode` as `string`, defeating narrowing
at the read point. See spec in `specs/205-displaymode-playbackstate-linkml/spec.md`.

**Decision.**
1. Rename `DisplayModeEnum` permissible values from `normal|snailTrail` to
   `full|trail` (aligning LinkML with the visible UI button labels).
2. Keep `PlaybackStateEnum` as `stopped|playing|paused` (already canonical).
3. Extend `shared/schemas/scripts/generate.py` with a template-literal
   post-processor for both enums, matching the Feature 201 / FR-014 `PointShape`
   precedent; the post-processor also narrows `TemporalSlice.playbackState` /
   `.displayMode` from `string` to the derived template-literal types.
4. Delete four hand-typed declarations:
   - `shared/components/src/utils/types.ts:80` (`DisplayMode`)
   - `shared/components/src/TimeController/types.ts:17` (`PlaybackState`)
   - `services/session-state/src/types/temporal.ts:105` (`PlaybackState`)
   - `services/session-state/src/types/temporal.ts:110` (`DisplayMode`)
5. Delete all translator ternaries and helpers (8 sites across 4 files in
   `apps/vscode/` and `apps/web-shell/`); both sides now speak the canonical
   vocabulary. Delete the silent-narrowing PlaybackState translator at
   `apps/vscode/src/views/timeRangeView.ts:241` (Article I.3 closure).
6. Retype 5 IPC message shapes and 4 callback/method-type declarations across
   `activityPanelView.ts`, `timeRangeView.ts`, and `webview/messages.ts` using
   the schema-rooted `PlaybackState` / `DisplayMode` types.
7. Add runtime validation at `services/session-state/src/persistence/load.ts`
   that rejects legacy `'normal'` / `'snailTrail'` values (and any other
   out-of-spec value) with a typed error. Replace the two `as never` casts
   at lines 117 and 123 with typed setter calls (Article XV closure for
   these two sites; other `as`-style coercions in the same file remain
   out of scope).
8. Document the component-side rendering rule: `playbackState === 'stopped'`
   renders identically to `'paused'`. Concretely, the `PlaybackControls`
   component shows the play glyph with `aria-label="Play"`, has the button
   enabled so the user can resume, and the `useTimePlayback` animation tick
   stays inactive (the playhead does not advance). The `'paused'` and
   `'stopped'` UI states are visually indistinguishable — behaviour, icon,
   and aria-label all match. The ADR is the canonical home for this detail
   (LinkML description kept UI-agnostic per Article IV).
9. Adopt the LinkML-description cross-reference convention
   `See ADR-NN in docs/project_notes/decisions.md` for schema ↔ ADR links,
   validated at lint time by `scripts/check-adr-refs.sh`.
10. Add `scripts/check-no-hand-typed-temporal-enums.sh` (following the
    #204 / #214 `check-no-geojson-feature.sh` precedent) to prevent
    reintroduction of hand-typed `type DisplayMode` / `type PlaybackState`
    declarations and legacy-vocabulary translators.

**Consequences.**
- Single schema-rooted vocabulary end to end; no translation logic to maintain.
- `DEFAULT_TEMPORAL_SLICE.displayMode` changes from `'normal'` to `'full'` — no
  semantic change (both described "Standard track display" / "full track").
- Articles I (Defence-Grade Reliability — I.3 silent-failure closure), II
  (Schema Integrity), IV (Architectural Boundaries — schema no longer names
  UI elements), and XV (Strict Type Safety — removed the two `as never`
  bypasses) are all strengthened. Article VIII (Documentation) gains a
  machine-validated schema ↔ ADR cross-reference convention.
- No installed base affected (Article XIV pre-release freedom; verified no
  JSON fixtures carry the legacy values).
- CI adds a ~20–30 s regen-idempotency pytest that runs per-PR (review 12A
  accepts the cost; the guarantee is durable across future LinkML
  toolchain updates).
- Evidence in `specs/205-displaymode-playbackstate-linkml/evidence/` after PR.
```

## 4.1. Guard scripts (review D1 + D3)

Two new bash scripts ship with this feature, both wired into `task lint` via `Taskfile.yml` alongside the existing `check-no-geojson-feature.sh`.

**`scripts/check-no-hand-typed-temporal-enums.sh`** (review D1 / FR-031 / SC-013; R2-2A matches the emoji + header style of `scripts/check-no-geojson-feature.sh`):

```bash
#!/usr/bin/env bash
# Regression guard: prevent reintroduction of hand-typed DisplayMode /
# PlaybackState declarations and legacy-vocabulary ('normal'|'snailTrail')
# translation ternaries. Schema-rooted enums come from @debrief/schemas.
#
# Wired into task lint by spec 205-displaymode-playbackstate-linkml;
# mirrors the scripts/check-no-geojson-feature.sh precedent established
# by #204/#214.
#
# Usage: bash scripts/check-no-hand-typed-temporal-enums.sh
# Exit code 0 = clean, 1 = violations found

set -euo pipefail

# Hand-typed declarations anywhere outside the generated-artefacts tree.
DECL_VIOLATIONS=$(grep -rnE '^(export\s+)?type\s+(DisplayMode|PlaybackState)\b' \
  --include="*.ts" --include="*.tsx" \
  apps/ shared/ services/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  | grep -v "shared/schemas/src/generated/" \
  || true)

# Legacy-vocabulary translation ternaries (the 'normal'|'snailTrail' family).
TRANSLATOR_VIOLATIONS=$(grep -rnE "=== 'snailTrail'|=== 'normal' \\?|'trail' : 'normal'|'snailTrail' : 'normal'" \
  --include="*.ts" --include="*.tsx" \
  apps/ shared/ services/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  | grep -v "shared/schemas/src/generated/" \
  | grep -v "docs/" \
  || true)

if [ -n "$DECL_VIOLATIONS" ] || [ -n "$TRANSLATOR_VIOLATIONS" ]; then
  echo "❌ DisplayMode/PlaybackState regression guard failed!"
  echo ""
  echo "The following declarations or translators violate the schema-rooted"
  echo "enum contract established by Feature 205. Use \`DisplayMode\` /"
  echo "\`PlaybackState\` imported from \`@debrief/schemas\` (template-literal"
  echo "types derived from the generated \`DisplayModeEnum\` / \`PlaybackStateEnum\`)."
  echo ""
  if [ -n "$DECL_VIOLATIONS" ]; then
    echo "Hand-typed declarations:"
    echo "$DECL_VIOLATIONS"
    echo ""
  fi
  if [ -n "$TRANSLATOR_VIOLATIONS" ]; then
    echo "Legacy-vocabulary translators:"
    echo "$TRANSLATOR_VIOLATIONS"
  fi
  exit 1
fi

echo "✅ No hand-typed DisplayMode/PlaybackState or legacy translators found (regression guard passed)"
```

**`scripts/check-adr-refs.sh`** (review D3 / FR-032 / SC-016; R2-2A matches the same style):

```bash
#!/usr/bin/env bash
# Regression guard: every `See ADR-NN in docs/project_notes/decisions.md`
# reference in a LinkML description MUST resolve to a matching
# `## ADR-NN: ...` heading in decisions.md. Catches dangling ADR links
# before they reach review.
#
# Wired into task lint by spec 205-displaymode-playbackstate-linkml.
#
# Usage: bash scripts/check-adr-refs.sh
# Exit code 0 = clean, 1 = dangling references found

set -euo pipefail

DECISIONS_FILE="docs/project_notes/decisions.md"

# Extract unique ADR-NN references from LinkML YAMLs.
REFS=$(grep -rhoE 'ADR-[0-9]{2}' shared/schemas/src/linkml/ --include='*.yaml' \
  | sort -u \
  || true)

DANGLING=""
for ref in $REFS; do
  if ! grep -qE "^##[[:space:]]+${ref}:" "$DECISIONS_FILE"; then
    DANGLING="${DANGLING}${ref} "
  fi
done

if [ -n "$DANGLING" ]; then
  echo "❌ LinkML ADR-reference regression guard failed!"
  echo ""
  echo "The following ADR IDs are cited in LinkML descriptions under"
  echo "\`shared/schemas/src/linkml/\` but do not resolve to a \`## ADR-NN: ...\`"
  echo "heading in \`${DECISIONS_FILE}\`. Either add the missing ADR entry,"
  echo "fix the reference, or remove the citation from the schema."
  echo ""
  echo "Dangling references:"
  for ref in $DANGLING; do
    echo "  - ${ref}"
  done
  exit 1
fi

echo "✅ All LinkML ADR references resolve (regression guard passed)"
```

**Taskfile.yml wiring** — add both scripts to `task lint` alongside the existing `check-no-geojson-feature.sh` entry at line 112:

```diff
     - bash scripts/check-no-geojson-feature.sh
+    - bash scripts/check-no-hand-typed-temporal-enums.sh
+    - bash scripts/check-adr-refs.sh
```

Make both scripts executable (`chmod +x`) and commit them in step with the Taskfile.yml edit.

## 5. Verification checklist

Before opening the PR, confirm:

**Schema + generator contract (original 9 checks from `contracts/linkml-enums.md §6`)**
- [ ] All 9 original checks in `contracts/linkml-enums.md §6` pass.
- [ ] `task verify` is green (lint + typecheck + unit tests + Playwright).
- [ ] `grep -rnE '^(export\s+)?type\s+(DisplayMode|PlaybackState)\b' apps/ shared/ services/` → zero matches.
- [ ] `grep -rnE "=== 'snailTrail'|=== 'normal' |displayMode === 'snailTrail'" apps/ shared/` → zero matches outside generated artefacts, ADR text, or legacy-invalid fixtures.
- [ ] `grep -rE '"normal"|"snailTrail"' shared/schemas/src/generated/` → zero matches.
- [ ] `DisplayModeEnum.full` / `.trail` and `PlaybackStateEnum.stopped` / `.playing` / `.paused` are exported from `@debrief/schemas`.
- [ ] `PlaybackState` and `DisplayMode` template-literal types are exported from `@debrief/schemas`.
- [ ] `TemporalSlice.playbackState` / `.displayMode` are typed as `PlaybackState` / `DisplayMode` in the generated TS (not `string`, not the bare enum).
- [ ] New `Stopped`-state Storybook story renders without errors and visually matches the `Paused` story.
- [ ] ADR entry in `docs/project_notes/decisions.md` exists as `## ADR-NN: Schema-Rooted DisplayMode and PlaybackState — 2026-04-21` (NN = next available two-digit number) and links to this spec.
- [ ] `DEFAULT_TEMPORAL_SLICE.displayMode === 'full'`.

**Post-review additional checks (review 1A, 2A, 3A, 8A, 9A, 10A, 11B, D1, D2, D3)**
- [ ] All 6 post-review checks in `contracts/linkml-enums.md §6` (checks 10–17) pass.
- [ ] `grep -n "as never" services/session-state/src/persistence/load.ts` → zero matches (SC-012 / review D2).
- [ ] `grep -n "message.state === 'playing' ? 'playing' : 'paused'" apps/vscode/src/views/timeRangeView.ts` → zero matches (review 3A).
- [ ] `apps/vscode/src/views/timeRangeView.ts` types `PlaybackStateChangeMessage.state`, `DisplayModeChangeMessage.mode`, both private callback fields (lines 64–65), and both public method signatures (lines 322, 329) using `PlaybackState` / `DisplayMode` (review 2A).
- [ ] `apps/vscode/src/webview/messages.ts:126` types `SetDisplayModeMessage.displayMode` as `DisplayMode` (review 4A).
- [ ] `shared/components/src/TimeController/PlaybackControls.test.tsx` exists, contains 3 test cases (one per `PlaybackState` value), all pass (SC-015).
- [ ] `services/session-state/tests/unit/persistence.test.ts` contains at least 2 new cases asserting legacy-value rejection from `loadSessionState` (FR-028 / review 9A).
- [ ] `shared/schemas/tests/test_regen_idempotent.py` exists and passes — `generate.py all` run twice produces byte-identical output (SC-014 / review 11B).
- [ ] `scripts/check-no-hand-typed-temporal-enums.sh` exists, is executable, wired into `task lint`, exits 0 (SC-013 / review D1).
- [ ] `scripts/check-adr-refs.sh` exists, is executable, wired into `task lint`, exits 0 with the new ADR-NN reference from `session-state.yaml` resolving cleanly (SC-016 / review D3).
- [ ] `Taskfile.yml` line ~112 invokes all three guard scripts: `check-no-geojson-feature.sh`, `check-no-hand-typed-temporal-enums.sh`, `check-adr-refs.sh`.
- [ ] `services/session-state/tests/unit/slices/temporal.test.ts` lines 44 and 146 now assert `toBe('full')` (review 8A).
- [ ] `services/session-state/tests/unit/persistence.test.ts` line 207 fixture reads `displayMode: 'full'` (review 8A).

**Round-2 refinement checks (R2-1A, R2-2A, R2-3A, R2-4A)**
- [ ] `services/session-state/src/persistence/load.ts` uses the existing `LoadResult` return-pattern for enum-validation failures (`return { success: false, error: '...' }`) — **no `SessionLoadError` class is introduced**, no `throw` statement is added in the new validation branches (R2-1A).
- [ ] `grep -nE "SessionLoadError|throw new" services/session-state/src/persistence/load.ts` → zero matches at the sites added by this feature (the only acceptable matches are pre-existing ones, not the new validation code).
- [ ] `scripts/check-no-hand-typed-temporal-enums.sh` and `scripts/check-adr-refs.sh` both use the `✅`/`❌` output style matching `scripts/check-no-geojson-feature.sh` (R2-2A).
- [ ] The new `persistence.test.ts` negative cases assert on `result.success === false` + `result.error` matching a regex — NOT `rejects.toThrow(...)` (R2-3A).
- [ ] `shared/schemas/tests/test_regen_idempotent.py` uses pytest's `tmp_path` fixture and `shutil.copytree` to sandbox the regen run. Running the test locally MUST NOT modify any file under `shared/schemas/src/generated/` in the working tree (R2-4A). Verify with `git status shared/schemas/src/generated/` after a local `uv run pytest shared/schemas/tests/test_regen_idempotent.py` — expected: clean.

## 6. Rollback (if the PR must revert)

Because the rename ships atomically, rollback is a straight `git revert` of the merge commit. No schema version bump was issued, so the revert restores the drifted state without additional migration. The revert PR must also include a CHANGELOG note explaining why.

Anyone developing on a branch cut during the Feature-205 window must rebase over `main` post-revert and reintroduce translator ternaries. Because no LinkML schema version field was bumped, Pydantic validation will not warn on a revert — this is intentional (pre-v4.0.0 Article XIV flexibility). Post-v4.0.0 the same change would require a schema version bump per Article II.3.
