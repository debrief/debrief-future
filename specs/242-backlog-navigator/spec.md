# Feature Specification: Backlog Navigator

**Feature Branch**: `242-backlog-navigator`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Backlog Navigator — interactive UI for BACKLOG.md, with browsing (sort/filter/group-by-epic + epic progress), context-sensitive editing of all columns including ID, staged edits in localStorage, deliberate Push Changes action that opens a PR (or commits onto an in-flight PR via `?pr=NNN`), and an additive schema refactor adding `Epic` / `Created` / `Updated` columns plus an Epics-table normalisation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse, filter, and group the live backlog (Priority: P1)

An analyst (or the-ideas-guy reviewing scored items) opens the Backlog Navigator in a browser, sees every item from `BACKLOG.md` rendered as an interactive table, sorts by priority (`Total`) descending, filters to `Status = approved`, expands the `Description` cells they want context on, then switches to "group by epic" to see how each in-flight epic is progressing. No editing, no auth, no GitHub round-trip — pure read-only navigation against the document on `main`.

**Why this priority**: This is the foundational slice. It delivers immediate value (the current `BACKLOG.md` is hard to triage at ~230 rows in a flat table) and is a precondition for the editing slices: you must be able to find a row before you can edit it. It is also the only slice that needs the schema refactor to be in place, so it forces that work to ship.

**Independent Test**: Stand up the navigator, point it at the live `BACKLOG.md` (the version on `main` with the additive columns + backfill landed), and verify a reviewer can: (a) sort by each of the four sort keys, (b) apply a structured filter on `Status` and a free-text filter that matches text inside a collapsed `Description` cell, (c) switch to group-by-epic and see per-epic `done/total`, (d) expand an individual `Description` cell and use "expand all" from the column header. No write path is exercised.

**Acceptance Scenarios**:

1. **Given** the navigator is loaded against `main`, **When** the reviewer sorts by `Total` descending then filters `Status = proposed`, **Then** only proposed items appear, ordered by descending Total, with all other columns intact.
2. **Given** the reviewer types text into the free-text filter that occurs only inside a long, collapsed description, **When** the filter applies, **Then** the matching row is shown and the matched description cell auto-expands (or is visually flagged) so the match is visible.
3. **Given** the reviewer switches to group-by-epic view, **When** the view renders, **Then** each epic row shows a derived `done / total` count plus a progress indicator, items without an epic appear in an "(unassigned)" group, and the per-epic counts match a manual count of complete vs total items in that epic.
4. **Given** a reviewer toggles the column-header "expand all" control on `Description`, **When** they toggle it again, **Then** all `Description` cells return to their default truncated state.
5. **Given** the items table contains rows whose `Description` includes Markdown links, `[[E##]` epic tags, and parenthetical dependency notes, **When** the navigator renders the cell, **Then** Markdown links are clickable, plain text is readable, and the truncated form preserves the leading title rather than mid-link bytes.

---

### User Story 2 — Stage edits and push as a single PR (Priority: P2)

A reviewer triages a batch of proposed items, flipping three to `approved`, fixing one accidental `ID` collision, reassigning two items to a different epic, and tightening the wording of one `Description`. They stage each edit in the navigator (modified cells visibly flagged, per-edit undo available), see "7 pending edits" in the footer, click **Push Changes**, fill in a PR title and body, eyeball the structured summary ("3 status changes, 1 ID rename, 2 epic reassignments, 1 description edit") and confirm. The navigator commits all seven edits as a single commit on a new branch and opens a PR against `main`.

**Why this priority**: This is the headline write capability and the reason the navigator exists rather than a static viewer. It depends on Story 1 (you must be able to navigate to the rows you want to edit) and on a working PAT + repo-scope auth path. It does not depend on Story 3.

**Independent Test**: Authenticate with a `repo`-scoped PAT, stage a mix of edit types (status, ID, epic, score, description, complexity, category, created/updated date) covering every column type, push, and verify a PR opens against `main` with a single commit whose diff modifies exactly the rows touched, the strikethrough convention is applied/removed correctly when `Status` flips to/from `complete`, and the PR body matches the user-supplied title/body.

**Acceptance Scenarios**:

