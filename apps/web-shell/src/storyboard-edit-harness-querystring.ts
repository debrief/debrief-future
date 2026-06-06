/**
 * Pure query-string parser for the Storyboard edit harness (Feature 230
 * US4 — T050; extended by Feature 234 FR-043 with the dual-knob failure
 * injection). Kept in its own module so unit tests don't trigger the
 * full StoryboardEditHarness import graph (Leaflet/React/etc.).
 *
 * **234 FR-043** — adds two optional, independent failure-injection knobs
 * the Playwright suite uses to deterministically reach failure branches:
 *
 *   - `?induceCopyFailure=<sceneId>` — routes the matching Scene's
 *     copy-to-other dispatch to the deep-copy rollback branch.
 *   - `?induceRefreshFailure=<sceneId>` — routes the matching Scene's
 *     refresh-thumbnail / refresh-all-stale dispatch to the per-Scene
 *     failure branch (used by the bulk-refresh-partial-failure scenario).
 *
 * Empty values for either knob are dropped with a single `console.warn`
 * so flaky test runs are debuggable rather than silent. Setting both
 * knobs is supported and independent — see contracts/harness-knobs.md §1.
 */

export interface StoryboardEditHarnessInitialState {
  readonly staleSceneIds: readonly string[];
  readonly pendingDeleteSceneIds: readonly string[];
  readonly missingDataBySceneId: Readonly<Record<string, readonly string[]>>;
  /**
   * 234 FR-043 — when set, the copy-to-other handler routes the matching
   * sceneId to the deep-copy failure branch.
   */
  readonly induceCopyFailure?: string;
  /**
   * 234 FR-043 — when set, refresh-thumbnail / refresh-all-stale routes
   * the matching sceneId to the per-Scene failure branch.
   */
  readonly induceRefreshFailure?: string;
}

export const EMPTY_HARNESS_INITIAL: StoryboardEditHarnessInitialState = {
  staleSceneIds: [],
  pendingDeleteSceneIds: [],
  missingDataBySceneId: {},
};

/**
 * Read an optional knob value. Empty/whitespace-only values are dropped
 * with a console warning so a malformed Playwright URL surfaces in the
 * test log rather than silently disabling the failure path.
 */
function readKnob(
  params: URLSearchParams,
  name: string,
  warn: (message: string) => void,
): string | undefined {
  if (!params.has(name)) {
    return undefined;
  }
  const raw = params.get(name) ?? '';
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    warn(
      `[storyboard-edit-harness-querystring] Ignoring empty "${name}" knob — supply a sceneId or omit the param.`,
    );
    return undefined;
  }
  return trimmed;
}

export interface ParseHarnessQueryStringOptions {
  /**
   * Override the warning sink for unit tests. Defaults to `console.warn`.
   */
  readonly warn?: (message: string) => void;
}

export function parseHarnessQueryString(
  search: string,
  options?: ParseHarnessQueryStringOptions,
): StoryboardEditHarnessInitialState {
  const params = new URLSearchParams(search);
  const warn = options?.warn ?? ((m: string): void => console.warn(m));
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
  const induceCopyFailure = readKnob(params, 'induceCopyFailure', warn);
  const induceRefreshFailure = readKnob(params, 'induceRefreshFailure', warn);
  const result: StoryboardEditHarnessInitialState = {
    staleSceneIds,
    pendingDeleteSceneIds,
    missingDataBySceneId,
    ...(induceCopyFailure !== undefined ? { induceCopyFailure } : {}),
    ...(induceRefreshFailure !== undefined ? { induceRefreshFailure } : {}),
  };
  return result;
}
