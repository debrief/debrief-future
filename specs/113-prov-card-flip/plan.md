# Implementation Plan: Log Panel Flip-Card Interaction

**Branch**: `113-prov-card-flip` | **Date**: 2026-02-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/113-prov-card-flip/spec.md`

## Summary

Replace the Log Panel's separate Tune dialog with an in-place flip-card interaction model. Each Log entry card gains a pencil icon that triggers a CSS 3D flip animation to reveal an edit face with type-aware parameter controls (sliders, dropdowns, toggles, colour pickers), metadata display, analyst rationale field, disable toggle, and delete button. Parameter changes trigger debounced live tool re-execution via the existing replay engine (reusing existing `tune:request` messages). Only one card may be in edit mode at a time. The action bar removes the Tune button and adds Rationale as a shortcut to flip-and-focus.

## Review Decisions (113-review)

The following decisions were made during `/speckit.review` and are normative for implementation:

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1A | Reuse existing messages | Reuse `tune:request` and `revert-this:request` instead of creating `live-replay:request` and `delete:request` | DRY — existing messages route to the same service methods |
| 2A | Extend ToolParameter type | Extend existing `ToolParameter` (at `apps/vscode/src/types/tool.ts`, `shared/components/src/ToolMatch/types.ts`) with `tunable`, `minimum`, `maximum`, `step` fields instead of creating a parallel `ParameterSchemaEntry` | Article II — single source of truth |
| 3A | Plain Map for schema cache | Use `Map<string, ReadonlyArray<ParameterSchemaEntry>>` in a `useRef` instead of a custom SchemaCache interface/factory | Avoid premature abstraction |
| 4A | activityId matching after timeline:update | When `timeline:update` arrives during editing, find the matching entry by `activityId` in the new array and update the edit face's entry reference | Article I.3 — no silent failures |
| 6A | Pure animation CardFlip | CardFlip takes `isFlipped`, `front`, `back` children — no knowledge of entries or schemas | Reusable animation primitive |
| 7C | Accept disabled mutation | `disabled` field toggles on provenance entries under Article XIV pre-release freedom; document as known deviation from III.3 | Pre-release freedom |
| 8A | Status discriminator on SchemaResponse | `status: 'success' \| 'error'` field matches existing `ReplayResult` pattern | Article XV — explicit types |
| 9B | Keep linear cascade scan | O(n²) worst case on 500 entries is microseconds; optimise later if needed | Avoid premature optimisation |
| 10A | 5-second schema timeout | `setTimeout` on schema:request; show error + retry after 5s | Article I.3 — no silent failures |
| F1 | Visited guard in cascade | Add `visited: Set<string>` to prevent infinite loops in circular dependency graphs | Prevent crash |

## Technical Context

**Language/Version**: TypeScript 5.x (React 18.x components, VS Code extension webview)
**Primary Dependencies**: React 18.x, vscrui ^0.1.0, @debrief/components (shared), @debrief/session-state (Zustand store), VS Code Extension API ^1.85.0
**Storage**: STAC catalog features (GeoJSON) — provenance entries stored in `properties.provenance[]` on each feature
**Testing**: Vitest (unit), Storybook 8.x (component stories), Playwright (E2E)
**Target Platform**: VS Code extension webview (esbuild IIFE bundle)
**Project Type**: Multi-package workspace (shared components + VS Code extension + session-state service)
**Performance Goals**: Schema load + control render < 2s (first flip), < 0.5s (cached); flip animation 400ms at 60fps; debounce 300ms
**Constraints**: Offline-capable (schemas from local MCP tool registry); single-card edit mode; no external animation libraries
**Scale/Scope**: Up to 500 timeline entries; 1–15 parameters per tool; 3 theme variants (light, dark, vscode)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | All core functionality works without network | PASS | Schema queries go to local MCP tool registry; no network calls |
| I.3 No silent failures | Operations succeed fully or fail explicitly | PASS | Schema load errors show retry UI; replay failures show error indicator on card |
| I.4 Reproducibility | Same inputs + versions = same results | PASS | Replay engine enforces tool version matching |
| II.1 Single source of truth | LinkML schemas define data structures | PASS | `rationale` and `disabled` fields added to LinkML `log-entry.yaml`; TypeScript types derived |
| II.2 Schema tests mandatory | Derived schemas pass adherence tests | PASS | Golden fixtures updated; round-trip tests extended |
| III.1 Provenance always | Every transformation records lineage | PASS | Parameter changes create TuneAnnotation; disable/delete recorded in provenance |
| III.3 Audit trail immutable | Provenance records not modified after creation | REVIEW | Rationale updates an existing entry — justified as annotation, not provenance modification. Disable toggle is a new field, not a modification of existing provenance data |
| IV.1 Services never touch UI | Python services return data only | PASS | All UI rendering in React components; replay engine returns data |
| IV.2 Frontends never persist | All writes through services | PASS | Rationale, disable, delete persisted via session-state logService |
| VI.2 Services require unit tests | Tests for service code | PASS | New message handlers tested; schema cache logic tested |
| VII.1 Tests before implementation | Tests defined before code | PASS | Storybook stories and Vitest specs written first |
| IX.1 Minimal dependencies | Prefer standard library | PASS | No new dependencies; CSS-only animation; reuse existing vscrui components |
| XI.1 I18N from the start | User-facing strings externalisable | PASS | All strings in `strings.ts` following existing pattern |
| XV.1 Explicit types everywhere | All types annotated | PASS | All new interfaces, props, and state fully typed |
| XV.2 No Any/any | Forbidden in production code | PASS | Parameter values typed as `unknown` (not `any`) at schema boundary, narrowed via type guards |

**Post-design re-check**: PASS with documented deviation:
- **III.3 rationale**: PASS — rationale is a user annotation field, not provenance lineage. `TuneAnnotation` precedent establishes mutable annotations.
- **III.3 disabled**: KNOWN DEVIATION — `disabled` is a bidirectional toggle that modifies the same entry repeatedly. Unlike `TuneAnnotation` (append-once), disable/re-enable mutates the same field back and forth. Accepted under Article XIV (pre-release freedom). Must be revisited before v4.0.0 — options: (a) separate disable state from provenance entries, (b) append-only `DisableAnnotation[]` array.
- **II.3 schema versioning**: Additive changes (`disabled`, `rationale` fields) are non-breaking but should note the schema version for discipline.

## Project Structure

### Documentation (this feature)

```text
specs/113-prov-card-flip/
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity definitions and state transitions
├── quickstart.md        # Implementation starting point
├── contracts/           # API contracts
│   ├── webview-messages.ts   # New message types (schema:request, disable:toggle, rationale:update)
│   ├── card-flip-props.ts    # CardFlip pure animation container props (6A)
│   └── schema-cache.ts       # Documentation only — use plain Map (3A)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/components/src/LogPanel/
├── LogPanel.tsx              # (modify) Add editingActivityId state, schema cache (plain Map via useRef, 3A)
├── LogEntry.tsx              # (modify) Refactor to support front/back face via CardFlip
├── LogActionBar.tsx          # (modify) Remove Tune button, add Rationale shortcut
├── ParameterEditor.tsx       # (modify) Add slider, colour picker, live-replay mode
├── ReplayProgress.tsx        # (reuse) In-card progress indicator
├── CardFlip.tsx              # (new) Pure CSS 3D flip animation container (6A: isFlipped + front/back children)
├── CardFlip.css              # (new) Flip animation styles
├── EditFace.tsx              # (new) Edit face layout
├── EditFace.css              # (new) Edit face styles
├── SkeletonLoader.tsx        # (new) Loading placeholder
├── SkeletonLoader.css        # (new) Skeleton shimmer animation
├── SliderControl.tsx         # (new) Bounded numeric slider
├── ColorPickerControl.tsx    # (new) NamedColor colour picker
├── JsonEditorControl.tsx     # (new) JSON textarea fallback
├── DisableToggle.tsx         # (new) Disable switch with dependency warning
├── DeleteConfirmation.tsx    # (new) Deletion confirmation prompt
├── RationaleField.tsx        # (new) Rationale text area
├── LogPanel.stories.tsx      # (modify) Add flip-card stories
├── types.ts                  # (modify) Add disabled, rationale, schema types
├── utils.ts                  # (modify) Add dependency graph utilities (with visited guard, F1)
└── strings.ts                # (modify) Add new user-facing strings

