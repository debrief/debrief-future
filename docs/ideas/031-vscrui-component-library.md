# Document vscrui as standard component library for VS Code webviews

## Problem

The VS Code extension and related apps (Electron Loader, Storybook) will include web-based UI components rendered in VS Code webviews. Without a documented standard, developers may use inconsistent UI approaches that don't match VS Code's native look and feel.

## Proposed Solution

Document in the shared component library spec (`shared/components/`) that all web-based components should use [vscrui](https://github.com/estruyf/vscrui) — a React component library designed specifically for VS Code webviews.

**vscrui provides:**
- React components matching VS Code's native UI styling
- Form elements: TextField, TextArea, Checkbox, Dropdown
- Display: Badge, Label, Tag, Divider, Loader
- Layout: Pane, Panels (tabs), Table
- Interactive: Button (primary, secondary, icon variations)
- Icons: Codicon support

This replaces Microsoft's deprecated VS Code Webview UI Toolkit with a modern React-based alternative.

## Success Criteria

- [ ] Component library spec includes vscrui as the standard UI library
- [ ] Documentation explains scope: all web-based components (VS Code extension, Electron Loader, Storybook)
- [ ] No exceptions needed — all render within VS Code webview context

## Constraints

- Must use React (vscrui is React-based) — aligns with existing tech choice in 001-shared-react-components
- Library must work offline (bundled, no CDN)

## Out of Scope

- Implementing actual components using vscrui (separate work)
- Evaluating alternative libraries (decision already made)
