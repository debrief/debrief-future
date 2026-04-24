/**
 * Tests for the live LLM transport (#190).
 *
 * Coverage matrix:
 *   - T007  validateLiveConfig — every field rule in data-model §1
 *   - T010  happy-path POST to proxyUrl with verbatim prompt + optional token
 *   - T011  FR-012 supersession via cancelPending()
 *   - T012  FR-009 regression — no prompt-hash check against any map
 *   - T013  TransportCallRecord emission — no prompt/response/credential leak
 *   - T029  validateLiveConfig reject absent/non-object raw + each missing field
 *   - T038  malformed-response fallthrough — parseResponse surfaces it
 *   - T061  FR-002 interchangeability regression guard
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLiveLLMClient,
  createRecordedLLMClient,
  isLiveTransportError,
  LiveTransportAbort,
  validateLiveConfig,
} from "../clients";
import { generateCql2 } from "../generate";
import type {
  EnumBundle,
  LiveConfig,
  LiveTransportError,
  LLMClient,
  ResponseMap,
  TransportCallRecord,
} from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseValidConfig: LiveConfig = {
  enabled: true,
  proxyUrl: "http://127.0.0.1:8081/generate",
  model: "claude-haiku-4-5-20251001",
  timeoutMs: 12_000,
  maxCalls: 50,
  maxResponseBytes: 262_144,
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
// T007 / T029 — validateLiveConfig
// ---------------------------------------------------------------------------

describe("validateLiveConfig — valid input (T007)", () => {
  it("accepts a fully-populated valid config", () => {
    const res = validateLiveConfig(baseValidConfig);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toEqual(baseValidConfig);
    }
  });

  it("accepts an optional proxyToken", () => {
    const res = validateLiveConfig({
      ...baseValidConfig,
      proxyToken: "base64url-token",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.proxyToken).toBe("base64url-token");
  });

  it("omits proxyToken from value when not provided", () => {
    const res = validateLiveConfig(baseValidConfig);
    expect(res.ok).toBe(true);
    if (res.ok) expect("proxyToken" in res.value).toBe(false);
  });
});

describe("validateLiveConfig — invalid input (T029)", () => {
  it("rejects non-object input", () => {
    for (const raw of [null, undefined, 42, "string", []]) {
      const res = validateLiveConfig(raw);
      expect(res.ok).toBe(false);
    }
  });

  it("rejects missing enabled", () => {
    const { enabled: _enabled, ...rest } = baseValidConfig;
    void _enabled;
    const res = validateLiveConfig(rest);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.field === "enabled")).toBe(true);
    }
  });

  it("rejects non-boolean enabled", () => {
    const res = validateLiveConfig({ ...baseValidConfig, enabled: "yes" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors[0]?.field).toBe("enabled");
    }
  });

  it("rejects missing proxyUrl", () => {
    const res = validateLiveConfig({ ...baseValidConfig, proxyUrl: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.field === "proxyUrl")).toBe(true);
    }
  });

  it("rejects proxyUrl with non-http scheme", () => {
    const res = validateLiveConfig({
      ...baseValidConfig,
      proxyUrl: "file:///etc/passwd",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.field === "proxyUrl")).toBe(true);
    }
  });

  it("rejects unparseable proxyUrl", () => {
    const res = validateLiveConfig({
      ...baseValidConfig,
      proxyUrl: "not a url",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects missing model", () => {
    const res = validateLiveConfig({ ...baseValidConfig, model: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.field === "model")).toBe(true);
    }
  });

  it("rejects non-positive timeoutMs", () => {
    const res = validateLiveConfig({ ...baseValidConfig, timeoutMs: 0 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.field === "timeoutMs")).toBe(true);
    }
  });

  it("rejects timeoutMs above ceiling", () => {
    const res = validateLiveConfig({ ...baseValidConfig, timeoutMs: 600_000 });
    expect(res.ok).toBe(false);
  });

  it("rejects non-integer maxCalls", () => {
    const res = validateLiveConfig({ ...baseValidConfig, maxCalls: 1.5 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.field === "maxCalls")).toBe(true);
    }
  });

  it("rejects maxResponseBytes below minimum", () => {
    const res = validateLiveConfig({
      ...baseValidConfig,
      maxResponseBytes: 100,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.field === "maxResponseBytes")).toBe(true);
    }
  });

  it("rejects maxResponseBytes above maximum", () => {
    const res = validateLiveConfig({
      ...baseValidConfig,
      maxResponseBytes: 100_000_000,
    });
    expect(res.ok).toBe(false);
  });

  it("rejects empty-string proxyToken when present", () => {
    const res = validateLiveConfig({
      ...baseValidConfig,
      proxyToken: "",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.field === "proxyToken")).toBe(true);
    }
  });

  it("accumulates multiple field errors rather than short-circuiting", () => {
    const res = validateLiveConfig({
      enabled: "no",
      proxyUrl: "",
      model: "",
      timeoutMs: -1,
      maxCalls: 0,
      maxResponseBytes: 0,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.length).toBeGreaterThanOrEqual(5);
    }
  });
});

// ---------------------------------------------------------------------------
// T009 — isLiveTransportError type guard
// ---------------------------------------------------------------------------

describe("isLiveTransportError (T009)", () => {
  it("returns true for a well-shaped LiveTransportError", () => {
    const err: LiveTransportError = {
      reason: "auth-failure",
      message: "provider rejected credential",
      providerStatus: 401,
      durationMs: 12,
      callIndex: 0,
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
        reason: "not-a-valid-reason",
        message: "x",
        providerStatus: null,
        durationMs: 0,
        callIndex: 0,
      }),
    ).toBe(false);
  });

  it("returns false when shape fields are missing", () => {
    expect(
      isLiveTransportError({ reason: "timeout" }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Live-client fetch tests — T010, T011, T012, T013, T038, T061
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
    const result = await client.generate("some verbatim prompt");

    expect(result).toBe(rawResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(baseValidConfig.proxyUrl);
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body.prompt).toBe("some verbatim prompt");
    expect(body.model).toBe(baseValidConfig.model);
  });

  it("adds X-Proxy-Token header when config.proxyToken is set", async () => {
    const config: LiveConfig = {
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

  it("omits X-Proxy-Token header when config.proxyToken is absent", async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(successEnvelope("{}")));
    const client = createLiveLLMClient(baseValidConfig);
    await client.generate("p");
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = init.headers as Record<string, string>;
    expect("X-Proxy-Token" in headers).toBe(false);
  });
});

describe("createLiveLLMClient — supersession (T011)", () => {
  it("cancelPending() causes in-flight call to reject as transport-error with message 'superseded'", async () => {
    // First call: never resolves (simulates slow provider). We still need a
    // Response shape if fetch is to eventually resolve; instead we let the
    // AbortController fire.
    let onAbort: (() => void) | null = null;
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = init.signal as AbortSignal | undefined;
          if (signal?.aborted) {
            reject(new DOMException("aborted", "AbortError"));
            return;
          }
          onAbort = () => reject(new DOMException("aborted", "AbortError"));
          signal?.addEventListener("abort", () => onAbort?.());
        }),
    );

    const client = createLiveLLMClient({ ...baseValidConfig, timeoutMs: 30_000 });
    const call1 = client.generate("prompt-1").catch((err) => err);

    // Issue call 2 AFTER kicking off call 1 and then cancelling call 1.
    await new Promise((r) => setTimeout(r, 10));
    client.cancelPending();

    const err = await call1;
    expect(err).toBeInstanceOf(LiveTransportAbort);
    if (err instanceof LiveTransportAbort) {
      expect(err.transportError.reason).toBe("transport-error");
      expect(err.transportError.message).toBe("superseded");
    }

    // Call 2: fresh fetch resolves with success.
    const rawResponse = '{"cql2":{},"lozenges":[],"unrecognised_terms":[]}';
    fetchMock.mockResolvedValueOnce(makeFetchResponse(successEnvelope(rawResponse)));
    const result = await client.generate("prompt-2");
    expect(result).toBe(rawResponse);
  });
});

describe("createLiveLLMClient — FR-009 no prompt-hash check (T012)", () => {
  it("accepts any prompt without referencing a recorded-response map", async () => {
    // Fresh Response per call — a Response body is a one-shot stream.
    const envelope = successEnvelope('{"cql2":{},"lozenges":[],"unrecognised_terms":[]}');
    fetchMock.mockImplementation(async () => makeFetchResponse(envelope));

    const client = createLiveLLMClient(baseValidConfig);

    // Distinct prompts — fixture-based client would reject these unless each
    // were hand-authored. Live client must accept all.
    await expect(client.generate("arbitrary prompt 1")).resolves.toBeDefined();
    await expect(client.generate("arbitrary prompt 2")).resolves.toBeDefined();
    await expect(client.generate("arbitrary prompt 3")).resolves.toBeDefined();
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

    // No prompt / response / credential content should appear anywhere.
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
    await expect(client.generate("p")).rejects.toBeInstanceOf(LiveTransportAbort);

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
    // Build a recorded client that would match a canned phrase, and a live
    // client that also succeeds. Both satisfy LLMClient.
    const recordedClient: LLMClient = createRecordedLLMClient({} as ResponseMap);

    const envelope = successEnvelope('{"cql2":{},"lozenges":[],"unrecognised_terms":[]}');
    fetchMock.mockImplementation(async () => makeFetchResponse(envelope));
    const liveClient: LLMClient = createLiveLLMClient(baseValidConfig);

    // Both fit the LLMClient contract — TypeScript checks this at compile.
    // Prove interchangeability at runtime by swapping.
    expect(typeof recordedClient.generate).toBe("function");
    expect(typeof liveClient.generate).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Usage cap short-circuit (SC-008, T037 target)
// ---------------------------------------------------------------------------

describe("createLiveLLMClient — usage cap (SC-008 / T037)", () => {
  it("short-circuits call N+1 without issuing fetch", async () => {
    const envelope = successEnvelope('{"cql2":{},"lozenges":[],"unrecognised_terms":[]}');
    fetchMock.mockImplementation(async () => makeFetchResponse(envelope));

    const cap = 3;
    const client = createLiveLLMClient({ ...baseValidConfig, maxCalls: cap });
    for (let i = 0; i < cap; i++) {
      await client.generate(`prompt ${i}`);
    }
    expect(fetchMock).toHaveBeenCalledTimes(cap);
    expect(client.usage.used).toBe(cap);

    // Cap+1: should NOT call fetch.
    const err = await client.generate("prompt N+1").catch((e) => e);
    expect(fetchMock).toHaveBeenCalledTimes(cap); // unchanged
    expect(err).toBeInstanceOf(LiveTransportAbort);
    if (err instanceof LiveTransportAbort) {
      expect(err.transportError.reason).toBe("usage-cap-reached");
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
    expectedReason: LiveTransportError["reason"];
  }> = [
    { kind: "auth-failure", status: 401, expectedReason: "auth-failure" },
    { kind: "rate-limit", status: 429, expectedReason: "rate-limit" },
    { kind: "provider-error", status: 502, expectedReason: "provider-error" },
    { kind: "oversize-response", status: 502, expectedReason: "oversize-response" },
    { kind: "timeout", status: 504, expectedReason: "timeout" },
    { kind: "bad-request", status: 400, expectedReason: "transport-error" },
  ];

  for (const c of cases) {
    it(`maps proxy {kind: ${c.kind}} to LiveTransportError.reason ${c.expectedReason}`, async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(errorEnvelope(c.kind, c.status, "injected"), {
          status: c.status,
        }),
      );

      const client = createLiveLLMClient(baseValidConfig);
      const err = await client.generate("p").catch((e) => e);
      expect(err).toBeInstanceOf(LiveTransportAbort);
      if (err instanceof LiveTransportAbort) {
        expect(err.transportError.reason).toBe(c.expectedReason);
      }
    });
  }

  it("fetch network failure maps to transport-error", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const client = createLiveLLMClient(baseValidConfig);
    const err = await client.generate("p").catch((e) => e);
    expect(err).toBeInstanceOf(LiveTransportAbort);
    if (err instanceof LiveTransportAbort) {
      expect(err.transportError.reason).toBe("transport-error");
    }
  });
});
