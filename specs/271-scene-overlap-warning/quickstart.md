# Quickstart: Overlap Warning for Time-Range Scenes (#271)

## What this feature does

When two or more **time-range Scenes** in the same Storyboard cover overlapping `[start, end]` windows, each offending Scene row in the Storyboard panel shows a passive warning naming the conflicting Scene(s). It never blocks, reorders, merges, or rejects — and authors can dismiss a warning for an intentional overlap.

## Where the code lives

| Concern | File |
|---------|------|
| Detection (pure) | `shared/components/src/storyboard/overlap.ts` |
| Badge (presentational) | `shared/components/src/panels/StoryboardPanel/OverlapBadge.tsx` |
| List integration | `shared/components/src/panels/StoryboardPanel/SceneList.tsx` |
| View-model field | `shared/components/src/panels/StoryboardPanel/types.ts` (`SceneEditViewModel.overlapsWith`) |
| VS Code wiring | `apps/vscode/src/views/storyboardPanelView.ts` |
| Web-shell wiring | `apps/web-shell/src/StoryboardPanelMount.tsx` |
| Story | `StoryboardPanel.stories.tsx` → `WithOverlapWarnings` |

## The overlap rule (one line)

Two time-range Scenes overlap iff, as epoch ms, `aStart < bEnd && bStart < aEnd`. Touching endpoints (`aEnd === bStart`) do **not** overlap. Instant Scenes (`time_range == null`) never participate.

## Try it (developer)

```sh
# 1. Unit-test the detector (TDD — write/extend these first)
pnpm --filter @debrief/components test overlap

# 2. Component test for the badge + dismiss
pnpm --filter @debrief/components test OverlapBadge

# 3. See it in Storybook (light/dark/vscode) + capture evidence screenshots
cd shared/components && node run-playwright.mjs StoryboardOverlap
# → writes specs/271-scene-overlap-warning/evidence/screenshots/overlap-{light,dark,vscode}.png

# 4. Full gate before pushing
task verify
```

## Manual check in the web-shell

1. Open a plot whose active Storyboard contains two time-range Scenes with overlapping windows (e.g. Scene A `10:00–10:30`, Scene B `10:15–10:45`).
2. Open the Storyboard panel — both rows show "Overlaps with …" naming the other Scene.
3. A third Scene `11:00–11:10` and any instant Scenes show no warning.
4. Click **Dismiss** on one badge — both rows clear; the Scenes are unchanged.
5. Edit Scene B to `10:35–10:45` (no overlap) then back to `10:15` — the warning drops, then returns.

## Acceptance ↔ test map

| Spec | Verified by |
|------|-------------|
| FR-001/002 overlap rule, touching endpoints | `overlap.test.ts` C1.1–C1.3, C1.8 |
| FR-004 names partners, multi/chain | `overlap.test.ts` C1.5–C1.7 |
| FR-006 instant excluded | `overlap.test.ts` C1.4 |
| FR-007 single-Storyboard scope | `overlap.test.ts` C1.9 |
| FR-008/009 dismiss + prune/re-warn | `overlap.test.ts` C1.10; host unit tests C4.3–C4.4 |
| FR-003/012/013 badge render + a11y + coexist | `OverlapBadge.test.tsx`; Storybook E2E |
| FR-005 non-blocking | Negative checks C5.1–C5.2 (no mutation in tests) |
| FR-011 both surfaces | shared helper used by both hosts (C4.5) |
| SC-002 zero false warnings | `overlap.test.ts` C1.2–C1.4, C1.9 |
</content>
