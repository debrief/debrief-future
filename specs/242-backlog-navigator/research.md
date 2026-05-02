# Research — Backlog Navigator

This document resolves the open questions and dependency choices identified during planning.

---

## 1. Sortable / filterable / groupable table — library vs. custom?

**Decision**: Roll a small custom sort + filter + groupBy implementation over a plain HTML `<table>` and React `useMemo`. Do NOT add `@tanstack/react-table`.

**Rationale**:
- ~230 rows today, planning headroom to ~500. Sort comparators per column are trivial (numeric, ISO date, lexicographic). Free-text filter is `Array.prototype.filter`. Group-by-Epic is `Object.groupBy` (or shim) over the items array. Total implementation: ~150 lines of typed React code, fully testable in Vitest.
- Article IX: every dependency is a liability. TanStack react-table adds ~50KB minified gzipped, a second mental model (column defs, row models, table instances), and obliges us to upgrade alongside it. None of its advanced features (pagination, server-side state, virtualisation, faceted filters) are needed.
- The project does not currently use `@tanstack/react-table` anywhere (only `@tanstack/react-virtual`, in unrelated features). Adopting it here would set a precedent we may not want.

**Alternatives considered**:
- `@tanstack/react-table` v8 — the canonical headless table for React. Rejected as gold-plating at our scale.
- `material-react-table` / `ag-grid` — both far too heavy and stylistically out of band with the rest of the project.

**Migration path**: If item count exceeds ~2000 or we want column-resize / column-reorder / row virtualisation in future, a one-time port to `@tanstack/react-table` is mechanical (the parser output already matches a column-def-friendly row shape).

---

## 2. Diff renderer for the Push Changes raw-diff toggle

**Decision**: Use `diff` (jsdiff, pinned to `^5.x`). Synthesise a unified diff between the parsed-then-reserialised baseline and the parsed-then-edited-then-reserialised candidate. Render with simple custom CSS (green/red line backgrounds), no pretty-printing library.

**Rationale**:
- Mature (jsdiff predates React), MIT, single-purpose, ~30KB gzipped, tree-shakeable.
- We already have before/after on the per-cell level, but the **raw-diff toggle** in the dialog needs a *file-level* diff so the reviewer can scan exactly what would land in `BACKLOG.md` post-serialisation. Building that ourselves means re-implementing Myers diff, which is exactly what jsdiff exists to avoid.
- The default render mode in the dialog is the **structured summary** (no library needed — we walk the pending-edits collection and tally by edit type). The raw diff is a power-user toggle.

**Alternatives considered**:
- `diff2html` — produces HTML; brings styling baggage we'd want to override anyway. Rejected.
- Hand-rolled Myers diff — ~150 lines of well-trodden code, but no upside over jsdiff and we'd be testing the implementation rather than the feature.
- Skip raw-diff toggle entirely — rejected. Reviewers have asked for explicit pre-commit visibility; the dry-run flow's value depends on this being clear.

---

## 3. Created / Updated date backfill from git history

**Decision**: A one-shot Python 3.11 script at `scripts/backfill-backlog-dates.py` using `subprocess` to shell out to `git log`. The script:

