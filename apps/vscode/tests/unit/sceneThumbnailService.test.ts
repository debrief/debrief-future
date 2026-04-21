/**
 * Unit tests for `sceneThumbnailService` (Feature 216, T205).
 *
 * Backed by an in-memory fs stub (not `memfs`) so the test stays
 * self-contained and deterministic. Every path from contract §7 is covered.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  writeSceneThumbnail,
  deleteSceneThumbnail,
  type FsLike,
  type SceneThumbnailServiceDeps,
} from '../../src/services/sceneThumbnailService';
import { SceneThumbnailError } from '../../src/services/sceneThumbnailError';

const VALID_ULID = '01HW0XGE7Z4YQZ2QZ6KMN9VPJK';
const OTHER_ULID = '01HW0ZZ99PQRZZZXY7KMN9VPJK';

interface Node {
  kind: 'file' | 'dir';
  data?: Buffer;
}

class FakeFs implements FsLike {
  private nodes = new Map<string, Node>();
  public renameFailsAt: string | null = null;
  public writeFailsAt: string | null = null;

  public seedDir(path: string): void {
    this.nodes.set(path, { kind: 'dir' });
  }

  public seedFile(path: string, data: Buffer | string): void {
    const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    this.nodes.set(path, { kind: 'file', data: buf });
  }

  public existsPath(path: string): boolean {
    return this.nodes.has(path);
  }

  public readSeeded(path: string): Buffer | undefined {
    return this.nodes.get(path)?.data;
  }

  public listFiles(): string[] {
    return [...this.nodes.keys()].sort();
  }

  async mkdir(
    dir: string,
    options?: { recursive?: boolean },
  ): Promise<string | undefined> {
    if (!this.nodes.has(dir)) {
      if (options?.recursive) {
        const parts = dir.split('/');
        let cur = '';
        for (const part of parts) {
          cur = cur === '' ? part || '/' : `${cur === '/' ? '' : cur}/${part}`;
          if (!this.nodes.has(cur)) this.nodes.set(cur, { kind: 'dir' });
        }
      } else {
        this.nodes.set(dir, { kind: 'dir' });
      }
    }
    return undefined;
  }

  async writeFile(path: string, data: Buffer | string): Promise<void> {
    if (this.writeFailsAt !== null && path === this.writeFailsAt) {
      throw new Error(`[fake-fs] induced write failure at ${path}`);
    }
    const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    this.nodes.set(path, { kind: 'file', data: Buffer.from(buf) });
  }

  async readFile(path: string, encoding?: BufferEncoding): Promise<string>;
  async readFile(path: string): Promise<Buffer>;
  async readFile(
    path: string,
    encoding?: BufferEncoding,
  ): Promise<string | Buffer> {
    const node = this.nodes.get(path);
    if (!node || node.kind !== 'file' || !node.data) {
      const err: NodeJS.ErrnoException = new Error(
        `ENOENT: no such file, open '${path}'`,
      );
      err.code = 'ENOENT';
      throw err;
    }
    if (encoding === 'utf8') {
      return node.data.toString('utf8');
    }
    return node.data;
  }

  async rename(from: string, to: string): Promise<void> {
    if (this.renameFailsAt !== null && to === this.renameFailsAt) {
      throw new Error(`[fake-fs] induced rename failure at ${to}`);
    }
    const node = this.nodes.get(from);
    if (!node) {
      const err: NodeJS.ErrnoException = new Error(
        `ENOENT: no such file, rename '${from}'`,
      );
      err.code = 'ENOENT';
      throw err;
    }
    this.nodes.delete(from);
    this.nodes.set(to, node);
  }

  async unlink(path: string): Promise<void> {
    this.nodes.delete(path);
  }

  async stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    const node = this.nodes.get(path);
    if (!node) {
      const err: NodeJS.ErrnoException = new Error(
        `ENOENT: no such file, stat '${path}'`,
      );
      err.code = 'ENOENT';
      throw err;
    }
    return {
      isDirectory: () => node.kind === 'dir',
      isFile: () => node.kind === 'file',
    };
  }

  async open(
    _path: string,
    _mode: string,
  ): Promise<{ sync: () => Promise<void>; close: () => Promise<void> }> {
    return {
      sync: async () => {
        /* noop */
      },
      close: async () => {
        /* noop */
      },
    };
  }
}

