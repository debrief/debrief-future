How do you make the same analysis tool work in a desktop app and a static website with no backend? Same JSON contract, different runtimes.

We're wiring Future Debrief's first four migrated tools into both the VS Code extension and the web-shell. Python implementations run in the calc service via MCP. TypeScript implementations run in the browser. Both produce tool definitions in MCP's standard format, so the Layers Toolbar uses identical filtering logic regardless of which backend is behind it.

The selection-aware part is what makes it useful for analysts: tool metadata encodes what features a tool needs ("two tracks" or "one track and one contact"), and the toolbar only enables tools that match the current selection. Standard MCP protocol, domain-specific annotations.

Every implementation verified against golden examples from the legacy Java tools. If both languages pass the same tests, they behave identically.

[Read the full planning post](https://debrief.github.io/future/2026/02/06/planning-tool-api-integration.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
