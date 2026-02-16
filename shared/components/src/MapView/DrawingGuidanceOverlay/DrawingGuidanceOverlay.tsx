/**
 * DrawingGuidanceOverlay — context-sensitive instruction text during drawing.
 * Displays mode-specific guidance at bottom-centre of the map container.
 * Feature: 096-drawing-ux-persistence (FR-001 through FR-005)
 */
import type { DrawingMode } from '../LeafletToolbar';
import { DRAWING_GUIDANCE } from '../drawing/drawingGuidance';
import './DrawingGuidanceOverlay.css';

export interface DrawingGuidanceOverlayProps {
  /** Current drawing mode — null means overlay is hidden */
  drawingMode: DrawingMode;
}

/**
 * Renders guidance text when drawingMode is non-null.
 * Returns null when no drawing mode is active (FR-004).
 */
export function DrawingGuidanceOverlay({ drawingMode }: DrawingGuidanceOverlayProps) {
  if (!drawingMode) return null;

  const guidance = DRAWING_GUIDANCE[drawingMode];

  return (
    <div
      className="debrief-drawing-guidance"
      data-testid="drawing-guidance-overlay"
      role="status"
      aria-live="polite"
    >
      <span>{guidance.instruction}</span>
      <span className="debrief-drawing-guidance__separator">&middot;</span>
      <span className="debrief-drawing-guidance__cancel">{guidance.cancelHint}</span>
    </div>
  );
}
