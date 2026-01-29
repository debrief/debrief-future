/**
 * Tests for TimeController component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TimeController } from './TimeController';
import type { TimeExtent } from '../utils/types';

// Mock requestAnimationFrame
const mockRAF = vi.fn();
const mockCancelRAF = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', mockRAF);
  vi.stubGlobal('cancelAnimationFrame', mockCancelRAF);
  mockRAF.mockImplementation((callback: FrameRequestCallback) => {
    return setTimeout(() => callback(performance.now()), 16) as unknown as number;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  mockRAF.mockClear();
  mockCancelRAF.mockClear();
});

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2024, 0, 1, 12, 0, 0); // 2024-01-01 12:00:00 UTC

describe('TimeController', () => {
  describe('UI States', () => {
    it('renders empty state when no timeExtent', () => {
      render(<TimeController />);

      expect(screen.getByText('No data loaded')).toBeInTheDocument();
    });

    it('renders loading state when uiState is loading', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} uiState="loading" />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders ready state with controls when timeExtent provided', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      // Should have time display (via aria-label)
      expect(screen.getByLabelText(/current time/i)).toBeInTheDocument();

      // Should have play button (exact match to avoid conflicts)
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

      // Should have speed selector
      expect(screen.getByText('1x')).toBeInTheDocument();

      // Should have display mode toggle
      expect(screen.getByText('Full')).toBeInTheDocument();
      expect(screen.getByText('Trail')).toBeInTheDocument();
    });
  });

  describe('Time Display', () => {
    it('displays current time in HH:MM:SS format', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      // Use aria-label to find the time display
      const timeDisplay = screen.getByLabelText(/current time/i);
      expect(timeDisplay).toHaveTextContent('12:00:00');
    });

    it('updates time display when initialTime changes', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const initialTime = NOW + 30 * 60 * 1000; // 12:30:00
      render(<TimeController timeExtent={timeExtent} initialTime={initialTime} />);

      const timeDisplay = screen.getByLabelText(/current time/i);
      expect(timeDisplay).toHaveTextContent('12:30:00');
    });
  });

  describe('Play/Pause Controls', () => {
    it('shows play button when paused', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      // Use exact name match
      const playButton = screen.getByRole('button', { name: 'Play' });
      expect(playButton).toBeInTheDocument();
    });

    it('toggles to pause when play is clicked', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      const playButton = screen.getByRole('button', { name: 'Play' });
      fireEvent.click(playButton);

      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('calls onPlaybackStateChange when toggled', () => {
      const onPlaybackStateChange = vi.fn();
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(
        <TimeController
          timeExtent={timeExtent}
          onPlaybackStateChange={onPlaybackStateChange}
        />
      );

      const playButton = screen.getByRole('button', { name: 'Play' });
      fireEvent.click(playButton);

      expect(onPlaybackStateChange).toHaveBeenCalledWith('playing');
    });
  });

  describe('Speed Selector', () => {
    it('displays current speed', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} initialSpeed={4} />);

      expect(screen.getByText('4x')).toBeInTheDocument();
    });

    it('has up and down arrow buttons', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      expect(screen.getByRole('button', { name: /increase speed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /decrease speed/i })).toBeInTheDocument();
    });

    it('changes speed when up arrow is clicked', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      // Default speed is 1x, click up to go to 2x
      const upButton = screen.getByRole('button', { name: /increase speed/i });
      fireEvent.click(upButton);

      expect(screen.getByText('2x')).toBeInTheDocument();
    });
  });

  describe('Display Mode Toggle', () => {
    it('defaults to Full mode', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('can be initialized in Trail mode', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} initialDisplayMode="trail" />);

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('calls onDisplayModeChange when toggled', () => {
      const onDisplayModeChange = vi.fn();
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(
        <TimeController
          timeExtent={timeExtent}
          onDisplayModeChange={onDisplayModeChange}
        />
      );

      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);

      expect(onDisplayModeChange).toHaveBeenCalledWith('trail');
    });
  });

  describe('Keyboard Controls', () => {
    it('toggles playback on Space key', () => {
      const onPlaybackStateChange = vi.fn();
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(
        <TimeController
          timeExtent={timeExtent}
          onPlaybackStateChange={onPlaybackStateChange}
        />
      );

      const controller = screen.getByRole('region', { name: /time controller/i });
      controller.focus();
      fireEvent.keyDown(controller, { key: ' ' });

      expect(onPlaybackStateChange).toHaveBeenCalledWith('playing');
    });

    it('scrubs forward on Right Arrow', () => {
      const onTimeChange = vi.fn();
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(
        <TimeController
          timeExtent={timeExtent}
          onTimeChange={onTimeChange}
        />
      );

      const controller = screen.getByRole('region', { name: /time controller/i });
      controller.focus();
      fireEvent.keyDown(controller, { key: 'ArrowRight' });

      expect(onTimeChange).toHaveBeenCalled();
      const newTime = onTimeChange.mock.calls[0][0];
      expect(newTime).toBeGreaterThan(NOW);
    });

    it('scrubs backward on Left Arrow', () => {
      const onTimeChange = vi.fn();
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const initialTime = NOW + 30 * 60 * 1000;
      render(
        <TimeController
          timeExtent={timeExtent}
          initialTime={initialTime}
          onTimeChange={onTimeChange}
        />
      );

      const controller = screen.getByRole('region', { name: /time controller/i });
      controller.focus();
      fireEvent.keyDown(controller, { key: 'ArrowLeft' });

      expect(onTimeChange).toHaveBeenCalled();
      const newTime = onTimeChange.mock.calls[0][0];
      expect(newTime).toBeLessThan(initialTime);
    });
  });

  describe('Time Scrubber', () => {
    it('renders scrubber with time range labels', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      // Find within the scrubber component
      const scrubber = screen.getByRole('slider');
      const scrubberContainer = scrubber.closest('.debrief-time-scrubber');

      // Should show end time label (13:00:00) - start time also shown in time display
      expect(within(scrubberContainer as HTMLElement).getByText('13:00:00')).toBeInTheDocument();
    });

    it('has accessible slider role', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('pauses playback when scrubbing during playback', () => {
      const onPlaybackStateChange = vi.fn();
      const onTimeChange = vi.fn();
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(
        <TimeController
          timeExtent={timeExtent}
          onPlaybackStateChange={onPlaybackStateChange}
          onTimeChange={onTimeChange}
        />
      );

      // Start playback
      const playButton = screen.getByRole('button', { name: 'Play' });
      fireEvent.click(playButton);

      expect(onPlaybackStateChange).toHaveBeenLastCalledWith('playing');

      // Clear the mock
      onPlaybackStateChange.mockClear();

      // Click on scrubber track (simulating a scrub action)
      // Use click event which triggers the track's onClick handler
      const scrubberTrack = document.querySelector('.debrief-time-scrubber__track');
      if (scrubberTrack) {
        fireEvent.click(scrubberTrack, { clientX: 50, clientY: 10 });
      }

      // Should have paused (via the handleScrubberTimeChange callback)
      expect(onPlaybackStateChange).toHaveBeenCalledWith('paused');
    });
  });

  describe('Accessibility', () => {
    it('has accessible region role', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      expect(screen.getByRole('region', { name: /time controller/i })).toBeInTheDocument();
    });

    it('can receive keyboard focus', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      const controller = screen.getByRole('region', { name: /time controller/i });
      expect(controller).toHaveAttribute('tabIndex', '0');
    });

    it('time display has aria-label', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      expect(screen.getByLabelText(/current time/i)).toBeInTheDocument();
    });

    it('play button has accessible name', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    });

    it('display mode toggle has accessible role', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      render(<TimeController timeExtent={timeExtent} />);

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-label', expect.stringMatching(/display mode/i));
    });
  });
});
