import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GeometryDialog } from './GeometryDialog';

describe('GeometryDialog', () => {
  const defaultProps = {
    featureName: 'HMS Example',
    geometryType: 'LineString',
    coordinates: [[-5.0, 50.0], [-4.0, 51.0]] as number[][],
    anchorPosition: { x: 100, y: 100 },
    onDismiss: vi.fn(),
  };

  describe('rendering', () => {
    it('renders with dialog role', () => {
      render(<GeometryDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('renders with accessible label', () => {
      render(<GeometryDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Geometry for HMS Example');
    });

    it('renders with data-testid', () => {
      render(<GeometryDialog {...defaultProps} />);
      expect(screen.getByTestId('geometry-dialog')).toBeInTheDocument();
    });

    it('displays feature name in header', () => {
      render(<GeometryDialog {...defaultProps} />);
      expect(screen.getByText('HMS Example')).toBeInTheDocument();
    });

    it('displays geometry type', () => {
      render(<GeometryDialog {...defaultProps} />);
      const typeEl = screen.getByTestId('geometry-type');
      expect(typeEl).toHaveTextContent('LineString');
    });

    it('displays coordinates', () => {
      render(<GeometryDialog {...defaultProps} />);
      const coordsEl = screen.getByTestId('geometry-coordinates');
      expect(coordsEl).toHaveTextContent('[-5, 50]');
      expect(coordsEl).toHaveTextContent('[-4, 51]');
    });
  });

  describe('geometry types', () => {
    it('formats Point geometry', () => {
      render(
        <GeometryDialog
          {...defaultProps}
          geometryType="Point"
          coordinates={[-3.0, 52.0]}
        />
      );
      const coordsEl = screen.getByTestId('geometry-coordinates');
      expect(coordsEl).toHaveTextContent('[-3, 52]');
    });

    it('formats LineString geometry with numbered coordinates', () => {
      render(
        <GeometryDialog
          {...defaultProps}
          geometryType="LineString"
          coordinates={[[-5.0, 50.0], [-4.0, 51.0], [-3.0, 52.0]]}
        />
      );
      const coordsEl = screen.getByTestId('geometry-coordinates');
      expect(coordsEl).toHaveTextContent('1. [-5, 50]');
      expect(coordsEl).toHaveTextContent('2. [-4, 51]');
      expect(coordsEl).toHaveTextContent('3. [-3, 52]');
    });

    it('formats MultiPoint geometry with numbered coordinates', () => {
      render(
        <GeometryDialog
          {...defaultProps}
          geometryType="MultiPoint"
          coordinates={[[-5.0, 50.0], [-4.0, 51.0]]}
        />
      );
      const coordsEl = screen.getByTestId('geometry-coordinates');
      expect(coordsEl).toHaveTextContent('1. [-5, 50]');
      expect(coordsEl).toHaveTextContent('2. [-4, 51]');
    });

    it('formats Polygon geometry with ring labels', () => {
      render(
        <GeometryDialog
          {...defaultProps}
          geometryType="Polygon"
          coordinates={[[[-5, 50], [-4, 51], [-3, 50], [-5, 50]]]}
        />
      );
      const coordsEl = screen.getByTestId('geometry-coordinates');
      expect(coordsEl).toHaveTextContent('Exterior');
      expect(coordsEl).toHaveTextContent('[-5, 50]');
    });

    it('formats MultiPolygon geometry with polygon labels', () => {
      render(
        <GeometryDialog
          {...defaultProps}
          geometryType="MultiPolygon"
          coordinates={[[[[-5, 50], [-4, 51], [-3, 50], [-5, 50]]]]}
        />
      );
      const coordsEl = screen.getByTestId('geometry-coordinates');
      expect(coordsEl).toHaveTextContent('Polygon 1');
      expect(coordsEl).toHaveTextContent('Exterior');
    });

    it('shows "No coordinates" for empty coordinate array', () => {
      render(
        <GeometryDialog
          {...defaultProps}
          geometryType="LineString"
          coordinates={[]}
        />
      );
      const coordsEl = screen.getByTestId('geometry-coordinates');
      expect(coordsEl).toHaveTextContent('No coordinates');
    });
  });

  describe('dismissal', () => {
    it('calls onDismiss when close button is clicked', () => {
      const onDismiss = vi.fn();
      render(<GeometryDialog {...defaultProps} onDismiss={onDismiss} />);

      const closeBtn = screen.getByLabelText('Close');
      fireEvent.click(closeBtn);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when Escape is pressed', () => {
      const onDismiss = vi.fn();
      render(<GeometryDialog {...defaultProps} onDismiss={onDismiss} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('has a close button with correct aria-label', () => {
      render(<GeometryDialog {...defaultProps} />);
      const closeBtn = screen.getByLabelText('Close');
      expect(closeBtn).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role="dialog"', () => {
      render(<GeometryDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has descriptive aria-label', () => {
      render(<GeometryDialog {...defaultProps} featureName="Track Alpha" />);
      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-label',
        'Geometry for Track Alpha'
      );
    });

    it('geometry type has data-testid for automation', () => {
      render(<GeometryDialog {...defaultProps} />);
      expect(screen.getByTestId('geometry-type')).toBeInTheDocument();
    });

    it('coordinates have data-testid for automation', () => {
      render(<GeometryDialog {...defaultProps} />);
      expect(screen.getByTestId('geometry-coordinates')).toBeInTheDocument();
    });
  });
});
