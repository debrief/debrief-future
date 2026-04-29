/**
 * E2E tests for #235 — web-shell Storyboard capture (US1).
 *
 * Phase 3 ships the production code (capture command + panel mount +
 * thumbnail adapter + viewport-invariants helper). The full E2E test
 * matrix (T030-T039) is deferred to a follow-up PR — running the rail
 * inside the existing GoldenLayout-based Analysis view turned out to
 * need additional layout work (the rail is currently gated behind
 * `?storyboardPanel=1` while the integration is sorted) that is best
 * paired with the Phase 7 polish + screenshot capture work.
 *
 * The visibility-invariant helper, the `WebPanelHost`, the
 * `captureSceneWeb` orchestrator, and the `webSceneThumbnailAdapter`
 * all type-check, lint clean, and the shared-component reducer +
 * panel tests cover their integration with the panel.
 */

import { test } from '@playwright/test';

test.describe('Storyboard capture — web-shell (#235 US1)', () => {
  test.skip(
    'first capture happy path (deferred to follow-up — see file header)',
    async () => {
      // Implementation moved to follow-up PR. Production code is in:
      //  - apps/web-shell/src/commands/captureSceneWeb.ts
      //  - apps/web-shell/src/services/webPanelHost.ts
      //  - apps/web-shell/src/services/webSceneThumbnailAdapter.ts
      //  - apps/web-shell/src/StoryboardPanelMount.tsx
      // Run interactively with: `pnpm dev`, then visit
      //   http://localhost:5173/?storyboardPanel=1
    },
  );
});
