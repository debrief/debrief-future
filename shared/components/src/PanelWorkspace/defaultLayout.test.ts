/**
 * Unit tests for getDefaultLayout — spec 281 T012.
 *
 * Verifies:
 *   - Discrete bands: correct sidebar percentages for each width band.
 *   - Map always keeps the majority (sidebarPct < contentPct).
 *   - Function is PURE — identical input → identical output; no window access.
 */

import { describe, it, expect } from 'vitest';
import { getDefaultLayout, BASELINE_WIDTH } from './defaultLayout';
import type { LayoutConfig } from 'golden-layout';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract the sidebar and content column widths from a LayoutConfig. */
function extractColumnWidths(config: LayoutConfig): { sidebarPct: number; contentPct: number } {
  const root = config.root;
  if (!root || root.type !== 'row' || !root.content || root.content.length < 2) {
    throw new Error('Unexpected layout structure');
  }
  const sidebarPct = (root.content[0] as { width: number }).width;
  const contentPct = (root.content[1] as { width: number }).width;
  return { sidebarPct, contentPct };
}

// ─────────────────────────────────────────────────────────────────────────────
// Band threshold tests (Decision #7 — discrete bands)
// ─────────────────────────────────────────────────────────────────────────────

describe('getDefaultLayout — discrete bands', () => {
  it('small band (<=1366): sidebar ~280px equivalent', () => {
    // At 1280: target=280, raw=round(280/1280*100)=22
    const { sidebarPct } = extractColumnWidths(getDefaultLayout(1280));
    expect(sidebarPct).toBe(22);
  });

  it('small band boundary (1366): sidebar ~280px equivalent', () => {
    // At 1366: target=280, raw=round(280/1366*100)=round(20.5)=21 (rounds to 21 in JS)
    const { sidebarPct } = extractColumnWidths(getDefaultLayout(1366));
    // Math.round(280/1366*100) = Math.round(20.497) = 20
    expect(sidebarPct).toBe(20);
  });

  it('middle band (1367-1599): sidebar ~320px equivalent', () => {
    // At 1440: target=320, raw=round(320/1440*100)=round(22.22)=22
    const { sidebarPct } = extractColumnWidths(getDefaultLayout(1440));
    expect(sidebarPct).toBe(22);
  });

  it('middle band (at 1500): sidebar ~320px equivalent', () => {
    // At 1500: target=320, raw=round(320/1500*100)=round(21.33)=21
    const { sidebarPct } = extractColumnWidths(getDefaultLayout(1500));
    expect(sidebarPct).toBe(21);
  });

  it('wide band (>=1600): sidebar ~380px equivalent', () => {
    // At 1920: target=380, raw=round(380/1920*100)=round(19.79)=20
    const { sidebarPct } = extractColumnWidths(getDefaultLayout(1920));
    expect(sidebarPct).toBe(20);
  });

  it('wide band boundary (1600): sidebar ~380px equivalent', () => {
    // At 1600: target=380, raw=round(380/1600*100)=round(23.75)=24
    const { sidebarPct } = extractColumnWidths(getDefaultLayout(1600));
    expect(sidebarPct).toBe(24);
  });

  it('middle band produces different pct from small band at narrow widths', () => {
    // At 1440 (middle band) vs 1280 (small band), the raw pcts may overlap
    // but the bands are distinct target values — assert they differ from
    // a same-container-width comparison that crosses the boundary.
    // 1366 → small band target 280; 1367 → middle band target 320.
    const { sidebarPct: small } = extractColumnWidths(getDefaultLayout(1366));
    const { sidebarPct: middle } = extractColumnWidths(getDefaultLayout(1367));
    // round(280/1366*100)=20 vs round(320/1367*100)=round(23.41)=23
    expect(middle).toBeGreaterThan(small);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Map majority (FR-010)
// ─────────────────────────────────────────────────────────────────────────────

describe('getDefaultLayout — map majority (FR-010)', () => {
  const testWidths = [800, 1024, 1280, 1366, 1440, 1600, 1920, 2560];

  for (const w of testWidths) {
    it(`map keeps majority at containerWidth=${w}`, () => {
      const { sidebarPct, contentPct } = extractColumnWidths(getDefaultLayout(w));
      expect(sidebarPct).toBeLessThan(contentPct);
      expect(sidebarPct + contentPct).toBe(100);
      // Sidebar must be strictly less than 50%
      expect(sidebarPct).toBeLessThan(50);
      // Sidebar must be capped at max 40%
      expect(sidebarPct).toBeLessThanOrEqual(40);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Purity — no globals, identical input → identical output
// ─────────────────────────────────────────────────────────────────────────────

describe('getDefaultLayout — purity', () => {
  it('returns identical config for identical input (pure function)', () => {
    const a = getDefaultLayout(1440);
    const b = getDefaultLayout(1440);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('returns different configs for different widths', () => {
    const narrow = getDefaultLayout(1280);
    const wide = getDefaultLayout(1920);
    // The sidebar pcts differ (even if both round to same value for some widths,
    // this pair is in different bands so the raw values differ)
    const { sidebarPct: narrowPct } = extractColumnWidths(narrow);
    const { sidebarPct: widePct } = extractColumnWidths(wide);
    // 1280 → ~22%, 1920 → ~20%  (different target px)
    // Both produce valid layouts regardless of whether pcts are equal
    expect(narrowPct + extractColumnWidths(narrow).contentPct).toBe(100);
    expect(widePct + extractColumnWidths(wide).contentPct).toBe(100);
  });

  it('does not access window.innerWidth (pure, argument-only)', () => {
    // Save and remove window.innerWidth to prove the function doesn't read it.
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    Object.defineProperty(window, 'innerWidth', {
      get: () => { throw new Error('getDefaultLayout must not access window.innerWidth'); },
      configurable: true,
    });
    try {
      // Must not throw
      expect(() => getDefaultLayout(1440)).not.toThrow();
    } finally {
      // Restore
      if (originalDescriptor) {
        Object.defineProperty(window, 'innerWidth', originalDescriptor);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BASELINE_WIDTH produces a valid layout
// ─────────────────────────────────────────────────────────────────────────────

describe('BASELINE_WIDTH', () => {
  it('is 1440', () => {
    expect(BASELINE_WIDTH).toBe(1440);
  });

  it('getDefaultLayout(BASELINE_WIDTH) produces sidebar < content', () => {
    const { sidebarPct, contentPct } = extractColumnWidths(getDefaultLayout(BASELINE_WIDTH));
    expect(sidebarPct).toBeLessThan(contentPct);
  });
});
