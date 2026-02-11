# Message Contracts: Log Panel (072)

**Date**: 2026-02-09

## Extension → Webview Messages

### timeline:update

Sent when the timeline data changes (new entries, session switch, initial load).

```
{
  type: "timeline:update",
  payload: {
    entries: TimelineEntry[],
    featureNames: Record<string, string>  // featureId → display name
  }
}
```

### session:change

Sent when the active session changes (different plot opened, plot closed).

```
{
  type: "session:change",
  payload: {
    hasActiveSession: boolean,
    plotName: string | null
  }
}
```

### selection:update

Sent when the map's feature selection changes (reflects back to webview for visual sync).

```
{
  type: "selection:update",
  payload: {
    featureIds: string[]
  }
}
```

### action:result

Sent in response to a webview action request (all return "not available" in Phase 2).

```
{
  type: "action:result",
  payload: {
    actionType: string,
    available: false,
    message: string  // e.g., "Parameter tuning is planned for Phase 6"
  }
}
```

## Webview → Extension Messages

### webviewReady

Sent when the webview React app has mounted and is ready to receive data.

```
{
  type: "webviewReady"
}
```

### entry:select

Sent when the analyst clicks a timeline entry. Extension should update map selection.

```
{
  type: "entry:select",
  payload: {
    activityId: string,
    featureIds: string[]  // combined used + generated IDs
  }
}
```

### entry:deselect

Sent when the analyst deselects the current entry. Extension should clear selection.

```
{
  type: "entry:deselect"
}
```

### action:invoke

Sent when the analyst clicks an action button. All return "not available" in Phase 2.

```
{
  type: "action:invoke",
  payload: {
    actionType: "tune" | "revertTo" | "revertThis" | "snapshot" | "rationale",
    activityId: string
  }
}
```

### mode:change

Sent when the analyst changes presentation mode. Extension persists to globalState.

```
{
  type: "mode:change",
  payload: {
    presentationMode: "compact" | "normal" | "detailed"
  }
}
```
