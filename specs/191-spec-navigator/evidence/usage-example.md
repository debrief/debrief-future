# Spec Navigator — Usage Example

## Reviewer flow

A typical review session for a feature PR (#456) in progress:

1. **Navigate to the Spec Navigator link in the PR body**
   `https://debrief.github.io/debrief-future/spec-navigator/?pr=456`

2. **First visit — configure PAT**
   - The Settings panel is open by default.
   - Create a fine-grained PAT at
     https://github.com/settings/personal-access-tokens/new scoped to
     `debrief/debrief-future` with permissions `Contents: Read` and
     `Pull requests: Read and Write`.
   - Paste into the input, click **Save token**. The navigator
     validates by fetching `GET /repos/debrief/debrief-future/pulls/1`
     and closes the panel on success.

3. **Browse artefacts**
   - Left column: tree grouped by kind
     (spec / plan / tasks / research / data-model / quickstart /
      contract / evidence-image / evidence-doc).
   - Click any file to render it on the right. Markdown renders with
     GFM (tables, checkboxes, strikethrough), rehype-highlight code
     syntax, heading anchors. JSON / YAML / code render through
     highlight.js. Images render from a Blob via
     `URL.createObjectURL`.

4. **Add a feature-level comment**
   - Click **Comment on whole feature** in the header.
   - Type the body, optionally select a tag:
     `question | scope-concern | test-gap | nit | blocker`.
   - Click **Save**. Appears under the "Feature-level" header in the
     drawer with the chosen tag as a chip.

5. **Add a document-level comment**
   - Select an artefact (e.g. `plan.md`) in the tree.
   - Click **Comment on this document** in the artefact header.
   - Same composer; Save. Appears grouped under the artefact path.

6. **Add a selection-level comment**
   - Highlight any passage in the rendered markdown.
   - A floating "Add comment on selection" chip appears under the
     selection after a 150 ms debounce.
   - Click the chip; the composer opens pre-populated with the
     selected snippet quoted.
   - Save. Appears in the drawer with the snippet quoted above the
     body.

7. **Edit / delete / clear drafts**
   - Each drawer entry has Edit and Delete buttons. Delete requires
     a second confirm click. Clear-all drops every draft for the PR.

8. **Submit**
   - Click **Submit feedback** in the header.
   - The navigator re-fetches the PR head.sha and, if it has not
     moved, POSTs a single issue comment to the PR. The comment body
     contains:
     - Line 1: `@claude spec-review feedback submitted via spec-navigator.`
     - A fenced `json spec-review-feedback-v1` block with the full
       structured payload.
     - A human-readable rendering with `## Feature-level`,
       `## <path>`, and `## <path> — selection` sections.
   - A success panel with a link to the posted comment appears.
   - Drafts are cleared from localStorage.

## Stale-head path

If the PR was force-pushed between load and submit:

- The navigator detects `payload.head.sha !== originalHeadSha`.
- A `StaleHeadModal` opens showing both 7-char SHAs.
- The reviewer can either **Cancel** (drafts preserved, no POST) or
  **Submit anyway** (POSTs with `originalHeadSha !== submittedAtHeadSha`
  and a `> ⚠️ Drafted against commit … ; submitted against commit …`
  admonition in the human section).

## Example submitted payload

```json
{
  "schemaVersion": "spec-review-feedback-v1",
  "feature": "191-spec-navigator",
  "pr": 456,
  "originalHeadSha": "c1de307ca384c397e3b2259ad7f8aeb5d7f8aeb5",
  "submittedAtHeadSha": "c1de307ca384c397e3b2259ad7f8aeb5d7f8aeb5",
  "submittedAt": "2026-04-17T14:32:18.421Z",
  "comments": [
    {
      "id": "01HW7GX0P0EXAMPLE0000001",
      "level": "feature",
      "body": "Scope is well-bounded. Blocker: contract freeze before merge.",
      "tag": "blocker",
      "createdAt": "2026-04-17T14:30:01.120Z",
      "updatedAt": "2026-04-17T14:30:01.120Z"
    },
    {
      "id": "01HW7GX0P0EXAMPLE0000002",
      "level": "document",
      "path": "specs/191-spec-navigator/spec.md",
      "body": "FR-015 tag vocabulary — agreed, but add a brief rationale for each value.",
      "tag": "nit"
    },
    {
      "id": "01HW7GX0P0EXAMPLE0000003",
      "level": "selection",
      "path": "specs/191-spec-navigator/plan.md",
      "snippet": "thick services, thin frontends",
      "contextBefore": "Key architectural decisions: ",
      "contextAfter": " — domain logic in Python, ",
      "anchorHash": "thick services, thin f\u001Fn frontends\u001F1247",
      "body": "Clarify whether the navigator itself qualifies as \"thin\" by this rule.",
      "tag": "question"
    }
  ]
}
```

## Automation: applying feedback

Once the reviewer submits, the PR watcher can run:

```
/speckit.apply-feedback 456 2145556789
```

which extracts the fenced payload, validates it against the schema,
and routes each comment (Edit / annotate / skip) — see
`.claude/commands/speckit.apply-feedback.md`.
