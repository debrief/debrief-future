# Feature Specification: Backlog Navigator UI Refresh

**Feature Branch**: `claude/refactor-ui-columns-Xio3N`
**Created**: 2026-05-02
**Status**: Proposed (no implementation yet)
**Supersedes**: column layout + status filter from #242
**Input**: User feedback after first reviewer pass — "too many columns, too many status terms, no clear way to hide completed work."

## Why this exists

The Backlog Navigator (#242) shipped with twelve columns and a single flat
`Status` filter that exposes all twelve workflow states. At ~230 rows the
table is dense, the four scoring columns (`V`, `M`, `A`, `Total`) eat
horizontal space without earning it, and the reviewer's most common question
— "what's still in flight, ignoring done?" — has no first-class control.

Several other backlog-editor tasks are about to start in parallel. **Once this
spec is accepted/merged, those tasks should acknowledge it in their plans** so
their UI assumptions stay aligned (column count, status filter shape,
strikethrough convention).

## Scope

Four UI changes inside `apps/backlog-navigator/`. **No data-model changes, no
parser changes, no schema changes.** The same `Item` shape from `types.ts`
flows through; only rendering, the filter dropdown, and one new toggle are
touched.

### 1. Merge V/M/A/Total into a single "Score" column

- New column header: **Score** (replaces the four headers `V`, `M`, `A`, `Total`).
- Cell renders `Total` as the primary value, with `V·M·A` as a smaller muted
  line beneath. Example: `12` over `4·4·4`.
- Sortable by `Total` only. The column-sort indicator behaves as today's
  `Total` indicator does. Per-axis sorting is removed (rarely used; can be
  reintroduced later via a header menu without changing this spec).
- Absent scores (`-`) render as `-` in the secondary line; the primary line
  shows `—` when `Total` cannot be computed.

### 2. Merge Created/Updated into a single "Dates" column

- New column header: **Dates**.
- Cell stacks two lines: `Updated <iso>` on top (primary, sortable),
  `Created <iso>` below (muted). Labels are small and muted; values use the
  existing date formatting.
- Sortable by `Updated` descending by default — this becomes the table's
  default sort once landed. The existing `SENTINEL_CREATED` visual flag still
  applies to the Created line.

### 3. Phase-based Status filter + "Include completed" toggle

The filter dropdown labelled **Status** is replaced by a **Phase** dropdown
with five options that map onto the existing twelve `STATUS_VALUES`:

| Phase     | Maps to statuses                                           |
| --------- | ---------------------------------------------------------- |
| (any)     | all                                                        |
| Triage    | `needs-interview`, `proposed`                              |
| Ready     | `approved`, `specified`, `clarified`, `planned`, `tasked`  |
| Active    | `implementing`, `blocked`                                  |
| Done      | `complete`, `parked`, `rejected`                           |

Alongside the dropdown, a checkbox **Include completed items** controls
visibility of the Done phase:

- Default: **off** — rows whose status is in the Done phase are hidden
  regardless of the Phase selection.
- When **on**, Done rows are shown according to the current Phase selection.
- When the user explicitly selects Phase = **Done**, the checkbox is forced
  on and disabled (the selection itself implies inclusion).

The per-row inline status edit dropdown is **unchanged** — it continues to
expose the full twelve-value list (minus `parked`/`rejected`, per
`EDITABLE_STATUS_VALUES`).

### 4. Strikethrough on completed items

When a row's status is `complete`, the **Description** cell renders with
`text-decoration: line-through` and a muted colour. Other cells (ID, Score,
Dates, etc.) remain at normal weight so the row stays scannable. The effect
is purely CSS-driven from the live status — no extra state, no migration.

`parked` and `rejected` are **not** struck through; they're suppressed by the
default filter instead.

## Out of scope

- Reordering columns, hiding columns, user-configurable column sets.
- Changing the `STATUS_VALUES` enum or any persistence format.
- Changing the per-row status edit dropdown options.
- Changing the group-by-epic view's column set (it inherits whatever the
  table renders).
- Per-axis (V/M/A) sorting.

## Acceptance criteria

1. **Column count**: header row shows ten columns, not twelve. The four
   scoring columns are replaced by one **Score** column; the two date columns
   are replaced by one **Dates** column.
2. **Score sort**: clicking the Score header sorts by `Total`. Indicator
   behaviour matches today's Total column.
3. **Default sort**: on first load (no user sort applied), rows are ordered
   by `Updated` descending.
4. **Phase filter**: selecting **Active** shows only rows whose status is
   `implementing` or `blocked`. Selecting **Triage** shows only
   `needs-interview` or `proposed`. Selecting **(any)** with the checkbox off
   excludes Done-phase rows.
5. **Completed toggle**: with Phase = **(any)** and checkbox **off**,
   `complete` / `parked` / `rejected` rows are hidden. Toggling the checkbox
   on reveals them. Selecting Phase = **Done** auto-checks and disables the
   checkbox.
6. **Strikethrough**: a row whose status is `complete` renders its
   Description text with line-through styling; toggling its status away from
   `complete` (via the inline editor) removes the styling without a reload.
7. **No regressions**: existing E2E specs (`browse.spec.ts`,
   `interaction.spec.ts`) still pass after their column-count / filter-label
   assertions are updated to match the new layout.

## Coordination note for parallel tasks

Other backlog-editor work starting now should:

- Treat the column set as **ten columns** post-merge (Score and Dates each
  count as one).
- Reference filter state as `{ phase, includeCompleted }` rather than the
  current single `status`.
- Assume `complete` rows are hidden by default.
- Not depend on per-axis V/M/A column sorting.

If this spec is rejected or amended before merge, those tasks fall back to
the current twelve-column layout.
