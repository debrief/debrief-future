/**
 * Public API for the NL → CQL2 generator (#188).
 *
 * Consumers:
 *   - #189 Stakeholder Demo UI — imports `generateCql2` + clients.
 *   - #190 Live LLM Transport — imports `createPassthroughLLMClient` + types.
 *
 * The harness (`__tests__/harness.ts`) and its helpers are test-only and not
 * re-exported here — decision 13A keeps them out of `dist/`.
 */
export { generateCql2, PROMPT_VERSION } from './generate';
export { buildPrompt } from './buildPrompt';
export { schemaDescription } from './schemaDescription';
export { createRecordedLLMClient, createPassthroughLLMClient, extractPhraseFromPrompt, createLiveLLMClient, validateLiveConfig, isLiveTransportError, LiveTransportAbort, } from './clients';
export { canonicalisePhrase, sha256Hex } from './hash';
export { parseResponse } from './parseResponse';
export type { Cql2Json, LozengeSeed, GenerationErrorReason, GenerationError, GenerationDiagnostics, GenerationResult, GenerationResultError, LLMClient, RecordedResponse, ResponseMap, EnumBundle, VesselClassNode, EnumBundleMeta, GenerateDeps, CorpusRecord, CorpusExpectation, HarnessPass, HarnessFail, HarnessReport, RunHarnessDeps, LiveConfig, LiveConfigValidationError, LiveConfigValidationResult, LiveTransportError, LiveTransportErrorReason, LiveLLMClient, TransportCallRecord, } from './types';
//# sourceMappingURL=index.d.ts.map