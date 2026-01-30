# Build unified Debrief activity panel as single webview component

## Problem

The Debrief activity sidebar currently uses multiple separate VS Code panels (time controller, tools, layers). This limits layout control, wastes vertical space, and prevents cohesive UX design.

## Proposed Solution

Build a single webview-based "Debrief Activity Panel" that composites three shared React components:

1. **Time Controller** — playback controls and time display
2. **Tools** — context-sensitive analysis tool offering
3. **Layers** — track/annotation layer visibility and ordering

Each sub-component should be developed as a **shared React component** (in `shared/components/`) using the `vscrui` VS Code React component library, then composed into a single activity panel webview for the VS Code extension.

## Success Criteria

- Single webview replaces the current multi-panel activity sidebar
- Each sub-component (time controller, tools, layers) works independently as a shared component
- Built using vscrui components for native VS Code look and feel
- Vertical space usage is optimized compared to current multi-panel layout
- Components are reusable across frontends (VS Code, Electron, Jupyter)

## Constraints

- Requires #031 (document vscrui as standard component library) as prerequisite
- Must work offline (CONSTITUTION Article I)
- Shared components must not depend on VS Code APIs directly

## Out of Scope

- New functionality in the sub-components (this is a layout/architecture change)
- Non-VS Code frontend integration (future work)
