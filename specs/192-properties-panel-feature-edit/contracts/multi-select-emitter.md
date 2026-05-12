# Contract — Multi-feature selection emission

**Owners**:

- `shared/components/src/MapView/MapView.tsx` (extend `onSelect` event signature)
- `shared/components/src/FeatureList/FeatureList.tsx` (already implements the
  pattern — converge MapView onto it, do not duplicate)

**Consumers**: the click-handler glue layer (a thin function that maps
emitter events to `setSelection` actions on the `features` slice).

## Emitter event shape

```ts
interface SelectionClickEvent {
  /** Feature ID (or vertex path string) the user clicked. */
  target: string;
  /** Was the platform modifier (Ctrl on Win/Linux, Cmd on macOS) held? */
  modifier: boolean;
  /** Was Shift held? Reserved for future range-select; ignored in this feature. */
  shift: boolean;
}
```

The map and the Layers panel both emit this shape. Where today the map
emits `onSelect(featureId, event)`, after this change it emits
`onSelect({ target: featureId, modifier, shift })` — same prop name,
new payload shape.

## Click-handler glue rules

Given the **current** selection `{ featureIds, primary }` and an incoming
`{ target, modifier }`:

| Modifier | Current contains `target`? | Action |
|---|---|---|
| `false` (plain) | n/a | `setSelection({ featureIds: [target], primary: target })` |
| `true` (modifier) | no | `setSelection({ featureIds: [...featureIds, target], primary: target })` |
| `true` (modifier) | yes | `setSelection({ featureIds: featureIds.filter(id => id !== target), primary: <see below> })` |

When the modifier-toggle removes the currently-primary feature:

- If the resulting list is non-empty: `primary` becomes the *last
  remaining* feature in the list (deterministic, matches the analyst's
  most-recent action).
- If the resulting list is empty: `primary` becomes `null`.

## Modifier-key detection (R-010)

The platform modifier is chosen once at app boot:

```ts
const isMac = /Mac|iP(hone|od|ad)/.test(navigator.platform);
const modifierKey: 'metaKey' | 'ctrlKey' = isMac ? 'metaKey' : 'ctrlKey';
```

Both `MapView` and `FeatureList` MUST use the same detection. Tests
mock `navigator.platform` to exercise both branches in one run.

## Vertex-click emission (US-7)

Map layers for Polygon / LineString / MultiPoint / Point MUST emit
vertex paths when the user clicks a single vertex (geoman provides
vertex-level events for these shapes; the layer wraps them). The
emitter event's `target` field carries the structured path string
(`<featureId>/rings/0/vertices/3` etc.). Plain click on a vertex
collapses selection to that single sub-feature path; modifier+click on
a vertex is treated as plain click for v1 (multi-vertex selection is
out of scope and reduces to single-vertex behaviour).

## Playwright cases (`properties-multi-select.spec.ts`)

```text
multi-select emitter
  ├── two plain clicks on map → only the most recent is selected
  ├── plain → Ctrl/Cmd → both selected; primary = second
  ├── Ctrl/Cmd → Ctrl/Cmd on first (toggle) → only second remains; primary = second
  ├── plain on third → selection collapses to third
  ├── empty-canvas click → selection cleared
  ├── two Ctrl/Cmd-clicks in Layers panel → equivalent to map path
  └── modifier detection: navigator.platform mocked to macOS → Cmd works, Ctrl does not
```

## Vitest cases (glue function)

```text
applyClickToSelection
  ├── plain click, empty selection → single
  ├── plain click, existing selection → replaces
  ├── modifier click, empty → single
  ├── modifier click, adds to existing
  ├── modifier click, removes from existing
  ├── modifier removal leaves no features → primary null
  └── modifier removal: primary tracks the last remaining feature
```
