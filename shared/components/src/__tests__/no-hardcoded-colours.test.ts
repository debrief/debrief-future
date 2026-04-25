/**
 * T051 — Static gate against hardcoded colour literals in component CSS.
 *
 * Every colour value in `shared/components/src/**\/*.css` SHOULD come from
 * a `var(--debrief-...)` or `var(--vscode-...)` reference, not from a
 * hex / rgb / hsl literal or a named colour. The fallback inside
 * `var(--..., FALLBACK)` is allowed.
 *
 * Strategy:
 *   - The `FILE_SNAPSHOT_ALLOWLIST` records every file that currently
 *     contains literals as a known-acceptable baseline. New files that
 *     pull in a literal will fail this test until they are either fixed
 *     or added to the allowlist with a justification.
 *   - The Quality Rubric for #220 calls for an incremental cleanup pass.
 *     As files are migrated to use `--vscode-*`/`--debrief-*` tokens,
 *     they are *removed* from the allowlist; once empty, the test
 *     becomes a strict gate.
 *
 * Feature: 220-fix-theme-responsiveness
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

const ROOT = resolve(__dirname, '..');

/**
 * Files (relative to `shared/components/src/`) where literal colours are
 * permitted. Each entry has a one-line justification.
 */
const FILE_ALLOWLIST: ReadonlyArray<{ path: string; reason: string }> = [
  {
    path: 'styles/tokens.css',
    reason: 'Canonical token definitions — these are the source of truth.',
  },
];

/**
 * Snapshot of files that currently contain colour literals. New files
 * MUST NOT appear here without a follow-up plan. Existing entries are
 * removed as files migrate to `var(--debrief-...)` / `var(--vscode-...)`
 * references (#209 / #220 incremental audit).
 */
const FILE_SNAPSHOT_ALLOWLIST: ReadonlySet<string> = new Set([
  'ActivityPanel/ActivityPanel.css',
  'CascadingMenu/CascadingMenu.css',
  'ContextMenu/ContextMenu.css',
  'ExerciseListView/ExerciseListView.css',
  'FeatureList/FeatureList.css',
  'FilterBar/FilterBar.css',
  'FilterBar/Lozenge.css',
  'FilterBar/OrContainer.css',
  'FilterBar/PlatformValueEditor.css',
  'GeometryDialog/GeometryDialog.css',
  'LayersToolbar/AssociatedFilesDropdown.css',
  'LayersToolbar/FilterDropdown.css',
  'LayersToolbar/LayersToolbar.css',
  'LayersToolbar/RunDropdown.css',
  'LayersToolbar/YellowHalo.css',
  'LogPanel/EditFace.css',
  'LogPanel/LogPanel.css',
  'LogPanel/ParameterEditor.css',
  'LogPanel/ReplayProgress.css',
  'LogPanel/SkeletonLoader.css',
  'MapView/DrawingGuidanceOverlay/DrawingGuidanceOverlay.css',
  'MapView/LeafletToolbar/LeafletToolbar.css',
  'MapView/MapView.css',
  'MobileTabLayout/MobileTabLayout.css',
  'PanelWorkspace/PanelWorkspace.css',
  'StacBrowser/StacBrowser.css',
  'StacBrowser/ThumbnailPreview.css',
  'StacFileTree/StacFileTree.css',
  'TimeController/TimeController.css',
  'Timeline/Timeline.css',
  'TimelineView/TimelineView.css',
  'ToolMatch/ToolMatchHarness/ToolMatchHarness.css',
  'ToolsPanel/ToolsPanel.css',
  'colour-engine/ColourDimensionSelector.css',
  'colour-engine/ColourLegend.css',
]);

/**
 * Patterns that are NEVER counted as a violation, regardless of the file
 * they appear in.
 */
const ALWAYS_ALLOWED_TOKENS: ReadonlyArray<RegExp> = [
  /\btransparent\b/,
  /\bcurrentColor\b/,
  /\binherit\b/,
  /\bunset\b/,
  /\binitial\b/,
  /\brevert\b/,
  /\bnone\b/,
];

