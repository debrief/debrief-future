/**
 * Vitest for TimeSlider (T073).
 *
 * Covers:
 *   - the slider input disables when no scrubbable range is set
 *     (instant Scene case)
 *   - bounds change when `setScrubbableRange(start, end)` is invoked
 *     (time-range Scene case)
 *   - scrubbing dispatches `setCurrentTime` to the store
 */

/// <reference lib="dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeSlider } from '../TimeSlider';
import { useBriefingStore } from '../../store';

beforeEach(() => {
  useBriefingStore.setState({
    currentTime: 0,
    scrubbableRangeStart: null,
    scrubbableRangeEnd: null,
  });
});

describe('TimeSlider', () => {
  it('disables the slider when no scrubbable range is set (instant Scene)', () => {
    render(<TimeSlider />);
    const input = screen.getByTestId('briefing-time-slider-input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('enables the slider and respects the bounds when setScrubbableRange is called', () => {
    useBriefingStore.setState({
      scrubbableRangeStart: 1_700_000_000_000,
      scrubbableRangeEnd: 1_700_001_000_000,
      currentTime: 1_700_000_000_000,
    });
    render(<TimeSlider />);
    const input = screen.getByTestId('briefing-time-slider-input') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(input.min).toBe('1700000000000');
    expect(input.max).toBe('1700001000000');
  });

  it('writes currentTime to the store when the user drags the slider', () => {
    useBriefingStore.setState({
      scrubbableRangeStart: 0,
      scrubbableRangeEnd: 1000,
      currentTime: 0,
    });
    render(<TimeSlider />);
    const input = screen.getByTestId('briefing-time-slider-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '500' } });
    expect(useBriefingStore.getState().currentTime).toBe(500);
  });

  it('clamps the value when range is collapsed (start === end)', () => {
    useBriefingStore.setState({
      scrubbableRangeStart: 100,
      scrubbableRangeEnd: 100,
      currentTime: 100,
    });
    render(<TimeSlider />);
    const input = screen.getByTestId('briefing-time-slider-input') as HTMLInputElement;
    // Disabled because start === end is treated as zero-range.
    expect(input.disabled).toBe(true);
  });

  it('shows "—" placeholder for instant Scenes', () => {
    render(<TimeSlider />);
    expect(screen.getByTestId('briefing-time-slider-value').textContent).toBe('—');
  });

  it('renders an ISO timestamp when in range', () => {
    useBriefingStore.setState({
      scrubbableRangeStart: Date.parse('2025-01-15T12:00:00Z'),
      scrubbableRangeEnd: Date.parse('2025-01-15T12:01:00Z'),
      currentTime: Date.parse('2025-01-15T12:00:30Z'),
    });
    render(<TimeSlider />);
    expect(screen.getByTestId('briefing-time-slider-value').textContent).toMatch(
      /2025-01-15 12:00:30Z/,
    );
  });

  it('invokes the onSeek callback when the user scrubs', () => {
    useBriefingStore.setState({
      scrubbableRangeStart: 0,
      scrubbableRangeEnd: 1000,
      currentTime: 0,
    });
    const calls: number[] = [];
    render(<TimeSlider onSeek={(t) => calls.push(t)} />);
    const input = screen.getByTestId('briefing-time-slider-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '750' } });
    expect(calls).toEqual([750]);
  });
});
