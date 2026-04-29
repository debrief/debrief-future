# Contract — Panel ↔ Host Messages (235-storyboard-capture-ux)

**Feature**: 235-storyboard-capture-ux
**Date**: 2026-04-28
**Status**: Authoritative for the channel changes introduced by this spec.

## Why "messages" and not "REST endpoints"

The Storyboard panel is a **React component mounted in a webview** in
both hosts (VS Code via `WebviewPanel`, web-shell via standard React
DOM). It does not call services over HTTP. It exchanges **typed JSON
messages** with its host through a `postMessage` channel that has been
in place since #216:

- VS Code side: `apps/vscode/src/messages/storyboardEdit.ts` +
  `apps/vscode/src/types/storyboardPanelMessages.ts`
- Web-shell side: equivalent `postMessage`-style bridge inside
  `StoryboardPanelMount.tsx` (new in this spec) — no real
  `postMessage` boundary exists in the browser, but the *shape* of
  the channel is preserved so the panel component is host-agnostic.

The "API contracts" for this spec are therefore the **channel changes**
added on top of the existing message channel.

## Design pattern: state push + stateless action posts

The existing channel already has two complementary halves:

- **Inbound (host → panel) state push** via `scenes` and `snapshot`
  payloads. The reducer applies the full payload as a snapshot.
- **Outbound (panel → host) stateless action posts** like
  `editScene`, `deleteScene`, `setActiveStoryboard`. Fire-and-forget;
  the host responds (if it does) by re-pushing a fresh `scenes` /
  `snapshot`.

This spec **does not invent a new request/response idiom** with
correlation IDs. Instead, the host-driven prompts (first-capture
naming, duplicate-timestamp resolution) are encoded as **two new
optional fields on the existing `snapshot` / `scenes` payloads**, and
the analyst's resolution is a **stateless action post** the same way
every existing edit op is.

The host owns the lifecycle of these prompts (it knows when a capture
command is mid-flight). The panel renders whatever the host's last
push said, plus its own panel-local pending text in the naming row.
Stale messages from a panel reload are dropped by checking the
relevant slice's `visible` flag in the host's own state.

## Existing message kinds (recap, unchanged)

| Kind | Direction | Payload | Owner |
|------|-----------|---------|-------|
| `scenes` | host → panel | `SceneRowViewModel[]` + active storyboard info | #216 + #218 |
| `captureInFlight` | host → panel | `boolean` | #216 |
| `theme` | host → panel | theme key | platform |
| `snapshot` | host → panel | full storyboards + scenes view models | #218 + #230 |
| `editScene` | panel → host | `{ sceneId, patch }` | #218 + #230 |
| `deleteScene` | panel → host | `{ sceneId }` | #218 |
| `undoSceneDelete` | panel → host | `{ sceneId }` | #218 |
| `updateToCurrent` | panel → host | `{ sceneId }` | #218 |
| `duplicateScene` | panel → host | `{ sceneId, targetTimestamp }` | #218 |
| `copySceneToOtherStoryboard` | panel → host | `{ sceneId, targetStoryboardId }` | #218 |
| `refreshThumbnail` | panel → host | `{ sceneId }` | #218 |
| `createStoryboard` | panel → host | `{ name }` | #217 |
| `renameStoryboard` | panel → host | `{ storyboardId, name }` | #217 |
| `deleteStoryboard` | panel → host | `{ storyboardId }` | #217 |
| `setActiveStoryboard` | panel → host | `{ storyboardId }` | #217 |

## Channel changes (this spec)

### A — Two new optional fields on `snapshot` / `scenes` payloads (host → panel)

