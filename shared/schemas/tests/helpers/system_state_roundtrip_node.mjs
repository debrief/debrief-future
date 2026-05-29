#!/usr/bin/env node
/**
 * Cross-language round-trip helper for feature 261 (SystemState + visibility).
 *
 * Reads a single-Feature JSON fixture from argv, asserts its shape against the
 * fields of the generated TypeScript `SystemStateProperties` interface (for
 * `kind === "SYSTEM"` features) or the inherited `visible?: boolean` slot (for
 * geographic features), then re-serialises and prints the JSON to stdout.
 *
 * Mirrors `crosslang_roundtrip_node.mjs`: the generated TS types carry no
 * runtime validator, so we assert the structural contract here and let the
 * Python side deep-equal the re-serialised payload against the Pydantic
 * reparse — proving the Article II SC-001 lossless round-trip across Python
 * and TypeScript for every SystemState variant.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const STATE_TYPES = ["temporal", "spatial", "selection", "active_storyboard"];

function fail(msg) {
  throw new Error(msg);
}

function assertSystemStateFeature(obj) {
  if (obj?.type !== "Feature") fail("type !== Feature");
  if (typeof obj.id !== "string") fail("id must be string");
  if (!/^state\.[a-z]+$/.test(obj.id)) fail(`id must match ^state\\.[a-z]+$ — got ${obj.id}`);
  if (obj.geometry?.type !== "Point") fail("geometry.type !== Point");
  if (!Array.isArray(obj.geometry.coordinates)) fail("geometry.coordinates must be an array");
  const p = obj.properties;
  if (!p || typeof p !== "object") fail("properties missing");
  if (p.kind !== "SYSTEM") fail(`kind !== SYSTEM — got ${p.kind}`);
  if (!STATE_TYPES.includes(p.state_type)) fail(`unknown state_type: ${p.state_type}`);

  switch (p.state_type) {
    case "temporal":
      if (typeof p.start_time !== "string") fail("temporal.start_time must be string");
      if (typeof p.end_time !== "string") fail("temporal.end_time must be string");
      if (p.step_size !== undefined) {
        if (typeof p.step_size.value !== "number") fail("step_size.value must be number");
        if (typeof p.step_size.unit !== "string") fail("step_size.unit must be string");
      }
      break;
    case "spatial":
      if (!p.viewport || !Array.isArray(p.viewport.coordinates)) {
        fail("spatial.viewport.coordinates must be an array");
      }
      if (p.viewport.coordinates.length !== 4) fail("viewport must have 4 coordinates");
      for (const c of p.viewport.coordinates) {
        if (typeof c.longitude !== "number" || typeof c.latitude !== "number") {
          fail("viewport coordinate must have numeric longitude/latitude");
        }
      }
      break;
    case "selection":
      if (!Array.isArray(p.selected_ids)) fail("selection.selected_ids must be an array");
      for (const id of p.selected_ids) {
        if (typeof id !== "string") fail("selected_ids entries must be strings");
      }
      break;
    case "active_storyboard":
      if (typeof p.active_storyboard_id !== "string") {
        fail("active_storyboard.active_storyboard_id must be string");
      }
      break;
    default:
      fail(`unhandled state_type: ${p.state_type}`);
  }
}

function assertFeatureWithVisibility(obj) {
  if (obj?.type !== "Feature") fail("type !== Feature");
  const p = obj.properties;
  if (!p || typeof p !== "object") fail("properties missing");
  if (p.visible !== undefined && typeof p.visible !== "boolean") {
    fail("properties.visible must be boolean when present");
  }
}

const path = resolve(process.argv[2]);
const raw = JSON.parse(readFileSync(path, "utf-8"));

if (raw?.properties?.kind === "SYSTEM") {
  assertSystemStateFeature(raw);
} else {
  assertFeatureWithVisibility(raw);
}

// Re-serialise — the round-tripped payload the Python side deep-equals.
process.stdout.write(JSON.stringify(raw));
