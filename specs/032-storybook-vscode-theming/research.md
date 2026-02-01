# Research: Storybook VS Code Theming Setup

**Date**: 2026-01-30

## Source File Inventory

All theming infrastructure already exists. No unknowns or NEEDS CLARIFICATION items.

### Decision: Documentation structure

- **Decision**: Single markdown file at `docs/storybook-vscode-theming.md` with 7 sections matching spec
- **Rationale**: One file is discoverable; sections mirror the three-layer architecture
- **Alternatives considered**: Multiple files (rejected — overhead for a reference doc), Storybook MDX page (rejected — not accessible to AI agents reading the repo)

### Decision: Token table completeness

- **Decision**: Include all color tokens from `tokens.css` (lines 6–119) plus dark overrides (lines 121–139) and VS Code overrides (lines 141–149)
- **Rationale**: Spec acceptance criteria #3 requires the table to match `tokens.css`
- **Alternatives considered**: Only "commonly used" tokens (rejected — incomplete reference leads to developers guessing)

### Decision: VS Code mapping table source

- **Decision**: Extract from `VS_CODE_VARIABLE_MAP` in `vsCodeAdapter.ts` (lines 7–32), which has 20 mappings
- **Rationale**: This is the runtime source of truth for variable bridging
- **Alternatives considered**: Also documenting `tokens.css` `[data-theme='vscode']` block (included as supplementary — it shows CSS-level fallbacks)

## Source Files Verified

| File | Lines | Content |
|------|-------|---------|
| `shared/components/src/styles/tokens.css` | 150 | All `--debrief-*` tokens: light root (6–119), dark overrides (121–139), VS Code overrides (141–149) |
| `shared/components/src/ThemeProvider/vsCodeAdapter.ts` | 183 | `VS_CODE_VARIABLE_MAP` (20 entries), detection/sync utilities |
| `shared/components/src/ThemeProvider/ThemeContext.ts` | — | `ThemeVariant` type: `'light' \| 'dark' \| 'vscode' \| 'system'` |
| `shared/components/src/ThemeProvider/ThemeProvider.tsx` | — | Provider component, system preference listener, `data-theme` attribute |
| `shared/components/.storybook/preview.tsx` | — | Theme toolbar (light/dark/VS Code), `withThemeProvider` decorator |
| `shared/components/.storybook/manager.ts` | — | Storybook UI branding (Debrief colors) |
| `shared/components/.storybook/decorators/ContextDecorator.tsx` | — | Three context simulators: VS Code Dark, Electron Light, Electron Dark |

## No Outstanding Unknowns

All source files exist and are readable. Documentation can be written directly from these sources.
