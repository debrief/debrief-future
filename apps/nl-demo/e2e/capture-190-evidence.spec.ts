/**
 * One-off evidence-capture spec for #190 Live LLM Transport. NOT part of the
 * CI gate — run explicitly via:
 *
 *   CLAUDE_CODE=1 node run-playwright.mjs capture-190-evidence.spec
 *
 * Captures:
 *   - evidence/screenshots/indicator-live.png
 *   - evidence/screenshots/indicator-fixture.png
 *   - evidence/screenshots/banner-<reason>.png for each LiveTransportErrorReason
 *
 * All screenshots are taken against the stub proxy (no credentials needed).
 */

import { test } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { withLiveConfig } from "./live-config-helper";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = resolve(
  HERE,
  "..",
  "..",
  "..",
  "specs",
  "190-live-llm-transport",
  "evidence",
  "screenshots",
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

test.describe("capture #190 evidence screenshots", () => {
  test("indicator-live + indicator-fixture", async ({ page }) => {
    const live = withLiveConfig("valid");
    live.install();
    try {
      await page.goto("/");
      await page.getByTestId("transport-mode-indicator").waitFor({ timeout: 10_000 });
      await page.screenshot({ path: resolve(EVIDENCE_DIR, "indicator-live.png"), fullPage: false });
    } finally {
      live.restore();
    }

    const absent = withLiveConfig("absent");
    absent.install();
    try {
      await page.goto("/");
      await page.waitForTimeout(500);
      await page.screenshot({
        path: resolve(EVIDENCE_DIR, "indicator-fixture.png"),
        fullPage: false,
      });
    } finally {
      absent.restore();
    }
  });

  const bannerScenarios: Array<{ phrase: string; reason: string }> = [
    { phrase: "auth-failure phrase", reason: "auth-failure" },
    { phrase: "rate-limit phrase", reason: "rate-limit" },
    { phrase: "provider-error phrase", reason: "provider-error" },
    { phrase: "malformed phrase", reason: "malformed-response" },
  ];

  for (const s of bannerScenarios) {
    test(`banner-${s.reason}`, async ({ page }) => {
      const fixture = withLiveConfig("valid");
      fixture.install();
      try {
        await page.goto("/");
        await page.getByTestId("transport-mode-indicator").waitFor({ timeout: 10_000 });
        await page.getByTestId("query-input").fill(s.phrase);
        await page.getByTestId("query-submit").click();
        await page.getByTestId("live-transport-banner").waitFor({ timeout: 10_000 });
        await page.screenshot({
          path: resolve(EVIDENCE_DIR, `banner-${s.reason}.png`),
          fullPage: false,
        });
      } finally {
        fixture.restore();
      }
    });
  }
});
