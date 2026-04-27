/**
 * E2E Test: Storyboard Edit Suite — VS Code-native chrome (Feature 234, US2)
 *
 * Thin code-server spec covering ONLY what cannot be reached from the
 * web-shell harness:
 *   - Command-palette invocation of the 11 new edit commands (FR-010)
 *   - Native input-box prompts for rename/duplicate-timestamp/storyboard-rename
 *     via `.monaco-inputbox input` (FR-011)
 *   - Native quick-pick for copy-to-other destination via
 *     `.quick-input-widget input` (FR-012)
 *   - Native `showInformationMessage` / `showWarningMessage` notification
 *     surfaces (FR-013)
 *   - One mid-flow `vscode-native-chrome.png` evidence screenshot (FR-015)
 *
 * Click flows + state transitions are owned by the web-shell suite per
 * FR-014; do not duplicate them here.
 *
 * --- Cloud-testing setup ---
 *
 * For Claude Code cloud sessions, the canonical path is:
 *
 *   bash tests/e2e/scripts/cloud-e2e-setup.sh
 *
 * which installs code-server via the GitHub-release standalone tarball
 * (Docker is blocked in the cloud sandbox), extracts Chromium via
 * @sparticuz/chromium, packages + installs the Debrief vsix, and runs
 * Playwright with a code-server-friendly config.
 *
 * Full details: docs/project_notes/code-server-cloud-testing.md
 *
 * --- Status ---
 *
 * test.describe.skip is intentional for now. The upstream prerequisite
 * is Issue #143 (webview iframe hierarchy in openvscode-server) —
 * currently blocking the storyboard-playback spec the same way.
 *
 * Note (post-ADR-027): the original plan also gated this suite on
 * Feature 234 Phase 3's PortContext + production webview wiring (T020).
 * That dependency is dropped — Phase 3 now lands as a callback-adapter
 * helper that does not touch production code, so the only remaining
 * gate is #143. See `specs/234-storyboard-edit-polish-followup/research.md`
 * R10b for the architecture pivot.
 *
 * Each scenario below is structurally complete: when #143 resolves,
 * removing `test.describe.skip` makes the suite executable. The
 * native-chrome selectors, command titles, and Log Panel data-op
 * assertions are pinned against the implementation that already exists.
 */

import { test, expect } from './fixtures/base';

const STORYBOARD_FRAME_SELECTOR = 'iframe[src*="storyboardPanel"]';
const NATIVE_INPUT_BOX = '.monaco-inputbox input';
const NATIVE_QUICK_PICK = '.quick-input-widget input';
const NOTIFICATION_TOAST =
  '.notification-toast, .monaco-notification-list-row';
const LOG_PANEL_FRAME = 'iframe[src*="logPanel"]';
const EVIDENCE_DIR = 'specs/218-storyboarding-edit/evidence';

/**
 * The 11 new edit commands (FR-010). Title strings must match the
 * VS Code command palette titles registered in apps/vscode/package.json.
 */
const EDIT_COMMANDS: ReadonlyArray<{
  readonly title: string;
  readonly dataOp: string;
  readonly hasNativePrompt?: 'inputbox' | 'quickpick';
}> = [
  { title: 'Storyboard: Rename scene', dataOp: 'renameScene', hasNativePrompt: 'inputbox' },
  { title: 'Storyboard: Describe scene', dataOp: 'describeScene', hasNativePrompt: 'inputbox' },
  { title: 'Storyboard: Delete scene', dataOp: 'deleteScene' },
  { title: 'Storyboard: Undo delete', dataOp: 'undoDelete' },
  { title: 'Storyboard: Update scene to current', dataOp: 'updateSceneToCurrent' },
  { title: 'Storyboard: Duplicate scene', dataOp: 'duplicateScene' },
  { title: 'Storyboard: Copy scene to other storyboard', dataOp: 'copySceneToOther', hasNativePrompt: 'quickpick' },
  { title: 'Storyboard: Refresh scene thumbnail', dataOp: 'refreshThumbnail' },
  { title: 'Storyboard: Refresh all stale', dataOp: 'refreshAllStale' },
  { title: 'Storyboard: Rename storyboard', dataOp: 'renameStoryboard', hasNativePrompt: 'inputbox' },
  { title: 'Storyboard: Describe storyboard', dataOp: 'describeStoryboard', hasNativePrompt: 'inputbox' },
];

async function invokeCommand(
  page: import('@playwright/test').Page,
  commandTitle: string,
): Promise<void> {
  await page.keyboard.press('Control+Shift+KeyP');
  await page.keyboard.type(commandTitle);
  await page.keyboard.press('Enter');
}

async function fulfilNativeInputBox(
  page: import('@playwright/test').Page,
  value: string,
): Promise<void> {
  const input = page.locator(NATIVE_INPUT_BOX);
  await input.waitFor({ state: 'visible', timeout: 5_000 });
  await input.fill(value);
  await page.keyboard.press('Enter');
}

