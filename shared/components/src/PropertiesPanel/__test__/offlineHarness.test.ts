import { describe, it, expect } from 'vitest';
import { OfflineInvariantError } from './offlineHarness';

describe('offlineHarness', () => {
  it('patches fetch to reject with OfflineInvariantError', async () => {
    await expect(fetch('https://example.com')).rejects.toBeInstanceOf(
      OfflineInvariantError,
    );
  });

  it('patches XMLHttpRequest.open to throw OfflineInvariantError', () => {
    const xhr = new XMLHttpRequest();
    expect(() => xhr.open('GET', 'https://example.com')).toThrow(
      OfflineInvariantError,
    );
  });
});
