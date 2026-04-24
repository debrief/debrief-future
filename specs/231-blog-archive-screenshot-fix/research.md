# Phase 0 Research — Screenshot Fix for Regenerated Blog Archive

**Feature**: 231 (specs/231-blog-archive-screenshot-fix/)
**Date**: 2026-04-24
**Goal**: Resolve all open questions before committing to a patch strategy.

The spec leaves `Open Questions` empty. The material decisions below come from
re-reading the #228 implementation at commit `19406178` and confirming the
patch surface lines up with what the spec requires.

---

## R1 — Image harvester: which regex, which boundaries?

**Decision**: Harvest with two tolerant sibling regexes — one for CommonMark
markdown images, one for HTML `<img>` tags — both applied line-by-line
against the merged body of a shipped post. Emit `ImageReference(kind=…)` for
each match. Count `![` occurrences separately and compare to the regex
match total; mismatches become `MalformedImageReference` rows.

```python
_IMAGE_RE = re.compile(
    r'!\[(?P<alt>[^\]]*)\]'
    r'\((?P<path>[^)\s]+)'
    r'(?:\s+"[^"]*")?\)'
)

_HTML_IMG_RE = re.compile(
    r'<img\b[^>]*?\bsrc=(?P<q>["\'])(?P<path>[^"\']+)(?P=q)'
    r'(?:[^>]*?\balt=["\'](?P<alt>[^"\']*)["\'])?',
    re.IGNORECASE,
)
```

**Rationale**:

- Current archive has 64 markdown references and 0 HTML references — but
  the user directive "do it once, do it right" (Review Addition 1) brings
  HTML harvesting into scope so a future shipped-post with `<img>` tags
  flows through the same pipeline.
- Alt text on HTML images is optional (unlike markdown) — regex allows
  absence and defaults to empty string.
- `re.IGNORECASE` covers `<IMG>`/`<Img>` variants sometimes emitted by
  copy-paste from editors.
- Existing `_merge_opener_with_shipped_body` already operates line-by-line
  on markdown strings; staying in the same idiom minimises test surface.
- The markdown optional `"title"` arm covers the CommonMark full syntax
  even though no current references use it.
- Line-number tracking comes for free from enumerating `splitlines()` and
  supports the malformed-reference surface (FR-013).

**Malformed-reference detection** (FR-013): after both regexes run, scan
the body with `body.count("![")` and compare to the markdown match count.
If `markdown_hits < raw_count`, the unmatched `![` lines become
`MalformedImageReference` entries with line numbers + snippet (first 80
chars of the offending line). No HTML-form malformed detection —
`<img>` is already tag-structured; a malformed `<img` would be caught by
the browser as broken HTML, not by us.

**Alternatives considered**:

- `markdown-it-py` AST walk — richer, but pulls a non-stdlib dep (NFR-002)
  and adds 10× the code for a one-shot script that gets deleted.
- HTML parser (`html.parser`) — stdlib, but over-powered for the one-line
  `<img src="…">` harvest and adds state we don't need.

---

## R2 — Path rewriter: absolute destination convention

**Decision**: `/assets/images/future-debrief/<source-spec-slug>/<basename>`
with query string and fragment preserved intact.

**Rationale**:

- Matches the Jekyll convention used by `/publish` for per-spec posts today,
  so the website maintainer's assets copy step stays identical.
- Basename-only output eliminates the `./` / `../` / `evidence/` ambiguity
  at one point rather than threading source-relative context through
  downstream logic.
- Preserving `?query` / `#fragment` suffix covers the `foo.png?raw=true`
  edge case without special-casing by caller.

**Rule order** (first rule to apply wins):

1. Scheme URIs (`http://`, `https://`, `data:`) → pass-through.
2. Absolute site paths (`/assets/`, `/media/`) → pass-through.
3. Split off `?query` or `#fragment` suffix at the first occurrence of
   either separator.
4. **Strip every leading `./`, `../`, or `evidence/` segment in a loop**
   (Review Addition 2 / FR-011). Multi-level climbs such as
   `../../evidence/foo.png` resolve identically to single-level ones; no
   warning emitted.
5. Basename = `Path(stripped).name`.
6. Compose `/assets/images/future-debrief/{slug}/{basename}{suffix}`.

