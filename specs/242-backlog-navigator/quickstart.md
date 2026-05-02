# Quickstart — Backlog Navigator

Once `apps/backlog-navigator/` lands, this is how a developer or reviewer exercises the feature end-to-end.

## Local dev

```sh
pnpm install
pnpm --filter @debrief/backlog-navigator dev
```

The Vite dev server starts at `http://localhost:5174/` (port chosen so it doesn't collide with spec-navigator's typical port).

The dev build defaults to **dry-run mode** so local iteration cannot produce GitHub side-effects. To exercise real-write mode locally, set:

```sh
VITE_BACKLOG_NAV_DRY_RUN=false pnpm --filter @debrief/backlog-navigator dev
```

…and provide a PAT with `repo` scope when prompted.

## Manual verification — Story 1 (Browse / filter / group)

1. Load `http://localhost:5174/`.
2. Verify the items table renders all rows from the local working-copy `BACKLOG.md` (read via the dev-server's filesystem proxy, mirroring spec-navigator's `?dev` mode).
3. Click the `Total` column header — rows sort descending by Total.
4. Click again — rows sort ascending.
5. In the Status filter, choose `proposed` — only proposed rows visible.
6. Type "co-pilot" in the free-text filter — rows whose collapsed Description contains "co-pilot" are surfaced; the matching cell expands or is flagged.
7. Click the **Group by Epic** toggle — rows reorganise under per-epic header rows; each header shows `done / total` and a progress bar.
8. Click the column-header chevron on `Description` — every cell expands; click again — every cell collapses.

**Pass criteria**: every step renders within 100ms of the action; no console errors; no axe violations.

## Manual verification — Story 2 (Stage edits + dry-run push)

1. From the loaded table, click the `Status` cell of a `proposed` item — a dropdown opens with workflow values.
2. Pick `approved`. The cell visibly flags as pending; the row's outline highlights.
3. Click the `V` cell of another item — a 1/3/5 picker opens. Pick `5`.
4. Click the `Epic` cell of a third item — a picker showing every E## plus "(none)" opens. Pick a different epic.
5. Watch the footer: it now reads "3 pending edits → Push Changes".
6. Reload the page (Cmd-R) — pending edits are still present; footer still shows "3 pending edits".
7. Click **Push Changes**. Dialog opens with:
   - PR title (auto-default: `Backlog: 1 status, 1 score, 1 epic-reassignment`).
   - PR body (empty by default, editable).
   - Structured summary: "1 status change, 1 score adjustment, 1 epic reassignment".
   - Raw-diff toggle: clicking it reveals the unified diff that *would* be committed.
8. (Dry-run mode is the default for local dev.) Click the confirm control — its label reads "Preview submission" rather than "Open PR". The dialog closes; a confirmation banner says "Preview submission acknowledged — no PR opened"; pending edits remain staged.

**Pass criteria**: no GitHub network call is made (verify in the Network tab); pending edits persist after the dialog closes.

## Manual verification — Story 3 (PR mode)

1. With the dev server running, open `http://localhost:5174/?pr=242` (or any PR number that touches `BACKLOG.md`).
2. Banner appears: "Editing PR #242 — head branch `claude/...`".
3. Make one cell edit; push (still dry-run by default in dev).
4. Dialog confirm reads "Preview submission to PR #242 head branch" — confirming the destination differs.

## Real-write smoke test (against a sandbox repo or a throwaway PR)

1. Fork the repo or create a sandbox repo with a copy of `BACKLOG.md`.
2. Run with `VITE_BACKLOG_NAV_DRY_RUN=false`.
3. Set a PAT with `repo` scope when prompted.
4. Stage two edits, push, and verify a PR opens against the sandbox repo's `main` with a single commit whose diff modifies exactly the rows touched.
5. Reset the staging baseline by reloading; verify the staging area is now empty (because the previous push cleared it on success).

## Schema-refactor smoke test (run once, before the navigator ships)

```sh
python scripts/backfill-backlog-dates.py
```

The script:
1. Reports how many items it processed.
2. Writes `scripts/backfill-misses.txt` listing IDs that fell back to the sentinel date.
3. Modifies `BACKLOG.md` in place (idempotent).

After running, `git diff BACKLOG.md` shows only:
- Three new columns added to the Items table header + separator.
- Three new cells added per existing item row (most populated, ≤10% sentinel).
- Epic column populated for items with `[[E##]` prose tag.
- Epics row `024` renamed to `E##`.
- Strikethrough wrapping removed from completed Epic rows; their `Status` cells now read `complete`.
- Items column removed from the Epics table.

Commit the result on a feature branch; the navigator parses it cleanly.

## CI-equivalent local run

```sh
pnpm --filter @debrief/backlog-navigator typecheck      # tsc --noEmit
pnpm --filter @debrief/backlog-navigator lint           # eslint src
pnpm --filter @debrief/backlog-navigator test           # vitest
cd apps/backlog-navigator && node run-playwright.mjs    # E2E (cloud-friendly)
```

These four commands are exactly what `task verify` runs in addition to the existing project gates.

## Acceptance scenario coverage

| Scenario | Where verified |
|----------|----------------|
| Story 1 #1–5 (browse) | `e2e/browse.spec.ts` |
| Story 2 #1–7 (stage + push) | `e2e/edit.spec.ts` + `e2e/push-dryrun.spec.ts` |
| Story 2 #8 (dry-run round-trip) | `e2e/push-dryrun.spec.ts` |
| Story 3 #1–3 (PR mode) | `e2e/pr-mode.spec.ts` |
| FR-001..FR-007 (schema refactor) | `scripts/backfill-backlog-dates.py` integration test + parser round-trip CI gate |
| FR-018 (strikethrough on/off) | parser/serialiser unit tests |
| FR-025 (stale base refusal) | mocked-API E2E test |
| Constitution Article XV (strict types) | `pnpm typecheck` CI gate |
| Constitution Article XI (i18n) | `src/strings.ts` discipline; lint rule against literal user-facing strings in JSX (manually reviewed at PR time) |
