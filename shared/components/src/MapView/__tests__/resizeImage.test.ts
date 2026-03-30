import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downscaleDataUrl } from '../resizeImage';

describe('downscaleDataUrl', () => {
  let mockContext: {
    drawImage: ReturnType<typeof vi.fn>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let OriginalImage: any;

  beforeEach(() => {
    mockContext = {
      drawImage: vi.fn(),
    };

    // Mock canvas getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockContext as unknown as CanvasRenderingContext2D,
    );

    // Mock canvas toDataURL
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,smallImage',
    );

    // Mock Image to fire onload synchronously when src is set
    OriginalImage = globalThis.Image;
    globalThis.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';
      get src() { return this._src; }
      set src(value: string) {
        this._src = value;
        // Fire onload asynchronously (like a real image)
        setTimeout(() => this.onload?.(), 0);
      }
    } as unknown as typeof Image;
  });

  afterEach(() => {
    globalThis.Image = OriginalImage;
    vi.restoreAllMocks();
  });

  it('returns a downscaled data URL', async () => {
    const result = await downscaleDataUrl('data:image/png;base64,largeImage');
    expect(result).toBe('data:image/png;base64,smallImage');
  });

  it('uses default dimensions (200x150) when none provided', async () => {
    await downscaleDataUrl('data:image/png;base64,largeImage');

    expect(mockContext.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0, 0, 200, 150,
    );
  });

  it('uses custom dimensions when provided', async () => {
    await downscaleDataUrl('data:image/png;base64,largeImage', { width: 100, height: 75 });

    expect(mockContext.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0, 0, 100, 75,
    );
  });

  it('rejects when getContext returns null', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    await expect(downscaleDataUrl('data:image/png;base64,test')).rejects.toThrow(
      'Failed to get 2D canvas context',
    );
  });
});
