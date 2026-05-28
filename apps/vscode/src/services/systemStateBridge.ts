/**
 * VS Code re-export of the host-agnostic SystemState store-bridge (feature 261).
 *
 * The translation between the session store and the FeatureCollection-based
 * SystemState persistence lives in `@debrief/session-state` so both hosts share
 * one implementation (FR-015). This module simply surfaces it to the VS Code
 * command call sites (`openPlot.ts` / `saveSession.ts`).
 */
export {
  applyStateToFeatures,
  buildWriteInputFromStore,
  hydrateStoreFromFeatures,
  SystemStateLoadError,
  type FeatureLike,
} from '@debrief/session-state';
