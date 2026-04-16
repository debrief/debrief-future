/**
 * Enum-bundle loader (#188).
 *
 * Reads `${DEBRIEF_REPO_ROOT}/shared/data/enum-bundle.json`, narrows the JSON
 * into `EnumBundle`, and throws loudly at construction time if any required
 * key is missing (spec edge case — "fail loudly, not silently").
 *
 * This file is marked as Node-only (it uses `node:fs`). The browser path for
 * downstream items (#189 demo UI) will not import this — it can import the
 * JSON directly via its bundler.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EnumBundle } from "./types";

const REQUIRED_KEYS = [
  "vessel_class_tree",
  "nationalities",
  "exercise_names",
  "tags",
  "feature_tags",
  "_meta",
] as const;

function assertEnumBundle(raw: unknown): asserts raw is EnumBundle {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(
      `[nl-cql2/loadEnumBundle] enum-bundle.json must be an object, got ${typeof raw}`,
    );
  }
  const obj = raw as Record<string, unknown>;
  for (const key of REQUIRED_KEYS) {
    if (!(key in obj)) {
      throw new Error(
        `[nl-cql2/loadEnumBundle] enum-bundle.json missing required key: ${key}`,
      );
    }
  }
  if (typeof obj.vessel_class_tree !== "object" || obj.vessel_class_tree === null) {
    throw new Error(
      `[nl-cql2/loadEnumBundle] vessel_class_tree must be an object`,
    );
  }
  const arrayKeys = ["nationalities", "exercise_names", "tags", "feature_tags"] as const;
  for (const key of arrayKeys) {
    const v = obj[key];
    if (!Array.isArray(v)) {
      throw new Error(
        `[nl-cql2/loadEnumBundle] ${key} must be an array of strings`,
      );
    }
    for (const entry of v) {
      if (typeof entry !== "string") {
        throw new Error(
          `[nl-cql2/loadEnumBundle] ${key} must contain only strings`,
        );
      }
    }
  }
}

/**
 * Load the enum bundle from disk. Relies on `DEBRIEF_REPO_ROOT` being set by
 * the vitest globalSetup (decision 14A). Callers that don't run under vitest
 * can pass an explicit `repoRoot` override.
 */
export function loadEnumBundle(repoRoot?: string): EnumBundle {
  const root =
    repoRoot ??
    process.env.DEBRIEF_REPO_ROOT ??
    (() => {
      throw new Error(
        `[nl-cql2/loadEnumBundle] DEBRIEF_REPO_ROOT is not set. ` +
          `Either pass repoRoot explicitly or run under vitest ` +
          `(globalSetup populates this env var).`,
      );
    })();

  const path = resolve(root, "shared/data/enum-bundle.json");
  let raw: unknown;
  try {
    const text = readFileSync(path, "utf-8");
    raw = JSON.parse(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[nl-cql2/loadEnumBundle] failed to read ${path}: ${message}`,
    );
  }
  assertEnumBundle(raw);
  return raw;
}
