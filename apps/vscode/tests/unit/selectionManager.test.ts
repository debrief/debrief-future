import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SelectionContextType } from '../../src/types/plot';

// Test the selection logic without browser dependencies
describe('SelectionManager logic', () => {
  let selectedTrackIds: Set<string>;
  let selectedLocationIds: Set<string>;
  let selectionChangedCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    selectedTrackIds = new Set();
    selectedLocationIds = new Set();
    selectionChangedCallback = vi.fn();
  });

  const selectTrack = (trackId: string, shiftKey = false, ctrlKey = false): void => {
    if (shiftKey) {
      selectedTrackIds.add(trackId);
    } else if (ctrlKey) {
      if (selectedTrackIds.has(trackId)) {
        selectedTrackIds.delete(trackId);
      } else {
        selectedTrackIds.add(trackId);
      }
    } else {
      selectedTrackIds.clear();
      selectedLocationIds.clear();
      selectedTrackIds.add(trackId);
    }

    notifySelectionChanged();
  };

  const clearSelection = (): void => {
    selectedTrackIds.clear();
    selectedLocationIds.clear();
    notifySelectionChanged();
  };

  const computeContextType = (): SelectionContextType => {
    const hasTrack = selectedTrackIds.size > 0;
    const hasLocation = selectedLocationIds.size > 0;

    if (!hasTrack && !hasLocation) {
      return 'none';
    }
    if (hasTrack && hasLocation) {
      return 'mixed';
    }
    if (hasLocation) {
      return 'location';
    }
    return selectedTrackIds.size === 1 ? 'single-track' : 'multi-track';
  };

  const notifySelectionChanged = (): void => {
    selectionChangedCallback(
      Array.from(selectedTrackIds),
      Array.from(selectedLocationIds),
      computeContextType()
    );
  };

  describe('single click selection', () => {
    it('selects a single track and clears previous selection', () => {
      selectTrack('track-1');

      expect(selectedTrackIds.has('track-1')).toBe(true);
      expect(selectionChangedCallback).toHaveBeenCalledWith(
        ['track-1'],
        [],
        'single-track'
      );
    });

    it('replaces selection on single click', () => {
      selectTrack('track-1');
      selectTrack('track-2');

      expect(selectedTrackIds.has('track-1')).toBe(false);
      expect(selectedTrackIds.has('track-2')).toBe(true);
      expect(selectedTrackIds.size).toBe(1);
    });
  });

  describe('shift+click multi-select', () => {
    it('adds to selection with shift+click', () => {
      selectTrack('track-1');
      selectTrack('track-2', true); // shift+click

      expect(selectedTrackIds.has('track-1')).toBe(true);
      expect(selectedTrackIds.has('track-2')).toBe(true);
      expect(selectedTrackIds.size).toBe(2);
    });

    it('reports multi-track context', () => {
      selectTrack('track-1');
      selectTrack('track-2', true);

      expect(selectionChangedCallback).toHaveBeenLastCalledWith(
        expect.arrayContaining(['track-1', 'track-2']),
        [],
        'multi-track'
      );
    });
  });

  describe('ctrl/cmd+click toggle', () => {
    it('toggles selection with ctrl+click', () => {
      selectTrack('track-1');
      selectTrack('track-1', false, true); // ctrl+click

      expect(selectedTrackIds.has('track-1')).toBe(false);
      expect(selectedTrackIds.size).toBe(0);
    });

    it('adds to selection when toggling unselected track', () => {
      selectTrack('track-1');
      selectTrack('track-2', false, true);

      expect(selectedTrackIds.has('track-1')).toBe(true);
      expect(selectedTrackIds.has('track-2')).toBe(true);
    });
  });

  describe('clear selection', () => {
    it('clears all selection', () => {
      selectTrack('track-1');
      selectTrack('track-2', true);
      clearSelection();

      expect(selectedTrackIds.size).toBe(0);
      expect(selectedLocationIds.size).toBe(0);
    });

    it('reports none context after clear', () => {
      selectTrack('track-1');
      clearSelection();

      expect(selectionChangedCallback).toHaveBeenLastCalledWith([], [], 'none');
    });
  });

  describe('context type computation', () => {
    it('returns none for empty selection', () => {
      expect(computeContextType()).toBe('none');
    });

    it('returns single-track for one track', () => {
      selectedTrackIds.add('track-1');
      expect(computeContextType()).toBe('single-track');
    });

    it('returns multi-track for multiple tracks', () => {
      selectedTrackIds.add('track-1');
      selectedTrackIds.add('track-2');
      expect(computeContextType()).toBe('multi-track');
    });

    it('returns location for only locations', () => {
      selectedLocationIds.add('loc-1');
      expect(computeContextType()).toBe('location');
    });

    it('returns mixed for tracks and locations', () => {
      selectedTrackIds.add('track-1');
      selectedLocationIds.add('loc-1');
      expect(computeContextType()).toBe('mixed');
    });
  });
});
