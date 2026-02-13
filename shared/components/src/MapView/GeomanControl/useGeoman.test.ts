import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock react-leaflet before importing the hook
const mockAddControls = vi.fn();
const mockRemoveControls = vi.fn();
const mockMap = {
  pm: {
    addControls: mockAddControls,
    removeControls: mockRemoveControls,
  },
};

vi.mock('react-leaflet', () => ({
  useMap: () => mockMap,
}));

import { useGeoman } from './useGeoman';

describe('useGeoman', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the map instance', () => {
    const { result } = renderHook(() => useGeoman());
    expect(result.current.map).toBe(mockMap);
  });

  it('does not add controls by default', () => {
    renderHook(() => useGeoman());
    expect(mockAddControls).not.toHaveBeenCalled();
  });

  it('does not add controls when addControls is false', () => {
    renderHook(() => useGeoman({ addControls: false }));
    expect(mockAddControls).not.toHaveBeenCalled();
  });

  it('adds controls when addControls is true', () => {
    renderHook(() => useGeoman({ addControls: true }));
    expect(mockAddControls).toHaveBeenCalledOnce();
    expect(mockAddControls).toHaveBeenCalledWith({});
  });

  it('passes controlOptions to addControls', () => {
    const controlOptions = { position: 'topright' as const, drawCircle: false };
    renderHook(() => useGeoman({ addControls: true, controlOptions }));
    expect(mockAddControls).toHaveBeenCalledWith(controlOptions);
  });

  it('removes controls on unmount when controls were added', () => {
    const { unmount } = renderHook(() => useGeoman({ addControls: true }));
    expect(mockRemoveControls).not.toHaveBeenCalled();
    unmount();
    expect(mockRemoveControls).toHaveBeenCalledOnce();
  });

  it('does not remove controls on unmount when controls were not added', () => {
    const { unmount } = renderHook(() => useGeoman());
    unmount();
    expect(mockRemoveControls).not.toHaveBeenCalled();
  });
});
