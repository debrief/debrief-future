Same analysis tool, two runtimes, identical results. We shipped four styling tools in Future Debrief that run as Python in a desktop app and as TypeScript in the browser -- verified to produce the same output down to 1e-9 floating-point tolerance.

The trick is MCP as the common contract. A Python `@tool` decorator auto-generates tool definitions that both UIs consume through a shared matching service. Scientists writing new analysis tools add a decorator to a function; the tool shows up in every UI automatically.

96 new tests across both languages, with cross-language parity verified against golden examples captured from the legacy Java system. Not just matching each other -- matching the system analysts already trust.

[Read the full post](https://debrief.github.io/future/2026/02/06/shipped-tool-api-integration.html)

#FutureDebrief #MaritimeAnalysis #MCP
