/**
 * Transport-neutral Anthropic provider-call core (#191 T014, review Decision 3).
 *
 * Extracted from `apps/nl-demo/scripts/live-proxy.mjs` so both the browser
 * loopback proxy (#190) and the VS Code extension-host proxy (#191) share a
 * single HTTPS + stream-and-count + classification code-path.
 *
 * Consumers:
 *   - `apps/nl-demo/scripts/live-proxy.mjs` (Node HTTP server wrapping this)
 *   - `apps/vscode/src/services/llmProxy.ts` (VS Code extension host)
 *
 * This module uses `node:https` and is therefore Node-only. The browser
 * `createLiveLLMClient` keeps its `fetch()` call to the loopback proxy; the
 * proxy's upstream call is what now delegates here.
 *
 * The triple-slash directive below pulls Node's type definitions into THIS
 * file only — the `@debrief/components` tsconfig deliberately omits `node`
 * from `types` so the rest of the package retains its DOM-only typing
 * surface. Without this directive, `Buffer`, `process`, and the `node:https`
 * specifier all surface as TS2591 "Cannot find name" errors during
 * `pnpm --filter @debrief/components build`.
 *
 * Behaviour guarantees:
 *   - Never throws. Every outcome — success, failure, cancellation, timeout —
 *     is returned as a `LiveOutcome`.
 *   - Streams-and-counts the response body, tearing the socket down once the
 *     accumulated bytes exceed `maxResponseBytes`.
 *   - Respects the caller's `AbortSignal`: if it fires, the socket is closed
 *     and the function resolves to `{kind:"transport-error", reason:"cancelled"}`.
 *   - Wall-clock `timeoutMs` is enforced via `setTimeout` + `req.destroy`.
 *   - Neither `apiKey` nor prompt/response bodies are logged anywhere.
 */

/// <reference types="node" />

import { Agent, request as httpsRequest } from "node:https";

import type { LiveOutcome } from "./types.ts";

/**
 * Canonical Anthropic Messages endpoint. Kept private so both consumers use
 * the same URL without having to rediscover the spec.
 */
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Shared keep-alive HTTPS agent. Survives between `providerCall` invocations
 * inside one process; negligible cost and substantially lower latency per
 * call when a session does multiple searches.
 */
const upstreamAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 4,
});

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

/** Parse Anthropic Messages API success body into a flat rawResponse string. */
function extractText(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as {
      content?: readonly { type?: string; text?: string }[];
    };
    const blocks = Array.isArray(parsed.content) ? parsed.content : [];
    return blocks
      .filter((b): b is { type: "text"; text: string } =>
        b?.type === "text" && typeof b.text === "string",
      )
      .map((b) => b.text)
      .join("");
  } catch {
    return null;
  }
}

function parseRetryAfter(header: string | string[] | undefined): number | null {
  if (header === undefined) return null;
  const v = Array.isArray(header) ? header[0] : header;
  if (typeof v !== "string") return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function providerCall(
  input: ProviderCallInput,
  overrides: ProviderCallOverrides = {},
): Promise<LiveOutcome> {
  const endpoint = overrides.endpoint ?? ANTHROPIC_ENDPOINT;
  const agent = overrides.agent ?? upstreamAgent;

  return new Promise<LiveOutcome>((resolve) => {
    const startedAt = process.hrtime.bigint();
    const durationMs = (): number =>
      Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    // Early-abort: if the caller already aborted before we started, short-circuit.
    if (input.signal.aborted) {
      resolve({
        kind: "transport-error",
        reason: "cancelled",
        durationMs: durationMs(),
      });
      return;
    }

    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      resolve({
        kind: "transport-error",
        reason: "unknown",
        durationMs: durationMs(),
      });
      return;
    }

    const upstreamBody = JSON.stringify({
      model: input.model,
      max_tokens: 1024,
      messages: [{ role: "user", content: input.prompt }],
    });

    let settled = false;
    const settle = (outcome: LiveOutcome): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      input.signal.removeEventListener("abort", onAbort);
      resolve(outcome);
    };

    const onAbort = (): void => {
      try {
        req.destroy();
      } catch {
        // Destroy is best-effort.
      }
      settle({
        kind: "transport-error",
        reason: "cancelled",
        durationMs: durationMs(),
      });
    };

    const timeoutHandle = setTimeout(() => {
      try {
        req.destroy();
      } catch {
        // Destroy is best-effort.
      }
      settle({ kind: "timeout", durationMs: durationMs() });
    }, input.timeoutMs);

    const req = httpsRequest(
      {
        agent,
        hostname: url.hostname,
        path: url.pathname + url.search,
        port: url.port !== "" ? Number(url.port) : 443,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": input.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "Content-Length": Buffer.byteLength(upstreamBody, "utf-8"),
        },
      },
      (upstreamRes) => {
        const chunks: Buffer[] = [];
        let total = 0;
        let oversize = false;

        upstreamRes.on("data", (chunk: Buffer) => {
          if (oversize || settled) return;
          total += chunk.byteLength;
          if (total > input.maxResponseBytes) {
            oversize = true;
            upstreamRes.destroy();
            settle({
              kind: "malformed-response",
              reason: "oversize",
              durationMs: durationMs(),
              responseBytes: total,
            });
            return;
          }
          chunks.push(chunk);
        });

        upstreamRes.on("end", () => {
          if (settled) return;
          const status = upstreamRes.statusCode ?? 0;
          const body = Buffer.concat(chunks).toString("utf-8");
          const bytes = Buffer.byteLength(body, "utf-8");

          if (status === 200) {
            const text = extractText(body);
            if (text === null) {
              settle({
                kind: "malformed-response",
                reason: "non-json",
                durationMs: durationMs(),
                responseBytes: bytes,
              });
              return;
            }
            settle({
              kind: "success",
              rawResponse: text,
              durationMs: durationMs(),
              responseBytes: Buffer.byteLength(text, "utf-8"),
              model: input.model,
            });
            return;
          }

          if (status === 401 || status === 403) {
            settle({
              kind: "auth-failure",
              providerStatus: status,
              durationMs: durationMs(),
            });
            return;
          }

          if (status === 429) {
            settle({
              kind: "rate-limit",
              providerStatus: status,
              retryAfterSeconds: parseRetryAfter(upstreamRes.headers["retry-after"]),
              durationMs: durationMs(),
            });
            return;
          }

          settle({
            kind: "provider-error",
            providerStatus: status,
            durationMs: durationMs(),
          });
        });

        upstreamRes.on("error", () => {
          if (settled) return;
          settle({
            kind: "transport-error",
            reason: "network",
            durationMs: durationMs(),
          });
        });
      },
    );

    req.setTimeout(input.timeoutMs, () => {
      try {
        req.destroy();
      } catch {
        // Destroy is best-effort.
      }
      settle({ kind: "timeout", durationMs: durationMs() });
    });

    req.on("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      // Distinguish an abort-caused error from a real network failure. Node
      // surfaces `ERR_CANCELED` / no code when a destroy() is fired; we've
      // already settled via onAbort in that case.
      if (input.signal.aborted) {
        settle({
          kind: "transport-error",
          reason: "cancelled",
          durationMs: durationMs(),
        });
        return;
      }
      settle({
        kind: "transport-error",
        reason: err.code === "ETIMEDOUT" ? "unknown" : "network",
        durationMs: durationMs(),
      });
    });

    input.signal.addEventListener("abort", onAbort, { once: true });

    req.write(upstreamBody);
    req.end();
  });
}
