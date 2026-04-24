/**
 * Accessibility audit for Feature 209 — LogPanel A11y Audit with Theme
 * Responsiveness.
 *
 * Runs `@axe-core/playwright` against six representative LogPanel Storybook
 * stories in three theme variants (light, dark, vscode) — 18 total runs.
 *
 * Behaviour:
 *   - Accumulates every violation into a typed list.
 *   - After the final story×theme run, writes a markdown report to
 *     `evidence/176-log-panel-ux/a11y-audit.md`.
 *   - Asserts zero critical / serious violations across the whole suite.
 *
 * Environment:
 *   - Runs against the local Storybook dev server (port 6006) driven by the
 *     playwright.config.ts webServer stanza, or against @sparticuz/chromium
 *     when CLAUDE_CODE=1.
 *
 * Feature: 209-logpanel-a11y-audit
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

// --- Configuration -----------------------------------------------------------

const STORY_BASE = '/iframe.html?id=logpanel';

type ThemeVariant = 'light' | 'dark' | 'vscode';
const THEMES: ReadonlyArray<ThemeVariant> = ['light', 'dark', 'vscode'];

interface AuditedStory {
  /** Story export name (used to derive the Storybook ID). */
  id: string;
  /** Human-readable label for the report. */
  label: string;
  /** Optional pre-audit interaction (e.g. click first card, flip a card). */
  interact?: (page: import('@playwright/test').Page) => Promise<void>;
}

const STORIES: ReadonlyArray<AuditedStory> = [
  {
    id: 'timeline-default',
    label: 'TimelineDefault — populated timeline view',
  },
  {
    id: 'empty-no-plot',
    label: 'EmptyNoPlot — no plot loaded state',
  },
  {
    id: 'empty-no-entries',
    label: 'EmptyNoEntries — plot loaded, zero entries',
  },
  {
    id: 'entry-selected',
    label: 'EntrySelected — aria-selected card state',
    interact: async (page) => {
      // Click the first card so aria-selected=true appears in the DOM.
      const firstCard = page.locator('.log-panel__entry').first();
      await firstCard.waitFor({ timeout: 5_000 });
      await firstCard.click();
    },
  },
  {
    id: 'compact-view',
    label: 'CompactView — dense layout',
  },
  {
    id: 'flip-card-default',
    label: 'FlipCardDefault — flip-card hover / edit icon',
    interact: async (page) => {
      // Trigger the flip so the edit face is in the DOM at audit time.
      const editIcon = page
        .locator('.log-panel__entry-edit-icon')
        .first();
      if (await editIcon.count()) {
        await editIcon.click({ force: true });
      }
    },
  },
];

// --- Types -------------------------------------------------------------------

interface ViolationRecord {
  story: string;
  storyLabel: string;
  theme: ThemeVariant;
  ruleId: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  targets: string[];
  summary: string;
}

// --- Helpers -----------------------------------------------------------------

function storyUrl(id: string): string {
  return `${STORY_BASE}--${id}`;
}

function withTheme(url: string, theme: ThemeVariant): string {
  return `${url}&globals=theme:${theme}`;
}

async function waitForStoryReady(page: import('@playwright/test').Page): Promise<void> {
  // Most LogPanel stories render either the panel shell or an empty-state div.
  await page
    .waitForSelector('.log-panel, [data-testid="log-panel-empty"]', {
      timeout: 10_000,
    })
    .catch(() => {
      // Don't fail the audit for render-timing issues — axe will catch an
      // empty DOM anyway.
    });
}

async function runAudit(
  page: import('@playwright/test').Page,
  story: AuditedStory,
  theme: ThemeVariant
): Promise<ViolationRecord[]> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  return result.violations.flatMap<ViolationRecord>((v) => {
    const severity = (v.impact ?? 'minor') as ViolationRecord['severity'];
    const targets = v.nodes.flatMap((n) => (Array.isArray(n.target) ? n.target.map(String) : []));
    const summary = v.nodes
      .map((n) => n.failureSummary?.split('\n')[0])
      .filter(Boolean)
      .slice(0, 3)
      .join(' | ');
    return [
      {
        story: story.id,
        storyLabel: story.label,
        theme,
        ruleId: v.id,
        severity,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        targets,
        summary,
      },
    ];
  });
}