apps/vscode/src/
├── views/logPanelView.ts     # (modify) Add schema:request/response, disable:toggle messages
│                             #          Reuse existing tune:request handler for parameter changes (1A)
│                             #          Reuse existing revert-this:request handler for delete (1A)
│                             #          Add 5s timeout on schema request (10A)
└── webview/web/logPanel.tsx  # (modify) Add schema cache (plain Map in useRef), edit state management
│                             #          Add activityId matching on timeline:update (4A)

services/session-state/src/log/
├── logService.ts             # (modify) Add disableEntry(), setRationale() methods
├── types.ts                  # (modify) Add disabled, rationale fields; extend ToolParameter (2A)
└── replayEngine.ts           # (modify) Skip disabled entries during replay

shared/schemas/src/linkml/
└── log-entry.yaml            # (modify) Add rationale, disabled attributes
```

**Structure Decision**: This feature extends the existing multi-package architecture. Components live in `shared/components/src/LogPanel/` (pure React, no VS Code dependencies). VS Code integration lives in `apps/vscode/src/`. Service logic lives in `services/session-state/src/log/`. Schema changes in `shared/schemas/src/linkml/`.

**Message Reuse (1A)**: Parameter changes from the edit face send the existing `tune:request` message (handled by `_handleTuneRequest()` → `logService.tuneEntry()`). Entry deletion sends the existing `revert-this:request` message (handled by `_handleRevertThisRequest()` → `logService.revertThis()`). Only genuinely new messages are added: `schema:request/response`, `disable:toggle/cascade`, `rationale:update`.

**Type Consolidation (2A)**: The `ParameterSchemaEntry` type in the contract spec must be implemented by extending the existing `ToolParameter` interface (at `apps/vscode/src/types/tool.ts:28` and `shared/components/src/ToolMatch/types.ts:34`) with the fields `tunable`, `minimum`, `maximum`, and `step`. Do not create a parallel type definition.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| CardFlip | `shared/components/src/LogPanel/LogPanel.stories.tsx` | `card-flip-demo.js` | Demonstrates flip animation between read-only and edit faces |
| EditFace | `shared/components/src/LogPanel/LogPanel.stories.tsx` | `edit-face-demo.js` | Shows type-aware parameter controls (slider, dropdown, toggle, colour picker) |
| DisableToggle | `shared/components/src/LogPanel/LogPanel.stories.tsx` | `disable-toggle-demo.js` | Shows disable/re-enable with greyed-out card state |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (LogPanel.stories.tsx already exists; new stories added)
- [x] Components render standalone (no app context required — pure React with props)
- [x] Reasonable bundle size expected (< 500KB — CSS animations, no heavy dependencies)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-logpanel--card-flip`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `LogPanel.stories.tsx` — CardFlip | Flip animation, face switching | light, dark, vscode | Click pencil icon, verify edit face, click Done |
| `LogPanel.stories.tsx` — EditFace | Parameter controls rendering | light, dark, vscode | Drag slider, select dropdown, toggle boolean, type text |
| `LogPanel.stories.tsx` — DisableToggle | Disable/enable state | light, dark, vscode | Toggle disable, verify greyed-out styling |
| `LogPanel.stories.tsx` — DeleteConfirmation | Confirmation dialog | light, dark, vscode | Click delete, verify prompt, confirm/cancel |
| `LogPanel.stories.tsx` — SingleCardConstraint | Only one card editable | light, dark, vscode | Flip card A, flip card B, verify A auto-closes |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/LogPanelFlip.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=components-logpanel--card-flip&globals=theme:light
/iframe.html?id=components-logpanel--card-flip&globals=theme:dark
/iframe.html?id=components-logpanel--card-flip&globals=theme:vscode
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Flip card to edit parameters | Log Panel | `.log-panel__entry-edit-icon`, `.log-panel__card-flip`, `.log-panel__edit-face` | Click edit icon, verify flip, adjust slider, verify map update |
| Disable entry | Log Panel, Map Panel | `.log-panel__disable-toggle`, `.log-panel__entry--disabled` | Toggle disable, verify greyed card, verify map replays |
| Delete entry | Log Panel | `.log-panel__delete-button`, `.log-panel__delete-confirm` | Click delete, confirm, verify struck-through entry |
| Rationale shortcut | Log Panel | `.log-panel__action-rationale`, `.log-panel__rationale-field` | Select entry, click Rationale button, verify flip + focus |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated for new selectors
- [x] Screenshots captured for evidence

