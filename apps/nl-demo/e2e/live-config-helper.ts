/**
 * Test helper for swapping `apps/nl-demo/live-config.json` in/out for
 * #190 live-transport Playwright scenarios.
 *
 * The demo is served by `scripts/serve.mjs` out of `apps/nl-demo/`. A
 * live-config.json at that root (gitignored) is what the demo boot code
 * probes at page load. Tests call `withLiveConfig(fixture)` in their test
 * body (inside `beforeEach`) to control that file's presence and contents.
 */

import { copyFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEMO_ROOT = resolve(__dirname, "..");
const LIVE_CONFIG_PATH = resolve(DEMO_ROOT, "live-config.json");

const FIXTURE_PATHS = {
  valid: resolve(__dirname, "fixtures/live-config.valid.json"),
  malformed: resolve(__dirname, "fixtures/live-config.malformed.json"),
  "proxy-down": resolve(__dirname, "fixtures/live-config.proxy-down.json"),
} as const;

export type LiveConfigFixture = "valid" | "malformed" | "proxy-down" | "absent";

/**
 * Install the chosen live-config.json fixture before each test, restore on
 * teardown. Call from a `beforeEach`/`afterEach` pair OR destructure its
 * `install`/`restore` functions if finer control is needed.
 */
export function withLiveConfig(fixture: LiveConfigFixture): {
  install: () => void;
  restore: () => void;
} {
  return {
    install(): void {
      if (fixture === "absent") {
        if (existsSync(LIVE_CONFIG_PATH)) {
          unlinkSync(LIVE_CONFIG_PATH);
        }
        return;
      }
      copyFileSync(FIXTURE_PATHS[fixture], LIVE_CONFIG_PATH);
    },
    restore(): void {
      if (existsSync(LIVE_CONFIG_PATH)) {
        unlinkSync(LIVE_CONFIG_PATH);
      }
    },
  };
}