The loop in step 4 supersedes the original "strip one-level prefix" rule.
Rationale: `Path(stripped).name` already absorbs any residual path
structure, so an over-eager strip cannot corrupt the output. Pinning the
loop explicitly makes the contract easy to test and removes an edge case
the implementer would otherwise have to reason through.

**Alternatives considered**:

- Relative paths preserved with per-post base resolution via Jekyll
  `relative_url` — would require Jekyll-side config changes and scatter the
  rewrite logic across the runbook.
- Hash-addressed CDN layout — out of scope; the archive is a static export.
- Warning-on-climb (original spec edge-case treatment) — rejected per user
  directive; see FR-011.

---

## R3 — Unified stitcher: two patch strategies, pick by test outcome

The spec explicitly offers two approaches for the `176-log-panel-ux` splice
defect (Phase 4 Implementation Notes). The decision is "pick whichever passes
the full test suite" — so research phase sets the decision criterion, not the
pick itself.

**Decision**: Prefer the **concatenate-both-bodies** variant inside the
twin-heading splice branch; fall back to the **post-merge reconciliation**
variant only if concatenation breaks the existing 6-of-6 image-preserving
unified posts.

**Rationale**:

- Concatenation keeps a single source of truth for the merged body (no
  second harvest pass).
- Post-merge reconciliation emits an `## Additional Screenshots` section
  that leaks splicing internals into the reader-facing narrative.
- The risk of concatenation regressing the passing cases is low because the
  twin-heading detection path is narrow; but if it does, the spec allows the
  reconciliation fallback explicitly.

**Verification hook**: unit test asserts that a four-image `176-log-panel-ux`
input produces a four-image output (the spec's SC-001 invariant, applied at
unit scope).

---

## R4 — Where to place the new helpers in the module

**Decision**: Same module — `scripts/regenerate-blog-archive.py`. No new file,
no new package layout.

**Rationale**:

- The generator is ephemeral (FR-009): it is reverted to HEAD + deleted in
  the same PR. Splitting into multiple files would inflate the revert set
  and complicate deletion.
- All three stitchers already live in this single file; the harvester and
  rewriter are used exclusively by them.
- Keeps the `pyright --strict` surface small.

**Module insertion points** (for tasks phase):

- After `_first_paragraph` (line 971 of revival source) — add
  `_IMAGE_RE`, `harvest_image_refs`, `rewrite_image_path`, and the three
  dataclasses (`ImageReference`, `OrphanImage`, `BrokenImageReference`).
- Patch `_merge_opener_with_shipped_body` (line 943) — twin-heading branch.
- Patch `stitch_epic_rollup` (line 1106) and `stitch_composite_post` (line
  ~1250, after `find_composite_pairs`) — member-subsection builder.
- Patch `ArchiveIndex.__str__` or its serialiser — append Orphan Screenshots
  + Broken Image References sections.

---

## R5 — Orphan detection scope

**Decision**: Scan `evidence/screenshots/` recursively for any
`*.png|*.gif|*.jpg|*.jpeg`, plus top-level `evidence/*.png|*.gif` (to catch
`191-spec-navigator/evidence/interaction.gif`). Dedupe by resolved
filesystem path (`Path.resolve()`, Review Addition 3 / FR-012), then
compare basenames against the set referenced by the spec's
`shipped-post.md` (via `harvest_image_refs`, now including HTML `<img>`
sources).

For specs with `shipped_post_path is None` (no shipped post — edge case
raised by Issue 5A), the referenced-basename set is empty and every
on-disk asset becomes an orphan. This keeps every asset visible to the
maintainer without requiring a shipped post as precondition.

**Rationale**:

- Top-level `evidence/` assets exist in the real archive (191 interaction
  GIF) and would otherwise be orphaned by a stricter subdirectory filter.
- Basename comparison sidesteps the path-prefix ambiguity (`./` vs `../`
  vs literal).
- Resolved-path dedup handles a realistic case: an analyst symlinking a
  shared screenshot into their spec's evidence dir (avoiding duplication
  on disk) would otherwise produce two orphan rows for the same file.
- Matches the measured orphan inventory in the spec (085 → 9, 118 → 9,
  142 → 1) — an early verification hook for the scanner.

**Alternatives considered**:

- Recursive-everywhere scan — risk of false positives from non-asset
  markdown images (e.g. diagrams, fixtures); too noisy.
- Exact path comparison — brittle against the three source-relative
  forms already in use.
