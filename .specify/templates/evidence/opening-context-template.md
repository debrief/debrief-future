<!--
Cached opener for the feature post. Written during `/speckit.plan`, read
by `/speckit.pr` to assemble the top of `media/shipped-post.md`.

- No YAML front matter. Prose only.
- Four sections with `##` headings, in the order below.
- The `## Hook` heading is stripped at ship time — its content sits at the
  very top of the post above "What We're Building", with no heading.
- The other three sections are copied verbatim into the final post.
- Voice: first-person, conversational — see `.claude/agents/media/content.md`.
- Do NOT include calls to action, feedback solicitations, or LinkedIn copy.
-->

## Hook

[The lead asset for the post — what the reader sees first, before any prose.
Pick ONE of the following forms (preference order: screenshot → mermaid →
capability bullets → before/after table). See "The Hook" in
`.claude/agents/media/content.md` for guidance on which form fits which
kind of feature.

Examples:

  - Planned screenshot:
    `![FilterBar with three active platform filters](images/filterbar-active.png)`
    (Path is the future ship-time location. The screenshot itself is
    captured during evidence collection, not now.)

  - Mermaid diagram (inline, will be copied as-is):
    ```mermaid
    flowchart LR
      Loader --> STAC
      STAC --> VSCode
    ```

  - Capability bullets:
    - Filter tracks by platform class without leaving the map
    - Save filter combinations as named lozenges
    - Share filter URLs across team members

  - Before/after table:
    | Before | After |
    |---|---|
    | Manual JSON edits to filter | One-click platform-class chip |
    | Filters lost on reload | Persisted in session state |

If unsure which form fits, default to a planned screenshot — it's the
single highest-value opener and works for most UI features.]

## What We're Building

[1–2 paragraphs. The capability and why it matters. Lead with substance —
what a reader can now do or imagine doing — not with a context-setter.
Avoid superlatives and marketing phrases.]

## How It Fits

[1 paragraph. Where this lives in the overall architecture or roadmap.
Reference neighbouring services / specs where it clarifies the picture,
not to pad the post.]

## Key Decisions

[Bullet list OR short paragraphs. Choices made during planning and their
trade-offs. Honest about what was considered and rejected. These are the
decisions a reader would find most interesting — not every choice made.]
