# Data Model: Storyboarding — Capture

**Feature**: 216-storyboarding-capture
**Date**: 2026-04-21

## Scope

This spec introduces **no new entities**. Full authoritative
definitions for `Storyboard`, `Scene`, and `Viewport` live in
[215's data-model.md](../215-storyboarding-schema/data-model.md) —
every sibling spec in the Storyboarding epic references that file.

The purpose of this document is instead to map **each
`SceneProperties` field** the capture flow populates to its **source
value in the VS Code extension** and to document the five small
supporting structures that cross the webview / extension /
thumbnail-service boundaries.

---

## 1. Field-source map — `SceneProperties`

When `capture` fires, the command handler computes each field in the
order below and passes them to #215's `createScene`. The CRUD module
owns canonicalisation (trim / dedupe / sort of
`visible_feature_ids`), SHA-256 hashing, and provenance append —
the handler never hand-rolls any of those.

| SceneProperty field | Source | Notes |
|---|---|---|
| `kind` | `"STORYBOARD_SCENE"` | Populated by #215 (inherited discriminator). Handler does not pass. |
| `id` | ULID generated inside #215 | Handler can pass `idOverride` for test determinism only. |
| `storyboard_id` | `activeStoryboard.properties.id` | Either the Storyboard created by the first-capture path, or the one returned by `getActiveStoryboardDefault(plot)`. |
| `title` | `formatDtg(timestamp)` | #215's DTG formatter; fallback to ISO-8601 string per #215 R8. Handler passes `undefined` to let #215 apply the default. |
| `description` | `""` | Empty on capture; #218 edit suite populates later. |
| `viewport.center` | `calculateViewportCenter(sessionState.spatial.viewport)` | `@debrief/utils` helper (shipped by #203) — centroid of the 4-corner polygon. |
| `viewport.zoom` | `sessionState.spatial.viewport.zoom` | Authoritative slot on `ViewportPolygon`, populated by `MapPanel` at `apps/vscode/src/webview/mapPanel.ts:770`. Read directly; no helper needed. |
| `viewport.bearing` | `0` | Reserved slot in v1; enforced by #215. |
| `timestamp` | `new Date(sessionState.temporal.currentTime).toISOString()` | Converts epoch-ms to ISO-8601 instant at command entry. Rejected with toast if `currentTime` is `null` or outside `temporal.timeRange`. |
| `time_range` | `null` | Reserved slot in v1; enforced by #215. |
| `visible_feature_ids` | `plot.features.filter(f => !hiddenIds.has(f.properties.id)).map(f => f.properties.id)` | Pre-canonical; #215 canonicalises (trim / dedupe / sort) before hashing. Any feature without a `properties.id` is skipped. |
| `feature_set_hash` | `computeFeatureSetHash(canonicalVisibleIds)` | Computed inside #215 (Web Crypto). Handler does not pass. |
| `thumbnail_asset_ref` | `"scene-thumbnail-{sceneId}"` asset key returned by `sceneThumbnailService.writeSceneThumbnail(...)` | Written **before** `createScene` returns so the Scene only ever exists on disk paired with a real PNG. |
| `transition_duration_ms` | `500` | Default per spec Assumptions. Handler passes `undefined` to use #215's default. |
| `tags` | `[]` | Inherited slot; unused by capture. |
| `provenance` | `[{ op: "create", agent: sessionManager.actor, ... }]` | Built by #215 from the `actor` + `now` values the handler supplies. |

**Ordering note**: the handler computes
`viewport → timestamp → visible_feature_ids → thumbnail_asset_ref`
in this fixed sequence (per FR-CAP-006). The thumbnail write happens
*after* `createScene` would conceptually run — but the actual order
of calls is: collect inputs → capture thumbnail → write PNG → pass
asset key to `createScene`. This guarantees SC-002: if the thumbnail
fails, no Scene is ever created, so the plot dirty state never
changes.

---

## 2. Field-source map — `StoryboardProperties` (first-capture only)

Only emitted on the **first** capture for a plot. Subsequent captures
skip this path entirely (FR-CAP-005).

| StoryboardProperty field | Source |
|---|---|
| `kind` | `"STORYBOARD"` (handled by #215) |
| `id` | ULID from #215 |
| `name` | Trimmed output of the `showInputBox` prompt (R4) |
| `description` | `""` |
| `schema_version` | `1` (handled by #215) |
| `tags` | `[]` |
| `provenance` | `[{ op: "create", agent: sessionManager.actor, ... }]` (handled by #215) |

---

## 3. `CaptureSceneInput` (internal command handler input)

The command handler's public entry is:

```ts
export async function captureScene(
  context: CaptureCommandContext,
): Promise<CaptureResult>;
```

where `CaptureCommandContext` is the frozen snapshot of host state
passed from the keybinding / toolbar button:

```ts
interface CaptureCommandContext {
  readonly mapPanel: MapPanel;             // live reference — features snapshot
                                           // (getCurrentFeatures()),
                                           // thumbnail request,
                                           // post-capture setFeatures()
  readonly sessionStore: SessionStoreApi;  // read-only snapshot source for
                                           // spatial/temporal/features slices
                                           // + markDirty at end of happy path
  readonly stacItemPath: string;           // absolute path for thumbnail write;
                                           // derived from mapPanel.getCurrentPlot().itemPath
                                           // + the active store root
  readonly actor: string;                  // cached os.userInfo().username
                                           // with "vscode-user" fallback
  readonly trigger:                        // for telemetry + logging only
    | { source: "keybinding" }
    | { source: "panelButton" }
    | { source: "programmatic" };
}

type CaptureResult =
  | { status: "captured"; scene: SceneFeature }
  | {
      status: "cancelled";
      reason: "name-prompt" | "duplicate-prompt" | "in-flight";
    }
  | {
      status: "rejected";
      reason:
        | "viewport-unavailable"
        | "currenttime-unavailable"
        | "currenttime-out-of-range"
        | "thumbnail-failed"
        | "duplicate-offset-limit-exceeded"
        | "unexpected";
      error?: Error;                        // attached on "unexpected"
    };
```

(Removed `map-not-focused` and `no-plot-open` — both are unreachable
under the compound `when: "debrief.mapFocused && debrief.plotOpen"`
guard on the keybinding and the panel-button menu contribution. A
single runtime assertion at command entry handles the
unreachable-invariant case; we don't codify unreachable states in
the return type.)

Every branch of the command's control flow terminates in exactly one
of these variants, and each variant maps to one of:

- A success toast + panel focus (`captured`).
- A silent return (`cancelled: name-prompt | duplicate-prompt`) —
  no toast, because the user made the decision.
- A status-bar hint (`cancelled: in-flight`).
- A non-modal error toast (`rejected: *`), with user-facing
  messages per spec.md §UI States.

This type is the basis for the unit-test matrix: one test case per
variant, asserting the right branch is reached and no side-effects
leak across rejected / cancelled branches.

---

## 4. `SceneRowViewModel` (panel ↔ webview boundary)

The minimal Storyboard panel's webview receives a serialisable
representation of each Scene. The extension converts `SceneFeature`
to:

```ts
interface SceneRowViewModel {
  readonly sceneId: string;                // ULID
  readonly title: string;                  // properties.title
  readonly timestampIso: string;           // properties.timestamp
  readonly dtgLabel: string;               // formatDtg(timestamp)
  readonly thumbnailHref: string;          // webview-safe URI resolved
                                           // via Webview.asWebviewUri
  readonly state:                          // pending when thumbnail still
    | { kind: "ok" }                       // being written (handler uses
    | { kind: "pending" };                 // this during the tiny window
                                           // between CRUD return and the
                                           // panel refresh)
}
```

The `thumbnailHref` is resolved against the STAC item directory URI
via `webviewView.webview.asWebviewUri(...)`. No raw filesystem paths
cross the webview boundary (Article X — path leaks are a security
surface, even locally).

Ordering: the view provider always sorts by `timestampIso` ascending
(mirroring #215's `listScenesOrdered`). The webview trusts the
ordering and does not re-sort.

---

## 5. `StoryboardPanelMessage` (webview → extension protocol)

Discriminated union for the minimal panel's back-channel:

```ts
export type StoryboardPanelMessage =
  | { type: "ready" }                              // webview mounted
  | { type: "capture-clicked" }                    // panel's "Capture" button
  | { type: "scene-row-clicked";
      sceneId: string; }                            // #217 will handle
                                                   // fly-to; #216 ignores
  | { type: "log";
      level: "debug" | "warn" | "error";
      message: string; };
```

Extension → webview direction (simpler — the panel is
presentational):

```ts
export type ExtensionMessage =
  | { type: "scenes";
      scenes: SceneRowViewModel[];
      activeStoryboardName: string | null; }
  | { type: "captureInFlight";
      inFlight: boolean; }                          // drives pending row
  | { type: "theme";
      theme: "light" | "dark" | "vscode"; };
```

`scene-row-clicked` is wired through to a no-op in #216 (the
extension logs it but takes no action). #217 will replace the no-op
with `flyTo` behaviour. Keeping the message shape stable across
siblings is explicit per R5.

---

## 6. No new schema files, no new LinkML types

Every field consumed by the capture flow already exists in the
generated `SceneProperties` / `StoryboardProperties` / `Viewport`
types shipped by #215. This spec **does not** touch
`shared/schemas/`.

The single borderline case is the `scene-thumbnail-{sceneId}` STAC
asset entry — but STAC asset shape is defined by the STAC
specification itself, not by LinkML, and every other kind of
plot-level asset (`thumbnail`, `thumbnail-sm`, `track-*`) is already
a free-form map of asset keys. No schema change needed.

---

## 7. Invariant mapping

Every spec requirement that constrains a Scene field is delegated to
#215's CRUD module. The capture handler's tests assert **delegation**
(the module throws, the handler propagates / resolves / toasts) —
not the invariant itself.

| Spec invariant | Enforced by |
|---|---|
| `feature_set_hash` matches canonicalised `visible_feature_ids` | #215 `createScene` (async Web Crypto) |
| `timestamp` unique within Storyboard | #215 `createScene` throws `DuplicateTimestampError` |
| `viewport.bearing === 0` | #215 `createScene` throws `ReservedSlotViolationError` — handler never passes non-zero |
| `time_range` is `null` | same as above |
| Storyboard `name` unique on plot | #215 `createStoryboard` throws `DuplicateStoryboardNameError` — but handler also pre-checks via `validateInput` so the throw is a belt-and-braces guard |
| `provenance` append-only | #215 internal |
| Plot FeatureCollection atomicity (no partial writes) | #215 `immer.produce` + handler order (thumbnail-before-CRUD) |

---

## 8. Adherence-test mapping

| Spec § | Success Criterion | Test file | Test name(s) |
|---|---|---|---|
| US1 AS1, FR-CAP-003 | SC-007 first-capture UX | `apps/vscode/src/commands/__tests__/captureScene.test.ts` | `first capture prompts for Storyboard name` |
| US1 AS1 | SC-005 round-trip | `tests/e2e/test-storyboard-capture.spec.ts` | `save-close-reopen restores Scene unchanged` |
| US1 AS2, FR-CAP-005 | SC-007 subsequent capture | same file | `subsequent capture appends to active Storyboard without prompting` |
| US1 AS3, FR-CAP-008 | SC-002 integrity on failure | command test file | `thumbnail failure produces no Scene and no dirty flag change` |
| US1 AS4, FR-CAP-010 | SC-003 no silent overwrites | command test file | `duplicate timestamp shows modal prompt`, `duplicate — Replace overwrites`, `duplicate — Offset retries at +1s`, `duplicate — Cancel abandons` |
| US1 AS5, FR-CAP-011 | — | command test file | `scene title defaults to DTG of timestamp` |
| Edge: shortcut outside Map Viewer | SC-006 scoped shortcut | `tests/e2e/test-storyboard-capture.spec.ts` | `shortcut does nothing when Log Panel is focused` |
| Edge: time-slider out of range | SC-004 guard | command test file | `out-of-range timestamp rejected before #174 invocation` |
| Edge: dismissed quick-pick | — | command test file | `dismissed name prompt aborts capture without dirtying plot` |
| Edge: duplicate Storyboard name | — | command test file | `duplicate Storyboard name blocks prompt confirm button` |
| Edge: capture-in-flight | — | command test file | `second shortcut press while in-flight is silently ignored` |
| SC-001 | capture latency | `tests/e2e/test-storyboard-capture.spec.ts` | `p50 shortcut → scene visible < 1500 ms` |
| SC-008 | offline | CI config | Playwright run in offline-mode network profile (already enforced for #174) |