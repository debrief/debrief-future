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
  hydrateStoreFromFeatures,
  SystemStateLoadError,
  type FeatureLike,
  // spec 267 — the tolerant-clamp diagnostic the load path may return so the
  // command call-sites can type the value they surface to the analyst.
  type PlayheadClampDiagnostic,
} from '@debrief/session-state';
