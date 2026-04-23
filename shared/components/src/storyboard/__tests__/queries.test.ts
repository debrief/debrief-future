import { describe, expect, it } from "vitest";

import { createStoryboard, renameStoryboard } from "../crud";
import {
  getActiveStoryboardDefault,
  getMostRecentlyModifiedStoryboard,
} from "../queries";
import type { Plot } from "../types";

async function buildWithStoryboards(
  specs: Array<{
    name: string;
    created: string;
    renamedTo?: { name: string; at: string };
    idOverride: string;
  }>,
): Promise<Plot> {
  let plot: Plot = { type: "FeatureCollection", features: [] };
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]!;
    const idx = String(i).padStart(2, "0");
    const created = await createStoryboard(plot, {
      name: spec.name,
      actor: "alice",
      now: spec.created,
      idOverride: spec.idOverride,
      activityIdOverride: `00000000-0000-4000-8000-${idx}${"0".repeat(10)}`,
    });
    plot = created.plot;
    if (spec.renamedTo) {
      const renamed = await renameStoryboard(plot, {
        storyboardId: created.storyboard.properties.id,
        newName: spec.renamedTo.name,
        actor: "alice",
        now: spec.renamedTo.at,
        activityIdOverride: `00000000-0000-4000-8000-${idx}${"1".repeat(10)}`,
      });
      plot = renamed.plot;
    }
  }
  return plot;
}

describe("getMostRecentlyModifiedStoryboard", () => {
  it("returns null when the plot contains no Storyboards", () => {
    const plot: Plot = { type: "FeatureCollection", features: [] };
    expect(getMostRecentlyModifiedStoryboard(plot)).toBeNull();
  });

  it("returns the single Storyboard when exactly one exists", async () => {
    const plot = await buildWithStoryboards([
      {
        name: "Only",
        created: "2026-04-20T09:00:00Z",
        idOverride: "01JSTORYBOARD00000000000000",
      },
    ]);
    const result = getMostRecentlyModifiedStoryboard(plot);
    expect(result).not.toBeNull();
    expect(result!.properties.name).toBe("Only");
  });

  it("returns the Storyboard with the most recent provenance[last].timestamp", async () => {
    const plot = await buildWithStoryboards([
      {
        name: "Alpha",
        created: "2026-04-20T09:00:00Z",
        idOverride: "01JSTORYBOARDALPHA00000000",
      },
      {
        name: "Bravo",
        created: "2026-04-20T10:00:00Z",
        idOverride: "01JSTORYBOARDBRAVO00000000",
      },
      {
        name: "Charlie",
        created: "2026-04-20T11:00:00Z",
        idOverride: "01JSTORYBOARDCHARLIE000000",
      },
    ]);
    const result = getMostRecentlyModifiedStoryboard(plot);
    expect(result).not.toBeNull();
    expect(result!.properties.name).toBe("Charlie");
  });

  it("follows rename timestamps — a recently renamed older Storyboard wins", async () => {
    const plot = await buildWithStoryboards([
      {
        name: "OldCreate",
        created: "2026-04-20T09:00:00Z",
        renamedTo: { name: "OldCreateRenamed", at: "2026-04-20T18:00:00Z" },
        idOverride: "01JSTORYBOARDOLDCREATE0000",
      },
      {
        name: "NewCreate",
        created: "2026-04-20T12:00:00Z",
        idOverride: "01JSTORYBOARDNEWCREATE0000",
      },
    ]);
    const result = getMostRecentlyModifiedStoryboard(plot);
    expect(result).not.toBeNull();
    expect(result!.properties.name).toBe("OldCreateRenamed");
  });

  it("breaks ties on identical timestamps by storyboard id ascending", async () => {
    const sharedTs = "2026-04-20T10:00:00Z";
    const plot = await buildWithStoryboards([
      {
        name: "ZZZ",
        created: sharedTs,
        idOverride: "01JSTORYBOARD00000000000AAA",
      },
      {
        name: "AAA",
        created: sharedTs,
        idOverride: "01JSTORYBOARD00000000000BBB",
      },
    ]);
    const result = getMostRecentlyModifiedStoryboard(plot);
    expect(result).not.toBeNull();
    expect(result!.properties.id).toBe("01JSTORYBOARD00000000000AAA");
  });

  it("is distinct from getActiveStoryboardDefault (first by name ascending)", async () => {
    const plot = await buildWithStoryboards([
      {
        name: "ZZZ-older",
        created: "2026-04-20T09:00:00Z",
        idOverride: "01JSTORYBOARDZZZOLDER00000",
      },
      {
        name: "AAA-newer",
        created: "2026-04-20T15:00:00Z",
        idOverride: "01JSTORYBOARDAAANEWER00000",
      },
    ]);
    const byName = getActiveStoryboardDefault(plot);
    const byModified = getMostRecentlyModifiedStoryboard(plot);
    expect(byName!.properties.name).toBe("AAA-newer");
    expect(byModified!.properties.name).toBe("AAA-newer");
    // Note the values happen to match here because AAA-newer was both
    // first-by-name-asc AND most-recently-modified. The next test proves
    // they genuinely diverge.
  });

  it("picks by recency, not by name — most-recently-modified wins over first-by-name", async () => {
    const plot = await buildWithStoryboards([
      {
        name: "AAA-older",
        created: "2026-04-20T09:00:00Z",
        idOverride: "01JSTORYBOARDAAAOLDER00000",
      },
      {
        name: "ZZZ-newer",
        created: "2026-04-20T15:00:00Z",
        idOverride: "01JSTORYBOARDZZZNEWER00000",
      },
    ]);
    const byName = getActiveStoryboardDefault(plot);
    const byModified = getMostRecentlyModifiedStoryboard(plot);
    expect(byName!.properties.name).toBe("AAA-older");
    expect(byModified!.properties.name).toBe("ZZZ-newer");
  });

  it("does not mutate the plot when called", async () => {
    const plot = await buildWithStoryboards([
      {
        name: "A",
        created: "2026-04-20T09:00:00Z",
        idOverride: "01JSTORYBOARDAAAAAAAAAAAAAA",
      },
    ]);
    const snapshot = JSON.parse(JSON.stringify(plot)) as Plot;
    getMostRecentlyModifiedStoryboard(plot);
    expect(plot).toEqual(snapshot);
  });
});
