## What We're Building

I'm regenerating the `future` blog archive on debrief.github.io from the specs directory in one shot. The script walks every shipped spec under `specs/`, emits a `Building [Feature]` post per standalone spec, a single rollup post per complete epic (replacing per-spec posts for its members), and composite posts where two or three standalone specs shipped close together on a shared theme. The output is a set of generated post files plus one `ARCHIVE-REBUILD.md` at the repo root — an index, an unresolved-groupings section, and a runbook the debrief.github.io maintainer uses to wipe and republish the archive without a follow-up question.

The reason this exists is that the current archive is a layered mix of planning posts, shipped posts, and LinkedIn drafts written under drifting conventions. It predates the `Building [Feature]` title pattern and the cached-opener contract that PR #511 introduced. Rather than hand-editing a hundred-plus files, I'd rather regenerate from the source of truth — the specs themselves — and accept that a handful of edge cases will surface in the index for human adjudication.

## How It Fits

This is infrastructure, not a platform feature. It lives at `scripts/regenerate-blog-archive.py` for exactly one PR and is deleted in the same PR that commits its output — FR-009 is explicit about that. It sits one layer above the media workflow already documented in `.claude/agents/media/content.md`: same voice, same three-section opener structure, same evidence directory conventions. The script reads `specs/*/`, `BACKLOG.md`, and `docs/ideas/E*.md`; writes only new files; refuses to overwrite anything; and stages every write in a tempdir so a mid-run failure rolls back cleanly.

## Key Decisions

- **BACKLOG.md is the primary epic charter source, not `NNN-epic-*/spec.md`.** The spec assumes charter directories exist; the repo doesn't actually have them. Rather than invent synthetic charters or silently paper over the gap, the planner shifted to BACKLOG.md's Epics table, with `docs/ideas/E*.md` as enrichment and `[Ex]` title prefixes as fallback. The spec's *intent* — surface mismatches to the author rather than reconcile them silently — survives; the *mechanism* changed.
- **Verbatim copy when a cached opener exists; deterministic synthesis when it doesn't.** Synthesised openers get a visible HTML comment and an index flag so the maintainer knows which posts were written from spec slices rather than planning-time framing. No paraphrasing of existing cached openers, ever.
- **Composite clustering is narrow on purpose.** ≤ 5 day proximity plus ≥ 1 shared tag (after filtering `tracer-bullet`, `shipped`, `debrief`). 6–10 day near-misses land in the index for manual promotion rather than auto-grouping, because a wrong composite is harder to unpick than a missing one.
- **Offline-safe, `gh` optional.** When the CLI isn't available, the script falls back to the committed `shipped-post.md` as the PR-description proxy and records the provenance source per spec in the index.
- **One-shot, not productised.** Tests, golden fixtures, the dry-run smoke — all go when the script goes. The cost of maintaining a blog regenerator forever is higher than the cost of rerunning this exercise if we ever need to.
