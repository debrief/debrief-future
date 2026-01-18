import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../useSelection';

describe('useSelection', () => {
  describe('initialization', () => {
    it('starts with empty selection by default', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.hasSelection).toBe(false);
      expect(result.current.count).toBe(0);
    });

    it('accepts initial selection as array', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1', 'id2'] })
      );

      expect(result.current.selectedIds.size).toBe(2);
      expect(result.current.isSelected('id1')).toBe(true);
      expect(result.current.isSelected('id2')).toBe(true);
    });

    it('accepts initial selection as Set', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: new Set(['id1', 'id2']) })
      );

      expect(result.current.selectedIds.size).toBe(2);
      expect(result.current.isSelected('id1')).toBe(true);
    });
  });

  describe('select', () => {
    it('selects a single item, replacing previous selection', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1'] })
      );

      act(() => {
        result.current.select('id2');
      });

      expect(result.current.selectedIds.size).toBe(1);
      expect(result.current.isSelected('id1')).toBe(false);
      expect(result.current.isSelected('id2')).toBe(true);
    });
  });

  describe('toggle', () => {
    it('adds item if not selected', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggle('id1');
      });

      expect(result.current.isSelected('id1')).toBe(true);
    });

    it('removes item if already selected', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1'] })
      );

      act(() => {
        result.current.toggle('id1');
      });

      expect(result.current.isSelected('id1')).toBe(false);
    });

    it('respects maxSelection limit', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1', 'id2'], maxSelection: 2 })
      );

      act(() => {
        result.current.toggle('id3');
      });

      // Should replace oldest (id1) with id3
      expect(result.current.selectedIds.size).toBe(2);
      expect(result.current.isSelected('id1')).toBe(false);
      expect(result.current.isSelected('id2')).toBe(true);
      expect(result.current.isSelected('id3')).toBe(true);
    });
  });

  describe('add', () => {
    it('adds item to selection', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1'] })
      );

      act(() => {
        result.current.add('id2');
      });

      expect(result.current.selectedIds.size).toBe(2);
      expect(result.current.isSelected('id1')).toBe(true);
      expect(result.current.isSelected('id2')).toBe(true);
    });

    it('does not duplicate if already selected', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1'] })
      );

      act(() => {
        result.current.add('id1');
      });

      expect(result.current.selectedIds.size).toBe(1);
    });

    it('respects maxSelection limit', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1', 'id2'], maxSelection: 2 })
      );

      act(() => {
        result.current.add('id3');
      });

      // Should not add beyond max
      expect(result.current.selectedIds.size).toBe(2);
      expect(result.current.isSelected('id3')).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes item from selection', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1', 'id2'] })
      );

      act(() => {
        result.current.remove('id1');
      });

      expect(result.current.selectedIds.size).toBe(1);
      expect(result.current.isSelected('id1')).toBe(false);
      expect(result.current.isSelected('id2')).toBe(true);
    });

    it('does nothing if item not selected', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1'] })
      );

      act(() => {
        result.current.remove('id2');
      });

      expect(result.current.selectedIds.size).toBe(1);
    });
  });

  describe('selectMultiple', () => {
    it('selects multiple items, replacing selection', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1'] })
      );

      act(() => {
        result.current.selectMultiple(['id2', 'id3', 'id4']);
      });

      expect(result.current.selectedIds.size).toBe(3);
      expect(result.current.isSelected('id1')).toBe(false);
      expect(result.current.isSelected('id2')).toBe(true);
      expect(result.current.isSelected('id3')).toBe(true);
      expect(result.current.isSelected('id4')).toBe(true);
    });

    it('respects maxSelection limit', () => {
      const { result } = renderHook(() =>
        useSelection({ maxSelection: 2 })
      );

      act(() => {
        result.current.selectMultiple(['id1', 'id2', 'id3']);
      });

      expect(result.current.selectedIds.size).toBe(2);
    });
  });

  describe('toggleMultiple', () => {
    it('toggles multiple items', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1', 'id2'] })
      );

      act(() => {
        result.current.toggleMultiple(['id2', 'id3']);
      });

      expect(result.current.isSelected('id1')).toBe(true);
      expect(result.current.isSelected('id2')).toBe(false); // was selected, now toggled off
      expect(result.current.isSelected('id3')).toBe(true); // was not selected, now toggled on
    });
  });

  describe('clear', () => {
    it('clears all selections', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1', 'id2', 'id3'] })
      );

      act(() => {
        result.current.clear();
      });

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe('selectAll', () => {
    it('selects all provided IDs', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.selectAll(['id1', 'id2', 'id3']);
      });

      expect(result.current.selectedIds.size).toBe(3);
    });

    it('respects maxSelection limit', () => {
      const { result } = renderHook(() =>
        useSelection({ maxSelection: 2 })
      );

      act(() => {
        result.current.selectAll(['id1', 'id2', 'id3']);
      });

      expect(result.current.selectedIds.size).toBe(2);
    });
  });

  describe('onChange callback', () => {
    it('calls onChange when selection changes', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useSelection({ onChange })
      );

      act(() => {
        result.current.select('id1');
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(new Set(['id1']));
    });

    it('calls onChange with updated selection', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1'], onChange })
      );

      act(() => {
        result.current.toggle('id2');
      });

      expect(onChange).toHaveBeenCalledWith(new Set(['id1', 'id2']));
    });
  });

  describe('isSelected', () => {
    it('returns true for selected items', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1'] })
      );

      expect(result.current.isSelected('id1')).toBe(true);
    });

    it('returns false for non-selected items', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1'] })
      );

      expect(result.current.isSelected('id2')).toBe(false);
    });
  });

  describe('count and hasSelection', () => {
    it('returns correct count', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1', 'id2', 'id3'] })
      );

      expect(result.current.count).toBe(3);
    });

    it('hasSelection is true when items are selected', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id1'] })
      );

      expect(result.current.hasSelection).toBe(true);
    });

    it('hasSelection is false when no items are selected', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.hasSelection).toBe(false);
    });
  });
});
