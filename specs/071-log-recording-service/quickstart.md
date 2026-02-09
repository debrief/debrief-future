# Quickstart: Log Recording Service (#071)

**Date**: 2026-02-09
**Prerequisite**: Feature #070 (PROV Schema Foundation) must be complete and merged.

## What This Feature Does

After this feature ships, every successful tool execution automatically records a PROV-aligned Log entry on every affected feature. The analyst's workflow is unchanged -- the recording is transparent.

## Key Files to Modify

### New files (Log Service module)
```
services/session-state/src/log/
├── index.ts          # Public exports
├── logService.ts     # LogService implementation (recordToolResult, getTimeline)
├── entryBuilder.ts   # Constructs LogEntry from ToolResult + expanded fields
├── timeline.ts       # Timeline assembly (collect, dedup, sort)
└── types.ts          # LogEntry, ExpandedToolResultFields TypeScript types
```

### Modified files

| File | Change |
|------|--------|
| `services/session-state/src/index.ts` | Export Log Service types and factory |
| `services/session-state/package.json` | No new dependencies needed |
| `apps/vscode/src/types/tool.ts` | Add expanded ToolResult fields to `ToolExecutionResult` and `DebriefAnnotations` |
| `apps/vscode/src/services/calcService.ts` | Parse new MCP annotations (`debrief:toolVersion`, etc.) |
| `apps/vscode/src/commands/executeTool.ts` | Call `logService.recordToolResult()` after successful execution |
| `apps/vscode/src/services/stacService.ts` | Add `appendProvenance()` method |
| `apps/web-shell/src/services/toolService.ts` | Handle expanded ToolResult fields (no crash on new annotations) |

### New test files
```
services/session-state/tests/unit/log/
├── entryBuilder.test.ts   # Entry construction from various ToolResult shapes
├── timeline.test.ts       # Deduplication, sorting, empty cases
└── logService.test.ts     # Full orchestration with mocked stacService

services/session-state/tests/integration/
└── logIntegration.test.ts # Real stacService + temp files, end-to-end flow
```

## Implementation Order

1. **Types first**: Define `LogEntry`, `ExpandedToolResultFields`, etc. in `log/types.ts`
2. **Entry builder**: Implement `buildLogEntry()` in `entryBuilder.ts` -- pure function, easy to test
3. **Timeline assembly**: Implement `assembleTimeline()` in `timeline.ts` -- pure function
4. **stacService extension**: Add `appendProvenance()` to stacService
5. **Log Service**: Wire together entry builder + stacService + markDirty in `logService.ts`
6. **Type updates**: Extend `ToolExecutionResult` and `DebriefAnnotations` in `types/tool.ts`
7. **calcService parsing**: Parse new annotations in `calcService.ts`
8. **executeTool integration**: Call logService after successful tool execution
9. **web-shell update**: Handle new fields in `toolService.ts`

## Key Design Decisions

- **Python creates provenance on output features; TypeScript creates entries for input features** -- see research.md #3
- **Log entries written to GeoJSON files via stacService, not Zustand store** -- see research.md #1
- **Module lives in session-state package** (`src/log/`) -- see research.md #4
- **Timeline assembled at read time** from feature provenance arrays -- see research.md #5
- **markDirty() called explicitly** after provenance writes -- see research.md #7

## Verification

After implementation:
1. Run a tool on two tracks -> both tracks' GeoJSON has new provenance entries
2. Call `getTimeline()` -> returns one entry (deduplicated on activityId)
3. Check dirty flag -> true after Log writes
4. Run a tool that creates a new feature -> output feature has provenance from Python
5. Run a legacy tool (no expanded fields) -> still records a valid Log entry
6. Run a tool that fails -> no Log entries created
