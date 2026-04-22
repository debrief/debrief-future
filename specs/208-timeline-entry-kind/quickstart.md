# Quickstart: Timeline Entry `kind` Discriminator

**Feature**: 208-timeline-entry-kind
**Audience**: anyone verifying the feature works end-to-end after `/speckit.implement` lands

## What you're verifying

1. The `kind` field exists on `TimelineEntry` and carries a value drawn from `'snapshot' | 'tool' | 'tune'`.
2. The LogPanel renders snapshot rows correctly based on `kind === 'snapshot'` — identical to today's rendering.
3. The renderer falls back gracefully for entries without `kind` and for unknown `kind` values.
4. No new user-visible change.

## Prerequisites

- Repo checked out at the `208-timeline-entry-kind` branch (or a successor that includes its commits).
- Node, pnpm, uv, VS Code installed (standard repo setup; see `CLAUDE.md` "Before Pushing").

## Step 1 — Type check passes

```sh
cd /path/to/debrief-future
pnpm install
pnpm -r typecheck
```

**Expected**: exit code 0. The new `TimelineEntryKind` type, `TIMELINE_ENTRY_KINDS` array, `assertNeverKind` helper, and the modified `TimelineEntry.kind?` field all type-check in both `@debrief/components` and `apps/vscode`.

## Step 2 — Unit tests pass

```sh
pnpm --filter '!@debrief/web-shell' test
```

**Expected**:

- The existing `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx` passes, plus the six new cases (two `kind`-driven, one `tune`, two legacy-fallback, one unknown).
- The host test (`apps/vscode/src/views/__tests__/logPanelView.test.ts`, new or extended) passes the five cases for the populator mapping.

If the populator test has not been added yet (if the folder previously had no tests), the new test file is the one to add during implementation.

## Step 3 — Visual-parity check in Storybook

```sh
pnpm --filter @debrief/components storybook
```

Open `http://localhost:6006`, navigate to `LogPanel → Default` (or any story that seeds a snapshot entry alongside tool entries), and verify:

- Snapshot rows render with the snapshot presentation introduced by feature 176 (distinguished background, glyph, label — whatever the existing stories render today).
- Tool rows render as ordinary tool rows.
- Theme variants (`light` / `dark` / `vscode`) render as they did before the change.

**Evidence to capture**: a single screenshot from the `vscode` theme, filed as `specs/208-timeline-entry-kind/evidence/visual-parity-post.png`. Compare against a pre-change screenshot at `specs/208-timeline-entry-kind/evidence/visual-parity-pre.png` (captured at implementation time against the same story with the branch reset to `main`). The two must be indistinguishable (SC-001).

## Step 4 — VS Code extension smoke test

From the repo root:

```sh
pnpm --filter @debrief/vscode compile
```

Then launch the extension (either via F5 in VS Code or via `code-server` preview app). Open a session, trigger one of the snapshot tools (for example, `export-png`), and verify:

- The new log entry appears in the LogPanel as a snapshot row, styled identically to before.
- Subsequent tool invocations (for example, `bearing-between-tracks` on a track) appear as ordinary tool rows, styled identically to before.
- No visual glitches, no console errors, no crashes.

## Step 5 — Grep for residual `ToolCategory === 'snapshot'` in LogPanel rendering

```sh
grep -rn "ToolCategory.*snapshot" shared/components/src/LogPanel/ \
  | grep -v '__tests__' \
  | grep -v 'LogEntry.tsx'
```

**Expected**: zero hits in `shared/components/src/LogPanel/` outside the explicit legacy-fallback expression in `LogEntry.tsx` and outside test files (which may retain the reference for the "legacy fallback" test cases).

A broader grep that includes `LogEntry.tsx`:

```sh
grep -n "ToolCategory.*snapshot\|resolveToolCategory.*snapshot" shared/components/src/LogPanel/LogEntry.tsx
```

**Expected**: exactly one hit — the second disjunct of the new `isSnapshot` expression (the legacy fallback gated on `entry.kind === undefined`). SC-003 is satisfied.

## Step 6 — Contract shape check via `TIMELINE_ENTRY_KINDS`

Open a Node REPL in the workspace, import the shared module, and verify the runtime array matches the type:

```ts
import { TIMELINE_ENTRY_KINDS } from '@debrief/components';
console.log(TIMELINE_ENTRY_KINDS);
// => [ 'snapshot', 'tool', 'tune' ]
```

**Expected**: array length 3, values in declared order, readonly (cannot be mutated without a type error).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `TimelineEntry` type error — `kind` does not exist | Stale `@debrief/components` build | `pnpm --filter @debrief/components build` |
| Snapshot row renders as ordinary tool row | Populator not emitting `kind: 'snapshot'`, and `kind` is also not `undefined` (for example, populator emits `kind: 'tool'` incorrectly) | Verify `resolveToolCategory(toolName).category` returns `'snapshot'` for the failing entry; if not, the regression is in `toolCategories.ts` (outside this feature's scope) or in the populator wiring. |
| Snapshot row renders correctly but `entry.kind` is undefined at the renderer | Host populator not wired — `toTimelineEntry` is not setting the field | Check `apps/vscode/src/views/logPanelView.ts:toTimelineEntry`; the returned object must include `kind`. |
| Unit test says `kind === 'tune'` appears in the populator output | A new populator path has slipped in that emits `'tune'` | Remove; `'tune'` is reserved for a future feature. If intentional, this is out of scope for 208 and needs its own spec. |
| Typecheck fails with "not assignable to parameter of type `never`" inside a consumer's switch | Good! The exhaustiveness guard caught an unhandled `kind` value — a consumer somewhere enumerates `kind` without handling all union members. Fix the consumer. | This is the intended FR-009 behaviour. |

## Not covered by this quickstart

- **Future `'tune'` populator**: lands with the PROV-side signal. No Quickstart step to verify `kind: 'tune'` in production — this feature deliberately does not emit it.
- **Manual snapshot button**: future feature. Not exercisable until the button exists.
- **Tune marker rendering**: future feature. Not exercisable until the renderer gains a dedicated tune-row presentation.
- **Manifest-driven `ToolCategory`** (#207): if #207 is not yet merged, the `'snapshot'` category resolution comes from the static map in `toolCategories.ts`. After #207 merges, the resolution comes from the manifest. This feature is agnostic to that source (see research.md R6).
