# VS Code Multi-Root Workspace

This repository includes a multi-root workspace configuration file (`debrief-future.code-workspace`) that provides organized folder views and extension recommendations.

## Opening the Workspace

1. Open VS Code
2. File > Open Workspace from File...
3. Select `debrief-future.code-workspace` from the repository root

Alternatively, double-click the `.code-workspace` file in your file explorer.

## Folder Structure

The workspace organizes the repository into logical groupings:

| Folder | Contents |
|--------|----------|
| Apps (Electron, VS Code) | Frontend applications |
| Demo Environment | Browser-accessible demo setup |
| Documentation | Project docs and guides |
| Services (Python) | Python backend services |
| Shared (Schemas, Components) | LinkML schemas and React components |
| Specifications | Feature specs and design docs |
| Tests | Integration and E2E tests |

## Recommended Extensions

The workspace recommends these extensions for development:

- **Python** (`ms-python.python`) - Python language support
- **Pylance** (`ms-python.vscode-pylance`) - Python type checking
- **Ruff** (`charliermarsh.ruff`) - Python linting and formatting
- **ESLint** (`dbaeumer.vscode-eslint`) - TypeScript/JavaScript linting
- **Prettier** (`esbenp.prettier-vscode`) - Code formatting
- **LinkML** (`linkml.linkml`) - Schema editing support

## When to Update the Workspace

Update `debrief-future.code-workspace` when:

- **Adding a new top-level directory** that developers need to access regularly
- **Removing a top-level directory** that no longer exists
- **Adding a new recommended extension** that benefits all developers

Do NOT update for:

- Subdirectory changes within existing folders
- Personal extension preferences (use your user settings instead)
- Workspace-level settings (use `.vscode/settings.json` for shared settings)

## How to Update

1. Open `debrief-future.code-workspace` in a text editor
2. To add a folder:
   ```json
   {
     "name": "Display Name",
     "path": "folder-name"
   }
   ```
3. To add an extension recommendation, add its identifier to `extensions.recommendations`
4. Commit the change with a descriptive message

## Notes

- The workspace file works offline - no network access required
- Existing `.vscode/settings.json` contains shared settings (Peacock colors) and is preserved
- Developers can still open the repository as a single folder if preferred
