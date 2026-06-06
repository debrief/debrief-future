---
feature: 242-backlog-navigator
captured_at: 2026-05-02T09:35:00Z
git_sha: 3afc364
tests_passed: 63
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test summary — Backlog Navigator

## Vitest unit tests (apps/backlog-navigator) — 51 tests

```
✓ src/__tests__/types.test.ts                        (8 tests)
✓ src/parser/__tests__/parseBacklog.test.ts          (7 tests)
✓ src/parser/__tests__/liveBacklog.roundtrip.test.ts (2 tests)
✓ src/state/__tests__/pendingEdits.test.ts           (5 tests)
✓ src/state/__tests__/deploymentMode.test.ts         (4 tests)
✓ src/state/__tests__/push.test.ts                   (9 tests)
✓ src/components/editors/__tests__/CellEditors.test.tsx (14 tests)
✓ src/format/__tests__/summary.test.ts               (2 tests)

Test Files  8 passed (8)
     Tests 51 passed (51)
```

## Playwright E2E (apps/backlog-navigator/e2e) — 12 tests

```
✓ a11y.spec.ts                  (2 tests, axe-core)
✓ browse.spec.ts                (6 tests, screenshot evidence)
✓ interaction.spec.ts           (1 test, video → GIF)
✓ prMode.spec.ts                (2 tests, ?pr=NNN)
✓ realWrite.spec.ts             (1 test, live-mode 4-call sequence)

12 passed (24s wall clock)
```

## Coverage by suite

| Suite | Tests | Verifies |
|-------|------:|----------|
| `types.test.ts` | 8 | Branded primitive narrowing helpers (`asItemId`, `asEpicId`, `asIsoDate`, `asSha`, `asStatus`, `asScoreCell`, `asTotal`) — happy path + malformed input |
| `parseBacklog.test.ts` | 7 | Splitter (incl. escaped pipes), strikethrough unwrap, parse with prose preservation, byte-for-byte fixture round-trip, malformed-row passthrough |
| `liveBacklog.roundtrip.test.ts` | 2 | **CI gate** — parse + serialise the live `BACKLOG.md` (90.7 KB, ~209 rows) and assert byte-for-byte equality |
| `pendingEdits.test.ts` | 5 | Status edit + Updated stamping, ID rename + literal regen, collision detection, post-edit serialisation, ID rewrite across edits |
| `deploymentMode.test.ts` | 4 | URL `?dryRun=1` + `?pr=NNN` parsing |
| `push.test.ts` | 9 | **Live-mode 4-call sequence**, dry-run no-op, PR-mode commit, 409 stale-base, 403 missing-scope, 422 branch-already-exists retry, pre-flight collision blocking, auth-missing branch, **PAT redaction in error messages (Article X)** |
| `CellEditors.test.tsx` | 14 | Per-editor controlled-component contract, aria-label / labelled-by, escape-to-cancel, dropdown options (no `parked`/`rejected`), score sentinel, collision-warning badge |
| `summary.test.ts` | 2 | Tally-by-edit-kind aggregation + deterministic textual rendering |
| `a11y.spec.ts` | 2 | axe-core WCAG 2 AA on browse view + Push dialog (zero serious violations) |
| `browse.spec.ts` | 6 | Screenshot evidence of dry-run shell, browse table, group-by-epic, edit controls, push dialog (with + without diff toggle), dry-run banner |
| `interaction.spec.ts` | 1 | Video recording of stage-edits → push-dialog → dry-run-confirm flow (converted to GIF for blog post) |
| `prMode.spec.ts` | 2 | `?pr=NNN` loads `BACKLOG.md` from PR head branch + invalid PR surfaces error |
| `realWrite.spec.ts` | 1 | Full live-mode push: GET ref/heads/main → POST git/refs → PUT contents → POST pulls, success banner with PR URL |

## Key scenarios verified

- **Round-trip invariant** holds against the post-refactor `BACKLOG.md` (the contract's flagship CI gate).
- **Live-mode push 4-call sequence** runs in correct order with the baseline SHA threaded through to detect staleness.
- **Stale-base, missing-scope, branch-collision, auth-missing** failure paths each return their distinct `PushResult` kind without leaking PAT in error messages.
- **PR mode** commits onto `head.ref` directly with no second PR.
- **WCAG 2 AA** colour contrast met on every text element of the browse view + Push dialog.
- **Dry-run mode** confirms with no fetch calls and preserves staging.
- **Strikethrough enforcement** — edits that flip Status to/from `complete` add/remove `~~...~~` wrapping at serialise time.
- **ID literal preservation** — `061` stays `061` on round-trip; renaming pads the new ID to 3 digits.
- **Pipe escaping** — cells containing `|` parse as `\|` and re-serialise unchanged.
- **Legacy / dirty data tolerance** — rows that fail strict narrowing pass through as opaque `RawRow` strings.
- **Article X PAT discipline** — explicit unit test asserts the PAT never appears in thrown error messages.

## Known limitations / followups

- **13 backfill misses** — item rows fell back to the sentinel `2025-01-01` Created date (recorded in `evidence/backfill-misses.txt`). Visually flagged in the navigator UI.
- **Score validation** — the canonical scoring rubric is `1/3/5/-`, but the live BACKLOG.md contains intermediate scores (`2`, `4`). The parser permits any integer to keep round-trip stable; the editor's ScorePicker exposes only the canonical options.
- **Mobile / tablet UX** — desktop-only by design at launch (#244 captures the follow-up to deliver mobile parity as a PWA).