1. Parses today's `BACKLOG.md` to extract every item's `ID`.
2. For each item ID `NNN`, runs `git log --reverse --diff-filter=A --pretty=format:%ad --date=short -G "^\| ${NNN} \|" -- BACKLOG.md` and takes the **first** result as the `Created` date.
3. For each item ID `NNN`, runs `git log -1 --pretty=format:%ad --date=short -G "^\| ${NNN} \|" -- BACKLOG.md` for the `Updated` date.
4. If either lookup yields no commits (e.g. the row was renumbered, or its first introduction predates the regex's stability), uses the agreed sentinel date `2025-01-01` and writes the row's ID to a `backfill-misses.txt` artefact for manual review.
5. Rewrites `BACKLOG.md` in place with the three new columns inserted immediately after `Status`. The script is idempotent: re-running it on a partly-backfilled file leaves already-populated dates untouched.

**Rationale**:
- Python matches the project baseline (Article XV applies to TypeScript and runtime Python, not throwaway scripts; we still type-annotate per project habit).
- `-G` searches commit *patches* for the regex, not the working tree, so it correctly identifies the commit that added a line matching the row's start. False positives are bounded (a row whose ID is `NNN` and whose first column is `NNN` is unique).
- The sentinel date `2025-01-01` is well before the project's first commit on the `debrief-future` repo, so it is unambiguously a "pre-history" marker.
- Idempotence lets the script be re-run after manual corrections to backfill-misses.txt.

**Alternatives considered**:
- `git log --follow -- BACKLOG.md` plus annotation to find the commit per row — fails because `git log --follow` operates at file-level, not row-level.
- `git blame` per row — gives us "last commit to touch the line", not "first commit to introduce the row". Useful for `Updated` (already covered by step 3), but cannot derive `Created`.
- A TypeScript script in-app — rejected because the navigator must work without git access (it talks to GitHub via REST), so the backfill belongs to the one-shot refactor commit, not to runtime code.

**Sentinel date**: `2025-01-01`. Chosen at planning time so the spec's earlier "agreed sentinel date" reference is now concrete. Any item with this date is visibly flagged in the navigator (per spec Edge Cases — "Backfill miss") with a muted "*" suffix.

**Updated-stamping going forward**: Convention first — agents (`opportunity-scout`, `backlog-prioritizer`, `/idea`, `/interview`) stamp `Updated` on insert/edit. The navigator stamps `Updated` automatically on every staged edit. A stretch task (T-stretch, gated behind a feature flag) adds a pre-commit hook (`scripts/precommit-stamp-backlog-updated.py`) that detects unstamped row edits and either fixes them or fails with an actionable message. Decision deferred to /speckit.tasks: ship convention-only in v1, add hook in a follow-up if drift is observed.

---

## 4. Preview-deployment pipeline — Heroku Review Apps vs. GitHub Pages?

**Decision**: GitHub Pages, mirroring the `spec-navigator-preview.yml` / `spec-navigator-comment.yml` / `spec-navigator-publish.yml` workflows.

**Rationale**:
- Re-reading the project's preview infrastructure: Heroku Review Apps host **only** the code-server + VS Code extension preview (`Dockerfile.preview` + `heroku.yml` + `app.json`). Storybook, web-shell, and **spec-navigator** all deploy as static sites to GitHub Pages via dedicated per-app workflows.
- The CLAUDE.md "Demo Environment" wording ("Per-PR preview apps are provisioned by Heroku Review Apps") is technically accurate for the code-server preview but does not describe how the other static SPAs reach a per-PR URL. The spec referred to "Heroku Review Apps preview-deployment pipeline" — the actually-correct mirror for a static SPA is the GitHub Pages pipeline. This research updates the spec's assumption without changing user-visible behaviour.
- Three new workflows, each a near-clone of the spec-navigator equivalent:
  - `backlog-navigator-preview.yml` — on PR open / sync, builds with `vite build --base=/debrief-future/backlog-navigator-preview/<slug>/`, publishes to `gh-pages` under `backlog-navigator-preview/<slug>/`.
  - `backlog-navigator-comment.yml` — sticky PR comment with the preview URL, marker `<!-- backlog-navigator-comment -->`.
  - `backlog-navigator-publish.yml` — on push to `main`, builds and publishes to `/backlog-navigator/` on `gh-pages`.
- Dry-run mode default for preview deployments: enforced via `vite build --mode preview` consuming `VITE_BACKLOG_NAV_DRY_RUN=true` from the workflow env, surfaced as a runtime banner. Production (publish workflow) builds without the flag, so the live `main` deployment is fully wired (real PRs).

**Alternatives considered**:
- Add the navigator to `Dockerfile.preview` so each Heroku Review App also hosts it. Rejected: requires shoehorning a static-site server into a code-server-rooted container, adds build time to a critical preview, and the GH Pages path already exists and works.
- Skip per-PR previews and rely on local `pnpm dev` — rejected. FR-032 + Article XII (Community Engagement) make per-PR previews a hard requirement.

**Spec note**: An assumption update has already been merged (commit 95a9b58e amended the spec); this research formalises the GH-Pages choice. The spec's prose still says "Heroku Review Apps" in one assumption — that will be corrected in /speckit.tasks via a documentation edit (T-spec-fix), since the spec's user-visible commitment is "every PR has a preview URL", not "deploy via Heroku specifically".

---

## 5. PR-mode (`?pr=NNN`) — head-branch resolution

**Decision**: At load time, fetch `GET /repos/{owner}/{repo}/pulls/{number}` once. Cache the response (`head.ref`, `head.sha`, `state`, `title`) in component state for the session. Use `head.ref` as the target branch for all reads and the eventual write commit. Use `head.sha` as the staleness baseline for FR-025.

**Rationale**:
- Single REST call. Public PRs work without a PAT (rate-limited but viable for browse). Private repos require a PAT; the navigator detects the 404 and prompts.
- The PR's head branch is the natural commit target — committing directly there appends to the PR's combined diff, which is the user-visible behaviour.
- Caching is correct because we explicitly require a page reload after a stale-base detection (FR-025); during a single session the baseline does not change.

**Alternatives considered**:
- Resolve the PR's head SHA only and commit via a "branch-less" Pulls API path — rejected, GitHub's APIs require a branch.
- Fetch on every push attempt to detect mid-session staleness — rejected, the spec explicitly defers structured 3-way merge; refusing on stale base is correct and only requires staleness checks at push time, which we do (compare cached `head.sha` to current `head.sha` then).

---

## 6. Markdown table parser / serialiser

**Decision**: Custom parser, written in TypeScript, narrow-scoped to the exact two-table grammar `BACKLOG.md` uses (`## Items` and `## Epics` sections). Round-trip stability is tested against the **live** `BACKLOG.md` as a golden fixture in CI.

**Rationale**:
- Generic Markdown AST parsers (`unified` / `remark`) over-generalise: they normalise whitespace, escape pipes differently, and produce ASTs whose text-fidelity round-trip is non-trivial to preserve. We need bit-exact round-tripping (otherwise the very first push would whitespace-churn the entire file — SC-007 forbids this).
- The grammar is bounded:
  - One leading `# Backlog` heading + prose.
  - `## Items` section: one header row, one separator row, then one item row per line. Cells are pipe-delimited; embedded `|` inside Description is escaped as `\|` (today's convention — verify against fixture).
  - `## Epics` section: same shape, different columns.
  - Other sections (`## Scoring Criteria`, `## Workflow`, `## Categories`, `## Notes`) are opaque text passed through unchanged.
- Parser output: `BacklogDocument = { preamble: string; items: ItemsTable; midamble: string; epics: EpicsTable; postamble: string; }` — the four string fields preserve everything that isn't a structured row, so round-trip fidelity is guaranteed for every byte the navigator does not explicitly model.
- Tests: three layers — (a) parse a fixture row, assert structured fields; (b) parse + re-serialise the live `BACKLOG.md`, assert byte-for-byte equality; (c) parse + apply a synthetic edit + re-serialise + diff, assert only the touched cell(s) changed.

**Alternatives considered**:
- `markdown-table` (jsdiff's stablemate) — provides a serialiser but no parser, and its serialiser realigns column widths. Rejected.
- `@types/marked` + custom AST walk — heavier than needed; the grammar above is so constrained that a 50-line line-by-line parser is clearer and more testable.

**Pipe-escape handling**: The current `BACKLOG.md` does NOT contain any rows with embedded `|` characters in cells (verified by grep at planning time). The parser handles `\|` as a literal pipe defensively, but this is an unused code path until/unless a future Description introduces one. Test fixtures cover both cases.

---

## 7. localStorage schema + size budget

**Decision**: Two namespaced keys:
- `backlog-navigator:github-pat` — same shape as spec-navigator's `Credential` envelope (token, scopes, login).
- `backlog-navigator:pending-edits:v1` — JSON envelope `{ baselineSha: string; targetRef: string; mode: "live" | "pr"; prNumber?: number; edits: PendingEdit[] }`. Versioned key prefix (`v1`) so future schema bumps can migrate or discard cleanly.

**Rationale**:
- Edit payload is tiny: ~12 cells × even 1KB each × 230 items if everything were edited = 2.7MB worst case. Realistic batches stage <20 edits = <20KB. Well under the 5MB browser cap.
- The size-cap warning in FR-019 / Edge Cases is conservative — surface a warning at 80% of the navigator's own budget (e.g. 1MB), well before the browser refuses.
- The `baselineSha` is what FR-025 uses for staleness detection: at push time, fetch the current `head.sha` of the target ref and compare.

**Migration**: Bump to `:v2` if the edit shape changes; on load, read both, prefer `:v1` while warning, then drop `:v1` entries after a successful push.

---

## 8. Strict-typing the "Description" cell

**Decision**: Treat the `Description` cell as an opaque `string` containing arbitrary GitHub-Flavored Markdown. Do NOT attempt to parse out the `[[E##]` prefix tag, parenthetical dependency notes, or embedded `[Title](url)` links during edit. The `Epic` column (post-refactor) is the source of truth for epic membership; the `[[E##]` prose tag is a human-readable redundancy maintained by convention.

**Rationale**:
- Article XV is satisfied by typing the cell as `string` — no `any`. The Markdown structure inside is rendered (via `react-markdown`) but not interrogated by application logic.
- This avoids a class of bugs where the `Epic` column and the prose tag drift apart and the navigator picks one. The renderer joins on `Epic`; the prose tag is purely for human reading.
- Backfill MAY emit a follow-up linter (out of scope) that flags rows whose `[[E##]` prose tag disagrees with their `Epic` column.

---

## Resolved questions summary

| Question | Resolution | FR/spec section |
|----------|------------|------------------|
| Table library | Custom (no TanStack) | §1 |
| Diff renderer | jsdiff `^5.x` | §2 |
| Created/Updated derivation | `git log -G` per row + sentinel `2025-01-01` | §3, FR-002, FR-003 |
| Updated stamping | Convention v1, optional pre-commit hook v2 | §3, FR-007 |
| Preview pipeline | GitHub Pages (mirror of spec-navigator-* workflows) | §4, FR-032 |
| PR-mode resolution | One Pulls REST call cached for the session | §5, FR-026 |
| Parser/serialiser | Custom narrow-grammar, golden-fixture CI tests | §6 |
| localStorage schema | Two namespaced keys, versioned `v1` envelope | §7, FR-019 |
| Description typing | `string` (opaque Markdown) | §8 |

All NEEDS CLARIFICATION items in the spec-template Technical Context are now resolved.
