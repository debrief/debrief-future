/**
 * Tests for `parseResponse` (#188 T022 + T023).
 *
 * Every `GenerationErrorReason` is covered:
 *   - malformed-json
 *   - schema-violation
 *   - hallucinated-field
 *   - unrecognised-term-leaked (including leaks nested inside array_filter,
 *     or, and a_containedBy — extends T022 coverage per T042)
 *   - cql2-evaluation-failed
 *
 * Plus a happy-path test asserting `error: null` + the expected lozenges.
 */

import { describe, expect, it } from "vitest";
import { parseResponse } from "../parseResponse";

const PROMPT_HASH = "deadbeef".repeat(8);
const PROMPT_VERSION = "test-v1";

describe("parseResponse — happy path (T023)", () => {
  it("parses a well-formed response into a GenerationResult", async () => {
    const raw = JSON.stringify({
      cql2: {
        op: "a_containedBy",
        args: [["GB"], { property: "debrief:platforms[*].nationality" }],
      },
      lozenges: [{ filterType: "nationality", value: "GB" }],
      unrecognised_terms: [],
    });
    const result = await parseResponse(
      "UK platforms",
      raw,
      PROMPT_HASH,
      PROMPT_VERSION,
    );
    expect(result.error).toBeNull();
    expect(result.lozenges).toEqual([
      { filterType: "nationality", value: "GB" },
    ]);
    expect(result.unrecognisedTerms).toEqual([]);
    expect(result.diagnostics.promptHash).toBe(PROMPT_HASH);
    expect(result.diagnostics.usedLlm).toBe(true);
  });
});

describe("parseResponse — malformed-json (T022)", () => {
  it("fails when the response is not valid JSON", async () => {
    const result = await parseResponse(
      "UK platforms",
      "{ not valid json",
      PROMPT_HASH,
      PROMPT_VERSION,
    );
    expect(result.error?.reason).toBe("malformed-json");
    expect(result.error?.rawResponse).toBe("{ not valid json");
  });
});

describe("parseResponse — schema-violation (T022)", () => {
  it("fails when required keys are missing", async () => {
    const raw = JSON.stringify({ cql2: {} });
    const result = await parseResponse("x", raw, PROMPT_HASH, PROMPT_VERSION);
    expect(result.error?.reason).toBe("schema-violation");
  });

  it("fails when lozenges is not an array", async () => {
    const raw = JSON.stringify({
      cql2: {},
      lozenges: "not an array",
      unrecognised_terms: [],
    });
    const result = await parseResponse("x", raw, PROMPT_HASH, PROMPT_VERSION);
    expect(result.error?.reason).toBe("schema-violation");
  });

  it("fails when a lozenge uses an unknown filterType", async () => {
    const raw = JSON.stringify({
      cql2: {},
      lozenges: [{ filterType: "fake-type", value: "x" }],
      unrecognised_terms: [],
    });
    const result = await parseResponse("x", raw, PROMPT_HASH, PROMPT_VERSION);
    expect(result.error?.reason).toBe("schema-violation");
  });
});

describe("parseResponse — hallucinated-field (T022)", () => {
  it("fails when CQL2 references a property outside PROPERTY_MAP", async () => {
    const raw = JSON.stringify({
      cql2: {
        op: "=",
        args: [{ property: "debrief:fake_field" }, "x"],
      },
      lozenges: [],
      unrecognised_terms: [],
    });
    const result = await parseResponse("x", raw, PROMPT_HASH, PROMPT_VERSION);
    // The reverse parser catches this as unknown-property before the
    // hallucinated-field stage runs — both land in the same user-visible
    // failure class (cql2-evaluation-failed OR hallucinated-field).
    expect(
      result.error?.reason === "cql2-evaluation-failed" ||
        result.error?.reason === "hallucinated-field",
    ).toBe(true);
  });

  it("fails when a bare property inside array_filter is not a platform field", async () => {
    const raw = JSON.stringify({
      cql2: {
        op: "array_filter",
        args: [
          { property: "debrief:platforms" },
          { op: "=", args: [{ property: "fake_field" }, "x"] },
        ],
      },
      lozenges: [],
      unrecognised_terms: [],
    });
    const result = await parseResponse("x", raw, PROMPT_HASH, PROMPT_VERSION);
    expect(result.error?.reason).toBe("hallucinated-field");
  });
});

