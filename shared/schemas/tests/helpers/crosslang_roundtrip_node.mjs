#!/usr/bin/env node
/**
 * Cross-language round-trip helper (#215 FR-TEST-023).
 *
 * Reads a single-Feature JSON fixture path from argv, parses it by
 * asserting shape against the generated TypeScript `StoryboardFeature` /
 * `SceneFeature` interfaces (structural check only — TypeScript interfaces
 * don't emit runtime validators), re-serialises it, and prints the
 * round-tripped JSON to stdout.
 *
 * Pytest's `test_crosslang_roundtrip.py` spawns this script, captures the
 * printed JSON, and deep-equals it against the Python (Pydantic) reparse —
 * proving the Article II SC-001 lossless-round-trip contract across Python
 * and TypeScript.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Minimal structural guards — we don't ship a runtime validator for the
// generated TS types, but we can assert that the top-level shape matches
// either `StoryboardFeature` or `SceneFeature` per their `properties.kind`.
function assertIsStoryboardFeature(obj) {
  if (obj?.type !== "Feature") throw new Error("type !== Feature");
  if (typeof obj.id !== "string") throw new Error("id must be string");
  if (obj.geometry?.type !== "Polygon") throw new Error("geometry.type !== Polygon");
  const props = obj.properties;
  if (!props || typeof props !== "object") throw new Error("properties missing");
  if (props.kind !== "STORYBOARD") {
    throw new Error(`kind mismatch: expected STORYBOARD, got ${props.kind}`);
  }
  if (typeof props.id !== "string") throw new Error("properties.id must be string");
  if (typeof props.name !== "string") throw new Error("properties.name must be string");
  if (typeof props.schema_version !== "number") {
    throw new Error("properties.schema_version must be number");
  }
}

function assertIsSceneFeature(obj) {
  if (obj?.type !== "Feature") throw new Error("type !== Feature");
  if (typeof obj.id !== "string") throw new Error("id must be string");
  if (obj.geometry?.type !== "Polygon") throw new Error("geometry.type !== Polygon");
  const props = obj.properties;
  if (!props || typeof props !== "object") throw new Error("properties missing");
  if (props.kind !== "STORYBOARD_SCENE") {
    throw new Error(`kind mismatch: expected STORYBOARD_SCENE, got ${props.kind}`);
  }
  if (typeof props.id !== "string") throw new Error("properties.id must be string");
  if (typeof props.storyboard_id !== "string") {
    throw new Error("properties.storyboard_id must be string");
  }
  if (typeof props.title !== "string") throw new Error("properties.title must be string");
  const vp = props.viewport;
  if (!vp || typeof vp !== "object") throw new Error("properties.viewport missing");
  if (!Array.isArray(vp.center) || vp.center.length !== 2) {
    throw new Error("viewport.center must be [lon, lat]");
  }
  if (typeof vp.zoom !== "number") throw new Error("viewport.zoom must be number");
  if (vp.bearing !== 0) {
    throw new Error(`viewport.bearing must be 0 in v1 (got ${vp.bearing})`);
  }
  if (typeof props.timestamp !== "string") throw new Error("timestamp must be string");
  if (props.time_range !== null && props.time_range !== undefined) {
    throw new Error("time_range must be null in v1");
  }
  if (!Array.isArray(props.visible_feature_ids)) {
    throw new Error("visible_feature_ids must be array");
  }
  if (!/^[0-9a-f]{64}$/.test(props.feature_set_hash)) {
    throw new Error(`feature_set_hash must be 64-char lowercase hex`);
  }
  if (typeof props.thumbnail_asset_ref !== "string") {
    throw new Error("thumbnail_asset_ref must be string");
  }
  if (typeof props.transition_duration_ms !== "number") {
    throw new Error("transition_duration_ms must be number");
  }
}

const fixturePath = process.argv[2];
if (!fixturePath) {
  console.error("usage: crosslang_roundtrip_node.mjs <fixture.json>");
  process.exit(2);
}

const raw = readFileSync(resolve(fixturePath), "utf8");
const parsed = JSON.parse(raw);

if (parsed.properties?.kind === "STORYBOARD") {
  assertIsStoryboardFeature(parsed);
} else if (parsed.properties?.kind === "STORYBOARD_SCENE") {
  assertIsSceneFeature(parsed);
} else {
  console.error(
    `unsupported fixture kind: ${parsed.properties?.kind ?? "<missing>"}`,
  );
  process.exit(3);
}

// Re-serialise — a full Py→JSON→TS→JSON→Py round-trip proves nothing drifts
// through the TypeScript side. JSON.stringify is the canonical form.
process.stdout.write(JSON.stringify(parsed));
