# Feature Specification: Fix Screenshot Handling in Regenerated Blog Archive

**Feature Branch**: `229-blog-archive-screenshot-fix`
**Created**: 2026-04-24
**Status**: Draft
**Depends on**: #228 (PR #518) — the one-shot generator that shipped the archive
**Input**: Post-merge audit of PR #518 revealed that 34 of 57 image references from source shipped-posts were silently dropped when specs were classified into epic rollups or composite posts, and unified-post stitching writes image paths that won't resolve on the Jekyll site. This spec revives the generator from git history, patches three stitchers to preserve + rewrite image references, inventories orphan screenshots, re-runs, and deletes the generator again per FR-009 of #228.

---

## Background

PR #518 shipped `ARCHIVE-REBUILD.md` plus 73 generated posts (56 unified, 3 epic rollups, 14 composites) under `specs/NNN-<slug>/media/`. The generator — `scripts/regenerate-blog-archive.py` — was deleted in the same PR per #228 FR-009 ("one-shot; generator ephemeral"). The source lives at commit `19406178` on branch `228-regenerate-blog-archive-impl`. Tests live at the same commit under `tests/regenerate_blog_archive/`.

A post-ship audit (2026-04-24) found three independent defects in how the three stitchers (`stitch_unified_post`, `stitch_epic_rollup`, `stitch_composite_post`) handle image references.

### Defect inventory

**Defect A — Epic rollup + composite stitchers drop all member-spec images.**

The rollup/composite stitchers currently quote each member by title + first paragraph only; they never scan the member's `shipped-post.md` body for `![alt](path)` image references or `## Screenshots` sections. Every image in every member spec that gets absorbed into a rollup or composite is silently lost.

Measured impact (source images → generated images):

| Source spec | Src imgs | Absorbed into | Generated imgs |
|---|---:|---|---:|
| `094-point-rectangle-drawing` | 2 | `091-poly-featurekind/media/epic-rollup.md` | 0 |
| `113-prov-card-flip` | 6 | `113-prov-card-flip/media/composite-post.md` | 0 |
| `119-array-offset-calc` | 1 | `116-sensor-schema-overhaul/media/composite-post.md` | 0 |
| `174-thumbnail-capture` | 3 | `125-stac-extension-mock-data/media/epic-rollup.md` | 0 |
| `186-filter-chips` | 7 | `185-cql2-array-filter/media/composite-post.md` | 0 |
| `189-stakeholder-demo-ui` | 5 | `185-cql2-array-filter/media/composite-post.md` | 0 |
| `190-live-llm-transport` | 4 | `185-cql2-array-filter/media/composite-post.md` | 0 |
| `216-storyboarding-capture` | 5 | `215-storyboarding-schema/media/composite-post.md` | 0 |

**Total lost to Defect A: 33 images across 8 member specs.**

**Defect B — Unified stitcher drops 1 image from `176-log-panel-ux`.**

Source post has 4 image references, unified post has 3. Root cause is almost certainly in `_merge_opener_with_shipped_body` where the tense-inverted twin-heading splice rule collapses a `## Screenshots` section that contained the fourth image. This is a low-impact but real behavioural bug that should be fixed by preserving every `![]()` reference during the merge, even across heading-splice boundaries.

**Total lost to Defect B: 1 image.**

**Combined image loss: 34 of 57 source references (60 %).**

**Defect C — Image paths are broken for the Jekyll website.**

Every preserved image reference in generated posts uses its source-relative path (e.g. `./evidence/screenshots/foo.png` or `../evidence/screenshots/foo.png`). The Jekyll `future-post` layout expects `/assets/images/future-debrief/{post-slug}/foo.png`. The `/publish` skill's image-copy step handles this rewrite for *regular* shipped-post publishing, but the regenerated archive will be copied wholesale by the website maintainer per the `ARCHIVE-REBUILD.md` runbook — without a rewrite, every image will 404.

### Orphan screenshots on disk

