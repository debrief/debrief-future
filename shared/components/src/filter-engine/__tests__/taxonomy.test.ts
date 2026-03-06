import { describe, expect, it } from "vitest";
import {
  buildDescendantMap,
  parseTaxonomy,
  type RawTaxonomyNode,
} from "../taxonomy";
import type { VesselTaxonomyNode } from "../types";

const RAW_TAXONOMY: Record<string, RawTaxonomyNode> = {
  surface: {
    label: "Surface Vessel",
    children: {
      warship: {
        label: "Warship",
        children: {
          frigate: {
            label: "Frigate",
            children: {
              type23: { label: "Type 23 Frigate" },
              type26: { label: "Type 26 Frigate" },
            },
          },
          destroyer: {
            label: "Destroyer",
            children: {
              type45: { label: "Type 45 Destroyer" },
            },
          },
        },
      },
    },
  },
  subsurface: {
    label: "Subsurface",
    children: {
      submarine: {
        label: "Submarine",
        children: {
          ssn: { label: "SSN" },
        },
      },
    },
  },
};

describe("parseTaxonomy", () => {
  it("converts raw JSON to VesselTaxonomyNode[]", () => {
    const nodes = parseTaxonomy(RAW_TAXONOMY);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]!.id).toBe("surface");
    expect(nodes[0]!.label).toBe("Surface Vessel");
    expect(nodes[0]!.children).toHaveLength(1);
    expect(nodes[0]!.children![0]!.id).toBe("warship");
  });

  it("handles empty taxonomy", () => {
    expect(parseTaxonomy({})).toEqual([]);
  });
});

describe("buildDescendantMap", () => {
  const TAXONOMY: VesselTaxonomyNode[] = parseTaxonomy(RAW_TAXONOMY);

  it("maps leaf node to its own full path", () => {
    const map = buildDescendantMap(TAXONOMY);
    const type23Paths = map.get("type23");
    expect(type23Paths).toBeDefined();
    expect(type23Paths!.has("surface/warship/frigate/type23")).toBe(true);
    expect(type23Paths!.size).toBe(1);
  });

  it("maps parent node to self + all descendants", () => {
    const map = buildDescendantMap(TAXONOMY);
    const frigPaths = map.get("frigate");
    expect(frigPaths).toBeDefined();
    expect(frigPaths!.has("surface/warship/frigate")).toBe(true);
    expect(frigPaths!.has("surface/warship/frigate/type23")).toBe(true);
    expect(frigPaths!.has("surface/warship/frigate/type26")).toBe(true);
    expect(frigPaths!.size).toBe(3);
  });

  it("maps root node to entire subtree", () => {
    const map = buildDescendantMap(TAXONOMY);
    const surfPaths = map.get("surface");
    expect(surfPaths).toBeDefined();
    expect(surfPaths!.has("surface")).toBe(true);
    expect(surfPaths!.has("surface/warship")).toBe(true);
    expect(surfPaths!.has("surface/warship/frigate/type23")).toBe(true);
    expect(surfPaths!.has("surface/warship/destroyer/type45")).toBe(true);
  });

  it("maps warship to all warship descendants", () => {
    const map = buildDescendantMap(TAXONOMY);
    const warPaths = map.get("warship");
    expect(warPaths).toBeDefined();
    expect(warPaths!.has("surface/warship")).toBe(true);
    expect(warPaths!.has("surface/warship/frigate")).toBe(true);
    expect(warPaths!.has("surface/warship/destroyer")).toBe(true);
    expect(warPaths!.has("surface/warship/frigate/type23")).toBe(true);
    expect(warPaths!.has("surface/warship/frigate/type26")).toBe(true);
    expect(warPaths!.has("surface/warship/destroyer/type45")).toBe(true);
    expect(warPaths!.size).toBe(6);
  });

  it("returns undefined for unknown node ID", () => {
    const map = buildDescendantMap(TAXONOMY);
    expect(map.get("nonexistent")).toBeUndefined();
  });

  it("handles empty taxonomy", () => {
    const map = buildDescendantMap([]);
    expect(map.size).toBe(0);
  });

  it("handles separate trees independently", () => {
    const map = buildDescendantMap(TAXONOMY);
    const ssnPaths = map.get("ssn");
    expect(ssnPaths).toBeDefined();
    expect(ssnPaths!.has("subsurface/submarine/ssn")).toBe(true);
    expect(ssnPaths!.size).toBe(1);
  });
});
