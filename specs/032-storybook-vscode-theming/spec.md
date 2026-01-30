# Spec 032: Document Storybook VS Code Theming Setup

**Status**: specified
**Backlog Item**: 032 (Documentation)
**Complexity**: Low (Haiku)

## Problem

When developing React components in Storybook that will appear in the VS Code extension, there is no documentation explaining how the theming system works. Developers (human and AI) need guidance on:

- How Storybook is configured to simulate VS Code themes
- How to use the design token system (`--debrief-*` CSS custom properties)
- How to create new components and stories with correct theming for both light and dark modes

Without this documentation, each session rediscovers the theming architecture by reading source files.

## Goal

Create a single documentation file at `docs/storybook-vscode-theming.md` that enables any developer to:

1. Understand the existing theming architecture
2. Create a new React component with correct VS Code theming
3. Write Storybook stories that render in all three theme variants (light, dark, VS Code)
4. Use the correct CSS custom properties for colors

Reference this document from `CLAUDE.md` so AI sessions can find it.

## Scope

### In Scope

- Document the token system: `--debrief-*` tokens in `shared/components/src/styles/tokens.css`
- Document the VS Code adapter: how `--vscode-*` variables map to `--debrief-*` tokens via `vsCodeAdapter.ts`
- Document the ThemeProvider: `ThemeContext.ts`, `ThemeProvider.tsx`, theme variants (`light`, `dark`, `vscode`, `system`)
- Document the Storybook preview decorator: toolbar theme switcher in `.storybook/preview.tsx`
- Document the context decorators: `ContextDecorator.tsx` with three context simulators
- Provide a step-by-step guide for adding a new themed component with a Storybook story
- List the most commonly used `--debrief-*` tokens with their purpose

### Out of Scope

- Panel dimensions and layout sizing
- VS Code keyboard shortcuts or interactive behaviors
- Automated theme switching based on VS Code settings
- Changes to the theming system itself (documentation only)

## Design

### Document Structure

The documentation file (`docs/storybook-vscode-theming.md`) should contain these sections:

#### 1. Overview

Brief explanation of the three-layer theming architecture:
1. **CSS tokens** (`tokens.css`) — base `--debrief-*` custom properties with light/dark/vscode variants
2. **VS Code adapter** (`vsCodeAdapter.ts`) — maps `--vscode-*` variables to `--debrief-*` tokens at runtime
3. **ThemeProvider** (`ThemeProvider.tsx`) — React context that applies the correct variant

#### 2. Token Reference

Table of commonly used tokens with their purpose and light/dark values:

| Token | Purpose | Light | Dark |
|-------|---------|-------|------|
| `--debrief-bg-primary` | Main background | `#ffffff` | `#1e1e1e` |
| `--debrief-text-primary` | Primary text | `#212529` | `#cccccc` |
| `--debrief-border-color` | Borders | `#dee2e6` | `#3c3c3c` |
| `--debrief-color-primary` | Brand/accent | `#0066cc` | `#0066cc` |

(Include all tokens from `tokens.css`)

#### 3. VS Code Variable Mapping

Table showing how `--vscode-*` variables map to `--debrief-*` tokens. Reference `vsCodeAdapter.ts` for the complete mapping.

#### 4. Storybook Theme Toolbar

Explain the toolbar theme selector (light/dark/VS Code) configured in `.storybook/preview.tsx` and how it applies the `ThemeProvider` decorator.

#### 5. Context Decorators

Document `ContextDecorator.tsx` and its three simulators:
- VS Code Dark
- Electron Light
- Electron Dark

Explain when to use `withContext()`, `withMultiContext`, and `ContextSimulator`.

#### 6. How-To: Add a New Themed Component

Step-by-step guide:

1. Create component using `--debrief-*` tokens (never raw colors)
2. Wrap with `ThemeProvider` if needed
3. Create `.stories.tsx` file
4. Add theme variants (light + dark stories)
5. Verify in Storybook toolbar with all three themes

#### 7. File Reference

Table listing all theming-related files and their purpose.

### CLAUDE.md Update

Add a line under the "Key Documents" section:

```markdown
- `docs/storybook-vscode-theming.md` — Storybook VS Code theming guide
```

## Acceptance Criteria

1. `docs/storybook-vscode-theming.md` exists and covers all sections above
2. `CLAUDE.md` references the theming doc under Key Documents
3. The token reference table is complete (matches `tokens.css`)
4. The VS Code mapping table is complete (matches `vsCodeAdapter.ts`)
5. The how-to section provides a concrete, followable example
6. A developer reading only this document can create a correctly themed component

## Implementation Notes

- Read all source files listed in the File Reference section to ensure accuracy
- Use actual token values from the codebase, not approximations
- Keep the document focused on color theming per the constraints in the idea doc
- This is a documentation-only task; no code changes beyond the CLAUDE.md reference

## Dependencies

None. All theming infrastructure already exists.

## Files to Create/Modify

| File | Action |
|------|--------|
| `docs/storybook-vscode-theming.md` | Create — main documentation |
| `CLAUDE.md` | Modify — add reference under Key Documents |
