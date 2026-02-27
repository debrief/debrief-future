# Quickstart: Log Panel Flip-Card Interaction

**Feature**: 113-prov-card-flip
**Date**: 2026-02-27

## Prerequisites

- Feature #072 (Log Panel) implemented
- Feature #076 (Replay and Parameter Tuning) implemented
- Feature #071 (Log Recording Service) implemented
- Node.js, pnpm, and VS Code extension development environment set up

## Implementation Order

### Phase 1: Schema Foundation

1. **Update LinkML schema** (`shared/schemas/src/linkml/log-entry.yaml`)
   - Add `disabled: boolean` (default: false)
   - Add `rationale: string` (nullable)
   - Regenerate derived schemas (Pydantic, JSON Schema, TypeScript)
   - Update golden fixtures in `shared/schemas/fixtures/log-entry/`

2. **Update TypeScript types** (`services/session-state/src/log/types.ts`)
   - Add `disabled` and `rationale` fields to `LogEntry`
   - Update `TimelineEntry` in `shared/components/src/LogPanel/types.ts`

### Phase 2: CardFlip Component

3. **Create `CardFlip.tsx`** — CSS 3D flip container
   - Two children: front face and back face
   - `backface-visibility: hidden` on both
   - `transform: rotateY(180deg)` transition on flip
   - Adaptive height animation via `max-height` transition
   - Props: `isEditing`, `onFlipToEdit`, `onFlipToRead`

4. **Create `CardFlip.css`** — flip animation styles
   - `perspective: 1000px` on container
   - `transition: transform 400ms ease-in-out` on inner wrapper
   - `backface-visibility: hidden` on both faces
   - Back face pre-rotated 180deg
   - Height transition alongside flip

5. **Create `SkeletonLoader.tsx`** — loading placeholder
   - Shimmer animation for parameter area
   - Reuse indeterminate animation pattern from `ReplayProgress.css`

### Phase 3: Edit Face & Controls

6. **Create `EditFace.tsx`** — edit face layout
   - Parameter controls section (from schema)
   - Metadata block (timestamp, duration, file-size, tool version, source ref)
   - Rationale field
   - Disable toggle
   - Delete button
   - Done button

7. **Create `SliderControl.tsx`** — bounded numeric slider
   - HTML `<input type="range">` with numeric readout
   - Min/max/step from schema
   - `onChange` fires on every change event (debounced by parent)

8. **Create `ColorPickerControl.tsx`** — NamedColor colour picker
   - Grid of colour swatches
   - Selected state indicator
   - `onChange` fires immediately on selection

9. **Create `JsonEditorControl.tsx`** — JSON textarea fallback
   - Textarea with JSON syntax validation
   - Error indicator for invalid JSON
   - `onChange` fires on blur or after debounce

10. **Create `DisableToggle.tsx`** — disable switch
    - Toggle switch using vscrui Checkbox
    - Dependency warning message when auto-disabled

11. **Create `DeleteConfirmation.tsx`** — deletion prompt
    - Inline confirmation with warning message
    - Confirm and Cancel buttons

12. **Create `RationaleField.tsx`** — rationale text area
    - Textarea with placeholder text
    - Auto-save on blur
    - Ref for external focus control

### Phase 4: Integration

13. **Modify `LogEntry.tsx`** — refactor to support flip
    - Wrap existing content as front face
    - Add pencil icon to card header
    - Integrate `CardFlip` container
    - Greyed-out styling for disabled entries
    - Struck-through styling for deleted entries

14. **Modify `ParameterEditor.tsx`** — live replay mode
    - Remove commit/cancel buttons when in live mode
    - Add debounce wrapper (300ms for continuous, 0ms for discrete)
    - Integrate slider control for bounded numerics

15. **Modify `LogPanel.tsx`** — state management
    - Add `editingActivityId` state
    - Add schema cache (Map)
    - Single-card constraint enforcement
    - Schema request/response handling

16. **Modify `LogActionBar.tsx`** — action bar updates
    - Remove Tune button
    - Add Rationale button with flip-and-focus behaviour

### Phase 5: Extension Wiring

17. **Modify `logPanelView.ts`** — new message handlers
    - `schema:request` → look up MCP tool → return parameter schema
    - `live-replay:request` → call replay engine → return result
    - `disable:toggle` → call logService.disableEntry() → return cascade
    - `delete:request` → call logService.deleteEntry() → return updated timeline
    - `rationale:update` → call logService.setRationale()

18. **Modify `logService.ts`** — new service methods
    - `disableEntry(storePath, itemPath, activityId, disabled)` — toggle + replay
    - `setRationale(storePath, itemPath, activityId, text)` — persist rationale
    - Update `replayEngine` to skip disabled entries

19. **Modify `logPanel.tsx` (webview)** — message routing
    - Handle `schema:response` → update cache + trigger re-render
    - Handle `live-replay:result` → update replay status on card
    - Handle `disable:cascade` → update disabled state on affected entries

### Phase 6: Testing & Stories

20. **Update `LogPanel.stories.tsx`** — new stories
    - CardFlip story (flip animation demo)
    - EditFace story (all parameter control types)
    - DisableToggle story (enable/disable/cascade)
    - DeleteConfirmation story (confirm/cancel)
    - SingleCardConstraint story (two cards)

21. **Unit tests** (Vitest)
    - Schema cache get/set/has/clear
    - Debounce logic for parameter changes
    - Dependency graph calculation for disable cascade
    - Control type mapping from schema

22. **E2E tests** (Playwright)
    - Storybook: `shared/components/e2e/LogPanelFlip.spec.ts`
    - Webview: `tests/e2e/test-card-flip.spec.ts`

## Key Files to Read First

| File | Why |
|------|-----|
| `shared/components/src/LogPanel/LogEntry.tsx` | Current card rendering — refactor target |
| `shared/components/src/LogPanel/ParameterEditor.tsx` | Existing type-aware controls — extend |
| `shared/components/src/LogPanel/types.ts` | Type definitions — extend |
| `apps/vscode/src/views/logPanelView.ts` | Extension message routing — extend |
| `apps/vscode/src/webview/web/logPanel.tsx` | Webview state management — extend |
| `services/session-state/src/log/replayEngine.ts` | Replay engine — integrate |
| `shared/components/src/LogPanel/ReplayProgress.tsx` | Progress indicator — reuse pattern |

## Build & Test Commands

```bash
# Build all packages
pnpm build

# Run component tests
cd shared/components && pnpm test

# Run Storybook
cd shared/components && pnpm storybook

# Run E2E tests
xvfb-run --auto-servernum npx playwright test tests/e2e/test-card-flip.spec.ts

# Full verification (mirrors CI)
task verify
```
