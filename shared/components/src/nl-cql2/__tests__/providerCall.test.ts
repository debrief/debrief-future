/**
 * Tests for the shared provider-call core (#191 T016-T021, review Decision 9).
 *
 * Strategy: mock `node:https` at the module level via `vi.mock`. Each test
 * installs a tiny fake `request(options, responseHandler)` that drives the
 * internal ClientRequest/Response state machine via EventEmitters — the
 * same objects Node's real `https` module exposes. This exercises
 * `providerCall`'s outcome-classification logic end-to-end without opening
 * a socket.
 */

import { EventEmitter } from "node:events";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// The mock has to be hoisted above the providerCall import so Vitest
// intercepts the `node:https` module before `providerCall.ts` loads it.
// See https://vitest.dev/guide/mocking.html#modules.
const httpsMock = vi.hoisted(() => {
  return {
    request: vi.fn(),
    Agent: class MockAgent {
      keepAlive: boolean;
      keepAliveMsecs: number;
      maxSockets: number;
      constructor(opts: Record<string, unknown> = {}) {
        this.keepAlive = Boolean(opts.keepAlive);
        this.keepAliveMsecs = typeof opts.keepAliveMsecs === "number" ? opts.keepAliveMsecs : 0;
        this.maxSockets = typeof opts.maxSockets === "number" ? opts.maxSockets : 0;
      }
    },
  };
});

// Vitest needs a `default` export on the mock so any `import https from
// "node:https"` chain (CJS-interop synthetic default) resolves cleanly.
// Both providerCall.ts and providerCall.mjs use named imports only, but
// vitest's CJS-interop stage requires the default to exist.
vi.mock("node:https", () => ({
  default: {
    request: httpsMock.request,
    Agent: httpsMock.Agent,
  },
  request: httpsMock.request,
  Agent: httpsMock.Agent,
}));

// Import AFTER the mock is registered.
const { providerCall } = await import("../providerCall");
import type { LiveOutcome } from "../types";

// ---------------------------------------------------------------------------
// Helpers — fake ClientRequest/Response
// ---------------------------------------------------------------------------

interface FakeRequest extends EventEmitter {
  write(_body: string): void;
  end(): void;
  destroy(): void;
  setTimeout(_ms: number, _cb: () => void): void;
  destroyed: boolean;
  setTimeoutCb: (() => void) | null;
  setTimeoutMs: number | null;
}

interface FakeResponse extends EventEmitter {
  statusCode: number;
  headers: Record<string, string>;
  destroy(): void;
  destroyed: boolean;
}

function makeFakeRequest(): FakeRequest {
  const req = new EventEmitter() as FakeRequest;
  req.destroyed = false;
  req.setTimeoutCb = null;
  req.setTimeoutMs = null;
  req.write = () => {
    // no-op — we don't inspect the outbound body in these tests.
  };
  req.end = () => {
    // no-op
  };
  req.destroy = () => {
    req.destroyed = true;
  };
  req.setTimeout = (ms: number, cb: () => void) => {
    req.setTimeoutMs = ms;
    req.setTimeoutCb = cb;
  };
  return req;
}

function makeFakeResponse(status: number, headers: Record<string, string> = {}): FakeResponse {
  const res = new EventEmitter() as FakeResponse;
  res.statusCode = status;
  res.headers = headers;
  res.destroyed = false;
  res.destroy = () => {
    res.destroyed = true;
  };
  return res;
}

type RequestScript = (req: FakeRequest, respond: (res: FakeResponse) => void) => void;

/**
 * Install a mock `https.request` implementation that runs the given script
 * against the fake request/response EventEmitters. Returns the fake request
 * once the caller has wired it up, so tests can emit responses / errors
 * after a delay.
 */
function installRequestScript(script: RequestScript): void {
  httpsMock.request.mockImplementation(
    (_options: unknown, responseHandler: (res: FakeResponse) => void) => {
      const req = makeFakeRequest();
      // Run the script asynchronously so the caller gets a chance to
      // register `req.on('error', ...)` listeners before we fire any events.
      setImmediate(() => {
        try {
          script(req, responseHandler);
        } catch (err) {
          req.emit("error", err);
        }
      });
      return req;
    },
  );
}