Three specs have `evidence/screenshots/*.png` files but no image references in their `shipped-post.md`. They must be surfaced in `ARCHIVE-REBUILD.md` so the maintainer can hand-embed them if editorially useful:

| Spec | Orphan images |
|---|---:|
| `085-chart-renderer` | 9 |
| `118-sensor-rendering` | 9 |
| `142-vscode-e2e-webview-reliability` | 1 |

**Total orphans: 19 images across 3 specs.**

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Epic rollup preserves every member's screenshots (Priority: P1)

When the rollup stitcher absorbs a member spec that has images in its `shipped-post.md`, those images are carried into the rollup under a per-member sub-section, with paths rewritten to the Jekyll convention.

**Why this priority**: Epic rollups currently ship a text-only narrative for features that were entirely visual (e.g. thumbnail capture, filter chips). Without screenshots, the archive is materially poorer than the sum of its source posts.

**Independent Test**: Re-run the patched generator and open `specs/125-stac-extension-mock-data/media/epic-rollup.md`. The `174-thumbnail-capture` member section must contain all 3 source images with paths of the form `/assets/images/future-debrief/174-thumbnail-capture/<file>.png`.

**Acceptance Scenarios**:

1. **Given** an epic member whose `shipped-post.md` contains a `## Screenshots` section, **When** the rollup is stitched, **Then** the member's sub-section in the rollup includes every `![alt](path)` reference from the source `## Screenshots` section with paths rewritten per FR-004.
2. **Given** an epic member whose `shipped-post.md` contains inline image references outside a `## Screenshots` section, **When** the rollup is stitched, **Then** every `![alt](path)` reference in the source body is preserved in the member's sub-section (no heading filter).
3. **Given** an epic member with no image references at all, **When** the rollup is stitched, **Then** no empty "Screenshots" heading is emitted for that member.

---

### User Story 2 — Composite post preserves every member's screenshots (Priority: P1)

Same contract as Story 1, applied to `stitch_composite_post` instead of `stitch_epic_rollup`.

**Why this priority**: Composites were the biggest single loss channel (29 of 33 lost images were in composites). One composite — `185-cql2-array-filter/media/composite-post.md` — absorbed 3 heavily-illustrated members (186, 189, 190) and shipped with zero images.

**Independent Test**: Re-run the generator and open `specs/185-cql2-array-filter/media/composite-post.md`. It must contain ≥16 image references (7 + 5 + 4 from members 186/189/190) with rewritten paths.

**Acceptance Scenarios**:

1. **Given** a composite cluster with N members carrying images, **When** the composite is stitched, **Then** every member's images appear under their sub-section with rewritten paths.
2. **Given** the "earliest spec" bucket (where the composite is anchored) has its own images, **When** the composite is stitched, **Then** those images appear alongside the other members, not duplicated.

---

### User Story 3 — Unified posts preserve every source image across the opener-splice boundary (Priority: P2)

The unified stitcher's existing path-preservation is mostly correct (6 of 6 image-bearing unified posts round-trip images) except for `176-log-panel-ux`, which loses 1 of 4 images in the tense-inverted-heading splice. The stitcher must guarantee that every `![alt](path)` reference present in the source `shipped-post.md` appears in the generated `unified-post.md`, regardless of heading layout.

**Why this priority**: P2, not P1 — only 1 image is currently lost this way. But the invariant is important: "no silent image drops" is a cleaner test than "drops only happen in these specific heading layouts."

**Independent Test**: After re-run, diff source vs generated for all 6 image-bearing unified posts; the `![…](…)` reference count must match exactly.

**Acceptance Scenarios**:

1. **Given** any shipped-post body with N image references, **When** it is stitched into a unified post, **Then** the unified post contains exactly N image references (set-equal on alt+filename).
2. **Given** a shipped-post whose `## Screenshots` heading coincides with a tense-inverted opener twin-heading, **When** the stitcher merges them, **Then** the splice preserves every image inside either section.

---

### User Story 4 — All image paths rewritten to Jekyll convention (Priority: P1)

Every `![alt](path)` reference in every generated post (unified, rollup, composite) must be rewritten from its source-relative form to `/assets/images/future-debrief/{source-spec-slug}/<basename>`.

