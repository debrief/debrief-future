import { describe, expect, it } from "vitest";
import {
  buildDescendantMap,
  buildTaxonomyLabelMap,
  parseTaxonomy,
  resolveTaxonomyLabel,
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

describe("buildTaxonomyLabelMap", () => {
  const TAXONOMY: VesselTaxonomyNode[] = parseTaxonomy(RAW_TAXONOMY);

  it("maps full paths to labels", () => {
    const labelMap = buildTaxonomyLabelMap(TAXONOMY);
    expect(labelMap.get("surface")).toBe("Surface Vessel");
    expect(labelMap.get("surface/warship")).toBe("Warship");
    expect(labelMap.get("surface/warship/frigate")).toBe("Frigate");
    expect(labelMap.get("surface/warship/frigate/type23")).toBe("Type 23 Frigate");
    expect(labelMap.get("surface/warship/frigate/type26")).toBe("Type 26 Frigate");
    expect(labelMap.get("surface/warship/destroyer/type45")).toBe("Type 45 Destroyer");
    expect(labelMap.get("subsurface/submarine/ssn")).toBe("SSN");
  });

  it("handles ambiguous node IDs via full paths", () => {
    // Create a taxonomy with duplicate node IDs in different branches
    const ambiguousTaxonomy: VesselTaxonomyNode[] = [
      {
        id: "auxiliary",
        label: "Auxiliary",
        children: [
          { id: "tanker", label: "Tanker" },
        ],
      },
      {
        id: "merchant",
        label: "Merchant",
        children: [
          { id: "tanker", label: "Merchant Tanker" },
        ],
      },
    ];

    const labelMap = buildTaxonomyLabelMap(ambiguousTaxonomy);
    expect(labelMap.get("auxiliary/tanker")).toBe("Tanker");
    expect(labelMap.get("merchant/tanker")).toBe("Merchant Tanker");
  });

  it("handles empty taxonomy", () => {
    const labelMap = buildTaxonomyLabelMap([]);
    expect(labelMap.size).toBe(0);
  });

  it("includes all nodes in a deep tree", () => {
    const labelMap = buildTaxonomyLabelMap(TAXONOMY);
    // Should have all 8 nodes: surface, warship, frigate, type23, type26, destroyer, type45, subsurface, submarine, ssn
    expect(labelMap.size).toBe(10);
  });
});

describe("resolveTaxonomyLabel", () => {
  const TAXONOMY: VesselTaxonomyNode[] = parseTaxonomy(RAW_TAXONOMY);
  const labelMap = buildTaxonomyLabelMap(TAXONOMY);

  it("resolves known path to label", () => {
    expect(resolveTaxonomyLabel("surface/warship/frigate/type23", labelMap)).toBe("Type 23 Frigate");
  });

  it("returns raw value for unknown path (graceful degradation)", () => {
    expect(resolveTaxonomyLabel("unknown/path/to/vessel", labelMap)).toBe("unknown/path/to/vessel");
  });

  it("resolves branch node path", () => {
    expect(resolveTaxonomyLabel("surface/warship", labelMap)).toBe("Warship");
  });

  it("resolves root node path", () => {
    expect(resolveTaxonomyLabel("surface", labelMap)).toBe("Surface Vessel");
  });
});

describe("extensibility (US4)", () => {
  it("new vessel type added to taxonomy appears in label map without code changes", () => {
    // Simulate adding "Type 31 Frigate" to the taxonomy JSON
    const extendedRaw: Record<string, RawTaxonomyNode> = {
      ...RAW_TAXONOMY,
      surface: {
        ...RAW_TAXONOMY.surface!,
        children: {
          warship: {
            label: "Warship",
            children: {
              frigate: {
                label: "Frigate",
                children: {
                  type23: { label: "Type 23 Frigate" },
                  type26: { label: "Type 26 Frigate" },
                  type31: { label: "Type 31 Frigate" },
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
    };

    const nodes = parseTaxonomy(extendedRaw);
    const labelMap = buildTaxonomyLabelMap(nodes);
    const descendantMap = buildDescendantMap(nodes);

    // New type appears in label map
    expect(labelMap.get("surface/warship/frigate/type31")).toBe("Type 31 Frigate");

    // New type appears in descendant map under frigate
    const frigatePaths = descendantMap.get("frigate");
    expect(frigatePaths).toBeDefined();
    expect(frigatePaths!.has("surface/warship/frigate/type31")).toBe(true);

    // Existing types still work
    expect(labelMap.get("surface/warship/frigate/type23")).toBe("Type 23 Frigate");
  });

  it("new branch node added to taxonomy works without code changes", () => {
    const extendedRaw: Record<string, RawTaxonomyNode> = {
      ...RAW_TAXONOMY,
      surface: {
        ...RAW_TAXONOMY.surface!,
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
              amphibious: {
                label: "Amphibious Vessel",
                children: {
                  lpd: { label: "Landing Platform Dock" },
                },
              },
            },
          },
        },
      },
    };

    const nodes = parseTaxonomy(extendedRaw);
    const labelMap = buildTaxonomyLabelMap(nodes);

    expect(labelMap.get("surface/warship/amphibious")).toBe("Amphibious Vessel");
    expect(labelMap.get("surface/warship/amphibious/lpd")).toBe("Landing Platform Dock");
  });
});
