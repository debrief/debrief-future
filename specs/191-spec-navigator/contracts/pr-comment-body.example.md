# Golden example: PR comment body produced by Submit

Used as a fixture for `renderFeedbackComment` unit tests. Any change to this file is a breaking change to the rendered format and must be accompanied by a `schemaVersion` bump.

**Anchor format reminder** (see `research.md` §2): `anchorHash` is `<first20-of-snippet>\x1F<last20-of-snippet>\x1F<charOffset>` where `\x1F` is ASCII US (unit separator). Below, for human readability, `\x1F` is rendered as the literal escape sequence `\u001F` inside the JSON string — JSON decoders resolve it to the same byte.

---

```markdown
@claude spec-review feedback submitted via spec-navigator.

```json spec-review-feedback-v1
{
  "schemaVersion": "spec-review-feedback-v1",
  "feature": "186-filter-chips",
  "pr": 187,
  "originalHeadSha": "f3a2b1c4d5e6f7081920aabbccddeeff00112233",
  "submittedAtHeadSha": "f3a2b1c4d5e6f7081920aabbccddeeff00112233",
  "submittedAt": "2026-04-17T14:23:07Z",
  "comments": [
    {
      "id": "01HW7GX0P0EXAMPLE0000001",
      "level": "feature",
      "tag": "scope-concern",
      "body": "The chip-palette behaviour for multi-select feels like a separate feature — consider splitting."
    },
    {
      "id": "01HW7GX0P0EXAMPLE0000002",
      "level": "document",
      "path": "specs/186-filter-chips/plan.md",
      "tag": "question",
      "body": "Why do we need a new dnd-kit wrapper — can we reuse the one from #127?"
    },
    {
      "id": "01HW7GX0P0EXAMPLE0000003",
      "level": "selection",
      "path": "specs/186-filter-chips/spec.md",
      "snippet": "The tool MUST resolve the identified scope to the exact commit under review",
      "contextBefore": "the reviewer was given.\n- **FR-002**: ",
      "contextAfter": ", so that what the reviewer sees matches",
      "anchorHash": "The tool MUST resolve\u001F commit under review\u001F1842",
      "tag": "test-gap",
      "body": "This needs an acceptance scenario — no test currently asserts the pinned-SHA behaviour."
    },
    {
      "id": "01HW7GX0P0EXAMPLE0000004",
      "level": "document",
      "path": "specs/186-filter-chips/tasks.md",
      "tag": "nit",
      "body": "Task T-014 and T-015 could be merged — they touch the same component."
    },
    {
      "id": "01HW7GX0P0EXAMPLE0000005",
      "level": "feature",
      "tag": "blocker",
      "body": "Does this need an ADR? The dnd-kit direction is a departure from #127 and should be captured in docs/project_notes/decisions.md before merge."
    }
  ]
}
```

## Feature-level

- **scope-concern** — The chip-palette behaviour for multi-select feels like a separate feature — consider splitting.
- **blocker** — Does this need an ADR? The dnd-kit direction is a departure from #127 and should be captured in docs/project_notes/decisions.md before merge.

## `specs/186-filter-chips/plan.md`

- **question** — Why do we need a new dnd-kit wrapper — can we reuse the one from #127?

## `specs/186-filter-chips/tasks.md`

- **nit** — Task T-014 and T-015 could be merged — they touch the same component.

## `specs/186-filter-chips/spec.md` — selection

> The tool MUST resolve the identified scope to the exact commit under review

- **test-gap** — This needs an acceptance scenario — no test currently asserts the pinned-SHA behaviour.
```

---

## Renderer rules (derived from this example)

1. **Line 1** is always the literal trigger phrase: `@claude spec-review feedback submitted via spec-navigator.`
2. **A blank line**, then a fenced block tagged `json spec-review-feedback-v1` whose contents validate against `spec-review-feedback-v1.schema.json`. The JSON MUST include both `originalHeadSha` and `submittedAtHeadSha`. When the two are unequal, the rendered section below MUST include an admonition-style note (see rule 8).
3. **A blank line**, then the human-readable sections:
   - `## Feature-level` — omitted if no feature-level comments.
   - `## <path>` — one per distinct `path` with document-level comments; `document` and `selection` entries for the same path are grouped here.
   - `## <path> — selection` — one per distinct `path` with selection comments; always appears **after** the document-level section for the same path (if any).
4. Within each section, each comment renders as `- **<tag>** — <body>`. If `tag` is absent, render as `- <body>` (no leading tag).
5. Selection comments additionally emit a blockquote of `snippet` **immediately under the section heading**, before the bullet list. `contextBefore` and `contextAfter` are carried in the JSON payload only — they are not rendered into the human-readable section (they are disambiguation data for the downstream reader, not reading-experience data for humans).
6. The ordering of comments *within* a section follows the order they appear in the `comments[]` array in the JSON (which mirrors draft-creation order).
7. No trailing whitespace; exactly one blank line between sections; exactly one trailing newline at end of body.
8. **Stale-head note** — when `originalHeadSha !== submittedAtHeadSha`, the renderer prepends, immediately above `## Feature-level` (or the first section if none), a single-line admonition:
   `> ⚠️ Drafted against commit \`<short-original>\`; submitted against commit \`<short-current>\`. The pull request was updated during the review session.`
   (Short SHAs are the first 7 chars.) Omitted when the SHAs are equal.
9. Optional draft-time fields (`createdAt`, `updatedAt`) are carried in the JSON as-received; the renderer does not surface them in the human section.

These rules are enforced by a golden-markdown test in `format/__tests__/renderFeedbackComment.test.ts`, which diffs the output against this file byte-for-byte after normalising SHA values and timestamps.
