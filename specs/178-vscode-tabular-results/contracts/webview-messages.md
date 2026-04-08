# Contract: Results Panel Webview ⇄ Extension Host Messages

**Feature**: 178-vscode-tabular-results
**Surface**: `apps/vscode/src/webview/messages.ts` (new types added) — TypeScript discriminated unions, validated via existing `messages.test.ts` patterns.

This is **not a REST API** — it is the message-passing contract between the new Results panel webview and the extension host. All messages are JSON-serialisable. Field names use camelCase to match the rest of `messages.ts`.

---

## Extension → Webview

### `results:setTabs`
**When**: After any change to the in-memory tab list (add, remove, mark saved, mark error).
**Purpose**: Stateless replay of the full tab list. Webview replaces its local state.

```ts
{
  type: 'results:setTabs',
  payload: {
    tabs: ChartTabData[],         // shape from shared/components PanelContext
    activeTabId: string | null,
  }
}
```

### `results:setVisibility`
**When**: First result of session arrives (FR-004) or all tabs closed.
**Purpose**: Show/hide the panel area view container.

```ts
{
  type: 'results:setVisibility',
  payload: { visible: boolean }
}
```

### `results:setLoading`
**When**: Tool execution starts and a tab is created in pending state.
**Purpose**: Render loading spinner on the indicated tab.

```ts
{
  type: 'results:setLoading',
  payload: { tabId: string, isLoading: boolean }
}
```

---

## Webview → Extension

### `results:webviewReady`
**When**: Webview React app finishes mounting.
**Purpose**: Tells the host to flush any pending `results:setTabs` payloads (mirrors the existing `webviewReady` pattern in `activityPanelView.ts:374`).

```ts
{ type: 'results:webviewReady' }
```

### `results:save`
**When**: User clicks Save on a tab (FR-008).
**Purpose**: Trigger the host-side CSV-build → write → STAC-register → recordFileSaved sequence.

```ts
{
  type: 'results:save',
  payload: { tabId: string }
}
```

**Host response**: A subsequent `results:setTabs` reflecting the new `isSaved: true` state, OR an `results:setTabs` with `errorMessage` set if the save failed (FR-011).

### `results:saveAs`
**When**: User confirms the Save As inline form (FR-010).

```ts
{
  type: 'results:saveAs',
  payload: {
    tabId: string,
    baseName: string,         // already trimmed by webview; host re-sanitises
    tag?: string,
  }
}
```

**Host response**: Same as `results:save`.

### `results:retry`
**When**: User clicks Retry on an error tab (FR-020).

```ts
{
  type: 'results:retry',
  payload: { tabId: string }
}
```

**Host response**: Tab transitions through `results:setLoading` → either `results:setTabs` with new envelope or `results:setTabs` with new error.

### `results:closeTab`
**When**: User clicks the × on a tab (FR-006).

```ts
{
  type: 'results:closeTab',
  payload: { tabId: string }
}
```

**Host response**: `results:setTabs` reflecting the removal. If the closed tab was unsaved, the host marks the orphan `ToolRunEvent` for cleanup (deferred to plot close per FR-021 — closing a tab does NOT immediately delete provenance, since the user may simply have decided not to keep that view).

---

## Validation strategy

- All messages are validated by the existing `messages.test.ts` discriminated-union pattern.
- The host SHOULD log and ignore unknown message types (forward-compatibility).
- Round-trip tests verify each message shape serialises through `JSON.stringify` cleanly.

## Error handling

- `results:save` failures (write error, STAC registration error) MUST result in:
  1. Deletion of the partially-written file (FR-011), and
  2. A `results:setTabs` payload setting that tab's `errorMessage`.
- `results:retry` failures behave identically to a fresh failed run — no provenance recorded (FR-019).

---

## Cross-reference: Activity panel side-channel

The existing `ActivityPanelViewProvider` continues to receive saved-result file notifications via the **existing in-process** `addResultFile(name, filePath)` method (called by `ResultsPanelService` after a successful save). No new message types are added to the activity panel webview protocol — `ActivityPanelViewProvider._sendLayersUpdate` already pushes `resultFiles` and the `resultsChanged` flag, satisfying FR-013 and FR-014.