1. **Given** an unauthenticated reviewer, **When** they attempt to stage their first edit, **Then** the navigator prompts for a PAT (with `repo` scope), explains where to obtain one, stores it in the same `localStorage` namespace as the existing spec-navigator PAT, and only then permits the edit.
2. **Given** a reviewer has staged five edits, **When** they reload the page, **Then** the staged edits are still present and clearly flagged as pending, and the footer shows "5 pending edits".
3. **Given** a reviewer has staged edits, **When** they click **Push Changes**, **Then** a dialog appears with PR title (defaulting to a sensible auto-generated string), PR body, a structured summary of the edits grouped by edit type, and a raw-diff toggle showing the exact `BACKLOG.md` diff that will be committed.
4. **Given** the user confirms the push, **When** the navigator runs, **Then** a new branch is created from `main`'s current `HEAD`, all staged edits are committed in a single commit, a PR is opened against `main`, the navigator reports the PR URL, and the local staging area is cleared.
5. **Given** a reviewer changes an item's `Status` to `complete`, **When** they push, **Then** the resulting `BACKLOG.md` row is rendered with the project's existing strikethrough convention (entire row wrapped). Conversely, changing it away from `complete` removes the strikethrough.
6. **Given** a reviewer renames an item's `ID` to a value already used by another row, **When** they attempt to commit the edit (or push), **Then** the navigator surfaces a collision warning at edit time and blocks the push until the collision is resolved.
7. **Given** a reviewer has staged edits and the network fails during push, **When** the failure is reported, **Then** the staged edits are preserved exactly as they were (nothing is silently lost) and the reviewer can retry.
8. **Given** the navigator is loaded in dry-run mode (e.g. on a per-PR preview deployment), **When** the reviewer stages edits and clicks **Push Changes** then confirms, **Then** the dialog clearly indicates this is a preview, the structured summary and raw diff render exactly as they would in real-write mode, no commit/branch/PR is created, and the staging area is preserved so the reviewer can re-open the dialog to re-verify the output.

---

### User Story 3 — Edit a backlog change inside an in-flight PR (Priority: P3)

A second reviewer is reviewing an open PR that touches `BACKLOG.md`. They open the navigator with `?pr=NNN`, the navigator fetches `BACKLOG.md` from that PR's head branch, they tweak two cells (e.g. fixing a typo in a description and flipping a status), click **Push Changes**, and the navigator commits onto the PR's branch rather than opening a new one. The PR's diff updates in place; no second PR is created.

**Why this priority**: A meaningful but narrower workflow — useful for spec-authoring round-trips and for collaborative refinement of in-flight changes — but lower volume than Stories 1 and 2.

**Independent Test**: With an open PR that modifies `BACKLOG.md`, load the navigator at `?pr=NNN`, stage two edits, push, and verify a new commit lands on the PR's head branch (no new branch, no new PR), the in-flight PR's combined diff reflects both the original and new edits, and the staging area is cleared.

**Acceptance Scenarios**:

1. **Given** the URL contains `?pr=NNN` for an open PR that modifies `BACKLOG.md`, **When** the navigator loads, **Then** it indicates the PR mode in the UI (banner or chip showing "Editing PR #NNN — head branch `<name>`"), reads `BACKLOG.md` from the PR's head branch, and uses that as the staging baseline.
2. **Given** the PR-mode navigator has staged edits, **When** the reviewer pushes, **Then** the commit lands on the PR's head branch, no new branch or PR is created, and the reviewer is shown the existing PR URL.
3. **Given** the URL contains `?pr=NNN` for a PR that does NOT touch `BACKLOG.md`, **When** the navigator loads, **Then** it still operates against the PR's head branch (so subsequent edits land there) and clearly tells the reviewer the PR currently has no `BACKLOG.md` changes.

---

### Edge Cases

