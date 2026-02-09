# [E02] Implement Log Recording service (SRD P1)

## Epic
Part of **E02: PROV Logging Implementation** — Phase 1

## Problem
Tool execution results pass directly from `executeTool.ts` to `stacService` without any logging. There is no way to see what changes were made, when, or by which tool. The SRD requires a Log Service that records every data change as a PROV-vocabulary entry.

## Proposed Solution
1. Create TypeScript Log Service module in `services/session-state/` (or sibling package)
2. Implement `recordToolResult()` — wraps ToolResult in Log entry, assigns activityId/timestamp
3. Implement `getTimeline()` — assembles global timeline from all features
4. Integrate with `executeTool.ts` to route ToolResults through Log Service
5. Update TypeScript types (`apps/vscode/src/types/tool.ts`) for expanded ToolResult
6. Add `markDirty()` call after Log writes for persistence triggering
7. Update `calcService.ts` and `toolService.ts` to parse expanded ToolResult fields

## Success Criteria
- Every tool execution creates a Log entry on affected features
- `getTimeline()` returns entries sorted by timestamp, deduplicated on activityId
- Dirty tracking triggers when Log entries are written
- Existing tool execution workflow unchanged for the analyst

## Dependencies
- #070 (PROV schema foundation)

## Complexity
High

## Reference
- [Transition Plan: Phase 1](docs/architecture/prov-transition-plan.md#phase-1-log-recording-srd-p1)
- [SRD Annex A.2, A.9](docs/srd-prov-undo.md)
