/**
 * Tests for parseResponse (#188 T022/T023/T042).
 *
 * One test per GenerationErrorReason value — five reasons, minimum 1 test each.
 * Plus the happy-path assertion and the unrecognised-term leak visitor cases
 * requested by T042 (leaks through array_filter, or, a_containedBy).
 */

import { describe, expect, it } from "vitest";
import { parseResponse } from "../parseResponse";

const PROMPT_HASH = "deadbeef";
const PROMPT_VERSION = "test-1";

function parse(raw: string): ReturnType<typeof parseResponse> {
  return parseResponse("test phrase", raw, PROMPT_HASH, PROMPT_VERSION);
}

describe("parseResponse — happy path (T023)", () => {
  it("parses a well-formed response with lozenges and an empty unrecognisedTerms", () => {
    const raw = JSON.stringify({
      cql2: {
        op: "a_containedBy",
        args: [["GB"], { property: "debrief:platforms[*].nationality" }],
      },
      lozenges: [{ filterType: "nationality", value: "GB" }],
      unrecognisedTerms: [],
    });
    const result = parse(raw);
    expect(result.error).toBeNull();
    expect(result.cql2).toBeDefined();
    expect(result.lozenges).toHaveLength(1);
    expect(result.lozenges[0]).toMatchObject({
      filterType: "nationality",
      value: "GB",
    });
    expect(result.unrecognisedTerms).toEqual([]);
    expect(result.diagnostics.usedLlm).toBe(true);
    expect(result.diagnostics.promptVersion).toBe(PROMPT_VERSION);
    expect(result.diagnostics.promptHash).toBe(PROMPT_HASH);
  });

  it("parses an empty-filter response (cql2: {})", () => {
    const raw = JSON.stringify({ cql2: {}, lozenges: [], unrecognisedTerms: [] });
    const result = parse(raw);
    expect(result.error).toBeNull();
    expect(result.cql2).toEqual({});
    expect(result.lozenges).toEqual([]);
  });
});

describe("parseResponse — malformed-json (T022)", () => {
  it("flags unparseable JSON", () => {
    const result = parse("not json at all {{");
    expect(result.error?.reason).toBe("malformed-json");
    expect(result.error?.rawResponse).toBe("not json at all {{");
  });
});

describe("parseResponse — schema-violation (T022)", () => {
  it("flags missing cql2 key", () => {
    const raw = JSON.stringify({ lozenges: [], unrecognisedTerms: [] });
    expect(parse(raw).error?.reason).toBe("schema-violation");
  });

  it("flags missing lozenges key", () => {
    const raw = JSON.stringify({ cql2: {}, unrecognisedTerms: [] });
    expect(parse(raw).error?.reason).toBe("schema-violation");
  });

  it("flags missing unrecognisedTerms key", () => {
    const raw = JSON.stringify({ cql2: {}, lozenges: [] });
    expect(parse(raw).error?.reason).toBe("schema-violation");
  });

  it("flags lozenge with unknown filterType", () => {
    const raw = JSON.stringify({
      cql2: {},
      lozenges: [{ filterType: "not-a-real-type", value: "x" }],
      unrecognisedTerms: [],
    });
    expect(parse(raw).error?.reason).toBe("schema-violation");
  });

  it("flags lozenge with non-string value", () => {
    const raw = JSON.stringify({
      cql2: {},
      lozenges: [{ filterType: "nationality", value: 123 }],
      unrecognisedTerms: [],
    });
    expect(parse(raw).error?.reason).toBe("schema-violation");
  });

  it("flags unrecognisedTerms that is not a string array", () => {
    const raw = JSON.stringify({
      cql2: {},
      lozenges: [],
      unrecognisedTerms: [1, 2, 3],
    });
    expect(parse(raw).error?.reason).toBe("schema-violation");
  });
});

