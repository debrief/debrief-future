/**
 * fetchTiles — sequential basemap-tile fetcher used by the briefing-zip
 * export command. Each tile gets up to 3 retries with 100 ms backoff;
 * a tile that exhausts retries is logged but does NOT abort the export
 * (FR-028: missing tiles fall back to the SPA's `errorTileUrl`
 * placeholder, never a network call at playback).
 */

import type { TileCoord } from './computeTileCoverage';

export interface FetchTilesInput {
  tiles: readonly TileCoord[];
  /** Template URL with `{z}` / `{x}` / `{y}` substitutions. */
  tileUrlTemplate: string;
  /**
   * Bytes fetcher. Injected for tests. Production uses VS Code's
   * HTTPS client.
   */
  fetcher: (url: string) => Promise<Uint8Array>;
  /** Optional progress callback. */
  onProgress?: (fetched: number, total: number) => void;
  /** Retries per tile (default 3). */
  retries?: number;
  /** Backoff between retries in ms (default 100). */
  backoffMs?: number;
  /** Gap between successful tile fetches in ms (default 100 — friendly to OSM tile servers). */
  delayBetweenMs?: number;
}

export interface FetchTilesOutput {
  fetched: Map<string, Uint8Array>;
  errors: Array<{ tile: TileCoord; error: Error }>;
}

function fillUrl(template: string, coord: TileCoord): string {
  return template
    .replace('{z}', String(coord.z))
    .replace('{x}', String(coord.x))
    .replace('{y}', String(coord.y));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOne(
  url: string,
  fetcher: FetchTilesInput['fetcher'],
  retries: number,
  backoffMs: number,
): Promise<Uint8Array> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetcher(url);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {await wait(backoffMs * (attempt + 1));}
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function fetchTiles(input: FetchTilesInput): Promise<FetchTilesOutput> {
  const retries = input.retries ?? 3;
  const backoffMs = input.backoffMs ?? 100;
  const delay = input.delayBetweenMs ?? 100;

  const fetched = new Map<string, Uint8Array>();
  const errors: FetchTilesOutput['errors'] = [];

  for (let i = 0; i < input.tiles.length; i++) {
    const coord = input.tiles[i]!;
    const url = fillUrl(input.tileUrlTemplate, coord);
    try {
      const bytes = await fetchOne(url, input.fetcher, retries, backoffMs);
      fetched.set(`${coord.z}/${coord.x}/${coord.y}`, bytes);
    } catch (e) {
      errors.push({ tile: coord, error: e instanceof Error ? e : new Error(String(e)) });
    }
    input.onProgress?.(i + 1, input.tiles.length);
    if (delay > 0 && i < input.tiles.length - 1) {
      await wait(delay);
    }
  }

  return { fetched, errors };
}
