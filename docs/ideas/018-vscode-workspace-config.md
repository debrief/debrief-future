# Add VS Code multi-root workspace configuration

**ID**: 018
**Category**: Infrastructure
**Created**: 2026-01-20

## Problem

The Debrief monorepo contains multiple child projects (Python services, TypeScript packages, schemas) but VS Code treats it as a single flat folder. This causes:
- No workspace-aware IntelliSense separation between projects
- Extension recommendations not scoped per-project
- Developers must manually configure workspace settings

## Proposed Solution

Create a `.code-workspace` file that:
1. Defines the repo as a multi-root workspace with logical folder groupings
2. Includes recommended VS Code extensions for the project (Python, TypeScript, LinkML, etc.)
3. Provides documentation explaining how/when to modify the workspace file

## Success Criteria

- [ ] `.code-workspace` file exists at repo root
- [ ] All existing code folders are included (services/, shared/, apps/, demo/, docs/, tests/, specs/)
- [ ] Extension recommendations included for: Python, TypeScript, LinkML, Ruff, and other relevant tools
- [ ] Documentation explains when to update the file (e.g., adding new packages)
- [ ] Works offline (no external dependencies)

## Constraints

- Include only folders that currently exist (not planned-but-empty folders)
- Preserve existing `.vscode/settings.json` (Peacock colors)

## Out of Scope

- Per-folder custom settings (keep initial version simple)
- Launch configurations (can be added later)
- Debug configurations (can be added later)
