---
description: Apply a structured Spec Review Feedback comment (produced by the Spec Navigator) to the linked PR's spec artefacts, routing each comment to Edit / AskUserQuestion as appropriate.
handoffs:
  - label: View PR
    agent: none
    prompt: Feedback applied successfully
    send: false
---

## User Input

```text
$ARGUMENTS
```

Expected shape: `<pr-number> <comment-id>` — e.g. `123 2145556789`.
Both arguments are required. `comment-id` is the numeric id GitHub
returns in the `html_url` fragment (`#issuecomment-<id>`).

If either is missing, STOP and ask the user to supply both.

## Outline

1. **Fetch the feedback comment body**

   ```bash
   gh api repos/debrief/debrief-future/issues/comments/<comment-id> --jq .body > /tmp/spec-review-feedback.md
   ```

   If `gh` fails with `404`, ask the user to double-check the comment id
   (it must be from the same PR they passed as the first argument).

2. **Extract the fenced payload**

   Locate the fenced block with language tag `json spec-review-feedback-v1`.
   The block is delimited by `` ```json spec-review-feedback-v1 `` and a
   closing `` ``` ``. Everything between is a JSON object matching
   `specs/191-spec-navigator/contracts/spec-review-feedback-v1.schema.json`.

   ```bash
   awk '/^```json spec-review-feedback-v1/{flag=1;next} /^```/{flag=0} flag' /tmp/spec-review-feedback.md > /tmp/spec-review-payload.json
   ```

   If the block is missing or unparseable, STOP with a clear message:
   `"Comment #<comment-id> is not a Spec Navigator submission (fenced
   block \`json spec-review-feedback-v1\` not found). Ask the reviewer
   to re-submit via the Spec Navigator, or apply the feedback manually."`

3. **Validate against the schema**

   Pass the extracted JSON through the schema at
   `specs/191-spec-navigator/contracts/spec-review-feedback-v1.schema.json`
   (use `uv run python -c "import json, jsonschema; ..."` or the
   TypeScript equivalent from the navigator's `src/github/schemas.ts`).

   If validation fails, STOP with the validator's error message and ask
   the user whether to proceed anyway (they may choose `yes` to apply
   a best-effort patch, but the default is `no`).

4. **Verify PR context**

   Read the payload's `pr`, `originalHeadSha`, and `submittedAtHeadSha`
   fields. Check that `payload.pr === <pr-number>` passed to the command.
   If mismatched, STOP.

   If `originalHeadSha !== submittedAtHeadSha`, the reviewer accepted
   a stale-head submission. WARN the user: "The PR was force-pushed
   during review. Selection-anchor offsets may no longer resolve
   cleanly — approve each anchor resolution before editing."

5. **Route each comment**

   Walk `payload.comments[]` in order. For each:

   - **`level: 'feature'`** — present the body + tag (if any) to the user
     via `AskUserQuestion`, asking whether to open a sibling BACKLOG
     entry, file an issue, or skip. Feature-level notes are not direct
     edits — they are requests for discussion.

   - **`level: 'document'`** — open `payload.feature` spec folder + the
     comment's `path`, show the comment body, and use `AskUserQuestion`
     to decide: (a) `Edit` the artefact to address the comment, (b)
     annotate inline with a `<!-- spec-review: ... -->` comment for later
     follow-up, or (c) skip. Prefer `Edit`.

   - **`level: 'selection'`** — use the `anchorHash` (format
     `<first20>\x1F<last20>\x1F<offset>`) to locate the snippet in the
     current source. If the offset is still accurate, use `Edit` with
     the exact `snippet` as `old_string`. If it has drifted, fall back
     to a prefix-and-suffix search using `contextBefore` / `contextAfter`.
     If resolution fails, skip with a warning that cites the comment
     body so the user can relocate manually.

6. **Preserve the comment tag**

   When the user opts to Edit, include a trailing `<!-- tag: <tag> -->`
   marker on the edited line if `comment.tag` is set — this lets
   downstream automation (grep, a follow-up review) re-thread which
   review tag drove the change.

7. **Batch-commit on completion**

   Once every comment is either applied or explicitly skipped, prompt
   the user for a commit message. Default to:

   `docs(<feature>): apply Spec Navigator feedback from #<pr-number>`

   Stage only the files touched during this run.

## Parse-failure fallback

If step 2 or 3 fails, surface the raw comment body to the user and
offer a menu:

1. **Retry** — re-fetch the comment (maybe the reviewer edited it).
2. **Treat as free-form** — apply the body as inline conversation,
   opening a thread in the user's editor but NOT auto-editing anything.
3. **Abort** — exit cleanly with no changes.

## Notes

- This command is a consumer of the `spec-review-feedback-v1` contract.
  Any future schema revision must bump the language tag (e.g.
  `spec-review-feedback-v2`) and this command must handle BOTH versions
  in the same session, routing by the tag.
- The reviewer may attach a comment tag from
  `['question', 'scope-concern', 'test-gap', 'nit', 'blocker']`.
  `blocker` tags SHOULD be addressed before the PR merges; `nit` can
  be deferred with a tracking note.
- Never mutate the feedback comment itself; treat the PR comment as
  immutable authoritative input.
