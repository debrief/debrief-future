# Phase 1 Data Model: Storyboard Time-Range Scenes

**Feature**: #263 | **Schema cluster**: `shared/schemas/src/linkml/storyboard.yaml`
**Status**: Skeleton — sections filled in order below.

## 1. New class: `TimeRange`

A sub-record nested inside `SceneProperties.time_range`. Captures the start and end instants of a time-range Scene.

```yaml
TimeRange:
  description: >-
    Time interval for a time-range Scene. The interval is closed on both ends.
    `start` MUST equal the owning Scene's `timestamp` (the Scene's ordering
    anchor — see #263 R8). `end` MUST be strictly greater than `start`.
  attributes:
    start:
      description: ISO-8601 instant; the slider position at the first capture action.
      range: datetime
      required: true
    end:
      description: ISO-8601 instant; the slider position at the second (confirm) capture action.
      range: datetime
      required: true
```

**Validation**:
- `end > start` (rejected with named error otherwise).

> **Note (review resolution 2A — 2026-05-19)**: the earlier-drafted `start == owning_scene.timestamp` sort-anchor invariant (R8) is **dropped**. Ordering instead reads `time_range?.start ?? timestamp` directly (see §5). This removes one cross-field rule, one error code, one invalid fixture, and the parallel hand-written Pydantic + TS validators that LinkML's expression grammar couldn't generate from a single source.

**TypeScript shape** (generated):

```ts
interface TimeRange {
  readonly start: string;  // ISO-8601 datetime
  readonly end: string;    // ISO-8601 datetime
}
```

`readonly` markers are added by `@debrief/schemas` for sub-records that participate in discriminated unions.

## 2. `SceneProperties` slot changes

Two slot edits inside the existing `SceneProperties` class.

### 2a. `time_range` — type change (placeholder → real)

