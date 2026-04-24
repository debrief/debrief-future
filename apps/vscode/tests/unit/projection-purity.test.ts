/**
 * Projection-purity drift test (Feature 208, T024).
 *
 * SC-005: the host projection derives `kind` only from the schema-level
 * `activity_type` signal — never from tool-name matching or any tool-ID
 * string literal. This test reads `logPanelView.ts` source at runtime and
 * scans the `kindFromActivityType` function body.
 *
 * If a future edit reintroduces a `toolName === 'manual-checkpoint'`-style
 * heuristic inside the kind-resolution path, this test fails immediately.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOG_PANEL_VIEW_PATH = resolve(__dirname, '../../src/views/logPanelView.ts');

function readLogPanelViewSource(): string {
  return readFileSync(LOG_PANEL_VIEW_PATH, 'utf-8');
}

/**
 * Extract the body of `export function kindFromActivityType(...) { ... }` by
 * counting balanced braces from the opening brace following the signature.
 * Returns the body (everything between the outermost braces, exclusive).
 */
function extractKindFromActivityTypeBody(source: string): string {
  const signatureMatch = source.match(
    /export\s+function\s+kindFromActivityType\s*\([^)]*\)\s*:\s*TimelineEntryKind\s*\{/
  );
  if (!signatureMatch) {
    throw new Error(
      'kindFromActivityType signature not found in logPanelView.ts — update this test if the function was renamed.'
    );
  }
  const bodyStart = signatureMatch.index! + signatureMatch[0].length;
  let depth = 1;
  let i = bodyStart;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
    }
    i += 1;
  }
  if (depth !== 0) {
    throw new Error('kindFromActivityType body brace imbalance — parser failure.');
  }
  return source.slice(bodyStart, i - 1);
}

describe('Projection-purity drift test — SC-005', () => {
  // The list of tool IDs present in the interim TOOL_ID_TO_CATEGORY map. Any
  // of these appearing inside `kindFromActivityType` would indicate a
  // regression towards tool-name heuristics.
  const FORBIDDEN_TOOL_LITERALS = [
    'manual-checkpoint',
    'export-png',
    'export-csv',
    'export-geojson',
    'import-rep',
    'import-csv',
    'bearing-between-tracks',
    'calculate-range',
    'time-filter',
    'change-color',
    'change-track-color',
    'set-display-mode',
  ];

  it('kindFromActivityType body contains no tool-ID literals', () => {
    const source = readLogPanelViewSource();
    const body = extractKindFromActivityTypeBody(source);

    for (const lit of FORBIDDEN_TOOL_LITERALS) {
      expect(body).not.toContain(lit);
    }
  });

  it('kindFromActivityType body does not reference toolName or entry.was_generated_by', () => {
    const source = readLogPanelViewSource();
    const body = extractKindFromActivityTypeBody(source);

    expect(body).not.toMatch(/\btoolName\b/);
    expect(body).not.toMatch(/was_generated_by/);
    expect(body).not.toMatch(/resolveToolCategory/);
  });

  it('kindFromActivityType reads only its ActivityType parameter', () => {
    const source = readLogPanelViewSource();
    const body = extractKindFromActivityTypeBody(source);

    // Only references to the parameter name `activityType` and to
    // `ActivityType.*` enum members are expected in the kind-resolution path.
    // A stricter form of the check above.
    expect(body).toMatch(/activityType/);
    expect(body).toMatch(/ActivityType\.(snapshot|tool|tune)/);
  });
});
