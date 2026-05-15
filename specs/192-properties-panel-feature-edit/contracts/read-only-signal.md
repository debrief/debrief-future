# Contract — Read-only plot signal

**Owner**: `services/session-state/src/store/slices/plot.ts` (extended);
producer logic in `services/session-state/src/persistence/save.ts`
**Consumers**: `PropertiesPanel`, future write-capable panels
**Source of truth**: this contract + research.md R-003/R-009

## State shape

Added to the `plot` slice of `@debrief/session-state`:

```ts
interface PlotSliceState {
  // … existing fields …
  readonly isReadOnly: boolean;
  readonly readOnlyReason: string | null;
}
```

## Producer rules

| Source | When evaluated | Action |
|---|---|---|
| `CapabilityReport.persistent === false` (from `@debrief/stac-writer`) | When a plot is opened, by `openPlot` action in the plot slice | Set `isReadOnly = true`, `readOnlyReason = 'Storage location is not writable'` |
| `saveSession` returns `{ success: false, error }` AND `error` matches `ReadOnlyFilesystemError` (apps/vscode/src/services/stacService.ts:76) OR Node `EACCES`/`EPERM` | After each save attempt | Set `isReadOnly = true`, `readOnlyReason = <specific reason from error>`. Staged edits preserved. |
| `openPlot` for a writable plot | When a writable plot is opened | Reset `isReadOnly = false`, `readOnlyReason = null` |

**Most-restrictive precedence**: any single producer setting `true` keeps the
plot read-only until an `openPlot` against a writable host resets it.

## Consumer surface

Selector (named export from the plot slice):

```ts
export const selectIsReadOnly = (s: SessionState): boolean => s.plot.isReadOnly;
export const selectReadOnlyReason = (s: SessionState): string | null => s.plot.readOnlyReason;
```

`PropertiesForm` consumes both — the boolean disables every input, the
reason drives the banner text. The selector is the **only** API; other
panels MUST use it (no direct slice access) to keep the contract narrow.

## Behavioural rules (panel side)

1. When `isReadOnly === true`, the panel renders the `readOnlyBanner`
   above the form in every mode (plot, feature, sub-feature, multi-
   select).
2. Every input control receives `disabled={true}` AND `aria-disabled="true"`.
3. The Save action is hidden OR disabled with a tooltip stating the
   reason (implementation choice; behavioural contract is "no save
   path reachable from the panel UI when `isReadOnly`").
4. The staging buffer is **not** cleared when transitioning into
   `isReadOnly = true` mid-session (US-5 AS-3 — the analyst's work
   isn't lost when a save fails due to permissions).
5. Auto-save (if any future feature adds it) MUST consult the signal
   and skip when `isReadOnly`.

## Failure-mode coverage

| Code path | Tested by | Tested in |
|---|---|---|
| Open a writable plot → `isReadOnly = false` | Vitest unit + Playwright workflow | `properties-read-only.spec.ts` (control case) |
| Open a chmod-444 fixture → producer #1 fires → banner visible immediately | Playwright workflow | `properties-read-only.spec.ts` |
| Edit + save on a writable plot that becomes RO mid-session (force a writer error via mock) → producer #2 fires, banner appears, buffer preserved | Vitest integration (`saveSession-integration.test.ts`) | (mocks writer to reject with `EACCES`) |
| Re-open a writable plot after RO → signal resets | Vitest unit | plot slice test |

## Vitest cases (plot slice)

```text
plot slice — isReadOnly
  ├── default is false
  ├── openPlot with CapabilityReport.persistent=false → true + reason set
  ├── openPlot with persistent=true → false + reason null
  ├── saveSession ReadOnlyFilesystemError → true + reason from error
  ├── saveSession EACCES Node error → true + EACCES-derived reason
  ├── saveSession success → leaves existing isReadOnly unchanged (only openPlot resets)
  └── openPlot writable after a prior RO transition → resets to false
```
