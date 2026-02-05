When your Python services and TypeScript frontends implement the same tool, how do you guarantee they'll behave identically? We built a shared specification system that became the single source of truth.

Each tool spec follows a 9-section template: what it does, inputs, outputs, error handling, and how LLMs discover it via MCP. We started with four specs for track styling and paired each with golden input/output examples for testing. Now when someone implements a tool, they're not guessing — they're following a spec written by the person who designed it.

The Python @tool_spec decorator links implementation directly to spec, so there's no version drift. Tests run against golden examples, not aspirations.

This matters because maritime analysis tools get complex fast, and schema-first development catches mismatches early. Python developers don't reverse-engineer TypeScript behavior. New team members onboard faster.

→ [Read the full specification](https://debrief.github.io/articles/shipped-tool-documentation-model)

#FutureDebrief #SchemaFirst #OpenSource
