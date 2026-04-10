import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QuickSearch } from '../QuickSearch';

describe('QuickSearch', () => {
  let onSearchChange: ReturnType<typeof vi.fn>;
  let onCommit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onSearchChange = vi.fn();
    onCommit = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderQuickSearch() {
    return render(
      <QuickSearch onSearchChange={onSearchChange} onCommit={onCommit} />,
    );
  }

  it('renders with placeholder text', () => {
    renderQuickSearch();
    const input = screen.getByTestId('quick-search-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Quick search\u2026');
  });

  it('renders custom placeholder', () => {
    render(
      <QuickSearch
        onSearchChange={onSearchChange}
        onCommit={onCommit}
        placeholder="Find exercise..."
      />,
    );
    expect(screen.getByTestId('quick-search-input')).toHaveAttribute(
      'placeholder',
      'Find exercise...',
    );
  });

  it('calls onSearchChange after debounce when typing', () => {
    renderQuickSearch();
    const input = screen.getByTestId('quick-search-input');

    fireEvent.change(input, { target: { value: 'alpha' } });

    // Not called immediately
    expect(onSearchChange).not.toHaveBeenCalled();

    // Called after debounce
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onSearchChange).toHaveBeenCalledWith('alpha');
  });

  it('debounces rapid keystrokes — only fires once', () => {
    renderQuickSearch();
    const input = screen.getByTestId('quick-search-input');

    fireEvent.change(input, { target: { value: 'a' } });
    act(() => { vi.advanceTimersByTime(100); });

    fireEvent.change(input, { target: { value: 'al' } });
    act(() => { vi.advanceTimersByTime(100); });

    fireEvent.change(input, { target: { value: 'alp' } });
    act(() => { vi.advanceTimersByTime(200); });

    // Only the final value should have been dispatched
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('alp');
  });

  it('commits search on Enter and clears input', () => {
    renderQuickSearch();
    const input = screen.getByTestId('quick-search-input');

    fireEvent.change(input, { target: { value: 'bravo' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCommit).toHaveBeenCalledWith('bravo');
    // Clears the live search filter (lozenge takes over)
    expect(onSearchChange).toHaveBeenCalledWith('');
    expect(input).toHaveValue('');
  });

  it('does not commit on Enter when input is empty', () => {
    renderQuickSearch();
    const input = screen.getByTestId('quick-search-input');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('does not commit on Enter when input is only whitespace', () => {
    renderQuickSearch();
    const input = screen.getByTestId('quick-search-input');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('clears input and live search on Escape', () => {
    renderQuickSearch();
    const input = screen.getByTestId('quick-search-input');

    fireEvent.change(input, { target: { value: 'charlie' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input).toHaveValue('');
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('shows clear button when text is present', () => {
    renderQuickSearch();
    const input = screen.getByTestId('quick-search-input');

    // No clear button initially
    expect(screen.queryByTestId('quick-search-clear')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'delta' } });
    expect(screen.getByTestId('quick-search-clear')).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', () => {
    renderQuickSearch();
    const input = screen.getByTestId('quick-search-input');

    fireEvent.change(input, { target: { value: 'echo' } });
    fireEvent.click(screen.getByTestId('quick-search-clear'));

    expect(input).toHaveValue('');
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  describe('keyboard shortcuts', () => {
    it('focuses input on "/" key when not in an editable field', () => {
      renderQuickSearch();
      const input = screen.getByTestId('quick-search-input');

      // Dispatch on document body (non-editable)
      fireEvent.keyDown(document, { key: '/' });

      expect(document.activeElement).toBe(input);
    });

    it('focuses input on Ctrl+F', () => {
      renderQuickSearch();
      const input = screen.getByTestId('quick-search-input');

      fireEvent.keyDown(document, { key: 'f', ctrlKey: true });

      expect(document.activeElement).toBe(input);
    });

    it('does not focus on "/" when already in an input', () => {
      renderQuickSearch();

      // Create a separate input and focus it
      const other = document.createElement('input');
      document.body.appendChild(other);
      other.focus();

      fireEvent.keyDown(other, { key: '/' });

      // Quick search should NOT be focused — the other input should retain focus
      expect(document.activeElement).toBe(other);

      document.body.removeChild(other);
    });
  });
});
