/**
 * Prompt-size measurement (#188 T035, decision 16A).
 *
 * Records the current prompt size and extrapolates to 30 / 50 platform
 * registry sizes by synthesising an oversized enum bundle. Run this test
 * with `--reporter=verbose` to see the table on stdout.
 *
 * Asserted: prompt stays under the SC-004 ceiling (20_480 bytes) at the
 * current registry size AND at 50 platforms.
 */

import { describe, expect, it } from "vitest";
import { buildPrompt } from "../buildPrompt";
import { loadEnumBundle } from "../loadEnumBundle";
import type { EnumBundle } from "../types";

const CEILING = 20_480;

function promptBytes(enums: EnumBundle): number {
  return Buffer.byteLength(buildPrompt("UK submarines", enums), "utf-8");
}

/**
 * Blow up the enum bundle to simulate a registry with `multiplier`× as many
 * nationalities and platform classes. The shape of the bundle is preserved
 * so the prompt builder treats the synthetic bundle identically.
 */
function inflateBundle(base: EnumBundle, multiplier: number): EnumBundle {
  if (multiplier === 1) return base;
  const copies = (arr: readonly string[]): string[] => {
    const out: string[] = [];
    for (let i = 0; i < multiplier; i += 1) {
      for (const v of arr) out.push(`${v}-${i}`);
    }
    return out;
  };
  return {
    ...base,
    nationalities: copies(base.nationalities),
    tags: copies(base.tags),
    feature_tags: copies(base.feature_tags),
  };
}

describe("prompt size", () => {
  const base = loadEnumBundle();

  it("measures current, 30-platform, and 50-platform prompt sizes", () => {
    const rows = [
      { label: "current registry", multiplier: 1 },
      { label: "≈30 platforms (≈3× current)", multiplier: 3 },
      { label: "≈50 platforms (≈5× current)", multiplier: 5 },
    ];

    const measurements = rows.map(({ label, multiplier }) => ({
      label,
      multiplier,
      bytes: promptBytes(inflateBundle(base, multiplier)),
    }));

    // Print the table so it's easy to copy into research.md / evidence.
    console.log("\nPrompt-size measurements:");
    for (const m of measurements) {
      console.log(
        `  ${m.label.padEnd(28)}  ×${m.multiplier}  ${m.bytes} bytes  (${(
          m.bytes / 1024
        ).toFixed(2)} KB)`,
      );
    }

    for (const m of measurements) {
      expect(m.bytes).toBeGreaterThan(0);
    }
    // SC-004: current and ≈50 platforms both fit under 20 KB.
    expect(measurements[0].bytes).toBeLessThan(CEILING);
    expect(measurements[2].bytes).toBeLessThan(CEILING);
  });
});
