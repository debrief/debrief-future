/**
 * Pure query-string parser for the Storyboard edit harness (Feature 230
 * US4 — T050). Kept in its own module so unit tests don't trigger the
 * full StoryboardEditHarness import graph (Leaflet/React/etc.).
 */

export interface StoryboardEditHarnessInitialState {
  readonly staleSceneIds: readonly string[];
  readonly pendingDeleteSceneIds: readonly string[];
  readonly missingDataBySceneId: Readonly<Record<string, readonly string[]>>;
}

export const EMPTY_HARNESS_INITIAL: StoryboardEditHarnessInitialState = {
  staleSceneIds: [],
  pendingDeleteSceneIds: [],
  missingDataBySceneId: {},
};

export function parseHarnessQueryString(
  search: string,
): StoryboardEditHarnessInitialState {
  const params = new URLSearchParams(search);
  const stale = params.get('stale');
  const pendingDelete = params.get('pendingDelete');
  const missingData = params.get('missingData');
  const staleSceneIds = stale
    ? stale.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const pendingDeleteSceneIds = pendingDelete
    ? pendingDelete.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const missingDataBySceneId: Record<string, readonly string[]> = {};
  if (missingData) {
    const entries = missingData.split('|');
    for (const entry of entries) {
      const [sceneId, idsPart] = entry.split(':');
      if (!sceneId) continue;
      const ids = (idsPart ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      missingDataBySceneId[sceneId] = ids;
    }
  }
  return { staleSceneIds, pendingDeleteSceneIds, missingDataBySceneId };
}
