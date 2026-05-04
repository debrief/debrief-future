# Round-trip byte-parity evidence (FR-015 / SC-009)

Every edit constructed by the mobile path (bottom-sheet or description
editor) must produce byte-identical `BACKLOG.md` output to the same
edit constructed by the desktop path. This file summarises the gating
tests; full output is reproducible via `pnpm vitest run` in
`apps/backlog-navigator/`.

## Mechanism

- Mobile bottom-sheet save:
  `EditorOverlayProvider.saveBottomSheet()` → constructs
  `PendingEdit { kind: 'item-cell', itemId, column, before, after, stagedAt }`
  → `store.stageEdit(edit)`.
- Desktop inline editor save:
  `ItemRow.commit()` → constructs the **same** `PendingEdit` shape →
  `store.stageEdit(edit)`.
- Both paths feed the unmodified `applyPendingEdits()` reducer and the
  unmodified `serializeBacklog()` serialiser.

If the constructed edit is byte-identical, the output is byte-identical
by construction. The tests below run the SAME inputs through both
construction paths and diff-assert the resulting `BACKLOG.md` text.

## Gating tests

### Bottom sheet — `byteParityBottomSheet.test.tsx` (5 tests)

| Scenario | Input | Mobile output == Desktop output? |
|----------|-------|----------------------------------|
| Status edit | `proposed → approved` on row 001 | ✅ identical |
| Category edit | `Feature → Tech Debt` on row 001 | ✅ identical |
| Score edit (V) | `5 → 3` on row 001 | ✅ identical |
| Epic reassignment | `(none) → E02` on row 002 | ✅ identical |
| Mixed (3 edits applied in order) | status + score + category | ✅ identical |

### Description editor — `byteParityDescription.test.tsx` (4 tests)

| Scenario | Description content | Round-trip stable? |
|----------|---------------------|---------------------|
| Plain Markdown | `'Backlog Navigator — full mobile parity.'` | ✅ |
| Embedded Markdown link | `'See [spec](path/spec.md) for details.'` | ✅ |
| Escaped pipe `\|` | `'cell with literal pipe like a \\| b.'` | ✅ |
| Clean save (no value change) | (empty edit list) | ✅ — re-serialise byte-stable |

## Live BACKLOG.md round-trip (#242 inheritance)

The pre-existing `liveBacklog.roundtrip.test.ts` continues to gate the
production file: `parse(BACKLOG.md) → serialise → parse → serialise`
must be byte-identical. Both tests pass after #244 lands.

## Verdict

FR-015 and SC-009 satisfied. Mobile-originated edits do not introduce
any divergence from desktop in the `BACKLOG.md` output.
