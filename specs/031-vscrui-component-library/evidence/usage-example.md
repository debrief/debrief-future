# Usage Example: Finding vscrui Documentation

## Scenario

A developer new to the Debrief project needs to build a settings panel in a VS Code extension webview.

## Walkthrough

### Step 1: Find the standard

The developer opens `ARCHITECTURE.md` and finds in the Technology Choices table:

> | Webview UI components | vscrui | React components matching VS Code native styling; replaces deprecated Webview UI Toolkit |

The link points to `shared/components/vscrui.md`.

### Step 2: Learn what's available

Opening `vscrui.md`, the developer finds:

- **Standard declaration**: "All web-based UI components...must use vscrui"
- **Installation**: `npm install vscrui` with React 18+ peer dependency
- **Component inventory**: TextField, Button, Pane, Panels, etc.
- **Usage example**: Working import + JSX snippet

### Step 3: Build the panel

Using the component inventory, the developer identifies the needed components:

```tsx
import { Pane, TextField, Dropdown, Button } from 'vscrui';
import 'vscrui/dist/codicon.css';

function SettingsPanel() {
  return (
    <Pane title="Settings">
      <TextField label="Workspace name" value={name} onChange={handleChange} />
      <Dropdown label="Theme" options={themes} value={theme} onChange={setTheme} />
      <Button appearance="primary" onClick={handleSave}>Save</Button>
    </Pane>
  );
}
```

### Step 4: Confirm constraints

The developer checks the Constraints section and confirms:
- Must bundle via npm (no CDN) — offline requirement
- React-only — matches existing tech stack

## Result

The developer went from "I need a settings panel" to a working component using only the vscrui.md documentation, without consulting external sources.
