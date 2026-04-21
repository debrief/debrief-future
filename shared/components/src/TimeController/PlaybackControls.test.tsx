import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PlaybackState } from '@debrief/schemas';
import { PlaybackControls } from './PlaybackControls';

/**
 * Feature 205 / FR-023 / SC-015: the stopped ≡ paused rendering rule.
 * 'stopped' and 'paused' MUST render identically (play glyph,
 * aria-label="Play", enabled button); only 'playing' differs. See ADR-NN
 * in docs/project_notes/decisions.md for the rationale.
 */
describe('PlaybackControls — stopped ≡ paused rendering rule (Feature 205 / FR-023)', () => {
  const playCases: Array<{ state: PlaybackState; ariaLabel: string }> = [
    { state: 'stopped', ariaLabel: 'Play' },
    { state: 'paused', ariaLabel: 'Play' },
  ];

  it.each(playCases)(
    'renders play glyph with aria-label="$ariaLabel" when playbackState is "$state"',
    ({ state, ariaLabel }) => {
      const onToggle = vi.fn();
      render(<PlaybackControls playbackState={state} onToggle={onToggle} />);
      const btn = screen.getByTestId('play-pause');
      expect(btn).toHaveAttribute('aria-label', ariaLabel);
      fireEvent.click(btn);
      expect(onToggle).toHaveBeenCalledOnce();
    }
  );

  it('renders pause glyph with aria-label="Pause" when playbackState is "playing"', () => {
    const onToggle = vi.fn();
    render(<PlaybackControls playbackState="playing" onToggle={onToggle} />);
    const btn = screen.getByTestId('play-pause');
    expect(btn).toHaveAttribute('aria-label', 'Pause');
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
