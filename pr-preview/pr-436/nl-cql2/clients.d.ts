import { LLMClient, ResponseMap } from './types';

/** Canonicalise a phrase for fixture lookup (trim + lowercase + whitespace collapse). */
export declare function canonicalisePhrase(phrase: string): string;
/**
 * Replay-only client. Keys `responses` by canonicalised phrase; on lookup,
 * canonicalises the caller's prompt phrase and checks the recorded
 * `promptHash` matches SHA-256 of the current prompt. Any miss or mismatch
 * throws with a re-record diagnostic.
 */
export declare function createRecordedLLMClient(responses: ResponseMap): LLMClient;
/** Trivial wrapper forwarding to a caller-supplied async function. */
export declare function createPassthroughLLMClient(fn: (prompt: string) => Promise<string>): LLMClient;
//# sourceMappingURL=clients.d.ts.map