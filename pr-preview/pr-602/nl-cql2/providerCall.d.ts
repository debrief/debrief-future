import { Agent } from 'node:https';
import { LiveOutcome } from './types.ts';

export interface ProviderCallInput {
    readonly prompt: string;
    readonly model: string;
    /** NEVER stored, NEVER logged. Lives only inside this function. */
    readonly apiKey: string;
    readonly timeoutMs: number;
    readonly maxResponseBytes: number;
    readonly signal: AbortSignal;
    /** For logging only — not included in the request body. */
    readonly callIndex: number;
}
export type ProviderCall = (input: ProviderCallInput) => Promise<LiveOutcome>;
/**
 * Test seam: override the HTTPS endpoint / agent (default: Anthropic). Kept
 * internal — only `providerCall.test.ts` injects these. Exposing them off the
 * public barrel is deliberate (keeps the surface tight).
 */
export interface ProviderCallOverrides {
    readonly endpoint?: string;
    readonly agent?: Agent;
}
export declare function providerCall(input: ProviderCallInput, overrides?: ProviderCallOverrides): Promise<LiveOutcome>;
//# sourceMappingURL=providerCall.d.ts.map