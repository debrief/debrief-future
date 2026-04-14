# Contract: Test List (Acceptance Scenarios → Test Cases)

**Applies to**: spec.md acceptance scenarios + edge cases + FRs + SCs.
**Purpose**: Enumerate every test that must exist before this feature is considered done. Test-driven AI collaboration (Constitution VII): these tests go in **before** or **alongside** implementation, not after.

## Unit tests — `useFilterBar.test.ts`

| # | Test case | Maps to |
|---|-----------|---------|
| U1 | `ADD_PLATFORM_LOZENGE` with `{nationality: 'GB'}` appends a `shape: 'platform'` lozenge with correct attributes | Story 1, FR-005 |
| U2 | `ADD_PLATFORM_LOZENGE` rejects empty `attributes` (reducer is a no-op; or producer contract prevents dispatch — verify both) | FR-004 |
| U3 | `EDIT_PLATFORM_LOZENGE` replaces attributes without changing id or position | Story 2, FR-010 |
| U4 | `TOGGLE_NEGATE` on a platform lozenge flips `negated` without mutating `attributes` | Story 2 scenario 2, FR-011 |
| U5 | `REMOVE_LOZENGE` removes a platform lozenge by id | Story 2 scenario 4, FR-009 |
| U6 | `ADD_CHILD_PLATFORM_LOZENGE` appends a platform lozenge inside an OR container | Story 3 scenario 3, FR-012 |
| U7 | `MOVE_TO_CONTAINER` moves a platform lozenge from top level into an OR container | Story 3 scenario 4, FR-009 |
| U8 | `MOVE_TO_TOP_LEVEL` moves a platform lozenge out of an OR container | FR-009 |
| U9 | `toFilterExpression` maps a single-attribute platform lozenge to one `ArrayFilterPredicate` with a bare `comparison` predicate | Data model: bijective mapping |
| U10 | `toFilterExpression` maps a two-attribute platform lozenge to one `ArrayFilterPredicate` with an AND of two comparisons | Data model: bijective mapping |
| U11 | `toFilterExpression` preserves `negated` from the lozenge to the `ArrayFilterPredicate` | FR-011 |
| U12 | Platform lozenges inside an OR container produce a single OR group in the output expression (via extension of `toFilterExpression`) — verifies the OR evaluation path for Story 3 scenario 3 | Story 3, FR-012 |
| U13 | Restore from `SET_STATE` of a pre-feature saved filter (no `shape` field) coerces all lozenges to `shape: 'simple'` | Decision 7 |

## Unit tests — `useDistinctValues.test.ts`

| # | Test case | Maps to |
|---|-----------|---------|
| U14 | `computeDistinctValues` includes a `platform` entry with `nationality`, `domain`, `vessel_role`, `vessel_type` arrays | FR-003 |
| U15 | Each platform sub-array de-duplicates, filters nulls/empties, and sorts | FR-003 |
| U16 | Catalogue with zero platforms produces empty arrays (editor is disabled, UI tested separately) | Edge case, FR-016 |

## Unit tests — `PlatformValueEditor.test.tsx` (NEW)

| # | Test case | Maps to |
|---|-----------|---------|
| U17 | Renders one picker per supported attribute (nationality, domain, vessel_role, vessel_type, vessel_class) | Story 1 scenario 2, FR-002 |
| U18 | Confirm button disabled until at least one attribute has a value | FR-004 |
| U19 | Clearing an attribute picker removes that attribute from the confirmed map | FR-010 |
| U20 | Pre-fills from `initialAttributes` in edit mode | FR-010 |
| U21 | Cancel closes the editor without calling `onConfirm` | Story 2 (cancellation path) |
| U22 | Escape key triggers `onCancel` | Parity with existing `ValueEditor` |
| U23 | Click-outside triggers `onCancel` | Parity with existing `ValueEditor` |

## Unit tests — `Lozenge.test.tsx` (extended)

| # | Test case | Maps to |
|---|-----------|---------|
| U24 | Platform chip renders label from `attributes` in the documented order (nationality → domain → vessel_role → vessel_type → vessel_class) | Decision 5 |
| U25 | Platform chip shows taxonomy label (via `resolveTaxonomyLabel`) for `vessel_class` rather than raw path | Decision 5 |
| U26 | Platform chip renders the distinguishing icon + tint | FR-013 |
| U27 | Platform chip with `negated: true` shows NOT prefix | FR-011 |
| U28 | Clicking platform chip body opens `PlatformValueEditor` (not the simple `ValueEditor`) | Story 2 scenario 1 |
| U29 | Platform chip remove button dispatches `REMOVE_LOZENGE` | Story 2 scenario 4 |
| U30 | Platform chip is draggable with the same dnd-kit setup as simple chips | Story 3 scenario 4 |

## Unit tests — `cql2-json.test.ts` (already covers most cases; extend)

