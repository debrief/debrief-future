<!--
Cached opener for the Backlog Navigator feature post (#242).
Written during /speckit.plan; consumed verbatim by /speckit.pr.
-->

## Hook

| Before | After |
|---|---|
| `BACKLOG.md` is a 395-line pipe-delimited markdown table — humans triage it with Cmd-F and a steady hand. | The same file, rendered as a sortable, filterable, group-by-epic table in the browser. |
| Epic progress is a hand-counted figure in the Epics table that drifts out of sync with reality. | Items count is derived from the Items table at render time — it can't lie. |
| Status updates are ad-hoc cell edits committed straight to `main`, one row at a time. | Edits accumulate in localStorage, surface a structured summary plus a full unified diff, and ship as a single deliberate "Push Changes" PR. |
| Strikethrough on an Epic ID is the convention for "done". | Explicit `Status` column on the Epics table — no more `~~E03~~` glyph-archaeology. |
| Markdown stays the source of truth, but reading it requires a wide monitor and patience. | Markdown is *still* the source of truth — byte-for-byte stable round-trip — but you no longer have to read it raw to work with it. |

## What We're Building

`BACKLOG.md` is the project's planning ledger — a single markdown file with two pipe-delimited tables (Epics and Items) that captures every piece of work in flight or queued. It has grown to about 230 rows. Triaging it means scrolling, Cmd-F-ing for an item ID, mentally parsing a row that's wrapped onto three lines in your editor, and hand-editing a status cell without breaking the column alignment. Every time someone wants to know "what's the next thing on E07?" they re-derive the answer from scratch.

The Backlog Navigator is a static web app at `apps/backlog-navigator/` that renders the file as an interactive table — sort by any column, filter by status or owner, group by epic, edit cells with context-sensitive controls (status dropdowns, score pickers, epic pickers, date inputs). Edits queue in browser localStorage as a typed `PendingEdit[]`. When you're ready, "Push Changes" opens a dialog showing a structured summary of what you're about to do plus the raw unified diff, and — on confirm — synthesises a single commit and PR via the GitHub Contents API. There's also a dry-run mode that surfaces the same dialog without producing any side-effects, so reviewers can exercise the full UX against any PR's preview deployment without spamming the repo.

## How It Fits

The navigator is a sibling to `apps/spec-navigator/` and reuses its entire substrate: Vite, React 18 with strict TypeScript, the PAT-in-localStorage auth pattern, and the per-PR GitHub-Pages preview-deployment workflow trio (per-PR preview, sticky PR comment, main-branch publish). It is a planning-tier tool — it does not touch any of the maritime-analysis stack (STAC, the VS Code extension, debrief-calc) and has no runtime relationship with them. What it shares with the rest of the project is the discipline: markdown remains the source of truth, edits are auditable, and every push leaves a paper trail in the form of a PR.

## Key Decisions

- **Roll our own table rather than adopt `@tanstack/react-table`.** ~230 rows by 12 columns is well below the threshold where the library pays for itself, and Article IX of the constitution treats every dependency as a liability. The hand-rolled implementation is a few hundred lines and we own every behaviour — sort, filter, group, edit — outright.
- **Refactor `BACKLOG.md` itself, not just wrap it.** Three new columns on the Items table (`Epic`, `Created`, `Updated`); the Epics table normalised so every ID is `E##`; an explicit `Status` column on Epics replacing the strikethrough-means-done convention; `Items` count on the Epics table now derived rather than maintained by hand. A one-shot Python script backfills `Created` from `git log -G` per row, with a sentinel date for rows whose history can't be traced. The schema changes are the unglamorous half of the work but the half that pays off forever.
- **Dry-run mode is a real product capability, not a phasing trick.** The same dialog renders in both modes — structured summary plus unified diff — so reviewers see exactly what *would* happen on the per-PR preview before committing. It also means the smoke test for the UX is the UX itself.
- **Direct GitHub Contents API, no GitHub App, no OAuth backend.** The Contents API's required `sha` parameter doubles as optimistic concurrency control: stale-base detection comes for free, with no token-exchange shim to maintain. The trade-off is that auth is a personal access token in localStorage — acceptable for a planning tool used by a small group of contributors.
- **Article XV strict typing throughout: zero `any`.** Branded primitive types (`ItemId`, `EpicId`, `IsoDate`, `Sha`) force narrowing at parse time; Zod validates every GitHub REST response at the boundary. Parsing the markdown table is the place where untyped strings turn into typed domain objects, and that boundary is enforced by the type system rather than by convention.
- **Custom markdown parser/serialiser with byte-for-byte round-trip stability.** Round-tripping any unedited row produces an identical byte sequence, so a push only diffs the rows actually touched. That property is what makes the diff in the confirmation dialog readable — no spurious whitespace churn, no reordered columns, no surprises in the PR.
