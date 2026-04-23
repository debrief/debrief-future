## What We're Building

Most of the work on Debrief right now is specs — `spec.md`, `plan.md`, `tasks.md`, `research.md`, evidence screenshots, data models, contracts. Reviewing a PR means cloning the branch, opening the folder, scrolling through eight markdown files, then trying to leave coherent comments through GitHub's inline-review UI. That workflow fights me every time I use it, and it is especially hostile on a tablet.

The Spec Navigator is a static browser-hosted SPA that takes a PR number, opens that feature's `specs/NNN-*/` folder, and renders every artefact — tables, task lists, syntax-highlighted code, inline evidence images — the way the writer intended. Readers can leave comments on a selection, on a whole document, or on the feature overall, and hit **Submit** once. Submit posts a single structured comment back to the PR. The existing automated PR watcher picks it up from there.

## How It Fits

This is contributor/reviewer plumbing, not an analyst-facing feature. It sits alongside `apps/nl-demo/` and `apps/web-shell/` as a third frontend in the monorepo. No new services, no new Python, nothing for end users to install. The goal is narrow: make spec review as fast as spec writing, from whatever device I happen to have open, without a repo checkout. If it works, the feedback loop between writing a spec and iterating on it tightens by a day or two every time.

## Key Decisions

- **Rendering**: `react-markdown` + `remark-gfm` + `shiki` for faithful markdown, with a `rehype-highlight` fallback if shiki's bundle gets uncomfortable.
- **Selection comments**: we capture the verbatim snippet plus a bit of surrounding context and a positional hash. The snippet is the ground truth; the hash is a hint that survives small edits to the spec.
- **Auth**: a pasted fine-grained Personal Access Token, scoped to `debrief/debrief-future`. No backend, no OAuth server, token lives in `localStorage` and every call goes straight to `api.github.com`. This is the blunt-but-honest option for v1 — an OAuth device-flow upgrade is flagged for later.
- **Handoff**: Submit posts exactly one PR comment containing a `json spec-review-feedback-v1` fenced block plus a human-readable rendering. A deliberate bet on the existing watcher loop rather than inventing a new channel.
- **Hosting**: GitHub Pages at `debrief.github.io/debrief-future/spec-navigator/`, published on push to main.
