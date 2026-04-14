/**
 * Vitest globalSetup — resolves the monorepo root via find-up on
 * `pnpm-workspace.yaml` and exports it as the `DEBRIEF_REPO_ROOT` env var.
 *
 * Consumers (nl-cql2 harness, enum-bundle loader) read this variable to
 * locate `shared/data/enum-bundle.json` and
 * `preview/workspace/samples/local-store/catalog.json` without hard-coding
 * relative paths from the test file's location.
 *
 * Decision 14A.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function findRepoRoot(start: string): string {
  let current = start;
  while (true) {
    if (existsSync(resolve(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(
        `Could not find pnpm-workspace.yaml walking up from ${start}. ` +
          `vitest globalSetup cannot determine DEBRIEF_REPO_ROOT.`,
      );
    }
    current = parent;
  }
}

export default function setup(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = findRepoRoot(here);
  process.env.DEBRIEF_REPO_ROOT = root;
}
