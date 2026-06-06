# Quickstart: Relax Scene Timestamp Uniqueness

**Feature**: 259-relax-scene-time
**Audience**: Implementer picking up `/speckit.tasks` next

This is a short walking-tour of the change. Files referenced are exact paths; line numbers are from the pre-#259 tree captured during planning.

## 1. The one-line change

In `shared/schemas/src/linkml/storyboard.yaml`:

- Around line 171, the slot `timestamp` carries the comment "MUST be unique within a Storyboard". **Delete that wording.**
- Below the `timestamp` slot, add a new slot `creation_order: integer (required, minimum 0)` with a description identifying it as the secondary sort key.
- Bump `StoryboardProperties.schema_version` minimum from `1` to `2` in the slot description and in the validator.

Everything else flows from this.

## 2. Regenerate

```sh
# From repo root
uv run python -m linkml.generators.pydanticgen shared/schemas/src/linkml/storyboard.yaml \
  > shared/schemas/src/generated/python/debrief_schemas/storyboard.py

uv run python -m linkml.generators.typescriptgen shared/schemas/src/linkml/storyboard.yaml \
  > shared/schemas/src/generated/typescript/storyboard.ts
# Then the post-process step that merges into types.ts (see existing schema toolchain)
```

Confirm the generated `SceneProperties` TypeScript type contains `creation_order: number` (required).

## 3. Five throw-sites to remove in `crud.ts`

Search for `DuplicateTimestampError` in `shared/components/src/storyboard/crud.ts`. Pre-#259 there are six occurrences in five operations:

- `createScene` (~L548)
- `updateScene` (~L654)
- `duplicateScene` (~L808)
- `copySceneToOtherStoryboard` (~L947)
- `restoreScene` (~L1025)

For each: delete the call to `findConflictingSceneTimestamp(...)` and the `throw new DuplicateTimestampError(...)`. Replace any "we know this Scene has no timestamp conflict" assumption that follows with an explicit assignment of `creation_order`:

```ts
const creationOrder = nextCreationOrder(plot, storyboardId);
// ...build new Scene with creation_order: creationOrder
```

Add a private helper `nextCreationOrder(plot, storyboardId)` near the top of `crud.ts`:

```ts
function nextCreationOrder(plot: Plot, storyboardId: string): number {
  const scenes = scenesForStoryboard(plot, storyboardId);
  if (scenes.length === 0) return 0;
  return Math.max(...scenes.map(s => s.properties.creation_order)) + 1;
}
```

## 4. Add `reorderSceneInTiedGroup`

New exported operation in `crud.ts`. See `contracts/storyboard-crud.md` for the full contract. Pseudocode:

```ts
function reorderSceneInTiedGroup(plot, { sceneId, newPositionInGroup }) {
  const target = findScene(plot, sceneId);
  const tiedGroup = scenesForStoryboard(plot, target.storyboard_id)
    .filter(s => s.properties.timestamp === target.properties.timestamp)
    .sort((a, b) => a.properties.creation_order - b.properties.creation_order);

  if (newPositionInGroup < 0 || newPositionInGroup >= tiedGroup.length) {
    throw new CreationOrderOutOfRangeError(...);
  }

  const newOrdered = tiedGroup.filter(s => s.id !== sceneId);
  newOrdered.splice(newPositionInGroup, 0, target);

  const groupMin = Math.min(...tiedGroup.map(s => s.properties.creation_order));
  return rewriteScenes(plot, newOrdered.map((s, i) => ({
    id: s.id, creation_order: groupMin + i,
  })));
}
```

## 5. Extend `ordering.ts`

```ts
// shared/components/src/storyboard/ordering.ts
export function listScenesOrdered(plot, storyboardId) {
  return scenesForStoryboard(plot, storyboardId).slice().sort((a, b) => {
    const ts = a.properties.timestamp.localeCompare(b.properties.timestamp);
    if (ts !== 0) return ts;
    return a.properties.creation_order - b.properties.creation_order;
  });
}
```

