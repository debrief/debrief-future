## What We're Building

The VS Code extension currently has three separate sidebar panels: Time Controller for temporal navigation, Tools for context-sensitive analysis, and Layers for plot visibility management. I'm consolidating these into a single unified Activity Panel with collapsible sections.

This matters because analysts work with these controls constantly during exercise review. Having them scattered across separate panels means more clicking, more cognitive overhead, and less screen space for the plot itself. A unified panel keeps all controls within reach while giving analysts fine-grained control over what they see.

## How It Fits

Future Debrief's architecture separates domain logic (Python services) from presentation (thin frontends). The VS Code extension orchestrates these services through MCP and presents results. This unified panel follows that pattern — it's pure presentation layer, coordinating state across Time Controller, Tools, and Layers without duplicating any domain logic.

## Key Decisions

- Using vscrui Pane components for collapsible sections (native-looking accordions)
- Converting existing TreeView registrations to React components
- Supporting all three theme variants (light/dark/VS Code) via --debrief-* CSS tokens
- Codicon icons throughout for consistency with VS Code
- Shared components in @debrief/components package
- Single WebviewViewProvider rather than three separate providers
- Message passing for state sync with extension host
