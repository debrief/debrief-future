# Before / After Sample

Two concrete diffs illustrating the spec 231 fix. Use `git show` to
reconstruct the pre-patch bodies; the post-patch bodies are the current
HEAD (after the `feat(231): re-run generator with screenshot fix`
commit `fee600b`).

---

## Example 1 — `185-cql2-array-filter` composite (0 → 16 images)

The biggest single recovery. The 185 composite absorbs three heavily-
illustrated members (186-filter-chips × 7, 189-stakeholder-demo-ui × 5,
190-live-llm-transport × 4 = 16 images). The pre-patch stitcher emitted
the members' first paragraphs only; all 16 images were silently lost.

**Before** (`git show 6fc7cb1:specs/185-cql2-array-filter/media/composite-post.md`):

```markdown
## What Shipped

**185-cql2-array-filter** — ## What we built

**186-filter-chips** — ## What We Built

**189-stakeholder-demo-ui** — ## What We Built

**190-live-llm-transport** — ## What We Built
```

Zero image references. Zero `#### Screenshots` sub-blocks.

**After** (current HEAD):

```markdown
## What Shipped

**185-cql2-array-filter** — ## What we built

**186-filter-chips** — ## What We Built

#### Screenshots

![Filter chips default state — light theme](/assets/images/future-debrief/186-filter-chips/filter-chips-default-light.png)
![Filter chips with 3 chips grouped by AND — light theme](/assets/images/future-debrief/186-filter-chips/filter-chips-3-and-light.png)
![Filter chips with 3 chips grouped by OR — light theme](/assets/images/future-debrief/186-filter-chips/filter-chips-3-or-light.png)
![Filter chips mid-drag — light theme](/assets/images/future-debrief/186-filter-chips/filter-chips-drag-light.png)
![Filter chips default state — dark theme](/assets/images/future-debrief/186-filter-chips/filter-chips-default-dark.png)
![Filter chips default state — VS Code theme](/assets/images/future-debrief/186-filter-chips/filter-chips-default-vscode.png)
![Interaction GIF — add-chip, drag-to-group, group-toggle, remove](/assets/images/future-debrief/186-filter-chips/filter-chips-interaction.gif)

**189-stakeholder-demo-ui** — ## What We Built

#### Screenshots

![Stakeholder demo panel — initial state](/assets/images/future-debrief/189-stakeholder-demo-ui/initial-state.png)
… (4 more)

**190-live-llm-transport** — ## What We Built

#### Screenshots

![LLM transport — prompt editor with live-proxy toggle](/assets/images/future-debrief/190-live-llm-transport/prompt-editor.png)
… (3 more)
```

16 image references, all under `/assets/images/future-debrief/<slug>/`.

**Count proof**: `grep -c '!\[' specs/185-cql2-array-filter/media/composite-post.md` → `16`.

---

## Example 2 — `176-log-panel-ux` (3 → 4 images, Jekyll paths)

176 has two shapes to illustrate:

1. **Classification changed**: pre-patch 176 generated a
   `unified-post.md` with 3 of 4 source images (the fourth, inside
   the tense-inverted `## What We Built` twin-heading section, was
   dropped by the splice rule). In the re-run, a new composite
   cluster `comp-176-208` forms with 208-timeline-entry-kind, so the
   same content is emitted under `composite-post.md`. The old
   `unified-post.md` is removed (the classifier no longer produces it).

2. **Splice preserves the dropped image**: the concat-both-bodies
   patch to `_merge_opener_with_shipped_body` carries the twin-heading
   body's remainder (including `![Rich card timeline view](...)`)
   forward as an un-headed body block after the opener. (Note: 176
   now ships as a composite-member, so the splice patch only shows up
   on unified posts like 178-vscode-tabular-results or 191-spec-navigator
   that retain the twin-heading shape.)

**Before** (`git show 6fc7cb1:specs/176-log-panel-ux/media/unified-post.md`):

```
$ grep -c '!\[' /tmp/176-before.md
3
$ grep '!\[' /tmp/176-before.md
![All six tool-category icons in a single view](../evidence/screenshots/all-categories.png)
![Snapshot entry, empty params, deleted track, multi-track wrap](../evidence/screenshots/edge-cases.png)
![Disabled card at reduced opacity with the Disabled badge](../evidence/screenshots/disabled-state.png)
```

3 refs, all using `../evidence/…` source-relative paths that would
have 404'd under Jekyll.

**After** (current HEAD `specs/176-log-panel-ux/media/composite-post.md`):

```
$ grep -c '!\[' /tmp/176-after.md
4
$ grep '!\[' /tmp/176-after.md
![Rich card timeline view](/assets/images/future-debrief/176-log-panel-ux/component-light.png)
![All six tool-category icons in a single view](/assets/images/future-debrief/176-log-panel-ux/all-categories.png)
![Snapshot entry, empty params, deleted track, multi-track wrap](/assets/images/future-debrief/176-log-panel-ux/edge-cases.png)
![Disabled card at reduced opacity with the Disabled badge](/assets/images/future-debrief/176-log-panel-ux/disabled-state.png)
```

- 4 refs (up from 3 — the `component-light.png` inside the twin-heading
  `## What We Built` section is now preserved by the composite
  stitcher's `#### Screenshots` block).
- All 4 paths are rewritten to Jekyll absolute form.

**Count proof**: `grep -c '!\[' specs/176-log-panel-ux/media/composite-post.md` → `4`.

---

## Aggregate impact

| Metric | Before | After |
|--------|-------:|------:|
| Source refs in `specs/*/media/shipped-post.md` | 64 | 64 |
| Generated refs across all three post types | 25 | 64 |
| Source-relative paths in generated posts | 22 | 0 |
| `## Orphan Screenshots` section | absent | 19 orphans (085×9, 118×9, 142×1) |
| `## Broken Image References` section | absent | present (empty at current state) |
| `## Malformed Image References` section | absent | present (captures Liquid-path edge case pre-regex-widening) |
