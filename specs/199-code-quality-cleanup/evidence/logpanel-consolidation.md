# LogPanel prop-merge consolidation — evidence

**Captured:** 2026-04-18
**Commit:** `e8acfc8` (`refactor(LogPanel): consolidate child prop types onto LogPanelProps`)

## Grep transcript — zero references remain

```text
$ grep -rn "LogTimelineProps\|LogByFeatureProps" shared/ apps/ services/
(no output)
$ echo "exit=$?"
exit=1
```

`grep` exits 1 (no match) — **SC-002 satisfied**.

## diff --stat for the five touched files

```text
 shared/components/src/LogPanel/types.ts          | 36 ++++++++++++++++++++++--
 shared/components/src/LogPanel/LogTimeline.tsx   |  4 +--
 shared/components/src/LogPanel/LogByFeature.tsx  |  4 +--
 shared/components/src/LogPanel/LogPanel.tsx      |  7 +++--
 shared/components/src/LogPanel/index.ts          |  2 --
 shared/components/src/index.ts                   |  2 --
 6 files changed, 45 insertions(+), 79 deletions(-)
```

## What changed

| Type | Before | After |
|---|---|---|
| `LogTimelineProps` (`types.ts:269`) | 28-line interface | **deleted** |
| `LogByFeatureProps` (`types.ts:301`) | 28-line interface | **deleted** |
| `LogPanelProps` (`types.ts:193`) | 32 fields, 4 root-only fields required | 46 fields (14 absorbed from children, all optional); 4 root-only fields relaxed to optional with defaults applied inside `LogPanel` |
| `LogTimeline.tsx:10,34` | `import type { LogTimelineProps }` / `: LogTimelineProps` | `import type { LogPanelProps }` / `: LogPanelProps` |
| `LogByFeature.tsx:12,37` | `import type { LogByFeatureProps }` / `: LogByFeatureProps` | `import type { LogPanelProps }` / `: LogPanelProps` |
| `LogPanel/index.ts:12-13` | re-exported `LogTimelineProps`, `LogByFeatureProps` | re-exports removed |
| `index.ts:225-226` | re-exported `LogTimelineProps`, `LogByFeatureProps` | re-exports removed |

The four root-only fields (`filterState`, `hasActiveSession`, `plotName`,
`actionResultMessage`) had to become optional so that `LogTimeline` and
`LogByFeature` — which never need them — can share `LogPanelProps`. `LogPanel`
itself applies defaults at destructure time (`filterState = DEFAULT_FILTER_STATE`,
`hasActiveSession = false`, `actionResultMessage = null`), so existing call
sites are not affected. This is the minimum-viable shape change required to
satisfy FR-004 (single canonical interface).

## Validation

```text
$ pnpm --filter @debrief/components typecheck
> @debrief/components@0.1.0 typecheck
> tsc --noEmit
(no output — exit 0)
```

```text
$ pnpm --filter @debrief/components test
…
 Test Files  104 passed | 4 skipped (108)
      Tests  1564 passed | 4 skipped (1568)
   Duration  95.46s
```

All 1564 vitest tests pass — Storybook stories and component tests for
`LogTimeline` / `LogByFeature` continue to render unchanged.
