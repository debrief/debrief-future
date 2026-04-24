# Research: Regenerate Blog Archive from Specs

**Feature**: 228 — Regenerate Blog Archive
**Date**: 2026-04-23
**Purpose**: Resolve unknowns surfaced by the Technical Context and the spec's Open Questions, and lock the design choices the generator will rely on.

---

## R1 — Epic charter source of truth

**Decision**: Primary charter source is the **Epics table in `BACKLOG.md`** (rows formatted `| Exx | Title | Description | status | Items |`). Secondary enrichment source is `docs/ideas/E*.md` where present (provides a longer narrative for the rollup opener). Tertiary fallback is `[Ex]` title-prefix scanning of shipped specs. Mismatches between these three sources MUST be surfaced as Unresolved Groupings, not silently reconciled.

**Rationale**:
- The spec (FR-002) literally says "charter-first (member table in `NNN-epic-*/spec.md`)". But a filesystem scan shows only one `NNN-epic-*` directory exists (`023-epic-workflow-support`) and it is the spec **about** the epic feature — not a charter. In practice, every real epic charter lives in `BACKLOG.md`.
- The spec's edge case "Charter directory not matching `NNN-epic-*`: Legacy charters will be missed by auto-detection" anticipates this. Rather than flag every epic as legacy (noise), promote `BACKLOG.md` to the primary charter source. The spec's **intent** — mismatches surfaced, not hidden — is preserved.
- `docs/ideas/E*.md` files exist for E03, E04, E07, E10, E11, E12. Where present, the rollup opener seeds from the idea doc; where absent, it seeds from the BACKLOG row's `Description` column.

**Alternatives considered**:
- *Use only `NNN-epic-*` directories*: would miss every real epic. Rejected — defeats the feature.
- *Use only `[Ex]` prefix scan*: would miss epics whose members don't carry the prefix (e.g. E02 PROV logging — several members have `[E02]` prefix but not all). Rejected — too fragile.
- *Require the author to maintain a new `.specify/epics.yaml` manifest*: adds a maintenance burden contrary to FR-009 (one-shot). Rejected — `BACKLOG.md` is already the source of truth and stays authoritative.

**Implementation note**: The BACKLOG parser reads the table between `## Epics` and the next `##` heading, strips `~~strike~~` markers (completed epics), parses the `Items` column into spec-ID list, and dereferences each `NNN` to a directory under `specs/` by prefix match.

---

## R2 — Ship-date extraction

**Decision**: Three-tier resolution. (1) Primary: `date:` field in `media/shipped-post.md` YAML front matter, parsed as ISO-8601. (2) Fallback: PR merge date from `gh pr list --search "<feature-branch-or-NNN>" --state merged --json number,mergedAt`. (3) Final fallback: `git log -1 --format=%cI specs/NNN-<slug>/spec.md` (date of first commit of the spec in the repo).

**Rationale**:
- `shipped-post.md` front matter is the authoritative "this shipped on this date" record and is already human-curated.
- PR merge date handles specs that somehow have no `shipped-post.md` but do have a merge record (rare — likely only if the post author forgot to commit).
- `git log` is a safety net; it guarantees the classifier never crashes for lack of a date. When tier 3 fires, the index row notes "dated from git" so the author can correct manually.

**Alternatives considered**:
- *Today's date for anything ambiguous*: violates FR-005 ("in-flight specs MUST NOT be dated to today"). Rejected.
- *Require all three sources to agree*: brittle — front-matter dates and merge dates often differ by hours. Rejected.

---

## R3 — Tag source for composite detection

**Decision**: Tag pool per spec is the set `tags` from `media/shipped-post.md` front matter, with **noise tags removed** before the ≥1-shared-tag comparison. The noise list is fixed at the three near-universal tags: `tracer-bullet`, `shipped`, `debrief`. Composite detection uses the filtered set; if the filtered set is empty for either spec in a candidate pair, the pair is NOT a composite candidate (no near-miss either — zero signal, not weak signal).

**Rationale**:
- The spec's Open Question flagged "front-matter tags primary; `spec.md` inference fallback" but noted the inference path is likely noisy.
- Surveying the archive: almost every spec carries `tracer-bullet` and `shipped`. If those are allowed to drive composite grouping, every pair of specs shipped in the same week becomes a composite. That is a known anti-pattern.
- Keeping the noise list short (three fixed items) avoids a slippery slope where we keep tuning the filter forever. The dry-run pass is the tuning moment: if the dry run produces too many composites, we either tighten the filter or lengthen the noise list in one edit and re-run.

**Alternatives considered**:
- *Spec.md inference as fallback*: rejected per the spec's own Open Question resolution. Adds complexity for marginal coverage gain.
- *Weight tags by rarity*: introduces a scoring model for a one-shot script. Rejected — over-engineering.
- *Allow empty-tag specs as composite candidates on proximity alone*: rejected — spec FR-003 requires BOTH proximity AND ≥1 shared tag.

---

