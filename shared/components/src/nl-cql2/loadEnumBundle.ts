/**
 * Enum bundle loader (#188 T014).
 *
 * Reads `shared/data/enum-bundle.json` via `DEBRIEF_REPO_ROOT` (exported by
 * the vitest globalSetup, decision 14A) and narrows the result to the
 * `EnumBundle` interface. Throws loudly when required keys are missing —
 * prompts built from a bad bundle would silently produce garbage, so we
 * prefer a hard failure.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EnumBundle } from "./types";

const REQUIRED_KEYS: readonly (keyof EnumBundle)[] = [
  "vessel_class_tree",
  "nationalities",
  "exercise_names",
  "tags",
  "feature_tags",
  "_meta",
];

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/** Throws when the bundle is missing a required key or the wrong shape. */
function assertEnumBundle(value: unknown): asserts value is EnumBundle {
  if (value === null || typeof value !== "object") {
    throw new Error(`enum-bundle.json must be an object, got ${typeof value}`);
  }
  const bundle = value as Record<string, unknown>;
  for (const key of REQUIRED_KEYS) {
    if (!(key in bundle)) {
      throw new Error(`enum-bundle.json missing required key "${key}"`);
    }
  }
  if (!isStringArray(bundle.nationalities)) {
    throw new Error(`enum-bundle.json "nationalities" must be string[]`);
  }
  if (!isStringArray(bundle.exercise_names)) {
    throw new Error(`enum-bundle.json "exercise_names" must be string[]`);
  }
  if (!isStringArray(bundle.tags)) {
    throw new Error(`enum-bundle.json "tags" must be string[]`);
  }
  if (!isStringArray(bundle.feature_tags)) {
    throw new Error(`enum-bundle.json "feature_tags" must be string[]`);
  }
}

/**
 * Resolve the enum-bundle path relative to `DEBRIEF_REPO_ROOT`. Callers in
 * tests get this env var via `vitest.globalSetup.ts`; at runtime (harness,
 * recorder script) the var must be set explicitly.
 */
export function enumBundlePath(): string {
  const root = process.env.DEBRIEF_REPO_ROOT;
  if (!root) {
    throw new Error(
      `DEBRIEF_REPO_ROOT is not set — vitest globalSetup must run before ` +
        `loadEnumBundle(), and non-test callers must export this variable.`,
    );
  }
  return resolve(root, "shared", "data", "enum-bundle.json");
}

export function loadEnumBundle(): EnumBundle {
  const path = enumBundlePath();
  const raw = readFileSync(path, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  assertEnumBundle(parsed);
  return parsed;
}
