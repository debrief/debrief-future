# Plan: Speckit Spec Navigator & Review Tool

## Context

Speckit produces a rich set of spec artifacts per feature (`spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, optional `review-feedback.md`) — typically 150–200 KB of markdown per mid-complexity feature. Reviewing these before implementation is cumbersome today: all review happens inline in a Claude session via `AskUserQuestion`, with no UI to scan the composite spec, select passages, and attach structured feedback. Precedent exists (`specs/186-filter-chips/review-feedback.md`) but the format is unstructured and the workflow is ad-hoc.

The solution is a **static, browser-based review surface** that works against any PR in the repo, without needing a running cloud-dev sandbox. The user reviews a spec, accumulates feedback in the browser, and hits **Submit** — which posts a single structured comment to the PR. Claude Code's PR watcher is already in the loop and will action the feedback automatically.

This keeps the tool:
- **Device-independent** — works from phone, laptop, any browser.
- **Stateless** — no backend, no database, no sandbox dependency.
- **Loop-closing** — reuses the existing PR-comment → Claude Code path instead of inventing a new handoff channel.

## Requirements (v1)

### Functional

**FR-1 Feature selection**
- Navigator opens scoped to a single feature/PR (e.g. `?pr=187` or `?feature=186-filter-chips`).
- On load, resolves the PR head branch and fetches the list of files under `specs/NNN-*/` from GitHub.

**FR-2 Left-hand artifact tree**
- Tree lists every artifact in the feature folder, grouped by type (spec / plan / tasks / research / contracts / evidence / other).
- Selecting an artifact loads it into the right pane. Default selection: `spec.md`.

**FR-3 Right-hand rendered view (read-only)**
- Markdown rendered with GFM (tables, task lists), fenced-code highlighting, heading anchors.
- JSON/YAML contracts rendered with syntax highlighting.
- Images in `evidence/` shown inline.
- Raw-vs-rendered toggle so the user can see exact markdown if needed.
- Cross-artifact links resolve within the app.

**FR-4 Comments at three granularities**
- **Selection-level**: text selection → floating "Add comment" button → comment anchored to a character-range + surrounding snippet for human context.
- **Document-level**: per-artifact comment button (sidebar header).
- **Feature-level**: "Comment on whole feature" button in the top bar.
- Each comment: id, timestamp, granularity, target (path + optional anchor/range + snippet), body, optional tag (e.g. `question`, `scope-concern`, `test-gap`), status (open/resolved locally).
- All comments held in **browser state only** (React state + `localStorage` backup so a reload doesn't lose work).

**FR-5 Feedback drawer & review**
- Collapsible side drawer listing all accumulated comments, grouped by target.
- Each entry editable/deletable before submission.
- "Clear all" + "Submit" buttons.

**FR-6 Submission = single PR comment**
- On **Submit**, the SPA uses the user's GitHub token (see FR-8) to POST one comment to the PR.
- Comment body is structured markdown, parseable by Claude — sections per granularity, selection snippets quoted, with an `@claude` mention or trigger phrase so the existing PR watcher actions it.
- Comment starts with a machine-readable fenced block (e.g. `json` fence tagged `spec-review-feedback-v1`) so Claude can parse structured fields reliably; the rendered markdown below is for humans.
- After a successful POST, the local state is cleared and the user is shown a link to the new PR comment.

**FR-7 PR link injection**
- `.claude/commands/speckit.pr.md` (and friends) append a navigator link to the PR body: e.g. `Review this spec → https://debrief.github.io/spec-navigator/?pr=<num>`.

**FR-8 GitHub auth (minimal)**
- v1: user pastes a GitHub Personal Access Token (fine-grained, scoped to `debrief/debrief-future`, permissions: contents:read + pull-requests:write) into a settings panel. Stored in `localStorage`.
- Token never leaves the browser — all calls go directly from browser → `api.github.com`.
- Clear UI to clear the token. Document the PAT scope in README.
- (Post-v1: device-flow OAuth app for nicer UX.)

### Non-functional

- **Static hosting**: deployable to GitHub Pages from the same repo — zero backend, zero ops.
- **Offline-tolerant drafting**: once spec files are loaded, commenting works without network; only Submit needs network.
- **No new runtime services**: lives under `apps/spec-navigator/`, built to `apps/spec-navigator/dist/`, published via a `gh-pages` workflow.
- **Repo conventions**: Vite + React 18 + TypeScript, plain CSS with custom properties (matches `web-shell`, `nl-demo`). No new app frameworks.

## Technical Approach

### App layout

- **New app**: `apps/spec-navigator/` — Vite + React 18 + TS.
- **New deps** (first markdown toolchain in repo): `react-markdown`, `remark-gfm`, `rehype-highlight` (or `shiki` for better themes), `highlight.js`.
- **Styling**: plain CSS + custom properties. Two-pane flex layout (sidebar tree + content), right-edge drawer for the comment queue.

### Data flow

```
Browser SPA
  ├─ GET  /repos/debrief/debrief-future/pulls/:num          (PR + head sha)
  ├─ GET  /repos/.../contents/specs/NNN-*?ref=<sha>         (file tree)
  ├─ GET  /repos/.../contents/<path>?ref=<sha>              (file contents, or raw.githubusercontent.com)
  └─ POST /repos/.../issues/:num/comments                   (submit)
```

Comments are never written to disk — they exist only as React state until Submit posts them as a PR comment.

### Selection anchoring

Store each selection comment as:
- `path`: relative repo path.
- `snippet`: quoted text (~100 chars around the selection).
- `rangeHash`: a small hash (e.g. first/last 20 chars + char-offset into the raw markdown at fetch time) — serves as a best-effort anchor. Because the spec may have changed by the time Claude applies the feedback, the snippet is the primary ground truth; the hash is a hint.

### Submission payload (PR comment body)

```markdown
@claude spec-review feedback submitted via spec-navigator.

```json spec-review-feedback-v1
{
  "feature": "186-filter-chips",
  "pr": 187,
  "comments": [
    {"id": "…", "level": "feature", "tag": "scope-concern", "body": "…"},
    {"id": "…", "level": "document", "path": "specs/186-.../plan.md", "body": "…"},
    {"id": "…", "level": "selection", "path": "…/spec.md", "snippet": "…", "body": "…", "tag": "test-gap"}
  ]
}
```

### Feature-level feedback
- …
### `plan.md`
- …
### `spec.md` — selection: "…"
- …
```

Rendered section is for humans; the JSON fence is for Claude.

### Hosting & CI

- Workflow `.github/workflows/spec-navigator-publish.yml` builds `apps/spec-navigator/` and deploys `dist/` to GitHub Pages on main.
- Published URL: `https://debrief.github.io/spec-navigator/`.

### Claude Code integration

- No new slash command needed for v1 — the existing PR-comment watcher handles the loop.
- Update `.claude/commands/speckit.pr.md` to append the navigator link to PR bodies.
- Optional: a thin `/speckit.apply-feedback` command that parses the JSON fence from a PR comment and walks through the comments; nice-to-have if the watcher's default behaviour isn't precise enough.

## Critical Files

**New:**
- `apps/spec-navigator/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`
- `apps/spec-navigator/src/components/{ArtifactTree,ArtifactView,CommentDrawer,SelectionAnchor,SettingsPanel}.tsx`
- `apps/spec-navigator/src/github/{api.ts,auth.ts}` — thin GitHub REST wrappers
- `apps/spec-navigator/src/state/{useComments.ts,useFeature.ts}`
- `apps/spec-navigator/src/format/renderFeedbackComment.ts` — builds the PR-comment body
- `apps/spec-navigator/README.md` — PAT setup instructions
- `.github/workflows/spec-navigator-publish.yml`

**Touched:**
- `.claude/commands/speckit.pr.md` — append navigator link to PR body
- `pnpm-workspace.yaml` — automatic via `apps/*`, no manual edit needed
- `CLAUDE.md` → *Active Technologies* block — add spec-navigator entry

**Reused (not modified):**
- `apps/nl-demo/` — lightweight-app layout reference
- `apps/web-shell/src/App.css` — CSS-custom-property theme pattern
- `specs/186-filter-chips/review-feedback.md` — existing feedback precedent (informs submission format)

## Verification

1. **Unit tests** (vitest, lives in `apps/spec-navigator/`): selection anchoring round-trip, comment-drawer reducer, feedback-comment rendering (golden markdown).
2. **Local dev smoke**: `pnpm --filter @debrief/spec-navigator dev`, open `?pr=<existing-PR>`, walk through: auth → browse → render → comment at each granularity → review drawer → submit (against a throwaway PR).
3. **PR-loop E2E (manual)**: open against a real open PR on `debrief/debrief-future`, submit feedback, confirm a comment appears and Claude Code's PR watcher picks it up and iterates on the spec.
4. **Deploy check**: merge, confirm the gh-pages workflow publishes, open the public URL with `?pr=<num>` from a fresh browser (no session) and confirm it works end-to-end.

## Out of Scope (explicit non-goals for v1)

- Direct editing of spec markdown (deferred; comments only).
- Multi-feature dashboard / cross-spec browsing.
- Persistent server-side storage of draft comments (browser-only).
- Line-level GitHub review comments (single consolidated PR comment only).
- OAuth app / device-flow auth (PAT only in v1).
- Resolving comments inline on the PR (Claude Code handles resolution on its end).