describe("parseResponse — hallucinated-field (T022)", () => {
  it("flags a CQL2 property not in PROPERTY_MAP", () => {
    const raw = JSON.stringify({
      cql2: {
        op: "=",
        args: [{ property: "debrief:not-a-real-field" }, "x"],
      },
      lozenges: [],
      unrecognisedTerms: [],
    });
    const result = parse(raw);
    expect(result.error?.reason).toBe("hallucinated-field");
    expect(result.error?.message).toContain("debrief:not-a-real-field");
  });

  it("flags an unknown platform field inside array_filter", () => {
    const raw = JSON.stringify({
      cql2: {
        op: "array_filter",
        args: [
          { property: "debrief:platforms" },
          {
            op: "=",
            args: [{ property: "captain" }, "Nelson"],
          },
        ],
      },
      lozenges: [],
      unrecognisedTerms: [],
    });
    const result = parse(raw);
    expect(result.error?.reason).toBe("hallucinated-field");
    expect(result.error?.message).toContain("captain");
  });
});

describe("parseResponse — cql2-evaluation-failed (T022 / decision 10A)", () => {
  it("flags an unsupported CQL2 operator", () => {
    const raw = JSON.stringify({
      cql2: { op: "between", args: [] },
      lozenges: [],
      unrecognisedTerms: [],
    });
    expect(parse(raw).error?.reason).toBe("cql2-evaluation-failed");
  });

  it("flags bad arg arity", () => {
    const raw = JSON.stringify({
      cql2: { op: "=", args: [{ property: "title" }] },
      lozenges: [],
      unrecognisedTerms: [],
    });
    expect(parse(raw).error?.reason).toBe("cql2-evaluation-failed");
  });
});

describe("parseResponse — unrecognised-term-leaked (T022 / T042)", () => {
  it("flags a leaked term in a top-level =", () => {
    const raw = JSON.stringify({
      cql2: {
        op: "=",
        args: [{ property: "debrief:author" }, "klingon"],
      },
      lozenges: [{ filterType: "author", value: "klingon" }],
      unrecognisedTerms: ["klingon"],
    });
    expect(parse(raw).error?.reason).toBe("unrecognised-term-leaked");
  });

  it("flags a leaked term inside a_containedBy", () => {
    const raw = JSON.stringify({
      cql2: {
        op: "a_containedBy",
        args: [["warbirds"], { property: "debrief:tags" }],
      },
      lozenges: [{ filterType: "tag", value: "warbirds" }],
      unrecognisedTerms: ["warbirds"],
    });
    expect(parse(raw).error?.reason).toBe("unrecognised-term-leaked");
  });

  it("flags a leaked term inside array_filter's inner predicate tree", () => {
    const raw = JSON.stringify({
      cql2: {
        op: "array_filter",
        args: [
          { property: "debrief:platforms" },
          {
            op: "=",
            args: [{ property: "nationality" }, "leaked-nation"],
          },
        ],
      },
      lozenges: [{ filterType: "nationality", value: "leaked-nation" }],
      unrecognisedTerms: ["leaked-nation"],
    });
    expect(parse(raw).error?.reason).toBe("unrecognised-term-leaked");
  });

  it("flags a leaked term inside an or group (T042)", () => {
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
            args: [["klingon"], { property: "debrief:platforms[*].nationality" }],
          },
        ],
      },
      lozenges: [{ filterType: "nationality", value: "GB" }],
      unrecognisedTerms: ["klingon"],
    });
    expect(parse(raw).error?.reason).toBe("unrecognised-term-leaked");
  });

  it("does NOT flag when unrecognisedTerms is present but absent from cql2 (P3 happy path)", () => {
    const raw = JSON.stringify({
      cql2: {
        op: "a_containedBy",
        args: [["GB"], { property: "debrief:platforms[*].nationality" }],
      },
      lozenges: [{ filterType: "nationality", value: "GB" }],
      unrecognisedTerms: ["klingon", "warbirds"],
    });
    const result = parse(raw);
    expect(result.error).toBeNull();
    expect(result.unrecognisedTerms).toEqual(["klingon", "warbirds"]);
  });
});
