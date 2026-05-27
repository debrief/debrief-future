import { describe, it, expect, vi } from 'vitest';
import { fetchTiles } from '../index';

const tiles = [
  { z: 6, x: 32, y: 21 },
  { z: 6, x: 33, y: 21 },
  { z: 7, x: 64, y: 42 },
];

describe('fetchTiles', () => {
  it('fetches every tile once when the fetcher always succeeds', async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      calls.push(url);
      return new Uint8Array([1]);
    });

    const out = await fetchTiles({
      tiles,
      tileUrlTemplate: 'https://t/{z}/{x}/{y}.png',
      fetcher,
      delayBetweenMs: 0,
    });

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(out.fetched.size).toBe(3);
    expect(out.errors).toHaveLength(0);
    expect(calls[0]).toBe('https://t/6/32/21.png');
  });

  it('retries each tile up to `retries` times before recording an error', async () => {
    let attempts = 0;
    const fetcher = vi.fn(async () => {
      attempts++;
      throw new Error('boom');
    });

    const out = await fetchTiles({
      tiles: [tiles[0]!],
      tileUrlTemplate: 'https://t/{z}/{x}/{y}.png',
      fetcher,
      retries: 2,
      backoffMs: 0,
      delayBetweenMs: 0,
    });

    expect(attempts).toBe(3); // 1 initial + 2 retries
    expect(out.fetched.size).toBe(0);
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0]!.tile).toEqual(tiles[0]);
  });

  it('does not abort the whole batch when one tile fails (FR-028)', async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes('/33/')) throw new Error('per-tile boom');
      return new Uint8Array([1]);
    });

    const out = await fetchTiles({
      tiles,
      tileUrlTemplate: 'https://t/{z}/{x}/{y}.png',
      fetcher,
      retries: 0,
      backoffMs: 0,
      delayBetweenMs: 0,
    });

    expect(out.fetched.size).toBe(2);
    expect(out.errors).toHaveLength(1);
  });

  it('reports progress after each tile', async () => {
    const progress: Array<[number, number]> = [];
    const fetcher = vi.fn(async () => new Uint8Array());

    await fetchTiles({
      tiles,
      tileUrlTemplate: 'https://t/{z}/{x}/{y}.png',
      fetcher,
      onProgress: (a, b) => progress.push([a, b]),
      delayBetweenMs: 0,
    });

    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });
});
