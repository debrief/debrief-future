# Contract — `BACKLOG.md` format (post-refactor)

This document describes the exact format the navigator's parser/serialiser expects after the schema refactor lands. The refactor is additive and one-shot; existing content is preserved bit-for-bit outside the two structured tables.

## Document structure

```text
# Backlog
<prose, scoring criteria, workflow tables, etc. — opaque to navigator>

## Epics

<epic-prose intro>

| ID | Title | Description | Status |
|----|-------|-------------|--------|
| E01 | ... | ... | approved |
| E02 | ... | ... | complete |
...

## Items

<items-prose intro + format comment>

| ID | Category | Description | V | M | A | Total | Complexity | Status | Epic | Created | Updated |
|----|----------|-------------|---|---|---|-------|------------|--------|------|---------|---------|
| 235 | Research Spike | [...](url) — text | - | - | - | - | Low | proposed | E13 | 2026-04-15 | 2026-05-02 |
...

## Categories

<categories list — opaque>

## Notes

<notes — opaque>
```

The navigator's parser produces a `BacklogDocument` with three opaque string fields (`preamble`, `midamble`, `postamble`) that pass through everything outside the two structured tables byte-for-byte.

## Items table — column contract

Twelve columns in this exact order:

| # | Column | Type | Validation |
|---|--------|------|------------|
| 1 | `ID` | integer | Unique within the file. Editable; collisions blocked at push. |
| 2 | `Category` | string | Free-text; navigator surfaces existing values as a combobox. |
| 3 | `Description` | Markdown string | Opaque GitHub-Flavored Markdown. May contain `[Title](url)` links, `[[E##]` prose tags, parenthetical notes, em-dashes. Pipe characters MUST be escaped as `\|` (today's `BACKLOG.md` does not currently exercise this case). |
| 4 | `V` | `1 \| 3 \| 5 \| -` | The literal `-` is permitted for unscored research-spike rows. |
| 5 | `M` | `1 \| 3 \| 5 \| -` | as `V`. |
| 6 | `A` | `1 \| 3 \| 5 \| -` | as `V`. |
| 7 | `Total` | integer or `-` | When all of V/M/A are scored, the navigator warns (does not block) if `Total !== V + M + A`. |
| 8 | `Complexity` | `Low \| Medium \| High` | exact case match. |
| 9 | `Status` | enum (see below) | One of the workflow values listed in `## Workflow`. |
| 10 | `Epic` | `E##` or empty | Resolves to a row in the `## Epics` table when non-empty. |
| 11 | `Created` | `YYYY-MM-DD` | Sentinel `2025-01-01` indicates a backfill miss; visually flagged in the UI. |
| 12 | `Updated` | `YYYY-MM-DD` | Stamped on every navigator-or-agent edit. |

**Status enum**: `needs-interview | proposed | approved | specified | clarified | planned | tasked | implementing | complete | blocked`. The navigator does NOT include `parked` and `rejected` in its dropdown — those workflow states remove the row from the table entirely (per existing `BACKLOG.md` convention; rows live in `STRATEGY.md` instead).

**Strikethrough convention**: A row whose `Status === 'complete'` MUST be wrapped in `~~...~~` (entire row, leading and trailing pipes inclusive). Example:

```text
~~| 062 | Tool | [...](spec.md) | 5 | 3 | 5 | 13 | Low | complete | E01 | 2026-02-10 | 2026-04-21 |~~
```

The navigator enforces this on serialisation: setting `Status` to `complete` adds the wrapping; changing it away removes it. Idempotent — editing a non-status cell on an already-complete row preserves the wrapping.

## Epics table — column contract (post-refactor)

Four columns in this exact order:

| # | Column | Type | Validation |
|---|--------|------|------------|
| 1 | `ID` | `E##` | Pattern `^E\d{2}$`. Unique within the file. The legacy `024` row is renamed to its `E##` equivalent during the refactor. |
| 2 | `Title` | Markdown string | May contain a `[Title](url)` link. |
| 3 | `Description` | Markdown string | Free prose. |
| 4 | `Status` | enum | Same workflow values as Items. **This is the sole source of truth for completion** — strikethrough on Epic rows is removed by the refactor. |

**Removed from the Epics table**: the comma-separated `#NNN, ~~#NNN~~` Items column. Items membership is now derived by the navigator from the Items table's `Epic` column at render time, and is NOT persisted in `BACKLOG.md`.

## Round-trip invariant (CI-tested)

For every byte sequence `text` that parses successfully:

```text
serializeBacklog(parseBacklog(text)) === text
```

The CI suite runs this against the live `BACKLOG.md` on every PR. Any change that breaks the invariant is a parser/serialiser bug, not a content bug.

When a navigator edit applies, only the touched cell(s) and (if `Status` toggles to/from `complete`) the row's strikethrough wrapping change. No whitespace re-flow, no column-width realignment, no header rewrite.

## Migration from pre-refactor format

The refactor is one commit performed before the navigator ships:
1. Add the three columns to the Items table header + separator.
2. For each row, parse the existing `[[E##]` prefix from `Description` (if present) → write to `Epic` column. Otherwise leave `Epic` empty.
3. Run `scripts/backfill-backlog-dates.py` to populate `Created` and `Updated` from git history (or sentinel).
4. Rename Epics row `024` to its `E##` form.
5. Remove strikethrough wrapping from any Epic rows; assert `Status === 'complete'` is set on those rows.
6. Remove the comma-separated Items column from the Epics table.

After the refactor commit, the navigator's parser refuses to parse any file whose header rows do not match the post-refactor column contracts. This is by design: the navigator and the file format are versioned together.

## Pipe-escape handling

The parser converts `\|` to `|` inside cells; the serialiser converts `|` to `\|` inside cell values. Line-leading / line-trailing pipes (the column separators) are unescaped.

The current `BACKLOG.md` does not contain any `\|`-escaped pipes. The parser supports the case defensively; tests cover both presence and absence.
