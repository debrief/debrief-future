/**
 * Tests for `generateCql2` (#188 T029).
 *
 * - Empty-phrase short-circuit (FR-009).
 * - Whitespace-only phrase short-circuit.
 * - Happy path calls the LLM exactly once.
 * - LLM client throwing propagates out of `generateCql2`.
 */

import { describe, expect, it } from "vitest";
import { generateCql2, PROMPT_VERSION } from "../generate";
import { loadEnumBundle } from "./loadEnumBundle";
import { createPassthroughLLMClient } from "../clients";
import type { EnumBundle } from "../types";

function stubClient(rawResponse: string): {
  client: ReturnType<typeof createPassthroughLLMClient>;
  callCount: () => number;
  prompts: () => string[];
} {
  const prompts: string[] = [];
  const client = createPassthroughLLMClient(async (prompt) => {
    prompts.push(prompt);
    return rawResponse;
  });
  return {
    client,
    callCount: () => prompts.length,
    prompts: () => [...prompts],
  };
}

let enumsCache: EnumBundle | null = null;
function enums(): EnumBundle {
  if (!enumsCache) enumsCache = loadEnumBundle();
  return enumsCache;
}

describe("generateCql2 — short-circuits (T029 / FR-009)", () => {
  it("empty phrase returns an empty result without calling the LLM", async () => {
    const { client, callCount } = stubClient("{}");
    const result = await generateCql2("", { client, enums: enums() });
    expect(callCount()).toBe(0);
    expect(result.cql2).toEqual({});
    expect(result.lozenges).toEqual([]);
    expect(result.unrecognisedTerms).toEqual([]);
    expect(result.error).toBeNull();
    expect(result.diagnostics.usedLlm).toBe(false);
    expect(result.diagnostics.promptVersion).toBe(PROMPT_VERSION);
  });

  it("whitespace-only phrase short-circuits", async () => {
    const { client, callCount } = stubClient("{}");
    const result = await generateCql2("   \t\n  ", {
      client,
      enums: enums(),
    });
    expect(callCount()).toBe(0);
    expect(result.diagnostics.usedLlm).toBe(false);
  });
});

describe("generateCql2 — happy path (T029)", () => {
  it("calls the LLM once and returns a populated result", async () => {
    const raw = JSON.stringify({
      cql2: {
        op: "a_containedBy",
        args: [["GB"], { property: "debrief:platforms[*].nationality" }],
      },
      lozenges: [{ filterType: "nationality", value: "GB" }],
      unrecognised_terms: [],
    });
    const { client, callCount } = stubClient(raw);
    const result = await generateCql2("UK platforms", {
      client,
      enums: enums(),
    });
    expect(callCount()).toBe(1);
    expect(result.error).toBeNull();
    expect(result.lozenges).toEqual([
      { filterType: "nationality", value: "GB" },
    ]);
    expect(result.diagnostics.usedLlm).toBe(true);
    expect(result.diagnostics.promptHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.diagnostics.responseHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("generateCql2 — transport errors (T029)", () => {
  it("propagates a throw from the LLM client", async () => {
    const client = createPassthroughLLMClient(() => {
      throw new Error("transport blew up");
    });
    await expect(
      generateCql2("UK platforms", { client, enums: enums() }),
    ).rejects.toThrow(/transport blew up/);
  });
});

describe("generateCql2 — promptVersion override", () => {
  it("echoes a caller-supplied promptVersion into diagnostics", async () => {
    const raw = JSON.stringify({
      cql2: {},
      lozenges: [],
      unrecognised_terms: [],
    });
    const { client } = stubClient(raw);
    const result = await generateCql2("UK", {
      client,
      enums: enums(),
      promptVersion: "custom-v99",
    });
    expect(result.diagnostics.promptVersion).toBe("custom-v99");
  });
});
