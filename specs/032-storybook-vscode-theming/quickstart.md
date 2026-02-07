# Quickstart: Document Storybook VS Code Theming Setup

## What to Build

A single markdown file at `docs/storybook-vscode-theming.md` and a one-line addition to `CLAUDE.md`.

## Steps

### 1. Read source files

Read these files to extract accurate values:

- `shared/components/src/styles/tokens.css` — all `--debrief-*` tokens and their light/dark/vscode values
- `shared/components/src/ThemeProvider/vsCodeAdapter.ts` — the `VS_CODE_VARIABLE_MAP` object (20 entries)
- `shared/components/src/ThemeProvider/ThemeContext.ts` — `ThemeVariant` type definition
- `shared/components/src/ThemeProvider/ThemeProvider.tsx` — provider implementation
- `shared/components/.storybook/preview.tsx` — toolbar config and decorator
- `shared/components/.storybook/decorators/ContextDecorator.tsx` — context simulators

### 2. Create `docs/storybook-vscode-theming.md`

Write 7 sections per the spec:

1. **Overview** — three-layer architecture diagram (tokens → adapter → provider)
2. **Token Reference** — table of ALL color tokens from `tokens.css` with light and dark values
3. **VS Code Variable Mapping** — table from `VS_CODE_VARIABLE_MAP` showing `--vscode-*` → `--debrief-*`
4. **Storybook Theme Toolbar** — how preview.tsx configures the toolbar selector
5. **Context Decorators** — `withContext()`, `withMultiContext`, `ContextSimulator` usage
6. **How-To: Add a New Themed Component** — step-by-step with code examples
7. **File Reference** — table of all theming files and their purpose

### 3. Update `CLAUDE.md`

Add under Key Documents:

```markdown
- `docs/storybook-vscode-theming.md` — Storybook VS Code theming guide
```

### 4. Verify

- Token table matches `tokens.css` (all color tokens present)
- Mapping table matches `vsCodeAdapter.ts` (all 20 entries)
- How-to example uses only `--debrief-*` tokens, never raw colors

## No Code Changes

This is documentation only. No TypeScript, CSS, or configuration files are modified.
