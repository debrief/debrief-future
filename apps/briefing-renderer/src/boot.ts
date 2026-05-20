/**
 * SPA boot sequence (T059).
 *
 * Encapsulates the loader-then-seed flow that drives the briefing
 * renderer from its inlined `<script type="application/json">` blocks
 * (or, in dev, from the local fixture). Returns a `BootResult` that the
 * `App` component renders into the appropriate top-level state
 * (loading / ready / empty / error).
 *
 * Per `contracts/spa-loading.md` § Loading sequence:
 *   1. Read inline JSON blocks (via `loadInlineData`).
 *   2. Validate the briefing payload (scoping guards + sanity checks).
 *   3. Seed the store with the resolved features / item / scenes / config.
 *   4. On boundary-validation failure, transition to the visible Error state.
 *
 * The driver instantiation + map mount happen inside React (via
 * `PlaybackProvider` and `BriefingMap`). `boot.ts` is the pre-React
 * step that turns the empty `<script>` slots into a seeded store.
 */

import type { BriefingStore } from './store';
import { loadInlineData, InlineDataLoadError } from './loaders/inlineDataLoader';
import { buildDevFixture } from './fixtures/dev-fixture';
import type { InlineData, SceneFeature, StoryboardFeature } from './types';

export type BootResult =
  | { kind: 'seeded' }
  | { kind: 'error'; message: string };

export interface BootOptions {
  /**
   * Optional override for Playwright tests — bypasses the inlined-JSON
   * extraction step and the dev-fixture fallback.
   */
  inlineData?: InlineData & { storyboard: StoryboardFeature; scenes: readonly SceneFeature[] };
  /**
   * When true, suppress the dev-fixture fallback. Tests that want to
   * exercise the empty-slots → error path pass `true` here.
   */
  disableDevFixture?: boolean;
}

/**
 * Run the boot sequence against the given store. Returns the resolved
 * boot state; the caller flips the top-level loading indicator to that
 * state inside React.
 */
export function bootBriefingRenderer(
  store: BriefingStore,
  opts: BootOptions = {},
): BootResult {
  if (opts.inlineData) {
    store.seed({
      features: opts.inlineData.features,
      item: opts.inlineData.item,
      config: opts.inlineData.config,
      scenes: opts.inlineData.scenes,
    });
    return { kind: 'seeded' };
  }

  try {
    const loaded = loadInlineData();
    if (loaded) {
      store.seed({
        features: loaded.features,
        item: loaded.item,
        config: loaded.config,
        scenes: loaded.scenes,
      });
      return { kind: 'seeded' };
    }
    if (opts.disableDevFixture) {
      return { kind: 'error', message: 'No briefing data found in inlined slots.' };
    }
    // Empty slots → dev fixture (Vite dev server only).
    const fixture = buildDevFixture();
    store.seed({
      features: fixture.features,
      item: fixture.item,
      config: fixture.config,
      scenes: fixture.scenes,
    });
    return { kind: 'seeded' };
  } catch (e) {
    const msg =
      e instanceof InlineDataLoadError
        ? `Briefing data is unreadable: ${e.message}`
        : `Unexpected boot error: ${(e as Error).message}`;
    return { kind: 'error', message: msg };
  }
}
