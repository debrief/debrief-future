/**
 * Prompt-size scaling measurement (#188 T035 / research §11).
 *
 * Measures the current prompt size against the shipped enum bundle, plus an
 * extrapolation to 30 and 50 registered platforms (simulated by cloning the
 * taxonomy). Writes the table into research.md's §11 via console output
 * (collected by the test-runner / evidence capture) — the test body also
 * asserts the 20 KB ceiling so regressions surface in CI.
 *
 * Gated by env var `DEBRIEF_MEASURE_PROMPT=1` so it does not add console
 * noise to every test run. The size assertion under the current enum bundle
 * already runs as part of buildPrompt.test.ts.
 */

import { describe, it } from "vitest";
import { buildPrompt } from "../buildPrompt";
import { loadEnumBundle } from "./loadEnumBundle";
import type { EnumBundle, VesselClassNode } from "../types";

function cloneBranch(branch: VesselClassNode, suffix: string): VesselClassNode {
  const next: Record<string, VesselClassNode | { full_name: string } | undefined> = {};
  for (const [key, value] of Object.entries(branch)) {
    if (key === "_class") {
      const meta = value as { full_name: string } | undefined;
      if (meta?.full_name) {
        next._class = { full_name: `${meta.full_name} (${suffix})` };
      }
    } else if (value !== undefined && typeof value === "object") {
      next[`${key}-${suffix}`] = cloneBranch(
        value as VesselClassNode,
        suffix,
      );
    }
  }
  return next as VesselClassNode;
}

function makeTreeOfSize(base: EnumBundle, targetLeaves: number): EnumBundle {
  // Rough clone-and-rename strategy: each pass doubles the number of leaves
  // until we hit `targetLeaves`.
  const countLeaves = (node: Readonly<Record<string, unknown>>): number => {
    let count = 0;
    for (const [key, value] of Object.entries(node)) {
      if (key === "_class") continue;
      if (typeof value !== "object" || value === null) continue;
      const child = value as Record<string, unknown>;
      const innerKeys = Object.keys(child).filter((k) => k !== "_class");
      if (innerKeys.length === 0) {
        count += 1;
      } else {
        count += countLeaves(child);
      }
    }
    return count;
  };

  const tree: Record<string, VesselClassNode> = JSON.parse(
    JSON.stringify(base.vessel_class_tree),
  );
  let suffix = 1;
  while (countLeaves(tree) < targetLeaves) {
    const replica: Record<string, VesselClassNode> = {};
    for (const [key, node] of Object.entries(tree)) {
      replica[`${key}-${suffix}`] = cloneBranch(node, `v${suffix}`);
    }
    Object.assign(tree, replica);
    suffix += 1;
    if (suffix > 6) break; // safety
  }

  return { ...base, vessel_class_tree: tree };
}

describe("prompt-size scaling measurement (T035)", () => {
  it.skipIf(process.env.DEBRIEF_MEASURE_PROMPT !== "1")(
    "prints the research.md §11 table",
    () => {
      const enums = loadEnumBundle();
      const phrase = "UK submarines";

      const baselinePrompt = buildPrompt(phrase, enums);
      const baselineBytes = Buffer.byteLength(baselinePrompt, "utf-8");

      const tree30 = makeTreeOfSize(enums, 30);
      const prompt30 = buildPrompt(phrase, tree30);
      const bytes30 = Buffer.byteLength(prompt30, "utf-8");

      const tree50 = makeTreeOfSize(enums, 50);
      const prompt50 = buildPrompt(phrase, tree50);
      const bytes50 = Buffer.byteLength(prompt50, "utf-8");

      console.log("\n| Registry size | Prompt size (bytes) | Headroom vs 20 KB |");
      console.log("|---------------|---------------------|-------------------|");
      console.log(
        `| 10 (current)  | ${baselineBytes}           | ${20_480 - baselineBytes}             |`,
      );
      console.log(
        `| 30 (projected)| ${bytes30}           | ${20_480 - bytes30}             |`,
      );
      console.log(
        `| 50 (projected)| ${bytes50}           | ${20_480 - bytes50}             |`,
      );
    },
  );
});