- **Stale base** — `BACKLOG.md` on the target ref has changed between page load and push (someone else merged a backlog edit). Navigator MUST detect the change at push time, refuse the push, preserve the staged edits, and prompt the reviewer to reload and re-apply. (A 3-way structured merge is explicitly out of scope for this spec.)
- **ID rename collision** — surfaced at edit time on the cell itself, and again as a blocking error at push time if any pending edit results in a duplicate ID.
- **Status flip to/from `complete`** — strikethrough convention must be applied on flip-to-complete and removed on flip-away. Idempotent: editing a non-status cell on an already-complete row preserves the strikethrough.
- **Markdown drift** — the `Description` column may contain text the navigator's parser does not fully understand (e.g. nested tables, unusual Markdown). Display gracefully (treat unparsed content as opaque text); never silently drop content.
- **Format-violating manual edit** — a row that does not conform to the expected column count after a manual non-navigator edit. Navigator MUST surface such rows in a "couldn't parse" list rather than crashing or silently dropping them, and MUST NOT include them in any push diff.
- **localStorage exhausted** — when the staging area approaches the browser's localStorage cap, the navigator MUST warn the reviewer and recommend pushing or clearing some pending edits before staging more.
- **Multiple browser tabs** with overlapping staged edits — out of scope for v1 (last-tab-to-write wins); document the behaviour but do not synchronise across tabs.
- **PAT lacks `repo` scope** — staging is permitted (read-only auth is fine for fetching), but Push Changes MUST detect the missing scope before attempting any write and explain how to upgrade the token.
- **Empty Epic on an item** — the `Epic` column may legitimately be empty. Group-by-epic view groups such items under "(unassigned)". Filtering by Epic includes an "(unassigned)" filter value.
- **Backfill miss** — `Created` could not be derived from git history for a given row. The row uses the agreed sentinel date and is visually flagged in the navigator (e.g. with a "*" or muted styling on the cell) so reviewers can later edit it manually.

## Requirements *(mandatory)*

### Functional Requirements

#### Document model & schema refactor

- **FR-001**: The Items table in `BACKLOG.md` MUST gain three additional columns — `Epic` (string identifier matching an entry in the Epics table or empty), `Created` (ISO date `YYYY-MM-DD`), `Updated` (ISO date `YYYY-MM-DD`) — preserving the existing column set and order semantics.
- **FR-002**: A one-shot backfill MUST populate `Created` for every existing item by deriving the date the row was first added (using git history of `BACKLOG.md`), and MUST populate `Updated` from each row's most recent commit-touch.
- **FR-003**: Where `Created` cannot be derived for a row, the backfill MUST set the column to a single agreed sentinel date and MUST flag such rows so a reviewer can later correct them.
- **FR-004**: `Epic` MUST be backfilled for items whose `Description` contains an `[[E##]` prefix, by parsing that prefix; items without such a prefix MUST receive an empty `Epic` value.
- **FR-005**: The Epics table MUST be normalised so every ID matches the pattern `E##` (the existing `024` row MUST become `E##`), the explicit `Status` column MUST be the sole source of truth for completion (existing strikethrough-as-status MUST be removed from the Epics table), and the comma-separated `#NNN` Items column MUST be removed in favour of a navigator-rendered derived count.
- **FR-006**: After the refactor, existing agent tooling (`opportunity-scout`, `backlog-prioritizer`, `the-ideas-guy`, `/idea`, `/interview`, `/speckit.start`) MUST continue to read and write `BACKLOG.md` without code changes other than stamping the new columns on insert/edit (and continuing to set status, the `[[E##]` prose tag, etc., as today).
- **FR-007**: From the refactor onwards, any agent or human edit to a row MUST update that row's `Updated` column. (Enforcement mechanism — convention plus optional pre-commit hook — is a planning concern.)

#### Browsing

- **FR-008**: The navigator MUST render the Items table with sortable columns and MUST support sort keys: `ID` (numeric), `Total` (priority, numeric), `Updated` (date), `Created` (date). Sort direction (asc/desc) MUST be toggleable per key.
- **FR-009**: The navigator MUST provide a free-text filter that matches against every column's full text content (not just the visible truncated form of `Description`).
- **FR-010**: The navigator MUST provide structured filters on `Status`, `Category`, `Epic`, and `Complexity`, each with values populated from the live document plus an "(any)" option.
- **FR-011**: The navigator MUST provide a "group by Epic" view that joins each item to its Epic via the `Epic` column, displays per-epic header rows, places items without an epic in an "(unassigned)" group, and shows for each epic a derived `done / total` count plus a visual progress indicator.
- **FR-012**: The navigator MUST render the `Description` column as Markdown (links clickable, formatting preserved), MUST truncate it to a single visual line by default, MUST provide a per-row chevron to expand/collapse a single cell, and MUST provide a column-header toggle for "expand all" / "collapse all".
- **FR-013**: When a free-text filter match occurs only inside a collapsed `Description`, the navigator MUST make the match visible (auto-expand the cell, or visually flag the row).
- **FR-014**: The navigator MUST be a static single-page web application requiring no backend service, with the same deployment shape as the existing spec-navigator.

