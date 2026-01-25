# Document Storybook VS Code theming setup

## Problem

When developing React components in Storybook that will appear in the VS Code extension, there's no documentation on how to make Storybook match the VS Code appearance. Developers (human and AI) need guidance on applying VS Code color themes to Storybook stories.

## Proposed Solution

Create documentation in `docs/` covering:
1. Current Storybook VS Code theming setup (what exists today)
2. Guidelines for applying VS Code CSS custom properties (dark/light mode)
3. How to add new components with proper theming

Reference this documentation from CLAUDE.md so AI sessions can follow it.

## Success Criteria

- Documentation exists at `docs/storybook-vscode-theming.md` (or similar)
- CLAUDE.md references this documentation
- A developer (human or AI) can follow the docs to create a new story with correct VS Code theming
- Both dark and light mode theming approaches are documented

## Constraints

- Focus on color themes only (CSS custom properties)
- Not full layout/dimension fidelity
- Not interactive VS Code behaviors

## Out of Scope

- Panel dimensions and sizing
- VS Code keyboard shortcuts or interactive behaviors
- Automated theme switching based on VS Code settings