**Before** (post-#215, current state):

```yaml
time_range:
  description: >-
    Reserved slot for v2 animated time-range Scenes. MUST be absent (null) in
    schema v1.
  range: string
  required: false
```

**After** (this feature):

```yaml
time_range:
  description: >-
    For instant Scenes (#215 default): MUST be absent. For time-range Scenes
    (#263): a TimeRange sub-record. When present, the Scene is the time-range
    flavour and `viewport_end` MUST also be present. See cross-field rule
    `scene-flavour-xor-rule` below.
  range: TimeRange
  required: false
```

### 2b. `viewport_end` — new slot

```yaml
viewport_end:
  description: >-
    Map viewport camera state at the end of a time-range Scene. MUST be present
    if and only if `time_range` is present. Reuses the same Viewport sub-record
    used by `viewport` (`bearing` MUST be 0; v1 reserved). For instant Scenes
    this slot MUST be absent.
  range: Viewport
  required: false
```

### 2c. `transition_duration_ms` — semantic widening (no schema edit)

The existing slot keeps its definition but its semantics widen:

- **Instant Scenes**: time for the viewport flyTo from prev to this Scene (unchanged from #217).
- **Time-range Scenes**: wall-clock duration of the synchronised viewport+slider scrub through this Scene (new — R4).

No YAML change.

### 2d. `timestamp` — semantic note (no schema edit, no new invariant)

The existing slot keeps its definition. For time-range Scenes `timestamp` retains its v1 meaning ("the Scene's anchor moment"); by convention CRUD may write `time_range.start` into `timestamp` at capture time, but the system does **not** depend on the two being equal — ordering reads `time_range?.start ?? timestamp` (see §5).

## 3. Cross-field rules (LinkML `rules` block)

Two rules added to the `SceneProperties` / `TimeRange` classes. Both are declared in LinkML so they propagate to the Pydantic validator and JSON Schema constraint.

> **Removed at review (2A, 2026-05-19)**: the originally-drafted third rule `scene-timestamp-equals-time-range-start-rule` is dropped. LinkML's expression grammar cannot express datetime equality across slots, so the rule would have landed as parallel hand-written Pydantic + TS validators — a soft Article II.1 violation. The ordering path now reads `time_range?.start ?? timestamp` (one line in `ordering.ts`), making the invariant unnecessary.

### Rule `scene-flavour-xor-rule`

> **`time_range` and `viewport_end` are present together, or both absent.**

```yaml
rules:
  - description: >-
      A Scene is either the instant flavour (both time_range and viewport_end
      absent) or the time-range flavour (both present). Any other combination
      is rejected.
    preconditions:
      any_of:
        - slot_conditions:
            time_range: { equals_expression: 'null' }
          slot_conditions:
            viewport_end: { equals_expression: 'null' }
        - slot_conditions:
            time_range: { value_presence: PRESENT }
          slot_conditions:
            viewport_end: { value_presence: PRESENT }
```

*(Exact LinkML rule syntax confirmed in Phase 3 against the LinkML version pinned in `shared/schemas/pyproject.toml`; the generator may force a slight grammar variation. The cross-check that matters: both the generated JSON Schema and the generated Pydantic validator MUST reject the two single-slot-present cases.)*

### Rule `scene-time-range-end-after-start-rule`

> **`time_range.end > time_range.start`.**

Implemented as a `TimeRange`-class-level rule with an `equals_expression` comparing the two slots, OR (fallback if LinkML expression grammar doesn't cover datetime compare) as a hand-written Pydantic `model_validator` AND a hand-written `flavourCheck` in `validate.ts`. Both implementations live; the Pydantic + TS pair are tested against the same golden invalid fixture.

### Error format

Both rules MUST produce a single error per rejected Scene with a stable error code and a message naming every involved slot:

| Code | Slots named in message | Trigger |
|------|------------------------|---------|
| `SceneFlavourXorViolation` | `properties.time_range`, `properties.viewport_end` | XOR violated |
| `SceneTimeRangeEndNotAfterStartError` | `properties.time_range.start`, `properties.time_range.end` | `end <= start` |

These codes are exported from `shared/components/src/storyboard/errors.ts` and consumed by both the validator and the capture command for user-facing messages.

## 4. Discriminated TypeScript types

LinkML does not generate TypeScript discriminated unions, so the discrimination is layered on top of the generated structural types in `shared/components/src/storyboard/types.ts`.

```ts
import type { SceneFeature, SceneProperties, TimeRange, Viewport } from '@debrief/schemas';

/** A Scene whose properties guarantee both flavour-coupling slots are absent. */
export interface InstantSceneFeature extends SceneFeature {
  readonly properties: InstantSceneProperties;
}

/** A Scene whose properties guarantee both flavour-coupling slots are present. */
export interface TimeRangeSceneFeature extends SceneFeature {
  readonly properties: TimeRangeSceneProperties;
}

/** Pick everything but the flavour-coupling slots from the generated SceneProperties, then re-add them with narrower types (Article IV.5 — Pick over re-listing). */
export interface InstantSceneProperties extends Omit<SceneProperties, 'time_range' | 'viewport_end'> {
  readonly time_range?: undefined;
  readonly viewport_end?: undefined;
}

export interface TimeRangeSceneProperties extends Omit<SceneProperties, 'time_range' | 'viewport_end'> {
  readonly time_range: TimeRange;
  readonly viewport_end: Viewport;
}

/** The ONLY narrowing site. All application code obtains the narrowed type via this predicate. */
export function isTimeRangeScene(scene: SceneFeature): scene is TimeRangeSceneFeature {
  return scene.properties.time_range !== undefined && scene.properties.time_range !== null;
}

/** Exhaustiveness guard — added per CLAUDE.md "Boundary types are derived, not rewritten". */
type _Exhaustive = Exclude<keyof SceneProperties, keyof InstantSceneProperties | keyof TimeRangeSceneProperties> extends never ? true : never;
```

**Rules**:
- Application code MUST NOT read `time_range` or `viewport_end` directly off a `SceneFeature` — it MUST narrow via `isTimeRangeScene` first.
- The XOR rule is enforced at the schema layer (§3); the predicate trusts that — it only checks `time_range !== undefined`. Mixed-flavour Scenes would have been rejected at validation, so the predicate never sees them.
- The `Omit<SceneProperties, ...>` pattern complies with constitution Article IV.5 (boundary types derived from the canonical source, not re-listed) and is checked by the `_Exhaustive` guard.

## 5. Sort invariants and ordering

The Storyboard sort key extends #259's `(timestamp, creation_order)` ascending by reading `time_range?.start ?? timestamp` as the first key component. Single-line change in `ordering.ts`. For instant Scenes (`time_range` absent) the sort behaviour is byte-equivalent to #259's. For time-range Scenes the sort uses `time_range.start` directly, without depending on any `timestamp == time_range.start` invariant.

> **Why this changed (review resolution 2A, 2026-05-19)**: the original design (R8) added a third LinkML cross-field rule asserting `timestamp == time_range.start` so `ordering.ts` could stay flavour-agnostic. LinkML's expression grammar can't express datetime equality across slots, so the rule would have landed as parallel Pydantic + TS hand-written validators — a soft Article II.1 violation for no value. Reading `time_range?.start ?? timestamp` in the sort key is one line and removes the rule, fixture, error code, and two validators.

**Test added**: `ordering.flavour.test.ts` asserts that a mixed-flavour Storyboard with the following capture order

| Scene | Flavour | `timestamp` | `time_range.end` |
|-------|---------|-------------|-------------------|
| A | instant | `T0` | — |
| B | time-range | `T0` | `T0 + 60s` |
| C | instant | `T0 + 30s` | — |
| D | time-range | `T0 + 30s` | `T0 + 90s` |

sorts as `A → B → C → D` under `(timestamp ASC, creation_order ASC)`. Notice that B's `time_range.end` (`T0 + 60s`) overlapping C's `timestamp` (`T0 + 30s`) is permitted — overlap detection is out of scope (FR-SCO-003).

## 6. State transitions (capture state machine)

The capture flow gains a small state machine, owned by `captureScene.ts` and mirrored in the StoryboardPanel UI. The state is **not** persisted to disk — it lives in the transport / panel store and resets to `idle` whenever the active document or active Storyboard changes.

```text
              ┌──────────────────────────────────────────┐
              │                                          │
              │             toggle off                   │
              ▼                                          │
        ┌──────────┐  toggle on  ┌─────────────┐   capture   ┌──────────────────┐  confirm   ┌──────────┐
        │   idle   │ ──────────▶ │ range-armed │ ──────────▶ │ range-in-progress │ ─────────▶ │  idle    │
        └──────────┘             └─────────────┘             └──────────────────┘            └──────────┘
              ▲                          ▲                            │
              │                          │                            │ cancel / toggle off
              │                          │                            │
              │                          └────────────────────────────┘
              │                              error (t_end <= t_start)
              └──────────────────────────────────────────────────────
                          (returns to range-in-progress with the error surfaced)
```

| State | Meaning | Allowed user actions | Allowed transitions |
|-------|---------|-----------------------|---------------------|
| `idle` | Normal capture flow (instant Scenes per #216). | Capture (writes instant Scene); toggle range affordance on. | `idle → range-armed` (toggle on); stays `idle` on instant capture. |
| `range-armed` | Range mode armed; no capture yet. The capture button is visually marked as range-mode. | Capture (starts a range — records `t_start`, `viewport_start`); toggle range off (returns to `idle`). | `range-armed → range-in-progress` (capture); `range-armed → idle` (toggle off). |
| `range-in-progress` | First capture taken; awaiting confirm. Banner shown with Cancel. The transport remembers `t_start`, `viewport_start`. | Scrub slider; reframe map; confirm (writes the Scene); cancel (returns to `idle`); toggle range off (treated as cancel + idle). | `range-in-progress → idle` on confirm (writes Scene) or cancel (no write); errors (e.g. `t_end <= t_start`) bounce back to `range-in-progress`. |

**Notes**:
- The state is transport-local; switching documents or active Storyboards resets to `idle` and discards any in-progress capture.
- Snapshots emitted by `storyboardPlayback`'s sibling `storyboardCapture` slice include the current state so the panel can render the banner + cancel control.
- If the active Storyboard's underlying data changes mid-flow (e.g. another writer adds a Scene), the in-progress range capture is **not** invalidated — the user's `t_start` + `viewport_start` survive, and the confirm action still produces a coherent Scene as long as the XOR + range-validity rules pass at write time.

## 7. Fixtures

See research.md §R9 for the retire/add list. Summarised:

| Path | Flavour | Validity | Purpose |
|------|---------|----------|---------|
| `valid/scene-instant.json` | instant | valid | regression anchor — instant flavour still valid |
| `valid/scene-time-range.json` | time-range | valid | canonical time-range Scene |
| `valid/storyboard-mixed-flavour.json` | both | valid | mixed-flavour Storyboard sorts correctly |
| `invalid/scene-time-range-missing-viewport-end.json` | time-range (broken) | invalid | XOR violation, code `SceneFlavourXorViolation` |
| `invalid/scene-instant-with-viewport-end.json` | instant (broken) | invalid | XOR violation, code `SceneFlavourXorViolation` |
| `invalid/scene-time-range-end-not-after-start.json` | time-range (broken) | invalid | range validity, code `SceneTimeRangeEndNotAfterStartError` |

> **Note (review resolution 2A — 2026-05-19)**: the originally-drafted `invalid/scene-time-range-timestamp-mismatch.json` is **not** added. The R8 invariant it enforced was dropped (see §3 and §5).

Round-trip and structural-comparison tests run against the schema artefacts (Pydantic, JSON Schema, TS) using these fixtures, per Article II.