function setupFs(): { fs: FakeFs; deps: SceneThumbnailServiceDeps; itemPath: string } {
  const fs = new FakeFs();
  const itemPath = '/store/item';
  fs.seedDir('/store');
  fs.seedDir('/store/item');
  fs.seedFile(
    '/store/item/item.json',
    JSON.stringify(
      {
        type: 'Feature',
        assets: {
          features: {
            href: './features.geojson',
            type: 'application/geo+json',
            roles: ['data'],
          },
          thumbnail: {
            href: './thumbnail.png',
            type: 'image/png',
            roles: ['thumbnail'],
          },
          'thumbnail-sm': {
            href: './thumbnail-sm.png',
            type: 'image/png',
            roles: ['thumbnail'],
          },
        },
      },
      null,
      2,
    ),
  );
  return { fs, deps: { fs }, itemPath };
}

const pngBase64 = Buffer.from('fake-png-bytes').toString('base64');
const pngBase64Small = Buffer.from('fake-png-sm').toString('base64');

describe('writeSceneThumbnail — happy path & file layout', () => {
  let setup: ReturnType<typeof setupFs>;
  beforeEach(() => {
    setup = setupFs();
  });

  it('writes both PNGs and updates item.json atomically', async () => {
    const result = await writeSceneThumbnail(
      setup.itemPath,
      VALID_ULID,
      pngBase64,
      pngBase64Small,
      setup.deps,
    );
    expect(result.assetKey).toBe(`scene-thumbnail-${VALID_ULID}`);
    expect(setup.fs.existsPath(`/store/item/scene-thumbnails/scene-${VALID_ULID}.png`)).toBe(true);
    expect(setup.fs.existsPath(`/store/item/scene-thumbnails/scene-${VALID_ULID}-sm.png`)).toBe(true);

    const itemRaw = await setup.deps.fs.readFile('/store/item/item.json', 'utf8');
    const parsed = JSON.parse(itemRaw) as { assets: Record<string, unknown> };
    expect(parsed.assets[`scene-thumbnail-${VALID_ULID}`]).toEqual({
      href: `./scene-thumbnails/scene-${VALID_ULID}.png`,
      type: 'image/png',
      title: 'Scene thumbnail',
      roles: ['thumbnail'],
    });
    expect(parsed.assets[`scene-thumbnail-${VALID_ULID}-sm`]).toEqual({
      href: `./scene-thumbnails/scene-${VALID_ULID}-sm.png`,
      type: 'image/png',
      title: 'Scene thumbnail (small)',
      roles: ['thumbnail'],
    });
  });

  it('creates scene-thumbnails/ directory when absent', async () => {
    expect(setup.fs.existsPath('/store/item/scene-thumbnails')).toBe(false);
    await writeSceneThumbnail(
      setup.itemPath,
      VALID_ULID,
      pngBase64,
      pngBase64Small,
      setup.deps,
    );
    expect(setup.fs.existsPath('/store/item/scene-thumbnails')).toBe(true);
  });

  it('preserves existing plot-level thumbnail assets', async () => {
    await writeSceneThumbnail(
      setup.itemPath,
      VALID_ULID,
      pngBase64,
      pngBase64Small,
      setup.deps,
    );
    const raw = await setup.deps.fs.readFile('/store/item/item.json', 'utf8');
    const parsed = JSON.parse(raw) as { assets: Record<string, unknown> };
    expect(parsed.assets.thumbnail).toBeDefined();
    expect(parsed.assets['thumbnail-sm']).toBeDefined();
    expect(parsed.assets.features).toBeDefined();
  });

  it('preserves existing scene-thumbnail assets for other scenes', async () => {
    await writeSceneThumbnail(
      setup.itemPath,
      OTHER_ULID,
      pngBase64,
      pngBase64Small,
      setup.deps,
    );
    await writeSceneThumbnail(
      setup.itemPath,
      VALID_ULID,
      pngBase64,
      pngBase64Small,
      setup.deps,
    );
    const raw = await setup.deps.fs.readFile('/store/item/item.json', 'utf8');
    const parsed = JSON.parse(raw) as { assets: Record<string, unknown> };
    expect(parsed.assets[`scene-thumbnail-${OTHER_ULID}`]).toBeDefined();
    expect(parsed.assets[`scene-thumbnail-${VALID_ULID}`]).toBeDefined();
  });

  it('returns assetKey = "scene-thumbnail-{sceneId}"', async () => {
    const result = await writeSceneThumbnail(
      setup.itemPath,
      VALID_ULID,
      pngBase64,
      pngBase64Small,
      setup.deps,
    );
    expect(result.assetKey).toBe(`scene-thumbnail-${VALID_ULID}`);
  });
});