/** Recursively collect every `*.css` file under root. */
function collectCssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
      out.push(...collectCssFiles(full));
    } else if (entry.endsWith('.css')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Strip `var(--..., FALLBACK)` calls so any remaining colour literal is
 * a violation outside the allowlist.
 */
function stripVarCalls(line: string): string {
  let prev = '';
  let cur = line;
  while (cur !== prev) {
    prev = cur;
    cur = cur.replace(/var\(--[a-zA-Z0-9-]+(?:,\s*[^()]*)?\)/g, '');
  }
  return cur;
}

const COLOUR_PATTERNS: RegExp[] = [
  /#[0-9a-fA-F]{3}\b/,
  /#[0-9a-fA-F]{4}\b/,
  /#[0-9a-fA-F]{6}\b/,
  /#[0-9a-fA-F]{8}\b/,
  /\brgba?\s*\(/,
  /\bhsla?\s*\(/,
  /\b(white|black|red|green|blue|yellow|cyan|magenta|orange|purple|pink|gray|grey)\b/i,
];

interface Violation {
  file: string;
  line: number;
  text: string;
}

function fileHasViolations(absPath: string): { rel: string; violations: Violation[] } {
  const rel = relative(ROOT, absPath).replace(/\\/g, '/');
  if (FILE_ALLOWLIST.some((entry) => entry.path === rel)) {
    return { rel, violations: [] };
  }

  const violations: Violation[] = [];
  const text = readFileSync(absPath, 'utf-8');
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const noComment = raw.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!noComment) continue;
    if (raw.trim().startsWith('/*') || raw.trim().startsWith('*')) continue;

    const stripped = stripVarCalls(noComment);
    if (!COLOUR_PATTERNS.some((p) => p.test(stripped))) continue;

    let candidate = stripped;
    for (const pattern of ALWAYS_ALLOWED_TOKENS) {
      candidate = candidate.replace(pattern, '');
    }

    if (COLOUR_PATTERNS.some((p) => p.test(candidate))) {
      violations.push({ file: rel, line: i + 1, text: raw.trim() });
    }
  }
  return { rel, violations };
}

describe('No hardcoded colour literals in component CSS (#220)', () => {
  it('every file is either snapshot-allowed or clean of literals', () => {
    const files = collectCssFiles(ROOT);
    const newViolations: Violation[] = [];
    const cleanedSnapshotEntries: string[] = [];

    for (const f of files) {
      const { rel, violations } = fileHasViolations(f);
      if (violations.length > 0) {
        if (!FILE_SNAPSHOT_ALLOWLIST.has(rel)) {
          newViolations.push(...violations);
        }
      } else if (FILE_SNAPSHOT_ALLOWLIST.has(rel)) {
        // The file is in the snapshot but has no remaining literals —
        // it should be removed from the snapshot.
        cleanedSnapshotEntries.push(rel);
      }
    }

    if (newViolations.length > 0) {
      const message =
        `Found ${newViolations.length} hardcoded colour literal(s) in unallowed files.\n\n` +
        newViolations
          .map((v) => `  ${v.file}:${v.line}\n    ${v.text}`)
          .join('\n\n') +
        `\n\nEither:\n` +
        `  1. Replace the literal with a var(--debrief-...) or var(--vscode-...) reference, or\n` +
        `  2. Add a one-off justification entry to FILE_ALLOWLIST in this test, or\n` +
        `  3. Add the file to FILE_SNAPSHOT_ALLOWLIST (incremental migration list).\n`;
      expect.fail(message);
    }

    if (cleanedSnapshotEntries.length > 0) {
      // Soft signal — surface as a console message but do not fail.
      // Encourages PR authors to remove migrated files from the snapshot.
      console.warn(
        `[no-hardcoded-colours] These files are clean and can be removed ` +
          `from FILE_SNAPSHOT_ALLOWLIST:\n  ${cleanedSnapshotEntries.join('\n  ')}`,
      );
    }

    expect(newViolations).toHaveLength(0);
  });
});
