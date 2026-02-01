# vscrui — Standard UI Component Library

All web-based UI components in the Debrief project **must** use [vscrui](https://github.com/estruyf/vscrui) as the standard React component library for VS Code webviews.

## Why vscrui

Microsoft's [VS Code Webview UI Toolkit](https://github.com/nicepkg/vscode-webview-ui-toolkit) was deprecated in January 2025. vscrui is a React-based replacement that provides components matching VS Code's native look and feel. Since the project already uses React 18+ for all frontends, vscrui integrates without introducing additional frameworks.

## Installation

```bash
npm install vscrui
```

**Peer dependency**: React 18+

For icon support, import the Codicon CSS in your application entry point:

```typescript
import 'vscrui/dist/codicon.css';
```

## Component Inventory

| Category | Components | Description |
|----------|-----------|-------------|
| **Form Elements** | `TextField`, `TextArea`, `Checkbox`, `Dropdown` | User input controls |
| **Display** | `Badge`, `Label`, `Tag`, `Divider`, `Loader` | Status indicators and visual separators |
| **Layout** | `Pane`, `Panels`, `Table` / `TableRow` / `TableCell` | Containers, tabs, and data tables |
| **Interactive** | `Button` (primary, secondary, icon variants) | Actions and triggers |
| **Icons** | `Icon` (Codicon-based, supports spin animation) | VS Code icon set |

## Usage Example

```tsx
import { Button, TextField, Pane } from 'vscrui';
import 'vscrui/dist/codicon.css';

function AnalysisPanel() {
  return (
    <Pane title="Analysis Settings" actions={[]}>
      <TextField
        label="Exercise name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button appearance="primary" onClick={handleRun}>
        Run Analysis
      </Button>
    </Pane>
  );
}
```

## Scope

vscrui applies to **all web-based rendering contexts** in the Debrief project:

- **VS Code extension webviews** — panels, sidebars, editor tabs
- **Electron Loader app** — file loading interface
- **Storybook stories** — component development and documentation

All these contexts render within a VS Code webview or webview-like environment, so vscrui's styling is appropriate throughout.

## Constraints

- **Offline bundling required**: Install vscrui via npm and bundle with your build tool (esbuild, webpack). Do not use CDN imports. All assets including Codicon fonts are included in the npm package.
- **React only**: vscrui is a React component library. All webview UIs in this project use React, so no exceptions are needed.

## When a Component Is Missing

If vscrui does not provide a component you need:

1. Check the [upstream repository](https://github.com/estruyf/vscrui) for recent additions
2. If the component genuinely doesn't exist, create a backlog item describing the gap before building a custom component
3. Custom components should follow vscrui's styling patterns (CSS custom properties from VS Code's theme)

## References

- **Upstream repository**: [github.com/estruyf/vscrui](https://github.com/estruyf/vscrui)
- **Storybook** (for local development): Run `npm run storybook` in the vscrui repo for interactive component docs
- **Related spec**: [001-shared-react-components](../../docs/ideas/) — establishes React as the frontend framework
