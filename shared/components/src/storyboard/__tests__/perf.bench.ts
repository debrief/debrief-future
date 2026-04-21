import { bench, describe } from "vitest";

import {
  copySceneToOtherStoryboard,
  createScene,
  createStoryboard,
  updateScene,
} from "../crud";
import type { Plot } from "../types";

const FIXED_NOW = "2026-04-20T09:00:00Z";

function makeTrackFeature(idx: number): Plot["features"][number] {
  return {
    type: "Feature",
    id: `track-${idx}`,
    geometry: {
      type: "Point",
      coordinates: [-5 + (idx % 1000) * 0.001, 50 + Math.floor(idx / 1000) * 0.001],
    },
    properties: {
      kind: "TRACK",
      id: `track-${idx}`,
      name: `Track ${idx}`,
    },
  };
}

async function buildPlotWithPositions(
  positions: number,
): Promise<{ plot: Plot; storyboardId: string }> {
  const features: Plot["features"] = [];
  for (let i = 0; i < positions; i++) {
    features.push(makeTrackFeature(i));
  }
  const seed: Plot = { type: "FeatureCollection", features };
  const { plot, storyboard } = await createStoryboard(seed, {
    name: "BenchSB",
    actor: "alice",
    now: FIXED_NOW,
    idOverride: "01JBENCHSTORYBOARDXXXXXXXX",
    activityIdOverride: "00000000-0000-4000-8000-000000000001",
  });
  return { plot, storyboardId: storyboard.properties.id };
}

const sizes = [100, 1_000, 10_000, 100_000];

// Per-size benches. Each describe block gets its own pre-built plot + storyboard
// (built before bench iterations start) so the bench measurement isolates the
// CRUD op only.

for (const n of sizes) {
  describe(`@ ${n} positions`, () => {
    let pre: { plot: Plot; storyboardId: string };
    let preWithScene: { plot: Plot; sceneId: string; storyboardId: string };
    let preWithDest: {
      plot: Plot;
      sceneId: string;
      storyboardId: string;
      destStoryboardId: string;
    };
    let counter = 0;

    bench(
      `createScene @ ${n}`,
      async () => {
        counter += 1;
        await createScene(pre.plot, {
          storyboardId: pre.storyboardId,
          viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
          timestamp: `2026-04-20T${String(10 + (counter % 12)).padStart(2, "0")}:${String(counter % 60).padStart(2, "0")}:${String((counter * 7) % 60).padStart(2, "0")}Z`,
          visibleFeatureIds: ["track-0", "track-1", "track-2"],
          thumbnailAssetRef: "x",
          actor: "alice",
          now: FIXED_NOW,
          idOverride: `01JBENCHSC${String(counter).padStart(16, "0")}`.slice(0, 26),
          activityIdOverride: "00000000-0000-4000-8000-000000000002",
        });
      },
      {
        iterations: 5,
        async setup() {
          pre = await buildPlotWithPositions(n);
        },
      },
    );

    bench(
      `updateScene @ ${n}`,
      async () => {
        counter += 1;
        await updateScene(preWithScene.plot, {
          sceneId: preWithScene.sceneId,
          patch: {
            visibleFeatureIds: [
              "track-0",
              "track-1",
              `track-${counter % 1000}`,
            ],
          },
          actor: "alice",
          now: FIXED_NOW,
          activityIdOverride: "00000000-0000-4000-8000-000000000004",
        });
      },
      {
        iterations: 5,
        async setup() {
          const base = await buildPlotWithPositions(n);
          const { plot, scene } = await createScene(base.plot, {
            storyboardId: base.storyboardId,
            viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
            timestamp: "2026-04-20T10:00:00Z",
            visibleFeatureIds: ["track-0"],
            thumbnailAssetRef: "x",
            actor: "alice",
            now: FIXED_NOW,
            idOverride: "01JBENCHSCENEUPDATEXXXXXXX",
            activityIdOverride: "00000000-0000-4000-8000-000000000003",
          });
          preWithScene = {
            plot,
            sceneId: scene.properties.id,
            storyboardId: base.storyboardId,
          };
        },
      },
    );

    bench(
      `copySceneToOtherStoryboard @ ${n}`,
      async () => {
        counter += 1;
        await copySceneToOtherStoryboard(preWithDest.plot, {
          sceneId: preWithDest.sceneId,
          destinationStoryboardId: preWithDest.destStoryboardId,
          newTimestamp: `2026-04-20T${String(11 + (counter % 12)).padStart(2, "0")}:${String(counter % 60).padStart(2, "0")}:${String((counter * 11) % 60).padStart(2, "0")}Z`,
          deepCopyThumbnail: async (src) => `dst/${src.split("/").pop()}`,
          actor: "alice",
          now: FIXED_NOW,
          idOverride: `01JBENCHCP${String(counter).padStart(16, "0")}`.slice(0, 26),
          activityIdOverride: "00000000-0000-4000-8000-000000000007",
        });
      },
      {
        iterations: 5,
        async setup() {
          const base = await buildPlotWithPositions(n);
          const { plot: p1, storyboard: dstSb } = await createStoryboard(
            base.plot,
            {
              name: "BenchSBDst",
              actor: "alice",
              now: FIXED_NOW,
              idOverride: "01JBENCHSTORYBOARDDSTXXXXX",
              activityIdOverride: "00000000-0000-4000-8000-000000000005",
            },
          );
          const { plot: p2, scene } = await createScene(p1, {
            storyboardId: base.storyboardId,
            viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
            timestamp: "2026-04-20T10:00:00Z",
            visibleFeatureIds: ["track-0"],
            thumbnailAssetRef: "src/a.png",
            actor: "alice",
            now: FIXED_NOW,
            idOverride: "01JBENCHSCENESRCAAAAAAAAAA",
            activityIdOverride: "00000000-0000-4000-8000-000000000006",
          });
          preWithDest = {
            plot: p2,
            sceneId: scene.properties.id,
            storyboardId: base.storyboardId,
            destStoryboardId: dstSb.properties.id,
          };
        },
      },
    );
  });
}
