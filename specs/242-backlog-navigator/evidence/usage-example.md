# Usage Example — Backlog Navigator

A reviewer triages a batch of proposed items and pushes the changes as a single PR.

## 1. Open the navigator

Navigate to `https://debrief.github.io/debrief-future/backlog-navigator/` (production)
or the per-PR preview URL surfaced in the **Backlog Navigator** sticky comment on
any PR that touches `BACKLOG.md`. The navigator loads `BACKLOG.md` from `main`
(or, in PR mode `?pr=NNN`, from the PR's head branch).

## 2. Browse, filter, group

The navigator renders all ~200 items as a sortable table. The reviewer can:

- **Sort** by ID / Total / Updated / Created (column-header click toggles direction).
- **Filter** by Status / Category / Epic / Complexity (dropdowns) or free-text
  (substring search across ID + category + description + status). Free-text
  matches inside collapsed Description cells auto-expand the matching row.
- **Group by epic** — switch to grouped view to see per-epic `done/total`
  counts and a progress bar.
- **Expand / collapse** Description cells per-row or via the column-header
  expand-all toggle. Markdown links inside descriptions are clickable.

## 3. Sign in and stage edits

On the first edit, the navigator prompts for a GitHub PAT (classic, `repo`
scope). The token is stored only in the device's `localStorage` under the
namespace `backlog-navigator:github-pat`.

Click any cell to open a context-sensitive editor:

| Column | Editor |
|--------|--------|
| ID | Numeric input + collision warning |
| Status | Dropdown (workflow values, excluding `parked`/`rejected`) |
| Complexity | Dropdown (Low / Medium / High) |
| V / M / A / Total | Score picker (`-` / 1 / 3 / 5) |
| Epic | Dropdown of defined epics + `(none)` |
| Category | Combobox (existing values + free-text fallback) |
| Description | Multi-line textarea |
| Created / Updated | Native date input |

Each staged edit:
- Visually flags the cell + row as modified (warning-coloured background).
- Adds a `PendingEdit` to `localStorage` under `backlog-navigator:pending-edits:v1`,
  surviving page reloads.
- Auto-stamps `Updated` with today's date.
- Increments the footer counter — "5 pending edits" — with **Push Changes** and
  **Discard all** buttons.

Right-click a modified cell to undo that edit specifically (LIFO undo via the
edit list).

## 4. Open the Push dialog

Clicking **Push Changes** opens a modal with:

- **PR title** — auto-generated from the structured summary
  (e.g. `Backlog: 3 status changes, 1 ID rename, 2 epic reassignments`).
  Editable.
- **PR body** — auto-generated, editable.
- **Structured summary** — rendered tally by edit kind.
- **Show raw diff** toggle — synthesises a unified diff via `jsdiff` between
  the parsed-then-reserialised baseline and the parsed-then-edited-then-reserialised
  candidate. Reviewers can scan exactly what would land in `BACKLOG.md`.

If any pending ID rename produces a collision, the Confirm button is disabled
and a banner surfaces the duplicate IDs.

## 5. Confirm

- **Live mode** (default `main` deployment): navigator creates a fresh branch
  `backlog-navigator/<slug>-<date>` from `main`'s HEAD, commits the candidate
  `BACKLOG.md` with the baseline SHA (so 409 Conflict signals stale base), then
  opens a PR against `main`. Reports the PR URL and clears staging.
- **PR mode** (`?pr=NNN`): commits onto the PR's head branch directly. No new
  branch, no second PR.
- **Dry-run mode** (`?dryRun=1` or `VITE_BACKLOG_NAV_DRY_RUN=true` build):
  the dialog renders identically (summary + diff), but Confirm is a no-op —
  the structured summary banner reads "Preview submission acknowledged — no PR
  opened" and staging is preserved so the reviewer can re-open the dialog.

Failures (network, 401, 409 stale-base, 403 missing scope) preserve staging
and surface an actionable error banner.
