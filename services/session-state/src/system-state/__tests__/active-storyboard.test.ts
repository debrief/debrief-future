import { describe, it, expect } from 'vitest';
import { writeSystemStateIntoFeatureCollection } from '../write.js';
import { readSystemStateFromFeatureCollection } from '../read.js';
import { activeStoryboardIdToInput, activeStoryboardVariantToId } from '../mapping.js';
import type { PlotFeatureCollection } from '../types.js';

/**
 * The helper owns active_storyboard with the EXACT wire shape #237 shipped
 * (NG-002): feature id `state.activestoryboard`, kind SYSTEM, state_type
 * active_storyboard, empty-Point geometry, `active_storyboard_id`. The helper
 * cannot delegate to @debrief/components (that package depends on this one),
 * so it produces the identical shape natively.
 */
describe('active_storyboard via the shared helper', () => {
  const emptyFc = (): PlotFeatureCollection => ({ type: 'FeatureCollection', features: [] });

  it('writes the #237 wire shape verbatim', () => {
    const out = writeSystemStateIntoFeatureCollection(emptyFc(), {
      active_storyboard: activeStoryboardIdToInput('sb-1'),
    });
    const feat = out.features.find((f) => f.id === 'state.activestoryboard');
    expect(feat).toBeDefined();
    expect(feat?.geometry).toEqual({ type: 'Point', coordinates: [] });
    expect(feat?.properties).toEqual({
      kind: 'SYSTEM',
      state_type: 'active_storyboard',
      active_storyboard_id: 'sb-1',
    });
  });

  it('read surfaces the same id the write put in', () => {
    const out = writeSystemStateIntoFeatureCollection(emptyFc(), {
      active_storyboard: { active_storyboard_id: 'sb-42' },
    });
    const { map } = readSystemStateFromFeatureCollection(out);
    expect(activeStoryboardVariantToId(map.active_storyboard)).toBe('sb-42');
  });

  it('a null id omits the feature entirely', () => {
    const input = activeStoryboardIdToInput(null);
    expect(input).toBeUndefined();
    const out = writeSystemStateIntoFeatureCollection(emptyFc(), { active_storyboard: input });
    expect(out.features.find((f) => f.id === 'state.activestoryboard')).toBeUndefined();
  });
});
