/**
 * LLM client implementations for the NL → CQL2 generator (#188) + the live
 * transport (#190).
 *
 * In-tree clients:
 *   - `createRecordedLLMClient(responses)` — replays a map of hand-authored
 *     fixtures keyed by canonicalised phrase. Throws on miss or prompt-hash
 *     mismatch. Used in CI and offline stakeholder demos.
 *   - `createPassthroughLLMClient(fn)` — trivial wrapper that forwards to a
 *     caller-supplied async function. Used by #189 transport integration and
 *     by the fixture-authoring workflow.
 *   - `createLiveLLMClient(config)` — #190's real-provider client. Routes
 *     through a loopback HTTP proxy (see `apps/nl-demo/scripts/live-proxy.mjs`)
 *     so provider credentials never enter the browser bundle.
 *
 * A fourth client — `createBadLLMClient` — lives under `__tests__/` and is
 * not exported from the public barrel (decision 9A).
 */

import { canonicalisePhrase, sha256Hex } from "./hash";
import type {
  LLMClient,
  LiveConfig,
  LiveConfigValidationError,
  LiveConfigValidationResult,
  LiveLLMClient,
  LiveTransportError,
  LiveTransportErrorReason,
  ResponseMap,
  TransportCallRecord,
} from "./types";

/**
 * A client that plays back pre-recorded responses from a hand-authored map.
 *
 * Lookup strategy:
 *   1. Canonicalise the phrase (the implementer is responsible for passing
 *      the phrase into `generate(prompt)` alongside the prompt — but since
 *      the LLMClient contract only exposes the prompt, we encode the phrase
 *      inside the prompt and recover it here).
 *   2. Verify the stored `promptHash` matches the SHA-256 of the prompt we
 *      received. Any mismatch means the fixture was recorded against a
 *      different prompt template and must be re-authored.
 *
 * Prompt-suffix convention: the prompt's last non-blank line is
 * `Phrase: <text>` (see `buildPrompt.ts`). This client extracts that line to
 * canonicalise and look up the fixture.
 */
export function createRecordedLLMClient(responses: ResponseMap): LLMClient {
  return {
    async generate(prompt: string): Promise<string> {
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
      return fixture.rawResponse;
    },
  };
}

/**
 * Trivial wrapper around a caller-supplied async function.
 *
 * Callers use this to plug in a live transport (MCP, HTTP, local model) or a
 * deterministic stub (e.g. to record new fixtures). #188 never invokes a live
 * model; that responsibility is owned by #190.
 */