**Why this priority**: Without this, 100 % of images in the published archive 404. This is a single-location fix (one helper applied at stitch time) but the blast radius is total.

**Independent Test**: `grep -rE '!\[.*\]\((\./|\.\./)' specs/*/media/unified-post.md specs/*/media/epic-rollup.md specs/*/media/composite-post.md` must return zero matches after the re-run.

**Acceptance Scenarios**:

1. **Given** a source image reference `./evidence/screenshots/foo.png` in spec `174-thumbnail-capture`, **When** it appears in any generated post, **Then** the path is `/assets/images/future-debrief/174-thumbnail-capture/foo.png`.
2. **Given** a source reference `../evidence/interaction.gif` in spec `191-spec-navigator`, **When** it appears in the unified post, **Then** the path is `/assets/images/future-debrief/191-spec-navigator/interaction.gif` (i.e. `../evidence/` prefix is stripped, not literalised).
3. **Given** an already-absolute path `/media/something.png` in a source post (edge case — not known to occur), **When** it appears in a generated post, **Then** the rewriter leaves it untouched.

---

### User Story 5 — Orphan screenshots surfaced in the archive index (Priority: P2)

`ARCHIVE-REBUILD.md` gains an **Orphan Screenshots** section listing every `evidence/screenshots/*.png|gif|jpg` that exists on disk but is not referenced by any source `shipped-post.md`. The maintainer can decide whether to hand-embed them into the generated posts at publication time.

