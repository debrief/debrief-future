/**
 * LLM client implementations for the NL → CQL2 generator (#188) + the live
 * transport (#190, #191).
 *
 * In-tree clients:
 *   - `createRecordedLLMClient(responses)` — replays a map of hand-authored
 *     fixtures keyed by canonicalised phrase. Throws on miss or prompt-hash
 *     mismatch (fixture-authoring programmer errors). Used in CI and offline
 *     stakeholder demos.
 *   - `createPassthroughLLMClient(fn)` — trivial wrapper that forwards to a
 *     caller-supplied async function returning the raw provider text. Used
 *     by the fixture-authoring workflow and by tests.
 *   - `createLiveLLMClient(config)` — #190's browser-side client. Routes
 *     through a loopback HTTP proxy (see `apps/nl-demo/scripts/live-proxy.mjs`)
 *     so provider credentials never enter the browser bundle.
 *
 * After #191 (review Decisions 1, 6, 8) all three return `LiveOutcome`; the
 * old `LiveTransportAbort` throw/catch pattern is removed.
 *
 * A fourth client — `createBadLLMClient` — lives under `__tests__/` and is
 * not exported from the public barrel.
 */

import { canonicalisePhrase, sha256Hex } from "./hash";
import type {
  BrowserLiveConfig,
  LLMClient,
  LiveConfig,
  LiveConfigValidationError,
  LiveConfigValidationResult,
  LiveOutcome,
  LiveTransportError,
  ResponseMap,
  TransportCallRecord,
} from "./types";

// ---------------------------------------------------------------------------
// Recorded fixture client (hand-authored responses map)
// ---------------------------------------------------------------------------

/**
 * A client that plays back pre-recorded responses from a hand-authored map.
 *
 * Lookup strategy:
 *   1. Canonicalise the phrase recovered from the prompt's `Phrase: <text>`
 *      suffix (see `buildPrompt.ts`).
 *   2. Verify the stored `promptHash` matches SHA-256 of the received prompt.
 *      Any mismatch means the fixture was recorded against a different prompt
 *      template and must be re-authored.
 *
 * Miss or hash-mismatch throws an `Error` — this is a programmer / fixture
 * authoring bug, NOT a normal transport failure, so it does not map to a
 * `LiveOutcome`. Callers wrap `generateCql2` in try/catch if they want
 * fallback behaviour (e.g. `apps/nl-demo` surfaces it as an off-corpus
 * banner).
 */
export function createRecordedLLMClient(responses: ResponseMap): LLMClient {
  return {
    async generate(prompt: string): Promise<LiveOutcome> {
      const phrase = extractPhraseFromPrompt(prompt);
      const canonical = canonicalisePhrase(phrase);
      const fixture = responses[canonical];
      if (!fixture) {
        throw new Error(
          `[nl-cql2/RecordedLLMClient] no recorded response for phrase ` +
            `"${canonical}". Re-author the fixture in responses.json.`,
        );
      }
      const actualHash = await sha256Hex(prompt);
      if (fixture.promptHash !== actualHash) {
        throw new Error(
          `[nl-cql2/RecordedLLMClient] prompt-hash mismatch for phrase ` +
            `"${canonical}". Stored: ${fixture.promptHash.slice(0, 12)}…, ` +
            `actual: ${actualHash.slice(0, 12)}…. The prompt template has ` +
            `changed since the fixture was recorded — re-author the fixture.`,
        );
      }
      return {
        kind: "success",
        rawResponse: fixture.rawResponse,
        durationMs: 0,
        responseBytes: byteLength(fixture.rawResponse),
        model: fixture.model,
      };
    },
    abort() {
      // No in-flight state to cancel.
    },
  };
}

/**
 * Trivial wrapper around a caller-supplied async function. The function
 * returns the raw provider response string; this wrapper adapts it to the
 * `LiveOutcome` contract by producing a `success` outcome.
 *
 * If the function throws, the throw propagates out of `generate()` — the
 * contract's "never throws on normal failure paths" guarantee applies to the
 * live transport, not to caller-supplied stubs.
 */
export function createPassthroughLLMClient(
  fn: (prompt: string) => Promise<string>,
  opts: { readonly model?: string } = {},
): LLMClient {
  const model = opts.model ?? "passthrough";
  return {
    async generate(prompt: string): Promise<LiveOutcome> {
      const rawResponse = await fn(prompt);
      return {
        kind: "success",
        rawResponse,
        durationMs: 0,
        responseBytes: byteLength(rawResponse),
        model,
      };
    },
    abort() {
      // No in-flight state to cancel.
    },
  };
}

