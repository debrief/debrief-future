# Contract: `session.setViewport` reject-while-locked branch

**Tool**: `session.setViewport`
**Source**: `services/session-state/src/server/tools/setViewport.ts`
**Spec**: FR-009 / FR-010 / SC-003
**Status**: addendum to existing tool — no breaking change

This document specifies **only the new reject branch**. The existing happy-path and validation-error behaviour is unchanged.

---

## Input (unchanged)

```typescript
interface SetViewportInput {
  coordinates: Coordinate[];      // 4 corners, clockwise [NW, NE, SE, SW]
  rotation?: number;              // optional, degrees [0, 360)
}
```

## Output (extended)

```typescript
interface SetViewportOutput {
  success: boolean;
  viewport?: ViewportPolygon;
  center?: Coordinate;
  error?: string;
  errorCode?: 'VIEWPORT_LOCKED';   // NEW — string literal type
}
```

The `errorCode` field is **optional** and **additive**. Existing callers that ignore it observe no behaviour change on the unlocked path.

---

## Evaluation order

The reject branch runs **before** input validation:

```
1. Read state.viewportLocked
2. If true → return { success: false, error: 'Viewport is locked — unlock to change view.', errorCode: 'VIEWPORT_LOCKED' }
3. Otherwise → existing flow (validate, set, return)
```

Reasoning: a lock-rejected call should not surface coincidental validation diagnostics ("your coordinates are also invalid") because the operation is structurally refused regardless of input quality. The dominant signal is "locked".

---

## Caller contract

LLM/tool callers MUST treat the response as follows:

| `success` | `errorCode` | Caller action |
|-----------|-------------|---------------|
| `true` | — | Viewport set successfully. |
| `false` | `'VIEWPORT_LOCKED'` | Stop retrying; ask the user to unlock the viewport or accept that the framing is intentionally fixed. Surface the reason. |
| `false` | `undefined` | Conventional error (invalid coordinates etc.). Caller may correct and retry. |

The `error` free-text string is for human consumption only; programmatic decisions MUST be made on `errorCode`.

---

## Acceptance tests

Two unit tests cover the contract (added to `services/session-state/tests/`):

1. **`setViewport-locked-rejects.test.ts`**
   - Given a store with `viewportLocked: true`
   - When `setViewport({ coordinates: [valid 4 corners] })` is called
   - Then result is `{ success: false, error: <non-empty string>, errorCode: 'VIEWPORT_LOCKED' }`
   - And `store.getState().viewport` is unchanged from its pre-call value

2. **`setViewport-unlocked-no-regression.test.ts`**
   - Given a store with `viewportLocked: false`
   - When `setViewport({ coordinates: [valid 4 corners] })` is called
   - Then result has `success: true` and `errorCode === undefined`
   - And `store.getState().viewport` reflects the new value

---

## Out-of-scope

Other MCP/host tools (`fitBounds`, `flyTo`, internal `loadPlot`, etc.) are **not** gated by the lock in this feature. Per the spec's Assumptions section, the UI cannot trigger viewport mutation while locked, so the host-internal call sites do not require an explicit reject path. Only this externally-callable surface needs the gate.

If a future feature adds another externally-callable viewport-mutating tool, it MUST replicate this contract (same `errorCode` value) so callers can write a single switch.