async function writeReport(
  records: ReadonlyArray<ViolationRecord>,
  runs: ReadonlyArray<{ story: AuditedStory; theme: ThemeVariant; violations: number }>
): Promise<string> {
  const REPO_ROOT_RELATIVE = '../../evidence/176-log-panel-ux';
  // `testDir` is shared/components/e2e, so go up two levels to repo root.
  const outDir = path.resolve(__dirname, REPO_ROOT_RELATIVE);
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'a11y-audit.md');

  const criticalCount = records.filter((r) => r.severity === 'critical').length;
  const seriousCount = records.filter((r) => r.severity === 'serious').length;
  const moderateCount = records.filter((r) => r.severity === 'moderate').length;
  const minorCount = records.filter((r) => r.severity === 'minor').length;

  const resultLine = criticalCount === 0 && seriousCount === 0 ? 'PASS' : 'FAIL';
  const now = new Date().toISOString();

  const lines: string[] = [];
  lines.push('# LogPanel A11y Audit Report');
  lines.push('');
  lines.push(`- **Date**: ${now}`);
  lines.push('- **Branch**: `209-logpanel-a11y-audit`');
  lines.push(`- **Result**: **${resultLine}**`);
  lines.push(`- **Stories audited**: ${STORIES.length}`);
  lines.push(`- **Theme variants**: ${THEMES.join(', ')}`);
  lines.push(`- **Total runs**: ${runs.length}`);
  lines.push('');
  lines.push('## Severity Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|----------|-------|');
  lines.push(`| critical | ${criticalCount} |`);
  lines.push(`| serious  | ${seriousCount} |`);
  lines.push(`| moderate | ${moderateCount} |`);
  lines.push(`| minor    | ${minorCount} |`);
  lines.push('');
  lines.push('## Runs');
  lines.push('');
  lines.push('| Story | Theme | Violations |');
  lines.push('|-------|-------|------------|');
  for (const r of runs) {
    lines.push(`| ${r.story.id} | ${r.theme} | ${r.violations} |`);
  }
  lines.push('');
  lines.push('## Violations');
  if (records.length === 0) {
    lines.push('');
    lines.push('_No violations found._');
  } else {
    // Group by story + theme
    const grouped = new Map<string, ViolationRecord[]>();
    for (const rec of records) {
      const key = `${rec.story}__${rec.theme}`;
      const bucket = grouped.get(key) ?? [];
      bucket.push(rec);
      grouped.set(key, bucket);
    }
    for (const [key, bucket] of grouped.entries()) {
      const [storyId, theme] = key.split('__');
      lines.push('');
      lines.push(`### ${storyId} — ${theme}`);
      lines.push('');
      lines.push('| Rule | Severity | Element(s) | Description | Fix hint |');
      lines.push('|------|----------|------------|-------------|----------|');
      for (const rec of bucket) {
        const targets = rec.targets.slice(0, 3).join(' / ');
        const description = rec.description.replace(/\|/g, '\\|');
        const fixHint = rec.help.replace(/\|/g, '\\|');
        lines.push(
          `| [\`${rec.ruleId}\`](${rec.helpUrl}) | ${rec.severity} | \`${targets}\` | ${description} | ${fixHint} |`
        );
      }
    }
  }
  lines.push('');
  lines.push('## Fixes Applied');
  lines.push('');
  lines.push('_Populated in Phase 4 as violations are addressed._');
  lines.push('');
  lines.push('## Final Audit Result');
  lines.push('');
  lines.push(`Result: **${resultLine}** — ${criticalCount} critical, ${seriousCount} serious.`);
  lines.push('');

  await fs.writeFile(outFile, lines.join('\n'), 'utf8');
  return outFile;
}

// --- Test suite --------------------------------------------------------------

test.describe.configure({ mode: 'serial' });

test.describe('LogPanel A11y Audit (#209)', () => {
  const accumulated: ViolationRecord[] = [];
  const runs: { story: AuditedStory; theme: ThemeVariant; violations: number }[] = [];

  for (const story of STORIES) {
    for (const theme of THEMES) {
      test(`${story.id} — theme=${theme}`, async ({ page }) => {
        const url = withTheme(storyUrl(story.id), theme);
        await page.goto(url);
        await waitForStoryReady(page);
        if (story.interact) {
          await story.interact(page);
        }
        const violations = await runAudit(page, story, theme);
        accumulated.push(...violations);
        runs.push({ story, theme, violations: violations.length });
      });
    }
  }

  test.afterAll(async () => {
    const outFile = await writeReport(accumulated, runs);
    // Log the report location so CI artefact collectors can surface it.
    // eslint-disable-next-line no-console
    console.log(`[logpanel-a11y] report written to ${outFile}`);

    const critical = accumulated.filter((r) => r.severity === 'critical');
    const serious = accumulated.filter((r) => r.severity === 'serious');
    if (critical.length > 0 || serious.length > 0) {
      // Formatted error to appear in CI output.
      const lines = [
        `[logpanel-a11y] ${critical.length} critical / ${serious.length} serious violations found — see ${outFile}`,
        ...[...critical, ...serious].slice(0, 10).map((r) =>
          `  - ${r.severity.toUpperCase()} ${r.ruleId} on ${r.story}@${r.theme}: ${r.targets[0] ?? '(no target)'}`
        ),
      ];
      expect(
        critical.length + serious.length,
        `\n${lines.join('\n')}\n`
      ).toBe(0);
    }
  });
});