#### Editing

- **FR-015**: All columns of the Items table MUST be editable, including `ID`. The navigator MUST NOT support adding new rows (insertion remains the responsibility of `/idea`).
- **FR-016**: The navigator MUST present context-sensitive edit controls per column: dropdown for `Status` (workflow values), 1/3/5 picker for `V`/`M`/`A`, dropdown for `Complexity` (Low/Medium/High), picker for `Epic` (populated from Epics table plus "(none)"), dropdown-with-free-text-fallback for `Category`, date picker for `Created`/`Updated`, multi-line Markdown textarea for `Description`, numeric input for `ID` with collision warning.
- **FR-017**: When a reviewer edits `ID` to a value already used by another row, the navigator MUST surface a collision warning at edit time and MUST block any push containing a duplicate-ID edit.
- **FR-018**: When a reviewer changes `Status` to `complete`, the row MUST be rendered on commit using the project's existing strikethrough convention. When `Status` changes away from `complete`, the strikethrough MUST be removed.

#### Staging & push

- **FR-019**: All edits MUST accumulate in browser-local storage as pending edits. The navigator MUST persist pending edits across page reloads on the same device and browser.
- **FR-020**: The navigator MUST visually distinguish modified rows and modified cells from unmodified ones, and MUST provide a per-edit undo control.
- **FR-021**: The navigator MUST display a persistent footer (or equivalent) showing the count of pending edits and a primary **Push Changes** action.
- **FR-022**: **Push Changes** MUST open a confirmation dialog containing: an editable PR title (with sensible auto-generated default), an editable PR body, a structured summary of pending edits grouped by edit type (e.g. "3 status changes, 1 ID rename, 2 epic reassignments"), and a raw-diff toggle that reveals the exact `BACKLOG.md` diff that will be committed.
- **FR-023**: On confirmation, the navigator MUST commit all staged edits as a single commit, open a PR against `main`, report the PR URL to the reviewer, and clear the local staging area only after the push has succeeded.
- **FR-024**: If the push fails (network, auth, conflict), the navigator MUST preserve all staged edits unchanged and surface an actionable error.
- **FR-025**: If `BACKLOG.md` on the target ref has changed since the navigator loaded its baseline, the navigator MUST detect the staleness at push time, refuse the push, preserve the staged edits, and prompt the reviewer to reload and re-apply.
- **FR-026**: When the URL contains `?pr=NNN` and the PR is open, the navigator MUST read `BACKLOG.md` from that PR's head branch, indicate PR mode in the UI, and on **Push Changes** commit onto the PR's head branch (creating no new branch and no new PR).
- **FR-027**: Authentication MUST extend the existing spec-navigator PAT-in-localStorage pattern (same UX, same redaction rules, same key namespace), with the token requiring `repo` scope for write operations. Reading a public `BACKLOG.md` MUST work without a PAT; staging edits MUST require one.
- **FR-028**: The navigator MUST detect a PAT lacking `repo` scope before attempting any write and MUST explain how to upgrade the token rather than failing opaquely mid-push.

#### Dry-run mode & preview deployment

- **FR-029**: The navigator MUST support a "dry-run" mode in which the **Push Changes** dialog opens, renders the full structured summary, exposes the raw-diff toggle, and offers a confirmation control — but the confirmation does NOT call any GitHub write API and produces no commit, no branch, and no PR. The dialog MUST clearly indicate (e.g. via a banner or relabelled button such as "Preview only — no PR will be opened") that the action is non-destructive.
- **FR-030**: Dry-run mode MUST be selectable per deployment without rebuilding the application — typically via URL query parameter, build-time flag set at deploy time, or per-environment configuration. The chosen mechanism MUST be visible to the reviewer (so a reviewer in dry-run mode is never surprised that their push had no effect).
- **FR-031**: In dry-run mode the staging area MUST be preserved across the dialog confirm (so reviewers can iterate on the same set of pending edits and re-open the dialog repeatedly to verify the rendered diff). Real-write mode clears staging only after a successful API call (per FR-023); dry-run mode never clears staging from the confirm action alone.
- **FR-032**: The navigator MUST be deployable as part of the project's existing per-PR preview-deployment pipeline (Heroku Review Apps), so that any PR touching the navigator's source — or the schema-refactored `BACKLOG.md` — surfaces a preview URL where reviewers can exercise the navigator against the version of `BACKLOG.md` contained in that PR. Dry-run mode SHOULD be the default for these per-PR preview deployments.