- Skip shipped-post-less specs entirely (Option 5B) — rejected because
  it hides assets the maintainer may want to embed.

---

## R6 — Broken-reference detection: fail or annotate?

**Decision**: Annotate, never fail. Record the broken reference in
`ARCHIVE-REBUILD.md` under `## Broken Image References` and rewrite the path
anyway (maintainer will chase down the missing asset).

**Rationale**: Spec FR-007 is explicit: "Generator MUST NOT fail on broken
references." Honours Article I.3 (no silent failures — the broken ref is
surfaced, not suppressed) while keeping the re-run atomic (FR-008).

---

## R7 — Test coverage strategy

**Decision**: Five focused unit tests per new helper, clustered in two new
test files:

- `tests/regenerate_blog_archive/test_image_harvest.py` — `harvest_image_refs`
  across all three path forms, query-string edge, empty-alt, and the
  176-log-panel-ux four-image regression fixture.
- `tests/regenerate_blog_archive/test_path_rewrite.py` — `rewrite_image_path`
  covering the five first-match-wins branches + suffix preservation.

Plus **three existing files touched** to exercise the patched stitchers:

- `test_stitch.py` — existing; add composite + rollup cases that assert
  `![…](…)` counts on member sub-sections.
- `test_index.py` — existing; add Orphan Screenshots + Broken Image
  References section presence checks.

**Rationale**: Meets NFR-004 (+5–10 tests). Keeps conftest unchanged; new
fixtures live inline as markdown string literals rather than on-disk
fixtures, matching the existing test style.

---

## R8 — Verify loop after re-run

**Decision**: Run the verification greps from spec §Phase 6 before
committing the regenerated outputs. **Three explicit globs, no brace
expansion** — brace expansion writes `epic-rollup-post.md` which does
not exist, silently missing all 3 rollup files:

```sh
# SC-001: image reference count (re-measure at implementation time — was 64 in source at 2026-04-24)
grep -cE '!\[.*\]\(' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md \
  | awk -F: '{s+=$2} END {print "total:", s}'

# SC-002: zero source-relative paths across all three generated filenames
grep -rE '!\[[^]]*\]\((\./|\.\./|evidence/)' \
  specs/*/media/unified-post.md \
  specs/*/media/epic-rollup.md \
  specs/*/media/composite-post.md | wc -l

# SC-005: three new sections present
grep -c 'Orphan Screenshots' ARCHIVE-REBUILD.md          # expect 1
grep -c 'Broken Image References' ARCHIVE-REBUILD.md     # expect 1
grep -c 'Malformed Image References' ARCHIVE-REBUILD.md  # expect 1
```

Then `task verify` (lint + typecheck + pytest + Playwright) before PR
commit.

**Rationale**: Cheap, deterministic, runs offline (Article I.1). No change
needed to the existing CI config — the generator's tests already run under
`task test`. The three-globs pattern is load-bearing: the original
brace-expansion form hides all rollup-file failures from the gate.

---

## Summary of decisions

| # | Decision | Source |
|---|----------|--------|
| R1 | Markdown `_IMAGE_RE` + HTML `_HTML_IMG_RE` sibling regexes; `![` count-vs-match diff → Malformed section | spec §Phase 1 + FR-010 / FR-013 |
| R2 | `/assets/images/future-debrief/<slug>/<basename>` with suffix preservation; strip all leading `./`/`../`/`evidence/` in a loop | FR-004 + FR-011 |
| R3 | Prefer concatenate-both-bodies inside twin-heading branch; reconciliation fallback | Phase 4 |
| R4 | Single-file module; no new package layout | FR-009 |
| R5 | Basename set comparison across `evidence/screenshots/**` + top-level `evidence/*`; resolve + dedup symlinks; shipped-post-less specs emit all | FR-006 + FR-012 + Issue 5A |
| R6 | Annotate, never fail on broken refs; resolve `source_path` against `shipped_post_path.parent` | FR-007 + Issue 2A |
| R7 | Two new harvester/rewriter test files + full rollup/composite test matrix (5 baseline + 3 screenshot each) + one E2E fixture test | NFR-004 + Issue 7A + Issue 9A |
| R8 | Three-explicit-globs (no brace expansion) + `task verify` gate before PR commit | SC-001/002/005 + Issue 4A |

**All NEEDS CLARIFICATION resolved. Phase 1 can proceed.**
