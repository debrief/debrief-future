# Quickstart: Spec Navigator & Review Tool

**Branch**: `191-spec-navigator`
**Audience**: a contributor running the tool locally for the first time, or a reviewer using the published version to review a PR.

---

## For reviewers (zero-install path)

1. Open the PR you want to review. Look for a line like `Review this spec → https://debrief.github.io/debrief-future/spec-navigator/?pr=<num>` in the PR description.
2. Click it. The navigator opens in your browser.
3. If it is your first use on this device:
   a. Click the **Settings** gear in the top bar.
   b. Follow the on-screen instructions to create a **fine-grained Personal Access Token** on GitHub with:
      - Resource: `debrief/debrief-future`
      - Repository permissions: `Contents: Read-only`, `Pull requests: Read and write`
   c. Paste the token into the Settings panel and save. The token is stored only on this device.
4. Read the spec. Select passages and click **Add comment** to pin a note to a specific phrase, or use the artefact-level / feature-level buttons for broader notes.
5. Open the **drafts drawer** on the right edge to review, edit, or delete your comments.
6. Click **Submit**. One consolidated comment appears on the PR, your drafts are cleared, and you get a direct link to the posted comment.
7. If you want to wipe the stored PAT, open Settings and click **Clear credential**.

---

## For contributors (local dev path)

### Install

From the repo root:

```sh
cd /path/to/debrief-future
pnpm install                                        # repo-wide; picks up apps/spec-navigator via workspaces
```

### Run locally

```sh
pnpm --filter @debrief/spec-navigator dev
```

Opens `http://localhost:5173/spec-navigator/`. Visit `?pr=<num>` for a real PR. PAT setup is the same as the reviewer flow.

### Unit tests

```sh
pnpm --filter @debrief/spec-navigator test         # vitest run
pnpm --filter @debrief/spec-navigator bench        # vitest bench — render-time benchmarks
```

Exercises:
- `commentsReducer` (add / edit / delete / retag / clear / load-with-version-mismatch / stale-path flagging).
- `selectionAnchor` — byte-exact golden fixture for 3 canonical captures plus a re-resolve-after-edit check (see `research.md` §2).
- `renderFeedbackComment` — golden markdown diffed against `specs/191-spec-navigator/contracts/pr-comment-body.example.md`.
- `github/schemas` — zod parse of known-good fixtures, rejection of known-bad.
- `ArtifactView` components — render markdown (GFM), render JSON/YAML, render image Blob, cross-link click intercept, raw/rendered toggle.
- `xssAdversarial` — 10 standard XSS payloads through the markdown pipeline; DOM MUST contain no `<script>` and no `on*` attributes.
- `cspPresence` — reads built `dist/index.html`, asserts the CSP meta tag and its `connect-src` allowlist.
- `bundleSize` — reads `dist/assets/*.js`, fails if the largest gzipped chunk exceeds **400 KB**.
- `softGaps` — "no feature folder" banner, `QuotaExceededError` banner, GitHub POST-422 surfacing (no PAT leakage).

### Benchmark

`pnpm --filter @debrief/spec-navigator bench` renders three real spec files (50 KB / 150 KB / 300 KB) and asserts the 200 KB-equivalent case renders in under 500 ms (gated at 1000 ms if CI jitter is observed; actual times are logged).

### End-to-end tests (Playwright)

```sh
cd apps/spec-navigator
node run-playwright.mjs                             # reuses @sparticuz/chromium; works in cloud + CI
```

Four E2E specs:
- `submit.spec.ts` — happy path: load → browse → comment at each granularity → submit → assert one POST body validates against the JSON Schema.
- `stale-head.spec.ts` — mock GitHub returns a different `head.sha` on the second `GET /pulls/:n` → stale-head modal appears → "Submit anyway" → payload contains `originalHeadSha !== submittedAtHeadSha`.
- `render.spec.ts` — traverse one artefact of each kind (markdown / JSON / YAML / PNG / cross-link target) and the raw/rendered toggle.
- `a11y.spec.ts` — `@axe-core/playwright` sweep over the main layout (tree + reading pane + drawer + settings), asserting zero WCAG AA violations.

### Build

```sh
pnpm --filter @debrief/spec-navigator build         # outputs apps/spec-navigator/dist/
```

Deploy is handled by `.github/workflows/spec-navigator-publish.yml` on push to `main`.

---

## Acceptance walkthrough (manual — against a real PR)

This maps to the spec's User Stories 1–3 end-to-end and is the single manual verification step before the PR-watcher loop is trusted.

