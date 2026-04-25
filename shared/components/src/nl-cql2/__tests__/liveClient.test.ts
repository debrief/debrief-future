/**
 * Tests for the live LLM transport (#190, migrated for #191 Decisions 1 + 6).
 *
 * Post-migration:
 *   - `client.generate()` returns a `LiveOutcome` instead of throwing
 *     `LiveTransportAbort`.
 *   - `LiveConfig` is the discriminated union; the browser flavour is
 *     `BrowserLiveConfig`.
 *   - `cancelPending()` is renamed `abort()`.
 *   - `usage-cap-reached` outcome is renamed `ceiling-reached`.
 *   - `oversize-response` outcome is folded into `malformed-response`.
 *
 * Coverage preserved:
 *   - T007 / T029  validateLiveConfig field rules
 *   - T009         isLiveTransportError type guard (now narrows the unified
 *                  LiveOutcome transport-error variant)
 *   - T010         happy-path POST to proxyUrl
 *   - T011         FR-012 supersession via abort()
 *   - T012         FR-009 no prompt-hash check against any map
 *   - T013         TransportCallRecord emission — no prompt/response/credential leak
 *   - T036         failure-class matrix
 *   - T037         SC-008 call-ceiling short-circuit
 *   - T038         malformed-response fallthrough via parseResponse
 *   - T061         FR-002 interchangeability guard
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLiveLLMClient,
  createRecordedLLMClient,
  isLiveTransportError,
  validateLiveConfig,
} from "../clients";
import { generateCql2 } from "../generate";
import type {
  BrowserLiveConfig,
  EnumBundle,
  LLMClient,
  LiveTransportError,
  ResponseMap,
  TransportCallRecord,
} from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseValidConfig: BrowserLiveConfig = {
  transport: "browser-proxy",
  enabled: true,
  proxyUrl: "http://127.0.0.1:8081/generate",
  model: "claude-haiku-4-5-20251001",
  timeoutMs: 12_000,
  callCeiling: 50,
  maxResponseBytes: 262_144,
  proxyToken: null,
};

function makeFetchResponse(
  body: string,
  init: { status?: number } = {},
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(body));
      controller.close();
    },
  });
  return new Response(stream, {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

function successEnvelope(rawResponse: string): string {
  const bytes = new TextEncoder().encode(rawResponse).byteLength;
  return JSON.stringify({
    ok: true,
    rawResponse,
    bytes,
    providerLatencyMs: 123,
  });
}

function errorEnvelope(
  kind: string,
  providerStatus: number | null,
  message: string,
): string {
  return JSON.stringify({ ok: false, kind, providerStatus, message });
}

// ---------------------------------------------------------------------------
// validateLiveConfig
// ---------------------------------------------------------------------------

describe("validateLiveConfig — valid input (T007)", () => {
  it("accepts a fully-populated valid config", () => {
    // Validator does not require `transport` — it fills it in.
    const raw = {
      enabled: baseValidConfig.enabled,
      proxyUrl: baseValidConfig.proxyUrl,
      model: baseValidConfig.model,
      timeoutMs: baseValidConfig.timeoutMs,
      callCeiling: baseValidConfig.callCeiling,
      maxResponseBytes: baseValidConfig.maxResponseBytes,
    };
    const res = validateLiveConfig(raw);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.transport).toBe("browser-proxy");
      expect(res.value).toMatchObject(raw);
    }
  });

  it("accepts an optional proxyToken", () => {
    const res = validateLiveConfig({
      enabled: true,
      proxyUrl: baseValidConfig.proxyUrl,
      model: baseValidConfig.model,
      timeoutMs: baseValidConfig.timeoutMs,
      callCeiling: baseValidConfig.callCeiling,
      maxResponseBytes: baseValidConfig.maxResponseBytes,
      proxyToken: "base64url-token",
    });
    expect(res.ok).toBe(true);
    if (res.ok && res.value.transport === "browser-proxy") {
      expect(res.value.proxyToken).toBe("base64url-token");
    }
  });

  it("defaults proxyToken to null when absent", () => {
    const res = validateLiveConfig({
      enabled: true,
      proxyUrl: baseValidConfig.proxyUrl,
      model: baseValidConfig.model,
      timeoutMs: baseValidConfig.timeoutMs,
      callCeiling: baseValidConfig.callCeiling,
      maxResponseBytes: baseValidConfig.maxResponseBytes,
    });
    expect(res.ok).toBe(true);
    if (res.ok && res.value.transport === "browser-proxy") {
      expect(res.value.proxyToken).toBeNull();
    }
  });
});

describe("validateLiveConfig — invalid input (T029)", () => {
  const good = {
    enabled: true,
    proxyUrl: baseValidConfig.proxyUrl,
    model: baseValidConfig.model,
    timeoutMs: baseValidConfig.timeoutMs,
    callCeiling: baseValidConfig.callCeiling,
    maxResponseBytes: baseValidConfig.maxResponseBytes,
  };

  it("rejects non-object input", () => {
    for (const raw of [null, undefined, 42, "string", []]) {
      const res = validateLiveConfig(raw);
      expect(res.ok).toBe(false);
    }
  });

  it("rejects missing enabled", () => {
    const { enabled: _enabled, ...rest } = good;
    void _enabled;
    const res = validateLiveConfig(rest);
    expect(res.ok).toBe(false);
  });

  it("rejects non-boolean enabled", () => {
    const res = validateLiveConfig({ ...good, enabled: "yes" });
    expect(res.ok).toBe(false);
  });

  it("rejects empty proxyUrl", () => {
    const res = validateLiveConfig({ ...good, proxyUrl: "" });
    expect(res.ok).toBe(false);
  });

  it("rejects proxyUrl with non-http scheme", () => {
    const res = validateLiveConfig({
      ...good,
      proxyUrl: "file:///etc/passwd",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects unparseable proxyUrl", () => {
    const res = validateLiveConfig({ ...good, proxyUrl: "not a url" });
    expect(res.ok).toBe(false);
  });

  it("rejects empty model", () => {
    const res = validateLiveConfig({ ...good, model: "" });
    expect(res.ok).toBe(false);
  });

  it("rejects non-positive timeoutMs", () => {
    const res = validateLiveConfig({ ...good, timeoutMs: 0 });
    expect(res.ok).toBe(false);
  });

  it("rejects timeoutMs above ceiling", () => {
    const res = validateLiveConfig({ ...good, timeoutMs: 600_000 });
    expect(res.ok).toBe(false);
  });

  it("rejects non-integer callCeiling", () => {
    const res = validateLiveConfig({ ...good, callCeiling: 1.5 });
    expect(res.ok).toBe(false);
  });

  it("rejects maxResponseBytes below minimum", () => {
    const res = validateLiveConfig({ ...good, maxResponseBytes: 100 });
    expect(res.ok).toBe(false);
  });

  it("rejects maxResponseBytes above maximum", () => {
    const res = validateLiveConfig({ ...good, maxResponseBytes: 100_000_000 });
    expect(res.ok).toBe(false);
  });

  it("rejects empty-string proxyToken when present", () => {
    const res = validateLiveConfig({ ...good, proxyToken: "" });
    expect(res.ok).toBe(false);
  });

  it("accumulates multiple field errors rather than short-circuiting", () => {
    const res = validateLiveConfig({
      enabled: "no",
      proxyUrl: "",
      model: "",
      timeoutMs: -1,
      callCeiling: 0,
      maxResponseBytes: 0,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.length).toBeGreaterThanOrEqual(5);
    }
  });
});

// ---------------------------------------------------------------------------
// isLiveTransportError (T009)
// ---------------------------------------------------------------------------

describe("isLiveTransportError (T009)", () => {
  it("returns true for a well-shaped LiveTransportError", () => {
    const err: LiveTransportError = {
      kind: "transport-error",
      reason: "network",
      durationMs: 12,
    };
    expect(isLiveTransportError(err)).toBe(true);
  });

  it("returns false for null/undefined/primitives", () => {
    expect(isLiveTransportError(null)).toBe(false);
    expect(isLiveTransportError(undefined)).toBe(false);
    expect(isLiveTransportError("error")).toBe(false);
  });

  it("returns false when reason is not in the allowed union", () => {
    expect(
      isLiveTransportError({
        kind: "transport-error",
        reason: "not-a-valid-reason",
        durationMs: 0,
      }),
    ).toBe(false);
  });

  it("returns false when kind is wrong", () => {
    expect(
      isLiveTransportError({ kind: "auth-failure", reason: "network", durationMs: 0 }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Live-client fetch tests
// ---------------------------------------------------------------------------

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("createLiveLLMClient — happy path (T010)", () => {
  it("POSTs the exact prompt string to proxyUrl and returns rawResponse verbatim", async () => {
    const rawResponse = '{"cql2":{},"lozenges":[],"unrecognised_terms":[]}';
    fetchMock.mockResolvedValueOnce(makeFetchResponse(successEnvelope(rawResponse)));

    const client = createLiveLLMClient(baseValidConfig);
    const outcome = await client.generate("some verbatim prompt");

    expect(outcome.kind).toBe("success");
    if (outcome.kind === "success") {
      expect(outcome.rawResponse).toBe(rawResponse);
      expect(outcome.model).toBe(baseValidConfig.model);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(baseValidConfig.proxyUrl);
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body.prompt).toBe("some verbatim prompt");
    expect(body.model).toBe(baseValidConfig.model);
  });

  it("adds X-Proxy-Token header when config.proxyToken is set", async () => {
    const config: BrowserLiveConfig = {
      ...baseValidConfig,
      proxyToken: "abc123",
    };
    fetchMock.mockResolvedValueOnce(makeFetchResponse(successEnvelope("{}")));

    const client = createLiveLLMClient(config);
    await client.generate("p");

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Proxy-Token"]).toBe("abc123");
  });

  it("omits X-Proxy-Token header when config.proxyToken is null", async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(successEnvelope("{}")));
    const client = createLiveLLMClient(baseValidConfig);
    await client.generate("p");
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = init.headers as Record<string, string>;
    expect("X-Proxy-Token" in headers).toBe(false);
  });
});

describe("createLiveLLMClient — supersession via abort() (T011)", () => {
  it("abort() causes in-flight call to resolve as transport-error: cancelled", async () => {
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = init.signal as AbortSignal | undefined;
          if (signal?.aborted) {
            reject(new DOMException("aborted", "AbortError"));
            return;
          }
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );

    const client = createLiveLLMClient({ ...baseValidConfig, timeoutMs: 30_000 });
    const pending = client.generate("prompt-1");

    await new Promise((r) => setTimeout(r, 10));
    client.abort();

    const outcome = await pending;
    expect(outcome.kind).toBe("transport-error");
    if (outcome.kind === "transport-error") {
      expect(outcome.reason).toBe("cancelled");
    }

    // After an abort, subsequent calls work normally.
    const rawResponse = '{"cql2":{},"lozenges":[],"unrecognised_terms":[]}';
    fetchMock.mockResolvedValueOnce(makeFetchResponse(successEnvelope(rawResponse)));
    const second = await client.generate("prompt-2");
    expect(second.kind).toBe("success");
  });

  it("abort() is idempotent when nothing is in flight", () => {
    const client = createLiveLLMClient(baseValidConfig);
    expect(() => client.abort()).not.toThrow();
    expect(() => client.abort()).not.toThrow();
  });
});

describe("createLiveLLMClient — FR-009 no prompt-hash check (T012)", () => {
  it("accepts any prompt without referencing a recorded-response map", async () => {
    const envelope = successEnvelope('{"cql2":{},"lozenges":[],"unrecognised_terms":[]}');
    fetchMock.mockImplementation(async () => makeFetchResponse(envelope));

    const client = createLiveLLMClient(baseValidConfig);

    for (const p of ["arbitrary 1", "arbitrary 2", "arbitrary 3"]) {
      const out = await client.generate(p);
      expect(out.kind).toBe("success");
    }
  });
});

describe("createLiveLLMClient — TransportCallRecord emission (T013)", () => {
  const infoSpy = vi.spyOn(console, "info");

  beforeEach(() => {
    infoSpy.mockClear();
  });

  it("emits exactly one [nl-demo/live] record per call with no prompt/response/credential", async () => {
    const rawResponse = '{"cql2":{},"lozenges":[],"unrecognised_terms":[]}';
    fetchMock.mockResolvedValueOnce(makeFetchResponse(successEnvelope(rawResponse)));

    const client = createLiveLLMClient({
      ...baseValidConfig,
      proxyToken: "sensitive-token",
    });
    await client.generate("secret prompt body");

    const calls = infoSpy.mock.calls.filter((args) => args[0] === "[nl-demo/live]");
    expect(calls.length).toBe(1);
    const record = calls[0]![1] as TransportCallRecord;

    expect(record.outcome).toBe("success");
    expect(record.provider).toBe("anthropic");
    expect(record.model).toBe(baseValidConfig.model);
    const expectedBytes = new TextEncoder().encode(rawResponse).byteLength;
    expect(record.responseBytes).toBe(expectedBytes);
    expect(record.callIndex).toBe(0);

    const serialised = JSON.stringify(record);
    expect(serialised).not.toContain("secret prompt body");
    expect(serialised).not.toContain("sensitive-token");
    expect(serialised).not.toContain(rawResponse);
  });

  it("responseBytes is null on non-success", async () => {
    fetchMock.mockResolvedValueOnce(
      makeFetchResponse(errorEnvelope("auth-failure", 401, "credential rejected"), {
        status: 401,
      }),
    );

    const client = createLiveLLMClient(baseValidConfig);
    const out = await client.generate("p");
    expect(out.kind).toBe("auth-failure");

    const calls = infoSpy.mock.calls.filter((args) => args[0] === "[nl-demo/live]");
    expect(calls.length).toBe(1);
    const record = calls[0]![1] as TransportCallRecord;
    expect(record.outcome).toBe("auth-failure");
    expect(record.responseBytes).toBeNull();
  });
});

describe("createLiveLLMClient — malformed-response fallthrough (T038)", () => {
  it("surfaces invalid-JSON rawResponse through parseResponse as a generation error", async () => {
    const rawResponse = "not valid json at all {[";
    fetchMock.mockResolvedValueOnce(makeFetchResponse(successEnvelope(rawResponse)));

    const client = createLiveLLMClient(baseValidConfig);
    const enums: EnumBundle = {
      vessel_class_tree: {},
      nationalities: [],
      exercise_names: [],
      tags: [],
      feature_tags: [],
      _meta: {
        canonicalisation: "",
        exercise_parse_rule: "",
        generated_from_catalog: "",
        generated_from_registry: "",
        tool: "test",
      },
    };

    const result = await generateCql2("any phrase", { client, enums });
    expect(result.error?.kind).toBe("generation");
    if (result.error?.kind === "generation") {
      expect(result.error.error.reason).toBe("malformed-json");
    }
  });
});

describe("FR-002 interchangeability regression guard (T061)", () => {
  it("the same generateCql2 call site accepts either recorded or live client", async () => {
    const recordedClient: LLMClient = createRecordedLLMClient({} as ResponseMap);

    const envelope = successEnvelope('{"cql2":{},"lozenges":[],"unrecognised_terms":[]}');
    fetchMock.mockImplementation(async () => makeFetchResponse(envelope));
    const liveClient: LLMClient = createLiveLLMClient(baseValidConfig);

    expect(typeof recordedClient.generate).toBe("function");
    expect(typeof liveClient.generate).toBe("function");
    expect(typeof recordedClient.abort).toBe("function");
    expect(typeof liveClient.abort).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Call ceiling (SC-008, T037)
// ---------------------------------------------------------------------------

describe("createLiveLLMClient — call ceiling (SC-008 / T037)", () => {
  it("short-circuits call N+1 without issuing fetch", async () => {
    const envelope = successEnvelope('{"cql2":{},"lozenges":[],"unrecognised_terms":[]}');
    fetchMock.mockImplementation(async () => makeFetchResponse(envelope));

    const ceiling = 3;
    const client = createLiveLLMClient({ ...baseValidConfig, callCeiling: ceiling });
    for (let i = 0; i < ceiling; i++) {
      const out = await client.generate(`prompt ${i}`);
      expect(out.kind).toBe("success");
    }
    expect(fetchMock).toHaveBeenCalledTimes(ceiling);

    const ceil = await client.generate("prompt N+1");
    expect(fetchMock).toHaveBeenCalledTimes(ceiling); // unchanged
    expect(ceil.kind).toBe("ceiling-reached");
    if (ceil.kind === "ceiling-reached") {
      expect(ceil.ceiling).toBe(ceiling);
    }
  });
});

// ---------------------------------------------------------------------------
// Failure-class matrix (T036)
// ---------------------------------------------------------------------------

describe("createLiveLLMClient — failure classes (T036)", () => {
  const cases: Array<{
    kind: string;
    status: number;
    expectedOutcomeKind: string;
  }> = [
    { kind: "auth-failure", status: 401, expectedOutcomeKind: "auth-failure" },
    { kind: "rate-limit", status: 429, expectedOutcomeKind: "rate-limit" },
    { kind: "provider-error", status: 502, expectedOutcomeKind: "provider-error" },
    { kind: "oversize-response", status: 502, expectedOutcomeKind: "malformed-response" },
    { kind: "timeout", status: 504, expectedOutcomeKind: "timeout" },
    { kind: "bad-request", status: 400, expectedOutcomeKind: "transport-error" },
  ];

  for (const c of cases) {
    it(`maps proxy {kind: ${c.kind}} to outcome kind ${c.expectedOutcomeKind}`, async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(errorEnvelope(c.kind, c.status, "injected"), {
          status: c.status,
        }),
      );

      const client = createLiveLLMClient(baseValidConfig);
      const out = await client.generate("p");
      expect(out.kind).toBe(c.expectedOutcomeKind);
    });
  }

  it("fetch network failure maps to transport-error: network", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const client = createLiveLLMClient(baseValidConfig);
    const out = await client.generate("p");
    expect(out.kind).toBe("transport-error");
    if (out.kind === "transport-error") {
      expect(out.reason).toBe("network");
    }
  });
});
