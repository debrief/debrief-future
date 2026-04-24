# Before/After Sample — Screenshot Handling Fix

Two representative diffs from the real-archive regeneration showing the
impact of the three stitcher patches + the Jekyll path rewriter.

## Sample A — Composite post gained 16 images (185-cql2-array-filter)

Anchor spec: `185-cql2-array-filter`. Cluster members: 186-filter-chips
(7 images), 189-stakeholder-demo-ui (5 images), 190-live-llm-transport
(4 images). Combined source reference count: **16**.

### Before (PR #518 ship state — `6fc7cb17`)

```sh
$ grep -c '!\[' specs/185-cql2-array-filter/media/composite-post.md
0
```

**Zero images**. The composite post rendered the members as plain text
bullets inside `## What Shipped`, with no screenshots whatsoever.

### After (this PR — HEAD `71360579`)

```sh
$ grep -c '!\[' specs/185-cql2-array-filter/media/composite-post.md
16
```

Sample excerpt (one member block):

```markdown
**186-filter-chips** — Previously only the numeric filters had first-class
treatment; every other tag filter collapsed to a text chip. ...

#### Screenshots

![drag to regroup](/assets/images/future-debrief/186-filter-chips/lozenge-drag.gif)
![dark theme lozenges](/assets/images/future-debrief/186-filter-chips/dark-theme.png)
...
```

Every image path has been rewritten from source-relative
`./evidence/screenshots/...` to the Jekyll absolute
`/assets/images/future-debrief/186-filter-chips/...` form.

---

## Sample B — Unified post splice recovered the 4th image (176-log-panel-ux)

Source `specs/176-log-panel-ux/media/shipped-post.md` opens with the
tense-inverted twin heading `## What We Built` followed by four image
references spread across four `##` sub-sections.

### Before (PR #518 ship state — `6fc7cb17`)

```sh
$ grep -c '!\[' specs/176-log-panel-ux/media/unified-post.md
3
```

**Three images.** The fourth (`component-light.png`, the card-timeline
shot immediately below `## What We Built`) was silently dropped when
the stitcher spliced the first paragraph into `## Key Decisions` and
discarded the rest of that section. Surviving paths were also
source-relative:

```markdown
![All six tool-category icons in a single view](../evidence/screenshots/all-categories.png)
![Snapshot entry, empty params, deleted track, multi-track wrap](../evidence/screenshots/edge-cases.png)
![Disabled card at reduced opacity with the Disabled badge](../evidence/screenshots/disabled-state.png)
```

### After (this PR — HEAD `71360579`)

Spec 176 reclassified as a composite member (clustered with #208), so
the content now lives in `specs/176-log-panel-ux/media/composite-post.md`:

```sh
$ grep -c '!\[' specs/176-log-panel-ux/media/composite-post.md
4

$ grep -E '!\[.*\]\(' specs/176-log-panel-ux/media/composite-post.md
![Rich card timeline view](/assets/images/future-debrief/176-log-panel-ux/component-light.png)
![All six tool-category icons in a single view](/assets/images/future-debrief/176-log-panel-ux/all-categories.png)
![Snapshot entry, empty params, deleted track, multi-track wrap](/assets/images/future-debrief/176-log-panel-ux/edge-cases.png)
![Disabled card at reduced opacity with the Disabled badge](/assets/images/future-debrief/176-log-panel-ux/disabled-state.png)
```

**Four images**, all paths rewritten to Jekyll absolute form. The
`component-light.png` that was previously dropped is back. Note this
also exercises the twin-heading splice fix (FR-005) — even though 176
didn't end up as a unified post this pass, the same concat logic runs
via the harvester-driven composite path.

---

## Aggregate before/after (repo-root grep bundle)

| Metric | Before (PR #518) | After (this PR) | Delta |
|--------|-----------------:|----------------:|------:|
| Total generated image refs | 25 | 59 | +34 |
| Source-relative path leaks | 39 | 0 | -39 |
| 185 composite image count | 0 | 16 | +16 |
| 125 rollup image count | 0 | 3 | +3 |
| `ARCHIVE-REBUILD.md` new sections | 0 | 3 | +3 |

The +34 exactly matches the defect inventory captured in spec §Background
(Defect A 33 + Defect B 1 = 34 recovered references).
