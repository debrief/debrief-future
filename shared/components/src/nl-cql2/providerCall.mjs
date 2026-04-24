/**
 * JavaScript mirror of `providerCall.ts` (#191 T014 / T025).
 *
 * The TypeScript version is authored for the VS Code extension host (#191
 * Phase 3) and any future TS consumer inside `@debrief/components`. This
 * `.mjs` sibling lets plain-Node scripts — specifically
 * `apps/nl-demo/scripts/live-proxy.mjs` — import the same logic without a
 * build step.
 *
 * The two files must stay in lock-step. Change the behaviour here, change
 * it there; the shape of every returned outcome mirrors the `LiveOutcome`
 * union declared in `./types.ts`.
 *
 * Behaviour guarantees: see `providerCall.ts`.
 */

import { Agent, request as httpsRequest } from "node:https";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const upstreamAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 4,
});

function extractText(body) {
  try {
    const parsed = JSON.parse(body);
    const blocks = Array.isArray(parsed.content) ? parsed.content : [];
    return blocks
      .filter((b) => b && b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("");
  } catch {
    return null;
  }
}

function parseRetryAfter(header) {
  if (header === undefined) return null;
  const v = Array.isArray(header) ? header[0] : header;
  if (typeof v !== "string") return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * @param {{
 *   prompt: string,
 *   model: string,
 *   apiKey: string,
 *   timeoutMs: number,
 *   maxResponseBytes: number,
 *   signal: AbortSignal,
 *   callIndex: number,
 * }} input
 * @param {{ endpoint?: string, agent?: Agent }} [overrides]
 */
export function providerCall(input, overrides = {}) {
  const endpoint = overrides.endpoint ?? ANTHROPIC_ENDPOINT;
  const agent = overrides.agent ?? upstreamAgent;

  return new Promise((resolve) => {
    const startedAt = process.hrtime.bigint();
    const durationMs = () =>
      Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    if (input.signal.aborted) {
      resolve({
        kind: "transport-error",
        reason: "cancelled",
        durationMs: durationMs(),
      });
      return;
    }

    let url;
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
    const settle = (outcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      input.signal.removeEventListener("abort", onAbort);
      resolve(outcome);
    };

    const onAbort = () => {
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
        const chunks = [];
        let total = 0;
        let oversize = false;

        upstreamRes.on("data", (chunk) => {
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

    req.on("error", (err) => {
      if (settled) return;
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
        reason: err && err.code === "ETIMEDOUT" ? "unknown" : "network",
        durationMs: durationMs(),
      });
    });

    input.signal.addEventListener("abort", onAbort, { once: true });

    req.write(upstreamBody);
    req.end();
  });
}