| # | Test case | Maps to |
|---|-----------|---------|
| U31 | `filterExpressionToCql2Json` of a state with one platform lozenge produces exactly one `array_filter` node with the documented shape | FR-007, cql2-roundtrip.md emission contract |
| U32 | Deserialise a FilterBar-emitted CQL2 JSON → reconstruct the same platform lozenge attributes | FR-008 |
| U33 | Deserialise an `array_filter` with OR sub-predicate → restore declines (throws / returns error), no lozenge produced | cql2-roundtrip.md lossy case |
| U34 | Deserialise an `array_filter` with unknown field → restore declines | cql2-roundtrip.md lossy case |
| U35 | Deserialise negation wrapper around `array_filter` → platform lozenge with `negated: true` | FR-011 |

## Integration tests — `integration.test.ts` (engine-level, extended)

| # | Test case | Maps to |
|---|-----------|---------|
| U36 | Given an item with platforms `[{nat:'GB', domain:'surface'}, {nat:'DE', domain:'subsurface'}]`, a platform chip `{nationality:'GB', domain:'subsurface'}` does NOT match | Story 1 scenario 4, SC-001 |
| U37 | Given an item with `[{nat:'GB', domain:'subsurface'}]`, the same chip matches | Story 1 scenario 3, SC-001 |
| U38 | Two top-level platform chips AND together → only items matching both | Story 3 scenario 2 |
| U39 | Two platform chips in an OR container → items matching either | Story 3 scenario 3 |
| U40 | Negated platform chip excludes matching items AND includes items with empty platforms | Edge case: empty platforms + negation |
| U41 | Platform chip using `vessel_role: 'frigate'` matches `type23` via taxonomy expansion (delegated to #185, but verify through FilterBar entry point) | Story 1 edge case, FR-006 |

## Component tests — `FilterBar.test.tsx` (extended)

| # | Test case | Maps to |
|---|-----------|---------|
| U42 | "Platform" entry appears in the filter-type menu | Story 1 scenario 1 |
| U43 | Selecting "Platform" opens `PlatformValueEditor` and NOT `ValueEditor` | Story 1 scenario 2 |
| U44 | Confirming a platform chip triggers `onFilteredItems` with the expected subset | Story 1 scenario 3 |
| U45 | The `onExpressionChange` callback receives a `FilterExpression` with the platform lozenge's `ArrayFilterPredicate` in `arrayFilters` | FR-007 |
| U46 | A platform chip alongside a tag chip ANDs correctly (verify item set) | Story 3 scenario 1 |
| U47 | A pre-feature saved filter containing only simple chips restores correctly (no regression) | FR-015 |

## Storybook E2E — `FilterBar.spec.ts` (extended)

| # | Test case | Maps to |
|---|-----------|---------|
| E1 | Add platform chip via UI (click +, choose Platform, pick nationality=GB, pick domain=subsurface, confirm) → chip appears, filtered count correct | Story 1 |
| E2 | Edit platform chip (click chip, change nationality to US, confirm) → chip label updates, filtered count reflects new attributes | Story 2 scenario 1 |
| E3 | Negate platform chip → chip shows NOT, filtered count inverts | Story 2 scenario 2 |
| E4 | Editor blocks confirmation with zero attributes | Story 2 scenario 3 |
| E5 | Remove platform chip → filter bar returns to baseline | Story 2 scenario 4 |
| E6 | Drag platform chip into OR container and out again | Story 3 scenario 4 |
| E7 | Snapshots in light, dark, vscode themes | Storybook E2E section |

## Storybook E2E — `SavedFilters.spec.ts` (extended)

| # | Test case | Maps to |
|---|-----------|---------|
| E8 | Save a filter containing a platform chip, clear the bar, restore — attributes identical | Story 4, SC-002 |
| E9 | CQL2 JSON emitted before save equals CQL2 JSON emitted after restore | SC-002 |

## Performance / regression

| # | Test case | Maps to |
|---|-----------|---------|
| P1 | Filtering 500 items with one active platform chip produces results within the existing FilterBar performance envelope (baseline snapshot from #127) | Performance Goals |
| P2 | All pre-existing filter-bar unit and E2E tests pass unchanged | FR-015, SC-005 |

---

## Traceability summary

- 16 FRs (FR-001 through FR-016) → covered by U1, U2, U3, U4, U6, U17, U19, U24, U31, U32, U35, U42–U47.
- 4 user stories + all acceptance scenarios → covered by U6, U9, U10, U17, U36–U40, U42–U47, E1–E9.
- 5 measurable success criteria (SC-001 through SC-006) → covered by U36–U38 (SC-001), E8–E9 (SC-002), E1–E7 (SC-003), P1 (SC-004), P2 (SC-005), U41 + U36–U41 (SC-006).
- 6 edge cases in spec.md → covered by U13 (pre-feature restore), U16 (zero platforms), U40 (empty platforms + negation), U41 (taxonomy expansion), U18 (contradictory combination prevented? — no, permitted; verify zero-results banner in E1 trailer), U33–U34 (unsupported shapes).
