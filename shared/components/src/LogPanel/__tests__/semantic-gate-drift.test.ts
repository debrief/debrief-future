/**
 * Semantic-gate drift test (Feature 208, T023).
 *
 * SC-001: no residual `ToolCategory === 'snapshot'` semantic gate in LogPanel
 * rendering code. This test reads `LogEntry.tsx` source at runtime and asserts
 * that the specific pre-feature-208 patterns are absent.
 *
 * If a future edit reintroduces a visual-category check to decide entry
 * semantics, this test fails immediately — the conflation that feature 176
 * Decision 2A accepted (and feature 208 removed) is locked out.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOG_ENTRY_TSX_PATH = resolve(__dirname, '../LogEntry.tsx');

function readLogEntrySource(): string {
  return readFileSync(LOG_ENTRY_TSX_PATH, 'utf-8');
}

describe('Semantic-gate drift test — SC-001', () => {
  it("does not contain the legacy `resolveToolCategory(...).category === 'snapshot'` gate", () => {
    const source = readLogEntrySource();

    // Normalise whitespace so a minor reformat (line break after the dot, etc.)
    // doesn't bypass the assertion but also doesn't create brittle false
    // positives against comments. We still want to catch the pattern whether
    // it's one line or multi-line.
    const normalised = source.replace(/\s+/g, ' ');

    expect(normalised).not.toMatch(
      /resolveToolCategory\s*\(\s*entry\.toolName\s*\)\s*\.category\s*===\s*'snapshot'/
    );
  });

  it("does not compare any `ToolCategory` expression to 'snapshot' as a semantic gate", () => {
    const source = readLogEntrySource();
    const normalised = source.replace(/\s+/g, ' ');

    // Any expression of shape `*.category === 'snapshot'` is the anti-pattern
    // feature 208 removed. The only legitimate uses of `'snapshot'` as a
    // string literal in LogPanel rendering code belong to rendering-layer
    // display metadata (icons, colour chips) — not semantic gates.
    expect(normalised).not.toMatch(/\.category\s*===\s*'snapshot'/);
  });

  it("uses the kind discriminator as the snapshot gate", () => {
    const source = readLogEntrySource();
    expect(source).toMatch(/entry\.kind\s*===\s*'snapshot'/);
  });
});