export function createPassthroughLLMClient(
  fn: (prompt: string) => Promise<string>,
): LLMClient {
  return {
    async generate(prompt: string): Promise<string> {
      return fn(prompt);
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

// ---------------------------------------------------------------------------
// #190 Live LLM Transport
// ---------------------------------------------------------------------------

const VALID_PROXY_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

/** Internal upper bound for `timeoutMs` (5 min). */
const MAX_TIMEOUT_MS = 300_000;
/** Internal upper bound for `maxCalls`. */
const MAX_CALLS_CEILING = 1_000;
/** Internal lower bound for `maxResponseBytes` (1 KB). */
const MIN_RESPONSE_BYTES = 1_024;
/** Internal upper bound for `maxResponseBytes` (10 MB). */
const MAX_RESPONSE_BYTES = 10_485_760;

function isPositiveInteger(v: unknown, upper: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v <= upper;
}

function isIntegerInRange(v: unknown, lo: number, hi: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
}

/**
 * Parse a raw value loaded from `live-config.json` into a validated
 * `LiveConfig`. Never throws on user-input errors — returns a tagged union so
 * the demo can route misconfig to a fallback-to-fixture banner naming the
 * specific field that failed.
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

  if (!isPositiveInteger(obj.maxCalls, MAX_CALLS_CEILING)) {
    errors.push({
      field: "maxCalls",
      message: `must be a positive integer ≤ ${MAX_CALLS_CEILING}`,
    });
  }

  if (!isIntegerInRange(obj.maxResponseBytes, MIN_RESPONSE_BYTES, MAX_RESPONSE_BYTES)) {
    errors.push({
      field: "maxResponseBytes",
      message: `must be an integer between ${MIN_RESPONSE_BYTES} and ${MAX_RESPONSE_BYTES}`,
    });
  }

  if (obj.proxyToken !== undefined) {
    if (typeof obj.proxyToken !== "string" || obj.proxyToken.length === 0) {
      errors.push({
        field: "proxyToken",
        message: "must be a non-empty string when present",
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const value: LiveConfig = {
    enabled: obj.enabled as boolean,
    proxyUrl: obj.proxyUrl as string,
    model: obj.model as string,
    timeoutMs: obj.timeoutMs as number,
    maxCalls: obj.maxCalls as number,
    maxResponseBytes: obj.maxResponseBytes as number,
    ...(typeof obj.proxyToken === "string"
      ? { proxyToken: obj.proxyToken }
      : {}),
  };

  return { ok: true, value };
}

/**
 * Type guard for `LiveTransportError`. Shape check only — NOT `instanceof`,
 * because the value flows as plain data through a discriminated union in
 * `GenerationResult.error` and may have crossed a structuredClone boundary.
 */
export function isLiveTransportError(value: unknown): value is LiveTransportError {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.reason !== "string") return false;
  if (typeof v.message !== "string") return false;
  if (!(v.providerStatus === null || typeof v.providerStatus === "number")) return false;
  if (typeof v.durationMs !== "number") return false;
  if (typeof v.callIndex !== "number") return false;
  const validReasons: ReadonlySet<string> = new Set<LiveTransportErrorReason>([
    "auth-failure",
    "rate-limit",
    "provider-error",
    "transport-error",
    "timeout",
    "oversize-response",
    "usage-cap-reached",
  ]);
  return validReasons.has(v.reason);
}

/**
 * Marker class thrown by `createLiveLLMClient` to signal a typed transport
 * failure through the string-returning `LLMClient.generate` contract.
 * Caught inside `generate.ts` and wrapped into `GenerationResult.error` with
 * `kind: "transport"` — consumers of `generateCql2` see the typed error, not
 * this marker.
 */
export class LiveTransportAbort extends Error {
  readonly transportError: LiveTransportError;
  constructor(transportError: LiveTransportError) {
    super(transportError.message);
    this.name = "LiveTransportAbort";
    this.transportError = transportError;
  }
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
    // Environments without a streaming body fall back to text(). This is a
    // defence-in-depth path only — the browser and Node 18+ both expose
    // ReadableStream bodies on fetch Responses.
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
        // reader.cancel() rejections are not actionable — we've already
        // decided to abort the read and return oversize.
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

function mapProxyErrorKind(kind: ProxyResponseError["kind"]): LiveTransportErrorReason {
  switch (kind) {
    case "auth-failure":
      return "auth-failure";
    case "rate-limit":
      return "rate-limit";
    case "provider-error":
      return "provider-error";
    case "timeout":
      return "timeout";
    case "oversize-response":
      return "oversize-response";
    case "bad-request":
      // bad-request indicates a client-version mismatch, not a user-actionable
      // failure class. Map to transport-error per data-model.md §4.
      return "transport-error";
  }
}

function emitRecord(record: TransportCallRecord): void {
  if (typeof console !== "undefined" && typeof console.info === "function") {
    console.info("[nl-demo/live]", record);
  }
}

/**
 * Build a live LLM client backed by a local proxy. Caller owns the config
 * loading; this function does no filesystem I/O.
 *
 * The client:
 *   - issues POST /generate against `config.proxyUrl`
 *   - adds `X-Proxy-Token: <config.proxyToken>` when `proxyToken` is present
 *   - enforces `timeoutMs` per-call via AbortController
 *   - enforces `maxCalls` by short-circuiting further calls with a
 *     `usage-cap-reached` LiveTransportError (no fetch issued)
 *   - enforces `maxResponseBytes` as a UTF-8 byte count via a streaming
 *     reader that aborts the response once the accumulated byte count
 *     exceeds the cap, raising `oversize-response`
 *   - emits one TransportCallRecord per call to console.info
 *   - maps proxy `{ ok: false, kind: "bad-request" }` to client
 *     `reason: "transport-error"`
 *
 * All failure paths surface via a thrown `LiveTransportAbort` marker which
 * `generateCql2` catches and converts into `GenerationResult.error` with
 * `kind: "transport"` — generateCql2 itself never throws.
 */
export function createLiveLLMClient(config: LiveConfig): LiveLLMClient {
  let callsUsed = 0;
  const inFlight = new Set<AbortController>();

  function makeRecord(
    outcome: "success" | LiveTransportErrorReason,
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

  function abort(
    reason: LiveTransportErrorReason,
    message: string,
    providerStatus: number | null,
    startedAt: number,
    callIndex: number,
  ): never {
    const durationMs = Math.max(0, safePerformanceNow() - startedAt);
    const record = makeRecord(reason, durationMs, null, callIndex);
    emitRecord(record);
    throw new LiveTransportAbort({
      reason,
      message,
      providerStatus,
      durationMs,
      callIndex,
    });
  }

  return {
    async generate(prompt: string): Promise<string> {
      const startedAt = safePerformanceNow();

      // Usage-cap short-circuit BEFORE any fetch (SC-008, FR-010).
      if (callsUsed >= config.maxCalls) {
        abort(
          "usage-cap-reached",
          `Live-mode call limit reached (${config.maxCalls}) — reload to reset.`,
          null,
          startedAt,
          callsUsed,
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
          // Could be a timeout OR a supersession via cancelPending().
          const reason = controller.signal.reason;
          const supersededMsg = "superseded";
          const isSupersede =
            reason !== undefined &&
            typeof reason === "object" &&
            reason !== null &&
            (reason as { name?: string }).name === "SupersededError";
          if (isSupersede) {
            abort("transport-error", supersededMsg, null, startedAt, callIndex);
          }
          abort(
            "timeout",
            `The language-model proxy did not respond within ${config.timeoutMs} ms.`,
            null,
            startedAt,
            callIndex,
          );
        }
        const message =
          err instanceof Error ? err.message : "unknown network error";
        abort(
          "transport-error",
          `Could not reach the language-model proxy at ${config.proxyUrl}: ${message}`,
          null,
          startedAt,
          callIndex,
        );
      }

      let parsed: ProxyResponse;
      try {
        const read = await readBodyWithCap(response, config.maxResponseBytes);
        if (!read.ok) {
          clearTimeout(timeoutHandle);
          inFlight.delete(controller);
          abort(
            "oversize-response",
            `Proxy response exceeded the configured ${config.maxResponseBytes}-byte cap.`,
            response.status,
            startedAt,
            callIndex,
          );
        }
        try {
          parsed = JSON.parse(read.text) as ProxyResponse;
        } catch {
          clearTimeout(timeoutHandle);
          inFlight.delete(controller);
          abort(
            "provider-error",
            `Proxy returned a body that is not valid JSON (HTTP ${response.status}).`,
            response.status,
            startedAt,
            callIndex,
          );
        }
      } catch (err) {
        if (err instanceof LiveTransportAbort) throw err;
        clearTimeout(timeoutHandle);
        inFlight.delete(controller);
        const message = err instanceof Error ? err.message : String(err);
        abort(
          "transport-error",
          `Failed reading proxy response: ${message}`,
          null,
          startedAt,
          callIndex,
        );
      }

      clearTimeout(timeoutHandle);
      inFlight.delete(controller);

      if (parsed.ok) {
        const durationMs = Math.max(0, safePerformanceNow() - startedAt);
        const responseBytes = new TextEncoder().encode(parsed.rawResponse).byteLength;
        emitRecord(makeRecord("success", durationMs, responseBytes, callIndex));
        return parsed.rawResponse;
      }

      const reason = mapProxyErrorKind(parsed.kind);
      abort(
        reason,
        parsed.message,
        parsed.providerStatus ?? response.status,
        startedAt,
        callIndex,
      );
    },

    cancelPending(): void {
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
          // Abort is best-effort; the fetch is already winding down.
        }
      }
      inFlight.clear();
    },

    get usage() {
      return { used: callsUsed, cap: config.maxCalls };
    },
  };
}
