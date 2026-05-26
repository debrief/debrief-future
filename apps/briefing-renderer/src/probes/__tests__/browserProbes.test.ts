import { describe, it, expect } from 'vitest';
import { probeUserAgent, probeInlineJsonReadable } from '../browserProbes';

describe('probeUserAgent', () => {
  it('accepts modern Chrome desktop UAs', () => {
    expect(
      probeUserAgent(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      ),
    ).toBe(true);
  });

  it('accepts modern Edge desktop UAs', () => {
    expect(
      probeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0',
      ),
    ).toBe(true);
  });

  it('rejects Firefox UAs', () => {
    expect(
      probeUserAgent(
        'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
      ),
    ).toBe(false);
  });

  it('rejects Safari UAs', () => {
    expect(
      probeUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      ),
    ).toBe(false);
  });

  it('returns false for empty UA', () => {
    expect(probeUserAgent('')).toBe(false);
  });
});

describe('probeInlineJsonReadable', () => {
  it('returns true in a jsdom environment', () => {
    expect(probeInlineJsonReadable()).toBe(true);
  });
});