## R4 — Opener synthesis when `evidence/opening-context.md` is absent

**Decision**: When the cached opener is missing, synthesise three sections from deterministic slices of the spec:
- `## What We're Building` — first paragraph of `spec.md` Summary (or the `Input:` user-description block if Summary is missing).
- `## How It Fits` — concatenation of the first two bullets from `spec.md` "Scope → In scope" plus the "Dependencies" list where non-empty.
- `## Key Decisions` — bullet list assembled from the "Decision" lines of `research.md` if present, else the first three Functional Requirements (FR-001 … FR-003) rewritten as declarative bullets.

Every synthesised opener prepends a single-line HTML comment: `<!-- OPENER SYNTHESISED FROM spec.md — verify before publish -->` so the website dev and post-author see it visibly in raw source. The per-spec row in `ARCHIVE-REBUILD.md` flags `opener=synthesised`.

**Rationale**:
- FR-006 requires verbatim copy when the cache exists and synthesis when it doesn't; this design gives a deterministic, reviewable synthesis rather than free-form generation.
- The visible marker + index flag satisfies Constitution I.3 ("no silent failures") at the content level.
- ~137 specs currently have `evidence/opening-context.md`; roughly 20 shipped specs are missing it. Synthesis is the minority path but must not be silent.

**Alternatives considered**:
- *Call an LLM to synthesise prose*: violates Constitution I.1 (offline by default) and I.4 (reproducibility). Rejected.
- *Refuse to generate the post if opener is missing*: rejected — too many shipped specs would be dropped, defeating SC-001.
- *Copy the entire spec Summary + first half of spec as the opener*: verbose and off-tone. Rejected.

---

## R5 — Atomic-run guarantee (FR-011 / NFR-001)

**Decision**: Stage-and-promote pattern. All writes go to a `tempfile.mkdtemp(prefix="archive-rebuild-")` directory during the run. Each intended destination path is mirrored inside the temp tree. Only after every spec has been classified and written without error does the promoter traverse the temp tree and `shutil.move` each file into place. On any exception during classification or staging, the temp tree is removed and the script exits non-zero with a summary of which spec triggered the failure. The final write step also refuses to promote to any existing path (FR-007 no-overwrite guard) — a conflict there is a programming error and also triggers rollback.

**Rationale**:
- Gives byte-for-byte all-or-nothing semantics without mutating `specs/` until the end.
- Side-steps partial-state race conditions: if CI or the user interrupts the script, the worst case is an orphaned temp dir, never a half-rewritten `specs/`.
- `shutil.move` within a single filesystem is effectively an atomic rename per file; batched at the end, the overall operation is close enough to atomic for a developer workflow.

**Alternatives considered**:
- *Write in-place and track emitted paths in a manifest for cleanup on error*: fragile under crashes between write and manifest append. Rejected.
- *Use a git stash / commit pattern*: tangles the script with repo state and makes dry-runs awkward. Rejected.

---

## R6 — PR description retrieval with graceful degradation

**Decision**: Single retrieval helper. Tries, in order: (1) `gh pr list --search "<NNN>" --state merged --limit 3 --json number,title,body,mergedAt` → pick the PR whose title or head-ref contains the spec slug; (2) on non-zero exit, missing `gh`, timeout (5 s), or empty result, log a warning and return `None`; (3) callers that receive `None` fall back to the spec's `media/shipped-post.md` body as the PR-description proxy (same content in practice — the shipped post was usually the PR body).

Each spec's index row records the PR-description source: `pr-body=gh` or `pr-body=shipped-post` or `pr-body=missing`.

**Rationale**:
- Satisfies the spec's Open-Question resolution (graceful degradation) and the edge case "No `gh` / no GitHub API access".
- Keeps the failure mode visible to the website maintainer: they can see exactly which posts were built without true PR context.
- The 5-s timeout caps worst-case run time at ~12 min for 155 specs even if every call stalls.

**Alternatives considered**:
- *Fetch PR bodies in a concurrency pool*: speed-up not justified for a one-shot run. Rejected.
- *Cache PR bodies to `.specify/pr-cache/`*: adds persistent state for ephemera. Rejected — FR-009 ethos.

---

## R7 — In-flight skip criteria

**Decision**: A spec is skipped iff `specs/NNN-<slug>/media/shipped-post.md` does **not** exist. The PR-merged state is NOT used as a secondary signal: the shipped-post is the canonical "this is ready for the public archive" marker. A spec with a merged PR but no `shipped-post.md` is still skipped — it probably didn't get a public post on purpose (internal plumbing, reverts, etc.).

Skipped specs produce no post file but DO produce a row in `ARCHIVE-REBUILD.md` under a "Skipped Specs" sub-section so the website maintainer can see what was intentionally left out.

**Rationale**:
- One rule, no ambiguity. Matches FR-001 ("`skipped` (in-flight, no `shipped-post.md`)") verbatim.
- Makes the eligibility check cheap (a single `Path.exists`).

