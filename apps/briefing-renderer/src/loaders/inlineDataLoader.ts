/**
 * Inline-data loader for the briefing renderer SPA.
 *
 * Reads the three `<script type="application/json">` blocks injected into
 * `index.html` by the VS Code export command (see `data-model.md` § 4)
 * and narrows them to typed models at the briefing boundary.
 *
 * Validation gates (data-model § 8):
 *   1. Each JSON block parses cleanly.
 *   2. The FeatureCollection has the right top-level shape.
 *   3. Exactly one StoryboardFeature is present (scoping check).
 *   4. Every SceneFeature's `storyboard_id` matches that one Storyboard.
 *   5. flavourCheck() is run per Scene to enforce the time_range XOR
 *      from #263 (deferred to the playback driver — Scenes are validated
 *      as they enter the active branch).
 *
 * The full JSON-Schema validator integration (T042 decision 2A) is
 * deferred — the schema-validator surface in @debrief/schemas is not yet
 * shipped to the SPA. We rely on TypeScript narrowing + the scoping
 * guards here. When the validator lands, swap step 1 into a single
 * `validate(features, plotFeatureCollectionSchema)` call.
 */

import { isStoryboardFeature, isSceneFeature } from '@debrief/components';
import type {
  BriefingConfig,
  BriefingFeatureCollection,
  BriefingItemJson,
  InlineData,
  SceneFeature,
  StoryboardFeature,
} from '../types';

export class InlineDataLoadError extends Error {
  constructor(
    message: string,
    public readonly slot?: 'features' | 'item' | 'config',
  ) {
    super(message);
    this.name = 'InlineDataLoadError';
  }
}

interface LoaderDeps {
  /**
   * Look up an element by id and return its text content, or null if the
   * element is absent or empty. Replaceable for tests.
   */
  readSlot(id: string): string | null;
}

export const defaultLoaderDeps: LoaderDeps = {
  readSlot(id: string): string | null {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    if (!el) return null;
    const text = el.textContent?.trim() ?? '';
    return text.length > 0 ? text : null;
  },
};

function parseSlot<T>(raw: string, slot: 'features' | 'item' | 'config'): T {
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new InlineDataLoadError(
      `Failed to parse JSON in #briefing-${slot}-data: ${(e as Error).message}`,
      slot,
    );
  }
}

export function validateFeatureCollection(
  fc: BriefingFeatureCollection,
): { storyboard: StoryboardFeature; scenes: readonly SceneFeature[] } {
  if (fc.type !== 'FeatureCollection') {
    throw new InlineDataLoadError(
      `Expected FeatureCollection at root, got "${String((fc as { type?: unknown }).type)}"`,
      'features',
    );
  }
  if (!Array.isArray(fc.features)) {
    throw new InlineDataLoadError('FeatureCollection.features is not an array', 'features');
  }

  const storyboards = fc.features.filter(isStoryboardFeature);
  if (storyboards.length === 0) {
    throw new InlineDataLoadError(
      'Briefing FeatureCollection contains no StoryboardFeature',
      'features',
    );
  }
  if (storyboards.length > 1) {
    throw new InlineDataLoadError(
      `Briefing FeatureCollection contains ${storyboards.length} StoryboardFeatures; expected exactly 1`,
      'features',
    );
  }
  const storyboard = storyboards[0]!;
  const expectedId = storyboard.properties.id;

  const allScenes = fc.features.filter(isSceneFeature);
  const matchingScenes = allScenes.filter((s) => s.properties.storyboard_id === expectedId);
  const mismatched = allScenes.filter((s) => s.properties.storyboard_id !== expectedId);
  if (mismatched.length > 0) {
    throw new InlineDataLoadError(
      `Briefing contains ${mismatched.length} Scene(s) referencing a different Storyboard`,
      'features',
    );
  }

  // Order Scenes deterministically per data-model BR-5: timestamp ASC,
  // creation_order ASC.
  const ordered = [...matchingScenes].sort((a, b) => {
    const ta = Date.parse(a.properties.timestamp);
    const tb = Date.parse(b.properties.timestamp);
    if (ta !== tb) return ta - tb;
    const ca = a.properties.creation_order ?? 0;
    const cb = b.properties.creation_order ?? 0;
    return ca - cb;
  });

  return { storyboard, scenes: ordered };
}

export function validateItem(item: BriefingItemJson): void {
  if (item.type !== 'Feature') {
    throw new InlineDataLoadError(
      `Expected item.type === "Feature"; got "${String(item.type)}"`,
      'item',
    );
  }
  if (typeof item.id !== 'string' || item.id.length === 0) {
    throw new InlineDataLoadError('item.json missing required `id`', 'item');
  }
}

export function validateConfig(config: BriefingConfig): void {
  if (typeof config.tileLayerAttribution !== 'string') {
    throw new InlineDataLoadError('config missing required tileLayerAttribution', 'config');
  }
  if (typeof config.maxBundledZoom !== 'number') {
    throw new InlineDataLoadError('config missing required maxBundledZoom', 'config');
  }
}

export interface LoadedInlineData extends InlineData {
  storyboard: StoryboardFeature;
  scenes: readonly SceneFeature[];
}

export function loadInlineData(deps: LoaderDeps = defaultLoaderDeps): LoadedInlineData | null {
  const featuresRaw = deps.readSlot('briefing-features-data');
  const itemRaw = deps.readSlot('briefing-item-data');
  const configRaw = deps.readSlot('briefing-config');

  if (!featuresRaw || !itemRaw || !configRaw) {
    // Empty slots in dev — caller falls back to a local fixture.
    return null;
  }

  const features = parseSlot<BriefingFeatureCollection>(featuresRaw, 'features');
  const item = parseSlot<BriefingItemJson>(itemRaw, 'item');
  const config = parseSlot<BriefingConfig>(configRaw, 'config');

  const { storyboard, scenes } = validateFeatureCollection(features);
  validateItem(item);
  validateConfig(config);

  return { features, item, config, storyboard, scenes };
}
