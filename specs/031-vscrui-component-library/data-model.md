# Data Model: vscrui Component Library Documentation

**Feature**: 031-vscrui-component-library
**Date**: 2026-01-30

## Overview

This feature is documentation-only. There are no data entities, database models, or state transitions. The "data model" is the structure of the documentation file itself.

## Document Structure

The deliverable is a single markdown file (`shared/components/vscrui.md`) with the following sections:

```
vscrui.md
├── Header (library name, status as standard)
├── Rationale (why vscrui, what it replaces)
├── Scope (which contexts: VS Code, Electron, Storybook)
├── Installation (npm command, peer deps, codicon CSS)
├── Component Inventory (categorized table)
├── Usage Example (import + render snippet)
├── Constraints (offline bundling, no CDN)
├── Gap Process (what to do if component missing)
└── References (upstream repo link)
```

## Cross-References

A reference entry will be added to `ARCHITECTURE.md` in the Tech Stack or Tooling section pointing to `shared/components/vscrui.md`.

## No Schema Impact

This feature adds no schemas, models, or data structures to the codebase. It is purely documentation.