describe('writeSceneThumbnail — input validation', () => {
  let setup: ReturnType<typeof setupFs>;
  beforeEach(() => {
    setup = setupFs();
  });

  it('throws empty-png when largePngBase64 is empty', async () => {
    await expect(() =>
      writeSceneThumbnail(setup.itemPath, VALID_ULID, '', pngBase64Small, setup.deps),
    ).rejects.toMatchObject({ code: 'empty-png' });
  });

  it('throws empty-png when smallPngBase64 is empty', async () => {
    await expect(() =>
      writeSceneThumbnail(setup.itemPath, VALID_ULID, pngBase64, '', setup.deps),
    ).rejects.toMatchObject({ code: 'empty-png' });
  });

  it('throws invalid-scene-id on malformed ULID', async () => {
    await expect(() =>
      writeSceneThumbnail(setup.itemPath, 'not-a-ulid', pngBase64, pngBase64Small, setup.deps),
    ).rejects.toMatchObject({ code: 'invalid-scene-id' });
  });

  it('throws stac-item-not-found on missing directory', async () => {
    const fs = new FakeFs();
    await expect(() =>
      writeSceneThumbnail('/no/such/dir', VALID_ULID, pngBase64, pngBase64Small, { fs }),
    ).rejects.toMatchObject({ code: 'stac-item-not-found' });
  });

  it('throws item-json-malformed on corrupt item.json', async () => {
    const { fs } = setup;
    fs.seedFile('/store/item/item.json', 'this is not json');
    await expect(() =>
      writeSceneThumbnail(setup.itemPath, VALID_ULID, pngBase64, pngBase64Small, setup.deps),
    ).rejects.toMatchObject({ code: 'item-json-malformed' });
  });
});

describe('writeSceneThumbnail — atomicity', () => {
  it('partial PNG write leaves item.json unchanged on second rename failure', async () => {
    const setup = setupFs();
    const before = await setup.deps.fs.readFile('/store/item/item.json', 'utf8');
    setup.fs.renameFailsAt = `/store/item/scene-thumbnails/scene-${VALID_ULID}-sm.png`;
    await expect(() =>
      writeSceneThumbnail(setup.itemPath, VALID_ULID, pngBase64, pngBase64Small, setup.deps),
    ).rejects.toBeInstanceOf(SceneThumbnailError);
    const after = await setup.deps.fs.readFile('/store/item/item.json', 'utf8');
    expect(after).toBe(before);
  });

  it('item.json write failure is surfaced as rename-failed', async () => {
    const setup = setupFs();
    setup.fs.renameFailsAt = '/store/item/item.json';
    await expect(() =>
      writeSceneThumbnail(setup.itemPath, VALID_ULID, pngBase64, pngBase64Small, setup.deps),
    ).rejects.toMatchObject({ code: 'rename-failed' });
  });
});

describe('writeSceneThumbnail — idempotency', () => {
  it('writing same sceneId twice leaves item.json asset map identical', async () => {
    const setup = setupFs();
    await writeSceneThumbnail(
      setup.itemPath,
      VALID_ULID,
      pngBase64,
      pngBase64Small,
      setup.deps,
    );
    const firstRaw = await setup.deps.fs.readFile('/store/item/item.json', 'utf8');
    await writeSceneThumbnail(
      setup.itemPath,
      VALID_ULID,
      pngBase64,
      pngBase64Small,
      setup.deps,
    );
    const secondRaw = await setup.deps.fs.readFile('/store/item/item.json', 'utf8');
    expect(JSON.parse(secondRaw)).toEqual(JSON.parse(firstRaw));
  });
});

describe('deleteSceneThumbnail', () => {
  it('removes both PNGs and asset entries', async () => {
    const setup = setupFs();
    await writeSceneThumbnail(
      setup.itemPath,
      VALID_ULID,
      pngBase64,
      pngBase64Small,
      setup.deps,
    );
    await deleteSceneThumbnail(setup.itemPath, VALID_ULID, setup.deps);

    expect(setup.fs.existsPath(`/store/item/scene-thumbnails/scene-${VALID_ULID}.png`)).toBe(false);
    expect(setup.fs.existsPath(`/store/item/scene-thumbnails/scene-${VALID_ULID}-sm.png`)).toBe(false);

    const raw = await setup.deps.fs.readFile('/store/item/item.json', 'utf8');
    const parsed = JSON.parse(raw) as { assets: Record<string, unknown> };
    expect(parsed.assets[`scene-thumbnail-${VALID_ULID}`]).toBeUndefined();
    expect(parsed.assets[`scene-thumbnail-${VALID_ULID}-sm`]).toBeUndefined();
  });

  it('throws unknown-scene when asset entries are absent', async () => {
    const setup = setupFs();
    await expect(() =>
      deleteSceneThumbnail(setup.itemPath, VALID_ULID, setup.deps),
    ).rejects.toMatchObject({ code: 'unknown-scene' });
  });
});
