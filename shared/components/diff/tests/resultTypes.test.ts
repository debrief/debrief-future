import { describe, it, expect } from "vitest";
import { matchesResultType, getTopLevelType } from "../src/resultTypes";

describe("matchesResultType", () => {
  it("matches exact path", () => {
    expect(matchesResultType("mutation/track/smoothed", "mutation/track/smoothed")).toBe(true);
  });

  it("matches prefix", () => {
    expect(matchesResultType("mutation/track/smoothed", "mutation")).toBe(true);
    expect(matchesResultType("mutation/track/smoothed", "mutation/track")).toBe(true);
  });

  it("does not match wrong prefix", () => {
    expect(matchesResultType("mutation/track/smoothed", "addition")).toBe(false);
    expect(matchesResultType("mutation/track/smoothed", "mutation/sensor")).toBe(false);
  });

  it("does not match partial segment", () => {
    expect(matchesResultType("mutation/track/smoothed", "mut")).toBe(false);
  });

  it("does not match longer prefix", () => {
    expect(matchesResultType("mutation", "mutation/track")).toBe(false);
  });

  it("returns false for empty inputs", () => {
    expect(matchesResultType("", "mutation")).toBe(false);
    expect(matchesResultType("mutation", "")).toBe(false);
  });

  it("works with contrib deep types", () => {
    const deep = "artifact/report/ssa_assessment";
    expect(matchesResultType(deep, "artifact")).toBe(true);
    expect(matchesResultType(deep, "artifact/report")).toBe(true);
    expect(matchesResultType(deep, "artifact/report/ssa_assessment")).toBe(true);
    expect(matchesResultType(deep, "mutation")).toBe(false);
  });
});

describe("getTopLevelType", () => {
  it("extracts mutation", () => {
    expect(getTopLevelType("mutation/track/smoothed")).toBe("mutation");
  });

  it("extracts addition", () => {
    expect(getTopLevelType("addition/analysis/cpa")).toBe("addition");
  });

  it("extracts deletion", () => {
    expect(getTopLevelType("deletion/sensor")).toBe("deletion");
  });

  it("extracts artifact", () => {
    expect(getTopLevelType("artifact/image/bt_plot")).toBe("artifact");
  });

  it("works with top-level only", () => {
    expect(getTopLevelType("mutation")).toBe("mutation");
  });

  it("throws for invalid top-level", () => {
    expect(() => getTopLevelType("unknown/thing")).toThrow("Invalid top-level type");
  });

  it("throws for empty string", () => {
    expect(() => getTopLevelType("")).toThrow("non-empty string");
  });
});
