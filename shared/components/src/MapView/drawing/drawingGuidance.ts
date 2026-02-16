import type { DrawingMode } from '../LeafletToolbar';

/**
 * Guidance text shown during each drawing mode.
 * Strings are extracted here for i18n readiness (Constitution Article XI.1).
 * Feature: 096-drawing-ux-persistence
 */
export interface GuidanceText {
  /** Mode-specific instruction text */
  instruction: string;
  /** Universal cancellation hint */
  cancelHint: string;
}

/** Universal cancellation hint shown for all drawing modes */
export const CANCEL_HINT = 'Press Esc to cancel';

/** Guidance text per drawing mode (FR-001, FR-002) */
export const DRAWING_GUIDANCE: Record<Exclude<DrawingMode, null>, GuidanceText> = {
  point: {
    instruction: 'Click to place point',
    cancelHint: CANCEL_HINT,
  },
  rectangle: {
    instruction: 'Click and drag to draw rectangle',
    cancelHint: CANCEL_HINT,
  },
  polygon: {
    instruction: 'Click to add vertices, double-click to finish',
    cancelHint: CANCEL_HINT,
  },
  polyline: {
    instruction: 'Click to add vertices, double-click to finish',
    cancelHint: CANCEL_HINT,
  },
};
