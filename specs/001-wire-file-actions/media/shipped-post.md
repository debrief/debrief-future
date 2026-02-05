---
layout: future-post
title: "Shipped: File Actions Now Actually Work"
date: 2026-02-05
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, vscode-extension, file-operations]
excerpt: "The dropdown buttons do something now. Four file operations, wired end-to-end."
---

## What We Built

The Activity Panel has had a dropdown menu next to each associated file for weeks. Four actions: Open, Open With, Reveal in Explorer, Delete. Clean UI, sensible layout, totally inert. Click anything and nothing happened.

That changed this week. All four actions now work.

The implementation is pure plumbing. A `file:action` message type carries the action and file path from the React component, through the webview bridge, to the extension host where VS Code's APIs live. Four handler methods dispatch to the right operation.

Delete shows a confirmation dialog before removing anything. Not a custom React modal we had to build and style ourselves, but VS Code's native `showWarningMessage`. It looks right on every platform because it is the platform.

The web client case required some thought. Running on vscode.dev, you can't reveal files in Explorer (there's no local filesystem) and delete doesn't make sense either. Rather than graying out buttons or letting operations fail mysteriously, we detect the environment using `vscode.env.uiKind` and show an honest message: "This operation requires the desktop version of VS Code."

## Architecture

The message flow traces a complete vertical through the extension:

```
AssociatedFilesDropdown (React)
  -> LayersToolbar
    -> ActivityPanel
      -> vscode.postMessage({ type: 'file:action', payload })
        -> activityPanelView.ts (extension host)
          -> VS Code API (openTextDocument, revealFileInOS, etc.)
```

This pattern already existed for other webview interactions. We extended it with one message type and four handler methods. Nothing new to maintain, nothing surprising for the next person who reads the code.

## Error Handling

File operations fail in predictable ways: file moved, permissions wrong, network drive unavailable. Each gets a specific message:

| Scenario | Message |
|----------|---------|
| File not found | "File not found: {name}. It may have been moved or deleted." |
| Permission denied | "Cannot access file: {name}. Check file permissions." |
| Unknown error | "Failed to {action} file: {name}. {details}" |

The error messages appear as VS Code notifications in the corner. Users see them without leaving context.

## Lessons Learned

**Webview sandboxing is the whole ballgame.** The webview iframe has no filesystem access by design. Every user interaction that touches the outside world must serialize into a message, cross the boundary, and return a result. This sounds obvious after you've done it once, but it shapes everything about how you structure the code.

**Native dialogs are free UX.** VS Code's `showWarningMessage` with custom button labels (`['Delete', 'Cancel']`) gives us a confirmation dialog that matches the user's OS, respects their accessibility settings, and required zero styling work. The temptation to build custom UI is strong; resisting it paid off.

**Environment detection enables graceful degradation.** Checking `vscode.env.uiKind === UIKind.Web` early lets us choose a different code path instead of catching errors after the fact. The user gets a clear explanation instead of a stack trace.

## What's Next

The file actions complete a vertical slice through the Activity Panel. The pattern we established here applies directly to upcoming work on plot management actions. The message-passing infrastructure is proven; adding new operations is now just handler methods.

We still have an open question about whether deleting a file should also remove its STAC asset reference. For now, they're decoupled. The physical file goes away, but the metadata entry remains until the next catalog operation cleans it up. This might be the wrong choice for user expectations.

-> [See the code](https://github.com/debrief/debrief-future/pull/171)
-> [View the spec](https://github.com/debrief/debrief-future/blob/main/specs/001-wire-file-actions/spec.md)
