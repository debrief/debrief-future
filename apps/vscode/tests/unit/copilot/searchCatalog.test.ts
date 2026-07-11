/**
 * Unit tests for the 4-criteria STAC search filter (#284, T010 / US1).
 */

import { describe, it, expect } from 'vitest';
import { searchCatalog, describeCriteria } from '../../../src/copilot/searchCatalog';
import { makeDeps, itemFixture } from './harness';

function searchDeps(items: ReturnType<typeof itemFixture>[]) {
  return makeDeps({ items }).deps;
}

describe('searchCatalog', () => {
  const alpha = itemFixture({
    id: 'alpha',
    title: 'Exercise Alpha — Day 1',
    itemPath: 'items/alpha/item.json',
    startDatetime: '2026-03-01T00:00:00Z',
    endDatetime: '2026-03-01T12:00:00Z',
    bbox: [-5, 50, 0, 55],
    platforms: [{ id: 'NELSON', name: 'HMS Nelson', vessel_type: 'submarine' }],
  });
  const bravo = itemFixture({
    id: 'bravo',
    title: 'Bravo Transit',
    itemPath: 'items/bravo/item.json',
    startDatetime: '2026-06-01T00:00:00Z',
    endDatetime: '2026-06-01T12:00:00Z',
    bbox: [10, 10, 20, 20],
    platforms: [{ id: 'FREEDOM', name: 'USS Freedom', vessel_type: 'destroyer' }],
  });

  it('matches by free-text substring (case-insensitive)', async () => {
    const matches = await searchCatalog(searchDeps([alpha, bravo]), { text: 'alpha' });
    expect(matches.map((m) => m.title)).toEqual(['Exercise Alpha — Day 1']);
  });

  it('matches by time-interval overlap', async () => {
    const matches = await searchCatalog(searchDeps([alpha, bravo]), {
      startTime: '2026-05-01T00:00:00Z',
      endTime: '2026-07-01T00:00:00Z',
    });
    expect(matches.map((m) => m.title)).toEqual(['Bravo Transit']);
  });

  it('matches by platform membership (name or type)', async () => {
    const byName = await searchCatalog(searchDeps([alpha, bravo]), {
      platforms: ['Nelson'],
    });
    expect(byName.map((m) => m.plotId)).toEqual(['stac://store-1/items/alpha/item.json']);

    const byType = await searchCatalog(searchDeps([alpha, bravo]), {
      platforms: ['destroyer'],
    });
    expect(byType.map((m) => m.title)).toEqual(['Bravo Transit']);
  });

  it('matches by bbox intersection', async () => {
    const matches = await searchCatalog(searchDeps([alpha, bravo]), {
      bbox: [-6, 49, -1, 52],
    });
    expect(matches.map((m) => m.title)).toEqual(['Exercise Alpha — Day 1']);
  });

  it('AND-combines multiple criteria', async () => {
    const none = await searchCatalog(searchDeps([alpha, bravo]), {
      text: 'alpha',
      platforms: ['destroyer'], // contradicts alpha's platform
    });
    expect(none).toEqual([]);

    const one = await searchCatalog(searchDeps([alpha, bravo]), {
      text: 'alpha',
      platforms: ['Nelson'],
    });
    expect(one).toHaveLength(1);
  });

  it('lists all on empty input', async () => {
    const matches = await searchCatalog(searchDeps([alpha, bravo]), {});
    expect(matches).toHaveLength(2);
  });

  it('projects a match to the chat shape (plotId, timeSpan, platforms, bbox)', async () => {
    const [match] = await searchCatalog(searchDeps([alpha]), { text: 'alpha' });
    expect(match).toEqual({
      plotId: 'stac://store-1/items/alpha/item.json',
      title: 'Exercise Alpha — Day 1',
      timeSpan: { start: '2026-03-01T00:00:00Z', end: '2026-03-01T12:00:00Z' },
      platforms: ['HMS Nelson', 'NELSON', 'submarine'],
      bbox: [-5, 50, 0, 55],
    });
  });

  it('describes the applied criteria (for the no-match message)', () => {
    expect(describeCriteria({})).toEqual(['none (list all)']);
    expect(describeCriteria({ text: 'x', platforms: ['a'] })).toEqual([
      'text ~ "x"',
      'platform ∈ {a}',
    ]);
  });
});
