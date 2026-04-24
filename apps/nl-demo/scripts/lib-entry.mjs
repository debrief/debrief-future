/**
 * Bundle entry: re-export only the symbols the demo imports from
 * @debrief/components. esbuild bundles this into data/debrief-lib.js as
 * browser-ready ESM. Keeping the surface tight keeps the bundle small.
 */

export {
  generateCql2,
  createRecordedLLMClient,
  createLiveLLMClient,
  validateLiveConfig,
  isLiveTransportError,
  canonicalisePhrase,
  buildPrompt,
} from "../../../shared/components/src/nl-cql2/index.ts";

export {
  filterByCql2Json,
  vesselClassTreeToTaxonomy,
} from "../../../shared/components/src/filter-engine/index.ts";
