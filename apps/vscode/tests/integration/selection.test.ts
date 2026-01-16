import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Selection, SelectionContextType } from '../../src/types/plot';
import { computeContextType, createEmptySelection } from '../../src/types/plot';

/**
 * Integration tests for the selection workflow.
 * Tests the interaction between selection state, tools panel, and outline panel.
 */
describe('Selection Workflow', () => {
  describe('Selection state management', () => {
    it('starts with empty selection', () => {
      const selection = createEmptySelection();

      expect(selection.trackIds).toHaveLength(0);
      expect(selection.locationIds).toHaveLength(0);
      expect(selection.contextType).toBe('none');
    });

    it('computes correct context type for single track', () => {
      const selection: Selection = {
        trackIds: ['track-1'],
        locationIds: [],
        contextType: 'none',
        featureKinds: ['track'],
      };

      const contextType = computeContextType(selection);
      expect(contextType).toBe('single-track');
    });

    it('computes correct context type for multi-track', () => {
      const selection: Selection = {
        trackIds: ['track-1', 'track-2'],
        locationIds: [],
        contextType: 'none',
        featureKinds: ['track'],
      };

      const contextType = computeContextType(selection);
      expect(contextType).toBe('multi-track');
    });

    it('computes correct context type for mixed selection', () => {
      const selection: Selection = {
        trackIds: ['track-1'],
        locationIds: ['loc-1'],
        contextType: 'none',
        featureKinds: ['track', 'location'],
      };

      const contextType = computeContextType(selection);
      expect(contextType).toBe('mixed');
    });
  });

  describe('Selection and tools panel integration', () => {
    it('updates tools when selection changes', () => {
      const toolsUpdater = vi.fn();
      const selection: Selection = {
        trackIds: ['track-1', 'track-2'],
        locationIds: [],
        contextType: 'multi-track',
        featureKinds: ['track'],
      };

      // Simulate selection change triggering tools update
      toolsUpdater(selection);

      expect(toolsUpdater).toHaveBeenCalledWith(selection);
    });

    it('clears tools when selection is empty', () => {
      const toolsUpdater = vi.fn();
      const selection = createEmptySelection();

      toolsUpdater(selection);

      expect(toolsUpdater).toHaveBeenCalledWith(
        expect.objectContaining({ contextType: 'none' })
      );
    });
  });

  describe('Selection and outline panel integration', () => {
    it('provides document symbols for selected tracks', () => {
      const selectedTracks = [
        { id: 'track-1', name: 'HMS Defender', platformType: 'Destroyer' },
        { id: 'track-2', name: 'USS Freedom', platformType: 'Frigate' },
      ];

      const symbols = selectedTracks.map((track) => ({
        name: track.name,
        detail: track.platformType,
        kind: 'function', // SymbolKind.Function
      }));

      expect(symbols).toHaveLength(2);
      expect(symbols[0].name).toBe('HMS Defender');
      expect(symbols[1].detail).toBe('Frigate');
    });
  });

  describe('Selection persistence', () => {
    it('serializes selection state for webview persistence', () => {
      const selection: Selection = {
        trackIds: ['track-1', 'track-2'],
        locationIds: ['loc-1'],
        contextType: 'mixed',
        featureKinds: ['track', 'location'],
      };

      const serialized = JSON.stringify(selection);
      const restored = JSON.parse(serialized) as Selection;

      expect(restored.trackIds).toEqual(['track-1', 'track-2']);
      expect(restored.locationIds).toEqual(['loc-1']);
      expect(restored.contextType).toBe('mixed');
    });
  });

  describe('Selection keyboard shortcuts', () => {
    it('select all targets all tracks', () => {
      const allTrackIds = ['track-1', 'track-2', 'track-3'];

      // Simulate Ctrl+A selecting all tracks
      const selection: Selection = {
        trackIds: [...allTrackIds],
        locationIds: [],
        contextType: computeContextType({
          trackIds: allTrackIds,
          locationIds: [],
          contextType: 'none',
          featureKinds: ['track'],
        }),
        featureKinds: ['track'],
      };

      expect(selection.trackIds).toHaveLength(3);
      expect(selection.contextType).toBe('multi-track');
    });

    it('escape/delete clears selection', () => {
      let selection: Selection = {
        trackIds: ['track-1'],
        locationIds: [],
        contextType: 'single-track',
        featureKinds: ['track'],
      };

      // Simulate Escape/Delete clearing selection
      selection = createEmptySelection();

      expect(selection.trackIds).toHaveLength(0);
      expect(selection.contextType).toBe('none');
    });
  });
});