Update the SC-I1 comment at the top of the file to the new wording (see `data-model.md`).

## 6. Wire the two VS Code call-sites onto `listScenesOrdered`

- `apps/vscode/src/views/storyboardPanelView.ts` around line 465 — replace inline sort with `listScenesOrdered(plot, storyboardId)`.
- `apps/vscode/src/services/storyboardPlayback.ts` around line 798 — same.

Both already import the storyboard module; this is a one-line replacement each.

## 7. Validator (`validate.ts`)

- **Remove** the FC-I3 check (key was `${storyboard_id}|${timestamp}`).
- **Add** FC-I4 — Map-based uniqueness check on `${storyboard_id}|${creation_order}` → `DuplicateCreationOrderError`.
- **Add** FC-I5 — for every Scene, assert `typeof creation_order === 'number'` → `MissingCreationOrderError(storyboard_id, scene_id)`.
- **Add** FC-V1 (entry) — for each Storyboard, assert `properties.schema_version >= 2` → `UnsupportedSchemaVersionError`.

Order matters: FC-V1 runs before FC-I5 (so a pre-#259 plot gets the version error first, not the missing-field error).

## 8. Errors module (`errors.ts`)

- Delete `DuplicateTimestampError`.
- Add `DuplicateCreationOrderError`, `CreationOrderOutOfRangeError`, `MissingCreationOrderError`, `UnsupportedSchemaVersionError`. All follow the existing pattern (one class per code, `code: string`, structured `details` payload, English-localised `message`).

## 9. Index (`index.ts`)

Update public exports per `contracts/storyboard-crud.md` → "Public surface".

## 10. Fixtures

- **Delete**: `shared/schemas/src/fixtures/invalid/storyboard-scene-duplicate-timestamp.json`.
- **Add valid**: `shared/schemas/src/fixtures/valid/storyboard-tied-timestamps.json` (3 Scenes at the same timestamp, creation_order 0,1,2; schema_version=2).
- **Add valid**: `shared/schemas/src/fixtures/valid/storyboard-mixed-tied.json` (5 Scenes: A@T,B@T,C@T+5,D@T+5,E@T+10 in capture order; creation_order 0..4).
- **Add invalid**: `shared/schemas/src/fixtures/invalid/storyboard-scene-duplicate-creation-order.json` (2 Scenes with creation_order=0).
- **Add invalid**: `shared/schemas/src/fixtures/invalid/storyboard-scene-missing-creation-order.json` (2 Scenes, no creation_order field; schema_version=1).

Confirm fixtures pass the appropriate adherence tests in `shared/schemas/`.

## 11. Run the gates

```sh
task verify
```

That runs lint + typecheck + test, the same three steps CI runs. Don't push unless green.

## 12. Playwright workflow (optional but recommended for evidence)

`apps/web-shell/playwright/tests/storyboard-tied-timestamps.spec.ts`: open the sample plot, freeze the time controller, capture three Scenes at the same timestamp varying only the viewport, assert the panel shows three rows in capture order. Write a screenshot of the final panel state into `specs/259-relax-scene-time/evidence/screenshots/tied-timestamps.png` for the PR.

```sh
cd apps/web-shell && node run-playwright.mjs storyboard-tied-timestamps
```

## 13. Commit shape (atomic, three commits)

1. `259: schema — drop timestamp uniqueness, add creation_order to SceneProperties`
   - storyboard.yaml + regenerated Python + regenerated TS + fixtures
2. `259: crud — remove DuplicateTimestamp throws, add creation_order assignment + reorder op`
   - crud.ts, ordering.ts, validate.ts, errors.ts, index.ts, and the two VS Code call-site updates
3. `259: tests — invert duplicate-timestamp tests; add reorder + missing-field + tied-group tests`
   - all `__tests__/` changes + Playwright spec + evidence screenshot

Each commit MUST pass `task verify` independently.
