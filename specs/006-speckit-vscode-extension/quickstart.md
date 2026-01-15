# Developer Quickstart: Debrief VS Code Extension

**Feature**: 006-speckit-vscode-extension
**Date**: 2026-01-15

---

## Prerequisites

- **Node.js** 18+ with npm/pnpm
- **VS Code** 1.85+ (for development and testing)
- **Python** 3.11+ (for debrief-calc integration)
- **Git** for version control

Optional:
- **debrief-calc** installed for tool execution testing
- **Sample STAC catalog** for testing data display

---

## Repository Setup

```bash
# Clone and navigate to extension directory
cd debrief-future
pnpm install          # Install root dependencies

# Navigate to extension workspace
cd apps/vscode
pnpm install          # Install extension dependencies
```

---

## Project Structure

```
apps/vscode/
├── src/
│   ├── extension.ts           # Entry point
│   ├── commands/              # Command implementations
│   ├── providers/             # VS Code API providers
│   ├── views/                 # Sidebar views
│   ├── webview/               # Map webview
│   │   ├── mapPanel.ts        # Panel controller
│   │   └── web/               # Webview content
│   ├── services/              # Service integrations
│   └── types/                 # TypeScript interfaces
├── package.json               # Extension manifest
├── tsconfig.json              # TypeScript config
├── esbuild.config.js          # Bundler config
└── tests/                     # Test suites
```

---

## Development Commands

```bash
# Compile extension (watch mode)
pnpm run watch

# Compile webview (separate build)
pnpm run watch:webview

# Run both in parallel
pnpm run dev

# Run tests
pnpm test

# Package extension (.vsix)
pnpm run package

# Lint
pnpm run lint
```

---

## Running in Development

### Option 1: F5 in VS Code

1. Open `apps/vscode` folder in VS Code
2. Press `F5` to launch Extension Development Host
3. Extension activates when a `stac://` URI is accessed

### Option 2: Command Line

```bash
# Build and launch manually
pnpm run compile
code --extensionDevelopmentPath=$(pwd)
```

---

## Key Development Tasks

### 1. Add a New Command

1. **Define in `package.json`**:
   ```json
   {
     "contributes": {
       "commands": [{
         "command": "debrief.myCommand",
         "title": "My Command",
         "category": "Debrief"
       }]
     }
   }
   ```

2. **Implement in `src/commands/`**:
   ```typescript
   // src/commands/myCommand.ts
   import * as vscode from 'vscode';

   export async function myCommand(): Promise<void> {
     vscode.window.showInformationMessage('Hello from Debrief!');
   }
   ```

3. **Register in `extension.ts`**:
   ```typescript
   context.subscriptions.push(
     vscode.commands.registerCommand('debrief.myCommand', myCommand)
   );
   ```

### 2. Modify Webview

1. Edit webview source in `src/webview/web/`
2. Run `pnpm run watch:webview` to rebuild
3. Reload webview with `Cmd+R` / `Ctrl+R` in Extension Development Host

### 3. Add Configuration Option

1. Add to `package.json` contributes.configuration
2. Access via `vscode.workspace.getConfiguration('debrief')`
3. Handle changes in `onDidChangeConfiguration`

### 4. Debug Extension Host

1. Set breakpoints in TypeScript source
2. Press F5 to launch with debugging
3. View debug console for extension logs

### 5. Debug Webview

1. Open Extension Development Host
2. `Cmd+Shift+P` → "Developer: Open Webview Developer Tools"
3. Use Chrome DevTools for webview debugging

---

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm run test:unit

# Run with coverage
pnpm run test:coverage

# Run specific test file
pnpm run test:unit -- --grep "SelectionManager"
```

### Integration Tests

```bash
# Run integration tests (requires VS Code)
pnpm run test:integration
```

### E2E Tests

```bash
# Run end-to-end tests
pnpm run test:e2e
```

---

## Working with Dependencies

### debrief-config (TypeScript)

```typescript
import { DebriefConfig, getStores } from '@debrief/config';

// Get registered STAC stores
const stores = await getStores();
```

### debrief-stac (via service wrapper)

```typescript
import { StacService } from './services/stacService';

const stac = new StacService();
const catalogs = await stac.listCatalogs(storePath);
const plot = await stac.getPlot(catalogPath, plotId);
```

### debrief-calc (via MCP)

```typescript
import { CalcService } from './services/calcService';

const calc = new CalcService();
await calc.connect();
const tools = await calc.listTools();
const result = await calc.executeTool('range-bearing', features);
```

---

## Common Patterns

### Sending Messages to Webview

```typescript
// In extension host
panel.webview.postMessage({
  type: 'loadPlot',
  plot: plotData
});
```

### Receiving Messages from Webview

```typescript
// In extension host
panel.webview.onDidReceiveMessage((message) => {
  switch (message.type) {
    case 'selectionChanged':
      handleSelection(message.selection);
      break;
  }
});
```

### Registering File System Provider

```typescript
const provider = new StacFileSystemProvider();
context.subscriptions.push(
  vscode.workspace.registerFileSystemProvider('stac', provider)
);
```

### Creating Tree View

```typescript
const treeProvider = new ToolsTreeProvider();
const treeView = vscode.window.createTreeView('debrief.tools', {
  treeDataProvider: treeProvider
});
```

---

## Troubleshooting

### Extension Not Activating

- Check `activationEvents` in `package.json`
- Verify activation event triggers (e.g., `onFileSystem:stac`)
- Check Output panel → "Debrief" for errors

### Webview Blank/White

- Check browser console (Open Webview Developer Tools)
- Verify CSP allows your scripts
- Check `asWebviewUri()` paths are correct

### MCP Connection Failed

- Verify Python is in PATH
- Check `debrief.calc.pythonPath` setting
- Run `python -m debrief_calc.mcp.server` manually to test

### Tests Not Running

- Ensure VS Code is not running (for e2e tests)
- Check Node version compatibility
- Run `pnpm install` to ensure dependencies

---

## Useful Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

---

## Next Steps

1. **Bootstrap project**: Run `/speckit.tasks` to generate implementation tasks
2. **Start with tracer bullet**: Implement minimal end-to-end flow first
3. **Test early**: Write tests alongside implementation
4. **Iterate**: Use spec requirements as acceptance criteria