async function call(
  override: Partial<{
    prompt: string;
    model: string;
    timeoutMs: number;
    maxResponseBytes: number;
    signal: AbortSignal;
  }> = {},
): Promise<LiveOutcome> {
  return providerCall({
    prompt: override.prompt ?? "test prompt",
    model: override.model ?? "claude-haiku-4-5-20251001",
    apiKey: "test-key",
    timeoutMs: override.timeoutMs ?? 5_000,
    maxResponseBytes: override.maxResponseBytes ?? 1_048_576,
    signal: override.signal ?? new AbortController().signal,
    callIndex: 0,
  });
}

beforeEach(() => {
  httpsMock.request.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// T016 — happy path
// ---------------------------------------------------------------------------

describe("providerCall — happy path (T016)", () => {
  it("200 with a well-formed Anthropic body → kind 'success'", async () => {
    const rawText = '{"cql2":{},"lozenges":[],"unrecognised_terms":[]}';
    installRequestScript((_req, respond) => {
      const res = makeFakeResponse(200, { "content-type": "application/json" });
      respond(res);
      res.emit(
        "data",
        Buffer.from(
          JSON.stringify({ content: [{ type: "text", text: rawText }] }),
          "utf-8",
        ),
      );
      res.emit("end");
    });

    const outcome = await call();
    expect(outcome.kind).toBe("success");
    if (outcome.kind === "success") {
      expect(outcome.rawResponse).toBe(rawText);
      expect(outcome.model).toBe("claude-haiku-4-5-20251001");
      expect(outcome.responseBytes).toBe(Buffer.byteLength(rawText, "utf-8"));
    }
  });
});

// ---------------------------------------------------------------------------
// T017 — failure classes (401 / 429 / 500 / socket hang-up)
// ---------------------------------------------------------------------------

describe("providerCall — failure classes (T017)", () => {
  it("401 → auth-failure", async () => {
    installRequestScript((_req, respond) => {
      const res = makeFakeResponse(401);
      respond(res);
      res.emit("data", Buffer.from("unauthorized", "utf-8"));
      res.emit("end");
    });
    const outcome = await call();
    expect(outcome.kind).toBe("auth-failure");
    if (outcome.kind === "auth-failure") {
      expect(outcome.providerStatus).toBe(401);
    }
  });

  it("429 → rate-limit, retryAfterSeconds parsed from header", async () => {
    installRequestScript((_req, respond) => {
      const res = makeFakeResponse(429, { "retry-after": "17" });
      respond(res);
      res.emit("data", Buffer.from("slow down", "utf-8"));
      res.emit("end");
    });
    const outcome = await call();
    expect(outcome.kind).toBe("rate-limit");
    if (outcome.kind === "rate-limit") {
      expect(outcome.providerStatus).toBe(429);
      expect(outcome.retryAfterSeconds).toBe(17);
    }
  });

  it("500 → provider-error", async () => {
    installRequestScript((_req, respond) => {
      const res = makeFakeResponse(500);
      respond(res);
      res.emit("data", Buffer.from("boom", "utf-8"));
      res.emit("end");
    });
    const outcome = await call();
    expect(outcome.kind).toBe("provider-error");
    if (outcome.kind === "provider-error") {
      expect(outcome.providerStatus).toBe(500);
    }
  });

  it("socket hang-up on request → transport-error/network", async () => {
    installRequestScript((req) => {
      req.emit("error", Object.assign(new Error("socket hang up"), { code: "ECONNRESET" }));
    });
    const outcome = await call();
    expect(outcome.kind).toBe("transport-error");
    if (outcome.kind === "transport-error") {
      expect(outcome.reason).toBe("network");
    }
  });
});

// ---------------------------------------------------------------------------
// T018 — timeout
// ---------------------------------------------------------------------------

describe("providerCall — timeout (T018)", () => {
  it("slow response past timeoutMs → kind 'timeout' and req destroyed", async () => {
    let capturedReq: FakeRequest | null = null;
    installRequestScript((req, respond) => {
      capturedReq = req;
      const res = makeFakeResponse(200);
      respond(res);
      // Emit nothing — let the timeout fire.
      void res;
    });
    const outcome = await call({ timeoutMs: 40 });
    expect(outcome.kind).toBe("timeout");
    expect(capturedReq?.destroyed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T019 — malformed-response (non-json)
// ---------------------------------------------------------------------------

describe("providerCall — malformed-response non-json (T019)", () => {
  it("200 with body that isn't JSON → reason 'non-json'", async () => {
    installRequestScript((_req, respond) => {
      const res = makeFakeResponse(200);
      respond(res);
      res.emit("data", Buffer.from("<html>not json</html>", "utf-8"));
      res.emit("end");
    });
    const outcome = await call();
    expect(outcome.kind).toBe("malformed-response");
    if (outcome.kind === "malformed-response") {
      expect(outcome.reason).toBe("non-json");
    }
  });

  it("200 with JSON body that has no text blocks → success with empty rawResponse", async () => {
    // Anthropic responses without a `content` array still parse; the text
    // concatenation yields an empty string. This is the 'no text block'
    // variant — it's classified as success with empty output, not malformed.
    installRequestScript((_req, respond) => {
      const res = makeFakeResponse(200);
      respond(res);
      res.emit("data", Buffer.from('{"content":[]}', "utf-8"));
      res.emit("end");
    });
    const outcome = await call();
    expect(outcome.kind).toBe("success");
    if (outcome.kind === "success") {
      expect(outcome.rawResponse).toBe("");
    }
  });
});

// ---------------------------------------------------------------------------
// T020 — oversize truncation
// ---------------------------------------------------------------------------

describe("providerCall — oversize (T020)", () => {
  it("accumulated bytes exceed maxResponseBytes → reason 'oversize'; response destroyed", async () => {
    let capturedRes: FakeResponse | null = null;
    installRequestScript((_req, respond) => {
      const res = makeFakeResponse(200);
      capturedRes = res;
      respond(res);
      // First chunk is already over the cap — should abort the stream.
      res.emit("data", Buffer.alloc(4096, "x"));
      // No 'end' emission; caller destroys mid-stream.
    });
    const outcome = await call({ maxResponseBytes: 1024 });
    expect(outcome.kind).toBe("malformed-response");
    if (outcome.kind === "malformed-response") {
      expect(outcome.reason).toBe("oversize");
    }
    expect(capturedRes?.destroyed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T021 — abort-mid-stream race
// ---------------------------------------------------------------------------

describe("providerCall — abort mid-stream (T021)", () => {
  it("signal.abort() during pending response → kind 'transport-error', reason 'cancelled'", async () => {
    let capturedReq: FakeRequest | null = null;
    installRequestScript((req, respond) => {
      capturedReq = req;
      const res = makeFakeResponse(200);
      respond(res);
      res.emit("data", Buffer.from('{"content":', "utf-8"));
      // Stall — the test will fire abort before we emit 'end'.
    });
    const ctrl = new AbortController();
    const pending = call({ signal: ctrl.signal, timeoutMs: 5_000 });
    await new Promise((r) => setTimeout(r, 20));
    ctrl.abort();
    const outcome = await pending;
    expect(outcome.kind).toBe("transport-error");
    if (outcome.kind === "transport-error") {
      expect(outcome.reason).toBe("cancelled");
    }
    expect(capturedReq?.destroyed).toBe(true);
  });

  it("signal already aborted before call → immediate cancelled outcome, no request issued", async () => {
    installRequestScript(() => {
      throw new Error("handler should not be invoked for pre-aborted signal");
    });
    const ctrl = new AbortController();
    ctrl.abort();
    const outcome = await call({ signal: ctrl.signal });
    expect(outcome.kind).toBe("transport-error");
    if (outcome.kind === "transport-error") {
      expect(outcome.reason).toBe("cancelled");
    }
    expect(httpsMock.request).not.toHaveBeenCalled();
  });
});