**Alternatives considered**:
- *Also check for a `Status: Shipped` marker in `spec.md`*: inconsistently present across specs. Rejected.
- *Check the backlog item's status in `BACKLOG.md`*: requires a second lookup and double-source-of-truth risk. Rejected.

---

## R8 — Tie-breaking and multi-spec clusters for composites

**Decision**: For composite candidate pairs with the same ship date, the cluster's "earliest spec" (where `composite-post.md` lands) is the one with the lower numeric prefix `NNN`. For transitive clusters (A–B qualifies AND B–C qualifies, irrespective of whether A–C qualifies directly), form the union and treat it as a single composite rooted at the lowest-`NNN` spec in the union. Maximum cluster size is not capped, but the generator logs a warning if any cluster exceeds 5 members (likely a tag-filter tuning issue).

**Rationale**:
- Matches the spec's edge-case directives ("Tie on ship date: ascending spec ID" and "Three-way composite candidate: one composite at the earliest of the three").
- Union-find over pairwise matches is the natural data structure; linear in number of pairs.

**Alternatives considered**:
- *Pairwise-only (never merge transitively)*: produces overlapping composites where one spec appears in two. Rejected — violates FR-001 ("exactly one of").
- *Require all-pairs (A–B AND B–C AND A–C)*: overly strict; loses natural clusters. Rejected.

---

## R9 — PyYAML availability and typed parsing boundary

**Decision**: Parse front matter via PyYAML's `safe_load` wrapped in a typed `FrontMatter` dataclass with explicit `title: str`, `date: datetime.date`, `tags: list[str]`, `track: str | list[str] | None`, `layout: str | None`, `excerpt: str | None`, `author: str | None`. The dataclass constructor raises `TypeError` on any missing required field or wrong-typed value. This is the Constitution XV.5 boundary validation — the generator never passes an untyped dict past the parser.

**Rationale**:
- PyYAML is already vendored (transitively via LinkML); no new dependency.
- `safe_load` guards against YAML-directive exploits (relevant even for internally-authored files per Article X.2).
- The typed boundary means every downstream function receives a known shape; no `dict[str, Any]` anywhere in the call graph (Article XV.2).

**Alternatives considered**:
- *Hand-written regex front-matter parser*: fragile around multi-line YAML. Rejected.
- *`frontmatter` pypi package*: new dependency for marginal value. Rejected per Article IX.1.

---

## R10 — Epic rollup landing path

**Decision**: The rollup lands at `specs/<charter-anchor>/media/epic-rollup.md` where `<charter-anchor>` is the **lowest-`NNN` member spec** of the epic. No new `NNN-epic-*` directory is created; no existing spec is hijacked to host a rollup beyond the natural "earliest" spec. This keeps FR-007 (no modifications to existing files) trivially honoured — only a new file appears under an existing media folder.

**Rationale**:
- The spec says "one rollup post at `specs/[charter]/media/epic-rollup.md`" — but with R1's resolution (no real `NNN-epic-*` dirs), `[charter]` needs an anchor. Lowest-`NNN` member is unambiguous, matches composite-post tie-breaking, and is stable across re-runs.
- Website dev can see, from the index row, that post `epic-rollup-E02.md` (slug) corresponds to spec path `specs/070-prov-schema-foundation/media/epic-rollup.md`. The filename on `debrief.github.io` is the dev's call per the runbook.

**Alternatives considered**:
- *Create a synthetic `specs/epics/E02/media/epic-rollup.md`*: introduces a new top-level directory convention for a one-shot deliverable. Rejected.
- *Put every rollup at repo root alongside `ARCHIVE-REBUILD.md`*: breaks the "posts live alongside source specs" decision (interview Q10). Rejected.

---

## Summary of resolved unknowns

| ID | Topic | Status |
|----|-------|--------|
| R1 | Epic charter source | ✅ BACKLOG.md primary, `docs/ideas/E*.md` enrichment, `[Ex]` fallback, mismatches flagged |
| R2 | Ship-date extraction | ✅ shipped-post front matter → PR merge date → git log |
| R3 | Tag source for composites | ✅ front-matter tags minus `{tracer-bullet, shipped, debrief}` |
| R4 | Opener synthesis | ✅ deterministic three-slice synthesis + visible marker + index flag |
| R5 | Atomic run | ✅ stage-and-promote via `tempfile.mkdtemp` |
| R6 | PR description retrieval | ✅ `gh` with 5 s timeout → shipped-post proxy; source recorded per row |
| R7 | In-flight skip | ✅ single rule: no `shipped-post.md` → skip, logged in index |
| R8 | Composite tie-break / clusters | ✅ lowest-`NNN` anchor, union-find clusters, warn above 5 members |
| R9 | YAML boundary parsing | ✅ PyYAML `safe_load` + typed `FrontMatter` dataclass |
| R10 | Epic-rollup landing path | ✅ `specs/<lowest-NNN-member>/media/epic-rollup.md` |

Zero remaining `NEEDS CLARIFICATION` tokens. Ready for Phase 1.
