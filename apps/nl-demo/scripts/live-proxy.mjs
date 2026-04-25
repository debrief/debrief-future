#!/usr/bin/env node
/**
 * apps/nl-demo/scripts/live-proxy.mjs — #190 Live LLM Transport sidecar.
 *
 * Holds the provider credential in its environment and forwards prompts
 * from the browser-side `createLiveLLMClient` to the Anthropic Messages API.
 * The credential NEVER enters the demo's static bundle (SC-006).
 *
 * Endpoints:
 *   POST /generate    Forward prompt + model to upstream; map errors to the
 *                     proxy-http.md contract envelope.
 *   GET  /health      Liveness probe consumed by the demo boot code.
 *
 * Modes:
 *   live (default)    Real HTTPS call to ANTHROPIC_ENDPOINT. ANTHROPIC_API_KEY
 *                     required.
 *   --stub <file>     Deterministic scripted responses per canonicalised phrase.
 *                     Used by CI and the offline Playwright suite (FR-015).
 *
 * Zero runtime dependencies — Node stdlib only. Spec: specs/190-live-llm-transport/.
 */

import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, join as pathJoin } from "node:path";

// #191 T025: the upstream Anthropic call is now served by the shared
// provider-call core (`shared/components/src/nl-cql2/providerCall.mjs`) so
// the VS Code extension host (#191 Phase 3) and this browser-side proxy
// classify outcomes identically.
const here = dirname(fileURLToPath(import.meta.url));
const { providerCall } = await import(
  pathJoin(
    here,
    "../../../shared/components/src/nl-cql2/providerCall.mjs",
  )
);

// ---------------------------------------------------------------------------
// Config (read-once at startup)
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
let stubFile = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--stub" && argv[i + 1]) {
    stubFile = argv[i + 1];
    i += 1;
  }
}

const LOOPBACK_BINDS = new Set(["127.0.0.1", "::1", "localhost"]);

const env = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  ANTHROPIC_ENDPOINT:
    process.env.ANTHROPIC_ENDPOINT ?? "https://api.anthropic.com/v1/messages",
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
  ANTHROPIC_VERSION: process.env.ANTHROPIC_VERSION ?? "2023-06-01",
  PROXY_PORT: Number.parseInt(process.env.PROXY_PORT ?? "8081", 10),
  PROXY_BIND: process.env.PROXY_BIND ?? "127.0.0.1",
  PROXY_ALLOW_REMOTE:
    (process.env.PROXY_ALLOW_REMOTE ?? "false").toLowerCase() === "true",
  MAX_PROVIDER_BYTES: Number.parseInt(
    process.env.MAX_PROVIDER_BYTES ?? "524288",
    10,
  ),
  PROVIDER_TIMEOUT_MS: Number.parseInt(
    process.env.PROVIDER_TIMEOUT_MS ?? "20000",
    10,
  ),
  DEMO_ORIGIN: process.env.DEMO_ORIGIN ?? "http://127.0.0.1:8080",
};

const MODE = stubFile !== null ? "stub" : "live";

// ---------------------------------------------------------------------------
// Stub-mode scenarios (loaded at startup)
// ---------------------------------------------------------------------------