/**
 * Recover the phrase from the end of the prompt. Matches the
 * `Phrase: <text>` suffix produced by `buildPrompt.ts`. Exported so tests can
 * verify the round-trip.
 */
export function extractPhraseFromPrompt(prompt: string): string {
  const lines = prompt.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    const match = line.match(/^Phrase:\s*(.*)$/);
    if (match) return match[1]!;
  }
  throw new Error(
    `[nl-cql2/extractPhraseFromPrompt] prompt does not end with "Phrase: ..."`,
  );
}

function byteLength(s: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(s).byteLength;
  }
  // Fallback for environments without TextEncoder (shouldn't happen in the
  // Node + modern-browser targets we ship to).
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    total += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return total;
}

// ---------------------------------------------------------------------------
// LiveConfig validator (browser variant only; VS Code reads via its own config
// service — see apps/vscode/src/services/llmProxy.ts readLiveConfig).
// ---------------------------------------------------------------------------

const VALID_PROXY_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

const MAX_TIMEOUT_MS = 300_000;
const MAX_CALLS_CEILING = 1_000;
const MIN_RESPONSE_BYTES = 1_024;
const MAX_RESPONSE_BYTES = 10_485_760;

function isPositiveInteger(v: unknown, upper: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v <= upper;
}

function isIntegerInRange(v: unknown, lo: number, hi: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
}

/**
 * Parse a raw value loaded from `live-config.json` into a validated
 * `BrowserLiveConfig`. The `transport` discriminator is filled in by the
 * validator (users don't write it in their local config); `callCeiling`
 * replaces the #190 `maxCalls` field (review Decision 6).
 *
 * Never throws on user-input errors — returns a tagged union so the demo
 * can route misconfig to a fallback-to-fixture banner naming the specific
 * field that failed.
 */
