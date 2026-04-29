import { describe, it, expect, vi } from 'vitest';

// Mock modern-screenshot before importing the module under test
vi.mock('modern-screenshot', () => ({
  domToPng: vi.fn().mockResolvedValue('data:image/png;base64,iVBOR'),
  waitUntilLoad: vi.fn().mockResolvedValue(undefined),
}));

import { captureMapAsDataUrl } from '../captureMap';
import { domToPng, waitUntilLoad } from 'modern-screenshot';

describe('captureMapAsDataUrl', () => {
  it('calls domToPng with the container element and default dimensions', async () => {
    const container = document.createElement('div');
    const result = await captureMapAsDataUrl(container);

    expect(domToPng).toHaveBeenCalledWith(container, {
      width: 800,
      height: 600,
      quality: 1,
      scale: 1,
    });
    expect(result).toBe('data:image/png;base64,iVBOR');
  });

  it('passes custom dimensions when provided', async () => {
    const container = document.createElement('div');
    await captureMapAsDataUrl(container, { width: 400, height: 300 });

    expect(domToPng).toHaveBeenCalledWith(container, {
      width: 400,
      height: 300,
      quality: 1,
      scale: 1,
    });
  });

  it('returns a data URL string', async () => {
    const container = document.createElement('div');
    const result = await captureMapAsDataUrl(container);
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('waits for tile images to load before snapshotting', async () => {
    const container = document.createElement('div');
    const callOrder: string[] = [];
    (waitUntilLoad as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      callOrder.push('waitUntilLoad');
    });
    (domToPng as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      callOrder.push('domToPng');
      return 'data:image/png;base64,iVBOR';
    });

    await captureMapAsDataUrl(container);

    expect(waitUntilLoad).toHaveBeenCalledWith(container);
    expect(callOrder).toEqual(['waitUntilLoad', 'domToPng']);
  });
});
