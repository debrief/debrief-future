/**
 * Query-string parser tests for the Storyboard edit harness (Feature
 * 230 US4 — T050). These verify that Playwright can set up deterministic
 * initial state via URL parameters.
 */

import { describe, it, expect } from 'vitest';
import { parseHarnessQueryString } from '../storyboard-edit-harness-querystring';

describe('parseHarnessQueryString', () => {
  it('returns empty initial state for empty search', () => {
    const out = parseHarnessQueryString('');
    expect(out.staleSceneIds).toEqual([]);
    expect(out.pendingDeleteSceneIds).toEqual([]);
    expect(out.missingDataBySceneId).toEqual({});
  });

  it('parses `stale=A,B` into staleSceneIds', () => {
    const out = parseHarnessQueryString('?stale=sceneA,sceneC');
    expect(out.staleSceneIds).toEqual(['sceneA', 'sceneC']);
  });

  it('trims whitespace and drops empty entries in stale', () => {
    const out = parseHarnessQueryString('?stale=sceneA, , sceneB');
    expect(out.staleSceneIds).toEqual(['sceneA', 'sceneB']);
  });

  it('parses `pendingDelete=X`', () => {
    const out = parseHarnessQueryString('?pendingDelete=sceneB');
    expect(out.pendingDeleteSceneIds).toEqual(['sceneB']);
  });

  it('parses `missingData=S:f1,f2`', () => {
    const out = parseHarnessQueryString(
      '?missingData=sceneC:track-alpha,track-bravo',
    );
    expect(out.missingDataBySceneId).toEqual({
      sceneC: ['track-alpha', 'track-bravo'],
    });
  });

  it('parses multi-scene missingData with pipe separator', () => {
    const out = parseHarnessQueryString(
      '?missingData=sceneC:f1,f2|sceneD:f3',
    );
    expect(out.missingDataBySceneId).toEqual({
      sceneC: ['f1', 'f2'],
      sceneD: ['f3'],
    });
  });

  it('composes all three knobs together', () => {
    const out = parseHarnessQueryString(
      '?stale=sceneA&pendingDelete=sceneB&missingData=sceneC:f1',
    );
    expect(out.staleSceneIds).toEqual(['sceneA']);
    expect(out.pendingDeleteSceneIds).toEqual(['sceneB']);
    expect(out.missingDataBySceneId).toEqual({ sceneC: ['f1'] });
  });

  // --- Feature 234 FR-043 — dual failure-injection knobs (T3A) ---------
  describe('failure-injection knobs (FR-043)', () => {
    it('parses `induceCopyFailure=sceneB`', () => {
      const out = parseHarnessQueryString('?induceCopyFailure=sceneB');
      expect(out.induceCopyFailure).toBe('sceneB');
      expect(out.induceRefreshFailure).toBeUndefined();
    });

    it('parses `induceRefreshFailure=sceneC`', () => {
      const out = parseHarnessQueryString('?induceRefreshFailure=sceneC');
      expect(out.induceRefreshFailure).toBe('sceneC');
      expect(out.induceCopyFailure).toBeUndefined();
    });

    it('parses both knobs independently when set together', () => {
      const out = parseHarnessQueryString(
        '?induceCopyFailure=sceneB&induceRefreshFailure=sceneC',
      );
      expect(out.induceCopyFailure).toBe('sceneB');
      expect(out.induceRefreshFailure).toBe('sceneC');
    });

    it('omits both fields when neither knob is present', () => {
      const out = parseHarnessQueryString('?stale=sceneA');
      expect(out.induceCopyFailure).toBeUndefined();
      expect(out.induceRefreshFailure).toBeUndefined();
    });

    it('drops an empty knob value with a warning', () => {
      const warnings: string[] = [];
      const out = parseHarnessQueryString(
        '?induceCopyFailure=&induceRefreshFailure=   ',
        { warn: (m) => warnings.push(m) },
      );
      expect(out.induceCopyFailure).toBeUndefined();
      expect(out.induceRefreshFailure).toBeUndefined();
      expect(warnings.length).toBe(2);
      expect(warnings[0]).toContain('induceCopyFailure');
      expect(warnings[1]).toContain('induceRefreshFailure');
    });
  });
});
