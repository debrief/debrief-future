/**
 * Tests for `createPostMessageLLMClient` (#191 T032, Decision 4).
 *
 * Scenarios:
 *   - happy path — generate() resolves when a matching nlOutcome arrives
 *   - abort during pending — in-flight resolves as transport-error/cancelled
 *   - abort after completion — later abort() is a no-op
 *   - unknown response id — silently ignored, pending continues
 *   - postMessage throwing — generate() resolves to transport-error/unknown
 */

import { describe, expect, it, vi } from "vitest";
import { createPostMessageLLMClient } from "../clients";

type Handler = (msg: unknown) => void;

interface HarnessOptions {
  readonly uuidValues?: readonly string[];
  readonly postMessageImpl?: (msg: unknown) => void;
}

function makeHarness(opts: HarnessOptions = {}) {
  let handler: Handler | null = null;
  const sent: unknown[] = [];
  const uuids = opts.uuidValues ?? ["id-1", "id-2", "id-3", "id-4"];
  let uuidIndex = 0;

  const client = createPostMessageLLMClient({
    postMessage: (msg: unknown) => {
      if (opts.postMessageImpl) {
        opts.postMessageImpl(msg);
      }
      sent.push(msg);
    },
    subscribe: (h) => {
      handler = h;
      return () => {
        handler = null;
      };
    },
    uuid: () => {
      const v = uuids[uuidIndex % uuids.length]!;
      uuidIndex += 1;
      return v;
    },
  });

  return {
    client,
    sent,
    deliver: (msg: unknown) => handler?.(msg),
  };
}

describe("createPostMessageLLMClient (T032)", () => {
  it("happy path — resolves to the outcome of the matching nlOutcome", async () => {
    const h = makeHarness();
    const pending = h.client.generate("a prompt");

    // One nlGenerate issued.
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]).toMatchObject({
      type: "nlGenerate",
      requestId: "id-1",
      prompt: "a prompt",
    });

    // Respond with a success outcome keyed by the same id.
    h.deliver({
      type: "nlOutcome",
      requestId: "id-1",
      success: true,
      outcome: {
        kind: "success",
        rawResponse: "{}",
        durationMs: 123,
        responseBytes: 2,
        model: "claude-haiku-4-5-20251001",
      },
    });

    const outcome = await pending;
    expect(outcome.kind).toBe("success");
    if (outcome.kind === "success") {
      expect(outcome.rawResponse).toBe("{}");
    }
  });

  it("ignores outcomes for unknown requestIds", async () => {
    const h = makeHarness();
    const pending = h.client.generate("a");

    // Unrelated outcome — ignored.
    h.deliver({
      type: "nlOutcome",
      requestId: "some-other-id",
      success: true,
      outcome: { kind: "success", rawResponse: "x", durationMs: 0, responseBytes: 1, model: "m" },
    });

    // Now the real outcome arrives for id-1.
    h.deliver({
      type: "nlOutcome",
      requestId: "id-1",
      success: true,
      outcome: { kind: "success", rawResponse: "real", durationMs: 0, responseBytes: 4, model: "m" },
    });

    const outcome = await pending;
    expect(outcome.kind).toBe("success");
    if (outcome.kind === "success") {
      expect(outcome.rawResponse).toBe("real");
    }
  });

  it("abort() during pending resolves with transport-error/cancelled AND sends nlAbort", async () => {
    const h = makeHarness();
    const pending = h.client.generate("a");

    // Before abort: only the nlGenerate has been sent.
    expect(h.sent).toHaveLength(1);

    h.client.abort();

    // abort() should have fired an nlAbort for the pending id.
    const aborts = h.sent.filter(
      (m): m is { type: string; requestId: string } =>
        typeof m === "object" && m !== null && (m as { type?: string }).type === "nlAbort",
    );
    expect(aborts).toHaveLength(1);
    expect(aborts[0]!.requestId).toBe("id-1");

    const outcome = await pending;
    expect(outcome.kind).toBe("transport-error");
    if (outcome.kind === "transport-error") {
      expect(outcome.reason).toBe("cancelled");
    }
  });

  it("abort() after completion is a no-op", async () => {
    const h = makeHarness();
    const pending = h.client.generate("a");
    h.deliver({
      type: "nlOutcome",
      requestId: "id-1",
      success: true,
      outcome: { kind: "success", rawResponse: "x", durationMs: 0, responseBytes: 1, model: "m" },
    });
    await pending;

    // Nothing should happen here; no extra messages emitted.
    const beforeAbort = h.sent.length;
    h.client.abort();
    const afterAbort = h.sent.length;
    expect(afterAbort).toBe(beforeAbort);
  });

  it("postMessage throwing resolves the call to transport-error/unknown", async () => {
    const thrower = vi.fn(() => {
      throw new Error("host unavailable");
    });
    const h = makeHarness({ postMessageImpl: thrower });
    const outcome = await h.client.generate("a");
    expect(outcome.kind).toBe("transport-error");
    if (outcome.kind === "transport-error") {
      expect(outcome.reason).toBe("unknown");
    }
  });

  it("multiple pending calls are tracked independently", async () => {
    const h = makeHarness();
    const p1 = h.client.generate("first");
    const p2 = h.client.generate("second");

    expect(h.sent).toHaveLength(2);

    // Respond to #2 first.
    h.deliver({
      type: "nlOutcome",
      requestId: "id-2",
      success: true,
      outcome: { kind: "success", rawResponse: "SECOND", durationMs: 0, responseBytes: 6, model: "m" },
    });

    const o2 = await p2;
    expect(o2.kind).toBe("success");
    if (o2.kind === "success") {
      expect(o2.rawResponse).toBe("SECOND");
    }

    // #1 still pending.
    h.deliver({
      type: "nlOutcome",
      requestId: "id-1",
      success: true,
      outcome: { kind: "success", rawResponse: "FIRST", durationMs: 0, responseBytes: 5, model: "m" },
    });
    const o1 = await p1;
    expect(o1.kind).toBe("success");
    if (o1.kind === "success") {
      expect(o1.rawResponse).toBe("FIRST");
    }
  });
});
