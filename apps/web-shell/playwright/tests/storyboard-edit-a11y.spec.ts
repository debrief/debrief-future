/**
 * Accessibility audit for the Storyboard edit suite (Feature 234, US3 —
 * FR-020, FR-021, FR-022, FR-023).
 *
 * Drives `@axe-core/playwright` against the four representative panel
 * states — each state corresponds to one of the upgraded Storybook
 * stories from Phase 3 + the harness's overflow-menu interaction:
 *
 *   1. WithEditForm        — chevron expanded, inline edit form visible
 *   2. WithUndoToast       — overflow → Delete → Undo toast surface
 *   3. WithStaleBadge      — sceneB carries the stale badge
 *   4. WithMissingDataRemediation — sceneC has missing-features data
 *   5. OverflowMenuOpen    — right-click overflow menu open (harness state)
 *
 * Why audit via the web-shell harness rather than Storybook iframes:
 * the harness is already running for the smoke suite and its URL knobs
 * (`?stale=`, `?missingData=`) seed the same DOM the stories produce.
 * This avoids needing a parallel Storybook server in the cloud session.
 * The four upgraded interactive stories (Phase 3 T023..T026) consume the
 * same `useStoryOnlyMockHandlers` helper, so they exercise the same
 * accessibility surface.
 *
 * Severity policy (research R4):
 *   - serious + critical → fail (FR-022).
 *   - moderate → warn + recorded as accepted-risk in the report (FR-022, FR-023).
 *   - minor → ignored.
 *
 * Outputs (FR-023):
 *   - specs/234-storyboard-edit-polish-followup/evidence/a11y-report.md
 *   - specs/234-storyboard-edit-polish-followup/evidence/a11y-results.json
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { StoryboardEditPage } from '../pages/StoryboardEditPage';
import {
  categoriseAxeViolations,
  type AxeViolationLike,
} from '../helpers/a11yCategoriser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localRequire = createRequire(import.meta.url);

// --- Configuration ---------------------------------------------------------

interface Surface {
  /** Surface ID — table key in the markdown report. */
  readonly id: string;
  /** Human-readable label. */
  readonly label: string;
  /** Drives the harness into this state, then awaits any visible cues. */
  readonly setup: (harness: StoryboardEditPage, page: Page) => Promise<void>;
}

const SURFACES: ReadonlyArray<Surface> = [
  {
    id: 'with-edit-form',
    label: 'WithEditForm — inline edit form expanded on sceneA',
    setup: async (harness): Promise<void> => {
      await harness.open();
      await harness.chevronFor('sceneA').click();
      await harness.page.waitForSelector(
        '[data-testid="scene-edit-form"]',
        { state: 'visible', timeout: 5_000 },
      );
    },
  },
  {
    id: 'with-undo-toast',
    label: 'WithUndoToast — overflow → Delete → Undo toast visible',
    setup: async (harness): Promise<void> => {
      await harness.open();
      await harness.overflowTriggerFor('sceneB').click();
      await harness.overflowMenuItem('delete').click();
      await harness.undoToast().waitFor({ state: 'visible', timeout: 5_000 });
    },
  },
  {
    id: 'with-stale-badge',
    label: 'WithStaleBadge — sceneB stale badge visible',
    setup: async (harness): Promise<void> => {
      await harness.open({ stale: ['sceneB'] });
      await harness
        .staleBadgeFor('sceneB')
        .waitFor({ state: 'visible', timeout: 5_000 });
    },
  },
  {
    id: 'with-missing-data',
    label: 'WithMissingDataRemediation — sceneC missing-features state',
    setup: async (harness): Promise<void> => {
      await harness.open({
        missingData: { 'sceneC': ['track-alpha', 'track-bravo'] },
      });
      // Open the edit form for the missing-data row so the remediation
      // affordance is in the DOM at audit time.
      await harness.chevronFor('sceneC').click();
      await harness.page.waitForSelector(
        '[data-testid="scene-edit-form"]',
        { state: 'visible', timeout: 5_000 },
      );
    },
  },
  {
    id: 'overflow-menu-open',
    label: 'OverflowMenuOpen — right-click overflow menu floating on sceneA',
    setup: async (harness): Promise<void> => {
      await harness.open();
      await harness.overflowTriggerFor('sceneA').click();
      await harness
        .overflowMenu()
        .waitFor({ state: 'visible', timeout: 5_000 });
    },
  },
];

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../../../specs/234-storyboard-edit-polish-followup/evidence',
);
const REPORT_PATH = path.join(EVIDENCE_DIR, 'a11y-report.md');
const RESULTS_PATH = path.join(EVIDENCE_DIR, 'a11y-results.json');

// --- Result aggregator -----------------------------------------------------

interface SurfaceAuditResult {
  readonly surface: string;
  readonly label: string;
  readonly axeVersion: string;
  readonly counts: { fail: number; warn: number; ignore: number };
  readonly violations: ReadonlyArray<AxeViolationLike>;
}

interface ResultsFile {
  capturedAt: string;
  axeVersion: string;
  gitSha: string;
  surfaces: SurfaceAuditResult[];
}

const aggregated: ResultsFile = {
  capturedAt: new Date().toISOString(),
  axeVersion: '4.8.5',
  gitSha: getGitSha(),
  surfaces: [],
};

function getGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function readAxeVersion(): Promise<string> {
  // Read once from @axe-core/playwright's own package.json so the report's
  // version reflects what's installed, not a hard-coded constant.
  try {
    const pkgPath = localRequire.resolve('@axe-core/playwright/package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? aggregated.axeVersion;
  } catch {
    return aggregated.axeVersion;
  }
}

// --- Test suite ------------------------------------------------------------

test.describe.configure({ mode: 'serial' });

test.describe('Storyboard edit suite — a11y audit (#234 US3)', () => {
  test.beforeAll(async () => {
    aggregated.axeVersion = await readAxeVersion();
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
  });

  for (const surface of SURFACES) {
    test(`axe — ${surface.id}`, async ({ page }) => {
      const harness = new StoryboardEditPage(page);
      await surface.setup(harness, page);

      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const violations = result.violations as ReadonlyArray<AxeViolationLike>;
      const cat = categoriseAxeViolations(violations);

      aggregated.surfaces.push({
        surface: surface.id,
        label: surface.label,
        axeVersion: aggregated.axeVersion,
        counts: {
          fail: cat.fail.length,
          warn: cat.warn.length,
          ignore: cat.ignore.length,
        },
        violations: [...cat.fail, ...cat.warn],
      });

      // FR-022: serious + critical → fail loudly.
      const failureLines = cat.fail.map(
        (v) =>
          `  - ${(v.impact ?? 'unknown').toUpperCase()} ${v.id ?? '<unknown>'}: ${v.help ?? ''}`,
      );
      expect(
        cat.fail.length,
        cat.fail.length > 0
          ? `[storyboard-edit-a11y] ${cat.fail.length} serious/critical violation(s) on ${surface.id}:\n${failureLines.join('\n')}`
          : '',
      ).toBe(0);
    });
  }

  test.afterAll(async () => {
    // FR-023: write raw axe results JSON for re-analysis.
    await fs.writeFile(
      RESULTS_PATH,
      JSON.stringify(aggregated, null, 2) + '\n',
      'utf8',
    );

    // FR-023: write the human-readable markdown report.
    const totalFail = aggregated.surfaces.reduce(
      (acc, s) => acc + s.counts.fail,
      0,
    );
    const totalWarn = aggregated.surfaces.reduce(
      (acc, s) => acc + s.counts.warn,
      0,
    );
    const status = totalFail === 0 ? 'PASS' : 'FAIL';
    const lines: string[] = [
      `# A11y Audit — Storyboard Edit Suite (#234 US3)`,
      ``,
      `**Captured at:** ${aggregated.capturedAt}`,
      `**axe-core version:** ${aggregated.axeVersion}`,
      `**Git SHA:** ${aggregated.gitSha}`,
      `**Result:** ${status} — ${totalFail} serious/critical, ${totalWarn} moderate.`,
      ``,
      `Audits each panel state via the web-shell harness (research R4: avoids parallel Storybook server). The four upgraded interactive stories (Phase 3 T023..T026) consume the same \`useStoryOnlyMockHandlers\` helper so they cover the same accessibility surface.`,
      ``,
      `## Summary`,
      ``,
      `| Surface | Severity counts (serious+critical / moderate / minor) | Status |`,
      `|---------|------------------------------------------------------|--------|`,
    ];
    for (const s of aggregated.surfaces) {
      const surfaceStatus =
        s.counts.fail > 0
          ? '❌ Fail'
          : s.counts.warn > 0
            ? '⚠ Moderate'
            : '✅ Pass';
      lines.push(
        `| \`${s.surface}\` — ${s.label} | ${s.counts.fail} / ${s.counts.warn} / ${s.counts.ignore} | ${surfaceStatus} |`,
      );
    }
    lines.push(``);
    if (totalWarn > 0) {
      lines.push(`## Accepted Risks (moderate violations, FR-022)`);
      lines.push(``);
      lines.push(`| Surface | Rule | Description | Help URL |`);
      lines.push(`|---------|------|-------------|----------|`);
      for (const s of aggregated.surfaces) {
        for (const v of s.violations) {
          if (v.impact === 'moderate') {
            lines.push(
              `| \`${s.surface}\` | [\`${v.id ?? ''}\`](${v.helpUrl ?? ''}) | ${v.description ?? ''} | ${v.helpUrl ?? ''} |`,
            );
          }
        }
      }
      lines.push(``);
    } else {
      lines.push(`## Accepted Risks`);
      lines.push(``);
      lines.push(`None — no moderate violations recorded.`);
      lines.push(``);
    }
    if (totalFail > 0) {
      lines.push(`## Failures (serious + critical, FR-022)`);
      lines.push(``);
      lines.push(`| Surface | Rule | Description | Help URL |`);
      lines.push(`|---------|------|-------------|----------|`);
      for (const s of aggregated.surfaces) {
        for (const v of s.violations) {
          if (v.impact === 'serious' || v.impact === 'critical') {
            lines.push(
              `| \`${s.surface}\` | [\`${v.id ?? ''}\`](${v.helpUrl ?? ''}) | ${v.description ?? ''} | ${v.helpUrl ?? ''} |`,
            );
          }
        }
      }
      lines.push(``);
    }
    await fs.writeFile(REPORT_PATH, lines.join('\n'), 'utf8');
    // eslint-disable-next-line no-console
    console.log(`[storyboard-edit-a11y] report → ${REPORT_PATH}`);
    // eslint-disable-next-line no-console
    console.log(`[storyboard-edit-a11y] raw    → ${RESULTS_PATH}`);
  });
});