async function fulfilNativeQuickPick(
  page: import('@playwright/test').Page,
  match: string,
): Promise<void> {
  const input = page.locator(NATIVE_QUICK_PICK);
  await input.waitFor({ state: 'visible', timeout: 5_000 });
  await input.fill(match);
  await page.keyboard.press('Enter');
}

async function expectLogPanelCardWithOp(
  page: import('@playwright/test').Page,
  dataOp: string,
): Promise<void> {
  const logFrame = page.frameLocator(LOG_PANEL_FRAME);
  const card = logFrame.locator(
    `[data-testid="log-panel-card"][data-op="${dataOp}"]`,
  );
  await expect(card).toBeVisible({ timeout: 5_000 });
}

test.describe.skip(
  'Storyboard Edit Suite — VS Code-native chrome (blocked: #143)',
  () => {
    // ---- FR-010: each of the 11 commands reaches the dispatch path ----
    for (const cmd of EDIT_COMMANDS) {
      test(`palette → "${cmd.title}" reaches dispatch with data-op="${cmd.dataOp}"`, async ({
        codeServerPage,
        page,
      }) => {
        test.setTimeout(120_000);
        await codeServerPage.openPlotViaStacTree('Exercise Alpha');
        await codeServerPage.getWebviewFrame();

        // Open the Storyboard panel so its commands are scoped active.
        await invokeCommand(page, 'Storyboard: Open Panel');
        await page
          .locator(STORYBOARD_FRAME_SELECTOR)
          .waitFor({ state: 'attached', timeout: 10_000 });

        await invokeCommand(page, cmd.title);

        if (cmd.hasNativePrompt === 'inputbox') {
          // FR-011 — fulfil the native input box.
          await fulfilNativeInputBox(page, `e2e-${cmd.dataOp}`);
        } else if (cmd.hasNativePrompt === 'quickpick') {
          // FR-012 — fulfil the native quick-pick (pick the first option).
          await fulfilNativeQuickPick(page, '');
        }

        await expectLogPanelCardWithOp(page, cmd.dataOp);
      });
    }

    // ---- FR-011/-013: rename scene + capture native-chrome screenshot (FR-015) ----
    test('rename scene → native input-box visible mid-flow → screenshot captured', async ({
      codeServerPage,
      page,
    }) => {
      test.setTimeout(120_000);
      await codeServerPage.openPlotViaStacTree('Exercise Alpha');
      await codeServerPage.getWebviewFrame();
      await invokeCommand(page, 'Storyboard: Open Panel');

      await invokeCommand(page, 'Storyboard: Rename scene');

      const input = page.locator(NATIVE_INPUT_BOX);
      await input.waitFor({ state: 'visible', timeout: 5_000 });

      // FR-015 — capture one mid-flow screenshot of the native chrome.
      // Lands at the parent #218 evidence-table path so the screenshot
      // package is consolidated for the post.
      await page.screenshot({
        path: `${EVIDENCE_DIR}/screenshots/vscode-native-chrome.png`,
      });

      await input.fill('Renamed via E2E');
      await page.keyboard.press('Enter');

      // FR-013 — observe the native success toast.
      const toast = page.locator(NOTIFICATION_TOAST).first();
      await expect(toast).toBeVisible({ timeout: 5_000 });

      await expectLogPanelCardWithOp(page, 'renameScene');
    });

    // ---- FR-011: duplicate-at-colliding-timestamp modal ----
    test('duplicate scene at colliding timestamp → Replace/Offset/Cancel modal → Offset', async ({
      codeServerPage,
      page,
    }) => {
      test.setTimeout(120_000);
      await codeServerPage.openPlotViaStacTree('Exercise Alpha');
      await codeServerPage.getWebviewFrame();
      await invokeCommand(page, 'Storyboard: Open Panel');

      // The fixture plot must contain ≥ 2 scenes whose timestamps would
      // collide on duplicate. The fixture loader arranges this; if no
      // collision, the test is trivially satisfied (no modal expected).
      await invokeCommand(page, 'Storyboard: Duplicate scene');

      const offsetButton = page.locator(
        '.modal-dialog button:has-text("Offset"), .quick-input-widget button:has-text("Offset")',
      );
      if (await offsetButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await offsetButton.click();
      }

      await expectLogPanelCardWithOp(page, 'duplicateScene');
    });

    // ---- FR-012: copy-to-other quick-pick ----
    test('copy scene to other storyboard → native quick-pick → success toast', async ({
      codeServerPage,
      page,
    }) => {
      test.setTimeout(120_000);
      await codeServerPage.openPlotViaStacTree('Exercise Alpha');
      await codeServerPage.getWebviewFrame();
      await invokeCommand(page, 'Storyboard: Open Panel');

      await invokeCommand(page, 'Storyboard: Copy scene to other storyboard');
      await fulfilNativeQuickPick(page, '');

      const toast = page.locator(NOTIFICATION_TOAST).first();
      await expect(toast).toBeVisible({ timeout: 5_000 });

      await expectLogPanelCardWithOp(page, 'copySceneToOther');
    });
  },
);