### Key Entities

- **Backlog Item**: A single row in the `## Items` table. Attributes: `ID`, `Category`, `Description` (Markdown), `V`, `M`, `A`, `Total`, `Complexity`, `Status`, `Epic`, `Created`, `Updated`. Identified by `ID` (which is itself editable, hence the collision-detection requirement).
- **Epic**: A row in the `## Epics` table. Attributes: `ID` (always `E##` after refactor), `Title`, `Description`, `Status`. Items column derived from the join on `Epic` rather than maintained inline. Progress = (count of items with status `complete`) / (count of items in epic).
- **Pending Edit**: A staged change to a single `(item-id, column) → new value` cell, held in browser-local storage. Carries enough context to render the modified row, support per-edit undo, build the structured push summary, and synthesise the final `BACKLOG.md` diff.
- **Push Session**: The act of converting all current pending edits into a single commit (and either a new PR against `main`, or a new commit onto an in-flight PR's head branch). Carries the user-supplied title and body and the baseline file SHA used for staleness detection.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Help a reviewer (analyst, the-ideas-guy, or human maintainer) navigate, triage, and edit `BACKLOG.md` items efficiently, then commit a coherent batch of edits as a single auditable PR.
- **Key Decision(s)**:
  1. Which subset of items am I looking at right now? (sort, filter, group)
  2. For each item I touch, what is the new cell value? (status flip, score adjustment, epic reassignment, ID collision repair, description tweak)
  3. When I have a coherent batch, what should the PR title and body say, and is the structured summary of edits accurate?
- **Decision Inputs**: Sortable columns (priority, recency, age), structured filter dropdowns showing live-document-derived values, group-by-Epic with per-epic progress, expandable Markdown descriptions, modified-cell highlighting with per-edit undo, raw-diff preview before push.

### Screen Progression

| Step | Screen/State                           | User Action                                                              | Result                                                                  |
|------|----------------------------------------|--------------------------------------------------------------------------|-------------------------------------------------------------------------|
| 1    | Loaded items table (read-only by default) | Apply sort/filter/group                                                  | View narrows to the relevant subset                                     |
| 2    | Reviewer clicks a cell to edit         | Context-sensitive control opens (dropdown/picker/textarea/date)          | Cell becomes editable                                                   |
| 3    | Reviewer commits the cell change       | Cell flagged as pending; footer count increments                         | Edit accumulates in staging                                             |
| 4    | Footer shows N pending edits           | Reviewer clicks **Push Changes**                                         | Push dialog opens with title, body, summary, raw-diff toggle            |
| 5    | Reviewer confirms in dialog            | Navigator commits, opens (or updates) PR                                 | PR URL surfaced; staging cleared                                        |

### UI States

- **Empty State**: Document loaded but no rows match current filter — the navigator shows a "no items match" message with a "clear filters" affordance.
- **Loading State**: Initial document fetch and any GitHub API call (read or write) shows a non-blocking progress indicator. The push action shows a modal-blocking indicator while in flight.
- **Error State**: Auth errors, network errors, stale-base errors, ID-collision blocks, and parse-failure rows each surface as an actionable banner or inline message that explains the cause and the next step (e.g. "PAT lacks `repo` scope — open settings to update", "Backlog has moved on `main` since you loaded — reload and re-apply").
- **Success State**: After a successful push, a confirmation banner shows the PR URL (clickable) and the staging area is empty.
- **PR Mode**: When loaded with `?pr=NNN`, a persistent banner or chip indicates "Editing PR #NNN — head branch `<name>`" and the **Push Changes** action's confirmation dialog reflects the destination ("Add commit to existing PR" rather than "Open new PR").
- **Dry-run / Preview Mode**: When the deployment is configured for dry-run (typical on per-PR preview deployments), a persistent banner or chip indicates "Preview deployment — Push Changes will not commit". The Push Changes dialog renders identically to real-write mode, but the confirm control is relabelled (e.g. "Preview submission" instead of "Open PR") and dismissing the dialog leaves staging intact.
- **Pending-edits state**: Modified cells visually distinguished from unmodified ones; modified rows visually distinguished as well; per-edit undo control on each modified cell.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can locate any specific item by ID, status, or free-text search in under 10 seconds across the full ~230-row backlog, with no scrolling required to find it once the filter is applied.
- **SC-002**: A reviewer can complete a "triage 5 items: flip statuses, adjust scores, push as one PR" workflow end-to-end in under 5 minutes, including authentication on first run.
- **SC-003**: After the schema refactor and backfill, at least 90% of existing items have a non-sentinel `Created` date derived from git history; the remaining ≤10% are visibly flagged for manual correction.
- **SC-004**: For every epic, the navigator's `done / total` count matches a manually-verified count (no off-by-ones, correct treatment of items without an epic).
- **SC-005**: Existing agent workflows (`/idea`, `/interview`, `/speckit.start`, `the-ideas-guy` review, `backlog-prioritizer` scoring) run unchanged against the refactored `BACKLOG.md`, modulo stamping the new columns on insert/edit.
- **SC-006**: Pending edits survive at least one full browser reload with no loss; in particular, network failure during push leaves the staging area intact.
- **SC-007**: A round-trip "stage three edits → Push Changes → PR opened" produces a single commit whose diff modifies exactly the rows touched, no unrelated whitespace churn, and no other files.
- **SC-008**: A round-trip "load `?pr=NNN` → stage edits → Push Changes → commit appended to PR" produces no second PR and the existing PR's diff updates in place.
- **SC-009**: When the base has moved since load, push attempts are refused with an actionable message rather than producing a conflicting commit, and zero pending edits are lost in the refusal path.
- **SC-010**: Reviewers report (qualitatively) that group-by-epic + per-epic progress meaningfully improves their understanding of in-flight work, compared with the pre-refactor flat table view.
- **SC-011**: Every PR touching the navigator's source or the schema-refactored `BACKLOG.md` surfaces a preview URL where the navigator runs against that PR's version of `BACKLOG.md`, with dry-run mode active so the reviewer can exercise the full Push-Changes UX (dialog, summary, raw diff) without producing GitHub side-effects.

## Assumptions

- The existing spec-navigator PAT-in-localStorage pattern is acceptable to extend with `repo` scope. (No GitHub App, no OAuth backend, no token-exchange shim.)
- `main` is branch-protected and a direct push is not realistic; every Push Session against `main` therefore creates a PR. The navigator does not need to detect or special-case unprotected `main`.
- The single agreed sentinel date for unbackfillable `Created` values is the date of the refactor commit (or another single explicit value chosen at refactor time); the precise value is a planning concern.
- Manual non-navigator edits to `BACKLOG.md` (humans editing in their IDE, agents writing rows) will continue and MUST remain the supported authoring path. The navigator is additive, not exclusive.
- Pending edits are scoped to a single browser, single device, single tab. Multi-device sync, tab-to-tab sync, and shared staging across reviewers are explicitly out of scope.
- The strikethrough-on-`complete` convention for Items rows is preserved as today; only the Epics table drops the strikethrough convention (in favour of the explicit Status column).
- The navigator's read path uses publicly-accessible content where possible (no PAT required to browse a public `BACKLOG.md`); only writes require auth.
- A 3-way structured merge for stale-base reconciliation is a future enhancement, not part of this spec.
- The project's existing Heroku Review Apps preview-deployment pipeline (per CLAUDE.md "Demo Environment") is the intended host for per-PR preview URLs; the navigator is wired into that pipeline rather than introducing a new hosting mechanism.
- Dry-run mode is a real product capability (also useful as a "review my diff before I commit" safety affordance in real deployments), not solely a phasing artefact. That said, it is the natural way to land an initial PR that ships the browse + edit + dialog UX without yet exercising the GitHub write path; the actual write path can land in a follow-up PR while the navigator's preview deployment continues to provide an interactive smoke-test surface against any in-flight `BACKLOG.md` changes.
