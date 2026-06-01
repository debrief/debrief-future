/**
 * Vitest for the #273 live-preview features-URL resolution (query → injected
 * global fallback). The global path exists because code-server's
 * `asExternalUri` rewrite to `/proxy/<port>/` drops the launch query.
 */

import { describe, it, expect } from 'vitest';
import { resolveFeaturesUrl } from '../resolveFeaturesUrl';

function win(search: string, injected?: unknown) {
  return { location: { search }, __BRIEFING_PREVIEW_FEATURES__: injected };
}

describe('resolveFeaturesUrl', () => {
  it('prefers the launch ?features= query (loopback-direct + web-shell blob)', () => {
    expect(resolveFeaturesUrl(win('?features=features.geojson'))).toBe('features.geojson');
    expect(resolveFeaturesUrl(win('?features=blob:https://x/y', 'ignored'))).toBe('blob:https://x/y');
  });

  it('falls back to the injected global when the proxy stripped the query', () => {
    expect(resolveFeaturesUrl(win('', 'features.geojson'))).toBe('features.geojson');
    // A query without `features` still falls through to the global.
    expect(resolveFeaturesUrl(win('?story=mode-toggle', 'features.geojson'))).toBe('features.geojson');
  });

  it('returns null when neither is present (→ inline / dev-fixture boot)', () => {
    expect(resolveFeaturesUrl(win(''))).toBeNull();
    expect(resolveFeaturesUrl(win('?other=1'))).toBeNull();
  });

  it('ignores a non-string or empty injected global', () => {
    expect(resolveFeaturesUrl(win('', ''))).toBeNull();
    expect(resolveFeaturesUrl(win('', 42))).toBeNull();
    expect(resolveFeaturesUrl(win('', { url: 'x' }))).toBeNull();
  });
});
