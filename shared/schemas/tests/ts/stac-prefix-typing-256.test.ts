/**
 * Compile-time type-safety assertions for Spec #256 — prefix-aware STAC typing.
 *
 * These exercise the generated `StacItemProperties` / `StacAsset` surfaces the
 * way the writer hosts do, on BOTH the read and write paths. The `@ts-expect-error`
 * lines are the real assertions: they fail the typecheck (and this test file) if
 * the prefixed slots regress to `unknown` or accept the wrong value type.
 *
 * Contracts: C3 (read), C8 (write path), C9 (asset modelling). FR-004 / FR-012 /
 * SC-002 / SC-007.
 */
import { describe, it, expect } from "vitest";
import type {
  StacItemProperties,
  StacAsset,
  PropertiesProvenanceEntry,
  PlatformRecord,
} from "../../src/generated/typescript/types";

describe("#256 prefixed StacItemProperties — read path (C3)", () => {
  it("modelled debrief:* keys resolve to their named-slot types", () => {
    const props = {
      datetime: "2026-06-02T00:00:00Z",
      "debrief:overrides": ["a"],
    } as StacItemProperties;

    // PASS: modelled prefixed keys resolve to the named slot type.
    const log: PropertiesProvenanceEntry[] | undefined =
      props["debrief:provenance_log"];
    const overrides: string[] | undefined = props["debrief:overrides"];
    const platforms: PlatformRecord[] | undefined = props["debrief:platforms"];
    void log;
    void platforms;

    // PASS: open content — STAC core + unmodelled keys.
    const datetime: string = props.datetime;
    const label: unknown = props["debrief:label"]; // feature key, not modelled
    void label;

    expect(datetime).toBe("2026-06-02T00:00:00Z");
    expect(overrides).toEqual(["a"]);
  });

  it("rejects mis-typed modelled READ keys at compile time", () => {
    const props = {} as StacItemProperties;

    // @ts-expect-error — a typo'd modelled key is `unknown`; assigning it to a
    // concrete type must fail (the strongest guarantee compatible with open content).
    const bad: PropertiesProvenanceEntry[] = props["debrief:provenence_log"];
    void bad;

    // @ts-expect-error — wrong value type for a modelled slot.
    const wrong: number[] = props["debrief:overrides"];
    void wrong;

    expect(true).toBe(true);
  });
});

describe("#256 prefixed StacItemProperties — write path (C8 / FR-012)", () => {
  it("type-checks modelled-key writes and still allows arbitrary keys", () => {
    const props = { datetime: "x" } as StacItemProperties;

    // PASS: modelled-key writes are checked against the slot type.
    props["debrief:overrides"] = ["a", "b"];
    props["debrief:provenance_log"] = [];

    // PASS: arbitrary / core keys still flow through the index signature.
    const patch: Record<string, unknown> = { foo: 1 };
    for (const [k, v] of Object.entries(patch)) props[k] = v;
    props.datetime = "2026-06-02T00:00:00Z";

    expect(props["debrief:overrides"]).toEqual(["a", "b"]);
  });

  it("rejects wrong-typed modelled-key WRITES at compile time", () => {
    const props = {} as StacItemProperties;

    // @ts-expect-error — wrong value type on a modelled-key write must fail.
    props["debrief:overrides"] = [1, 2];

    expect(true).toBe(true);
  });
});

describe("#256 StacAsset — asset-level modelled keys (C9 / FR-011 / SC-007)", () => {
  it("debrief:toolId / debrief:snapshotTimestamp resolve via StacAsset, no cast", () => {
    const asset = { href: "x.json" } as StacAsset;

    const toolId: string | undefined = asset["debrief:toolId"];
    const ts: string | undefined = asset["debrief:snapshotTimestamp"];
    void toolId;
    void ts;

    expect(asset.href).toBe("x.json");
  });

  it("rejects wrong-typed asset modelled keys at compile time", () => {
    const asset = { href: "x.json" } as StacAsset;

    // @ts-expect-error — debrief:toolId is `string | undefined`, not number.
    const badTool: number = asset["debrief:toolId"];
    void badTool;

    expect(true).toBe(true);
  });
});
