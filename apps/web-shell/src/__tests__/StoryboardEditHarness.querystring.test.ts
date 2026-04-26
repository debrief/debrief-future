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
});
