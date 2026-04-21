/**
 * Runnable end-to-end example for the storyboard CRUD module (#215).
 *
 *   pnpm dlx tsx specs/215-storyboarding-schema/evidence/usage-example.ts
 *
 * Walks createStoryboard → createScene (×2) → listScenesOrdered →
 * readSceneWithStaleness → updateScene to demonstrate every public API
 * surface and the async / structural-sharing / provenance contracts.
 */

import {
  computeFeatureSetHash,
  createScene,
  createStoryboard,
  listScenesOrdered,
  readSceneWithStaleness,
  updateScene,
  type StoryboardPlot as Plot,
} from "../../../shared/components/src/storyboard";

async function main(): Promise<void> {
  // 1. Start with an empty plot — Storyboards/Scenes are GeoJSON Features
  //    living inside the plot's FeatureCollection.
  let plot: Plot = { type: "FeatureCollection", features: [] };

  // 2. Create a Storyboard. All mutation ops are async because
  //    feature_set_hash uses Web Crypto's subtle.digest.
  const sb = await createStoryboard(plot, {
    name: "Op Harrier — usage example",
    description: "Sample brief for the #215 evidence pack.",
    actor: "alice",
    now: "2026-04-20T09:00:00Z",
    idOverride: "01JUSAGEEXAMPLESTORYBOARDA",
    activityIdOverride: "00000000-0000-4000-8000-000000000001",
  });
  plot = sb.plot;
  console.log(
    `[create] storyboard id=${sb.storyboard.properties.id} name="${sb.storyboard.properties.name}"`,
  );

  // 3. Capture two Scenes. Note ordering is derived from timestamp ascending —
  //    we deliberately insert the later one first to prove the ordering query.
  const laterScene = await createScene(plot, {
    storyboardId: sb.storyboard.properties.id,
    viewport: { center: [-5.0, 50.05], zoom: 9, bearing: 0 },
    timestamp: "2026-04-20T11:00:00Z",
    visibleFeatureIds: ["track-bravo"],
    thumbnailAssetRef: "thumbnails/scene-2.png",
    actor: "alice",
    now: "2026-04-20T11:00:00Z",
    idOverride: "01JUSAGESCENELATERAAAAAAAAA".slice(0, 26),
    activityIdOverride: "00000000-0000-4000-8000-000000000002",
  });
  plot = laterScene.plot;

  const earlierScene = await createScene(plot, {
    storyboardId: sb.storyboard.properties.id,
    viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0 },
    timestamp: "2026-04-20T10:00:00Z",
    visibleFeatureIds: ["track-alpha", "track-bravo"],
    thumbnailAssetRef: "thumbnails/scene-1.png",
    actor: "alice",
    now: "2026-04-20T10:00:00Z",
    idOverride: "01JUSAGESCENEEARLYAAAAAAAAA".slice(0, 26),
    activityIdOverride: "00000000-0000-4000-8000-000000000003",
  });
  plot = earlierScene.plot;

  console.log(
    `[create] scenes added — earlier ts=${earlierScene.scene.properties.timestamp}` +
      ` later ts=${laterScene.scene.properties.timestamp}`,
  );

  // 4. listScenesOrdered returns Scenes sorted ascending by timestamp.
  //    No explicit `order` field exists.
  const ordered = listScenesOrdered(plot, sb.storyboard.properties.id);
  console.log(
    `[list] ordered timestamps:`,
    ordered.map((s) => s.properties.timestamp),
  );

  // 5. readSceneWithStaleness is sync — it returns the stored hash + canonical
  //    list so the consumer can decide when to await a recomputation.
  const stale = readSceneWithStaleness(plot, earlierScene.scene.properties.id);
  if (stale) {
    const recomputed = await computeFeatureSetHash(stale.canonicalVisibleIds);
    const isStale = recomputed !== stale.storedHash;
    console.log(
      `[read] scene ${stale.scene.properties.id} stale=${isStale} canonical=${JSON.stringify(stale.canonicalVisibleIds)}`,
    );
  }

  // 6. updateScene patches in place, recomputes feature_set_hash if
  //    visibleFeatureIds changed, and emits an update-to-current LogEntry.
  const updated = await updateScene(plot, {
    sceneId: earlierScene.scene.properties.id,
    patch: { visibleFeatureIds: ["track-alpha", "track-bravo", "point-charlie"] },
    actor: "bob",
    now: "2026-04-20T11:30:00Z",
    activityIdOverride: "00000000-0000-4000-8000-000000000004",
  });
  plot = updated.plot;

  const last =
    updated.scene.properties.provenance?.[
      (updated.scene.properties.provenance ?? []).length - 1
    ];
  console.log(
    `[update] scene ${updated.scene.properties.id} ` +
      `op=${last?.was_generated_by.parameters[0]?.value} ` +
      `agent=${last?.agent} ` +
      `new hash=${updated.scene.properties.feature_set_hash.slice(0, 16)}…`,
  );

  // 7. Structural sharing — the un-touched later Scene is reference-equal
  //    across the input and output FeatureCollections.
  const laterRefBefore = laterScene.plot.features.find(
    (f) => (f.properties as { id?: string } | null)?.id === laterScene.scene.properties.id,
  );
  const laterRefAfter = plot.features.find(
    (f) => (f.properties as { id?: string } | null)?.id === laterScene.scene.properties.id,
  );
  console.log(
    `[invariant] structural sharing preserved: ${laterRefBefore === laterRefAfter}`,
  );

  console.log(
    `[summary] plot has ${plot.features.length} features ` +
      `(${plot.features.filter((f) => (f.properties as { kind?: string } | null)?.kind === "STORYBOARD").length} Storyboard, ` +
      `${plot.features.filter((f) => (f.properties as { kind?: string } | null)?.kind === "STORYBOARD_SCENE").length} Scenes)`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