let stubScenarios = null;
if (MODE === "stub") {
  const raw = await readFile(resolve(stubFile), "utf-8");
  stubScenarios = JSON.parse(raw);
  if (
    typeof stubScenarios !== "object" ||
    stubScenarios === null ||
    typeof stubScenarios.default !== "object" ||
    stubScenarios.default === null
  ) {
    console.error(
      `[proxy] stub scenarios file must contain { default: {...}, overrides?: {...} } — got:`,
      stubScenarios,
    );
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// Startup validation + banner
// ---------------------------------------------------------------------------

if (MODE === "live" && env.ANTHROPIC_API_KEY.length === 0) {
  console.error(
    "[proxy] ANTHROPIC_API_KEY missing. Set it in apps/nl-demo/.env or start with --stub for CI.",
  );
  process.exit(1);
}

const bindIsLoopback = LOOPBACK_BINDS.has(env.PROXY_BIND);
if (!bindIsLoopback && !env.PROXY_ALLOW_REMOTE) {
  console.error(
    `[proxy] refusing to bind to ${env.PROXY_BIND}: PROXY_ALLOW_REMOTE must be "true" to bind a non-loopback interface.`,
  );
  process.exit(1);
}

let proxyToken = null;
if (env.PROXY_ALLOW_REMOTE) {
  proxyToken = randomBytes(32).toString("base64url");
  console.error(
    `[proxy] PROXY_ALLOW_REMOTE=true — auth required. Set live-config.json "proxyToken" to: ${proxyToken}`,
  );
  console.error(
    `[proxy] DO NOT commit this token. Restarting the proxy generates a new one.`,
  );
}

const startBanner = {
  mode: MODE,
  bind: env.PROXY_BIND,
  port: env.PROXY_PORT,
  allowRemote: env.PROXY_ALLOW_REMOTE,
  tokenRequired: proxyToken !== null,
  model: env.ANTHROPIC_MODEL,
};
console.error(`[proxy] startup config:`, startBanner);

// The shared upstream HTTPS agent lives inside
// shared/components/src/nl-cql2/providerCall.mjs so both #190 (browser demo)
// and #191 (VS Code host) share one keep-alive pool.

// ---------------------------------------------------------------------------
// Request handling
// ---------------------------------------------------------------------------

/** Parse-one-line structured log (one per request). Never logs bodies. */
function logLine(ts, method, path, status, durationMs, providerStatus, outcome, bytes) {
  process.stdout.write(
    `[proxy] ts=${ts} method=${method} path=${path} status=${status} durationMs=${durationMs} providerStatus=${providerStatus ?? "-"} outcome=${outcome} bytes=${bytes}\n`,
  );
}

function sendJson(res, status, body, corsOrigin) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload, "utf-8"),
    ...(corsOrigin ? { "Access-Control-Allow-Origin": corsOrigin } : {}),
  });
  res.end(payload);
}

function tokenOk(req) {
  if (proxyToken === null) return true;
  const header = req.headers["x-proxy-token"];
  if (Array.isArray(header)) return header[0] === proxyToken;
  return header === proxyToken;
}

