import { describe, it, expect } from 'vitest';
import { TransformerRegistry } from './registry';
import type { DatasetEnvelope } from '../types';
import type { TopLevelSpec } from 'vega-lite';

const stub: DatasetEnvelope = {
  type: 'test_type',
  title: 'Test',
  metadata: {
    xAxis: { label: 'X', type: 'nominal' },
    yAxis: { label: 'Y', type: 'quantitative' },
  },
  data: [{ x: 1 }],
};

const dummySpec: TopLevelSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  mark: 'bar',
  data: { values: [] },
  encoding: {},
};

describe('TransformerRegistry', () => {
  it('registers and retrieves a transform function', () => {
    const reg = new TransformerRegistry();
    reg.register('test_type', () => dummySpec);

    expect(reg.has('test_type')).toBe(true);
    expect(reg.getSupportedTypes()).toContain('test_type');
  });

  it('transforms a known dataset type successfully', () => {
    const reg = new TransformerRegistry();
    reg.register('test_type', () => dummySpec);

    const result = reg.transform(stub);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.spec).toEqual(dummySpec);
    }
  });

  it('returns an error for unknown dataset types', () => {
    const reg = new TransformerRegistry();

    const result = reg.transform(stub);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('unsupported_type');
      expect(result.error.datasetType).toBe('test_type');
    }
  });

  it('lists all supported types', () => {
    const reg = new TransformerRegistry();
    reg.register('a', () => dummySpec);
    reg.register('b', () => dummySpec);

    const types = reg.getSupportedTypes();
    expect(types).toEqual(['a', 'b']);
  });

  it('has() returns false for unregistered types', () => {
    const reg = new TransformerRegistry();
    expect(reg.has('missing')).toBe(false);
  });
});