describe("parseResponse — cql2-evaluation-failed (T022)", () => {
  it("fails when the CQL2 uses an unsupported operator", async () => {
    const raw = JSON.stringify({
      cql2: { op: "weird_contains", args: [] },
      lozenges: [],
      unrecognised_terms: [],
    });
    const result = await parseResponse("x", raw, PROMPT_HASH, PROMPT_VERSION);
    expect(result.error?.reason).toBe("cql2-evaluation-failed");
  });

  it("fails when the CQL2 has bad arg arity", async () => {
    const raw = JSON.stringify({
      cql2: {
        op: "array_filter",
        args: [{ property: "debrief:platforms" }],
      },
      lozenges: [],
      unrecognised_terms: [],
    });
    const result = await parseResponse("x", raw, PROMPT_HASH, PROMPT_VERSION);
    expect(result.error?.reason).toBe("cql2-evaluation-failed");
  });
});

describe("parseResponse — unrecognised-term-leaked (T022)", () => {
  it("fails when an unrecognised term appears as a scalar = predicate value", async () => {
    const raw = JSON.stringify({
      cql2: {
        op: "=",
        args: [{ property: "debrief:author" }, "Klingon"],
      },
      lozenges: [],
      unrecognised_terms: ["Klingon"],
    });
    const result = await parseResponse("x", raw, PROMPT_HASH, PROMPT_VERSION);
    expect(result.error?.reason).toBe("unrecognised-term-leaked");
  });

  it("fails when an unrecognised term leaks inside an array_filter predicate", async () => {
    const raw = JSON.stringify({
      cql2: {
        op: "array_filter",
        args: [
          { property: "debrief:platforms" },
          { op: "=", args: [{ property: "nationality" }, "XX"] },
        ],
      },
      lozenges: [],
      unrecognised_terms: ["XX"],
    });
    const result = await parseResponse("x", raw, PROMPT_HASH, PROMPT_VERSION);
    expect(result.error?.reason).toBe("unrecognised-term-leaked");
  });

  it("fails when an unrecognised term leaks inside an `or` group", async () => {
    const raw = JSON.stringify({
      cql2: {
        op: "or",
        args: [
          {
            op: "a_containedBy",
            args: [["GB"], { property: "debrief:platforms[*].nationality" }],
          },
          {
            op: "a_containedBy",
            args: [["XX"], { property: "debrief:platforms[*].nationality" }],
          },
        ],
      },
      lozenges: [],
      unrecognised_terms: ["XX"],
    });
    const result = await parseResponse("x", raw, PROMPT_HASH, PROMPT_VERSION);
    expect(result.error?.reason).toBe("unrecognised-term-leaked");
  });

  it("fails when an unrecognised term leaks inside an a_containedBy value array", async () => {
    const raw = JSON.stringify({
      cql2: {
        op: "a_containedBy",
        args: [["XX"], { property: "debrief:platforms[*].nationality" }],
      },
      lozenges: [],
      unrecognised_terms: ["XX"],
    });
    const result = await parseResponse("x", raw, PROMPT_HASH, PROMPT_VERSION);
    expect(result.error?.reason).toBe("unrecognised-term-leaked");
  });

  it("passes when a term is unrecognised but genuinely omitted from cql2", async () => {
    const raw = JSON.stringify({
      cql2: {},
      lozenges: [],
      unrecognised_terms: ["klingon", "warbirds"],
    });
    const result = await parseResponse(
      "Klingon warbirds",
      raw,
      PROMPT_HASH,
      PROMPT_VERSION,
    );
    expect(result.error).toBeNull();
    expect(result.unrecognisedTerms).toEqual(["klingon", "warbirds"]);
  });
});
