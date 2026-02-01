# Usage Example: Unified Activity Panel (#047)

## Opening the Panel

1. Click the Debrief icon in the VS Code activity bar
2. The unified Activity panel opens with three collapsible sections:
   - **Time Controller** — playback controls, scrubber, speed selector
   - **Tools** — context-sensitive analysis tools based on selection
   - **Layers** — feature list with toolbar (delete, visibility, run, filter)

## Collapsing Sections

Click any section header to collapse/expand it. Collapse state persists when the panel is closed and reopened within the same VS Code session.

## Using Sub-Components Independently

All sub-components can be imported from `@debrief/components` without VS Code dependencies:

```tsx
import { TimeController, ToolsPanel, LayersToolbar, FeatureList } from '@debrief/components';

// Use in any React context (Storybook, Electron, Jupyter)
<TimeController timeExtent={[start, end]} onTimeChange={handleTime} />
<ToolsPanel tools={toolList} onRunTool={handleRun} />
```

## Error Isolation

If any section encounters a runtime error, only that section shows an error message. The other sections continue to function normally.
