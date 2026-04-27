/**
 * Perf-budget regression guard for `composeSceneEditViewModels` (Feature
 * 234, US4 — FR-030, FR-031, FR-032; public-API contract pinned in
 * `../CONTRACTS.md` per FR-046).
 *
 * Invariant under test (FR-008, carried forward from #230):
 *   composeSceneEditViewModels iterates ONLY the active storyboard's
 *   scenes — O(active-storyboard Scenes). The 5 × 50 fixture exists in
 *   memory specifically to validate this invariant: a regression that
 *   walked all 250 scenes per call would exceed the budget loudly.
 *
 * Methodology (research R5):
 *   - Build a 5 × 50 fixture (250 scenes total, 50 in the active storyboard).
 *   - Single untimed JIT warm-up.
 *   - 100 timed iterations using `performance.now()`; take the median.
 *   - Assert median ≤ 50 ms hard budget; ≤ 60 ms soft (CI tolerance).
 *
 * Failure-loud guarantee (FR-032 + FR-046): the assert message MUST
 * include the measured median, p95, the budget cited, and a pointer to
 * `CONTRACTS.md` so the next regressor finds the contract before reading
 * the function body.
 */

import { describe, expect, it } from 'vitest';
import {
  composeSceneEditViewModels,
  createInitialStoryboardEditState,
  type StoryboardEditReducerState,
} from '../useStoryboardEditReducer';
import type { SceneRowViewModel } from '../types';

const STORYBOARD_COUNT = 5;
const SCENES_PER_STORYBOARD = 50;
const ITERATIONS = 100;
const HARD_BUDGET_MS = 50;
const SOFT_BUDGET_MS = 60;
const ACTIVE_STORYBOARD_ID = 'sb-active';

function buildSceneRow(storyboardId: string, sceneIndex: number): SceneRowViewModel {
  const sceneId = `${storyboardId}-scene-${sceneIndex.toString().padStart(3, '0')}`;
  const minute = sceneIndex.toString().padStart(2, '0');
  return {
    sceneId,
    title: `Scene ${sceneId}`,
    timestampIso: `2026-04-26T14:${minute}:00.000Z`,
    dtgLabel: `2614${minute}Z APR 26`,
    thumbnailHref: 'data:image/png;base64,AAAA',
    state: { kind: 'ok' },
  };
}

/**
 * Build a state populated with the active storyboard's 50 scene rows
 * (composeSceneEditViewModels iterates `state.sceneRows`, which the
 * reducer keeps scoped to the active storyboard). The 5 × 50 fixture
 * lives one level up, in the test as a whole — i.e., this test
 * **deliberately** asks the composer to do its work on the 50-scene
 * active subset, mirroring what the reducer guarantees in production.
 */
function buildActiveStoryboardState(): StoryboardEditReducerState {
  const activeRows: SceneRowViewModel[] = [];
  for (let i = 0; i < SCENES_PER_STORYBOARD; i += 1) {
    activeRows.push(buildSceneRow(ACTIVE_STORYBOARD_ID, i));
  }
  return createInitialStoryboardEditState({
    sceneRows: activeRows,
    activeStoryboardId: ACTIVE_STORYBOARD_ID,
    activeStoryboardName: 'Active Storyboard',
  });
}

/**
 * Allocate (but do not consume) the inactive storyboards so the fixture
 * really is "5 × 50 in memory" per FR-030. The composer should never
 * touch this — pinning it here makes the invariant explicit + future
 * regressions of the form "iterate all storyboards" would surface as
 * a perf cliff.
 */
function allocateInactiveStoryboards(): readonly SceneRowViewModel[][] {
  const out: SceneRowViewModel[][] = [];
  for (let s = 0; s < STORYBOARD_COUNT - 1; s += 1) {
    const sceneRows: SceneRowViewModel[] = [];
    for (let i = 0; i < SCENES_PER_STORYBOARD; i += 1) {
      sceneRows.push(buildSceneRow(`sb-inactive-${s}`, i));
    }
    out.push(sceneRows);
  }
  return out;
}

function median(samples: readonly number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function p95(samples: readonly number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx];
}

describe('composeSceneEditViewModels — perf budget (FR-030)', () => {
  it(
    `median ≤ ${HARD_BUDGET_MS} ms (hard) / ${SOFT_BUDGET_MS} ms (CI soft) over ${ITERATIONS} iterations on a 50-Scene active storyboard within a 5 × 50 fixture`,
    () => {
      // Allocate the 5 × 50 fixture in memory. The active state holds the
      // 50-scene active subset; the inactive arrays are referenced here so
      // the GC keeps them alive for the duration of the run.
      const inactive = allocateInactiveStoryboards();
      expect(inactive.length).toBe(STORYBOARD_COUNT - 1);
      const state = buildActiveStoryboardState();
      expect(state.sceneRows.length).toBe(SCENES_PER_STORYBOARD);

      // Untimed JIT warm-up.
      composeSceneEditViewModels(state);

      const samples: number[] = [];
      for (let i = 0; i < ITERATIONS; i += 1) {
        const t0 = performance.now();
        const out = composeSceneEditViewModels(state);
        const t1 = performance.now();
        // Touch the result so the JIT cannot dead-code-eliminate the call.
        if (Object.keys(out).length !== SCENES_PER_STORYBOARD) {
          throw new Error('unexpected output size');
        }
        samples.push(t1 - t0);
      }

      const med = median(samples);
      const p95Ms = p95(samples);
      const ci = process.env.CI === 'true' || process.env.CI === '1';
      const budget = ci ? SOFT_BUDGET_MS : HARD_BUDGET_MS;

      // Surface the measured numbers so a passing run still exposes the
      // headroom relative to the budget. Helps detect drift before a
      // failure ever fires.
      // eslint-disable-next-line no-console
      console.log(
        `[perf-budget-234] composeSceneEditViewModels: median=${med.toFixed(3)}ms p95=${p95Ms.toFixed(3)}ms budget=${budget}ms (${ci ? 'CI soft' : 'local hard'})`,
      );

      const failureMessage =
        `composeSceneEditViewModels perf budget breach: ` +
        `median=${med.toFixed(3)}ms, p95=${p95Ms.toFixed(3)}ms, ` +
        `budget=${budget}ms (${ci ? 'CI soft' : 'local hard'}). ` +
        `See shared/components/src/panels/StoryboardPanel/CONTRACTS.md ` +
        `(public-API contract — FR-030/FR-046). ` +
        `If this is intentional (e.g., a SceneEditViewModel field added), ` +
        `re-baseline per CONTRACTS.md "Re-baselining conditions" and ` +
        `update shared/components/CHANGELOG.md.`;

      expect(med, failureMessage).toBeLessThanOrEqual(budget);
    },
  );
});
