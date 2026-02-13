Every tool click in Future Debrief currently executes with default parameter values. Want a different colour or interval? Run it first, then fix it afterward. The first execution is always wrong for non-default values.

We're adding inline context menus that collect parameter values before the tool runs. Click a tool, pick from a menu of schema-defined choices, and the tool fires once with the right values. For tools with multiple parameters, menus appear in sequence -- one focused decision at a time.

The interesting architectural bit: those menu choices come from LinkML enums that flow through the generation pipeline into both Python validation and TypeScript UI. One source of truth, no hardcoded lists drifting apart across tool files. Add a colour to the schema, regenerate, and every tool using that parameter type gains it automatically.

No new dependencies. No modals. Keyboard-navigable. Tools with no parameters still execute immediately, same as before.

https://debrief.github.io/blog/2026/02/13/planning-tool-parameter-context-menus

#FutureDebrief #MaritimeAnalysis #SchemaFirst
