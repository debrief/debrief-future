/**
 * Reconcile-on-open hook for the atomic plot save (#268, US3).
 *
 * Extracted from `openPlot.ts` so it can be exercised in a Node test
 * environment without pulling in the webview/Leaflet dependency graph.
 */

import type { StacWriter, ReconcilePlotSaveResult } from '@debrief/stac-writer';

/**
 * Heal an interrupted save before the plot is read. `reconcilePlotSave` can
 * change what is on disk (roll a committed-but-unapplied save forward, or
 * discard pre-commit temps), so this MUST run before `loadPlot` /
 * `loadPlotData`. When it acts, a non-blocking notice is shown (FR-008).
 * Reconcile must never block opening — any failure is logged and swallowed.
 */
export async function reconcileBeforeOpen(
  getStacWriter: ((storePath: string) => StacWriter) | undefined,
  storePath: string,
  itemPath: string,
  showWarning: (message: string) => void,
): Promise<ReconcilePlotSaveResult | null> {
  if (!getStacWriter) {
    return null;
  }
  try {
    const writer = getStacWriter(storePath);
    const result = await writer.reconcilePlotSave({
      ctx: { kind: 'fs', nowMs: () => Date.now(), randomId: () => '' },
      stacItemPath: itemPath,
    });
    if (result.recovered) {
      showWarning(
        'Recovered an interrupted save — opened the last good version of this plot.',
      );
    }
    return result;
  } catch (err) {
    console.warn('[debrief] openPlot: reconcilePlotSave failed', err);
    return null;
  }
}
