# [E02] Implement Log Panel (SRD P2)

## Epic
Part of **E02: PROV Logging Implementation** — Phase 2

## Problem
Analysts have no visibility into the history of changes made to a plot. There is no UI to view, filter, or interact with the Log entries recorded by the Log Service.

## Proposed Solution
1. Create Log Panel VS Code webview (`apps/vscode/src/webview/logPanel.ts`)
2. Create Log Panel React components in `shared/components/`
3. Implement Timeline view (flat chronological, most recent at top)
4. Implement By-Feature view (grouped by feature type)
5. Add entry display modes: Compact, Normal, Detailed
6. Add filter/search row
7. Add feature highlight on entry selection (map integration)
8. Register activity panel in `extension.ts`

## Success Criteria
- Analyst can open Log Panel via activity bar icon
- Timeline shows all Log entries from current plot
- Selecting an entry highlights affected features on map
- Presentation mode (Compact/Normal/Detailed) persists across sessions

## Dependencies
- #071 (Log Recording service)
- Optionally #044 (Unified Activity Panel)

## Complexity
High

## Reference
- [Transition Plan: Phase 2](docs/architecture/prov-transition-plan.md#phase-2-log-panel-srd-p2)
- [UX Log Panel spec](docker/code-server/ux-log-panel.md)
- [SRD Section 3.3](docs/srd-prov-undo.md)
