# Data Model: Wire Up File Actions

**Feature**: 001-wire-file-actions
**Date**: 2026-02-05

## Overview

This feature extends existing data structures rather than introducing new entities. The primary additions are message types for webview-extension communication.

---

## Existing Entities (No Changes)

### AssociatedFile

Already defined in `shared/components/src/LayersToolbar/types.ts:83-94`.

```typescript
interface AssociatedFile {
  name: string;              // Display name (e.g., "track_001.rep")
  path: string;              // Path relative to STAC item
  category: 'source' | 'result';
  viewerType?: string;       // Hint: '2d', 'table', etc.
  format?: string;           // File format: 'json', 'geojson', 'csv', 'rep'
}
```

**Usage**: Passed from dropdown through callback chain.

### FileAction

Already defined in `shared/components/src/LayersToolbar/types.ts:203`.

```typescript
type FileAction = 'open' | 'openWith' | 'reveal' | 'delete';
```

**Usage**: Discriminates which operation to perform.

---

## New Message Types

### FileActionMessage

New message type to add to `ActivityPanelMessage` union.

```typescript
interface FileActionMessage {
  type: 'file:action';
  payload: {
    file: AssociatedFile;
    action: FileAction;
  };
}
```

**Location**: `apps/vscode/src/webview/types.ts`

**Integration**: Add to `ActivityPanelMessage` union:

```typescript
export type ActivityPanelMessage =
  | { type: 'temporal:seek'; payload: { time: number } }
  | { type: 'temporal:play'; payload: { rate: number } }
  | { type: 'temporal:pause' }
  | { type: 'temporal:displayMode'; payload: { mode: 'full' | 'trail' } }
  | { type: 'tool:run'; payload: { toolId: string } }
  | { type: 'layer:toggleVisibility'; payload: { featureIds: string[] } }
  | { type: 'layer:delete'; payload: { featureIds: string[] } }
  | { type: 'layer:select'; payload: { featureIds: string[] } }
  | { type: 'file:action'; payload: { file: AssociatedFile; action: FileAction } }; // NEW
```

---

## Extended Component Props

### ActivityPanelProps (Extension)

Current props at `shared/components/src/ActivityPanel/ActivityPanel.tsx:173-193` need extension:

```typescript
interface ActivityPanelProps {
  // ... existing props ...

  // NEW: File action handler
  onFileAction?: (file: AssociatedFile, action: FileAction) => void;
}
```

**Note**: `onFileAction` is optional to maintain backwards compatibility with existing consumers.

---

## State Transitions

### File Action Flow

```
┌─────────────┐     ┌────────────┐     ┌───────────────┐     ┌─────────────┐
│   User      │     │  Webview   │     │   Extension   │     │  Filesystem │
│   Click     │────▶│  Message   │────▶│   Handler     │────▶│  Operation  │
└─────────────┘     └────────────┘     └───────────────┘     └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │   VS Code   │
                                       │   UI/API    │
                                       └─────────────┘
```

### Delete Confirmation State Machine

```
                        ┌───────────────┐
                        │    Idle       │
                        └───────┬───────┘
                                │ click "Delete"
                                ▼
                        ┌───────────────┐
                        │  Confirming   │
                        └───────┬───────┘
                               /│\
                    confirm   / │ \ cancel
                             /  │  \
                            ▼   │   ▼
                     ┌─────────┐│┌─────────┐
                     │ Deleting│││  Idle   │
                     └────┬────┘│└─────────┘
                          │     │
                success   │     │ error
                          ▼     ▼
                   ┌─────────────────┐
                   │  Idle (updated) │
                   └─────────────────┘
```

---

## Validation Rules

### AssociatedFile Validation

| Field | Rule |
|-------|------|
| `name` | Non-empty string |
| `path` | Non-empty string, valid relative path |
| `category` | Must be 'source' or 'result' |
| `viewerType` | Optional; if present, one of: '2d', 'table', 'text' |
| `format` | Optional; if present, non-empty string |

### FileAction Validation

| Value | Valid |
|-------|-------|
| `'open'` | Yes |
| `'openWith'` | Yes |
| `'reveal'` | Yes |
| `'delete'` | Yes |
| Other | No - TypeScript prevents at compile time |

---

## Relationships

```
┌────────────────┐
│     Plot       │
│   (GeoJSON)    │
└───────┬────────┘
        │ 1:N
        ▼
┌────────────────┐
│ AssociatedFile │◀────── Actions applied here
│   (source)     │
└────────────────┘
        │ N:M (via provenance)
        ▼
┌────────────────┐
│ AssociatedFile │
│   (result)     │
└────────────────┘
```

**Note**: The relationship between source and result files is tracked via provenance (out of scope for this feature).

---

## Import Dependencies

New imports needed in `activityPanelView.ts`:

```typescript
import type { AssociatedFile, FileAction } from '@debrief/shared-components';
```

New imports needed in `ActivityPanel.tsx`:

```typescript
// Already imported via LayersToolbar types - no changes
```
