# TypeScript API Contract: Save Analysis Results to STAC

## StacService Extension

### saveResult()

Saves a ResultLayer to the STAC catalog via the Python MCP service.

```typescript
async saveResult(
  storePath: string,
  resultLayer: ResultLayer
): Promise<SaveResultResponse>
```

**Parameters:**
- `storePath`: Path to the STAC catalog
- `resultLayer`: The ResultLayer to persist

**Returns:**
```typescript
interface SaveResultResponse {
  success: boolean;
  itemPath?: string;       // Path to created item.json
  alreadyExists?: boolean; // True if result was already saved
  error?: string;          // Error message if failed
}
```

**Behaviour:**
1. Extracts provenance metadata from `resultLayer.provenance`
2. Calls `save_result` MCP tool with result metadata and features
3. On success, sets `resultLayer.savedItemId = resultLayer.executionId`
4. On `alreadyExists`, notifies user without error

## Commands

### debrief.saveResult

**Trigger**: Context menu on result layer in Layers panel
**When**: `viewItem == resultLayer`

```typescript
async function saveResultCommand(item: LayerTreeItem): Promise<void>
```

**Flow:**
1. Extract `ResultLayer` from tree item
2. Check if `savedItemId` is already set → notify "already saved"
3. Call `stacService.saveResult(storePath, resultLayer)`
4. On success → show notification, update tree item icon
5. On error → show error notification

## Extended Types

### ToolProvenance (extension)

```typescript
interface ToolProvenance {
  toolId: string;
  toolName: string;
  toolVersion: string;
  executionTime: string;
  sourceFeatureIds: string[];
  sourceItemIds: string[];     // NEW
  durationMs: number;
}
```

### ResultLayer (extension)

```typescript
interface ResultLayer {
  // ... existing fields
  savedItemId?: string;        // NEW: set when persisted
}
```

## package.json Contributions

```json
{
  "commands": [
    {
      "command": "debrief.saveResult",
      "title": "Save Result",
      "icon": "$(save)"
    }
  ],
  "menus": {
    "view/item/context": [
      {
        "command": "debrief.saveResult",
        "when": "view == debrief-layers && viewItem == resultLayer",
        "group": "inline"
      }
    ]
  }
}
```
