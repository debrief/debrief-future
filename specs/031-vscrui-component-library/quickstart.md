# Quickstart: Document vscrui as Standard Component Library

**Feature**: 031-vscrui-component-library
**Complexity**: Low

## What to Build

A single markdown file at `shared/components/vscrui.md` documenting vscrui as the standard UI component library for all VS Code webview-based UIs. Plus a cross-reference in `ARCHITECTURE.md`.

## Steps

1. Create `shared/components/vscrui.md` with all sections from the data model
2. Add a reference to vscrui.md in `ARCHITECTURE.md` (Tech Stack / Tooling table or similar)
3. Verify all 10 functional requirements (FR-001 through FR-010) are covered

## Key Constraints

- File must live in `shared/components/`
- Must include a working code example (import + JSX render)
- Must reference upstream repo: https://github.com/estruyf/vscrui
- Must state offline bundling requirement (no CDN)

## Verification

- Read the document and confirm a new contributor can answer "What library do I use?" without other sources
- Check all FR items are addressed
- Confirm ARCHITECTURE.md references the new document