async function readRequestBody(req, maxBytes = 200_000) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.byteLength;
    if (total > maxBytes) {
      throw new Error(`request body exceeded ${maxBytes} bytes`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function canonicalisePhrase(raw) {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Extract the `Phrase: ...` tail from the prompt (matches buildPrompt.ts). */
function extractPhrase(prompt) {
  const lines = prompt.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(/^Phrase:\s*(.*)$/);
    if (match) return match[1];
  }
  return "";
}

// ---------------------------------------------------------------------------
// Upstream (live mode)
// ---------------------------------------------------------------------------

// Running call counter — feeds the shared providerCall's callIndex field
// (used by the structured log line, never included in the response body).
let proxyCallCounter = 0;

/**
 * Translate a `LiveOutcome` from the shared provider-call core into this
 * proxy's on-the-wire envelope (the shape documented in
 * `specs/190-live-llm-transport/contracts/proxy-http.md`). Existing browser
 * clients continue to consume this envelope; the browser-side adapter in
 * `shared/components/src/nl-cql2/clients.ts` then maps it back into the
 * #191 `LiveOutcome` union.
 */
function outcomeToProxyEnvelope(outcome) {
  switch (outcome.kind) {
    case "success":
      return {
        ok: true,
        rawResponse: outcome.rawResponse,
        bytes: outcome.responseBytes,
        providerLatencyMs: outcome.durationMs,
      };
    case "auth-failure":
      return {
        ok: false,
        kind: "auth-failure",
        providerStatus: outcome.providerStatus,
        message: "Provider rejected the credential.",
        providerLatencyMs: outcome.durationMs,
      };
    case "rate-limit":
      return {
        ok: false,
        kind: "rate-limit",
        providerStatus: outcome.providerStatus,
        message: "Provider rate limit reached.",
        providerLatencyMs: outcome.durationMs,
      };
    case "provider-error":
      return {
        ok: false,
        kind: "provider-error",
        providerStatus: outcome.providerStatus,
        message: `Provider returned HTTP ${outcome.providerStatus}.`,
        providerLatencyMs: outcome.durationMs,
      };
    case "timeout":
      return {
        ok: false,
        kind: "timeout",
        providerStatus: null,
        message: `Upstream did not respond within ${env.PROVIDER_TIMEOUT_MS} ms.`,
        providerLatencyMs: outcome.durationMs,
      };
    case "malformed-response":
      // The browser client maps both non-json and oversize back into a
      // single `malformed-response` outcome (review Decision 6).
      return {
        ok: false,
        kind: outcome.reason === "oversize" ? "oversize-response" : "provider-error",
        providerStatus: null,
        message:
          outcome.reason === "oversize"
            ? "Upstream response exceeded proxy-side cap."
            : "Upstream returned unparseable JSON.",
        providerLatencyMs: outcome.durationMs,
      };
    case "transport-error":
      return {
        ok: false,
        kind: "provider-error",
        providerStatus: null,
        message: `Upstream connection failed: ${outcome.reason}`,
        providerLatencyMs: outcome.durationMs,
      };
    default:
      return {
        ok: false,
        kind: "provider-error",
        providerStatus: null,
        message: `Unexpected upstream outcome: ${outcome.kind}`,
        providerLatencyMs: outcome.durationMs ?? 0,
      };
  }
}

/**
 * Issue the HTTPS POST to Anthropic Messages API via the shared
 * provider-call core. Streams-and-counts / timeout / outcome classification
 * all live in the shared module so #190 + #191 are identical at the
 * provider edge.
 */
async function callAnthropic(prompt, model) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(
    () => controller.abort(),
    env.PROVIDER_TIMEOUT_MS + 500, // belt-and-braces — providerCall owns the primary timeout.
  );
  try {
    const outcome = await providerCall(
      {
        prompt,
        model,
        apiKey: env.ANTHROPIC_API_KEY,
        timeoutMs: env.PROVIDER_TIMEOUT_MS,
        maxResponseBytes: env.MAX_PROVIDER_BYTES,
        signal: controller.signal,
        callIndex: proxyCallCounter++,
      },
      { endpoint: env.ANTHROPIC_ENDPOINT },
    );
    return outcomeToProxyEnvelope(outcome);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

// ---------------------------------------------------------------------------
// Stub dispatch
// ---------------------------------------------------------------------------

function dispatchStub(prompt, model) {
  const phrase = canonicalisePhrase(extractPhrase(prompt));
  const overrides = stubScenarios.overrides ?? {};
  const outcome = Object.prototype.hasOwnProperty.call(overrides, phrase)
    ? overrides[phrase]
    : stubScenarios.default;

  const providerLatencyMs = outcome.providerLatencyMs ?? 25;

  switch (outcome.kind) {
    case "success":
      return {
        ok: true,
        rawResponse: outcome.rawResponse,
        bytes: Buffer.byteLength(outcome.rawResponse, "utf-8"),
        providerLatencyMs,
      };
    case "auth":
      return {
        ok: false,
        kind: "auth-failure",
        providerStatus: 401,
        message: outcome.message ?? "Provider rejected the credential.",
        providerLatencyMs,
      };
    case "rate-limit":
      return {
        ok: false,
        kind: "rate-limit",
        providerStatus: 429,
        message: outcome.message ?? "Provider rate limit reached.",
        providerLatencyMs,
      };
    case "provider-error":
      return {
        ok: false,
        kind: "provider-error",
        providerStatus: outcome.providerStatus ?? 502,
        message: outcome.message ?? "Provider returned an error.",
        providerLatencyMs,
      };
    case "timeout":
      // Deliberately never resolves so the browser AbortController fires.
      return new Promise(() => {});
    case "malformed": {
      // Valid 200 with a rawResponse that is itself not valid JSON.
      const raw = outcome.raw ?? "not valid json at all {[";
      return {
        ok: true,
        rawResponse: raw,
        bytes: Buffer.byteLength(raw, "utf-8"),
        providerLatencyMs,
      };
    }
    case "oversize": {
      const size = Math.max(1024, outcome.sizeBytes ?? 1_000_000);
      const raw = "x".repeat(size);
      return {
        ok: true,
        rawResponse: raw,
        bytes: size,
        providerLatencyMs,
      };
    }
    default:
      return {
        ok: false,
        kind: "provider-error",
        providerStatus: null,
        message: `Stub scenario kind "${outcome.kind}" is unknown.`,
        providerLatencyMs,
      };
  }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

function isLoopbackOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  const ts = new Date().toISOString();
  const startedAt = process.hrtime.bigint();

  // Minimal CORS for the demo origin. When the proxy is loopback-bound (the
  // default), we trust any loopback-origin caller since loopback isolation
  // is already the security perimeter. Non-loopback binds fall back to the
  // explicit DEMO_ORIGIN match.
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  let allowedOrigin = env.DEMO_ORIGIN;
  if (origin) {
    if (bindIsLoopback && isLoopbackOrigin(origin)) {
      allowedOrigin = origin;
    } else if (origin === env.DEMO_ORIGIN) {
      allowedOrigin = origin;
    }
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Proxy-Token",
      "Access-Control-Max-Age": "600",
    });
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  // Auth guard for non-loopback proxies.
  if (!tokenOk(req)) {
    sendJson(res, 401, {
      ok: false,
      kind: "auth-failure",
      providerStatus: null,
      message: "Proxy token missing or invalid",
    }, allowedOrigin);
    const d = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logLine(ts, req.method, url.pathname, 401, d.toFixed(2), null, "proxy-auth-failure", 0);
    return;
  }

  if (url.pathname === "/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      provider: "anthropic",
      model: env.ANTHROPIC_MODEL,
      mode: MODE,
      bindRemote: !bindIsLoopback,
    }, allowedOrigin);
    const d = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logLine(ts, "GET", "/health", 200, d.toFixed(2), null, "success", 0);
    return;
  }

  if (url.pathname === "/generate" && req.method === "POST") {
    let raw;
    try {
      raw = await readRequestBody(req);
    } catch (err) {
      sendJson(res, 400, {
        ok: false,
        kind: "bad-request",
        providerStatus: null,
        message: `Request body read error: ${err.message}`,
      }, allowedOrigin);
      const d = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logLine(ts, "POST", "/generate", 400, d.toFixed(2), null, "bad-request", 0);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      sendJson(res, 400, {
        ok: false,
        kind: "bad-request",
        providerStatus: null,
        message: "Request body is not valid JSON.",
      }, allowedOrigin);
      const d = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logLine(ts, "POST", "/generate", 400, d.toFixed(2), null, "bad-request", 0);
      return;
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.prompt !== "string" ||
      parsed.prompt.length === 0 ||
      parsed.prompt.length > 100_000
    ) {
      sendJson(res, 400, {
        ok: false,
        kind: "bad-request",
        providerStatus: null,
        message: "Request must have a non-empty `prompt` ≤ 100 000 characters.",
      }, allowedOrigin);
      const d = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logLine(ts, "POST", "/generate", 400, d.toFixed(2), null, "bad-request", 0);
      return;
    }

    if (parsed.model !== undefined && (typeof parsed.model !== "string" || parsed.model.length === 0)) {
      sendJson(res, 400, {
        ok: false,
        kind: "bad-request",
        providerStatus: null,
        message: "`model` must be a non-empty string when present.",
      }, allowedOrigin);
      const d = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logLine(ts, "POST", "/generate", 400, d.toFixed(2), null, "bad-request", 0);
      return;
    }

    const model = parsed.model ?? env.ANTHROPIC_MODEL;

    const outcome =
      MODE === "stub"
        ? await dispatchStub(parsed.prompt, model)
        : await callAnthropic(parsed.prompt, model);

    const d = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    if (outcome.ok) {
      sendJson(res, 200, outcome, allowedOrigin);
      logLine(
        ts,
        "POST",
        "/generate",
        200,
        d.toFixed(2),
        200,
        "success",
        outcome.bytes,
      );
      return;
    }
    const statusMap = {
      "auth-failure": 401,
      "rate-limit": 429,
      "provider-error": 502,
      "oversize-response": 502,
      timeout: 504,
      "bad-request": 400,
    };
    const status = statusMap[outcome.kind] ?? 502;
    sendJson(res, status, outcome, allowedOrigin);
    logLine(
      ts,
      "POST",
      "/generate",
      status,
      d.toFixed(2),
      outcome.providerStatus,
      outcome.kind,
      0,
    );
    return;
  }

  sendJson(res, 404, {
    ok: false,
    kind: "bad-request",
    providerStatus: null,
    message: "Unknown route.",
  }, allowedOrigin);
  const d = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  logLine(ts, req.method ?? "?", url.pathname, 404, d.toFixed(2), null, "not-found", 0);
});

server.listen(env.PROXY_PORT, env.PROXY_BIND, () => {
  const scheme = "http";
  console.error(
    `[proxy] ready on ${scheme}://${env.PROXY_BIND}:${env.PROXY_PORT}/generate (mode=${MODE}, model=${env.ANTHROPIC_MODEL})`,
  );
});

function shutdown(signal) {
  console.error(`[proxy] received ${signal}, closing server.`);
  server.close(() => {
    // providerCall owns its own keep-alive agent; it tears down with the
    // process.
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
