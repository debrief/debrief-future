# Mockup 07 — iPad-landscape parity (1024 × 768)

> Per spec.md FR-001 + edge case "Boundary at 1024px": viewport-width
> exactly 1024 renders the **desktop** table layout, not the card list.
>
> This mockup is a sanity check that the breakpoint behaves and that
> existing desktop tap targets remain ≥ 44 × 44 even on a touch device.
> No new components are introduced; the existing `<ItemsTable>` from #242
> is rendered unchanged.

## Layout

```
┌────────────────────────────────────────────────────────────────────────────────┐ ← 1024 × 768
│  ☰  Backlog Navigator                                              👤  ⚙       │  same as desktop
├────────────────────────────────────────────────────────────────────────────────┤
│  🔍  Search backlog…    [Phase: Active ▾]   [Include completed: ☐]   [Sort: ▾] │
├────────────────────────────────────────────────────────────────────────────────┤
│ ID  │ Cat       │ Description           │ V │ M │ A │ Total │ Status        │…│
├─────┼───────────┼───────────────────────┼───┼───┼───┼───────┼───────────────┼─┤
│ 244 │ Feature   │ Backlog Navigator…    │ 4 │ 3 │ 3 │ 10    │ implementing  │…│  ← desktop table,
│ 243 │ Tech Debt │ Per-scene asset key…  │ 2 │ 1 │ 3 │ 6     │ approved      │…│     unchanged
│ 242 │ Tech Debt │ Migrate saveSession…  │ 1 │ 1 │ 3 │ 5     │ proposed      │…│     post-#244
│ 241 │ Feature   │ STAC best-practices…  │ 3 │ 3 │ 3 │ 9     │ complete      │…│
│ 240 │ Feature   │ Spec Review Feedback… │ 4 │ 3 │ 3 │ 10    │ tasked        │…│
│ 239 │ Feature   │ Mermaid blog rendering│ 3 │ 3 │ 3 │ 9     │ complete      │…│
│ …   │ …         │ …                     │   │   │   │       │               │…│
└────────────────────────────────────────────────────────────────────────────────┘
                                                                                  ┌─────────┐
                                                                                  │  Push   │
                                                                                  └─────────┘
                                                                                  ↑
                                                                                  desktop top-bar
                                                                                  Push button
                                                                                  (NOT the sticky
                                                                                  bar — that's
                                                                                  mobile-only)
```

## Tap-target check on iPad landscape

The desktop table has dense rows (~32 px tall by default). Apple's HIG
asks for 44 × 44 minimum for touch. On iPad landscape, the user is
holding a touch device — rows will be tap targets even though we're in
"desktop" layout.

**Decision** (locked here for Phase 3 to honour):

- The desktop table at ≥ 1024 px viewport keeps its current dense layout
  for **mouse / trackpad** users.
- For **touch** users (detected via `navigator.maxTouchPoints > 0`), we
  apply a `touch-friendly` class on the `<table>` that bumps row height
  to 44 px and inline-edit chips to 44 × 44.
- This is a CSS-only adjustment; no new components, no behavioural change.

## Verification approach

The Playwright project `tablet-landscape` (1024 × 768) runs the existing
desktop browse spec (`browse.spec.ts`) AND the mobile browse spec
(`mobile/browse.mobile.spec.ts`). The mobile spec asserts:
- The desktop table renders (`<ItemsTable>` is in the DOM).
- The mobile card list is NOT rendered (`[data-testid=card-list]` absent).
- Tap targets in the desktop table are ≥ 44 × 44.

This is an explicit FR-023 / SC-008 gate — desktop behaviour must not
regress.

## Open questions

1. **Touch-friendly mode trigger**: detect via `navigator.maxTouchPoints`
   (current draft) or via `@media (pointer: coarse)` CSS query? Both work;
   the latter is purer CSS and works across devices.
   **Recommendation**: use `@media (pointer: coarse)` so the table
   responds to OS preferences (e.g. touch laptops).

2. **Should the desktop table show the mobile sticky push bar on tablet
   landscape** even though it's "desktop" layout? Spec.md FR-010 says
   "viewports below 1024px"; 1024 = desktop. Current draft = NO sticky
   bar at 1024 (use the existing top-bar Push button).

3. **Long-press behaviour**: on touch devices, the desktop table's
   right-click-to-undo (line 119 of `ItemRow.tsx`) is unavailable.
   Should long-press substitute? Out of scope unless reviewer flags.
