import { describe, expect, it } from "vitest";

import { formatDtg } from "../dtg";

describe("formatDtg", () => {
  it("formats an ISO instant as DDHHmmZ MMM YY", () => {
    expect(formatDtg("2026-04-20T15:00:00Z")).toBe("201500Z APR 26");
  });

  it("handles UTC midnight (day rollover not observable at 00:00)", () => {
    expect(formatDtg("2026-01-01T00:00:00Z")).toBe("010000Z JAN 26");
  });

  it("pads single-digit day, hour, minute, year", () => {
    expect(formatDtg("2005-02-09T03:04:00Z")).toBe("090304Z FEB 05");
  });

  it("falls back to the raw input on parse failure", () => {
    expect(formatDtg("not-a-date")).toBe("not-a-date");
  });

  it("falls back on empty input", () => {
    expect(formatDtg("")).toBe("");
  });

  it("uses UTC — local timezone does not affect output", () => {
    // 2026-06-21T23:30:00Z should always be 212330Z JUN 26 regardless of
    // runner timezone.
    expect(formatDtg("2026-06-21T23:30:00Z")).toBe("212330Z JUN 26");
  });
});