**Why this priority**: 19 orphans across 3 specs. Without surfacing them, the maintainer has to crawl the repo to discover them — exactly the problem `ARCHIVE-REBUILD.md` was meant to solve (#228 User Story 4).

**Independent Test**: Open `ARCHIVE-REBUILD.md`, find the **Orphan Screenshots** section, confirm it lists 085 (9 images), 118 (9 images), 142 (1 image) with filenames and the generated post they would most naturally belong to (085's composite, 118's composite, 142's unified — all classifications already known from #228).

**Acceptance Scenarios**:

1. **Given** a spec with screenshots on disk but no image references in its `shipped-post.md`, **When** the index is written, **Then** that spec appears under **Orphan Screenshots** with one row per image file.
2. **Given** a spec with some referenced and some orphaned images, **When** the index is written, **Then** only the orphaned images appear in the orphans section (referenced images are not duplicated there).

---

### Edge Cases

- **Image file does not exist on disk** despite a reference in `shipped-post.md`: the generator must not fail; record the broken reference in `ARCHIVE-REBUILD.md` under **Broken Image References** alongside the source spec, and rewrite the path anyway (the maintainer will chase down the missing asset).
- **Path contains query string or fragment** (e.g. `foo.png?raw=true`): strip everything after the first `?` or `#` before deriving the basename; preserve the suffix on the rewritten path.
- **Image referenced via HTML `<img>` tag** instead of Markdown `![]()`: harvested by a sibling `_HTML_IMG_RE` regex (see FR-010) and routed through the same path rewriter. Alt text taken from `alt="..."` when present, empty otherwise.
- **Image path uses `../../` (or deeper) to climb outside the spec** (see FR-011): `rewrite_image_path` strips every leading `./`, `../`, or `evidence/` segment before taking the basename, so multi-level climbs resolve identically to single-level ones. No warning needed.
- **Symlinked evidence directories** (see FR-012): orphan scanner dedupes by resolved path (`Path.resolve()`) so a symlink into another spec's screenshots directory never double-counts.
- **Malformed markdown image reference** (unclosed paren, line-wrapped alt text, or otherwise not matched by `_IMAGE_RE`): counted at harvest time and surfaced in a new `## Malformed Image References` section of `ARCHIVE-REBUILD.md` (see FR-013) so no `![` occurrence is silently dropped.
- **Same image referenced twice in one source body**: preserve both references in the generated post (no deduplication; ordering signals).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The generator MUST be revived from git commit `19406178` (file: `scripts/regenerate-blog-archive.py`; tests: `tests/regenerate_blog_archive/`) into the working tree on a new branch off `main`.
- **FR-002**: `stitch_epic_rollup` MUST extract every `![alt](path)` reference from each member's `shipped-post.md` body and include them in that member's sub-section of the rollup, grouped under a `### Screenshots` sub-heading when 1+ images exist.
- **FR-003**: `stitch_composite_post` MUST apply the same rule as FR-002 to composite members.
- **FR-004**: A new helper `rewrite_image_path(path: str, source_spec_slug: str) -> str` MUST convert source-relative paths (`./evidence/...`, `../evidence/...`, `evidence/...`) to `/assets/images/future-debrief/{source-spec-slug}/<basename>` and MUST be applied to every `![]()` reference emitted by all three stitchers (unified, rollup, composite).
- **FR-005**: `stitch_unified_post` / `_merge_opener_with_shipped_body` MUST be patched so that the generated post contains the same number of `![alt](path)` references as the source `shipped-post.md` (no drops across the heading-splice boundary).
- **FR-006**: The generator MUST scan every shipped spec's `evidence/screenshots/` directory (and any `evidence/*.gif`/`evidence/*.png` at the top level, to catch assets like `191-spec-navigator/evidence/interaction.gif`), compare against the image references in that spec's `shipped-post.md`, and emit any unreferenced image file to a new **Orphan Screenshots** section of `ARCHIVE-REBUILD.md`.
- **FR-007**: `ARCHIVE-REBUILD.md` MUST gain a new **Broken Image References** section listing any `![alt](path)` where the referenced file does not exist on disk, with source spec and full source-relative path. (Generator MUST NOT fail on broken references.)
- **FR-008**: The generator MUST continue to honour #228 FR-007 (no existing-file overwrites) and #228 FR-011 (atomic all-or-nothing promotion).
- **FR-009**: The generator and its tests MUST be deleted again in the same PR that commits the regenerated outputs, matching #228 FR-009.
- **FR-010**: The harvester MUST match HTML `<img>` tags via a sibling regex `_HTML_IMG_RE` and emit `ImageReference` records identical in shape to the markdown path. Alt text comes from the `alt="..."` attribute when present; empty otherwise. Rewritten paths follow the same rule as FR-004.
- **FR-011**: `rewrite_image_path` MUST strip every leading `./`, `../`, or `evidence/` segment (repeated application, not one-level) before taking the basename, so paths such as `../../evidence/foo.png` and `evidence/screenshots/foo.png` resolve to the same Jekyll URL.
- **FR-012**: The orphan scanner MUST dedupe candidate files by their resolved filesystem path (`Path.resolve()`) so that symlinked evidence directories do not contribute duplicate entries.
- **FR-013**: The harvester MUST count `![` occurrences in each source body and compare against the number of matches produced by `_IMAGE_RE` + `_HTML_IMG_RE`. When counts diverge, each unmatched occurrence MUST be surfaced in a new `## Malformed Image References` section of `ARCHIVE-REBUILD.md` with spec key + line number. The generator MUST NOT fail on malformed input.

### Non-Functional Requirements

- **NFR-001**: No change in runtime performance SLA (still ≤ 60 s for the full archive).
- **NFR-002**: No new runtime dependencies (stdlib + existing PyYAML only).
- **NFR-003**: `ruff check` and `pyright --strict` MUST pass on the revived+patched script.
- **NFR-004**: Unit-test coverage MUST NOT regress from the 77 % baseline captured in #228's `test-summary.md`; the new path-rewriter and image-harvester helpers MUST carry their own unit tests (+5–10 tests expected).
- **NFR-005**: Every regenerated post MUST be byte-identical across two successive dry runs with the same inputs (reproducibility — #228 Article I.4).

### Key Entities

- **ImageReference** — new dataclass: `(alt: str, source_path: str, rewritten_path: str, source_spec_key: str, line_number: int, kind: Literal["markdown", "html"])`. Emitted by the image harvester (both markdown `![]()` and HTML `<img>` forms, per FR-010); consumed by the path rewriter and the broken-reference checker. The `line_number` field supports the malformed-reference pass (FR-013) and any future HTML-warning diagnostics.
- **OrphanImage** — new dataclass: `(spec_key: str, filename: str, relative_path: Path, resolved_path: Path)`. Populated by FR-006 with symlink dedup via the `resolved_path` key (FR-012); serialised into the new **Orphan Screenshots** section.
- **BrokenImageReference** — new dataclass: `(spec_key: str, source_path: str, alt: str)`. Populated by FR-007; serialised into the new **Broken Image References** section. Source paths are resolved against the shipped-post's own directory (`shipped_post_path.parent`) before the existence check.
- **MalformedImageReference** — new dataclass: `(spec_key: str, line_number: int, snippet: str)`. Populated by FR-013 when `![` occurrences in a source body exceed the regex match count; serialised into the new **Malformed Image References** section.

---

## Success Criteria *(mandatory)*

- **SC-001**: For every well-formed markdown `![alt](path)` or HTML `<img src="path">` reference in a source `shipped-post.md`, the set of `(alt, basename(path))` pairs in the generated post(s) that absorb that spec is a superset of the source set (zero silent drops). Baseline at 2026-04-24: 64 markdown refs + 0 HTML refs in source; re-measured at implementation time.
- **SC-002**: Zero occurrences of source-relative image paths (matching `!\[[^]]*\]\((\./|\.\./|evidence/)`) in `specs/*/media/unified-post.md`, `specs/*/media/epic-rollup.md`, or `specs/*/media/composite-post.md` (three separate globs — no brace expansion, which misses the rollup filename).
- **SC-003**: `specs/185-cql2-array-filter/media/composite-post.md` contains ≥ 16 image references (from members 186+189+190).
- **SC-004**: `specs/125-stac-extension-mock-data/media/epic-rollup.md` contains the 3 images from member `174-thumbnail-capture`.
- **SC-005**: `ARCHIVE-REBUILD.md` contains three new sections — **Orphan Screenshots** (listing 19 images across specs 085, 118, 142 at current baseline), **Broken Image References**, and **Malformed Image References** — each always present even when empty (empty-body placeholder paragraph).
- **SC-006**: `scripts/regenerate-blog-archive.py` and `tests/regenerate_blog_archive/` do not exist in the merged commit (honours FR-009).
- **SC-007**: All existing #228 acceptance criteria (SC-001 through SC-006 of #228) still pass — no regression to classification, ship-date resolution, or atomic-writer behaviour.
- **SC-008**: Review-sized PR: ≤ 2 800 changed lines of prose output + ≤ 400 changed lines of Python (patches only; the script body itself is a revert-and-delete cycle that nets to zero). Bumped from original 2 500 / 300 to absorb FR-010..FR-013 and the full rollup + composite test matrix.
- **SC-009**: For every `![alt](/assets/images/future-debrief/<slug>/<basename>)` reference surviving in any generated post, either the corresponding source asset exists on disk at `specs/<slug>/evidence/.../<basename>` **or** the reference appears as a row in the **Broken Image References** section of `ARCHIVE-REBUILD.md` (i.e. every surviving reference is either resolvable or explicitly annotated — no dangling image reference without a surface).

---

## Implementation Notes *(non-binding — for the implementer)*

### Phase 0 — Revive

```bash
git checkout -b 229-blog-archive-screenshot-fix main
git show 19406178:scripts/regenerate-blog-archive.py > scripts/regenerate-blog-archive.py
git checkout 19406178 -- tests/regenerate_blog_archive/
# verify revival
uv run pytest tests/regenerate_blog_archive/ -q  # expect 54 passed
uv run pyright scripts/regenerate-blog-archive.py  # expect 0 errors
uv run ruff check scripts/regenerate-blog-archive.py tests/regenerate_blog_archive/  # expect clean
```

Commit as `feat(229): revive #228 generator for screenshot-fix work`.

### Phase 1 — Image harvester

Add a helper to the existing `scripts/regenerate-blog-archive.py` module:

```python
_IMAGE_RE = re.compile(r"!\[(?P<alt>[^\]]*)\]\((?P<path>[^)\s]+)(?:\s+\"[^\"]*\")?\)")

def harvest_image_refs(body: str, source_spec: SpecRecord) -> list[ImageReference]:
    """Scan markdown body for ![alt](path) references, return with rewritten paths."""
```

- Strip trailing `?query` / `#fragment` before basename derivation; reattach on rewritten path.
- Skip `http://` / `https://` / `data:` scheme URIs — leave untouched.
- Skip paths starting with `/assets/` — already rewritten.
- Line-number tracking: walk `body.splitlines(keepends=False)`, keep 1-based index.

### Phase 2 — Path rewriter

```python
def rewrite_image_path(path: str, source_spec_slug: str) -> str:
    """Convert ./evidence/foo.png → /assets/images/future-debrief/{slug}/foo.png."""
```

Rules (in order — first match wins):
1. Scheme URI (`http://`, `https://`, `data:`) → return unchanged.
2. Already absolute (`/assets/...` or `/media/...`) → return unchanged.
3. Strip leading `./` or `../` or `evidence/` (one level only).
4. Basename-only output: `/assets/images/future-debrief/{source_spec_slug}/{basename}` (preserving any `?…` or `#…` suffix).

Unit tests: cover each branch + the query-string/fragment case + the empty-alt `![](path)` case.

### Phase 3 — Patch `stitch_epic_rollup`

The existing rollup stitcher builds member sub-sections from `member.shipped_post_path` by calling `_first_paragraph(extract_shipped_body(...))`. Change to:

```python
def _member_subsection(member: SpecRecord) -> str:
    body = extract_shipped_body(member.shipped_post_path)
    intro = _first_paragraph(body)
    image_refs = harvest_image_refs(body, member)
    lines = [f"### {member.title}", "", intro, ""]
    if image_refs:
        lines.append("#### Screenshots")
        lines.append("")
        for ref in image_refs:
            lines.append(f"![{ref.alt}]({ref.rewritten_path})")
        lines.append("")
    return "\n".join(lines)
```

Apply identical logic inside `stitch_composite_post`.

### Phase 4 — Patch `stitch_unified_post`

The splice bug in `_merge_opener_with_shipped_body` is isolated to the heading collision path. Simplest durable fix: after producing the merged body, harvest image refs from both source and merged; if counts differ, append the missing images under a `## Additional Screenshots` section at the end of the post (rather than trying to re-understand the splice). Not elegant, but honours the "no silent drops" invariant without destabilising the stitch logic.

Alternatively: rewrite the twin-heading-splice branch to concatenate both sections' bodies instead of choosing one. Pick whichever passes the full test suite.

### Phase 5 — Orphan + broken-reference detection

In the archive-serialiser (`ArchiveIndex.__str__` or equivalent), append two new sections:

```markdown
## Orphan Screenshots

Screenshot files present on disk but not referenced by any source `shipped-post.md`.
Maintainer may hand-embed into the generated posts below.

- **`085-chart-renderer`** → generated post: `specs/085-chart-renderer/media/composite-post.md`
    - `bar-chart-light.png`
    - `bar-chart-dark.png`
    - ... (9 files)
- **`118-sensor-rendering`** → generated post: `specs/118-sensor-rendering/media/composite-post.md`
    - ... (9 files)
- **`142-vscode-e2e-webview-reliability`** → generated post: `specs/142-vscode-e2e-webview-reliability/media/unified-post.md`
    - `sidebar-webview-resolved.png`

## Broken Image References

Image references in source shipped-posts that resolve to missing files.
Paths rewritten to Jekyll convention regardless — maintainer must locate the missing assets.

(empty if none)
```

### Phase 6 — Re-run, verify, delete

```bash
uv run python scripts/regenerate-blog-archive.py --force  # overwrites the existing generated posts
# verify success criteria — three separate globs (brace expansion misses epic-rollup.md)
grep -cE '!\[.*\]\(' specs/*/media/unified-post.md specs/*/media/epic-rollup.md specs/*/media/composite-post.md \
  | awk -F: '{s+=$2} END {print "total:", s}'  # expect ≥ baseline
grep -rE '!\[[^]]*\]\((\./|\.\./|evidence/)' \
  specs/*/media/unified-post.md specs/*/media/epic-rollup.md specs/*/media/composite-post.md | wc -l  # expect 0
grep -c 'Orphan Screenshots' ARCHIVE-REBUILD.md   # expect 1
grep -c 'Broken Image References' ARCHIVE-REBUILD.md   # expect 1
grep -c 'Malformed Image References' ARCHIVE-REBUILD.md  # expect 1
# full gates
task verify
# delete
git rm scripts/regenerate-blog-archive.py
git rm -r tests/regenerate_blog_archive/
git commit -m "feat(230): delete revived generator per FR-009"
```

### PR shape

Single PR targeting `main` with this commit trajectory:
1. `feat(229): revive #228 generator for screenshot-fix work`
2. `feat(229): add image harvester + path rewriter with unit tests`
3. `feat(229): patch three stitchers to preserve + rewrite member images`
4. `feat(229): add orphan + broken-reference sections to ARCHIVE-REBUILD.md`
5. `feat(229): re-run generator with screenshot fix`
6. `feat(229): delete revived generator per FR-009`

Expect ~6–8 commits total. Reviewer should read commits 2–4 carefully and skim 1+5+6.

### Release note for the website maintainer

Update the **Runbook** section of `ARCHIVE-REBUILD.md` to call out:

> **Image handling:** every `![alt](/assets/images/future-debrief/<slug>/file)` reference in the generated posts expects the corresponding file at `debrief.github.io/assets/images/future-debrief/<slug>/file`. Copy every `specs/<slug>/evidence/screenshots/*.png|gif|jpg` referenced by a generated post into its Jekyll assets path during publication. The **Orphan Screenshots** section below lists additional assets the maintainer may optionally embed.

---

## Out of Scope

- **Republishing to `debrief.github.io`.** This spec regenerates `specs/*/media/*.md` and `ARCHIVE-REBUILD.md` only. The website maintainer still runs the runbook manually.
- **Re-writing the generator's architecture.** Surgical patches only; dataclasses, atomic writer, and classifier are unchanged.
- **Back-filling missing screenshots.** If a source post references a broken path, we surface it in **Broken Image References** and move on — we do not regenerate the image.
- **Fixing the orphan images themselves.** The maintainer decides whether to embed; we only surface the inventory.
- **Modifying source `shipped-post.md` files.** Paths in source posts remain source-relative; only generated posts carry the rewritten Jekyll absolute paths.

---

## Dependencies & Constraints

- **Must run on `main` as of merge of PR #518** (or later). Required because FR-001 revives files from commit `19406178` which is on the merge path.
- **Must honour #228's Constitution Check.** No new dependencies, offline-capable, atomic, ephemeral generator.
- **Review window**: ~30–45 min of implementation work expected; PR review ~15 min. If implementer estimate exceeds 90 min total, pause and check assumptions — the scope was sized for surgical patches.

---

## Open Questions

None identified. All defect counts are measured from the committed output of PR #518 on the same day as this spec. Re-running the audit before implementation is cheap and recommended:

```bash
# Sanity audit at 2026-04-24: source 64 markdown refs, generated 25, lost 39.
# Re-measure at implementation time — brace expansion in the original audit
# command hides epic-rollup.md matches (actual filename is epic-rollup.md, not
# epic-rollup-post.md). Use three explicit globs per SC-002.
grep -cE '!\[.*\]\(' specs/*/media/shipped-post.md | awk -F: '{s+=$2} END {print "source:", s}'
grep -cE '!\[.*\]\(' specs/*/media/unified-post.md specs/*/media/epic-rollup.md specs/*/media/composite-post.md \
  | awk -F: '{s+=$2} END {print "generated:", s}'
```