```ts
// added to SnapshotPayload AND ScenesPayload (both gain the same two fields)
interface NamingRowPushState {
  readonly visible: boolean;         // true when first-capture is awaiting a name
  readonly defaultName: string;      // pre-fill for the field
  readonly knownNames: readonly string[];  // existing storyboard names on this plot (for inline collision detection)
}

interface CollisionBannerPushState {
  readonly visible: boolean;          // true when capture/update raised DuplicateTimestampError
  readonly conflictingSceneId: string;       // ULID of the existing Scene
  readonly conflictingSceneTitle: string;
  readonly originalTimestamp: string;        // ISO-8601, the timestamp the capture started with
  readonly proposedTimestamp: string;        // ISO-8601, current proposal (= originalTimestamp + offsetCount * 1s)
  readonly offsetCount: number;              // 0 on first push; ≥1 after each Offset
  readonly offsetWouldExceedTimeRange: boolean;  // true → panel hides the Offset button per FR-CAP-017a
  readonly cause: 'capture' | 'update-to-current';
}

// extended payload shape:
interface SnapshotPayload {
  /* …existing fields… */
  readonly namingRow?: NamingRowPushState | null;
  readonly collisionBanner?: CollisionBannerPushState | null;
}
```

When the host has no first-capture or collision in flight, both
fields are `null` (or omitted, equivalent). Each push carries the
authoritative state — the panel never has to reconcile partial
updates.

### B — Five new stateless action kinds (panel → host)

| Kind | Payload | Sent when |
|------|---------|-----------|
| `naming-row-confirm` | `{ name: string }` | Analyst presses Enter or clicks Confirm in the naming row. `name` is trimmed, validated unique by the panel before sending; the host re-validates and ignores if stale. |
| `naming-row-cancel` | `{}` | Analyst presses Escape, clicks Cancel, or clicks outside the row. |
| `collision-replace` | `{ conflictingSceneId: string }` | Analyst clicks Replace in the collision banner. `conflictingSceneId` is included for the host to verify it matches its own `collisionBanner.conflictingSceneId`; if mismatched (panel-stale), the host drops the action. |
| `collision-offset` | `{}` | Analyst clicks Offset (+1 s). The panel does NOT compute or send the new timestamp — the host advances `offsetCount` from its own state and re-pushes a fresh `collisionBanner`. |
| `collision-cancel` | `{}` | Analyst clicks Cancel. |

All five are fire-and-forget. After the host processes any of them,
it pushes a fresh `snapshot` (or `scenes`) carrying the updated
`namingRow` / `collisionBanner` slice (likely `null` on confirm /
cancel, or the next `collisionBanner` shape after Offset).

### C — Stale-message defence (host-side)

For every panel→host action that targets the new flows the host
checks, in order:

1. The corresponding state slice exists in the host (`namingRow` or
   `collisionBanner` is non-null with `visible: true`).
2. For `collision-replace`: the `conflictingSceneId` in the action
   matches the host's current `collisionBanner.conflictingSceneId`.

Mismatches are dropped silently — they correspond to a panel that
has reloaded behind a stale view-model and is acting on it. The host
does NOT re-push to "correct" the panel; the next legitimate state
change pushes a fresh snapshot anyway.

This mirrors the existing reducer's "if `editFormOpenFor` references
a Scene no longer in the list, close it" pattern (see
`useStoryboardEditReducer.ts:178-184`).

## Lifecycle — first capture (no Storyboards)

```text
analyst        panel        captureCommand (host)        #215 CRUD       #174 pipeline
   │              │                  │                       │                 │
   │ press Capture│                  │                       │                 │
   ├─────────────►│                  │                       │                 │
   │              │ panel-button     │                       │                 │
   │              ├─────────────────►│                       │                 │
   │              │                  │ no Storyboards yet —  │                 │
   │              │                  │ set host.namingRow    │                 │
   │              │                  │ = { visible:true,     │                 │
   │              │                  │     defaultName:"…",  │                 │
   │              │                  │     knownNames:[] };  │                 │
   │              │                  │ push snapshot         │                 │
   │              │ ◄────────────────┤                       │                 │
   │              │                  │                       │                 │
   │              │ namingRow.visible│                       │                 │
   │              │ rendered         │                       │                 │
   │              │                  │                       │                 │
   │ types name,  │                  │                       │                 │
   │ presses Enter│                  │                       │                 │
   ├─────────────►│                  │                       │                 │
   │              │ naming-row-      │                       │                 │
   │              │ confirm          │                       │                 │
   │              │ { name: "…" }    │                       │                 │
   │              ├─────────────────►│                       │                 │
   │              │                  │ host validates, sets  │                 │
   │              │                  │ host.namingRow=null;  │                 │
   │              │                  │ proceeds with capture │                 │
   │              │                  │ createStoryboard      │                 │
   │              │                  ├──────────────────────►│                 │
   │              │                  │ ◄─────────────────────┤                 │
   │              │                  │ captureNode (live map)│                 │
   │              │                  ├──────────────────────────────────────────►│
   │              │                  │ ◄──────────────────────────────────────────┤
   │              │                  │ createScene           │                 │
   │              │                  ├──────────────────────►│                 │
   │              │                  │ ◄─────────────────────┤                 │
   │              │ snapshot (with   │                       │                 │
   │              │ new Scene row;   │                       │                 │
   │              │ namingRow:null)  │                       │                 │
   │              │ ◄────────────────┤                       │                 │
   │              │                  │                       │                 │
```

