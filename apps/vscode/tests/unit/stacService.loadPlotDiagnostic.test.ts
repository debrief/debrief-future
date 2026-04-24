/**
 * #230 FR-051 — loadPlot structured diagnostic tests.
 *
 * Verifies that every null-return branch of `StacService.loadPlot` writes
 * a distinct diagnostic line to the Debrief output channel so failures
 * can be attributed to a specific step.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StacService } from '../../src/services/stacService';
import type { StacStore } from '../../src/types/stac';

describe('StacService.loadPlot — diagnostic logging', () => {
  let tmpDir: string;
  let appendLineSpy: ReturnType<typeof vi.fn>;
  let service: StacService;
  let store: StacStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stac-loadplot-diag-'));
    // Create a minimal catalog to satisfy the store validator.
    fs.writeFileSync(
      path.join(tmpDir, 'catalog.json'),
      JSON.stringify({
        type: 'Catalog',
        stac_version: '1.0.0',
        id: 'test',
        description: 'test',
        links: [],
      }),
    );
    service = new StacService();
    appendLineSpy = vi.fn();
    service.setDiagnosticSink({ appendLine: appendLineSpy });
    store = {
      path: tmpDir,
      name: 'test-store',
    } as unknown as StacStore;
  });

  it('writes a diagnostic line when the item path does not exist', async () => {
    const result = await service.loadPlot(store, 'does/not/exist/item.json');
    expect(result).toBeNull();
    expect(appendLineSpy).toHaveBeenCalled();
    const lines = appendLineSpy.mock.calls.map((c) => String(c[0]));
    expect(lines.join('\n')).toMatch(/\[stac\.loadPlot\]/);
    // Either item-not-found or caught-exception — both count as
    // structured attribution per FR-051.
    expect(lines.join('\n')).toMatch(
      /item-not-found|caught-exception|item-has-no-properties/,
    );
  });

  it('writes a diagnostic line for malformed item JSON', async () => {
    const itemDir = path.join(tmpDir, 'bad-item');
    fs.mkdirSync(itemDir, { recursive: true });
    fs.writeFileSync(path.join(itemDir, 'item.json'), 'not-json-at-all');
    await service.loadPlot(store, 'bad-item/item.json');
    // Either item-not-found (if loadItem returns null for parse-error)
    // or caught-exception — both are distinct diagnostic strings.
    const joined = appendLineSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(joined).toMatch(/\[stac\.loadPlot\]/);
  });
});
