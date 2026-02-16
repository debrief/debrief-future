import { describe, it, expect } from 'vitest';
import { DRAWING_GUIDANCE, CANCEL_HINT } from '../drawingGuidance';
import type { DrawingMode } from '../../LeafletToolbar';

describe('drawingGuidance', () => {
  it('provides guidance for point mode', () => {
    expect(DRAWING_GUIDANCE.point.instruction).toBe('Click to place point');
    expect(DRAWING_GUIDANCE.point.cancelHint).toBe(CANCEL_HINT);
  });

  it('provides guidance for rectangle mode', () => {
    expect(DRAWING_GUIDANCE.rectangle.instruction).toBe('Click and drag to draw rectangle');
    expect(DRAWING_GUIDANCE.rectangle.cancelHint).toBe(CANCEL_HINT);
  });

  it('provides guidance for polygon mode', () => {
    expect(DRAWING_GUIDANCE.polygon.instruction).toBe('Click to add vertices, double-click to finish');
    expect(DRAWING_GUIDANCE.polygon.cancelHint).toBe(CANCEL_HINT);
  });

  it('provides guidance for polyline mode', () => {
    expect(DRAWING_GUIDANCE.polyline.instruction).toBe('Click to add vertices, double-click to finish');
    expect(DRAWING_GUIDANCE.polyline.cancelHint).toBe(CANCEL_HINT);
  });

  it('CANCEL_HINT is "Press Esc to cancel"', () => {
    expect(CANCEL_HINT).toBe('Press Esc to cancel');
  });

  it('covers all non-null drawing modes', () => {
    const modes: Array<Exclude<DrawingMode, null>> = ['point', 'rectangle', 'polygon', 'polyline'];
    for (const mode of modes) {
      expect(DRAWING_GUIDANCE[mode]).toBeDefined();
      expect(DRAWING_GUIDANCE[mode].instruction).toBeTruthy();
      expect(DRAWING_GUIDANCE[mode].cancelHint).toBeTruthy();
    }
  });
});
