# Sample PR comment body produced by Submit

This is the literal issue-comment body the Spec Navigator POSTs when a
reviewer clicks **Submit feedback**. Format is fixed by
`contracts/pr-comment-body.example.md` and enforced by
`renderFeedbackComment.test.ts`.

The example below is sanitised (synthetic SHAs + placeholder PR number)
but structurally identical to a real submission.

---

````markdown
@claude spec-review feedback submitted via spec-navigator.

```json spec-review-feedback-v1
{
  "schemaVersion": "spec-review-feedback-v1",
  "feature": "191-spec-navigator",
  "pr": 456,
  "originalHeadSha": "c1de307cd7f8aeb5e3b2259af32af3eed7f8aeb5",
  "submittedAtHeadSha": "c1de307cd7f8aeb5e3b2259af32af3eed7f8aeb5",
  "submittedAt": "2026-04-17T14:32:18Z",
  "comments": [
    {
      "id": "01HW7GX0P0EXAMPLE0000001",
      "level": "feature",
      "tag": "question",
      "body": "Should we also surface the feature's research.md as a first-class artefact in the left tree, or leave it collapsed under Other?",
      "createdAt": "2026-04-17T14:30:01Z",
      "updatedAt": "2026-04-17T14:30:01Z"
    },
    {
      "id": "01HW7GX0P0EXAMPLE0000002",
      "level": "document",
      "path": "specs/191-spec-navigator/plan.md",
      "tag": "nit",
      "body": "The 400 KB bundle target is mentioned twice in two slightly different ways — suggest picking one place to state it."
    },
    {
      "id": "01HW7GX0P0EXAMPLE0000003",
      "level": "selection",
      "path": "specs/191-spec-navigator/spec.md",
      "snippet": "exactly one PR comment per submit",
      "contextBefore": "FR-019: the navigator MUST produce ",
      "contextAfter": " — no multi-comment thread spraying.",
      "anchorHash": "exactly one PR comm\u001Fr comment per submit\u001F8342",
      "tag": "test-gap",
      "body": "Add an E2E assertion that the POST count is exactly 1 after a full submit — single-flight is the load-bearing property here."
    }
  ]
}
```

## Feature-level

- **question** — Should we also surface the feature's research.md as a first-class artefact in the left tree, or leave it collapsed under Other?

## specs/191-spec-navigator/plan.md

- **nit** — The 400 KB bundle target is mentioned twice in two slightly different ways — suggest picking one place to state it.

## specs/191-spec-navigator/spec.md — selection

> exactly one PR comment per submit

- **test-gap** — Add an E2E assertion that the POST count is exactly 1 after a full submit — single-flight is the load-bearing property here.
````

---

## Notes

- The outer quadruple-backtick fence in this file is the markdown-in-
  markdown escape — the GitHub renderer only strips the outermost one.
- Real submissions POSTed to `POST /repos/debrief/debrief-future/issues/<pr>/comments`
  with `{"body": "<the above>"}`. The fenced `spec-review-feedback-v1`
  block is what downstream automation (`/speckit.apply-feedback`) parses.
- Stale-head submissions additionally include a `> ⚠️ Drafted against
  commit <a>; submitted against commit <b>.` admonition before the
  `## Feature-level` section.
