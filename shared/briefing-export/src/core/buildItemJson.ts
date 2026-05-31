/**
 * buildItemJson — pure helper. Scopes the source plot's STAC item.json
 * for the briefing zip (data-model § 3, BI-1–BI-5).
 *
 *   BI-1  id matches the source plot's STAC item id.
 *   BI-2  properties.title + datetime fields copied unmodified.
 *   BI-3  assets filtered to only Scene-thumbnail keys referenced by Scenes.
 *   BI-4  retained asset hrefs remain valid post-unzip (paths already relative).
 *   BI-5  links reduced to `self` only.
 */

import type { SceneFeature } from '@debrief/components/storyboard';

export interface StacItemMinimal {
  type: 'Feature';
  stac_version: string;
  id: string;
  properties: {
    title?: string;
    datetime?: string | null;
    start_datetime?: string;
    end_datetime?: string;
    [key: string]: unknown;
  };
  assets?: Record<
    string,
    { href: string; type?: string; title?: string; roles?: string[] }
  >;
  links?: Array<{ rel: string; href: string; type?: string; title?: string }>;
  [key: string]: unknown;
}

export interface BriefingItemJson {
  type: 'Feature';
  stac_version: string;
  id: string;
  properties: StacItemMinimal['properties'];
  assets: Record<string, { href: string; type?: string; title?: string; roles?: string[] }>;
  links: Array<{ rel: string; href: string; type?: string; title?: string }>;
}

function getSceneThumbnailAssetKeys(scene: SceneFeature): string[] {
  // The Storyboarding capture pipeline pairs assets under
  // `scene-thumbnail-{ULID}` (large) and `scene-thumbnail-{ULID}-sm` (small).
  // We also accept an explicit `thumbnail_asset_ref` slot on the Scene's
  // properties if one is set.
  const id = scene.properties.id;
  const explicitRef = (scene.properties as { thumbnail_asset_ref?: unknown })
    .thumbnail_asset_ref;
  const keys = new Set<string>();
  keys.add(`scene-thumbnail-${id}`);
  keys.add(`scene-thumbnail-${id}-sm`);
  if (typeof explicitRef === 'string' && explicitRef.length > 0) {
    keys.add(explicitRef);
  }
  return Array.from(keys);
}

export function buildItemJson(
  source: StacItemMinimal,
  scenes: readonly SceneFeature[],
): BriefingItemJson {
  // BI-3: retain only Scene-thumbnail asset keys referenced by Scenes in scope.
  const wantedAssetKeys = new Set<string>();
  for (const scene of scenes) {
    for (const key of getSceneThumbnailAssetKeys(scene)) {
      wantedAssetKeys.add(key);
    }
  }

  const filteredAssets: BriefingItemJson['assets'] = {};
  const sourceAssets = source.assets ?? {};
  for (const [key, value] of Object.entries(sourceAssets)) {
    if (wantedAssetKeys.has(key)) {
      filteredAssets[key] = value;
    }
  }

  return {
    type: 'Feature',
    stac_version: source.stac_version,
    id: source.id,
    properties: { ...source.properties }, // BI-2: copy unmodified
    assets: filteredAssets,
    // BI-5: only the self-link remains.
    links: [{ rel: 'self', href: './item.json' }],
  };
}