export function validateLiveConfig(raw: unknown): LiveConfigValidationResult {
  const errors: LiveConfigValidationError[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      errors: [
        {
          field: "enabled",
          message: "live-config.json must be a JSON object",
        },
      ],
    };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.enabled !== "boolean") {
    errors.push({ field: "enabled", message: "must be a boolean" });
  }

  if (typeof obj.proxyUrl !== "string" || obj.proxyUrl.length === 0) {
    errors.push({ field: "proxyUrl", message: "must be a non-empty string" });
  } else {
    try {
      const url = new URL(obj.proxyUrl);
      if (!VALID_PROXY_PROTOCOLS.has(url.protocol)) {
        errors.push({
          field: "proxyUrl",
          message: `must use http: or https: scheme (got ${url.protocol})`,
        });
      }
    } catch {
      errors.push({
        field: "proxyUrl",
        message: "must be an absolute http(s):// URL",
      });
    }
  }

  if (typeof obj.model !== "string" || obj.model.length === 0) {
    errors.push({ field: "model", message: "must be a non-empty string" });
  }

  if (!isPositiveInteger(obj.timeoutMs, MAX_TIMEOUT_MS)) {
    errors.push({
      field: "timeoutMs",
      message: `must be a positive integer ≤ ${MAX_TIMEOUT_MS}`,
    });
  }

  if (!isPositiveInteger(obj.callCeiling, MAX_CALLS_CEILING)) {
    errors.push({
      field: "callCeiling",
      message: `must be a positive integer ≤ ${MAX_CALLS_CEILING}`,
    });
  }

  if (!isIntegerInRange(obj.maxResponseBytes, MIN_RESPONSE_BYTES, MAX_RESPONSE_BYTES)) {
    errors.push({
      field: "maxResponseBytes",
      message: `must be an integer between ${MIN_RESPONSE_BYTES} and ${MAX_RESPONSE_BYTES}`,
    });
  }

  if (obj.proxyToken !== undefined && obj.proxyToken !== null) {
    if (typeof obj.proxyToken !== "string" || obj.proxyToken.length === 0) {
      errors.push({
        field: "proxyToken",
        message: "must be a non-empty string or null",
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const value: BrowserLiveConfig = {
    transport: "browser-proxy",
    enabled: obj.enabled as boolean,
    proxyUrl: obj.proxyUrl as string,
    model: obj.model as string,
    timeoutMs: obj.timeoutMs as number,
    callCeiling: obj.callCeiling as number,
    maxResponseBytes: obj.maxResponseBytes as number,
    proxyToken: typeof obj.proxyToken === "string" ? obj.proxyToken : null,
  };

  return { ok: true, value };
}

// ---------------------------------------------------------------------------
// Live LLM transport — browser flavour (#190, #191 T024)
// ---------------------------------------------------------------------------

/**
 * Type guard for `LiveTransportError`. Shape check only — NOT `instanceof`,
 * because the value may have crossed a structuredClone boundary.
 */
export function isLiveTransportError(value: unknown): value is LiveTransportError {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.kind !== "transport-error") return false;
  if (typeof v.reason !== "string") return false;
  if (typeof v.durationMs !== "number") return false;
  const validReasons: ReadonlySet<string> = new Set<LiveTransportError["reason"]>([
    "network",
    "cancelled",
    "unknown",
  ]);
  return validReasons.has(v.reason);
}

/**
 * Expected proxy response envelope on `POST /generate`.
 * See `specs/190-live-llm-transport/contracts/proxy-http.md`.
 */
interface ProxyResponseSuccess {
  readonly ok: true;
  readonly rawResponse: string;
  readonly bytes: number;
  readonly providerLatencyMs: number;
}

interface ProxyResponseError {
  readonly ok: false;
  readonly kind:
    | "auth-failure"
    | "rate-limit"
    | "provider-error"
    | "timeout"
    | "oversize-response"
    | "bad-request";
  readonly providerStatus: number | null;
  readonly message: string;
}

type ProxyResponse = ProxyResponseSuccess | ProxyResponseError;

function safePerformanceNow(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function hasReadableStreamReader(body: unknown): body is {
  getReader(): {
    read(): Promise<{ done: boolean; value?: Uint8Array }>;
    cancel(): Promise<void>;
  };
} {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { getReader?: unknown }).getReader === "function"
  );
}

async function readBodyWithCap(
  response: Response,
  maxBytes: number,
): Promise<{ ok: true; text: string; bytes: number } | { ok: false; reason: "oversize" }> {
  const body = response.body;
  if (!hasReadableStreamReader(body)) {
    const text = await response.text();
    const bytes = new TextEncoder().encode(text).byteLength;
    if (bytes > maxBytes) return { ok: false, reason: "oversize" };
    return { ok: true, text, bytes };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let accumulated = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    accumulated += value.byteLength;
    if (accumulated > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        // reader.cancel rejections are not actionable.
      }
      return { ok: false, reason: "oversize" };
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(accumulated);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder("utf-8").decode(combined);
  return { ok: true, text, bytes: accumulated };
}

function emitRecord(record: TransportCallRecord): void {
  if (typeof console !== "undefined" && typeof console.info === "function") {
    console.info("[nl-demo/live]", record);
  }
}

/**
 * Build a live LLM client backed by a local loopback HTTP proxy. The proxy
 * itself holds the Anthropic credential in its environment and speaks HTTPS
 * upstream via the shared `providerCall` core. This client's responsibilities
 * are URL assembly, optional `X-Proxy-Token`, streams-and-counts response
 * reading, outcome classification, and cancellation via `abort()`.
 *
 * Behaviour invariants:
 *   - `generate()` NEVER throws — all outcomes are `LiveOutcome`.
 *   - `abort()` is idempotent. It tears down every in-flight `fetch()` and
 *     causes the pending `generate()` to resolve with
 *     `{kind:"transport-error", reason:"cancelled"}`.
 *   - Per-session call ceiling short-circuits without issuing a fetch.
 *   - Per-call response budget enforced via streaming reader.
 */
export function createLiveLLMClient(config: BrowserLiveConfig): LLMClient {
  let callsUsed = 0;
  const inFlight = new Set<AbortController>();

  function makeRecord(
    outcome: LiveOutcome["kind"],
    durationMs: number,
    responseBytes: number | null,
    callIndex: number,
  ): TransportCallRecord {
    return {
      ts: new Date().toISOString(),
      provider: "anthropic",
      model: config.model,
      durationMs,
      outcome,
      responseBytes,
      callIndex,
    };
  }

  function finalise(
    outcome: LiveOutcome,
    callIndex: number,
    responseBytes: number | null,
  ): LiveOutcome {
    emitRecord(makeRecord(outcome.kind, outcome.durationMs, responseBytes, callIndex));
    return outcome;
  }

  return {
    async generate(prompt: string): Promise<LiveOutcome> {
      const startedAt = safePerformanceNow();
      const durationMs = (): number =>
        Math.max(0, safePerformanceNow() - startedAt);

      // Per-session ceiling short-circuits before any fetch.
      if (callsUsed >= config.callCeiling) {
        return finalise(
          { kind: "ceiling-reached", ceiling: config.callCeiling, durationMs: 0 },
          callsUsed,
          null,
        );
      }

      const callIndex = callsUsed;
      callsUsed += 1;

      const controller = new AbortController();
      inFlight.add(controller);

      const timeoutHandle = setTimeout(() => {
        try {
          controller.abort(new DOMException("timeout", "TimeoutError"));
        } catch {
          controller.abort();
        }
      }, config.timeoutMs);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (typeof config.proxyToken === "string" && config.proxyToken.length > 0) {
        headers["X-Proxy-Token"] = config.proxyToken;
      }

      const body = JSON.stringify({ prompt, model: config.model });

      let response: Response;
      try {
        response = await fetch(config.proxyUrl, {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutHandle);
        inFlight.delete(controller);
        const aborted =
          (err instanceof DOMException && err.name === "AbortError") ||
          (err as { name?: string } | null)?.name === "AbortError";
        if (aborted) {
          // Could be a timeout, or an explicit abort() supersession.
          const reason = controller.signal.reason;
          const isSupersede =
            reason !== undefined &&
            typeof reason === "object" &&
            reason !== null &&
            (reason as { name?: string }).name === "SupersededError";
          if (isSupersede) {
            return finalise(
              { kind: "transport-error", reason: "cancelled", durationMs: durationMs() },
              callIndex,
              null,
            );
          }
          return finalise(
            { kind: "timeout", durationMs: durationMs() },
            callIndex,
            null,
          );
        }
        return finalise(
          { kind: "transport-error", reason: "network", durationMs: durationMs() },
          callIndex,
          null,
        );
      }

      let parsed: ProxyResponse;
      try {
        const read = await readBodyWithCap(response, config.maxResponseBytes);
        if (!read.ok) {
          clearTimeout(timeoutHandle);
          inFlight.delete(controller);
          return finalise(
            {
              kind: "malformed-response",
              reason: "oversize",
              durationMs: durationMs(),
              responseBytes: config.maxResponseBytes,
            },
            callIndex,
            null,
          );
        }
        try {
          parsed = JSON.parse(read.text) as ProxyResponse;
        } catch {
          clearTimeout(timeoutHandle);
          inFlight.delete(controller);
          return finalise(
            {
              kind: "malformed-response",
              reason: "non-json",
              durationMs: durationMs(),
              responseBytes: read.bytes,
            },
            callIndex,
            null,
          );
        }
      } catch (err) {
        clearTimeout(timeoutHandle);
        inFlight.delete(controller);
        void err;
        return finalise(
          { kind: "transport-error", reason: "network", durationMs: durationMs() },
          callIndex,
          null,
        );
      }

      clearTimeout(timeoutHandle);
      inFlight.delete(controller);

      if (parsed.ok) {
        const responseBytes = byteLength(parsed.rawResponse);
        return finalise(
          {
            kind: "success",
            rawResponse: parsed.rawResponse,
            durationMs: durationMs(),
            responseBytes,
            model: config.model,
          },
          callIndex,
          responseBytes,
        );
      }

      return finalise(
        mapProxyErrorToOutcome(parsed, response.status, durationMs()),
        callIndex,
        null,
      );
    },

    abort(): void {
      const superseded = (() => {
        try {
          return new DOMException("superseded", "SupersededError");
        } catch {
          const err = new Error("superseded");
          err.name = "SupersededError";
          return err;
        }
      })();
      for (const controller of inFlight) {
        try {
          controller.abort(superseded);
        } catch {
          // Abort is best-effort.
        }
      }
      inFlight.clear();
    },
  };
}

function mapProxyErrorToOutcome(
  err: ProxyResponseError,
  httpStatus: number,
  durationMs: number,
): LiveOutcome {
  switch (err.kind) {
    case "auth-failure":
      return {
        kind: "auth-failure",
        providerStatus: err.providerStatus ?? httpStatus,
        durationMs,
      };
    case "rate-limit":
      return {
        kind: "rate-limit",
        providerStatus: err.providerStatus ?? httpStatus,
        retryAfterSeconds: null,
        durationMs,
      };
    case "provider-error":
      return {
        kind: "provider-error",
        providerStatus: err.providerStatus ?? httpStatus,
        durationMs,
      };
    case "timeout":
      return { kind: "timeout", durationMs };
    case "oversize-response":
      return {
        kind: "malformed-response",
        reason: "oversize",
        durationMs,
        responseBytes: 0,
      };
    case "bad-request":
      return { kind: "transport-error", reason: "unknown", durationMs };
  }
}

// ---------------------------------------------------------------------------
// Post-message client — VS Code webview flavour (#191 T031, Decision 4)
// ---------------------------------------------------------------------------

/**
 * Dependency-injection surface for `createPostMessageLLMClient`.
 * The webview supplies:
 *   - `postMessage` — typically `acquireVsCodeApi().postMessage` bound.
 *   - `subscribe`   — an `addEventListener('message', handler)` bridge that
 *     returns an unsubscribe function.
 *   - `uuid`        — injectable id generator; production passes
 *     `() => crypto.randomUUID()`.
 */
export interface PostMessageLLMClientOptions {
  readonly postMessage: (msg: unknown) => void;
  readonly subscribe: (handler: (msg: unknown) => void) => () => void;
  readonly uuid: () => string;
}

/**
 * Build an `LLMClient` that forwards `generate()` calls across the
 * webview ↔ extension-host boundary via `postMessage`. The extension host
 * owns the credential and the HTTPS call; this client is a transport
 * adapter that waits for the matching `nlOutcome` response.
 *
 * Contract:
 *   - One `generate()` call issues exactly one `nlGenerate` message with a
 *     fresh `requestId` and waits for an `nlOutcome` with the same id.
 *   - `abort()` fires an `nlAbort` for every currently-pending id and
 *     resolves each pending `generate()` to
 *     `{kind:"transport-error", reason:"cancelled"}`.
 *   - Unknown response ids (e.g. after an abort) are ignored silently.
 *   - The client NEVER throws on normal failure paths — every outcome flows
 *     back as a `LiveOutcome`.
 */
export function createPostMessageLLMClient(
  options: PostMessageLLMClientOptions,
): LLMClient {
  interface PendingEntry {
    readonly resolve: (outcome: LiveOutcome) => void;
    readonly startedAt: number;
  }
  const pending = new Map<string, PendingEntry>();

  const unsubscribe = options.subscribe((rawMsg: unknown) => {
    if (typeof rawMsg !== "object" || rawMsg === null) return;
    const msg = rawMsg as { type?: string; requestId?: string; outcome?: LiveOutcome };
    if (msg.type !== "nlOutcome") return;
    if (typeof msg.requestId !== "string") return;
    const entry = pending.get(msg.requestId);
    if (!entry) return; // unknown id — silently ignored
    pending.delete(msg.requestId);
    entry.resolve(msg.outcome as LiveOutcome);
  });

  void unsubscribe; // subscription stays live for the lifetime of the client.

  function resolveAllWithCancelled(): void {
    const entries = Array.from(pending.entries());
    pending.clear();
    for (const [requestId, entry] of entries) {
      try {
        options.postMessage({ type: "nlAbort", requestId });
      } catch {
        // postMessage failures aren't actionable — we've already decided
        // to cancel.
      }
      const durationMs = Math.max(0, performance.now() - entry.startedAt);
      entry.resolve({
        kind: "transport-error",
        reason: "cancelled",
        durationMs,
      });
    }
  }

  return {
    generate(prompt: string): Promise<LiveOutcome> {
      return new Promise<LiveOutcome>((resolve) => {
        const requestId = options.uuid();
        pending.set(requestId, { resolve, startedAt: performance.now() });
        try {
          options.postMessage({ type: "nlGenerate", requestId, prompt });
        } catch (err) {
          pending.delete(requestId);
          resolve({
            kind: "transport-error",
            reason: "unknown",
            durationMs: 0,
          });
          void err;
        }
      });
    },
    abort(): void {
      resolveAllWithCancelled();
    },
  };
}

// Re-export the config type so consumers can write `LiveConfig` without
// always reaching into types.ts.
export type { LiveConfig };
