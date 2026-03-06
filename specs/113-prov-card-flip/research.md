# Research: Log Panel Flip-Card Interaction

**Feature**: 113-prov-card-flip
**Date**: 2026-02-27

## Research Questions & Findings

### R1: How should the flip-card animation be implemented?

**Decision**: CSS 3D perspective transform with `transform: rotateY(180deg)`, using `backface-visibility: hidden` on both faces.

**Rationale**: The codebase already uses CSS keyframe animations and transitions extensively (150ms ease-in-out standard). A CSS-only flip avoids JS animation libraries and stays consistent with the existing approach. The `perspective` property on the card container creates the 3D depth effect.

**Alternatives considered**:
- **JS animation library (Framer Motion, GSAP)**: Rejected — adds a dependency contrary to Constitution IX (minimal dependencies), and the codebase has no existing JS animation library.
- **CSS `transform: scaleX(0)` fake flip**: Rejected — less convincing 3D effect, doesn't match the "card flip" metaphor.

**Key implementation note**: The codebase currently has no smooth height transitions (uses `display: none` for collapse). The flip-card will introduce a new pattern: animating `max-height` alongside `rotateY` to smoothly grow the card when the edit face needs more space.

---

### R2: How should tool schemas be fetched and cached for parameter controls?

**Decision**: Request schemas via webview → extension messaging. The extension queries the MCP tool registry for the tool's `inputSchema` and returns parameter type information. Cache in a `Map<string, ToolParameterSchema>` within the webview React state.

**Rationale**: The existing messaging pattern (webview ↔ extension) is well-established. MCP tools already expose `inputSchema` with type information including `x-debrief-param-type` for custom enums. The `ParameterEditor` component already handles float, integer, duration, enum, boolean, and string types — it just needs to receive the schema.

**Alternatives considered**:
- **Pre-fetch all schemas on panel open**: Rejected — unnecessary overhead if the analyst never flips any cards. Lazy loading on flip keeps the read-only experience fast.
- **Embed schemas in timeline entries**: Rejected — bloats timeline data with repeated schema definitions for the same tool type.

**Message flow**:
1. Webview sends `schema:request` with `{ toolId: string }`
2. Extension looks up tool in MCP registry → extracts `inputSchema.properties.params`
3. Extension sends `schema:response` with `{ toolId, parameters: ToolParameterSchema[] }`
4. Webview caches response keyed by `toolId`

---

### R3: How should the existing ParameterEditor integrate with the flip-card edit face?

**Decision**: Reuse the existing `ParameterEditor` component with modifications. Currently it shows a commit/cancel button pair — for the flip-card, parameter changes trigger live replay via debounce instead of requiring explicit commit.

**Rationale**: `ParameterEditor.tsx` already maps parameter types to controls (numeric input, dropdown, toggle, text). The main changes are: (1) remove commit/cancel in favour of live debounced replay, (2) add slider control for bounded numerics, (3) add colour picker for `NamedColor` param types, (4) add JSON editor fallback for complex nested parameters.

**New controls needed**:
- **Slider with numeric readout**: For bounded continuous numerics (schema provides min/max/step).
- **Colour picker**: For parameters with `x-debrief-param-type: "NamedColor"`.
- **JSON editor**: Fallback for arrays/objects. A simple textarea with JSON validation.

---

### R4: How should debouncing work for live replay?

**Decision**: Use a shared debounce timer per card. Continuous inputs (sliders, numeric step) debounce at 300ms. Discrete inputs (dropdown, toggle, colour picker) trigger immediately. If a replay is already in progress when a new change arrives, queue the new value and replay again after the current one completes.

**Rationale**: The 300ms debounce matches the idea document's specification. The existing replay engine (`replayEngine.ts`) supports AbortController for cancellation, so an in-flight replay can be cancelled when a newer value arrives.

**Alternatives considered**:
- **Longer debounce (500ms)**: Rejected — feels sluggish for interactive tuning.
- **Cancel-and-restart on every change**: Possible but wasteful. Debouncing first, then cancelling only if a new value arrives during replay, is more efficient.

---

### R5: How should the disable/delete state be persisted?

**Decision**: Extend the existing `LogEntry` type with a `disabled: boolean` field (defaulting to `false`). Soft-delete uses the existing `deleted?: boolean` field already present in the TypeScript types. Both are persisted to the STAC feature's `properties.provenance` array.

**Rationale**: The `deleted` field already exists on `LogEntry` in `services/session-state/src/log/types.ts`. Adding `disabled` follows the same pattern. The replay engine already skips `deleted` entries — adding `disabled` to the skip list is straightforward.

**Dependency cascade**: When entry A is disabled and entry B depends on A, entry B is auto-disabled. This uses the `used`/`generated` fields on LogEntry to trace dependencies.

---

### R6: How should the rationale field be persisted?

**Decision**: Add a `rationale: string | null` field to the `LogEntry` type. Persisted alongside other provenance fields on the STAC feature.

**Rationale**: The provenance data model is append-only, but rationale is an annotation on existing entries (not a new entry). Since the existing tuning mechanism already updates entries in-place (via `TuneAnnotation`), rationale follows the same update pattern.

**Schema change**: Requires a LinkML schema update to `log-entry.yaml` adding the `rationale` attribute. This is a non-breaking additive change (null default).

---

### R7: What is the single-card constraint implementation approach?

**Decision**: Track `editingActivityId: string | null` in React state. When a new card requests edit mode, commit the current card's state first (implicit Done), then set the new activityId. Components check `editingActivityId === entry.activityId` to determine which face to show.

**Rationale**: Simple state management via React `useState`. No Zustand store needed for this — it's UI-local state within the webview, matching the existing pattern where `selectedEntryId`, `presentationMode`, and `viewMode` are managed locally.

---

### R8: What existing components can be reused?

**Decision**: Significant reuse from existing components.

| Existing Component | Reuse Strategy |
|-------------------|----------------|
| `ParameterEditor.tsx` | Extend with slider, colour picker, live-replay mode |
| `ReplayProgress.tsx` | Reuse for in-card progress indicator |
| `LogEntry.tsx` | Refactor to support front/back face rendering |
| `LogActionBar.tsx` | Remove Tune button, add Rationale shortcut |
| `types.ts` | Extend with `disabled`, `rationale` fields |
| `logPanelView.ts` | Add `schema:request/response` and `disable:toggle` messages |
| vscrui components | Reuse `Button`, `Checkbox`, `Dropdown`, `TextField`, `Icon` |

**New components needed**:
- `CardFlip.tsx` — Container managing the 3D flip animation and face switching
- `EditFace.tsx` — Edit face layout (parameter controls, metadata, rationale, actions)
- `SkeletonLoader.tsx` — Loading placeholder for schema fetch
- `SliderControl.tsx` — Slider with numeric readout (new control type)
- `ColorPickerControl.tsx` — Colour picker for NamedColor parameters
- `JsonEditorControl.tsx` — JSON textarea for complex parameters
- `DisableToggle.tsx` — Toggle switch with dependency warning
- `DeleteConfirmation.tsx` — Confirmation prompt for entry deletion
