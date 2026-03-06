import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DrawingGuidanceOverlay } from '../DrawingGuidanceOverlay';
import { DRAWING_GUIDANCE } from '../../drawing/drawingGuidance';
import type { DrawingMode } from '../../LeafletToolbar';

describe('DrawingGuidanceOverlay', () => {
  it('renders nothing when drawingMode is null', () => {
    const { container } = render(<DrawingGuidanceOverlay drawingMode={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders guidance text for point mode', () => {
    render(<DrawingGuidanceOverlay drawingMode="point" />);
    expect(screen.getByText(DRAWING_GUIDANCE.point.instruction)).toBeInTheDocument();
    expect(screen.getByText(DRAWING_GUIDANCE.point.cancelHint)).toBeInTheDocument();
  });

  it('renders guidance text for rectangle mode', () => {
    render(<DrawingGuidanceOverlay drawingMode="rectangle" />);
    expect(screen.getByText(DRAWING_GUIDANCE.rectangle.instruction)).toBeInTheDocument();
  });

  it('renders guidance text for polygon mode', () => {
    render(<DrawingGuidanceOverlay drawingMode="polygon" />);
    expect(screen.getByText(DRAWING_GUIDANCE.polygon.instruction)).toBeInTheDocument();
  });

  it('renders guidance text for polyline mode', () => {
    render(<DrawingGuidanceOverlay drawingMode="polyline" />);
    expect(screen.getByText(DRAWING_GUIDANCE.polyline.instruction)).toBeInTheDocument();
  });

  it('has data-testid="drawing-guidance-overlay"', () => {
    render(<DrawingGuidanceOverlay drawingMode="point" />);
    expect(screen.getByTestId('drawing-guidance-overlay')).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<DrawingGuidanceOverlay drawingMode="point" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite" for screen readers', () => {
    render(<DrawingGuidanceOverlay drawingMode="point" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('updates text when mode changes', () => {
    const { rerender } = render(<DrawingGuidanceOverlay drawingMode="point" />);
    expect(screen.getByText(DRAWING_GUIDANCE.point.instruction)).toBeInTheDocument();

    rerender(<DrawingGuidanceOverlay drawingMode="polygon" />);
    expect(screen.getByText(DRAWING_GUIDANCE.polygon.instruction)).toBeInTheDocument();
  });

  it('disappears when mode changes to null', () => {
    const { rerender, container } = render(<DrawingGuidanceOverlay drawingMode="point" />);
    expect(screen.getByTestId('drawing-guidance-overlay')).toBeInTheDocument();

    rerender(<DrawingGuidanceOverlay drawingMode={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders for all four modes', () => {
    const modes: Array<Exclude<DrawingMode, null>> = ['point', 'rectangle', 'polygon', 'polyline'];
    for (const mode of modes) {
      const { unmount } = render(<DrawingGuidanceOverlay drawingMode={mode} />);
      expect(screen.getByTestId('drawing-guidance-overlay')).toBeInTheDocument();
      expect(screen.getByText(DRAWING_GUIDANCE[mode].instruction)).toBeInTheDocument();
      unmount();
    }
  });
});
