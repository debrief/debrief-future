# Quickstart: Wire Up File Actions

**Feature**: 001-wire-file-actions
**Date**: 2026-02-05

## Overview

This guide walks through implementing file action wiring from the `AssociatedFilesDropdown` UI component through to VS Code extension host handlers.

---

## Prerequisites

- VS Code extension development environment
- Familiarity with webview-extension messaging patterns
- Access to `@debrief/shared-components` package

---

## Implementation Steps

### Step 1: Extend ActivityPanelMessage Type

**File**: `apps/vscode/src/webview/types.ts`

Add the new message type to the union:

```typescript
import type { AssociatedFile, FileAction } from '@debrief/shared-components';

export type ActivityPanelMessage =
  | { type: 'temporal:seek'; payload: { time: number } }
  // ... existing types ...
  | { type: 'file:action'; payload: { file: AssociatedFile; action: FileAction } };
```

### Step 2: Add onFileAction Prop to ActivityPanel

**File**: `shared/components/src/ActivityPanel/ActivityPanel.tsx`

Update the props interface:

```typescript
interface ActivityPanelProps {
  // ... existing props ...
  onFileAction?: (file: AssociatedFile, action: FileAction) => void;
}
```

Wire through to LayersToolbar:

```typescript
<LayersToolbar
  // ... existing props ...
  onFileAction={onFileAction}
/>
```

### Step 3: Forward Message in Webview Entry

**File**: `apps/vscode/src/webview/web/activityPanel.tsx`

The `handleMessage` callback already posts all messages:

```typescript
const handleMessage = useCallback((message: ActivityPanelMessage) => {
  vscode.postMessage(message);
}, []);
```

Pass the file action as a message:

```typescript
const handleFileAction = useCallback((file: AssociatedFile, action: FileAction) => {
  vscode.postMessage({ type: 'file:action', payload: { file, action } });
}, []);

// In render:
<ActivityPanel
  // ... existing props ...
  onFileAction={handleFileAction}
/>
```

### Step 4: Handle Message in Extension Host

**File**: `apps/vscode/src/views/activityPanelView.ts`

Add handler in the message switch statement:

```typescript
case 'file:action': {
  const { file, action } = message.payload;
  await this.handleFileAction(file, action);
  break;
}
```

Implement the handler method:

```typescript
private async handleFileAction(file: AssociatedFile, action: FileAction): Promise<void> {
  // Resolve absolute path from STAC item root
  const uri = this.resolveFileUri(file.path);

  // Check web client limitation
  if (vscode.env.uiKind === vscode.UIKind.Web && ['reveal', 'delete'].includes(action)) {
    vscode.window.showInformationMessage(
      'This operation requires the desktop version of VS Code.'
    );
    return;
  }

  try {
    switch (action) {
      case 'open':
        await this.openFile(uri);
        break;
      case 'openWith':
        await this.openFileWith(uri);
        break;
      case 'reveal':
        await this.revealFile(uri);
        break;
      case 'delete':
        await this.deleteFile(uri, file.name);
        break;
    }
  } catch (error) {
    this.showFileError(action, file.name, error);
  }
}
```

### Step 5: Implement File Operations

**File**: `apps/vscode/src/views/activityPanelView.ts`

```typescript
private async openFile(uri: vscode.Uri): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc);
}

private async openFileWith(uri: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand('vscode.openWith', uri);
}

private async revealFile(uri: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand('revealFileInOS', uri);
}

private async deleteFile(uri: vscode.Uri, fileName: string): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    `Delete "${fileName}"? This cannot be undone.`,
    { modal: true },
    'Delete'
  );

  if (confirm === 'Delete') {
    await vscode.workspace.fs.delete(uri);
    // TODO: Notify webview to update UI (remove file from list)
  }
}

private showFileError(action: string, fileName: string, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unknown error';

  if (message.includes('ENOENT') || message.includes('FileNotFound')) {
    vscode.window.showErrorMessage(
      `File not found: ${fileName}. It may have been moved or deleted.`
    );
  } else if (message.includes('EACCES') || message.includes('Permission')) {
    vscode.window.showErrorMessage(
      `Cannot access file: ${fileName}. Check file permissions.`
    );
  } else {
    vscode.window.showErrorMessage(
      `Failed to ${action} file: ${fileName}. ${message}`
    );
  }
}
```

---

## Testing Guide

### Unit Tests

**Location**: `apps/vscode/src/views/__tests__/activityPanelView.test.ts`

Test cases:
1. `file:action` message with `open` action calls `openTextDocument`
2. `file:action` message with `reveal` action calls `revealFileInOS` command
3. `file:action` message with `delete` action shows confirmation dialog
4. Delete confirmation cancelled does not delete file
5. Delete confirmation accepted deletes file
6. Web client shows info message for `reveal` action
7. File not found error shows user-friendly message

### Integration Tests

**Location**: `apps/vscode/src/test/integration/fileActions.test.ts`

Test cases:
1. Click "Open" on associated file opens editor tab
2. Click "Reveal in Explorer" opens system file browser
3. Click "Delete" shows confirmation, confirm deletes file, file removed from UI
4. Click "Delete" shows confirmation, cancel leaves file intact

### Manual Testing Checklist

- [ ] Open a source file via dropdown
- [ ] Open a result file via dropdown
- [ ] Open already-open file focuses existing tab
- [ ] Reveal file in system explorer
- [ ] Delete file with confirmation
- [ ] Cancel delete keeps file
- [ ] Error shown for missing file
- [ ] Web client shows limitation message

---

## Troubleshooting

### File path resolution issues

Ensure `resolveFileUri()` correctly combines STAC item root with relative file path:

```typescript
private resolveFileUri(relativePath: string): vscode.Uri {
  // Assuming this.stacItemUri points to the item.json
  const itemDir = vscode.Uri.joinPath(this.stacItemUri, '..');
  return vscode.Uri.joinPath(itemDir, relativePath);
}
```

### Message not received in extension

Check that:
1. Message type matches exactly (`'file:action'`)
2. `vscode.postMessage` is being called (add console.log)
3. Message handler switch statement includes the case

### Delete not updating UI

After successful deletion, send a message back to webview to refresh the file list, or rely on file watcher to trigger update.

---

## Related Documentation

- [VS Code Extension API - Workspace](https://code.visualstudio.com/api/references/vscode-api#workspace)
- [VS Code Extension API - Window](https://code.visualstudio.com/api/references/vscode-api#window)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