1. **Pick a throwaway open PR** on `debrief/debrief-future` that has a `specs/NNN-*/` folder. If none exists, open a scratch PR touching a single file in an existing spec folder.
2. **Clean slate**: open the navigator with browser devtools → Application → Local Storage → clear `spec-navigator:*` keys. Confirm the drawer shows the "no drafts" empty state.
3. **Feature-level comment**: from the top bar, click "Comment on whole feature". Type a short note. Save. Open the drawer; confirm it appears.
4. **Document-level comment**: select `plan.md` in the tree. Click the document-level comment button at the top of the artefact pane. Save. Confirm drawer entry.
5. **Selection-level comment**: in the right pane, highlight a phrase with your cursor. Confirm the floating "Add comment" chip appears. Click it, enter text, save. Confirm the drawer entry carries the quoted snippet.
6. **Persistence**: reload the page. Confirm all three drafts are still in the drawer with their original text and anchors.
7. **Edit & delete**: edit one comment's body, delete another. Reload. Confirm edits / deletions persisted.
8. **Submit**: click **Submit**. Confirm exactly **one** new comment appears on the PR. Click the success-link in the UI; you should land directly on that comment on GitHub.
9. **Post-submit state**: the drawer should be empty. Reloading should not resurrect the submitted drafts (FR-022).
10. **PR-watcher loop**: wait for the PR watcher to react. It should parse the `spec-review-feedback-v1` fenced block and begin acting on each comment. Confirm at least one response appears on the PR.

If any of steps 1–10 fail, the tool is not ready to ship — file the symptom against this spec's branch and iterate before merge.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| "PR not found or credential cannot see it." on load | Wrong PR number; private repo + PAT lacks `contents:read`; token expired. | Check PAT scope + expiry. Re-paste token in Settings. |
| "No feature folder found in this PR." | The PR touches no `specs/NNN-*/` folder. | Not reviewable with this tool. Review on the PR diff instead. |
| Submit fails with "credential cannot post comments on this PR" | PAT is missing `pull-requests: write`. | Regenerate a fine-grained PAT with the correct scope. |
| "Your browser is out of local storage" | Unusually large draft set; storage quota hit. | Submit what you have now, or clear drafts from *other* PRs via Settings. |
| Rendered markdown missing syntax highlight | `highlight.js` grammar for the fenced language isn't bundled. | Safe — non-matching fences fall back to plain monospace. Report if it's a language we should add (TS / JSON / YAML / bash / python / diff / markdown are bundled). |
| "The PR has moved since you loaded it" modal | The PR was force-pushed (or re-pointed) between page load and Submit. | Choose **Submit anyway** (the payload records both commits so the watcher can detect staleness) or **Cancel** (drafts preserved; reload to re-read against the new tip). |
| A selection comment's snippet is missing on reload | Never should happen. | File a bug with the stored `spec-navigator:drafts:pr-<num>` value (redact the PAT key separately). |

---

## Definition of done (for this feature)

- [ ] All spec acceptance scenarios pass (spec.md User Stories 1–5, including FR-029a/b).
- [ ] All unit tests green (`pnpm --filter @debrief/spec-navigator test`), including `xssAdversarial`, `cspPresence`, `bundleSize`, and the `softGaps` suite.
- [ ] `vitest bench` reports 200 KB-equivalent render under 500 ms on CI.
- [ ] All four Playwright E2E specs green (`submit`, `stale-head`, `render`, `a11y`).
- [ ] `tsc --strict` passes with zero errors and zero `any`.
- [ ] `ruff` / `pyright` unchanged (this feature adds no Python code).
- [ ] Published at `https://debrief.github.io/debrief-future/spec-navigator/` by the new `spec-navigator-publish.yml` workflow (mirrors `storybook.yml`; `keep_files: true`).
- [ ] `.github/workflows/ci.yml` runs the new app's lint / typecheck / unit / E2E (closes CI wiring decision).
- [ ] `.claude/commands/speckit.pr.md` updated to append the navigator link to new PR bodies.
- [ ] `.claude/commands/speckit.apply-feedback.md` (new) parses a `spec-review-feedback-v1` fenced block from a PR comment and walks its comments.
- [ ] `CLAUDE.md` Active Technologies block updated with the spec-navigator entry, and the "Before Pushing" fallback includes `@debrief/spec-navigator` filters.
- [ ] Manual walkthrough above completed end-to-end against a real PR, including the stale-head modal (force-push a scratch branch mid-session to trigger it).
