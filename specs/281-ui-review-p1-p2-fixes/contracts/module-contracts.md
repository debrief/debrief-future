# Module Contracts: UI Review Follow-up — Remaining P1 & All P2 Fixes

This feature has **no network/API surface**. The relevant "contracts" are the
TypeScript module interfaces that change. Each is listed with its current and
target shape so the implementation and tests have a precise target.

---

## 1. `shared/components/src/PanelWorkspace/defaultLayout.ts`

**Current**
```ts
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig; // static 25% / 75%
```

**Target** (additive — keep the const for back-compat)
```ts
/**
 * Build the default analysis-view layout for a given viewport width.
 * Sidebar width is derived from a target px rail per band:
 *   ≤1366px  → ~280px rail
 *   ≥1600px  → ~360–400px rail
 *   between  → interpolated
 * Map always retains the majority of horizontal width.
 */
export function getDefaultLayout(viewportWidth: number): LayoutConfig;

/** Back-compat default (≈ getDefaultLayout of a typical desktop width). */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig;
```

**Invariants**
- `sidebarWidthPct < contentWidthPct` for all `viewportWidth ≥ 1024`.
- Pure function, no `window` access inside (caller passes width → testable).
- No `any`; GL content typed via `LayoutItemConfig`.

---

## 2. `shared/components/src/PanelWorkspace/layoutPersistence.ts`

**Current**
```ts
export const LAYOUT_VERSION: number;            // current
export function loadLayout(): LayoutConfig | null;
```

**Target**
```ts
export const LAYOUT_VERSION: number;            // BUMPED — legacy layouts discarded
// loadLayout() unchanged in signature; returns null for stale version
```

**Invariant**: `loadLayout()` MUST return `null` (not a stale config) when the
persisted version != `LAYOUT_VERSION`, so `PanelWorkspace` applies
`getDefaultLayout(...)`.

---

## 3. `shared/components/src/ActivityPanel/ActivityPanel.tsx`

**Behavioural contract** (no prop signature change required if height is read
internally; if a prop is preferred, add an optional one — must default to
current behaviour):
- When measured available height < threshold AND a feature is selected → upper
  flexible sections collapse so the Properties section is visible.
- When height ≥ ~900px → no adaptation.
- Manual section toggles always win over the automatic adaptation.
- Existing `data-testid`s preserved (no test breakage on the happy path).

---

## 4. `shared/components/src/ExerciseListView/ExerciseListView.tsx`

**Behavioural contract**:
- On `rowHeight` change (derived from `thumbnailSize`), the virtualizer MUST
  re-measure (`virtualizer.measure()`), so rendered row heights change.
- Thumbnail imagery dimensions MUST follow `THUMBNAIL_SIZE_CONFIGS[size]`
  (raster/spatial), not only row height.
- No prop signature change; `thumbnailSize` prop already exists.

---

## 5. `shared/components/src/StacBrowser/StacBrowser.tsx`

**Behavioural contract**:
- `thumbnailSize` state hydrates from a versioned `localStorage` key on mount and
  writes on change (new persistence — additive).
- The Timeline/Map collapse control is rendered with a discoverable label
  (chevron + tooltip) and the restore control is equally visible.
- First-run default (no saved layout): bottom row **shown** once a dataset
  context exists; Reset Layout reapplies this.
- Hidden-panel state continues to persist via `BROWSER_LAYOUT_KEY`.

---

## 6. `apps/web-shell/src/App.css` + `tokens.css`

**Behavioural contract**:
- `.web-shell__header-link` consumes a theme-aware link token whose HC-light
  value yields ≥7:1 against the header background.
- `[data-theme^='high-contrast'] .web-shell__header-link` adds underline +
  heavier weight.
- Light / dark / HC-dark header links remain legible (no regression).

---

## Test contracts (acceptance, machine-verifiable)

| ID | Assertion | Where |
|----|-----------|-------|
| SC-001 | All HC-light header links measure ≥7:1 | `ui-review-contrast.spec.ts` (axe-core) |
| SC-002 | properties-screenshots passes 10/10 first-attempt, retries off | `properties-screenshots.spec.ts` (+CI run config) |
| SC-003 | ≥1600px: 0 truncated tool labels in activity column | `ui-review-layout.spec.ts` |
| SC-004 | ≤1366px: sidebar ≈280px, map keeps majority | `ui-review-layout.spec.ts` |
| SC-005 | 1280×720: Properties reachable with feature selected | `ui-review-layout.spec.ts` |
| SC-006 | Collapse expands list; restore returns row; survives reload | `ui-review-catalog.spec.ts` |
| SC-007 | S/M/L produce distinct row sizes; survives reload | `ui-review-catalog.spec.ts` |
| SC-008 | No regression in resolved P1s / other surfaces | existing E2E suites green |
