/**
 * Vitest global setup for @debrief/components.
 *
 * Walks up from this file to the nearest directory containing
 * `pnpm-workspace.yaml` and exports the absolute path via
 * `process.env.DEBRIEF_REPO_ROOT`. This makes CWD-dependent tests
 * (the NL→CQL2 harness, which reads the real sample catalog from
 * `preview/workspace/samples/local-store/`) immune to vitest
 * invocation-directory variation.
 *
 * Decision 14A: the repo-root resolution lives here (one-time walk) so
 * tests never repeat the find-up work. Decision 9A's harness self-test
 * and decision 15A's prompt-size assertion both rely on this being set.
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

function findRepoRoot(startDir: string): string {
  let current = resolve(startDir);
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(
    `[vitest.globalSetup] could not find pnpm-workspace.yaml by walking up from ${startDir}`,
  );
}

export default function setup(): void {
  if (!process.env.DEBRIEF_REPO_ROOT) {
    // __dirname equivalent in ESM: import.meta.dirname (Node 20.11+);
    // fall back to walking from CWD if unavailable.
    const startDir =
      typeof (import.meta as { dirname?: string }).dirname === "string"
        ? (import.meta as { dirname: string }).dirname
        : process.cwd();
    process.env.DEBRIEF_REPO_ROOT = findRepoRoot(startDir);
  }
}
