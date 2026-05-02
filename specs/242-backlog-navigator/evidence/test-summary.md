---
feature: 242-backlog-navigator
captured_at: 2026-05-02T08:43:00Z
git_sha: 8fa978b
tests_passed: 28
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test summary — Backlog Navigator

## Vitest unit tests (apps/backlog-navigator)

```
RUN  v1.6.1 /home/user/debrief-future/apps/backlog-navigator

✓ src/__tests__/types.test.ts             (8 tests)
✓ src/parser/__tests__/parseBacklog.test.ts (7 tests)
✓ src/parser/__tests__/liveBacklog.roundtrip.test.ts (2 tests)
✓ src/state/__tests__/pendingEdits.test.ts (5 tests)
✓ src/state/__tests__/deploymentMode.test.ts (4 tests)
✓ src/format/__tests__/summary.test.ts    (2 tests)

Test Files  6 passed (6)
     Tests 28 passed (28)
```

## Suite breakdown

| Suite | Tests | Verifies |
|-------|------:|----------|
| `types.test.ts` | 8 | Branded primitive narrowing helpers (`asItemId`, `asEpicId`, `asIsoDate`, `asSha`, `asStatus`, `asScoreCell`, `asTotal`) — happy path + malformed input |
| `parseBacklog.test.ts` | 7 | Splitter (incl. escaped pipes), strikethrough unwrap, parse with prose preservation, byte-for-byte fixture round-trip, malformed-row passthrough |
| `liveBacklog.roundtrip.test.ts` | 2 | **CI gate** — parse + serialise the live `BACKLOG.md` (90.7 KB, 200+ rows) and assert byte-for-byte equality |
| `pendingEdits.test.ts` | 5 | Status edit + Updated stamping, ID rename + literal regen, collision detection, post-edit serialisation, ID rewrite across edits |
| `deploymentMode.test.ts` | 4 | URL `?dryRun=1` + `?pr=NNN` parsing |
| `summary.test.ts` | 2 | Tally-by-edit-kind aggregation + deterministic textual rendering |

## Key scenarios verified

- **Round-trip invariant** holds against the post-refactor `BACKLOG.md` (the contract's flagship CI gate).
- **Strikethrough enforcement** — edits that flip a row's Status to/from `complete` add/remove `~~...~~` wrapping at serialise time.
- **ID literal preservation** — `061` stays `061` on round-trip; renaming pads the new ID to 3 digits.
- **Pipe escaping** — cells containing `|` parse as `\|` and re-serialise unchanged.
- **Legacy / dirty data tolerance** — rows that fail strict narrowing (composite IDs like `091-E05`, non-standard statuses like `subsumed`) are preserved as opaque raw rows so round-trip stays byte-stable while the editor only operates on cleanly-typed rows.
- **Collision detection** — renaming an ID to a value already in the document is flagged by `detectCollisions()`; the Push dialog blocks confirmation when collisions are present.

## Known issues / followups

- **Playwright E2E** — `e2e/browse.spec.ts` covers the dry-run shell. Full Story 1/2/3 acceptance scenarios are stubs and need fleshing out (T097/T098/T110 in `tasks.md`).
- **Backfill misses** — 13 item rows fell back to the sentinel `2025-01-01` Created date because their first commit predates the regex's stability or the row was renumbered. Recorded in `evidence/backfill-misses.txt`. Visually flagged in the navigator UI.
- **Score validation** — the canonical scoring rubric is `1/3/5/-`, but the live BACKLOG.md contains intermediate scores (`2`, `4`). The parser permits any positive integer to keep round-trip stable; the editor's ScorePicker exposes only the canonical options.
