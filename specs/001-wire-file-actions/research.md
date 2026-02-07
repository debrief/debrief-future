# Research: Wire Up File Actions

**Feature**: 001-wire-file-actions
**Date**: 2026-02-05

## Summary

Research into wiring file action callbacks from `AssociatedFilesDropdown` through to VS Code extension host handlers. The UI components exist and function correctly; the gap is in the message passing infrastructure.

---

## R1: Existing Component Architecture

### Decision
Extend the existing component chain rather than creating new components.

### Rationale
- `AssociatedFilesDropdown` already correctly calls `onFileAction(file, action)` callback
- `LayersToolbar` already accepts optional `onFileAction` prop and delegates correctly
- Only `ActivityPanel` is missing the prop and message forwarding

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Direct VS Code API calls from webview | Security: webview has no access to Node.js APIs |
| New dedicated panel for file operations | Over-engineering; existing dropdown UI is complete |
| Event emitter pattern | Project uses message passing consistently |

### Source References
- `shared/components/src/LayersToolbar/AssociatedFilesDropdown.tsx:33` - calls `onFileAction`
- `shared/components/src/LayersToolbar/LayersToolbar.tsx:250` - delegates `onFileAction`
- `shared/components/src/ActivityPanel/ActivityPanel.tsx:332-339` - missing prop

---

## R2: Message Type Definition

### Decision
Add `file:action` message to `ActivityPanelMessage` union type following existing patterns.

### Rationale
- Consistent with existing message types (`layer:delete`, `tool:run`, etc.)
- Matches established naming convention (`namespace:action`)
- Type-safe payload with discriminated union

### Message Shape
```typescript
{ type: 'file:action'; payload: { file: AssociatedFile; action: FileAction } }
```

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Four separate message types (file:open, file:delete, etc.) | Unnecessary complexity; action is data, not type |
| Generic `action` message | Loses type safety, harder to maintain |

### Source References
- `apps/vscode/src/webview/types.ts:60-68` - existing message type union

---

## R3: VS Code API for File Operations

### Decision
Use standard VS Code extension APIs for each action.

### Implementation Map
| Action | VS Code API |
|--------|-------------|
| `open` | `vscode.workspace.openTextDocument()` + `vscode.window.showTextDocument()` |
| `openWith` | `vscode.commands.executeCommand('vscode.openWith', uri)` |
| `reveal` | `vscode.commands.executeCommand('revealFileInOS', uri)` |
| `delete` | `vscode.window.showWarningMessage()` (confirm) + `vscode.workspace.fs.delete(uri)` |

### Rationale
- Standard APIs ensure cross-platform compatibility
- `revealFileInOS` works on Windows, macOS, Linux
- Built-in deletion uses VS Code's file watcher integration

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Node.js `fs` module directly | Misses VS Code file watcher events, less portable |
| Shell commands via `child_process` | Platform-specific, security concerns |

### Source References
- VS Code API documentation: `workspace.openTextDocument`, `commands.executeCommand`
- `apps/vscode/src/views/activityPanelView.ts:327-330` - shows existing command execution pattern

---

## R4: Delete Confirmation Dialog

### Decision
Use VS Code's native `showWarningMessage` with modal option for delete confirmation.

### Rationale
- Native look and feel on all platforms
- User already familiar with VS Code confirmation patterns
- No custom React modal needed in webview

### Implementation
```typescript
const confirm = await vscode.window.showWarningMessage(
  `Delete "${file.name}"? This cannot be undone.`,
  { modal: true },
  'Delete'
);
if (confirm === 'Delete') {
  await vscode.workspace.fs.delete(uri);
}
```

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| React modal in webview | Requires round-trip messaging; native dialog is simpler |
| No confirmation | Violates FR-005; destructive action requires confirmation |

---

## R5: Web-Client Variant Handling

### Decision
Detect web environment and show informational modal for unsupported operations.

### Rationale
- Web VS Code (`vscode.dev`) cannot access local filesystem
- Operations like `reveal` and `delete` are inherently desktop-only
- Clear user feedback is better than silent failure

### Detection Method
```typescript
const isWebClient = vscode.env.uiKind === vscode.UIKind.Web;
```

### User Feedback
Show `vscode.window.showInformationMessage()` explaining the limitation:
> "This operation requires the desktop version of VS Code."

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Disable buttons in UI | Requires complex state propagation; operations still fail silently |
| Hide actions entirely | User confusion; features appear missing |
| Throw error | Poor UX; informational message is friendlier |

---

## R6: Error Handling Strategy

### Decision
Catch file operation errors and display user-friendly messages via VS Code notifications.

### Error Scenarios
| Error | User Message |
|-------|--------------|
| File not found | "File not found: {path}. It may have been moved or deleted." |
| Permission denied | "Cannot access file: {path}. Check file permissions." |
| Operation cancelled | (No message; user initiated cancellation) |

### Rationale
- Matches SC-004: Error messages for all failure scenarios
- Uses VS Code's notification system for consistency
- Keeps webview UI simple (no error state needed in React)

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Send error back to webview | Over-engineering; error display in extension is sufficient |
| Log only | Users would not see errors |

---

## R7: Associated Files Data Source

### Decision
Associated files are already available via STAC item assets; extension extracts and sends via `layers:update`.

### Rationale
- STAC items already contain source/result file references as assets
- `layers:update` message already updates layer state; can include associated files
- No new data fetching mechanism needed

### Data Flow
```
STAC Item (assets) → activityPanelView.ts → layers:update message → ActivityPanel → LayersToolbar → AssociatedFilesDropdown
```

### Note
This data flow may already be partially implemented. The current feature focuses on wiring the *action* callbacks, not the data population.

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| How are associated files populated? | Out of scope for this feature; focus is on actions |
| Should delete remove STAC asset reference? | No; only deletes the physical file. STAC cleanup is separate concern |
| Cross-platform reveal behavior? | VS Code handles via `revealFileInOS` command |

---

## Dependencies

| Dependency | Purpose | Version |
|------------|---------|---------|
| VS Code Extension API | File operations, dialogs | ^1.85.0 (bundled) |
| React | Webview UI (existing) | ^18.x |
| TypeScript | Type safety | ^5.x |

No new dependencies required.
