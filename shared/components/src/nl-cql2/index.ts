/**
 * Public API for the NL → CQL2 generator (#188, #190, #191).
 *
 * Consumers:
 *   - #189 Stakeholder Demo UI — imports `generateCql2` + clients.
 *   - #190 Live LLM Transport — imports `createLiveLLMClient` + types.
 *   - #191 VS Code NL Search — imports `createPostMessageLLMClient` + types.
 *
 * The harness (`__tests__/harness.ts`) and its helpers are test-only and not
 * re-exported here.
 */

export { generateCql2, PROMPT_VERSION } from "./generate";
export { buildPrompt } from "./buildPrompt";
export { schemaDescription } from "./schemaDescription";
export {
  createRecordedLLMClient,
  createPassthroughLLMClient,
  createLiveLLMClient,
  createPostMessageLLMClient,
  extractPhraseFromPrompt,
  validateLiveConfig,
  isLiveTransportError,
} from "./clients";
export type { PostMessageLLMClientOptions } from "./clients";
export { canonicalisePhrase, sha256Hex } from "./hash";
export { parseResponse } from "./parseResponse";

// `providerCall` is Node-only — it imports `node:https`. Node consumers
// (VS Code host, scripts) import it via the dedicated subpath
// `@debrief/components/nl-cql2-node`. Re-exporting it here would cascade
// node types into every browser consumer of `@debrief/components`.

export type {
  Cql2Json,
  LozengeSeed,
  GenerationErrorReason,
  GenerationError,
  GenerationDiagnostics,
  GenerationResult,
  GenerationResultError,
  LLMClient,
  RecordedResponse,
  ResponseMap,
  EnumBundle,
  VesselClassNode,
  EnumBundleMeta,
  GenerateDeps,
  CorpusRecord,
  CorpusExpectation,
  HarnessPass,
  HarnessFail,
  HarnessReport,
  RunHarnessDeps,
  // LiveConfig (#191 — discriminated union)
  LiveConfig,
  BrowserLiveConfig,
  VsCodeLiveConfig,
  LiveConfigValidationError,
  LiveConfigValidationResult,
  // LiveOutcome union
  LiveOutcome,
  LiveSuccess,
  LiveAuthFailure,
  LiveRateLimit,
  LiveProviderError,
  LiveTransportError,
  LiveTimeout,
  LiveMalformedResponse,
  LiveNotConfigured,
  LiveCeilingReached,
  TransportCallRecord,
} from "./types";
