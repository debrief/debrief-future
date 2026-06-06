# BACKLOG.md schema refactor — before / after

The Backlog Navigator's typed parser requires a stable, well-formed `BACKLOG.md`
to operate over. This is the additive one-shot refactor that landed alongside
the navigator.

## Items table — before

```text
| ID | Category | Description | V | M | A | Total | Complexity | Status |
|----|----------|-------------|---|---|---|-------|------------|--------|
| 235 | Research Spike | [[E13] NL Co-pilot ...] — ... | - | - | - | - | Low | proposed |
```

## Items table — after

```text
| ID | Category | Description | V | M | A | Total | Complexity | Status | Epic | Created | Updated |
|----|----------|-------------|---|---|---|-------|------------|--------|------|---------|---------|
| 235 | Research Spike | [[E13] NL Co-pilot ...] — ... | - | - | - | - | Low | proposed | E13 | 2025-01-01 | 2026-04-28 |
```

Three additive columns:

| Column | Type | How populated |
|--------|------|---------------|
| `Epic` | `E##` or empty | Backfilled from existing `[[E##]` prose tags inside `Description` (mechanical pass) |
| `Created` | YYYY-MM-DD | Backfilled from `git log --reverse --diff-filter=A -G "^~?~?\| (~~)?<id>(~~)? \|"` — sentinel `2025-01-01` for misses |
| `Updated` | YYYY-MM-DD | Backfilled from `git log -1 -G "^~?~?\| (~~)?<id>(~~)? \|"` — sentinel matches Created on misses |

## Epics table — before

```text
| ID | Title | Description | Status | Items |
|----|-------|-------------|--------|-------|
| E01 | Tool Implementation Sequence | ... | approved | ~~#062~~, #063, #064, ... |
| ~~E02~~ | ~~PROV Logging Implementation~~ | ~~[...]~~ | ~~complete~~ | ~~#070, ..., #076~~ |
| 024 | [Storyboarding Briefings](docs/ideas/...) | ... | specified | #215, #216, ... |
```

## Epics table — after

```text
| ID | Title | Description | Status |
|----|-------|-------------|--------|
| E01 | Tool Implementation Sequence | ... | approved |
| E02 | PROV Logging Implementation | [...] | complete |
| E13 | [Storyboarding Briefings](docs/ideas/...) | ... | specified |
```

Three normalisations:

1. **Removed strikethrough.** Per-cell `~~...~~` wrappers were stripped on
   completed Epic rows; `Status` is the sole source of truth for completion.
2. **Renamed `024` → `E13`.** The legacy ID is renamed to its `E##` form so
   the parser can validate `^E\d{2}$` uniformly.
3. **Dropped the `Items` column.** Item-membership is now derived by the
   navigator at render time by joining items on the `Epic` column.

## Refactor stats

| Metric | Value |
|--------|------:|
| Items rows touched | ~209 |
| Item rows with Epic backfilled from `[[E##]` | ~30 |
| Item rows where Created came from git history | ~196 |
| Item rows that fell back to sentinel `2025-01-01` | 13 |
| Epic rows whose strikethrough was removed | 3 (E02, E05, E08) |
| Epic rows renamed (`024` → `E13`) | 1 |

The 13 backfill-miss IDs are listed in `backfill-misses.txt`; they are mostly
items whose first commit predates the row-detection regex's stability or
items that were renumbered.

## Round-trip proof

The parser's `liveBacklog.roundtrip.test.ts` asserts byte-for-byte equality of
`serializeBacklog(parseBacklog(text)) === text` against the post-refactor
`BACKLOG.md` (90,750 bytes, 261 table rows). This gate runs in CI on every
PR; any change that breaks the invariant fails the build.