**Test File Location**: `tests/e2e/test-card-flip.spec.ts`

**Infrastructure**:
- Patches applied by `tests/e2e/scripts/patch-webview.sh`
- Content injection via `tests/e2e/helpers/webview-injector.ts`
- Headed Chromium required: `xvfb-run --auto-servernum npx playwright test ...`

## Complexity Tracking

### Constitution Deviations

| Article | Field | Deviation | Justification | Resolution Deadline |
|---------|-------|-----------|---------------|---------------------|
| III.3 | `disabled` | Bidirectional toggle modifies provenance entry repeatedly | Article XIV pre-release freedom; TuneAnnotation precedent for mutable annotations | Before v4.0.0 — migrate to separate disable state (7A) or append-only annotations (7B) |

### Test Gaps (all to be addressed in tasks.md)

| Gap | Description | Severity |
|-----|-------------|----------|
| G1 | Unit test for schema:request → MCP registry lookup in extension | Medium |
| G2 | Unit test for `logService.disableEntry()` | High |
| G3 | Unit test for `logService.setRationale()` | Medium |
| G4 | Golden fixture for `disabled: true` log entry | High |
| G5 | Round-trip test for `disabled` + `rationale` fields | High |
| G6 | Unit test for slider value clamping to min/max/step | Medium |
| G7 | Unit test for JSON editor parse validation | Low |
| G8 | Unit test for schema load timeout handling (5s, 10A) | Medium |
| G9 | Unit test for soft-deleted card flip prevention | Low |
| G10 | Unit test for activityId matching after timeline:update (4A) | Medium |

### Failure Mode: Circular Dependency (F1)

The disable cascade algorithm must include a `visited: Set<string>` guard to prevent infinite loops when the `used`/`generated` graph contains cycles. Without this, a circular dependency (A→B→C→A) would cause the cascade to loop infinitely. This is a **must-fix** before implementation.

### Performance Notes

- Schema cache: unbounded `Map` growth is acceptable (worst case ~30KB for ~30 tools)
- Disable cascade: O(n²) worst case for 500 entries is microseconds; optimise later if needed (9B)
- CSS flip animation: GPU-composited, no JS animation overhead
- Schema load timeout: 5 seconds (10A) prevents indefinite skeleton display
