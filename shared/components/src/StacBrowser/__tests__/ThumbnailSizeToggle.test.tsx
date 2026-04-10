import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThumbnailSizeToggle } from '../ThumbnailSizeToggle';

describe('ThumbnailSizeToggle', () => {
  it('renders three size buttons', () => {
    render(<ThumbnailSizeToggle size="small" onSizeChange={() => {}} />);
    expect(screen.getByText('S')).toBeTruthy();
    expect(screen.getByText('M')).toBeTruthy();
    expect(screen.getByText('L')).toBeTruthy();
  });

  it('marks the active size with aria-pressed', () => {
    render(<ThumbnailSizeToggle size="medium" onSizeChange={() => {}} />);
    expect(screen.getByTestId('thumbnail-size-small').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('thumbnail-size-medium').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('thumbnail-size-large').getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onSizeChange when a button is clicked', () => {
    const onSizeChange = vi.fn();
    render(<ThumbnailSizeToggle size="small" onSizeChange={onSizeChange} />);
    fireEvent.click(screen.getByTestId('thumbnail-size-large'));
    expect(onSizeChange).toHaveBeenCalledWith('large');
  });

  it('has radiogroup role with accessible label', () => {
    render(<ThumbnailSizeToggle size="small" onSizeChange={() => {}} />);
    const group = screen.getByRole('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Thumbnail size');
  });

  it('applies active CSS class to selected button', () => {
    render(<ThumbnailSizeToggle size="large" onSizeChange={() => {}} />);
    const btn = screen.getByTestId('thumbnail-size-large');
    expect(btn.className).toContain('stac-browser__thumbnail-size-btn--active');
    const otherBtn = screen.getByTestId('thumbnail-size-small');
    expect(otherBtn.className).not.toContain('stac-browser__thumbnail-size-btn--active');
  });
});
