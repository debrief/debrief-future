import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const MODULE_ROOT = resolve(__dirname, "..");
const BLOCKED_IMPORTS = [
  "react",
  "react-dom",
  "react-leaflet",
  "leaflet",
  "vscode",
] as const;

function listModuleFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "__tests__") continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      out.push(...listModuleFiles(full));
      continue;
    }
    if (name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("no UI framework imports on core path (SC-008)", () => {
  const files = listModuleFiles(MODULE_ROOT);

  it("lists at least one module file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file.slice(MODULE_ROOT.length + 1)} does not import any UI framework`, () => {
      const source = readFileSync(file, "utf8");
      for (const ban of BLOCKED_IMPORTS) {
        const quoted = new RegExp(
          `from\\s+['"]${ban.replace(/[-/]/g, "\\$&")}['"]`,
        );
        const dynamic = new RegExp(
          `import\\(['"]${ban.replace(/[-/]/g, "\\$&")}['"]`,
        );
        expect(quoted.test(source)).toBe(false);
        expect(dynamic.test(source)).toBe(false);
      }
    });
  }
});
