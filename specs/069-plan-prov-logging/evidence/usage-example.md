# Usage Example: Picking Up Phase 1 (Log Recording)

**Scenario**: A developer is assigned the Phase 1 backlog item "Implement Log Recording service (SRD P1)". They use the transition plan to understand what needs to be built.

## Step 1: Find the Phase

Open `docs/architecture/prov-transition-plan.md` and navigate to **Section 9: Area 6: Phased Implementation Sequence**. Find the **Phase 1: Log Recording (SRD P1)** subsection.

## Step 2: Read Phase Description

The phase description tells you:

- **Inputs**: Phase 0 schemas and models, SRD Annex A.2/A.9
- **Outputs**: TypeScript Log Service library, integration with `executeTool.ts`, session-state Log entry writes, global timeline assembly
- **Interfaces created**: New Log Service module in `services/session-state/`
- **Interfaces modified**: `executeTool.ts`, `tool.ts`, `calcService.ts`, `dirty.ts`
- **Tests required**: Unit tests for entry creation, timeline assembly; integration test for full flow
- **Acceptance criteria**: Every tool execution creates a Log entry; `getTimeline()` works; dirty tracking triggers

## Step 3: Understand the Current State

Navigate to **Section 5: Area 2: Log Service Design** → **Current State**.

This tells you: No Log Service exists. Tool execution flows through `apps/vscode/src/commands/executeTool.ts:78-157` directly to `stacService.addFeatures()` and `stacService.addResultAsset()` without any logging.

## Step 4: Understand the Target State

Same section → **Target State**.

This gives you the TypeScript API surface:

```typescript
interface LogService {
  recordToolResult(result: ExpandedToolResult): LogEntry[];
  getTimeline(options?: { loadFromSnapshot?: string }): LogEntry[];
  // ... plus P3-P6 methods (stub for now)
}
```

And the data flow diagram showing Python services → ToolResult → Log Service → Zustand store → persistence.

## Step 5: Check for Breaking Changes

Navigate to **Section 11: Breaking Change Inventory** and filter for Phase 1.

You'll see 5 files that Phase 1 modifies:
- `apps/vscode/src/types/tool.ts` — add expanded ToolResult types
- `apps/vscode/src/services/calcService.ts` — parse new fields
- `apps/vscode/src/commands/executeTool.ts` — route through Log Service
- `services/session-state/src/store/middleware/dirty.ts` — add Log-triggered dirty
- `apps/web-shell/src/services/toolService.ts` — parse new fields

## Step 6: Check for Conflicts

Navigate to **Section 12: In-Flight Feature Guidance**.

If you're working concurrently with #028 (stacService unit tests), the guidance warns: "Merge #028 first. Phase 1 adds a new integration point; existing stacService tests should still pass."

## Result

In ~5 minutes of reading, the developer knows:
1. What to build (Log Service with 2 core methods)
2. What to modify (5 existing files)
3. What to test (3 types of tests)
4. What to avoid (merge conflicts with #028)
5. How to verify (4 acceptance criteria)

No need to re-read the 831-line SRD document.