## Lifecycle — duplicate-timestamp Offset round-trip

```text
analyst        panel        captureCommand (host)        #215 CRUD
   │              │                  │                       │
   │ presses      │                  │                       │
   │ Capture at   │                  │                       │
   │ existing ts  │                  │                       │
   ├─────────────►├─────────────────►│ createScene           │
   │              │                  ├──────────────────────►│
   │              │                  │ ◄──── DTE ────────────┤
   │              │                  │ host.collisionBanner  │
   │              │                  │ = { visible:true,     │
   │              │                  │     conflictingSceneId│
   │              │                  │     originalTimestamp │
   │              │                  │     proposedTimestamp │
   │              │                  │     offsetCount: 0,   │
   │              │                  │     offsetWouldExceed:│
   │              │                  │       false, cause: …}│
   │              │ ◄────────────────┤                       │
   │              │ banner rendered  │                       │
   │              │                  │                       │
   │ clicks       │                  │                       │
   │ Offset       │                  │                       │
   ├─────────────►├──collision-offset►│                      │
   │              │                  │ host advances:        │
   │              │                  │ offsetCount → 1,      │
   │              │                  │ proposedTimestamp+= 1s│
   │              │                  │ host re-runs collision│
   │              │                  │ check (FR-CAP-017a)   │
   │              │                  ├──────────────────────►│
   │              │                  │ ◄── DTE again? ───────┤
   │              │                  │  push fresh snapshot  │
   │              │ ◄────────────────┤  with new banner state│
   │              │                  │                       │
   │              │  …repeat or      │                       │
   │              │  succeed/cancel  │                       │
```

## Test coverage required by this contract

| Test | Where | Asserts |
|------|-------|---------|
| Reducer dispatch on each new push field | `useStoryboardEditReducer.test.ts` | `namingRow` / `collisionBanner` snapshot slices land on state; null clears them |
| Component renders for `namingRow` / `collisionBanner` view-models | `StoryboardPanel.test.tsx` | DOM structure, focus order, keyboard handling (Enter/Escape) |
| Storybook story coverage | `StoryboardPanel.stories.tsx` | At minimum: `EmptyWithCaptureButton`, `FirstCaptureNamingRow`, `DuplicateTimestampBanner`, `DuplicateTimestampBannerOffsetCapped`, `DuplicateTimestampBannerExceedsTimeRange` (FR-CAP-017a) |
| Stateless-action stale defence | host-side unit tests on the capture command | Action posts with no matching host slice are dropped without side-effect |
| End-to-end capture in web-shell | `apps/web-shell/playwright/tests/storyboard-capture.spec.ts` | Full flow press→type→confirm→Scene visible; visibility invariants throughout |
| End-to-end collision resolution | same | Replace, Offset (×N including cap-reached AND time-range-exceeded), Cancel |
| End-to-end VS Code parity | Storybook E2E running against the panel webview render | Visual + behavioural identity to web-shell at the same viewport width |
| Legacy element absence | grep-step in CI / dedicated test that fails if `showInputBox` is called from `captureScene.ts`'s first-capture branch or if the legacy `Replace/Offset/Cancel` modal call survives | SC-009 |
