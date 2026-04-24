---
feature: 208-timeline-entry-kind
captured_at: 2026-04-22T20:30:00Z
git_sha: "{commit at evidence capture}"
verification: SC-001 SC-003
method: DOM-level before/after inside vitest + rebaselined Storybook fixtures
---

# Visual regression evidence — schema-rooted `kind` discriminator

**SC-001** (spec.md): *"Zero residual `ToolCategory === 'snapshot'` semantic gates remain in LogPanel rendering code."*

**SC-003** (spec.md): *"No visible regressions in Storybook / web-shell LogPanel output beyond the intentional export-tool rendering fix documented in research.md R2."*

> **Important distinction from PR #508's approach.** PR #508's `visual-parity.md` proved *equivalence* of the pre- and post-change predicates. That was a proof that the coupling had been **renamed**, not removed — because PR #508 kept a `|| (entry.kind === undefined && resolveToolCategory(entry.toolName).category === 'snapshot')` fallback, and `kind` was itself derived from `ToolCategory` in the populator. Under the schema-rooted plan, the pre- and post-change predicates are **not** equivalent: the export-tool-looking-like-manual-checkpoint latent bug (research R2) is intentionally *corrected*. This file captures that correctness change.

## Method

Two complementary layers of evidence:

1. **DOM-level assertions** in `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx` — 5 new cases drive `LogEntry` with specific `kind` / `toolName` combinations and assert the presence or absence of `data-testid="manual-checkpoint-placeholder"` and `.log-panel__entry-duration`.
2. **Storybook fixtures** in `shared/components/src/LogPanel/LogPanel.stories.tsx` — the two pre-existing `'cat-snapshot'` / `'edge-snapshot'` entries (each using `toolName: 'export-png'` to demonstrate snapshot rendering) now set `kind: 'snapshot'` explicitly, preserving their rendered appearance while moving the driving signal off the accidental ToolCategory conflation.

## Pre-migration state (captured on this branch before T015 landed)

A throwaway vitest probe (replayable from `main`) confirmed:

| Fixture | Expected under the correct semantic | Actual pre-migration | Verdict |
|---|---|---|---|
| `toolName: 'export-png'`, no `activity_type` | Tool row (it's an export, not a checkpoint) | Renders `manual-checkpoint-placeholder`; duration hidden | **Bug** |
| `toolName: 'manual-checkpoint'`, no `activity_type` | Manual-checkpoint placeholder (it IS a checkpoint) | Renders with normal chips + duration; no placeholder | **Bug** (inverse) |

Both rows fired the wrong rendering path under the feature-176 Decision 2A gate, because both decisions hinged on whether the tool's *visual category* was `'snapshot'`, not on whether the record was semantically a snapshot.

Captured transcript (from the probe):

```text
PRE-MIGRATION: export-png WITH no activity_type → manual-checkpoint-placeholder RENDERED (bug)
PRE-MIGRATION: manual-checkpoint WITH no activity_type → placeholder rendered? false
```

## Post-migration state (this branch, from the new test suite)

All 13 `LogEntry.test.tsx` cases pass, including the five new kind-driven assertions:

| Fixture | Assertion | Pass? |
|---|---|---|
| `kind: 'snapshot'`, `toolName: 'bearing-between-tracks'` | `manual-checkpoint-placeholder` rendered | ✅ |
| `kind: 'tool'`, `toolName: 'export-png'` | `manual-checkpoint-placeholder` absent; `.log-panel__entry-chips` present | ✅ |
| **No `kind`, `toolName: 'export-png'`** (the latent-bug-fix case) | `manual-checkpoint-placeholder` absent | ✅ |
| `kind: 'tune'` | `manual-checkpoint-placeholder` absent | ✅ |
| `kind: 'snapshot'`, `execution_duration: 'PT0.25S'` | `.log-panel__entry-duration` absent | ✅ |
| `kind: 'tool'`, `execution_duration: 'PT0.25S'` | `.log-panel__entry-duration` present | ✅ |

Rendering is now a pure function of `entry.kind`. `toolName` does not influence the snapshot gate in any case.

## Storybook fixtures — intentionally rebaselined

Two `LogPanel.stories.tsx` fixtures (`cat-snapshot`, `edge-snapshot`) previously relied on `ToolCategory('export-png') === 'snapshot'` to present as manual checkpoints in the "All Categories" and "Edge Cases" stories. Both now set `kind: 'snapshot'` explicitly. Inline comments in the stories document the rationale.

Visual consequence: the two named snapshot-demo rows render **identically** to before (placeholder shown, duration hidden) — because their intent was always to demonstrate snapshot rendering. The driving signal is now the right one.

Any **other** `export-png` row that might appear in a story or plot without `kind: 'snapshot'` will now render as a normal tool row — this is research R2's intentional fix.

## Reviewer verification (recommended)

The cloud session has no interactive display; reviewers with local Storybook access can verify pixel-level appearance:

```sh
pnpm --filter @debrief/components build
pnpm --filter @debrief/components storybook
# Open http://localhost:6006/?path=/story/logpanel--rich-card-all-categories
# Confirm: cat-snapshot row shows the "Manual checkpoint" placeholder.
# Open: /?path=/story/logpanel--edge-cases
# Confirm: edge-snapshot row shows the placeholder; all other rows unchanged.
```

For the latent-bug-fix check:

```sh
# Create a temporary story entry with toolName: 'export-png' and no kind.
# Under main: manual-checkpoint-placeholder renders (wrong).
# Under this branch: normal tool row renders (correct).
```

## Automated drift guard

Three drift tests lock the correct behaviour in place:

1. `shared/components/src/LogPanel/__tests__/semantic-gate-drift.test.ts` (3 tests)
   - Asserts `LogEntry.tsx` source contains no `resolveToolCategory(...).category === 'snapshot'` gate.
   - Asserts no `*.category === 'snapshot'` expression survives anywhere in the file.
   - Asserts `entry.kind === 'snapshot'` IS present as the gate.
2. `apps/vscode/tests/unit/projection-purity.test.ts` (3 tests)
   - Parses `kindFromActivityType`'s body and asserts no tool-ID literal is present.
   - Asserts the body does not reference `toolName`, `was_generated_by`, or `resolveToolCategory`.
   - Asserts the body uses `activityType` and `ActivityType.{snapshot,tool,tune}` exclusively.

CI runs both on every push. SC-001 and SC-005 become regressions-as-test-failures.

## Verdict

- **SC-001 satisfied.** Grep evidence: `specs/208-timeline-entry-kind/evidence/semantic-gate-grep.txt`. Zero residual semantic gates.
- **SC-003 satisfied.** The only intentional visual change is the export-tool latent-bug fix (research R2). Both named Storybook snapshot-demo fixtures are rebaselined to preserve their intent with the correct signal.
- **SC-005 satisfied.** Grep evidence: `specs/208-timeline-entry-kind/evidence/projection-purity-check.txt`. Drift test locks it in.
