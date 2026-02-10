# Contracts: 073 — Split Undo/Redo

No API contracts for this feature. The change is internal to the `session-state` package:

- **No new endpoints**: No REST/GraphQL APIs added
- **No new message types**: No new MCP messages
- **Internal type change only**: `StateSnapshot` interface narrowed from 12 to 10 fields

The "contract" is the TypeScript type itself — consumers of the exported `StateSnapshot` type will see the narrower type after this change. This is acceptable under Article XIV (Pre-Release Freedom).
