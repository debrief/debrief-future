/**
 * Tests for generateCql2 (#188 T029).
 */

import { describe, expect, it, vi } from "vitest";
import { createPassthroughLLMClient } from "../clients";
import { generateCql2 } from "../generate";
import { loadEnumBundle } from "../loadEnumBundle";

const enums = loadEnumBundle();

function responsePayload(cql2: Record<string, unknown>): string {
  return JSON.stringify({
    cql2,
    lozenges: [{ filterType: "nationality", value: "GB" }],
    unrecognisedTerms: [],
  });
}

describe("generateCql2", () => {
  it("short-circuits the empty phrase without calling the LLM", async () => {
    const spy = vi.fn(async () => "should-not-be-called");
    const client = createPassthroughLLMClient(spy);
    const result = await generateCql2("", { enums, client });
    expect(spy).not.toHaveBeenCalled();
    expect(result.diagnostics.usedLlm).toBe(false);
    expect(result.cql2).toEqual({});
    expect(result.lozenges).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("short-circuits a whitespace-only phrase", async () => {
    const spy = vi.fn(async () => "should-not-be-called");
    const client = createPassthroughLLMClient(spy);
    const result = await generateCql2("   \n\t  ", { enums, client });
    expect(spy).not.toHaveBeenCalled();
    expect(result.diagnostics.usedLlm).toBe(false);
  });

  it("calls the LLM once and returns a populated result", async () => {
    const spy = vi.fn(async () =>
      responsePayload({
        op: "a_containedBy",
        args: [["GB"], { property: "debrief:platforms[*].nationality" }],
      }),
    );
    const client = createPassthroughLLMClient(spy);
    const result = await generateCql2("UK submarines", { enums, client });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
    expect(result.diagnostics.usedLlm).toBe(true);
    expect(result.cql2).toEqual({
      op: "a_containedBy",
      args: [["GB"], { property: "debrief:platforms[*].nationality" }],
    });
    expect(result.lozenges[0]).toMatchObject({
      filterType: "nationality",
      value: "GB",
    });
  });

  it("propagates errors thrown by the LLM client", async () => {
    const client = createPassthroughLLMClient(async () => {
      throw new Error("transport failed");
    });
    await expect(
      generateCql2("UK submarines", { enums, client }),
    ).rejects.toThrow(/transport failed/);
  });

  it("surfaces parse failures as result.error, not exceptions", async () => {
    const client = createPassthroughLLMClient(async () => "garbage-not-json");
    const result = await generateCql2("UK submarines", { enums, client });
    expect(result.error).not.toBeNull();
    expect(result.error?.reason).toBe("malformed-json");
    expect(result.diagnostics.usedLlm).toBe(true);
  });
});
