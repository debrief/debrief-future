Analysts reviewing maritime exercises click between three VS Code panels dozens of times an hour: Time Controller for temporal navigation, Tools for context-sensitive analysis, Layers for visibility management. Each click costs attention and screen space.

I'm consolidating these into a single unified Activity Panel with collapsible sections. The approach: vscrui Pane components for native-looking accordions, converting existing TreeView registrations to React components, and supporting all three theme variants (light, dark, VS Code) through the --debrief-* CSS token system. Codicon icons throughout for consistency.

The architecture stays true to Future Debrief's thick services, thin frontends principle — this is pure presentation layer coordinating state across sections without duplicating domain logic.

Open questions: Should sections remember collapsed state between sessions? What's the optimal default order? Any performance implications of a single webview?

Read the full plan and join the discussion: [link]

#FutureDebrief #VSCode #OpenSource
