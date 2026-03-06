# Usage Example — Feature 113: Provenance Card Flip

## Overview

The flip-card interaction adds an inline editing surface to LogPanel entries. Hovering over any entry reveals a pencil icon (✎). Clicking it flips the card to expose the edit face where analysts can tune parameters, annotate rationale, disable entries, or delete them.

## Basic Flip Interaction

```tsx
import { LogPanel } from '@debrief/components';

function MyApp() {
  const handleSchemaRequest = (toolName: string) => {
    // Fetch parameter schema for the tool
    // The LogPanel caches responses internally
    fetchToolSchema(toolName).then((schema) => {
      // Schema response is handled via message passing in VS Code,
      // or directly via the schema cache in web-shell
    });
  };

  const handleDisableToggle = (activityId: string, disabled: boolean) => {
    // Update the entry's disabled state in the session store
    sessionState.logService.disableEntry(activityId, disabled);
  };

  const handleRationaleUpdate = (activityId: string, rationale: string) => {
    // Save the analyst's rationale note
    sessionState.logService.setRationale(activityId, rationale);
  };

  return (
    <LogPanel
      entries={entries}
      featureNames={featureNames}
      // ... standard props ...
      // Feature 113: Flip-card callbacks
      onSchemaRequest={handleSchemaRequest}
      onDisableToggle={handleDisableToggle}
      onRationaleUpdate={handleRationaleUpdate}
    />
  );
}
```

## Parameter Controls

The edit face renders schema-driven controls based on `ParameterSchemaEntry`:

| Parameter Type | Control | Example |
|---------------|---------|---------|
| Bounded number (min/max) | `SliderControl` | Range: 0–5000, step: 100 |
| NamedColor string | `ColorPickerControl` | Color swatch grid |
| Object/Array | `JsonEditorControl` | JSON textarea |
| Enum / choices | `<select>` dropdown | "metres", "yards", "nm" |
| Boolean | Checkbox toggle | Enable/disable flag |
| Unbounded number | Numeric `<input>` | Step: any |
| String (default) | Text `<input>` | Free text |

## Disable Cascade

When an entry is disabled, the `cascadeDisable()` utility computes downstream entries that depend on its outputs:

```tsx
import { cascadeDisable } from '@debrief/components';

// Given a timeline where act-001 generates track-alpha,
// and act-003 uses track-alpha:
const affected = cascadeDisable('act-001', timeline);
// Returns: ['act-003'] — entries that depend on act-001's outputs
```

## Storybook Stories

View the flip-card in isolation via Storybook:

- **Flip Card — Edit Icon**: `LogPanel/FlipCardDefault`
- **Flip Card — Disabled Entry**: `LogPanel/FlipCardDisabled`
- **Flip Card — With Rationale**: `LogPanel/FlipCardRationale`
- **CardFlip Primitive**: `LogPanel/CardFlipPrimitive`

## VS Code Extension Integration

The extension wires flip-card interactions via webview messages:

```
schema:request  → Extension fetches tool schema → schema:response
disable:toggle  → Extension calls logService.disableEntry()
rationale:update → Extension calls logService.setRationale()
```

The `logPanelView.ts` handler processes these messages and updates the session state accordingly.
